# FileStudio PDF -> ODT Implementation

Generated: 2026-08-13

## Decision

PDF -> ODT is adopted as a direct Desktop conversion backed by the existing LibreOffice runtime.

This phase intentionally does not touch PDF -> EPUB. Tier 3 moves from 4/6 to 5/6, leaving PDF -> EPUB deferred for a separate prototype-quality phase.

## Engine

- Engine reused: `LibreOfficeEngine`
- New engine: no
- New dependency: no
- Runtime: existing LibreOffice resolver and Poppler `pdftotext` guard
- Route: `pdf -> odt`
- Intermediate formats: none
- `supportsAsIntermediate`: false

The implementation mirrors the certified PDF -> DOCX path:

1. Validate that the detected input is a PDF.
2. Use `pdftotext` to verify that a text layer exists.
3. Invoke LibreOffice headless with `--infilter=writer_pdf_import`.
4. Export directly to ODT.
5. Validate ODT structure instead of accepting file existence only.

## Execution Contract

Scanned PDFs are rejected before conversion with a controlled OCR-required message. This prevents image-only PDFs from being reported as successful editable ODT output.

The conversion keeps the existing LibreOffice execution contract:

- `shell: false`
- isolated temporary LibreOffice profile
- timeout-controlled process runner
- controlled output directory
- no new runtime discovery path
- no new package dependency

## ODT Validation

The engine validates:

- ZIP signature
- `mimetype`
- `application/vnd.oasis.opendocument.text`
- `content.xml`
- `styles.xml`
- `META-INF/manifest.xml`
- non-empty `office:text` content

The integration suite also validates expected text, image entries under `Pictures/`, paragraph/order preservation for representative PDFs and LibreOffice roundtrip `ODT -> PDF`.

## Matrix Integration

Canonical edge:

- Source: `pdf`
- Target: `odt`
- Operation: `office:pdf-to-odt`
- Implementation: `libreoffice-pdf-import-odt`
- Engine: `libreoffice`
- Dependencies: `libreoffice`, `pdftotext`
- Loss profile: `structural-risk`
- Certification: `benchmarked`

Discovery now exposes:

- `getAllEffectiveTargets("pdf")` includes `odt`
- `getAllEffectiveSources("odt")` includes `pdf`

Routing selects direct `pdf -> odt`. `pdf -> epub` remains unavailable.

## Coverage Impact

- Canonical formats: 50
- Tier 1: 152/152
- Tier 2: 40/40
- Tier 3 before: 4/6
- Tier 3 after: 5/6
- Direct supported pairs after: 237
- Multistep supported pairs after: 239
- Total effective pairs after: 476

Updated canonical coverage artifacts:

- `artifacts/conversion-coverage/FILESTUDIO_CONVERSION_COVERAGE_AUDIT.md`
- `artifacts/conversion-coverage/FILESTUDIO_CONVERSION_COVERAGE_AUDIT.json`
- `artifacts/conversion-coverage/FILESTUDIO_ENGINE_GAP_ANALYSIS.md`
- `artifacts/conversion-coverage/FILESTUDIO_ENGINE_GAP_ANALYSIS.json`
- `artifacts/conversion-coverage/FILESTUDIO_EXECUTION_ALIGNMENT_REPORT.md`
- `artifacts/conversion-coverage/FILESTUDIO_TIER1_ROADMAP.md`
