# Portable Plan

## Linux

Commands:

```bash
pnpm build:portable:linux
pnpm verify:portable:linux
pnpm smoke:portable:linux
pnpm test:acceptance:linux
```

Expected artifacts:

```text
dist/linux/Anclora-FileStudio-Linux-x64.tar.zst
dist/linux/Anclora-FileStudio-Linux-x64.tar.zst.sha256
```

## Windows

Commands:

```bash
pnpm build:portable:windows
pnpm verify:portable:windows
pnpm smoke:portable:windows
pnpm test:acceptance:windows
```

Expected artifacts:

```text
dist/windows/Anclora-FileStudio-Windows-x64-Core.zip
dist/windows/Anclora-FileStudio-Windows-x64-Core.zip.sha256
```

## Critical Constraints

- Windows must keep `soffice.com` priority.
- Poppler must remain missing if not bundled.
- Do not package `.env.local`, `.git`, source-only cache directories or secrets.
- Manifest must include version and commit.
- App must bind to `127.0.0.1`, not `0.0.0.0`.
