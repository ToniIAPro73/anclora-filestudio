# FileStudio Conversion Coverage Audit

Generated: 2026-08-12T23:23:26.133Z

## Metrics

| Metric | Value |
| --- | --- |
| Canonical formats | 50 |
| Total possible ordered pairs | 2450 |
| Direct supported pairs | 238 |
| Multistep supported pairs | 202 |
| Total effective pairs | 440 |
| Tier 1 required | 152 |
| Tier 1 supported | 151 |
| Tier 1 coverage | 99.3% |
| Tier 2 required | 40 |
| Tier 2 supported | 39 |
| Tier 3 required | 6 |
| Tier 3 supported | 4 |

Recommended competitive target: Tier 1 coverage >= 90%.

## PDF Coverage

| PDF as source | Targets |
| --- | --- |
| Direct | png, txt, jpg, tiff, html, md |
| One intermediate | - |
| Two intermediates | - |
| All effective | png, txt, jpg, tiff, html, md |

## Family Coverage

| Family | Required | Supported | Coverage | Biggest gaps |
| --- | --- | --- | --- | --- |
| DOCUMENTS | 25 | 23 | 92% | pdf->docx, pdf->odt |
| IMAGES | 21 | 21 | 100% | - |
| AUDIO | 30 | 30 | 100% | - |
| VIDEO | 18 | 18 | 100% | - |
| EBOOKS | 27 | 24 | 88.9% | pdf->docx, epub->docx, pdf->epub |
| DATA | 24 | 24 | 100% | - |
| ARCHIVES | 12 | 12 | 100% | - |

## High-Value Missing Conversions

| Conversion | Tier | Blocker | Recommendation |
| --- | --- | --- | --- |
| pdf->docx | TIER 1 | No PDF layout extraction to DOCX adapter. | INVESTIGATE pdf2docx for MVP; avoid AGPL MuPDF/PyMuPDF unless commercial licensing is accepted. |
| epub->docx | TIER 2 | No effective canonical route within two intermediates. | INVESTIGATE after Tier 1 blockers with clearer user value. |
| pdf->epub | TIER 3 | No structured PDF extraction/reflow adapter is implemented. | INVESTIGATE after Tier 1 blockers with clearer user value. |
| pdf->odt | TIER 3 | No structured PDF extraction/reflow adapter is implemented. | INVESTIGATE after Tier 1 blockers with clearer user value. |

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

- Direct targets: mp3, ogg, wav, flac, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: mp3, ogg, wav, flac, m4a
- Direct sources: avi, flac, m4a, mkv, mov, mp3, mp4, ogg, ts, wav, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avi, flac, m4a, mkv, mov, mp3, mp4, ogg, ts, wav, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### AVI

Category: video

- Direct targets: mp4, webm, aac, flac, m4a, mkv, mp3, ogg, wav, gif
- One-intermediate targets: avif, jpg, png, tiff, webp
- Two-intermediate targets: pdf
- All effective targets: mp4, webm, aac, flac, m4a, mkv, mp3, ogg, wav, gif, avif, jpg, png, tiff, webp, pdf
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
- One-intermediate targets: pdf
- Two-intermediate targets: txt, html, md
- All effective targets: png, webp, gif, jpg, tiff, pdf, txt, html, md
- Direct sources: gif, jpg, png, tiff, webp
- One-intermediate sources: avi, mkv, mov, mp4, ts, webm, wmv
- Two-intermediate sources: -
- All effective sources: gif, jpg, png, tiff, webp, avi, mkv, mov, mp4, ts, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### AZW3

Category: ebook

- Direct targets: epub
- One-intermediate targets: mobi, pdf
- Two-intermediate targets: jpg, png, tiff, txt, html, md
- All effective targets: epub, mobi, pdf, jpg, png, tiff, txt, html, md
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

- Direct targets: odt, pdf, docx, rtf
- One-intermediate targets: txt, html, md, jpg, png, tiff, epub, rst
- Two-intermediate targets: azw3, mobi, tex
- All effective targets: odt, pdf, txt, html, md, docx, rtf, jpg, png, tiff, epub, rst, azw3, mobi, tex
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

- Direct targets: odt, pdf, html, md, rtf, epub, rst
- One-intermediate targets: txt, jpg, png, tiff, azw3, mobi, tex
- Two-intermediate targets: -
- All effective targets: odt, pdf, txt, html, md, rtf, jpg, png, tiff, epub, rst, azw3, mobi, tex
- Direct sources: doc, odt, rtf, html, md, rst
- One-intermediate sources: tex, txt
- Two-intermediate sources: -
- All effective sources: doc, odt, rtf, html, md, rst, tex, txt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### EPUB

