# FileStudio Engine Gap Analysis

Generated: 2026-08-12T23:23:26.133Z

## New Engine / Library Candidates

| Dependency | Decision | Classification | Coverage gain | Quality | License | Portable impact | Security |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Poppler text/html utilities (pdftotext, pdftohtml) | ADOPT | ALREADY BUNDLED / SYSTEM OPTIONAL | PDF->TXT, PDF->HTML, PDF->MD via text/html normalization | High for text PDFs; low for scanned PDFs unless OCR is selected. | GPL family through Poppler distribution | Low if utilities are already in the Windows Poppler bundle; otherwise low/medium to include additional Poppler executables. | Untrusted PDF parser; run with timeouts, temp isolation and output validation. |
| pdf2docx | INVESTIGATE | NEW PYTHON LIBRARY | PDF->DOCX | Medium for text/layout PDFs; weak for scanned PDFs without OCR. | MIT per current upstream notice; project status says no longer actively maintained. | Medium: Python runtime/library packaging, transitive dependencies and Windows smoke needed. | PDF parser surface plus Python dependency supply chain; strict sandbox/temp cleanup required. |
| OCRmyPDF | INVESTIGATE | NEW PYTHON LIBRARY / SYSTEM OPTIONAL | Scanned PDF preprocessing, searchable PDF, better OCR route for PDF->TXT/DOCX pipelines | High for OCR preprocessing, not an editable DOCX converter by itself. | MPL-2.0 for OCRmyPDF core. | High: Python, Ghostscript/Tesseract dependencies and Windows packaging complexity. | Untrusted PDF/image pipeline; high need for resource limits and temp isolation. |
| MarkItDown | INVESTIGATE | NEW PYTHON LIBRARY | PDF/DOCX/HTML/EPUB->MD | Medium; optimized for Markdown extraction/RAG rather than layout-preserving conversion. | Open-source project; exact version/license must be locked before adoption. | Medium: Python packaging and optional plugin decisions. | Avoid network/LLM plugins by default; local-only mode required. |
| MuPDF / PyMuPDF | REJECT | NEW NATIVE BINARY / NEW PYTHON LIBRARY | PDF parsing/extraction/rendering | High potential. | AGPL/commercial. | Medium. | Untrusted PDF parser; strong isolation required. |
| wkhtmltopdf / wkhtmltoimage | REJECT | NEW NATIVE BINARY | HTML->PDF, HTML->PNG | Medium for old WebKit rendering. | LGPLv3, but project warns about stale WebKit/untrusted HTML risk. | Medium to high. | Project warns not to use with untrusted HTML. |

## Dependency Decisions

### Adopt

- Poppler text/html utilities (pdftotext, pdftohtml): Same toolchain family as existing Poppler/pdftoppm; best immediate PDF text extraction path.

### Reject

- MuPDF / PyMuPDF: Licensing risk is too high for default Desktop bundling unless Anclora chooses a commercial license.
- wkhtmltopdf / wkhtmltoimage: Security/maintenance profile is a bad fit for user-supplied files.

### Investigate

- pdf2docx: Most direct permissive candidate for PDF->DOCX, but maintenance status blocks immediate adoption.
- OCRmyPDF: Strong scanned-PDF foundation, but should follow text-PDF extraction work.
- MarkItDown: Promising Markdown coverage boost if kept local and dependency footprint is acceptable.

## Gap Table

| Conversion | Tier | Current pipeline | Current blocker | Existing engine | Existing candidates | New dependency | New candidates | Expected quality | Complexity | Portable impact | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pdf->docx | TIER 1 | None | No PDF layout extraction to DOCX adapter. | PARTIAL | LibreOffice PDF import is not reliable for headless production, Poppler can extract text/raster but not DOCX layout | YES | pdf2docx, PyMuPDF/MuPDF commercial, Unstructured/Docling pipeline | MEDIUM | MEDIUM | MEDIUM | INVESTIGATE pdf2docx for MVP; avoid AGPL MuPDF/PyMuPDF unless commercial licensing is accepted. |
| epub->docx | TIER 2 | None | No effective canonical route within two intermediates. | NO | - | YES | - | UNKNOWN | MEDIUM | UNKNOWN | INVESTIGATE after Tier 1 blockers with clearer user value. |
| pdf->epub | TIER 3 | None | No structured PDF extraction/reflow adapter is implemented. | NO | - | YES | - | UNKNOWN | MEDIUM | UNKNOWN | INVESTIGATE after Tier 1 blockers with clearer user value. |
| pdf->odt | TIER 3 | None | No structured PDF extraction/reflow adapter is implemented. | NO | - | YES | - | UNKNOWN | MEDIUM | UNKNOWN | INVESTIGATE after Tier 1 blockers with clearer user value. |

## Requirements For Future Native Dependencies

Every adopted native dependency must provide exact version, official source, asset URL, SHA256, license metadata, runtime probe, Windows/Linux integration, portable strategy, SBOM update and THIRD_PARTY_NOTICES update.
