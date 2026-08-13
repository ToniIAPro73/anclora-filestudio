# FileStudio Controlled Fallback E2E Results

Generated: 2026-08-13

## Real Controlled Fallback

Case: `docx -> txt`

Primary route:

- `docx>txt:doc:convert`
- Engine: `pandoc`
- Failure: injected `ENGINE_TIMEOUT`

Fallback route:

- `docx>pdf:office:to-pdf|pdf>txt:pdf:extract-text`
- Engines: `libreoffice`, `poppler`
- Result: PASS

Observed timings:

- LibreOffice step: approximately 3.9s
- Poppler step: approximately 0.5s
- Total fallback conversion: approximately 4.4s

The test does not kill, remove or corrupt any runtime. It injects only the primary route failure and executes the fallback route with real engines.

## Regression Checks

- No discovery regression: PASS
- No tier regression: PASS
- PDF -> EPUB remains unavailable: PASS
- HTML/MD/RST image routes unchanged: PASS
- Optional Chromium runtime model unchanged: PASS

## Cleanup

Failed attempt output is removed before fallback attempt setup. Only final successful output is retained for download.
