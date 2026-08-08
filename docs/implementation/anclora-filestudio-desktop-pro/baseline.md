# Baseline Desktop PRO

## Estado Inicial

La rama parte de `main` con la Web Phase 1 ya integrada:

- `vercel-web` renderiza `WebModeConverter` y sus herramientas
  `src/components/web-tools/**`.
- Web ofrece Imágenes, PDF y Más herramientas en navegador.
- Desktop sigue usando el flujo histórico de `src/app/page.tsx`:
  selector de fuente, análisis, panel de compatibilidad, job, historial y
  diagnóstico.
- Los motores Desktop existen en `src/lib/engines/**` y se registran en
  `src/lib/engines/registry.ts`.
- El diagnóstico Desktop ya prueba FFmpeg, FFprobe, yt-dlp, QPDF, 7-Zip,
  Pandoc, LibreOffice, Calibre, Tesseract y Poppler.
- Los scripts de portables Windows/Linux ya existen.

## Comparación

| Área | Web actual | Desktop actual | Objetivo Desktop PRO |
| --- | --- | --- | --- |
| Navegación | Imágenes, PDF, Más herramientas | Convertir, Historial, Diagnóstico | Imágenes, PDF, Audio y vídeo, Documentos, OCR, Archivos, Ebooks, Más herramientas, Historial, Diagnóstico |
| Imágenes | Browser Canvas + EXIF | Motor Sharp en flujo genérico | Web + Sharp PRO, formatos grandes, diagnóstico |
| PDF | `pdf-lib` browser | QPDF/Tesseract en flujo genérico | Organizar, OCR/texto, optimizar, imágenes a PDF |
| Media | No disponible | FFmpeg/yt-dlp genérico | Sección Audio y vídeo |
| Office/texto | No disponible | LibreOffice/Pandoc genérico | Sección Documentos |
| OCR | No disponible | Tesseract genérico | Sección OCR con Poppler/Tesseract |
| Historial | No persistente | SQLite con jobs | Panel más claro y accionable |
| Diagnóstico | Health/capabilities metadata | Lista técnica | Diagnóstico PRO con funciones habilitadas |

## Módulos Reutilizables

- `src/components/web-tools/**`: reutilizable en Desktop como modo rápido local.
- `src/lib/browser-tools/**`: reutilizable para operaciones browser-local.
- `src/components/history/job-history.tsx`: base para historial Desktop.
- `src/components/diagnostics/tool-status-panel.tsx`: base para diagnóstico.
- `src/components/converter/source-selector.tsx` y flujo job: base para motor
  nativo genérico.

## Riesgos

- Romper Web al tocar `src/app/page.tsx`; se debe mantener el early return
  `vercel-web`.
- Mostrar funciones nativas sin motor disponible; el diagnóstico debe seguir
  consultando `/api/health`.
- Portables pueden fallar si se empaquetan `.env.local`, `.git` o rutas Linux.
- Windows LibreOffice debe seguir priorizando `soffice.com`.
- Poppler debe mostrarse como ausente si no está incluido.

## Gate Antes De Implementar

Esta auditoría se creó antes de cambiar código funcional Desktop.
