# Windows QA Remediation Report

Date: 2026-08-11
Repository: Anclora FileStudio
Portable candidate: `dist/windows/Anclora-FileStudio-Windows-x64-Core.zip`
Candidate SHA256: `f160775ea3b96909ba572150507649cdd8658a02792034f05ba907dc5368a82b`

## Summary

All five confirmed Windows QA defects were remediated and validated against the source repository and a freshly generated Windows portable candidate. No release was generated and no artifacts were published.

## DEF-002 - Health version/build mismatch

Status: fixed

Root cause: `/api/health` fell back to stale hardcoded runtime metadata, while the portable manifest and `VERSION.txt` were generated from packaging metadata.

Solution: `/api/health` now reads `ANCLORA_FILESTUDIO_VERSION` before `npm_package_version`, and the Windows launcher reads `manifest.json` at startup to export `ANCLORA_FILESTUDIO_VERSION` and `ANCLORA_FILESTUDIO_BUILD_ID`.

Validation:

- `manifest.json` version: `0.2.0`
- `manifest.json` buildId: `win-x64-2026-08-11`
- `VERSION.txt`: `Anclora FileStudio 0.2.0`
- launcher contains both runtime exports

## DEF-003 - Image analysis returns 0x0

Status: fixed

Root cause: `buildAttributes()` returned static image attributes with `width: 0` and `height: 0`; no later enrichment populated real metadata.

Solution: image detection now dynamically loads Sharp server-side, reads real metadata, validates readable image content, and populates real dimensions plus reliable fields including channels, alpha, format, color space, animation/frame count and density.

Validation:

- PNG fixture dimensions verified
- JPEG fixture dimensions verified
- WebP fixture dimensions verified
- corrupted PNG validation remains covered

## DEF-004 - PDF rotate completed without rotating

Status: fixed

Root cause: QPDF execution read the operation from `plan.options.operation`; jobs store the selected operation in `plan.operation`. When options omitted the operation, the engine defaulted to linearize, produced a valid PDF, and the job completed.

Solution: QPDF now normalizes operation from `plan.operation` with option fallback, applies page rotation with an explicit `1-z` range, supports 90/180/270, and validates rotated page metadata after execution.

Validation:

- regression test generates PDF fixture
- executes QPDF rotation
- independently loads output with `pdf-lib`
- verifies actual page rotation for 90/180/270
- engine validation fails if rotated output metadata does not match expected rotation

## DEF-005 - Developer absolute paths in portable

Status: fixed

Root cause: Next standalone metadata (`server.js` config, source maps and trace files) included absolute build-machine paths.

Solution: Windows packaging removes build-only trace/source-map metadata, sanitizes standalone server metadata, and fails staging if developer workspace paths are present. Verify and smoke scripts now scan package text files generically for `/home/.../anclora/`, `/workspace/anclora/`, and `/home/toni/`.

Validation:

- staging guard passed during packaging
- `verify:portable:windows` passed developer-path check
- `smoke:portable:windows` passed developer-path check
- manual staging scan found `0` developer paths

## DEF-006 - Double extension in outputs

Status: fixed

Root cause: final output filename appended the target extension to the whole input title, preserving the original extension.

Solution: output filename construction now removes only the final existing extension before appending the target format, while preserving multi-dot names, spaces, Unicode and extensionless names.

Validation:

- `foto.png` -> `foto.webp`
- `documento.docx` -> `documento.pdf`
- `libro.epub` -> `libro.mobi`
- `informe.final.docx` -> `informe.final.pdf`

## Commits

- `48fa4b6` fix: align portable runtime version metadata
- `b39e25d` fix: populate real image dimensions during analysis
- `7fcc520` fix: apply PDF rotation correctly
- `a8ff753` fix: normalize converted output filenames
- `61a08de` fix: remove developer paths from portable packaging

## Tests And Validation

- `pnpm typecheck` - pass
- `pnpm test` - pass, 59 passed / 1 skipped files, 779 passed / 1 skipped tests
- `pnpm build` - pass
- `bash -n scripts/build-windows-portable.sh scripts/verify-windows-portable-v2.sh scripts/smoke-windows-portable.sh` - pass
- focused regression tests - pass, 60 tests
- `pnpm run build:portable:windows` - pass
- `pnpm run verify:portable:windows` - pass, 94 checks
- `pnpm run smoke:portable:windows` - pass, 39 structural checks
- `pnpm run test:acceptance:fixtures` - pass, 62 fixtures generated; optional `python-pptx` fixture generation skipped because module `pptx` is not installed

## Pending Issues

- Native Windows smoke/acceptance was not executed in this Linux/WSL environment because neither `powershell.exe` nor `pwsh` is available.
- Existing lint warnings remain for `<img>` usage in `src/components/inspector/compare-inspector-modal.tsx`; they are warnings, not errors, and are unrelated to this remediation.

REMEDIATION: PASS WITH MINOR ISSUES
