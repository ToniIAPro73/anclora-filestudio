# FileStudio Tier 1 Quick Wins — Implementation

Generated: 2026-08-13

Scope: implement and certify every Tier 1/Tier 2 quick win from
`artifacts/conversion-coverage/FILESTUDIO_TIER1_ROADMAP.md` that requires **no new dependency**.
No Windows portable was generated (phase policy §60).

## Implementation summary

| Area | Engine | Adapter / runtime | Change |
| --- | --- | --- | --- |
| PDF→TXT | Poppler `pdftotext` | `PopplerEngine.execute("extract-text")` | Unified Poppler resolver extended with sibling-tool resolution (`resolvePopplerTool`); UTF-8 extraction; scanned PDF → controlled failure with OCR hint |
| PDF→HTML | Poppler `pdftohtml` | `PopplerEngine.execute("extract-html")` | Single HTML (`-s -noframes`); image assets delivered as ZIP only when present |
| PDF→MD | `pdftohtml` + Pandoc | `PopplerEngine.execute("extract-markdown")` | `pdftotext` ground-truth scanned guard, HTML extraction, Pandoc GFM normalization |
| AAC coverage | FFmpeg | `ffmpeg-engine` audio matrix | `aac` added as input and output format with presets and encoder args |
| WMV/TS coverage | FFmpeg | `ffmpeg-engine` video inputs | `wmv`, `ts` (plus already-declared `avi`, `mov`) accepted as video inputs; MKV targets remux (`-c copy`), MP4/WebM transcode |
| DOCX→RTF | LibreOffice | `libreoffice-engine` document outputs | `rtf` output filter added; RTF magic-byte validation |
| ODP→PDF / ODP→PPTX | LibreOffice | `libreoffice-engine` presentation inputs | `odp` added as presentation input |
| Image→PDF | Sharp + pdf-lib | `sharp-engine` `image-to-pdf` | Single image → single-page PDF, page sized to image, PNG (alpha) / JPEG embedding, page-count validation |

## Canonical matrix changes

- New edges: `pdf→txt`, `pdf→html`, `pdf→md`, `png/jpg/webp/tiff→pdf` (sharp-image),
  `aac` added to audio cross set, `wmv`/`ts` added to video input set,
  `docx/doc/odt→rtf`, `odp→pdf`, `odp→pptx`.
- PDF extraction edges are `supportsAsIntermediate: false` by policy: lossy extraction
  must not chain into reconstruction routes. This keeps **PDF→DOCX UNAVAILABLE**
  (§79) and prevents mediocre multistep pipelines from inflating coverage.
- `dependencyAvailable` resolves `pdftotext`/`pdftohtml` through the Poppler engine
  capabilities (same unified resolver as `pdftoppm`; no duplicate resolver, §39).
- Poppler probe now reports `pdftoppm`/`pdftotext`/`pdftohtml` capabilities, so
  diagnostics, discovery, routing and execution share one availability source.

## Quick-win checklist (§28)

