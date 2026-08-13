# FileStudio Release Blockers

## MUST FIX BEFORE RELEASE
- None after final UX remediation on 2026-08-13.

## CAN SHIP
- FS-FPA-002 Direct URLs for `/convert`, `/history` and `/diagnostics` are routable and refresh-safe.
- FS-FPA-003 Scanned PDF to DOCX shows OCR guidance instead of generic engine failure.
- FS-FPA-004 Runtime pack installable flow has minimal consent/progress/cancel UI and backend execution gate.
- Core conversion execution paths audited by API: PDF→DOCX, PDF→ODT, DOCX→PNG, PNG→PDF, MD→PNG, AAC→MP3, WMV→MP4.
- Source+target source contract P0 fixed and covered by unit tests.
- Dev-mode 127.0.0.1 hydration/resource issue fixed.

## FUTURE
- Source-only hub filtering.
- Hide history technical metadata by default.
- Simplify multistep route copy for normal users.
- Clean Turbopack NFT warnings and standalone start script.
