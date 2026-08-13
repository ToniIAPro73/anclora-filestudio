# FileStudio — PDF → DOCX Quality Results

Phase: PDF → DOCX Dependency Evaluation + MVP
Candidate under test: **LibreOffice `writer_pdf_import`** (headless, MPL-2.0)
Runner: `tests/integration/pdf-docx-real.test.ts` — real binary execution on Linux VPS.
Date: 2026-08-12

## Scoring scale (technical, not commercial)

Per dimension:

- `3` — full fidelity (content and structure preserved)
- `2` — usable with minor loss (content complete, minor structure/style drift)
- `1` — degraded but recoverable (content readable, structure lost)
- `0` — failed (content missing/corrupt)

## Acceptance threshold (proposed and applied)

PASS requires ALL of:

- simple text: exact expected text present — **required**
- multipage: all page markers present — **required**
- Unicode: full token set preserved — **required**
- images: embedded in `word/media/` — **required**
- no corruption: valid OOXML zip + LibreOffice roundtrip smoke — **required**
- paths with spaces: clean execution — **required**
- tables: cell content present in reading order — **acceptable** (w:tbl rebuild NOT required; warning disclosed)
- headings: text present — **acceptable** (Word style rebuild NOT required; warning disclosed)
- scanned PDF: controlled rejection with OCR hint — **required** (no fake empty DOCX)

## Corpus results

| Case | Fixture | Result | TEXT | STRUCTURE | TABLES | IMAGES | LAYOUT | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PDFDOCX-001 | simple text | PASS | 3 | 2 | — | — | 2 | exact text; positioned text boxes |
| PDFDOCX-002 | headings + paragraphs | PASS | 3 | 1 | — | — | 2 | heading text preserved, Word styles lost (disclosed) |
| PDFDOCX-003 | multipage (3 pages) | PASS | 3 | 2 | — | — | 2 | all page markers present |
| PDFDOCX-004 | Unicode áéíóú ñ € αβγ ΔΩ | PASS | 3 | 2 | — | — | 2 | full token set preserved |
| PDFDOCX-005 | table | PASS (acceptable) | 3 | 1 | 1 | — | 1 | cells present in reading order; no `w:tbl` rebuild (disclosed) |
| PDFDOCX-006 | image | PASS | 3 | 2 | — | 3 | 2 | image embedded in `word/media/` |
| PDFDOCX-007 | mixed table + image | PASS | 3 | 1 | 1 | 3 | 1 | text + image both preserved |
| PDFDOCX-008 | two-column layout | PASS | 3 | 1 | — | — | 1 | both column texts recoverable; column geometry not rebuilt |
| PDFDOCX-009 | scanned (no text layer) | PASS (controlled) | — | — | — | — | — | rejected with OCR hint; no output file written |
| PDFDOCX-010 | path with spaces | PASS | 3 | 2 | — | — | 2 | spawn args, no shell concat |
| PDFDOCX-SMOKE | docx→pdf LibreOffice roundtrip | PASS | — | — | — | — | — | generated DOCX re-opens cleanly, valid `%PDF-` output |

## Verdict

QUALITY THRESHOLD: **PASS**

- Text fidelity, multipage, Unicode, image embedding, no-corruption and scanned-rejection all meet the required bar.
- Known, disclosed degradations: tables flatten to positioned text (no editable table objects); headings lose Word styles; complex multi-column geometry is not rebuilt. Output remains a useful editable document.
- `mc:AlternateContent` Choice/Fallback duplication observed in `word/document.xml` is standard OOXML fallback markup and renders once in Word/LibreOffice — not a defect.

## Execution evidence

`npx vitest run tests/integration/pdf-docx-real.test.ts` — 11/11 PASS (48.5s real LibreOffice execution).
