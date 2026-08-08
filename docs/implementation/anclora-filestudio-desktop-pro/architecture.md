# Desktop PRO Architecture

## Runtime Boundary

`NEXT_PUBLIC_ANCLORA_FILESTUDIO_MODE=vercel-web` conserva la Web. Cualquier otro
modo renderiza Desktop PRO local.

Desktop PRO usa:

- browser tools para modo rápido local;
- API local y jobs para motores nativos;
- SQLite para historial;
- `/api/health` para diagnóstico;
- portables Windows/Linux como distribución local.

## UI Shell

La pantalla Desktop se organiza por tareas:

1. Imágenes
2. PDF
3. Audio y vídeo
4. Documentos
5. OCR
6. Archivos
7. Ebooks
8. Más herramientas
9. Historial
10. Diagnóstico

Las secciones de Imágenes, PDF y Más herramientas pueden reutilizar herramientas
Web como modo rápido local. Las secciones PRO explican qué motor nativo habilita
cada capacidad y delegan la conversión real al flujo existente cuando procede.

## Capability Model

Se crea `src/lib/capabilities/**` como matriz de producto:

- capacidades Web;
- grupos Desktop PRO;
- runtime capabilities.

La matriz es descriptiva para UI y documentación. Las capacidades ejecutables de
motores siguen siendo calculadas por `src/lib/engines/registry.ts` y las rutas
Desktop.

## Native Engines

| Grupo UI | Motor |
| --- | --- |
| Imágenes | Sharp, background removal |
| PDF | QPDF, Poppler, Tesseract |
| Audio y vídeo | FFmpeg, FFprobe, yt-dlp |
| Documentos | LibreOffice, Pandoc |
| OCR | Tesseract, Poppler |
| Archivos | 7-Zip |
| Ebooks | Calibre |
| Más herramientas | Data Engine |

## Security

Desktop debe mantener:

- `shell: false`;
- paths sanitizados;
- tokens de descarga;
- temp/data en carpeta local;
- host local;
- sin secretos empaquetados;
- Web sin uploads.
