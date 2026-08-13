# FileStudio Conversion Coverage Audit

Generated: 2026-08-13T03:11:22.080Z

## Metrics

| Metric | Value |
| --- | --- |
| Canonical formats | 50 |
| Total possible ordered pairs | 2450 |
| Direct supported pairs | 236 |
| Multistep supported pairs | 224 |
| Total effective pairs | 460 |
| Tier 1 required | 152 |
| Tier 1 supported | 152 |
| Tier 1 coverage | 100% |
| Tier 2 required | 40 |
| Tier 2 supported | 40 |
| Tier 3 required | 6 |
| Tier 3 supported | 4 |

Recommended competitive target: Tier 1 coverage >= 90%.

## PDF Coverage

| PDF as source | Targets |
| --- | --- |
| Direct | png, txt, docx, tiff, jpg, html, md |
| One intermediate | - |
| Two intermediates | - |
| All effective | png, txt, docx, tiff, jpg, html, md |

## Family Coverage

| Family | Required | Supported | Coverage | Biggest gaps |
| --- | --- | --- | --- | --- |
| DOCUMENTS | 25 | 24 | 96% | pdf->odt |
| IMAGES | 21 | 21 | 100% | - |
| AUDIO | 30 | 30 | 100% | - |
| VIDEO | 18 | 18 | 100% | - |
| EBOOKS | 27 | 26 | 96.3% | pdf->epub |
| DATA | 24 | 24 | 100% | - |
| ARCHIVES | 12 | 12 | 100% | - |

## High-Value Missing Conversions

| Conversion | Tier | Blocker | Recommendation |
| --- | --- | --- | --- |
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

- Direct targets: wav, mp3, ogg, flac, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: wav, mp3, ogg, flac, m4a
- Direct sources: flac, m4a, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: flac, m4a, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### AVI

Category: video

- Direct targets: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
- One-intermediate targets: png, tiff, avif, jpg, webp
- Two-intermediate targets: pdf
- All effective targets: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, pdf, png, tiff, avif, jpg, webp, gif
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

- Direct targets: png, webp, tiff, gif
- One-intermediate targets: pdf, jpg
- Two-intermediate targets: txt, html, docx, md
- All effective targets: png, webp, tiff, gif, pdf, jpg, txt, html, docx, md
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
- Two-intermediate targets: txt, docx, html, png, tiff, md, jpg
- All effective targets: epub, mobi, pdf, txt, docx, html, png, tiff, md, jpg
- Direct sources: epub
- One-intermediate sources: mobi, docx, html
- Two-intermediate sources: doc, odt, rtf, md, rst, tex, txt
- All effective sources: epub, mobi, docx, html, doc, odt, rtf, md, rst, tex, txt
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
- Direct sources: tsv, json, toml, xml, yaml
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: tsv, json, toml, xml, yaml
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### DOC

Category: document

- Direct targets: odt, pdf, docx, rtf
- One-intermediate targets: md, txt, html, png, tiff, jpg, epub, rst
- Two-intermediate targets: azw3, mobi, tex
- All effective targets: odt, pdf, md, txt, html, docx, rtf, png, tiff, jpg, epub, azw3, mobi, rst, tex
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

- Direct targets: odt, pdf, md, txt, html, rtf, epub, rst
- One-intermediate targets: png, tiff, jpg, azw3, mobi, tex
- Two-intermediate targets: -
- All effective targets: odt, pdf, md, txt, html, rtf, png, tiff, jpg, epub, azw3, mobi, rst, tex
- Direct sources: doc, odt, rtf, md, html, pdf
- One-intermediate sources: rst, tex, odp, ods, ppt, pptx, xls, xlsx, jpg, png, tiff, webp, epub, txt
- Two-intermediate sources: avif, gif, azw3, mobi
- All effective sources: doc, odt, rtf, md, html, rst, tex, pdf, odp, ods, ppt, pptx, xls, xlsx, jpg, png, tiff, webp, avif, gif, epub, azw3, mobi, txt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### EPUB

Category: ebook

- Direct targets: mobi, pdf, azw3
- One-intermediate targets: txt, docx, html, png, tiff, md, jpg
- Two-intermediate targets: -
- All effective targets: mobi, pdf, azw3, txt, docx, html, png, tiff, md, jpg
- Direct sources: docx, azw3, mobi, html
- One-intermediate sources: doc, odt, rtf, md, rst
- Two-intermediate sources: tex, txt
- All effective sources: docx, doc, odt, rtf, azw3, mobi, md, html, rst, tex, txt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### FLAC