| ID | Conversion | Tier | Engine | Adapter | Runtime probe | E2E | Matrix | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QW-001 | pdf→txt | T1 | Poppler | poppler-pdftotext-extract-text | pdftotext probe | PDFTXT-001..005 | enabled | IMPLEMENTED |
| QW-002 | pdf→md | T1 | Poppler+Pandoc | poppler-pdftohtml-pandoc-markdown | pdftohtml+pandoc probes | PDFMD-001..002 | enabled | IMPLEMENTED |
| QW-003 | pdf→html | T1 | Poppler | poppler-pdftohtml-extract-html | pdftohtml probe | PDFHTML-001..002 | enabled | IMPLEMENTED |
| QW-004 | docx→rtf | T1 | LibreOffice | libreoffice-office-convert | soffice probe | DOCXRTF-001 | enabled | IMPLEMENTED |
| QW-005 | odp→pdf | T1 | LibreOffice | libreoffice-office-convert | soffice probe | ODPPDF-001 | enabled | IMPLEMENTED |
| QW-006 | odp→pptx | T1 | LibreOffice | libreoffice-office-convert | soffice probe | ODPPPTX-001 | enabled | IMPLEMENTED |
| QW-007 | png→pdf | T1 | Sharp+pdf-lib | sharp-image-to-pdf | sharp probe | IMG2PDF png | enabled | IMPLEMENTED |
| QW-008 | jpg→pdf | T1 | Sharp+pdf-lib | sharp-image-to-pdf | sharp probe | IMG2PDF jpg | enabled | IMPLEMENTED |
| QW-009 | webp→pdf | T1 | Sharp+pdf-lib | sharp-image-to-pdf | sharp probe | IMG2PDF webp | enabled | IMPLEMENTED |
| QW-010 | tiff→pdf | T1 | Sharp+pdf-lib | sharp-image-to-pdf | sharp probe | IMG2PDF tiff | enabled | IMPLEMENTED |
| QW-011 | mp3→aac | T1 | FFmpeg | ffmpeg-audio-transcode | ffmpeg/ffprobe probe | AAC-MATRIX mp3→aac | enabled | IMPLEMENTED |
| QW-012 | wav→aac | T1 | FFmpeg | ffmpeg-audio-transcode | ffmpeg/ffprobe probe | AAC-001 | enabled | IMPLEMENTED |
| QW-013 | flac→aac | T1 | FFmpeg | ffmpeg-audio-transcode | ffmpeg/ffprobe probe | AAC-MATRIX flac→aac | enabled | IMPLEMENTED |
| QW-014 | m4a→aac | T1 | FFmpeg | ffmpeg-audio-transcode | ffmpeg/ffprobe probe | AAC-MATRIX m4a→aac | enabled | IMPLEMENTED |
| QW-015 | ogg→aac | T1 | FFmpeg | ffmpeg-audio-transcode | ffmpeg/ffprobe probe | AAC-MATRIX ogg→aac | enabled | IMPLEMENTED |
| QW-016 | aac→mp3 | T1 | FFmpeg | ffmpeg-audio-transcode | ffmpeg/ffprobe probe | AAC-002 | enabled | IMPLEMENTED |
| QW-017 | aac→wav | T1 | FFmpeg | ffmpeg-audio-transcode | ffmpeg/ffprobe probe | AAC-003 | enabled | IMPLEMENTED |
| QW-018 | aac→flac | T1 | FFmpeg | ffmpeg-audio-transcode | ffmpeg/ffprobe probe | AAC-MATRIX aac→flac | enabled | IMPLEMENTED |
| QW-019 | aac→m4a | T1 | FFmpeg | ffmpeg-audio-transcode | ffmpeg/ffprobe probe | AAC-MATRIX aac→m4a | enabled | IMPLEMENTED |
| QW-020 | aac→ogg | T1 | FFmpeg | ffmpeg-audio-transcode | ffmpeg/ffprobe probe | AAC-MATRIX aac→ogg | enabled | IMPLEMENTED |
| QW-021 | wmv→mp4 | T2 | FFmpeg | ffmpeg-video-transcode | ffmpeg/ffprobe probe | WMV-001 | enabled | IMPLEMENTED |
| QW-022 | wmv→webm | T2 | FFmpeg | ffmpeg-video-transcode | ffmpeg/ffprobe probe | WMV-003 | enabled | IMPLEMENTED |
| QW-023 | wmv→mkv | T2 | FFmpeg | ffmpeg-video-transcode (remux) | ffmpeg/ffprobe probe | WMV-002 | enabled | IMPLEMENTED |
| QW-024 | ts→mp4 | T2 | FFmpeg | ffmpeg-video-transcode | ffmpeg/ffprobe probe | TS-001 | enabled | IMPLEMENTED |
| QW-025 | ts→webm | T2 | FFmpeg | ffmpeg-video-transcode | ffmpeg/ffprobe probe | TS-003 | enabled | IMPLEMENTED |
| QW-026 | ts→mkv | T2 | FFmpeg | ffmpeg-video-transcode (remux) | ffmpeg/ffprobe probe | TS-002 | enabled | IMPLEMENTED |

Quick wins identified: 26. Reviewed: 26. Implemented: 26. Blocked: 0.

Notes:

- `bmp→pdf` was mentioned only as exploratory (§27); `bmp` is not a canonical format in the
  catalog and Sharp does not decode BMP natively in this runtime. Not declared — no false support.
- Remux-first policy (§21): MKV targets use stream copy; MP4/WebM require transcode because
  WMV/TS codecs (wmv2/mpeg2video/wmav2/mp2) are not valid in those containers.
- PDF→DOCX stays UNAVAILABLE (§79); extraction edges are not usable as intermediates.

## Fixtures (§44–47)

Generated programmatically in `tests/integration/quick-wins-real.test.ts` (local, reproducible,
no external URLs): PDF text / multipage / Unicode / scanned-no-text (pdf-lib), DOCX (Pandoc),
minimal ODP (hand-built ODF zip), WAV/AAC/MP3/FLAC/M4A/OGG/MP4/WMV/TS (FFmpeg lavfi/transcode),
PNG/JPG/WEBP/TIFF (Sharp).

## Regressions kept green

- PDFRAST-001: PDF→PNG via pdftoppm.
- MULTISTEP-REG-001: DOCX→PDF→PNG chain on Linux.
- SOURCE-001..006 source contract suite: PASS.
- Execution alignment: single Poppler resolver for diagnostics/discovery/routing/execution (§39–40).