Category: ebook

- Direct targets: mobi, pdf, azw3
- One-intermediate targets: jpg, png, tiff, txt, html, md
- Two-intermediate targets: -
- All effective targets: mobi, pdf, azw3, jpg, png, tiff, txt, html, md
- Direct sources: azw3, docx, html, mobi
- One-intermediate sources: doc, odt, rtf, md, rst, tex, txt
- Two-intermediate sources: -
- All effective sources: azw3, docx, html, mobi, doc, odt, rtf, md, rst, tex, txt
- High-value missing: epub->docx (TIER 2)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### FLAC

Category: audio

- Direct targets: mp3, ogg, wav, aac, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: mp3, ogg, wav, aac, m4a
- Direct sources: aac, avi, m4a, mkv, mov, mp3, mp4, ogg, ts, wav, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: aac, avi, m4a, mkv, mov, mp3, mp4, ogg, ts, wav, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### GIF

Category: image

- Direct targets: avif, png, webp, jpg, tiff
- One-intermediate targets: pdf
- Two-intermediate targets: txt, html, md
- All effective targets: avif, png, webp, jpg, tiff, pdf, txt, html, md
- Direct sources: avif, jpg, png, tiff, webp, avi, mkv, mov, mp4, ts, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avif, jpg, png, tiff, webp, avi, mkv, mov, mp4, ts, webm, wmv
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
- One-intermediate targets: pdf, rtf, azw3, mobi, tex
- Two-intermediate targets: jpg, png, tiff
- All effective targets: md, txt, pdf, docx, epub, odt, rst, rtf, jpg, png, tiff, azw3, mobi, tex
- Direct sources: docx, md, pdf, rst, tex, txt
- One-intermediate sources: doc, jpg, odp, ods, odt, png, ppt, pptx, rtf, tiff, webp, xls, xlsx, epub
- Two-intermediate sources: avif, gif, azw3, mobi
- All effective sources: docx, md, pdf, rst, tex, txt, doc, jpg, odp, ods, odt, png, ppt, pptx, rtf, tiff, webp, xls, xlsx, epub, avif, gif, azw3, mobi
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### JPG

Category: image

- Direct targets: avif, png, webp, gif, pdf, tiff
- One-intermediate targets: txt, html, md
- Two-intermediate targets: -
- All effective targets: avif, png, webp, gif, pdf, tiff, txt, html, md
- Direct sources: avif, gif, pdf, png, tiff, webp
- One-intermediate sources: doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, ts, webm, wmv, epub
- Two-intermediate sources: html, md, rst, azw3, mobi
- All effective sources: avif, gif, pdf, png, tiff, webp, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, ts, webm, wmv, epub, html, md, rst, azw3, mobi
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

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

- Direct targets: mp3, ogg, wav, aac, flac
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: mp3, ogg, wav, aac, flac
- Direct sources: aac, avi, flac, mkv, mov, mp3, mp4, ogg, ts, wav, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: aac, avi, flac, mkv, mov, mp3, mp4, ogg, ts, wav, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### MD

Category: plain-text

- Direct targets: html, txt, docx, odt, rst, tex
- One-intermediate targets: pdf, rtf, epub
- Two-intermediate targets: jpg, png, tiff, azw3, mobi
- All effective targets: html, txt, pdf, docx, odt, rst, tex, rtf, jpg, png, tiff, epub, azw3, mobi
- Direct sources: docx, html, pdf, rst, tex, txt
- One-intermediate sources: doc, jpg, odp, ods, odt, png, ppt, pptx, rtf, tiff, webp, xls, xlsx, epub
- Two-intermediate sources: avif, gif, azw3, mobi
- All effective sources: docx, html, pdf, rst, tex, txt, doc, jpg, odp, ods, odt, png, ppt, pptx, rtf, tiff, webp, xls, xlsx, epub, avif, gif, azw3, mobi
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### MKV

Category: video

- Direct targets: mp4, webm, aac, flac, m4a, mp3, ogg, wav, gif
- One-intermediate targets: avif, jpg, png, tiff, webp
- Two-intermediate targets: pdf
- All effective targets: mp4, webm, aac, flac, m4a, mp3, ogg, wav, gif, avif, jpg, png, tiff, webp, pdf
- Direct sources: avi, mov, mp4, ts, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avi, mov, mp4, ts, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### MOBI

Category: ebook

- Direct targets: epub
- One-intermediate targets: pdf, azw3
- Two-intermediate targets: jpg, png, tiff, txt, html, md
- All effective targets: epub, pdf, azw3, jpg, png, tiff, txt, html, md
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