Category: audio

- Direct targets: wav, mp3, ogg, aac, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: wav, mp3, ogg, aac, m4a
- Direct sources: aac, m4a, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: aac, m4a, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### GIF

Category: image

- Direct targets: png, avif, webp, tiff, jpg
- One-intermediate targets: pdf
- Two-intermediate targets: txt, html, docx, md
- All effective targets: png, avif, webp, tiff, jpg, pdf, txt, html, docx, md
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

- Direct targets: md, txt, png, tiff, docx, odt, rst, epub
- One-intermediate targets: pdf, rtf, azw3, mobi, tex
- Two-intermediate targets: jpg
- All effective targets: md, txt, pdf, png, tiff, docx, odt, rst, rtf, azw3, epub, mobi, tex, jpg
- Direct sources: md, rst, pdf, docx, tex, txt
- One-intermediate sources: doc, odt, rtf, odp, ods, ppt, pptx, xls, xlsx, jpg, png, tiff, webp, epub
- Two-intermediate sources: avif, gif, azw3, mobi
- All effective sources: md, rst, pdf, docx, doc, odt, rtf, odp, ods, ppt, pptx, xls, xlsx, tex, jpg, png, tiff, webp, avif, gif, epub, azw3, mobi, txt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### JPG

Category: image

- Direct targets: png, avif, webp, tiff, pdf, gif
- One-intermediate targets: txt, html, docx, md
- Two-intermediate targets: -
- All effective targets: png, avif, webp, tiff, pdf, gif, txt, html, docx, md
- Direct sources: gif, pdf
- One-intermediate sources: avif, png, tiff, webp, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, ts, webm, wmv, epub
- Two-intermediate sources: azw3, html, md, mobi, rst
- All effective sources: gif, avif, png, tiff, webp, pdf, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, ts, webm, wmv, epub, azw3, html, md, mobi, rst
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### JSON

Category: structured-data

- Direct targets: yaml, csv, toml, xml, tsv
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: yaml, csv, toml, xml, tsv
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

- Direct targets: wav, mp3, ogg, flac, aac
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: wav, mp3, ogg, flac, aac
- Direct sources: aac, flac, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: aac, flac, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### MD

Category: plain-text

- Direct targets: html, txt, docx, odt, rst, tex
- One-intermediate targets: pdf, png, tiff, epub, rtf
- Two-intermediate targets: azw3, mobi, jpg
- All effective targets: html, txt, pdf, png, tiff, epub, docx, odt, rst, rtf, tex, azw3, mobi, jpg
- Direct sources: rst, html, docx, tex, txt, pdf
- One-intermediate sources: doc, odt, rtf, epub, odp, ods, ppt, pptx, xls, xlsx, jpg, png, tiff, webp
- Two-intermediate sources: azw3, mobi, avif, gif
- All effective sources: rst, html, docx, doc, odt, rtf, tex, txt, pdf, epub, odp, ods, ppt, pptx, xls, xlsx, azw3, mobi, jpg, png, tiff, webp, avif, gif
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### MKV

Category: video

- Direct targets: mp4, webm, aac, flac, m4a, mp3, ogg, wav, gif
- One-intermediate targets: png, tiff, avif, jpg, webp
- Two-intermediate targets: pdf
- All effective targets: mp4, webm, aac, flac, m4a, mp3, ogg, wav, pdf, png, tiff, avif, jpg, webp, gif
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
- Two-intermediate targets: txt, docx, html, png, tiff, md, jpg
- All effective targets: epub, pdf, azw3, txt, docx, html, png, tiff, md, jpg
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

- Direct targets: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
- One-intermediate targets: png, tiff, avif, jpg, webp
- Two-intermediate targets: pdf
- All effective targets: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, pdf, png, tiff, avif, jpg, webp, gif
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

- Direct targets: wav, ogg, flac, aac, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: wav, ogg, flac, aac, m4a
- Direct sources: aac, flac, m4a, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: aac, flac, m4a, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### MP4

Category: video

- Direct targets: webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
- One-intermediate targets: png, tiff, avif, jpg, webp
- Two-intermediate targets: pdf
- All effective targets: webm, mkv, aac, flac, m4a, mp3, ogg, wav, pdf, png, tiff, avif, jpg, webp, gif
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
- One-intermediate targets: png, tiff, txt, jpg, html, docx, md
- Two-intermediate targets: -
- All effective targets: pdf, pptx, png, tiff, txt, jpg, html, docx, md
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

