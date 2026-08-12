# FileStudio Conversion Coverage Audit

Generated: 2026-08-12T22:32:57.751Z

## Metrics

| Metric | Value |
| --- | --- |
| Canonical formats | 50 |
| Total possible ordered pairs | 2450 |
| Direct supported pairs | 192 |
| Multistep supported pairs | 129 |
| Total effective pairs | 321 |
| Tier 1 required | 152 |
| Tier 1 supported | 131 |
| Tier 1 coverage | 86.2% |
| Tier 2 required | 40 |
| Tier 2 supported | 30 |
| Tier 3 required | 6 |
| Tier 3 supported | 0 |

Recommended competitive target: Tier 1 coverage >= 90%.

## PDF Coverage

| PDF as source | Targets |
| --- | --- |
| Direct | png, jpg, tiff |
| One intermediate | - |
| Two intermediates | - |
| All effective | png, jpg, tiff |

## Family Coverage

| Family | Required | Supported | Coverage | Biggest gaps |
| --- | --- | --- | --- | --- |
| DOCUMENTS | 25 | 19 | 76% | pdf->docx, pdf->txt, pdf->md, pdf->html, docx->rtf, pdf->odt |
| IMAGES | 21 | 21 | 100% | - |
| AUDIO | 30 | 20 | 66.7% | mp3->aac, wav->aac, flac->aac, m4a->aac, ogg->aac, aac->mp3, aac->wav, aac->flac, aac->m4a, aac->ogg |
| VIDEO | 18 | 12 | 66.7% | wmv->mp4, wmv->webm, wmv->mkv, ts->mp4, ts->webm, ts->mkv |
| EBOOKS | 27 | 20 | 74.1% | pdf->docx, pdf->txt, pdf->html, epub->docx, epub->txt, epub->html, pdf->epub |
| DATA | 24 | 24 | 100% | - |
| ARCHIVES | 12 | 12 | 100% | - |

## High-Value Missing Conversions