- Direct targets: mp4, webm, aac, flac, m4a, mkv, mp3, ogg, wav, gif
- One-intermediate targets: avif, jpg, png, tiff, webp
- Two-intermediate targets: pdf
- All effective targets: mp4, webm, aac, flac, m4a, mkv, mp3, ogg, wav, gif, avif, jpg, png, tiff, webp, pdf
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

- Direct targets: ogg, wav, aac, flac, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: ogg, wav, aac, flac, m4a
- Direct sources: aac, avi, flac, m4a, mkv, mov, mp4, ogg, ts, wav, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: aac, avi, flac, m4a, mkv, mov, mp4, ogg, ts, wav, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### MP4

Category: video

- Direct targets: webm, aac, flac, m4a, mkv, mp3, ogg, wav, gif
- One-intermediate targets: avif, jpg, png, tiff, webp
- Two-intermediate targets: pdf
- All effective targets: webm, aac, flac, m4a, mkv, mp3, ogg, wav, gif, avif, jpg, png, tiff, webp, pdf
- Direct sources: avi, mkv, mov, ts, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avi, mkv, mov, ts, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### ODP

Category: presentation

- Direct targets: pdf, pptx
- One-intermediate targets: jpg, png, tiff, txt, html, md
- Two-intermediate targets: -
- All effective targets: pdf, pptx, jpg, png, tiff, txt, html, md
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### ODS

Category: spreadsheet

- Direct targets: pdf, xlsx
- One-intermediate targets: jpg, png, tiff, txt, html, md
- Two-intermediate targets: -
- All effective targets: pdf, xlsx, jpg, png, tiff, txt, html, md
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

- Direct targets: pdf, docx, rtf
- One-intermediate targets: txt, html, md, jpg, png, tiff, epub, rst
- Two-intermediate targets: azw3, mobi, tex
- All effective targets: pdf, txt, html, md, docx, rtf, jpg, png, tiff, epub, rst, azw3, mobi, tex
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

- Direct targets: mp3, wav, aac, flac, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: mp3, wav, aac, flac, m4a
- Direct sources: aac, avi, flac, m4a, mkv, mov, mp3, mp4, ts, wav, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: aac, avi, flac, m4a, mkv, mov, mp3, mp4, ts, wav, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### PDF

Category: pdf

- Direct targets: png, txt, jpg, tiff, html, md
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: png, txt, jpg, tiff, html, md
- Direct sources: doc, docx, jpg, odp, ods, odt, png, ppt, pptx, rtf, tiff, webp, xls, xlsx, epub
- One-intermediate sources: avif, gif, html, md, rst, azw3, mobi
- Two-intermediate sources: avi, mkv, mov, mp4, ts, webm, wmv, tex, txt
- All effective sources: doc, docx, jpg, odp, ods, odt, png, ppt, pptx, rtf, tiff, webp, xls, xlsx, epub, avif, gif, html, md, rst, azw3, mobi, avi, mkv, mov, mp4, ts, webm, wmv, tex, txt
- High-value missing: pdf->docx (TIER 1), pdf->epub (TIER 3), pdf->odt (TIER 3)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: Adapter missing
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Tier 1 gaps may reduce competitive coverage.

### PNG

Category: image

- Direct targets: avif, webp, gif, jpg, pdf, tiff
- One-intermediate targets: txt, html, md
- Two-intermediate targets: -
- All effective targets: avif, webp, gif, jpg, pdf, tiff, txt, html, md
- Direct sources: avif, gif, jpg, pdf, tiff, webp
- One-intermediate sources: doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, ts, webm, wmv, epub
- Two-intermediate sources: html, md, rst, azw3, mobi
- All effective sources: avif, gif, jpg, pdf, tiff, webp, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, ts, webm, wmv, epub, html, md, rst, azw3, mobi
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### PPT

Category: presentation

- Direct targets: pdf, pptx
- One-intermediate targets: jpg, png, tiff, txt, html, md
- Two-intermediate targets: -
- All effective targets: pdf, pptx, jpg, png, tiff, txt, html, md
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
- One-intermediate targets: jpg, png, tiff, txt, html, md
- Two-intermediate targets: -
- All effective targets: pdf, jpg, png, tiff, txt, html, md
- Direct sources: odp, ppt
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: odp, ppt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### RST

Category: plain-text

