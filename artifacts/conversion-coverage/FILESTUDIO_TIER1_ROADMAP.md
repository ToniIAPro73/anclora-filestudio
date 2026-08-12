# FileStudio Tier 1 Coverage Roadmap

Generated: 2026-08-12T22:32:57.751Z

## Coverage Target

Recommended target before calling FileStudio competitive: Tier 1 coverage >= 90% with E2E probes for every newly declared edge.

Current Tier 1 coverage: 131/152 (86.2%).

## Quick Wins Without New Dependencies

| Conversion | Tier | Engines | Expected quality | Cost | Recommendation |
| --- | --- | --- | --- | --- | --- |
| pdf->txt | TIER 1 | Poppler pdftotext, Poppler pdftohtml | HIGH for text PDFs, LOW for scanned PDFs without OCR | LOW | ADOPT existing Poppler utilities after versioned Windows bundle confirms pdftotext/pdftohtml are included. |
| pdf->md | TIER 1 | Poppler pdftotext + Markdown adapter, Pandoc after HTML extraction | MEDIUM | MEDIUM | ADOPT Poppler text extraction first; INVESTIGATE MarkItDown for richer Markdown. |
| pdf->html | TIER 1 | Poppler pdftotext, Poppler pdftohtml | MEDIUM | LOW | ADOPT existing Poppler utilities after versioned Windows bundle confirms pdftotext/pdftohtml are included. |
| docx->rtf | TIER 1 | LibreOffice | MEDIUM | LOW | QUICK WIN candidate pending real DOCX->RTF probe. |
| odp->pdf | TIER 1 | LibreOffice | HIGH | LOW | QUICK WIN candidate pending real ODP probe. |
| odp->pptx | TIER 1 | LibreOffice | HIGH | LOW | QUICK WIN candidate pending real ODP probe. |
| png->pdf | TIER 1 | pdf-lib, Sharp for image normalization | MEDIUM | LOW | QUICK WIN candidate pending image->PDF adapter and E2E probes. |
| jpg->pdf | TIER 1 | pdf-lib, Sharp for image normalization | MEDIUM | LOW | QUICK WIN candidate pending image->PDF adapter and E2E probes. |
| webp->pdf | TIER 1 | pdf-lib, Sharp for image normalization | MEDIUM | LOW | QUICK WIN candidate pending image->PDF adapter and E2E probes. |
| tiff->pdf | TIER 1 | pdf-lib, Sharp for image normalization | MEDIUM | LOW | QUICK WIN candidate pending image->PDF adapter and E2E probes. |
| mp3->aac | TIER 1 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| wav->aac | TIER 1 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| flac->aac | TIER 1 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| m4a->aac | TIER 1 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| ogg->aac | TIER 1 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| aac->mp3 | TIER 1 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| aac->wav | TIER 1 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| aac->flac | TIER 1 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| aac->m4a | TIER 1 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| aac->ogg | TIER 1 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| wmv->mp4 | TIER 2 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| wmv->webm | TIER 2 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| wmv->mkv | TIER 2 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| ts->mp4 | TIER 2 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| ts->webm | TIER 2 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |
| ts->mkv | TIER 2 | FFmpeg/FFprobe | HIGH | LOW | QUICK WIN candidate pending real media probes. |

## Tier 1 Requiring New Dependencies

| Conversion | Blocker | Candidates | Recommendation |
| --- | --- | --- | --- |
| pdf->docx | No PDF layout extraction to DOCX adapter. | pdf2docx, PyMuPDF/MuPDF commercial, Unstructured/Docling pipeline | INVESTIGATE pdf2docx for MVP; avoid AGPL MuPDF/PyMuPDF unless commercial licensing is accepted. |

## Priority Matrix

| Conversion | Tier | User value | Current status | Engine | New dependency | Expected quality | Implementation cost | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pdf->txt | TIER 1 | High | Missing but existing engine can likely handle | Poppler pdftotext, Poppler pdftohtml | None | HIGH for text PDFs, LOW for scanned PDFs without OCR | LOW | P0 quick win after E2E probe |
| pdf->md | TIER 1 | High | Missing but existing engine can likely handle | Poppler pdftotext + Markdown adapter, Pandoc after HTML extraction | None | MEDIUM | MEDIUM | P0 quick win after E2E probe |
| pdf->html | TIER 1 | High | Missing but existing engine can likely handle | Poppler pdftotext, Poppler pdftohtml | None | MEDIUM | LOW | P0 quick win after E2E probe |
| docx->rtf | TIER 1 | High | Missing but existing engine can likely handle | LibreOffice | None | MEDIUM | LOW | P0 quick win after E2E probe |
| odp->pdf | TIER 1 | High | Missing but existing engine can likely handle | LibreOffice | None | HIGH | LOW | P0 quick win after E2E probe |
| odp->pptx | TIER 1 | High | Missing but existing engine can likely handle | LibreOffice | None | HIGH | LOW | P0 quick win after E2E probe |
| png->pdf | TIER 1 | High | Missing but existing engine can likely handle | pdf-lib, Sharp for image normalization | None | MEDIUM | LOW | P0 quick win after E2E probe |
| jpg->pdf | TIER 1 | High | Missing but existing engine can likely handle | pdf-lib, Sharp for image normalization | None | MEDIUM | LOW | P0 quick win after E2E probe |
| webp->pdf | TIER 1 | High | Missing but existing engine can likely handle | pdf-lib, Sharp for image normalization | None | MEDIUM | LOW | P0 quick win after E2E probe |
| tiff->pdf | TIER 1 | High | Missing but existing engine can likely handle | pdf-lib, Sharp for image normalization | None | MEDIUM | LOW | P0 quick win after E2E probe |
| mp3->aac | TIER 1 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| wav->aac | TIER 1 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| flac->aac | TIER 1 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| m4a->aac | TIER 1 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| ogg->aac | TIER 1 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| aac->mp3 | TIER 1 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| aac->wav | TIER 1 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| aac->flac | TIER 1 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| aac->m4a | TIER 1 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| aac->ogg | TIER 1 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| wmv->mp4 | TIER 2 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| wmv->webm | TIER 2 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| wmv->mkv | TIER 2 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| ts->mp4 | TIER 2 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| ts->webm | TIER 2 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| ts->mkv | TIER 2 | High | Missing but existing engine can likely handle | FFmpeg/FFprobe | None | HIGH | LOW | P0 quick win after E2E probe |
| pdf->docx | TIER 1 | High | No PDF layout extraction to DOCX adapter. | - | pdf2docx, PyMuPDF/MuPDF commercial, Unstructured/Docling pipeline | MEDIUM | MEDIUM/HIGH | P1 dependency investigation |