| Conversion | Tier | Blocker | Recommendation |
| --- | --- | --- | --- |
| pdf->docx | TIER 1 | No PDF layout extraction to DOCX adapter. | INVESTIGATE pdf2docx for MVP; avoid AGPL MuPDF/PyMuPDF unless commercial licensing is accepted. |
| pdf->txt | TIER 1 | No pdf->txt adapter bound to Poppler text/html tools. | ADOPT existing Poppler utilities after versioned Windows bundle confirms pdftotext/pdftohtml are included. |
| pdf->md | TIER 1 | Needs PDF text/layout extraction followed by Markdown normalization. | ADOPT Poppler text extraction first; INVESTIGATE MarkItDown for richer Markdown. |
| pdf->html | TIER 1 | No pdf->html adapter bound to Poppler text/html tools. | ADOPT existing Poppler utilities after versioned Windows bundle confirms pdftotext/pdftohtml are included. |
| docx->rtf | TIER 1 | No certified edge/probe for DOCX->RTF. | QUICK WIN candidate pending real DOCX->RTF probe. |
| odp->pdf | TIER 1 | No certified edge/probe for odp->pdf. | QUICK WIN candidate pending real ODP probe. |
| odp->pptx | TIER 1 | No certified edge/probe for odp->pptx. | QUICK WIN candidate pending real ODP probe. |
| png->pdf | TIER 1 | No Desktop adapter for image embedding into PDF. | QUICK WIN candidate pending image->PDF adapter and E2E probes. |
| jpg->pdf | TIER 1 | No Desktop adapter for image embedding into PDF. | QUICK WIN candidate pending image->PDF adapter and E2E probes. |
| webp->pdf | TIER 1 | No Desktop adapter for image embedding into PDF. | QUICK WIN candidate pending image->PDF adapter and E2E probes. |
| tiff->pdf | TIER 1 | No Desktop adapter for image embedding into PDF. | QUICK WIN candidate pending image->PDF adapter and E2E probes. |
| mp3->aac | TIER 1 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| wav->aac | TIER 1 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| flac->aac | TIER 1 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| m4a->aac | TIER 1 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| ogg->aac | TIER 1 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| aac->mp3 | TIER 1 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| aac->wav | TIER 1 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| aac->flac | TIER 1 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| aac->m4a | TIER 1 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| aac->ogg | TIER 1 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| wmv->mp4 | TIER 2 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| wmv->webm | TIER 2 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| wmv->mkv | TIER 2 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| ts->mp4 | TIER 2 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| ts->webm | TIER 2 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| ts->mkv | TIER 2 | Canonical edge not declared/certified. | QUICK WIN candidate pending real media probes. |
| epub->docx | TIER 2 | No effective canonical route within two intermediates. | INVESTIGATE after Tier 1 blockers with clearer user value. |
| epub->txt | TIER 2 | No effective canonical route within two intermediates. | INVESTIGATE after Tier 1 blockers with clearer user value. |
| epub->html | TIER 2 | No effective canonical route within two intermediates. | INVESTIGATE after Tier 1 blockers with clearer user value. |
| epub->md | TIER 2 | No effective canonical route within two intermediates. | INVESTIGATE after Tier 1 blockers with clearer user value. |
| pdf->epub | TIER 3 | No structured PDF extraction/reflow adapter is implemented. | INVESTIGATE after Tier 1 blockers with clearer user value. |
| pdf->odt | TIER 3 | No structured PDF extraction/reflow adapter is implemented. | INVESTIGATE after Tier 1 blockers with clearer user value. |
| png->txt | TIER 3 | No effective canonical route within two intermediates. | INVESTIGATE after Tier 1 blockers with clearer user value. |
| jpg->txt | TIER 3 | No effective canonical route within two intermediates. | INVESTIGATE after Tier 1 blockers with clearer user value. |
| tiff->txt | TIER 3 | No effective canonical route within two intermediates. | INVESTIGATE after Tier 1 blockers with clearer user value. |
| webp->txt | TIER 3 | No effective canonical route within two intermediates. | INVESTIGATE after Tier 1 blockers with clearer user value. |

## Format Audit

### 7Z

Category: archive

- Direct targets: tar, zip
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: tar, zip
- Direct sources: bz2, gz, tar, xz, zip
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: bz2, gz, tar, xz, zip
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### AAC

Category: audio

- Direct targets: -
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: -
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: aac->mp3 (TIER 1), aac->wav (TIER 1), aac->flac (TIER 1), aac->m4a (TIER 1), aac->ogg (TIER 1)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### AVI

Category: video

- Direct targets: mp4, webm, flac, m4a, mkv, mp3, ogg, wav, gif
- One-intermediate targets: avif, jpg, png, tiff, webp
- Two-intermediate targets: -
- All effective targets: mp4, webm, flac, m4a, mkv, mp3, ogg, wav, gif, avif, jpg, png, tiff, webp
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### AVIF

Category: image

- Direct targets: png, webp, gif, jpg, tiff
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: png, webp, gif, jpg, tiff
- Direct sources: gif, jpg, png, tiff, webp
- One-intermediate sources: avi, mkv, mov, mp4, webm
- Two-intermediate sources: -
- All effective sources: gif, jpg, png, tiff, webp, avi, mkv, mov, mp4, webm
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### AZW3

Category: ebook

- Direct targets: epub
- One-intermediate targets: mobi, pdf
- Two-intermediate targets: jpg, png, tiff
- All effective targets: epub, mobi, pdf, jpg, png, tiff
- Direct sources: epub
- One-intermediate sources: docx, html, mobi
- Two-intermediate sources: doc, odt, rtf, md, rst, tex, txt
- All effective sources: epub, docx, html, mobi, doc, odt, rtf, md, rst, tex, txt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### BZ2

Category: archive

- Direct targets: tar, zip, 7z
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: tar, zip, 7z
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### CSV

Category: structured-data

