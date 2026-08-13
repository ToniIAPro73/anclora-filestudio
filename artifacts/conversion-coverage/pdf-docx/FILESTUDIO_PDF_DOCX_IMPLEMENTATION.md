# FileStudio — PDF → DOCX Implementation

Phase: PDF → DOCX Dependency Evaluation + MVP
Decision: **LibreOffice `writer_pdf_import`** — see `FILESTUDIO_PDF_DOCX_EVALUATION.md`.
Date: 2026-08-12

## New dependency type

**NONE.** The selected engine is a feature of the LibreOffice runtime already adopted
and certified in the Tier 1 quick-wins phase. No package, binary or Python runtime was added.

## Integration points

| Layer | Location | Change |
| --- | --- | --- |
| Engine adapter | `src/lib/engines/document/libreoffice-engine.ts` | `convert-pdf-to-docx` operation: scanned guard + `--infilter=writer_pdf_import` + DOCX structural validation |
| Scanned guard | same file, `execute()` | `pdftotext` ground-truth text check via the shared Poppler resolver before import; empty text layer → controlled rejection (`SCANNED_PDF_DOCX_ERROR`) |
| Capability | same file, `getCapabilities()` / `buildPdfToDocxCapability()` | pdf category → DOCX capability with degradation warnings (tables, heading styles, scanned) |
| Operation | `src/lib/domain/operations.ts` | `office:pdf-to-docx` (category `document`, deps `libreoffice` + `pdftotext`, lossProfile `structural-risk`) |
| Matrix edge | `src/lib/conversion-matrix/matrix.ts` | `pdf→docx`, implementationId `libreoffice-pdf-import-docx`, priority 90, `supportsAsIntermediate: false` (§32) |
| Registry | `src/lib/engines/registry.ts` | `pdf` added to LibreOffice supported categories |

## Runtime resolution (§26)

Single source, no second resolver:

- LibreOffice binary: existing `findLibreofficeBinary()` (env var → portable → PATH).
- `pdftotext`: existing `resolvePopplerTool("pdftotext")` from `poppler-engine.ts` — the same
  resolver used by diagnostics, discovery and the Poppler engines. The Poppler
  execution-alignment regression tests continue to hold.

Diagnostics, discovery, routing and execution all derive availability from the same
engine probe (`capabilities` includes `pdf-to-docx`) and the canonical matrix dependencies.

## Security (§29/§30)

- `spawn`/`execFile` only, `shell: false` — paths with spaces are single argv tokens (PDFDOCX-010).
- Path safety: `ensurePathSafety()` on input and output (resolved-path containment, no `startsWith`).
- Temp isolation: per-run LibreOffice profile dir and output dir, both removed in `finally` (§28).
- No macro execution: `--headless --norestore` with isolated `-env:UserInstallation`.
- Timeout: job-level `timeoutMs` enforced by `ProcessRunner` (SIGKILL on expiry); stdout/stderr capped.
- Malicious/malformed PDFs: import filter failure → non-zero exit → controlled error, no partial output promoted.
- No fake success: empty text layer → rejection; validation requires PK signature, `word/document.xml` and non-empty `w:t` content (§37).

## Scanned / mixed PDF behavior (§13/§14/§36)

- TEXT PDF: full MVP support.
- SCANNED PDF: rejected before conversion with the §36 message:
  "Este PDF parece estar compuesto principalmente por imágenes escaneadas. PDF → DOCX editable requiere OCR. Usa Conversión con OCR."
- MIXED PDF: textual content converts; image-only pages contribute no text. Documented in capability warnings. `PDF→DOCX WITH OCR` remains a future capability (requires OCRmyPDF-class pipeline, out of scope).

## Source contract (§35)

Explicit PDF→DOCX accepts PDF only (`SOURCE-007`); AUTO discovery accepts PDF as a reachable
DOCX source (`SOURCE-008`); backend validation cannot be bypassed (`SOURCE-006` unchanged, passing).

## Windows strategy (static readiness, §23/§51 — NO portable built)

Verified statically against the existing bundle staging (`scripts/.staging/Anclora-FileStudio-Windows-x64-Core`)
and build scripts — no portable was generated:

- `pdftotext.exe`, `pdftohtml.exe` and `pdftoppm.exe` are all present in the bundled Poppler
  (`tools/poppler/Library/bin/`), so the scanned-guard dependency works out of the box on Windows.
- The portable Core bundle does **not** embed LibreOffice today (tools: ffmpeg, pandoc, poppler,
  qpdf, sevenzip, yt-dlp). PDF→DOCX on Windows therefore follows exactly the same availability
  contract as the already-certified office quick wins (`docx→pdf`, `docx→rtf`, `odp→pdf`,
  `odp→pptx`): available when a LibreOffice installation is present (resolver probes
  `ANCLORA_FILESTUDIO_LIBREOFFICE_PATH` → portable paths → `soffice.com`/`soffice.exe` on PATH),
  honestly reported as `unavailable-tool` otherwise. No parity gap is introduced by this phase.
- `writer_pdf_import` ships inside every standard LibreOffice desktop installation
  (`pdfimport` filter library), so any LibreOffice the resolver finds supports the edge.
  No extra component, SBOM entry or notice is required.
- `scripts/validate-windows-office-portable.ps1` already exercises the LibreOffice capability
  path end-to-end for the final native QA; PDF→DOCX adds no new packaging requirement.
- Portable generation remains deferred to the single final Windows build per policy.

## Linux strategy (§24)

System LibreOffice + system Poppler on the VPS; E2E runs natively
(`tests/integration/pdf-docx-real.test.ts`, 11/11 PASS).

## Tests

- Unit: `tests/unit/pdf-docx.test.ts` — PDFDOCX-UNIT-001..005 (11 tests).
- Matrix/discovery: `tests/unit/conversion-matrix-quickwins.test.ts` — availability,
  pdftotext-dependency honesty, `getAllEffectiveTargets("pdf")`/`getAllEffectiveSources("docx")` (§33).
- Source contract: `tests/unit/source-format-contract.test.ts` — SOURCE-007/008.
- E2E: `tests/integration/pdf-docx-real.test.ts` — PDFDOCX-001..010 + LibreOffice roundtrip smoke (11/11 PASS).

## Coverage impact

- TIER 1: 151/152 (99.3%) → **152/152 (100%)**.
- Direct pairs: 238 → 239; multistep: 202 → 217; total effective: 440 → **456**.
- TIER 2: 40/40 (100%); TIER 3: 4/6 (66.7%) — unchanged definitions, no tier edits.