- Direct targets: xlsx, pdf
- One-intermediate targets: png, tiff, txt, jpg, html, docx, md
- Two-intermediate targets: -
- All effective targets: xlsx, pdf, png, tiff, txt, jpg, html, docx, md
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
- One-intermediate targets: md, txt, html, png, tiff, jpg, epub, rst
- Two-intermediate targets: azw3, mobi, tex
- All effective targets: pdf, md, txt, html, docx, rtf, png, tiff, jpg, epub, azw3, mobi, rst, tex
- Direct sources: doc, docx, rtf, md, html
- One-intermediate sources: rst, tex, txt
- Two-intermediate sources: -
- All effective sources: doc, docx, rtf, md, html, rst, tex, txt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### OGG

Category: audio

- Direct targets: wav, mp3, flac, aac, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: wav, mp3, flac, aac, m4a
- Direct sources: aac, flac, m4a, mp3, wav, avi, mkv, mov, mp4, ts, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: aac, flac, m4a, mp3, wav, avi, mkv, mov, mp4, ts, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### PDF

Category: pdf

- Direct targets: png, txt, docx, tiff, jpg, html, md
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: png, txt, docx, tiff, jpg, html, md
- Direct sources: ods, xls, xlsx, doc, docx, odp, odt, ppt, pptx, rtf, jpg, png, tiff, webp, epub
- One-intermediate sources: avif, gif, md, html, azw3, mobi
- Two-intermediate sources: rst, tex, avi, mkv, mov, mp4, ts, webm, wmv, txt
- All effective sources: ods, xls, xlsx, doc, docx, odp, odt, ppt, pptx, rtf, jpg, png, tiff, webp, avif, gif, md, html, rst, tex, epub, azw3, mobi, avi, mkv, mov, mp4, ts, webm, wmv, txt
- High-value missing: pdf->epub (TIER 3), pdf->odt (TIER 3)
- Engine gap: See highValueMissingConversions and engine gap analysis.
- Adapter gap: Adapter missing
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### PNG

Category: image

- Direct targets: avif, webp, tiff, pdf, gif
- One-intermediate targets: jpg, txt, html, docx, md
- Two-intermediate targets: -
- All effective targets: avif, webp, tiff, pdf, gif, jpg, txt, html, docx, md
- Direct sources: avif, gif, jpg, tiff, webp, html, pdf
- One-intermediate sources: md, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, rst, epub, tex, avi, mkv, mov, mp4, ts, webm, wmv, txt
- Two-intermediate sources: azw3, mobi
- All effective sources: avif, gif, jpg, tiff, webp, html, pdf, md, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, rst, epub, tex, azw3, mobi, avi, mkv, mov, mp4, ts, webm, wmv, txt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### PPT

Category: presentation

- Direct targets: pdf, pptx
- One-intermediate targets: png, tiff, txt, jpg, html, docx, md
- Two-intermediate targets: -
- All effective targets: pdf, pptx, png, tiff, txt, jpg, html, docx, md
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
- One-intermediate targets: png, tiff, txt, jpg, html, docx, md
- Two-intermediate targets: -
- All effective targets: pdf, png, tiff, txt, jpg, html, docx, md
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

- Direct targets: html, md, txt, tex
- One-intermediate targets: png, tiff, docx, odt, epub
- Two-intermediate targets: pdf, rtf, azw3, mobi, jpg
- All effective targets: html, md, txt, pdf, png, tiff, docx, odt, rtf, tex, epub, azw3, mobi, jpg
- Direct sources: md, html, docx
- One-intermediate sources: doc, odt, rtf, tex, txt
- Two-intermediate sources: -
- All effective sources: md, html, docx, doc, odt, rtf, tex, txt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### RTF

Category: document

- Direct targets: odt, pdf, docx
- One-intermediate targets: md, txt, html, png, tiff, jpg, epub, rst
- Two-intermediate targets: azw3, mobi, tex
- All effective targets: odt, pdf, md, txt, html, docx, png, tiff, jpg, epub, azw3, mobi, rst, tex
- Direct sources: doc, docx, odt
- One-intermediate sources: md, html
- Two-intermediate sources: rst, tex, txt
- All effective sources: doc, docx, odt, md, html, rst, tex, txt
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

