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

El flujo URL usa el **mismo sistema de jobs** que el flujo de archivo local
(`src/lib/jobs/url-transcript-processor.ts`, tercer processor sobre la
misma tabla `jobs` — ver `job-manager.ts`/`universal-job-processor.ts` como
los otros dos precedentes). Fases reales (`stage`, nunca un porcentaje
interpolado falso): Analizando URL → Comprobando subtítulos → Descargando
subtítulos | Descargando audio → Preparando audio → Transcribiendo →
Generando archivo → Completado/Error/Cancelado. El botón "Buscar
subtítulos" de la UI sigue siendo una llamada rápida de sólo lectura
(`/api/media/url-captions`, no un job) para listar pistas disponibles.

La cancelación usa un registro compartido
(`src/lib/jobs/job-cancellation.ts`) — el mismo mecanismo para archivo local
y URL — que mata de verdad el proceso hijo activo (yt-dlp, FFmpeg o
whisper-cli) mediante `AbortController`/`SIGKILL`, limpia el directorio de
trabajo temporal y marca el job `cancelled` (nunca deja un resultado
parcial como si estuviera completado).

El fallback de audio-only usa selectores semánticos de yt-dlp con dos
candidatos (`bestaudio/best`, luego un candidato de codec/contenedor
alternativo) — nunca un ID de formato rígido — para tolerar 403 o formatos
no disponibles.

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

## Prueba real de red (fallback sin subtítulos)

Verificado contra un vídeo público real, estable y conocido (Big Buck
Bunny, Blender Foundation) confirmado sin subtítulos manuales ni
automáticos mediante `yt-dlp --skip-download -J`:

```
manual: []
auto: []
```

Ejecución real (sin mocks) de `probeUrlCaptions` → `downloadUrlAudioOnly`
→ `runWhisperTranscription` — mismas funciones que usa el job processor —
candidato de audio `bestaudio/best` (primer intento), transcripción real
generada (SRT 2370 bytes, TXT 453 bytes), directorio temporal eliminado al
finalizar, sin procesos `yt-dlp`/`ffmpeg`/`whisper-cli` huérfanos. Ver
`scripts/url-transcript-real-smoke.real-smoke.test.ts` (excluido de
`pnpm test`; ejecutar con `pnpm test:url-transcript-real-smoke`).

## GAPS conocidos de esta iteración

- No hay descarga de modelos in-app con progreso/cancelación (Fase 13):
  **DEFERRED_BY_PRODUCT_DECISION**. El usuario coloca manualmente el
  archivo `ggml-*.bin`. La detección ya funciona; falta sólo la UI de
  descarga, explícitamente pospuesta.
- Cancelación de procesos: el registro compartido (`job-cancellation.ts`)
  cubre Whisper, FFmpeg y yt-dlp para los tres processors sobre la tabla
  `jobs` — archivo local (`universal-job-processor.ts`), URL
  (`url-transcript-processor.ts`) y el pipeline legacy de conversión
  YouTube→MP3/MP4 (`media/processor.ts`, incluidos los pasos de remux
  FFmpeg). Un único `DELETE /api/jobs/:id` cancela cualquiera de los tres.
  Verificado real: MP3 normal, MP4 normal y cancelación real durante una
  descarga en curso (`scripts/legacy-youtube-real-smoke.real-smoke.test.ts`).
