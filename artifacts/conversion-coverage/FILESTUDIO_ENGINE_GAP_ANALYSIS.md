# FileStudio Engine Gap Analysis

Generated: 2026-08-12T22:32:57.751Z

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
| pdf->txt | TIER 1 | Poppler raster/OCR only; no text extraction route in standard conversion | No pdf->txt adapter bound to Poppler text/html tools. | YES | Poppler pdftotext, Poppler pdftohtml | NO | - | HIGH for text PDFs, LOW for scanned PDFs without OCR | LOW | LOW | ADOPT existing Poppler utilities after versioned Windows bundle confirms pdftotext/pdftohtml are included. |
| pdf->md | TIER 1 | None | Needs PDF text/layout extraction followed by Markdown normalization. | PARTIAL | Poppler pdftotext + Markdown adapter, Pandoc after HTML extraction | NO | MarkItDown as optional future library | MEDIUM | MEDIUM | LOW to MEDIUM | ADOPT Poppler text extraction first; INVESTIGATE MarkItDown for richer Markdown. |
| pdf->html | TIER 1 | Poppler raster/OCR only; no text extraction route in standard conversion | No pdf->html adapter bound to Poppler text/html tools. | YES | Poppler pdftotext, Poppler pdftohtml | NO | - | MEDIUM | LOW | LOW | ADOPT existing Poppler utilities after versioned Windows bundle confirms pdftotext/pdftohtml are included. |
| docx->rtf | TIER 1 | LibreOffice installed, but matrix omits DOCX->RTF. | No certified edge/probe for DOCX->RTF. | YES | LibreOffice | NO | - | MEDIUM | LOW | LOW | QUICK WIN candidate pending real DOCX->RTF probe. |
| odp->pdf | TIER 1 | LibreOffice installed, but presentation matrix omits ODP source. | No certified edge/probe for odp->pdf. | YES | LibreOffice | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real ODP probe. |
| odp->pptx | TIER 1 | LibreOffice installed, but presentation matrix omits ODP source. | No certified edge/probe for odp->pptx. | YES | LibreOffice | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real ODP probe. |
| png->pdf | TIER 1 | pdf-lib is already installed; browser image-to-PDF exists only for Web. | No Desktop adapter for image embedding into PDF. | YES | pdf-lib, Sharp for image normalization | NO | - | MEDIUM | LOW | LOW | QUICK WIN candidate pending image->PDF adapter and E2E probes. |
| jpg->pdf | TIER 1 | pdf-lib is already installed; browser image-to-PDF exists only for Web. | No Desktop adapter for image embedding into PDF. | YES | pdf-lib, Sharp for image normalization | NO | - | MEDIUM | LOW | LOW | QUICK WIN candidate pending image->PDF adapter and E2E probes. |
| webp->pdf | TIER 1 | pdf-lib is already installed; browser image-to-PDF exists only for Web. | No Desktop adapter for image embedding into PDF. | YES | pdf-lib, Sharp for image normalization | NO | - | MEDIUM | LOW | LOW | QUICK WIN candidate pending image->PDF adapter and E2E probes. |
| tiff->pdf | TIER 1 | pdf-lib is already installed; browser image-to-PDF exists only for Web. | No Desktop adapter for image embedding into PDF. | YES | pdf-lib, Sharp for image normalization | NO | - | MEDIUM | LOW | LOW | QUICK WIN candidate pending image->PDF adapter and E2E probes. |
| mp3->aac | TIER 1 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| wav->aac | TIER 1 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| flac->aac | TIER 1 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| m4a->aac | TIER 1 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| ogg->aac | TIER 1 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| aac->mp3 | TIER 1 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| aac->wav | TIER 1 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| aac->flac | TIER 1 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| aac->m4a | TIER 1 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| aac->ogg | TIER 1 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| wmv->mp4 | TIER 2 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| wmv->webm | TIER 2 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| wmv->mkv | TIER 2 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| ts->mp4 | TIER 2 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| ts->webm | TIER 2 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| ts->mkv | TIER 2 | FFmpeg installed but matrix omits one side of the format. | Canonical edge not declared/certified. | YES | FFmpeg/FFprobe | NO | - | HIGH | LOW | LOW | QUICK WIN candidate pending real media probes. |
| epub->docx | TIER 2 | None | No effective canonical route within two intermediates. | NO | - | YES | - | UNKNOWN | MEDIUM | UNKNOWN | INVESTIGATE after Tier 1 blockers with clearer user value. |
| epub->txt | TIER 2 | None | No effective canonical route within two intermediates. | NO | - | YES | - | UNKNOWN | MEDIUM | UNKNOWN | INVESTIGATE after Tier 1 blockers with clearer user value. |
| epub->html | TIER 2 | None | No effective canonical route within two intermediates. | NO | - | YES | - | UNKNOWN | MEDIUM | UNKNOWN | INVESTIGATE after Tier 1 blockers with clearer user value. |
| epub->md | TIER 2 | None | No effective canonical route within two intermediates. | NO | - | YES | - | UNKNOWN | MEDIUM | UNKNOWN | INVESTIGATE after Tier 1 blockers with clearer user value. |
| pdf->epub | TIER 3 | None | No structured PDF extraction/reflow adapter is implemented. | NO | - | YES | - | UNKNOWN | MEDIUM | UNKNOWN | INVESTIGATE after Tier 1 blockers with clearer user value. |
| pdf->odt | TIER 3 | None | No structured PDF extraction/reflow adapter is implemented. | NO | - | YES | - | UNKNOWN | MEDIUM | UNKNOWN | INVESTIGATE after Tier 1 blockers with clearer user value. |
| png->txt | TIER 3 | None | No effective canonical route within two intermediates. | NO | - | YES | - | UNKNOWN | MEDIUM | UNKNOWN | INVESTIGATE after Tier 1 blockers with clearer user value. |
| jpg->txt | TIER 3 | None | No effective canonical route within two intermediates. | NO | - | YES | - | UNKNOWN | MEDIUM | UNKNOWN | INVESTIGATE after Tier 1 blockers with clearer user value. |
| tiff->txt | TIER 3 | None | No effective canonical route within two intermediates. | NO | - | YES | - | UNKNOWN | MEDIUM | UNKNOWN | INVESTIGATE after Tier 1 blockers with clearer user value. |
| webp->txt | TIER 3 | None | No effective canonical route within two intermediates. | NO | - | YES | - | UNKNOWN | MEDIUM | UNKNOWN | INVESTIGATE after Tier 1 blockers with clearer user value. |

## Requirements For Future Native Dependencies

Every adopted native dependency must provide exact version, official source, asset URL, SHA256, license metadata, runtime probe, Windows/Linux integration, portable strategy, SBOM update and THIRD_PARTY_NOTICES update.
