# Validación manual Windows — Pipeline YouTube v1.0.1

URL de prueba real (verificada en Windows):
https://www.youtube.com/watch?v=88fD-UtG_yo

Contexto verificado previamente:
- Navegador incógnito: PASS (vídeo reproducible anónimamente).
- Metadata yt-dlp: PASS.
- Listado de formatos: PASS.
- Node/EJS: PASS.
- 18 (MP4 muxed 360p) → HTTP 403.
- 140 (AAC/M4A) → HTTP 403.
- 251 (Opus/WebM) → PASS completo.
- 136 + 251 (H.264 720p + Opus) → 403 ~16,6 %.
- 137 + 251 (H.264 1080p + Opus) → 403 ~25 % (también con yt-dlp 2026.07.04).
- 248 + 251 (VP9 1080p + Opus) → PASS completo (255 MB vídeo, audio, merge FFmpeg a WebM).

Conclusión: el vídeo NO está bloqueado. Fallan representaciones concretas
H.264/MP4/AAC en el CDN; VP9/WebM + Opus entrega bien.
FORMATO DE ORIGEN != FORMATO DE SALIDA.

## Requisitos del entorno

- Portable Anclora FileStudio Windows-x64 construido con el toolchain
  actualizado (yt-dlp 2026.07.04 + SHA-256 en scripts/toolchain.lock.json,
  launcher exportando ANCLORA_FILESTUDIO_NODE_PATH al runtime\node.exe).
- Sin cookies configuradas: la prueba debe pasar 100 % anónima.
  (Las cookies solo deben seguir siendo un fallback opcional, nunca un
  requisito.)
- No se requiere YouTube.js, Chromium, Cobalt, proxies ni PO token.

## Casos esperados

### 1. AUDIO MP3 — EXPECTED: PASS
- Seleccionar la URL y formato de salida MP3 (calidad preferida).
- Flujo esperado: bestaudio (Opus/WebM 251) → FFmpeg → MP3.
- Criterio de PASS:
  - El job llega a "completed" sin reintento con cookies.
  - El MP3 se reproduce y su duración ≈ duración del vídeo.
  - En logs del job (o diagnóstico) se ve un único intento de descarga de
    fuente de audio + conversión FFmpeg (libmp3lame).
- Si la fuente preferida 403 (posible según red), el fallback Opus/WebM
  debe resolver sin error visible al usuario (se reintenta en silencio).

### 2. VIDEO WEBM 1080 — EXPECTED: PASS
- Formato de salida WEBM, calidad 1080 (perfil mp4-compatible).
- Flujo esperado: VP9 (248) + Opus (251) → merge directo WebM.
- Criterio de PASS:
  - Job "completed".
  - Salida .webm con codecs vp9 + opus (se puede comprobar con ffprobe o
    un reproductor compatible).
  - SIN transcodificación: el merge es remux (stream copy). El archivo es
    grande (≈255 MB como en la prueba original) y sale rápido.

### 3. VIDEO MP4 1080 — EXPECTED: PASS
- Formato de salida MP4, calidad 1080 (perfil mp4-compatible).
- Flujo esperado:
  1. Intento preferido: fuente H.264/AAC compatible (ext=mp4) — en esta
     red probablemente 403 (representación 137/140).
  2. Fallback automático: fuente alternativa sin restricción de ext
     (VP9 + Opus, 248 + 251) descargada y mergeada a MKV intermedio.
  3. FFmpeg → H.264 + AAC en MP4 con faststart, resolución 1080p.
- Criterio de PASS:
  - Job "completed" — sin error visible al usuario por el 403 intermedio.
  - Salida .mp4 reproducible en reproductores estándar (H.264/AAC).
  - ffprobe: codec h264, 1920x1080, audio aac, faststart (moov al inicio).
  - La resolución entregada es 1080p (>= 90 % de la solicitada; el perfil
    reject marca QUALITY_NOT_DELIVERED si no).

### 4. (Opcional) MP4 1080 con cookies guardadas — EXPECTED: PASS igual
- Guardar cookies.txt con dominio youtube.com (panel Diagnóstico) y repetir
  el caso 3. El flujo anónimo debe seguir siendo el principal; las cookies
  solo actúan como fallback tras un fallo anónimo.

### 5. (Negativo) Contenido con login obligatorio — EXPECTED: error claro
- Un vídeo privado / restringido por edad sin cuenta debe fallar con el
  mensaje YOUTUBE_LOGIN_REQUIRED y NO intentar codecs alternativos
  (un solo intento, error explícito, sin loops).

## Comprobaciones adicionales

- Diagnostics → herramienta yt-dlp: versión 2026.07.04.
- Sin cookies: la pestaña Diagnóstico no debe mostrar cookies activas.
- Sin `--remote-components` en ningún camino (tampoco con cookies): el
  portable usa el componente EJS embebido en el ejecutable oficial de
  yt-dlp (`yt_dlp_ejs-0.8.0` reportado en `[debug] Optional libraries`
  incluso con `--no-remote-components`). FileStudio portable no descarga
  componentes de GitHub en runtime.
- logs/ytdlp-errors.log: si el caso 3 hizo fallback, el 403 del intento
  preferido puede quedar registrado ahí; es esperado y no es un fallo.
- Probar también un segundo vídeo cualquiera (p. ej. dQw4w9WgXcQ) para
  confirmar que el pipeline anónimo no degrada el caso normal.

## Notas de red

La respuesta de YouTube varía por IP/red. Esta guía NO debe ejecutarse
desde el VPS como criterio de aceptación; la validación canónica es el
portable en una máquina Windows real con red doméstica/corporativa.

## Criterio de release v1.0.1

READY cuando los tres casos principales (1, 2, 3) pasan en el portable
Windows con:
- flujo 100 % anónimo (sin cookies),
- sin errores visibles por los 403 intermedios,
- salidas verificadas por ffprobe (contenedor + codecs + resolución),
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` verdes en CI.