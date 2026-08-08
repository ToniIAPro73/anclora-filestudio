# Browser vs Desktop

| Área | Web | Desktop PRO/local |
| --- | --- | --- |
| Runtime | Navegador en Vercel | Next local en `127.0.0.1` |
| Imágenes | JPEG/PNG/WebP, Canvas, EXIF básico | Web + Sharp, AVIF/TIFF, lotes grandes |
| PDF | `pdf-lib` browser | Web + QPDF, Poppler, Tesseract |
| Audio/vídeo | No disponible | FFmpeg, FFprobe, yt-dlp |
| Documentos | No disponible | LibreOffice, Pandoc |
| OCR | No disponible | Tesseract + Poppler |
| Archivos | No disponible | 7-Zip |
| Ebooks | No disponible | Calibre |
| Historial | No persistente | SQLite local |
| Diagnóstico | Health/capabilities metadata | Motores, rutas, versiones, plataforma |
| Uploads | No sube contenido | Local API en la misma máquina |

Desktop PRO es el superset local. Web se mantiene como entrada rápida y sin
instalación.
