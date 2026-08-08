# PRO Capability Matrix

| Sección | Operaciones | Herramientas |
| --- | --- | --- |
| Imágenes | Convertir, comprimir, redimensionar, strip metadata, AVIF, TIFF, batch | Browser, Sharp |
| PDF | Unir, dividir, reordenar, rotar, linearizar, OCR, imágenes a PDF | Browser, QPDF, Poppler, Tesseract |
| Audio y vídeo | Audio, vídeo, extraer audio, normalizar, recortar, miniaturas, GIF, URL | FFmpeg, FFprobe, yt-dlp |
| Documentos | Office a PDF, texto, Markdown, HTML, RST, LaTeX | LibreOffice, Pandoc |
| OCR | Imagen a texto/PDF buscable, PDF escaneado a texto/PDF buscable | Tesseract, Poppler |
| Archivos | Listar, extraer, ZIP, 7Z, TAR, repack | 7-Zip |
| Ebooks | EPUB, MOBI, AZW3, HTML/DOCX a EPUB | Calibre |
| Más herramientas | JSON, YAML, TOML, XML, CSV, TSV | Data Engine |

La matriz UI vive en `src/lib/capabilities/desktop-capabilities.ts`.
Las capacidades ejecutables siguen saliendo de `src/lib/engines/registry.ts`.
