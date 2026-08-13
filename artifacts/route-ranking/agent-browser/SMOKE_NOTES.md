# Agent-Browser Smoke — Quality-Aware Routing

Fecha: 2026-08-13. Servidor: `pnpm start -p 3100` (build producción).
Browser: agent-browser global con `--no-sandbox,--disable-http2`.

## Discovery UI (sin hardcodes)

- `De=PDF` → A: DOCX, HTML, MD, TXT, JPEG, PNG, TIFF. Botones rápidos:
  PNG, TXT, DOCX, TIFF, JPG, HTML, MD. = conjunto certificado PDF.
- `De=PNG` → A: PDF, DOCX, HTML, MD, TXT, AVIF, GIF, JPEG, TIFF, WEBP.
  Image→PDF presente vía discovery.
- `De=DOCX` → A: PDF, RTF, HTML, MD, ODT, RST, TXT, LaTeX, JPEG, PNG, TIFF,
  AZW3, EPUB, MOBI. PNG multistep visible (ruta certificada DOCX→PDF→PNG).
- `De=AAC` → A: FLAC, M4A, MP3, OGG, WAV. Botones: WAV, MP3, OGG, FLAC, M4A.
- `De=TXT` → A: docx, html, tex, md, odt, pdf, rst, rtf, azw3, epub, mobi.
  **Source contract**: sin PNG, sin audio — solo targets alcanzables.

## Conversión real vía API (misma ruta de producción que la UI)

1. `POST /api/inputs/analyze` (smoke-fixture.png 64×48) → category `image`,
   detectedFormat `png` (guarda binaria de detección funcionando en producción).
2. `POST /api/capabilities` (universalDescriptor) → 10 caps discovery-driven:
   `route-png-pdf` available, recommended `route-png-avif`.
3. `POST /api/jobs` (capabilityId `route-png-pdf`) → job completado.
4. `GET /api/jobs/:id/token` + `GET /api/download/:id` → `smoke-result.pdf`
   1263 bytes, firma `%PDF-` válida.

## Incidencias del harness (no del producto)

- Upload por CDP (`setFileInputFiles`) no fija `input.files` en este setup;
  la conversión E2E se validó por la API que consume la propia UI.
- Selects React controlados: `agent-browser select` es flaky; workaround con
  native setter + `change` event para el caso TXT.
- `net::ERR_ALPN_NEGOTIATION_FAILED` en POSTs iniciales; resuelto relanzando
  Chrome con `--disable-http2`.

## Evidencias

- `home.png` — screenshot home con Quick Converter.
- `analyze.json`, `caps.json`, `job.json` — respuestas API reales.
- `smoke-fixture.png`, `smoke-result.pdf` — input/output de la conversión.