- Direct targets: html, md, txt, docx, odt, tex
- One-intermediate targets: pdf, rtf, epub
- Two-intermediate targets: jpg, png, tiff, azw3, mobi
- All effective targets: html, md, txt, pdf, docx, odt, tex, rtf, jpg, png, tiff, epub, azw3, mobi
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
- One-intermediate targets: txt, html, md, jpg, png, tiff, epub, rst
- Two-intermediate targets: azw3, mobi, tex
- All effective targets: odt, pdf, txt, html, md, docx, jpg, png, tiff, epub, rst, azw3, mobi, tex
- Direct sources: doc, docx, odt
- One-intermediate sources: html, md, rst
- Two-intermediate sources: tex, txt
- All effective sources: doc, docx, odt, html, md, rst, tex, txt
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
- Two-intermediate targets: pdf, rtf, azw3, mobi
- All effective targets: html, md, txt, pdf, docx, epub, odt, rst, rtf, azw3, mobi
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

- Direct targets: avif, png, webp, gif, jpg, pdf
- One-intermediate targets: txt, html, md
- Two-intermediate targets: -
- All effective targets: avif, png, webp, gif, jpg, pdf, txt, html, md
- Direct sources: avif, gif, jpg, pdf, png, webp
- One-intermediate sources: doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, ts, webm, wmv, epub
- Two-intermediate sources: html, md, rst, azw3, mobi
- All effective sources: avif, gif, jpg, pdf, png, webp, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, ts, webm, wmv, epub, html, md, rst, azw3, mobi
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

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

- Direct targets: mp4, webm, aac, flac, m4a, mkv, mp3, ogg, wav, gif
- One-intermediate targets: avif, jpg, png, tiff, webp
- Two-intermediate targets: pdf
- All effective targets: mp4, webm, aac, flac, m4a, mkv, mp3, ogg, wav, gif, avif, jpg, png, tiff, webp, pdf
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
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
- Two-intermediate targets: pdf, rtf, azw3, mobi
- All effective targets: html, md, pdf, docx, epub, odt, rst, tex, rtf, azw3, mobi
- Direct sources: pdf, html, md, rst
- One-intermediate sources: doc, docx, jpg, odp, ods, odt, png, ppt, pptx, rtf, tiff, webp, xls, xlsx, epub, tex
- Two-intermediate sources: avif, gif, azw3, mobi
- All effective sources: pdf, html, md, rst, doc, docx, jpg, odp, ods, odt, png, ppt, pptx, rtf, tiff, webp, xls, xlsx, epub, tex, avif, gif, azw3, mobi
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### WAV

Category: audio

- Direct targets: mp3, ogg, aac, flac, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: mp3, ogg, aac, flac, m4a
- Direct sources: aac, avi, flac, m4a, mkv, mov, mp3, mp4, ogg, ts, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: aac, avi, flac, m4a, mkv, mov, mp3, mp4, ogg, ts, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### WEBM

Category: video

- Direct targets: mp4, aac, flac, m4a, mkv, mp3, ogg, wav, gif
- One-intermediate targets: avif, jpg, png, tiff, webp
- Two-intermediate targets: pdf
- All effective targets: mp4, aac, flac, m4a, mkv, mp3, ogg, wav, gif, avif, jpg, png, tiff, webp, pdf
- Direct sources: avi, mkv, mov, mp4, ts, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: avi, mkv, mov, mp4, ts, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### WEBP

Category: image

- Direct targets: avif, png, gif, jpg, pdf, tiff
- One-intermediate targets: txt, html, md
- Two-intermediate targets: -
- All effective targets: avif, png, gif, jpg, pdf, tiff, txt, html, md
- Direct sources: avif, gif, jpg, png, tiff
- One-intermediate sources: avi, mkv, mov, mp4, ts, webm, wmv
- Two-intermediate sources: -
- All effective sources: avif, gif, jpg, png, tiff, avi, mkv, mov, mp4, ts, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### WMV

Category: video

- Direct targets: mp4, webm, aac, flac, m4a, mkv, mp3, ogg, wav, gif
- One-intermediate targets: avif, jpg, png, tiff, webp
- Two-intermediate targets: pdf
- All effective targets: mp4, webm, aac, flac, m4a, mkv, mp3, ogg, wav, gif, avif, jpg, png, tiff, webp, pdf
- Direct sources: -
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: -
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### XLS

Category: spreadsheet

- Direct targets: ods, pdf, xlsx
- One-intermediate targets: jpg, png, tiff, txt, html, md
- Two-intermediate targets: -
- All effective targets: ods, pdf, xlsx, jpg, png, tiff, txt, html, md
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
- One-intermediate targets: jpg, png, tiff, txt, html, md
- Two-intermediate targets: -
- All effective targets: ods, pdf, jpg, png, tiff, txt, html, md
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