- Direct targets: json, yaml, toml, tsv, xml
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: json, yaml, toml, tsv, xml
- Direct sources: json, toml, tsv, xml, yaml
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: json, toml, tsv, xml, yaml
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### DOC

Category: document

- Direct targets: odt, pdf, docx
- One-intermediate targets: html, md, txt, jpg, png, tiff, epub, rst
- Two-intermediate targets: azw3, mobi, tex
- All effective targets: odt, pdf, html, md, txt, docx, jpg, png, tiff, epub, rst, azw3, mobi, tex
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### DOCX

Category: document

- Direct targets: odt, pdf, html, md, txt, epub, rst
- One-intermediate targets: jpg, png, tiff, azw3, mobi, tex
- Two-intermediate targets: -
- All effective targets: odt, pdf, html, md, txt, jpg, png, tiff, epub, rst, azw3, mobi, tex
- Direct sources: doc, odt, rtf, html, md, rst
- One-intermediate sources: tex, txt
- Two-intermediate sources: -
- All effective sources: doc, odt, rtf, html, md, rst, tex, txt
- High-value missing: docx->rtf (TIER 1)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### EPUB

Category: ebook

- Direct targets: mobi, pdf, azw3
- One-intermediate targets: jpg, png, tiff
- Two-intermediate targets: -
- All effective targets: mobi, pdf, azw3, jpg, png, tiff
- Direct sources: azw3, docx, html, mobi
- One-intermediate sources: doc, odt, rtf, md, rst, tex, txt
- Two-intermediate sources: -
- All effective sources: azw3, docx, html, mobi, doc, odt, rtf, md, rst, tex, txt
- High-value missing: epub->docx (TIER 2), epub->txt (TIER 2), epub->html (TIER 2), epub->md (TIER 2)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### FLAC

Category: audio

- Direct targets: mp3, ogg, wav, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: mp3, ogg, wav, m4a
- Direct sources: avi, m4a, mkv, mov, mp3, mp4, ogg, wav, webm
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avi, m4a, mkv, mov, mp3, mp4, ogg, wav, webm
- High-value missing: flac->aac (TIER 1)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### GIF

Category: image

- Direct targets: avif, png, webp, jpg, tiff
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: avif, png, webp, jpg, tiff
- Direct sources: avif, jpg, png, tiff, webp, avi, mkv, mov, mp4, webm
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avif, jpg, png, tiff, webp, avi, mkv, mov, mp4, webm
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### GZ

Category: archive

- Direct targets: tar, zip, 7z
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: tar, zip, 7z
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### HTML

Category: plain-text

- Direct targets: md, txt, docx, epub, odt, rst
- One-intermediate targets: pdf, azw3, mobi, tex
- Two-intermediate targets: jpg, png, tiff
- All effective targets: md, txt, pdf, docx, epub, odt, rst, jpg, png, tiff, azw3, mobi, tex
- Direct sources: docx, md, rst, tex, txt
- One-intermediate sources: doc, odt, rtf
- Two-intermediate sources: -
- All effective sources: docx, md, rst, tex, txt, doc, odt, rtf
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### JPG

Category: image

- Direct targets: avif, png, webp, gif, tiff
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: avif, png, webp, gif, tiff
- Direct sources: avif, gif, pdf, png, tiff, webp
- One-intermediate sources: doc, docx, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, webm, epub
- Two-intermediate sources: html, md, rst, azw3, mobi
- All effective sources: avif, gif, pdf, png, tiff, webp, doc, docx, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, webm, epub, html, md, rst, azw3, mobi
- High-value missing: jpg->pdf (TIER 1), jpg->txt (TIER 3)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: Adapter missing
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### JSON

Category: structured-data

- Direct targets: csv, yaml, toml, tsv, xml
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: csv, yaml, toml, tsv, xml
- Direct sources: csv, toml, tsv, xml, yaml
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: csv, toml, tsv, xml, yaml
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### M4A

Category: audio

