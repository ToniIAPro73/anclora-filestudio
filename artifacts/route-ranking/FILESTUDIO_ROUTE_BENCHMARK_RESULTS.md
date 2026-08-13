# FileStudio — Route Ranking Benchmark Results

Fase: Quality-Aware Routing & Route Ranking.
Suite: `tests/integration/route-ranking-benchmark.test.ts` — 12/12 PASS, ejecución
real de engines en Linux (VPS), salidas validadas por familia (pdftotext,
pdf-lib, ffprobe, firmas, ZIP docx). Datos crudos: `benchmark-results.json`.

| Par | Rutas | Ganador rankeado | Score | Challenger | Score | t(w) ms | t(c) ms | Razones |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| md→pdf | 13 | md→docx→pdf | 0.681 | md→odt→pdf | 0.681 | 3706 | 3357 | DETERMINISTIC_TIEBREAK |
| html→pdf | 13 | html→docx→pdf | 0.679 | html→odt→pdf | 0.679 | 3414 | 3473 | DETERMINISTIC_TIEBREAK |
| docx→pdf | 12 | docx→pdf (directa) | 0.889 | docx→odt→pdf | 0.889 | 3361 | 6797 | SHORTER_EQUIVALENT_ROUTE |
| pdf→md | 1 | pdf→md (extracción) | 0.548 | — | — | 128 | — | ONLY_VIABLE_ROUTE |
| pdf→docx | 1 | pdf→docx (certificada) | 0.668 | — | — | 3130 | — | ONLY_VIABLE_ROUTE |
| docx→png | 5 | docx→pdf→png (certificada) | 0.740 | — | — | 4045 | — | SHORTER_EQUIVALENT_ROUTE |
| png→pdf | 16 | png→pdf (directa) | 0.870 | png→tiff→pdf | 0.791 | 48 | 43 | HIGHER_FIDELITY, PRESERVES_IMAGES, CERTIFIED_ROUTE |
| jpg→pdf | 16 | jpg→pdf (directa) | 0.870 | — | — | 25 | — | HIGHER_FIDELITY, CERTIFIED_ROUTE |
| aac→mp3 | 17 | aac→mp3 (directa) | 0.789 | aac→flac→mp3 | 0.789 | 208 | 317 | SHORTER_EQUIVALENT_ROUTE |
| aac→wav | 17 | aac→wav (directa) | 0.919 | — | — | 123 | — | SHORTER_EQUIVALENT_ROUTE |
| ts→mp4 | 5 | ts→mp4 (directa) | 0.823 | — | — | 157 | — | SHORTER_EQUIVALENT_ROUTE |
| wmv→mp4 | 5 | wmv→mp4 (directa) | 0.823 | — | — | 139 | — | SHORTER_EQUIVALENT_ROUTE |

## Validación empírica por par

- **md→pdf / html→pdf**: ambas rutas producen PDF legible con el texto esperado
  (pdftotext). Empate exacto de calidad → gana por routeId determinista
  (`DETERMINISTIC_TIEBREAK`). Sin regresión: la heurística legacy elegía la
  misma familia de rutas.
- **docx→pdf**: directa LibreOffice gana; el detour vía ODT no añade fidelidad
  y cuesta el doble (6.8s vs 3.4s).
- **pdf→md / pdf→docx**: una sola ruta viable cada una (las detour destructivas
  vía TXT no existen como rutas seguras). Ambas validadas con contenido real.
- **docx→png**: la ruta certificada docx→pdf→png se mantiene (§50).
- **png→pdf**: la directa embebe los píxeles originales (incl. alpha); el mejor
  detour (vía TIFF) puntúa 0.079 menos. PDF de 1 página válido en ambas.
- **aac→mp3**: ambas salidas son MP3 válidos (ffprobe). La directa re-encoda
  una vez; el detour vía FLAC dos veces — empate de score roto por steps,
  con penalización de re-encode ya aplicada en el score del detour.
- **aac→wav**: target lossless, sin pérdida extra de codec (§15). PCM válido.
- **ts→mp4**: hallazgo de adapter — la capability `transcode-video` re-encoda
  (h264→h264 en el benchmark); el stream copy (remux) solo se ofrece para
  targets MKV (`ffmpeg-engine.ts:195`). Las anotaciones de la matriz se
  alinearon a esta realidad: →mkv = remux, →mp4 = transcode.
- **wmv→mp4**: transcode directo, streams válidos.

## Decisiones de ranking destacadas (audit completo en `FILESTUDIO_ROUTE_RANKING_AUDIT.md`)

- 354 pares multi-ruta auditados; 36 ganadores cambian vs la heurística legacy.
- Cambios con fondo: `docx→txt` ahora usa la extracción directa Pandoc en vez
  del detour vía PDF; `doc/odt/rtf→txt/html` igual (rutas más cortas de igual
  calidad).
- Cambios por desempate determinista (~20): detours equivalentes donde el
  intermedio PNG sustituye a JPG (misma calidad, routeId estable).
- `avi→mp4`, `webm→mkv`, `wmv→mkv`: tras alinear anotaciones con el adapter
  real, la directa remux/transcode gana — sin flips espurios.
- 6 ganadores en banda "not-recommended" (html/md/rst→png/tiff, score 0.448):
  ya estaban bloqueados con el modelo anterior (0.389 < 0.45); no es regresión,
  es una limitación preexistente de esas rutas (sin motor HTML→imagen nativo).

## Hallazgos de engine (alimentan el modelo)

1. **Remux real solo →mkv**: las anotaciones `pipelineMode` reflejan el
   adapter, no el mejor caso teórico.
2. **Guarda binaria en detección** (`probeTextStructure`): los contenedores
   multimedia sin entrada en la tabla magic (mp4/wmv/ts/mkv/avi/mov/aac/m4a)
   se detectaban como `text/plain`, lo que rompía la resolución de
   capabilities en la ruta de producción (`jobs-route.ts`,
   `multistep-processor.ts`). Corregido con guarda NUL/control-char; la
   categoría cae correctamente al fallback por extensión.

## Regresión de cobertura

Ninguna: 456 pares efectivos, Tier 1 152/152, Tier 2 40/40. El split
direct/multistep pasa de 239/217 a 236/220 por los ganadores cambiados —
cambio legítimo de selección, no de cobertura.
