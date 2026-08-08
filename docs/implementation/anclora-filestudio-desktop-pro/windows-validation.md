# Windows Validation

## Manual Steps

1. Copiar `dist/windows/Anclora-FileStudio-Windows-x64-Core.zip` a Windows.
2. Descomprimir en una ruta local con espacios y Unicode.
3. Ejecutar `INICIAR_ANCLORA_FILESTUDIO.bat`.
4. Abrir la URL local mostrada.
5. Revisar Imágenes, PDF, Audio y vídeo, Documentos, OCR, Archivos, Ebooks,
   Más herramientas, Historial y Diagnóstico.
6. Verificar que LibreOffice usa `soffice.com`.
7. Verificar Tesseract e idiomas instalados.
8. Verificar Poppler; si no está incluido debe figurar como no disponible.
9. Cerrar con `CERRAR_ANCLORA_FILESTUDIO.bat`.

## Automated Commands

```bash
pnpm build:portable:windows
pnpm verify:portable:windows
pnpm smoke:portable:windows
pnpm test:acceptance:windows
```

## Expected Artifact

```text
dist/windows/Anclora-FileStudio-Windows-x64-Core.zip
dist/windows/Anclora-FileStudio-Windows-x64-Core.zip.sha256
```

## Current Run

Pendiente de ejecución en esta rama.