- Direct targets: mp3, ogg, wav, flac
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: mp3, ogg, wav, flac
- Direct sources: avi, flac, mkv, mov, mp3, mp4, ogg, wav, webm
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avi, flac, mkv, mov, mp3, mp4, ogg, wav, webm
- High-value missing: m4a->aac (TIER 1)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### MD

Category: plain-text

- Direct targets: html, txt, docx, odt, rst, tex
- One-intermediate targets: pdf, epub
- Two-intermediate targets: jpg, png, tiff, azw3, mobi
- All effective targets: html, txt, pdf, docx, odt, rst, tex, jpg, png, tiff, epub, azw3, mobi
- Direct sources: docx, html, rst, tex, txt
- One-intermediate sources: doc, odt, rtf
- Two-intermediate sources: -
- All effective sources: docx, html, rst, tex, txt, doc, odt, rtf
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### MKV

Category: video

- Direct targets: mp4, webm, flac, m4a, mp3, ogg, wav, gif
- One-intermediate targets: avif, jpg, png, tiff, webp
- Two-intermediate targets: -
- All effective targets: mp4, webm, flac, m4a, mp3, ogg, wav, gif, avif, jpg, png, tiff, webp
- Direct sources: avi, mov, mp4, webm
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avi, mov, mp4, webm
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### MOBI

Category: ebook

- Direct targets: epub
- One-intermediate targets: pdf, azw3
- Two-intermediate targets: jpg, png, tiff
- All effective targets: epub, pdf, azw3, jpg, png, tiff
- Direct sources: epub
- One-intermediate sources: azw3, docx, html
- Two-intermediate sources: doc, odt, rtf, md, rst, tex, txt
- All effective sources: epub, azw3, docx, html, doc, odt, rtf, md, rst, tex, txt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### MOV

Category: video

- Direct targets: mp4, webm, flac, m4a, mkv, mp3, ogg, wav, gif
- One-intermediate targets: avif, jpg, png, tiff, webp
- Two-intermediate targets: -
- All effective targets: mp4, webm, flac, m4a, mkv, mp3, ogg, wav, gif, avif, jpg, png, tiff, webp
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### MP3

Category: audio

- Direct targets: ogg, wav, flac, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: ogg, wav, flac, m4a
- Direct sources: avi, flac, m4a, mkv, mov, mp4, ogg, wav, webm
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avi, flac, m4a, mkv, mov, mp4, ogg, wav, webm
- High-value missing: mp3->aac (TIER 1)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### MP4

Category: video

- Direct targets: webm, flac, m4a, mkv, mp3, ogg, wav, gif
- One-intermediate targets: avif, jpg, png, tiff, webp
- Two-intermediate targets: -
- All effective targets: webm, flac, m4a, mkv, mp3, ogg, wav, gif, avif, jpg, png, tiff, webp
- Direct sources: avi, mkv, mov, webm
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avi, mkv, mov, webm
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### ODP

Category: presentation

- Direct targets: -
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: -
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: odp->pdf (TIER 1), odp->pptx (TIER 1)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### ODS

Category: spreadsheet

- Direct targets: pdf, xlsx
- One-intermediate targets: jpg, png, tiff
- Two-intermediate targets: -
- All effective targets: pdf, xlsx, jpg, png, tiff
- Direct sources: xls, xlsx
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: xls, xlsx
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### ODT

Category: document

- Direct targets: pdf, docx
- One-intermediate targets: html, md, txt, jpg, png, tiff, epub, rst
- Two-intermediate targets: azw3, mobi, tex
- All effective targets: pdf, html, md, txt, docx, jpg, png, tiff, epub, rst, azw3, mobi, tex
- Direct sources: doc, docx, rtf, html, md, rst
- One-intermediate sources: tex, txt
- Two-intermediate sources: -
- All effective sources: doc, docx, rtf, html, md, rst, tex, txt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### OGG

Category: audio