- Direct targets: md, html
- One-intermediate targets: txt, docx, odt, rst, png, tiff
- Two-intermediate targets: pdf, epub, rtf, azw3, mobi
- All effective targets: md, txt, html, pdf, epub, docx, odt, rst, rtf, azw3, mobi, png, tiff
- Direct sources: md, rst
- One-intermediate sources: html, docx, txt
- Two-intermediate sources: doc, odt, rtf
- All effective sources: md, rst, html, docx, doc, odt, rtf, txt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### TIFF

Category: image

- Direct targets: png, avif, webp, pdf, gif
- One-intermediate targets: jpg, txt, html, docx, md
- Two-intermediate targets: -
- All effective targets: png, avif, webp, pdf, gif, jpg, txt, html, docx, md
- Direct sources: avif, gif, jpg, png, webp, html, pdf
- One-intermediate sources: doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, md, rst, epub, tex, avi, mkv, mov, mp4, ts, webm, wmv, txt
- Two-intermediate sources: azw3, mobi
- All effective sources: avif, gif, jpg, png, webp, html, pdf, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, md, rst, epub, azw3, mobi, tex, avi, mkv, mov, mp4, ts, webm, wmv, txt
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### TOML

Category: structured-data

- Direct targets: json, yaml, csv, xml, tsv
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: json, yaml, csv, xml, tsv
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

- Direct targets: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
- One-intermediate targets: png, tiff, avif, jpg, webp
- Two-intermediate targets: pdf
- All effective targets: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, pdf, png, tiff, avif, jpg, webp, gif
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

- Direct targets: md, html
- One-intermediate targets: docx, odt, rst, tex, png, tiff
- Two-intermediate targets: pdf, epub, azw3, mobi, rtf
- All effective targets: md, pdf, html, epub, azw3, mobi, docx, odt, rst, rtf, tex, png, tiff
- Direct sources: md, rst, docx, html, pdf
- One-intermediate sources: doc, odt, rtf, tex, odp, ods, ppt, pptx, xls, xlsx, epub, jpg, png, tiff, webp
- Two-intermediate sources: azw3, mobi, avif, gif
- All effective sources: md, rst, docx, html, doc, odt, rtf, tex, pdf, odp, ods, ppt, pptx, xls, xlsx, epub, azw3, mobi, jpg, png, tiff, webp, avif, gif
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### WAV

Category: audio

- Direct targets: mp3, ogg, flac, aac, m4a
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: mp3, ogg, flac, aac, m4a
- Direct sources: aac, flac, m4a, mp3, ogg, avi, mkv, mov, mp4, ts, webm, wmv
- One-intermediate sources: -
- Two-intermediate sources: -
- All effective sources: aac, flac, m4a, mp3, ogg, avi, mkv, mov, mp4, ts, webm, wmv
- High-value missing: -
- Engine gap: No Tier gap identified by this audit.
- Adapter gap: No primary adapter gap identified
- Runtime gap: None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.
- Quality risk: Low

### WEBM

Category: video

- Direct targets: mp4, mkv, aac, flac, m4a, mp3, ogg, wav, gif
- One-intermediate targets: png, tiff, avif, jpg, webp
- Two-intermediate targets: pdf
- All effective targets: mp4, mkv, aac, flac, m4a, mp3, ogg, wav, pdf, png, tiff, avif, jpg, webp, gif
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

- Direct targets: png, avif, tiff, pdf, gif
- One-intermediate targets: jpg, txt, html, docx, md
- Two-intermediate targets: -
- All effective targets: png, avif, tiff, pdf, gif, jpg, txt, html, docx, md
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

- Direct targets: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
- One-intermediate targets: png, tiff, avif, jpg, webp
- Two-intermediate targets: pdf
- All effective targets: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, pdf, png, tiff, avif, jpg, webp, gif
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

- Direct targets: ods, xlsx, pdf
- One-intermediate targets: png, tiff, txt, jpg, html, docx, md
- Two-intermediate targets: -
- All effective targets: ods, xlsx, pdf, png, tiff, txt, jpg, html, docx, md
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
- One-intermediate targets: png, tiff, txt, jpg, html, docx, md
- Two-intermediate targets: -
- All effective targets: ods, pdf, png, tiff, txt, jpg, html, docx, md
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

- Direct targets: json, yaml, csv, toml, tsv
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: json, yaml, csv, toml, tsv
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

- Direct targets: json, csv, toml, xml, tsv
- One-intermediate targets: -
- Two-intermediate targets: -
- All effective targets: json, csv, toml, xml, tsv
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

