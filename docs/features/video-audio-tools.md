# Vídeo y Audio (Desktop only)

Familia de herramientas locales para vídeo y audio, disponible **solo en
Anclora FileStudio Desktop** (nunca en la versión Web/Vercel). Sin IA
generativa: toda la transcripción usa [whisper.cpp](https://github.com/ggml-org/whisper.cpp)
(licencia MIT) ejecutado localmente.

## Alcance

- Desktop-only: la familia no aparece ni se ejecuta en la versión Web.
  Se controla mediante el registro de engines (`whisper-cli`/`ffmpeg-media`
  nunca están disponibles en el entorno `"web"`) y una guarda explícita en
  `buildToolCategories()`.
- Sin resúmenes, sin capítulos generados, sin preguntas/respuestas, sin
  servicios cloud de transcripción.

## Funciones

- **Transcripción** — desde archivo local (vídeo o audio) o desde URL
  (yt-dlp).
- **Extracción** — audio, frames (ZIP), subtítulos embebidos, miniatura.
  Reutiliza las capacidades ya existentes de `FFmpegEngine`
  (`src/lib/engines/media/ffmpeg-engine.ts`).
- **Edición básica** — recorte (`trim`).
- **Información** — metadatos vía FFprobe.

## Pipeline de transcripción

```
Audio directo (wav/mp3/flac/ogg)  ──────────────►  whisper-cli  ──► TXT/MD/SRT/VTT
Vídeo o audio en otro contenedor  ─► FFmpeg (WAV mono 16kHz) ─►  whisper-cli  ──► TXT/MD/SRT/VTT
```

TXT/SRT/VTT son los archivos reales que emite `whisper-cli`
(`-otxt -osrt -ovtt`). El Markdown lo genera FileStudio parseando el SRT
real (sin resumen ni contenido generado) — ver
`buildTranscriptMarkdown()` en `src/lib/engines/media/whisper-engine.ts`.

Los temporales (WAV extraído, TXT/SRT/VTT crudos de whisper-cli) viven en un
directorio de trabajo dedicado por job y se eliminan siempre — éxito, error
o cancelación — igual que el patrón ya usado por `extract-frames`.

## Whisper — resolución de binario y modelos

`findWhisperBinary()` (`src/lib/engines/media/whisper-engine.ts`) sigue el
mismo patrón de 3 niveles que el resto de motores:

1. `ANCLORA_FILESTUDIO_WHISPER_PATH` (config explícita / distribución portable)
2. Ruta portable `tools/whisper/...` relativa al directorio de trabajo
3. PATH, con búsqueda adicional en directorios estándar de macOS
   (`/opt/homebrew/bin`, `/usr/local/bin`, …) — resuelve
   `/opt/homebrew/bin/whisper-cli` en una instalación Homebrew típica sin
   depender del PATH heredado por un proceso lanzado desde Finder.

La versión se obtiene con `whisper-cli --version` (nunca hardcodeada).
En macOS no se pasa `--no-gpu`: whisper.cpp usa Metal automáticamente si
está disponible.

### Directorio de modelos

Por defecto (sin `ANCLORA_FILESTUDIO_WHISPER_MODELS_DIR`):

- macOS: `~/Library/Application Support/Anclora FileStudio/models/whisper`
- Windows: `%LOCALAPPDATA%\Anclora FileStudio\models\whisper`
- Linux: `~/.local/share/anclora-filestudio/models/whisper`

FileStudio detecta modelos `ggml-*.bin` (tiny/base/small) presentes en ese
directorio; **nunca los descarga automáticamente**. El usuario coloca el
archivo manualmente (o mediante una futura función de descarga in-app, no
incluida en esta iteración — ver GAPS más abajo). Si no hay modelo, la
transcripción se marca como no disponible con una razón explícita (nunca
como una app "degradada").

## Diagnóstico

Whisper aparece en `/api/health` como dependencia **opcional**
(`portableInclusion: "optional"`): su ausencia nunca marca la aplicación
como DEGRADED. La entrada incluye `modelInfo` (modelo activo, directorio,
modelos detectados) usando el mismo resolver que el runtime (single source
of truth: `findWhisperBinary()`/`listWhisperModels()` se importan tal cual
en `src/lib/diagnostics/toolchain-probe.ts`).

## URL (YouTube / yt-dlp)

Orden de preferencia: subtítulos manuales → subtítulos automáticos →
transcripción local con Whisper. Nunca se descarga el vídeo completo si
sólo se necesita audio o subtítulos (`src/lib/media/ytdlp-subtitles.ts`).

El endpoint `/api/media/url-transcript` es **síncrono** (no pasa por el
sistema de jobs/cola): la respuesta HTTP devuelve el contenido final
directamente. Esto es una simplificación deliberada frente al flujo de
archivo local (que sí usa el pipeline de jobs completo, con progreso y
cancelación) — ver GAPS.

## Privacidad

"Transcripción local — el audio no sale de tu dispositivo" es cierto para
la fase Whisper: el audio nunca se envía a un tercero. Para URLs remotas sí
existe comunicación necesaria con la fuente (YouTube/yt-dlp) para obtener
subtítulos o audio — eso no es una API de transcripción cloud.

## Licencias

- whisper.cpp: MIT. No se distribuye con el instalador (dependencia externa
  opcional detectada en tiempo de ejecución).
- Modelos GGML (conversión de los pesos de OpenAI Whisper): MIT. Tampoco se
  empaquetan; el usuario los coloca manualmente.

Ver `THIRD_PARTY_NOTICES.txt`.

## GAPS conocidos de esta iteración

- No hay descarga de modelos in-app con progreso/cancelación (Fase 13):
  el usuario coloca manualmente el archivo `ggml-*.bin`. La detección ya
  funciona; falta sólo la UI de descarga.
- El flujo de transcripción desde URL es síncrono (una sola petición HTTP),
  sin barra de progreso ni botón de cancelar — a diferencia del flujo de
  archivo local, que sí usa el pipeline de jobs con progreso/cancelación
  reales.
- La descarga de audio-only para URLs sin subtítulos usa un único intento
  `bestaudio` (sin la cadena de fallback multi-candidato ante 403 que sí
  tiene el pipeline YouTube→MP3 existente).
- Cancelación de procesos: se añadió wiring real (AbortController) sólo
  para el motor Whisper; FFmpeg/yt-dlp no se retrofit-earon en esta
  iteración (no tenían wiring de cancelación previamente tampoco).
