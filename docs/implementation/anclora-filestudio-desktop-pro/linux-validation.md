# Linux Validation

## Manual Steps

1. Extraer `dist/linux/Anclora-FileStudio-Linux-x64.tar.zst`.
2. Ejecutar el script de arranque del portable.
3. Abrir la URL local.
4. Probar herramientas principales.
5. Revisar diagnóstico.
6. Parar la aplicación.
7. Verificar limpieza de temporales.

## Automated Commands

```bash
pnpm build:portable:linux
pnpm verify:portable:linux
pnpm smoke:portable:linux
pnpm test:acceptance:linux
```

## Expected Artifact

```text
dist/linux/Anclora-FileStudio-Linux-x64.tar.zst
dist/linux/Anclora-FileStudio-Linux-x64.tar.zst.sha256
```

## Current Run

Pendiente de ejecución en esta rama.
