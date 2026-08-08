# Desktop PRO Security Model

## Local-First Boundary

Desktop PRO runs on the user's machine. File contents stay local. Native engines
execute with `shell: false` and receive validated argument arrays.

## Required Controls

- Path traversal prevention with resolved paths.
- Sanitized filenames for outputs and ZIP manifests.
- Input size/page/duration/expansion limits.
- Download tokens with expiry.
- Temporary cleanup.
- No full file content in logs.
- No secrets in portables.
- Web Vercel remains upload-free.

## Platform Notes

Windows:

- LibreOffice probe must prefer `soffice.com`.
- Missing Poppler must produce Windows-specific guidance.
- Tesseract language paths must be explicit.

Linux:

- Installation hints can use package manager commands.
- Portable should prefer bundled tools when available.