- Direct targets: mp3, wav, flac, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: mp3, wav, flac, m4a
- Direct sources: avi, flac, m4a, mkv, mov, mp3, mp4, wav, webm
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avi, flac, m4a, mkv, mov, mp3, mp4, wav, webm
- High-value missing: ogg->aac (TIER 1)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### PDF

Category: pdf

- Direct targets: png, jpg, tiff
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: png, jpg, tiff
- Direct sources: doc, docx, ods, odt, ppt, pptx, rtf, xls, xlsx, epub
- One-intermediate sources: html, md, rst, azw3, mobi
- Two-intermediate sources: tex, txt
- All effective sources: doc, docx, ods, odt, ppt, pptx, rtf, xls, xlsx, epub, html, md, rst, azw3, mobi, tex, txt
- High-value missing: pdf->docx (TIER 1), pdf->txt (TIER 1), pdf->md (TIER 1), pdf->html (TIER 1), pdf->epub (TIER 3), pdf->odt (TIER 3)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: Adapter missing
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### PNG

Category: image

- Direct targets: avif, webp, gif, jpg, tiff
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: avif, webp, gif, jpg, tiff
- Direct sources: avif, gif, jpg, pdf, tiff, webp
- One-intermediate sources: doc, docx, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, webm, epub
- Two-intermediate sources: html, md, rst, azw3, mobi
- All effective sources: avif, gif, jpg, pdf, tiff, webp, doc, docx, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, webm, epub, html, md, rst, azw3, mobi
- High-value missing: png->pdf (TIER 1), png->txt (TIER 3)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: Adapter missing
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### PPT

Category: presentation

- Direct targets: pdf, pptx
- One-intermediate targets: jpg, png, tiff
- Two-intermediate targets: -
- All effective targets: pdf, pptx, jpg, png, tiff
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### PPTX

Category: presentation

- Direct targets: pdf
- One-intermediate targets: jpg, png, tiff
- Two-intermediate targets: -
- All effective targets: pdf, jpg, png, tiff
- Direct sources: ppt
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: ppt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### RST

Category: plain-text

- Direct targets: html, md, txt, docx, odt, tex
- One-intermediate targets: pdf, epub
- Two-intermediate targets: jpg, png, tiff, azw3, mobi
- All effective targets: html, md, txt, pdf, docx, odt, tex, jpg, png, tiff, epub, azw3, mobi
- Direct sources: docx, html, md
- One-intermediate sources: doc, odt, rtf, tex, txt
- Two-intermediate sources: -
- All effective sources: docx, html, md, doc, odt, rtf, tex, txt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### RTF

Category: document

- Direct targets: odt, pdf, docx
- One-intermediate targets: html, md, txt, jpg, png, tiff, epub, rst
- Two-intermediate targets: azw3, mobi, tex
- All effective targets: odt, pdf, html, md, txt, docx, jpg, png, tiff, epub, rst, azw3, mobi, tex
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### TAR

Category: archive

- Direct targets: zip, 7z
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: zip, 7z
- Direct sources: 7z, bz2, gz, xz, zip
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: 7z, bz2, gz, xz, zip
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### TEX

Category: plain-text

- Direct targets: html, md
- One-intermediate targets: txt, docx, epub, odt, rst
- Two-intermediate targets: pdf, azw3, mobi
- All effective targets: html, md, txt, pdf, docx, epub, odt, rst, azw3, mobi
- Direct sources: md, rst
- One-intermediate sources: docx, html, txt
- Two-intermediate sources: doc, odt, rtf
- All effective sources: md, rst, docx, html, txt, doc, odt, rtf
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### TIFF

Category: image

- Direct targets: avif, png, webp, gif, jpg
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: avif, png, webp, gif, jpg
- Direct sources: avif, gif, jpg, pdf, png, webp
- One-intermediate sources: doc, docx, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, webm, epub
- Two-intermediate sources: html, md, rst, azw3, mobi
- All effective sources: avif, gif, jpg, pdf, png, webp, doc, docx, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, webm, epub, html, md, rst, azw3, mobi
- High-value missing: tiff->pdf (TIER 1), tiff->txt (TIER 3)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: Adapter missing
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### TOML

