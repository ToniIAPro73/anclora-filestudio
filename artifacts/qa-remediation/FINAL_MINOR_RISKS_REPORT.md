# Final Minor Risks Hardening Report

Date: 2026-08-12
Repository: `anclora-filestudio`

## Summary

The three minor risks from native Windows RC3 QA are closed.

- RISK-001 was correct behavior with an incomplete HTTP contract expression.
- RISK-002 was a verification automation gap. Manual visual confirmation already existed.
- RISK-003 was a product contract gap for extensionless uploads.

## RISK-001 - Metadata API Contract

Diagnosis: `/api/metadata` is a POST operation. It consumes a JSON body containing an input URL and extracts metadata through the desktop route. GET has no meaningful resource-read contract.

Resolution:

- Kept `POST /api/metadata` as the canonical method.
- Added explicit `GET /api/metadata` response: `405 Method Not Allowed`.
- Added `Allow: POST`.
- Added JSON body with `METHOD_NOT_ALLOWED` and `allowedMethods: ["POST"]`.
- Updated historical baseline documentation that incorrectly listed GET.
- Added unit contract tests for POST delegation and GET 405.

Live QA:

- `POST /api/metadata` invalid body: expected `400`, obtained `400`, code `INVALID_URL`.
- `GET /api/metadata`: expected `405`, obtained `405`.
- `Allow` header: expected `POST`, obtained `POST`.

Classification: correct behavior not explicitly documented/tested.

## RISK-002 - Branding / Logo Verification

Diagnosis: the canonical logo was already visually confirmed by the user and active shells already referenced `/brand/anclora-filestudio.png`. The gap was reproducible technical verification.

Resolution:

- Did not change branding, assets, dimensions or styling.
- Added technical contract tests for:
  - canonical asset existence;
  - `FILESTUDIO_BRAND.logoPath`;
  - active Web and Desktop shell references;
  - zero old `@/assets/logo.png` references in active UI sources;
  - PNG decode;
  - valid non-placeholder dimensions.
- Extended existing Playwright app smoke to verify the logo image is visible and decoded in the DOM.

Live QA:

- Canonical asset: PASS.
- Web shell canonical reference: PASS.
- Desktop shell canonical reference: PASS.
- Old placeholder reference in active UI: 0.
- HTTP canonical logo: `200`.
- HTTP Content-Type: `image/png`.
- PNG decode: PASS.
- Dimensions: `1254x1254`.
- Manual visual confirmation: PASS.
- Browser/DOM automated smoke: PASS.

Classification: verification gap.

## RISK-003 - File Without Extension

Diagnosis: extensionless files were rejected before content detection, even when the existing detector could reliably identify magic-byte formats. Unknown extensionless files must be rejected before job creation and must not create malformed output names.

Resolution:

- Added explicit upload handling for files with no extension.
- Unknown extensionless content is rejected with controlled `415 UNSUPPORTED_INPUT`.
- Magic-byte-recognized extensionless formats are accepted using the existing detector.
- Input metadata preserves the original extensionless name.
- Job output naming remains normalized by the existing processor:
  - `archivo` to WebP -> `archivo.webp`;
  - `.` to WebP -> `archivo-convertido.webp`;
  - uppercase extensions normalize by replacing only the final input extension;
  - multiple dots, spaces and Unicode are preserved safely.
- Added tests for unknown extensionless rejection, PNG extensionless detection, extension parsing, and final output filenames.

QA:

- Unknown extensionless: rejected, `415`, code `UNSUPPORTED_INPUT`.
- Recognizable extensionless: PNG accepted, `200`, detected format `png`.
- HTTP/API error behavior: controlled, no `500`.
- Output created for unknown extensionless: no.
- Filename contract: no `.pdf`, `.webp`, double extension, or empty-base output.

Classification: product contract gap with small runtime fix.

## Validation

- `pnpm typecheck`: PASS.
- `pnpm test`: PASS, 795 passed, 1 skipped.
- `pnpm build`: PASS.
- `bash -n scripts/build-windows-portable.sh`: PASS.
- `bash -n scripts/verify-windows-portable-v2.sh`: PASS.
- `bash -n scripts/smoke-windows-portable.sh`: PASS.
- `pnpm run build:portable:windows`: PASS.
- `pnpm run verify:portable:windows`: PASS, 98 checks.
- `pnpm run smoke:portable:windows`: PASS, 42/42 structural checks. Native PowerShell execution skipped because the environment is WSL.
- Playwright logo smoke: PASS.

Build notes:

- Next/Turbopack emitted existing NFT trace warnings for dynamic desktop route/config imports; build succeeded.
- Portable build lint emitted existing `<img>` warnings in `src/components/inspector/compare-inspector-modal.tsx`; lint exited successfully.
- Portable smoke warned `semver@7.8.5` while expecting `7.8.4`; smoke remained PASS.

## Portable

New portable generated because runtime routes changed.

- Path: `dist/windows/Anclora-FileStudio-Windows-x64-Core.zip`
- Size: 232M
- SHA256: `e1b958d0b5c7724fbe16f11f1fca36a2d2ef46f5829257ed5d57b7658b1888fe`

## Commits

- `f4bcccd fix: formalize metadata API contract`
- `85515ba test: harden canonical branding verification`
- `7945a5c fix: formalize extensionless input handling`

## Remaining Risks

No remaining minor risk for the three scoped RC3 findings.

Residual environment note: native Windows smoke still requires running the generated ZIP on an actual Windows host, as expected by the WSL smoke script.