Category: structured-data

- Direct targets: csv, json, yaml, tsv, xml
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: csv, json, yaml, tsv, xml
- Direct sources: csv, json, tsv, xml, yaml
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: csv, json, tsv, xml, yaml
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### TS

Category: video

- Direct targets: -
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: -
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: ts->mp4 (TIER 2), ts->webm (TIER 2), ts->mkv (TIER 2)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### TSV

Category: structured-data

- Direct targets: csv, json, yaml, toml, xml
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: csv, json, yaml, toml, xml
- Direct sources: csv, json, toml, xml, yaml
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: csv, json, toml, xml, yaml
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### TXT

Category: plain-text

- Direct targets: html, md
- One-intermediate targets: docx, epub, odt, rst, tex
- Two-intermediate targets: pdf, azw3, mobi
- All effective targets: html, md, pdf, docx, epub, odt, rst, tex, azw3, mobi
- Direct sources: docx, html, md, rst
- One-intermediate sources: doc, odt, rtf, tex
- Two-intermediate sources: -
- All effective sources: docx, html, md, rst, doc, odt, rtf, tex
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### WAV

Category: audio

- Direct targets: mp3, ogg, flac, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: mp3, ogg, flac, m4a
- Direct sources: avi, flac, m4a, mkv, mov, mp3, mp4, ogg, webm
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avi, flac, m4a, mkv, mov, mp3, mp4, ogg, webm
- High-value missing: wav->aac (TIER 1)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### WEBM

Category: video

- Direct targets: mp4, flac, m4a, mkv, mp3, ogg, wav, gif
- One-intermediate targets: avif, jpg, png, tiff, webp
- Two-intermediate targets: -
- All effective targets: mp4, flac, m4a, mkv, mp3, ogg, wav, gif, avif, jpg, png, tiff, webp
- Direct sources: avi, mkv, mov, mp4
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avi, mkv, mov, mp4
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### WEBP

Category: image

- Direct targets: avif, png, gif, jpg, tiff
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: avif, png, gif, jpg, tiff
- Direct sources: avif, gif, jpg, png, tiff
- One-intermediate sources: avi, mkv, mov, mp4, webm
- Two-intermediate sources: -
- All effective sources: avif, gif, jpg, png, tiff, avi, mkv, mov, mp4, webm
- High-value missing: webp->pdf (TIER 1), webp->txt (TIER 3)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: Adapter missing
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### WMV

Category: video

- Direct targets: -
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: -
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: wmv->mp4 (TIER 2), wmv->webm (TIER 2), wmv->mkv (TIER 2)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### XLS

Category: spreadsheet

- Direct targets: ods, pdf, xlsx
- One-intermediate targets: jpg, png, tiff
- Two-intermediate targets: -
- All effective targets: ods, pdf, xlsx, jpg, png, tiff
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### XLSX

Category: spreadsheet

- Direct targets: ods, pdf
- One-intermediate targets: jpg, png, tiff
- Two-intermediate targets: -
- All effective targets: ods, pdf, jpg, png, tiff
- Direct sources: ods, xls
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: ods, xls
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### XML

Category: structured-data

- Direct targets: csv, json, yaml, toml, tsv
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: csv, json, yaml, toml, tsv
- Direct sources: csv, json, toml, tsv, yaml
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: csv, json, toml, tsv, yaml
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### XZ

Category: archive

- Direct targets: tar, zip, 7z
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: tar, zip, 7z
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### YAML

Category: structured-data

- Direct targets: csv, json, toml, tsv, xml
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: csv, json, toml, tsv, xml
- Direct sources: csv, json, toml, tsv, xml
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: csv, json, toml, tsv, xml
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### ZIP

Category: archive

- Direct targets: tar, 7z
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: tar, 7z
- Direct sources: 7z, bz2, gz, tar, xz
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: 7z, bz2, gz, tar, xz
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

