# FileStudio Global Conversion Discovery Audit

Generated: 2026-08-13T03:04:53.568Z
Canonical formats audited: 50

## WINDOWS

Formats: 50
Duplicate problems: PASS

### 7Z

AS SOURCE:
DIRECT TARGETS: tar, zip
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: tar, zip

AS TARGET:
DIRECT SOURCES: bz2, gz, tar, xz, zip
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: bz2, gz, tar, xz, zip

### AAC

AS SOURCE:
DIRECT TARGETS: wav, mp3, ogg, flac, m4a
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: wav, mp3, ogg, flac, m4a

AS TARGET:
DIRECT SOURCES: flac, m4a, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: flac, m4a, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv

### AVI

AS SOURCE:
DIRECT TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### AVIF

AS SOURCE:
DIRECT TARGETS: webp, png, tiff, gif
ONE-INTERMEDIATE TARGETS: pdf, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: webp, png, tiff, gif, pdf, jpg

AS TARGET:
DIRECT SOURCES: gif, jpg, png, tiff, webp
ONE-INTERMEDIATE SOURCES: avi, mkv, mov, mp4, ts, webm, wmv
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: gif, jpg, png, tiff, webp, avi, mkv, mov, mp4, ts, webm, wmv

### AZW3

AS SOURCE:
DIRECT TARGETS: epub
ONE-INTERMEDIATE TARGETS: mobi, pdf
TWO-INTERMEDIATE TARGETS: png, tiff, jpg
ALL EFFECTIVE TARGETS: epub, mobi, pdf, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: epub
ONE-INTERMEDIATE SOURCES: mobi, docx, html
TWO-INTERMEDIATE SOURCES: doc, odt, rtf, md, rst, tex, txt
ALL EFFECTIVE SOURCES: epub, mobi, docx, html, doc, odt, rtf, md, rst, tex, txt

### BZ2

AS SOURCE:
DIRECT TARGETS: tar, zip, 7z
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: tar, zip, 7z

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### CSV

AS SOURCE:
DIRECT TARGETS: json, yaml, toml, tsv, xml
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: json, yaml, toml, tsv, xml

AS TARGET:
DIRECT SOURCES: tsv, json, toml, xml, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: tsv, json, toml, xml, yaml

### DOC

AS SOURCE:
DIRECT TARGETS: odt, pdf, docx, rtf
ONE-INTERMEDIATE TARGETS: md, txt, html, png, tiff, jpg, epub, rst
TWO-INTERMEDIATE TARGETS: azw3, mobi, tex
ALL EFFECTIVE TARGETS: odt, pdf, md, txt, html, docx, rtf, png, tiff, jpg, epub, azw3, mobi, rst, tex

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### DOCX

AS SOURCE:
DIRECT TARGETS: odt, pdf, md, txt, html, rtf, epub, rst
ONE-INTERMEDIATE TARGETS: png, tiff, jpg, azw3, mobi, tex
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: odt, pdf, md, txt, html, rtf, png, tiff, jpg, epub, azw3, mobi, rst, tex

AS TARGET:
DIRECT SOURCES: doc, odt, rtf, md, html
ONE-INTERMEDIATE SOURCES: rst, tex, txt
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: doc, odt, rtf, md, html, rst, tex, txt

### EPUB

AS SOURCE:
DIRECT TARGETS: mobi, pdf, azw3
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: mobi, pdf, azw3, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: docx, azw3, mobi, html
ONE-INTERMEDIATE SOURCES: doc, odt, rtf, md, rst
TWO-INTERMEDIATE SOURCES: tex, txt
ALL EFFECTIVE SOURCES: docx, doc, odt, rtf, azw3, mobi, md, html, rst, tex, txt

### FLAC

AS SOURCE:
DIRECT TARGETS: wav, mp3, ogg, aac, m4a
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: wav, mp3, ogg, aac, m4a

AS TARGET:
DIRECT SOURCES: aac, m4a, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: aac, m4a, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv

### GIF

AS SOURCE:
DIRECT TARGETS: avif, webp, png, tiff, jpg
ONE-INTERMEDIATE TARGETS: pdf
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: avif, webp, png, tiff, jpg, pdf

AS TARGET:
DIRECT SOURCES: avif, jpg, png, tiff, webp, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: avif, jpg, png, tiff, webp, avi, mkv, mov, mp4, ts, webm, wmv

### GZ

AS SOURCE:
DIRECT TARGETS: tar, zip, 7z
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: tar, zip, 7z

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### HTML

AS SOURCE:
DIRECT TARGETS: md, txt, png, tiff, docx, odt, rst, epub
ONE-INTERMEDIATE TARGETS: pdf, rtf, azw3, mobi, tex
TWO-INTERMEDIATE TARGETS: jpg
ALL EFFECTIVE TARGETS: md, txt, pdf, png, tiff, docx, odt, rst, rtf, azw3, epub, mobi, tex, jpg

AS TARGET:
DIRECT SOURCES: md, rst, docx, tex, txt
ONE-INTERMEDIATE SOURCES: doc, odt, rtf
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: md, rst, docx, doc, odt, rtf, tex, txt

### JPG

AS SOURCE:
DIRECT TARGETS: avif, webp, png, pdf, tiff, gif
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: avif, webp, png, pdf, tiff, gif

AS TARGET:
DIRECT SOURCES: gif, pdf
ONE-INTERMEDIATE SOURCES: avif, png, tiff, webp, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, ts, webm, wmv, epub
TWO-INTERMEDIATE SOURCES: azw3, html, md, mobi, rst
ALL EFFECTIVE SOURCES: gif, avif, png, tiff, webp, pdf, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, ts, webm, wmv, epub, azw3, html, md, mobi, rst

### JSON

AS SOURCE:
DIRECT TARGETS: yaml, csv, toml, xml, tsv
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: yaml, csv, toml, xml, tsv

AS TARGET:
DIRECT SOURCES: csv, toml, tsv, xml, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, toml, tsv, xml, yaml

### M4A

AS SOURCE:
DIRECT TARGETS: wav, mp3, ogg, flac, aac
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: wav, mp3, ogg, flac, aac

AS TARGET:
DIRECT SOURCES: aac, flac, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: aac, flac, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv

### MD

AS SOURCE:
DIRECT TARGETS: html, txt, docx, odt, rst, tex
ONE-INTERMEDIATE TARGETS: pdf, png, tiff, epub, rtf
TWO-INTERMEDIATE TARGETS: azw3, mobi, jpg
ALL EFFECTIVE TARGETS: html, txt, pdf, png, tiff, epub, docx, odt, rst, rtf, tex, azw3, mobi, jpg

AS TARGET:
DIRECT SOURCES: rst, html, docx, tex, txt
ONE-INTERMEDIATE SOURCES: doc, odt, rtf
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: rst, html, docx, doc, odt, rtf, tex, txt

### MKV

AS SOURCE:
DIRECT TARGETS: mp4, webm, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: mp4, webm, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: avi, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: avi, mov, mp4, ts, webm, wmv

### MOBI

AS SOURCE:
DIRECT TARGETS: epub
ONE-INTERMEDIATE TARGETS: pdf, azw3
TWO-INTERMEDIATE TARGETS: png, tiff, jpg
ALL EFFECTIVE TARGETS: epub, pdf, azw3, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: epub
ONE-INTERMEDIATE SOURCES: azw3, docx, html
TWO-INTERMEDIATE SOURCES: doc, odt, rtf, md, rst, tex, txt
ALL EFFECTIVE SOURCES: epub, azw3, docx, html, doc, odt, rtf, md, rst, tex, txt

### MOV

AS SOURCE:
DIRECT TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### MP3

AS SOURCE:
DIRECT TARGETS: wav, ogg, flac, aac, m4a
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: wav, ogg, flac, aac, m4a

AS TARGET:
DIRECT SOURCES: aac, flac, m4a, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: aac, flac, m4a, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv

### MP4

AS SOURCE:
DIRECT TARGETS: webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: webm, mkv, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: avi, mkv, mov, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: avi, mkv, mov, ts, webm, wmv

### ODP

AS SOURCE:
DIRECT TARGETS: pdf, pptx
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: pdf, pptx, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### ODS

AS SOURCE:
DIRECT TARGETS: xlsx, pdf
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: xlsx, pdf, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: xls, xlsx
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: xls, xlsx

### ODT

AS SOURCE:
DIRECT TARGETS: pdf, docx, rtf
ONE-INTERMEDIATE TARGETS: md, txt, html, png, tiff, jpg, epub, rst
TWO-INTERMEDIATE TARGETS: azw3, mobi, tex
ALL EFFECTIVE TARGETS: pdf, md, txt, html, docx, rtf, png, tiff, jpg, epub, azw3, mobi, rst, tex

AS TARGET:
DIRECT SOURCES: doc, docx, rtf, md, html
ONE-INTERMEDIATE SOURCES: rst, tex, txt
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: doc, docx, rtf, md, html, rst, tex, txt

### OGG

AS SOURCE:
DIRECT TARGETS: wav, mp3, flac, aac, m4a
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: wav, mp3, flac, aac, m4a

AS TARGET:
DIRECT SOURCES: aac, flac, m4a, mp3, wav, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: aac, flac, m4a, mp3, wav, avi, mkv, mov, mp4, ts, webm, wmv

### PDF

AS SOURCE:
DIRECT TARGETS: png, tiff, jpg
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: png, tiff, jpg

AS TARGET:
DIRECT SOURCES: ods, xls, xlsx, doc, docx, odp, odt, ppt, pptx, rtf, jpg, png, tiff, webp, epub
ONE-INTERMEDIATE SOURCES: avif, gif, md, html, azw3, mobi
TWO-INTERMEDIATE SOURCES: rst, tex, avi, mkv, mov, mp4, ts, webm, wmv, txt
ALL EFFECTIVE SOURCES: ods, xls, xlsx, doc, docx, odp, odt, ppt, pptx, rtf, jpg, png, tiff, webp, avif, gif, md, html, rst, tex, epub, azw3, mobi, avi, mkv, mov, mp4, ts, webm, wmv, txt

### PNG

AS SOURCE:
DIRECT TARGETS: avif, webp, pdf, tiff, gif
ONE-INTERMEDIATE TARGETS: jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: avif, webp, pdf, tiff, gif, jpg

AS TARGET:
DIRECT SOURCES: html, pdf, avif, gif, jpg, tiff, webp
ONE-INTERMEDIATE SOURCES: md, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, rst, avi, mkv, mov, mp4, ts, webm, wmv, epub, tex, txt
TWO-INTERMEDIATE SOURCES: azw3, mobi
ALL EFFECTIVE SOURCES: html, pdf, avif, gif, jpg, tiff, webp, md, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, rst, avi, mkv, mov, mp4, ts, webm, wmv, epub, tex, azw3, mobi, txt

### PPT

AS SOURCE:
DIRECT TARGETS: pdf, pptx
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: pdf, pptx, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### PPTX

AS SOURCE:
DIRECT TARGETS: pdf
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: pdf, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: odp, ppt
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: odp, ppt

### RST

AS SOURCE:
DIRECT TARGETS: html, md, txt, tex
ONE-INTERMEDIATE TARGETS: png, tiff, docx, odt, epub
TWO-INTERMEDIATE TARGETS: pdf, rtf, azw3, mobi, jpg
ALL EFFECTIVE TARGETS: html, md, txt, pdf, png, tiff, docx, odt, rtf, tex, epub, azw3, mobi, jpg

AS TARGET:
DIRECT SOURCES: md, html, docx
ONE-INTERMEDIATE SOURCES: doc, odt, rtf, tex, txt
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: md, html, docx, doc, odt, rtf, tex, txt

### RTF

AS SOURCE:
DIRECT TARGETS: odt, pdf, docx
ONE-INTERMEDIATE TARGETS: md, txt, html, png, tiff, jpg, epub, rst
TWO-INTERMEDIATE TARGETS: azw3, mobi, tex
ALL EFFECTIVE TARGETS: odt, pdf, md, txt, html, docx, png, tiff, jpg, epub, azw3, mobi, rst, tex

AS TARGET:
DIRECT SOURCES: doc, docx, odt
ONE-INTERMEDIATE SOURCES: md, html
TWO-INTERMEDIATE SOURCES: rst, tex, txt
ALL EFFECTIVE SOURCES: doc, docx, odt, md, html, rst, tex, txt

### TAR

AS SOURCE:
DIRECT TARGETS: zip, 7z
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: zip, 7z

AS TARGET:
DIRECT SOURCES: 7z, bz2, gz, xz, zip
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: 7z, bz2, gz, xz, zip

### TEX

AS SOURCE:
DIRECT TARGETS: md, html
ONE-INTERMEDIATE TARGETS: txt, docx, odt, rst, png, tiff
TWO-INTERMEDIATE TARGETS: pdf, epub, rtf, azw3, mobi
ALL EFFECTIVE TARGETS: md, txt, html, pdf, epub, docx, odt, rst, rtf, azw3, mobi, png, tiff

AS TARGET:
DIRECT SOURCES: md, rst
ONE-INTERMEDIATE SOURCES: html, docx, txt
TWO-INTERMEDIATE SOURCES: doc, odt, rtf
ALL EFFECTIVE SOURCES: md, rst, html, docx, doc, odt, rtf, txt

### TIFF

AS SOURCE:
DIRECT TARGETS: avif, webp, png, pdf, gif
ONE-INTERMEDIATE TARGETS: jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: avif, webp, png, pdf, gif, jpg

AS TARGET:
DIRECT SOURCES: html, avif, gif, jpg, png, webp, pdf
ONE-INTERMEDIATE SOURCES: doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, md, rst, avi, mkv, mov, mp4, ts, webm, wmv, epub, tex, txt
TWO-INTERMEDIATE SOURCES: azw3, mobi
ALL EFFECTIVE SOURCES: html, avif, gif, jpg, png, webp, pdf, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, md, rst, avi, mkv, mov, mp4, ts, webm, wmv, epub, azw3, mobi, tex, txt

### TOML

AS SOURCE:
DIRECT TARGETS: json, yaml, csv, xml, tsv
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: json, yaml, csv, xml, tsv

AS TARGET:
DIRECT SOURCES: csv, json, tsv, xml, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, json, tsv, xml, yaml

### TS

AS SOURCE:
DIRECT TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### TSV

AS SOURCE:
DIRECT TARGETS: csv, json, yaml, toml, xml
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: csv, json, yaml, toml, xml

AS TARGET:
DIRECT SOURCES: csv, json, toml, xml, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, json, toml, xml, yaml

### TXT

AS SOURCE:
DIRECT TARGETS: md, html
ONE-INTERMEDIATE TARGETS: docx, odt, rst, tex, png, tiff
TWO-INTERMEDIATE TARGETS: pdf, epub, azw3, mobi, rtf
ALL EFFECTIVE TARGETS: md, pdf, html, epub, azw3, mobi, docx, odt, rst, rtf, tex, png, tiff

AS TARGET:
DIRECT SOURCES: md, rst, docx, html
ONE-INTERMEDIATE SOURCES: doc, odt, rtf, tex
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: md, rst, docx, html, doc, odt, rtf, tex

### WAV

AS SOURCE:
DIRECT TARGETS: mp3, ogg, flac, aac, m4a
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: mp3, ogg, flac, aac, m4a

AS TARGET:
DIRECT SOURCES: aac, flac, m4a, mp3, ogg, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: aac, flac, m4a, mp3, ogg, avi, mkv, mov, mp4, ts, webm, wmv

### WEBM

AS SOURCE:
DIRECT TARGETS: mp4, mkv, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: mp4, mkv, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: avi, mkv, mov, mp4, ts, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: avi, mkv, mov, mp4, ts, wmv

### WEBP

AS SOURCE:
DIRECT TARGETS: avif, png, pdf, tiff, gif
ONE-INTERMEDIATE TARGETS: jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: avif, png, pdf, tiff, gif, jpg

AS TARGET:
DIRECT SOURCES: avif, gif, jpg, png, tiff
ONE-INTERMEDIATE SOURCES: avi, mkv, mov, mp4, ts, webm, wmv
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: avif, gif, jpg, png, tiff, avi, mkv, mov, mp4, ts, webm, wmv

### WMV

AS SOURCE:
DIRECT TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### XLS

AS SOURCE:
DIRECT TARGETS: ods, xlsx, pdf
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: ods, xlsx, pdf, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### XLSX

AS SOURCE:
DIRECT TARGETS: ods, pdf
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: ods, pdf, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: ods, xls
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: ods, xls

### XML

AS SOURCE:
DIRECT TARGETS: json, yaml, csv, toml, tsv
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: json, yaml, csv, toml, tsv

AS TARGET:
DIRECT SOURCES: csv, json, toml, tsv, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, json, toml, tsv, yaml

### XZ

AS SOURCE:
DIRECT TARGETS: tar, zip, 7z
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: tar, zip, 7z

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### YAML

AS SOURCE:
DIRECT TARGETS: json, csv, toml, xml, tsv
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: json, csv, toml, xml, tsv

AS TARGET:
DIRECT SOURCES: csv, json, toml, tsv, xml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, json, toml, tsv, xml

### ZIP

AS SOURCE:
DIRECT TARGETS: tar, 7z
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: tar, 7z

AS TARGET:
DIRECT SOURCES: 7z, bz2, gz, tar, xz
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: 7z, bz2, gz, tar, xz

## LINUX

Formats: 50
Duplicate problems: PASS

### 7Z

AS SOURCE:
DIRECT TARGETS: tar, zip
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: tar, zip

AS TARGET:
DIRECT SOURCES: bz2, gz, tar, xz, zip
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: bz2, gz, tar, xz, zip

### AAC

AS SOURCE:
DIRECT TARGETS: wav, mp3, ogg, flac, m4a
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: wav, mp3, ogg, flac, m4a

AS TARGET:
DIRECT SOURCES: flac, m4a, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: flac, m4a, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv

### AVI

AS SOURCE:
DIRECT TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### AVIF

AS SOURCE:
DIRECT TARGETS: webp, png, tiff, gif
ONE-INTERMEDIATE TARGETS: pdf, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: webp, png, tiff, gif, pdf, jpg

AS TARGET:
DIRECT SOURCES: gif, jpg, png, tiff, webp
ONE-INTERMEDIATE SOURCES: avi, mkv, mov, mp4, ts, webm, wmv
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: gif, jpg, png, tiff, webp, avi, mkv, mov, mp4, ts, webm, wmv

### AZW3

AS SOURCE:
DIRECT TARGETS: epub
ONE-INTERMEDIATE TARGETS: mobi, pdf
TWO-INTERMEDIATE TARGETS: png, tiff, jpg
ALL EFFECTIVE TARGETS: epub, mobi, pdf, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: epub
ONE-INTERMEDIATE SOURCES: mobi, docx, html
TWO-INTERMEDIATE SOURCES: doc, odt, rtf, md, rst, tex, txt
ALL EFFECTIVE SOURCES: epub, mobi, docx, html, doc, odt, rtf, md, rst, tex, txt

### BZ2

AS SOURCE:
DIRECT TARGETS: tar, zip, 7z
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: tar, zip, 7z

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### CSV

AS SOURCE:
DIRECT TARGETS: json, yaml, toml, tsv, xml
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: json, yaml, toml, tsv, xml

AS TARGET:
DIRECT SOURCES: tsv, json, toml, xml, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: tsv, json, toml, xml, yaml

### DOC

AS SOURCE:
DIRECT TARGETS: odt, pdf, docx, rtf
ONE-INTERMEDIATE TARGETS: md, txt, html, png, tiff, jpg, epub, rst
TWO-INTERMEDIATE TARGETS: azw3, mobi, tex
ALL EFFECTIVE TARGETS: odt, pdf, md, txt, html, docx, rtf, png, tiff, jpg, epub, azw3, mobi, rst, tex

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### DOCX

AS SOURCE:
DIRECT TARGETS: odt, pdf, md, txt, html, rtf, epub, rst
ONE-INTERMEDIATE TARGETS: png, tiff, jpg, azw3, mobi, tex
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: odt, pdf, md, txt, html, rtf, png, tiff, jpg, epub, azw3, mobi, rst, tex

AS TARGET:
DIRECT SOURCES: doc, odt, rtf, md, html
ONE-INTERMEDIATE SOURCES: rst, tex, txt
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: doc, odt, rtf, md, html, rst, tex, txt

### EPUB

AS SOURCE:
DIRECT TARGETS: mobi, pdf, azw3
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: mobi, pdf, azw3, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: docx, azw3, mobi, html
ONE-INTERMEDIATE SOURCES: doc, odt, rtf, md, rst
TWO-INTERMEDIATE SOURCES: tex, txt
ALL EFFECTIVE SOURCES: docx, doc, odt, rtf, azw3, mobi, md, html, rst, tex, txt

### FLAC

AS SOURCE:
DIRECT TARGETS: wav, mp3, ogg, aac, m4a
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: wav, mp3, ogg, aac, m4a

AS TARGET:
DIRECT SOURCES: aac, m4a, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: aac, m4a, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv

### GIF

AS SOURCE:
DIRECT TARGETS: avif, webp, png, tiff, jpg
ONE-INTERMEDIATE TARGETS: pdf
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: avif, webp, png, tiff, jpg, pdf

AS TARGET:
DIRECT SOURCES: avif, jpg, png, tiff, webp, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: avif, jpg, png, tiff, webp, avi, mkv, mov, mp4, ts, webm, wmv

### GZ

AS SOURCE:
DIRECT TARGETS: tar, zip, 7z
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: tar, zip, 7z

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### HTML

AS SOURCE:
DIRECT TARGETS: md, txt, png, tiff, docx, odt, rst, epub
ONE-INTERMEDIATE TARGETS: pdf, rtf, azw3, mobi, tex
TWO-INTERMEDIATE TARGETS: jpg
ALL EFFECTIVE TARGETS: md, txt, pdf, png, tiff, docx, odt, rst, rtf, azw3, epub, mobi, tex, jpg

AS TARGET:
DIRECT SOURCES: md, rst, docx, tex, txt
ONE-INTERMEDIATE SOURCES: doc, odt, rtf
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: md, rst, docx, doc, odt, rtf, tex, txt

### JPG

AS SOURCE:
DIRECT TARGETS: avif, webp, png, pdf, tiff, gif
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: avif, webp, png, pdf, tiff, gif

AS TARGET:
DIRECT SOURCES: gif, pdf
ONE-INTERMEDIATE SOURCES: avif, png, tiff, webp, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, ts, webm, wmv, epub
TWO-INTERMEDIATE SOURCES: azw3, html, md, mobi, rst
ALL EFFECTIVE SOURCES: gif, avif, png, tiff, webp, pdf, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, avi, mkv, mov, mp4, ts, webm, wmv, epub, azw3, html, md, mobi, rst

### JSON

AS SOURCE:
DIRECT TARGETS: yaml, csv, toml, xml, tsv
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: yaml, csv, toml, xml, tsv

AS TARGET:
DIRECT SOURCES: csv, toml, tsv, xml, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, toml, tsv, xml, yaml

### M4A

AS SOURCE:
DIRECT TARGETS: wav, mp3, ogg, flac, aac
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: wav, mp3, ogg, flac, aac

AS TARGET:
DIRECT SOURCES: aac, flac, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: aac, flac, mp3, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv

### MD

AS SOURCE:
DIRECT TARGETS: html, txt, docx, odt, rst, tex
ONE-INTERMEDIATE TARGETS: pdf, png, tiff, epub, rtf
TWO-INTERMEDIATE TARGETS: azw3, mobi, jpg
ALL EFFECTIVE TARGETS: html, txt, pdf, png, tiff, epub, docx, odt, rst, rtf, tex, azw3, mobi, jpg

AS TARGET:
DIRECT SOURCES: rst, html, docx, tex, txt
ONE-INTERMEDIATE SOURCES: doc, odt, rtf
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: rst, html, docx, doc, odt, rtf, tex, txt

### MKV

AS SOURCE:
DIRECT TARGETS: mp4, webm, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: mp4, webm, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: avi, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: avi, mov, mp4, ts, webm, wmv

### MOBI

AS SOURCE:
DIRECT TARGETS: epub
ONE-INTERMEDIATE TARGETS: pdf, azw3
TWO-INTERMEDIATE TARGETS: png, tiff, jpg
ALL EFFECTIVE TARGETS: epub, pdf, azw3, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: epub
ONE-INTERMEDIATE SOURCES: azw3, docx, html
TWO-INTERMEDIATE SOURCES: doc, odt, rtf, md, rst, tex, txt
ALL EFFECTIVE SOURCES: epub, azw3, docx, html, doc, odt, rtf, md, rst, tex, txt

### MOV

AS SOURCE:
DIRECT TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### MP3

AS SOURCE:
DIRECT TARGETS: wav, ogg, flac, aac, m4a
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: wav, ogg, flac, aac, m4a

AS TARGET:
DIRECT SOURCES: aac, flac, m4a, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: aac, flac, m4a, ogg, wav, avi, mkv, mov, mp4, ts, webm, wmv

### MP4

AS SOURCE:
DIRECT TARGETS: webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: webm, mkv, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: avi, mkv, mov, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: avi, mkv, mov, ts, webm, wmv

### ODP

AS SOURCE:
DIRECT TARGETS: pdf, pptx
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: pdf, pptx, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### ODS

AS SOURCE:
DIRECT TARGETS: xlsx, pdf
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: xlsx, pdf, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: xls, xlsx
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: xls, xlsx

### ODT

AS SOURCE:
DIRECT TARGETS: pdf, docx, rtf
ONE-INTERMEDIATE TARGETS: md, txt, html, png, tiff, jpg, epub, rst
TWO-INTERMEDIATE TARGETS: azw3, mobi, tex
ALL EFFECTIVE TARGETS: pdf, md, txt, html, docx, rtf, png, tiff, jpg, epub, azw3, mobi, rst, tex

AS TARGET:
DIRECT SOURCES: doc, docx, rtf, md, html
ONE-INTERMEDIATE SOURCES: rst, tex, txt
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: doc, docx, rtf, md, html, rst, tex, txt

### OGG

AS SOURCE:
DIRECT TARGETS: wav, mp3, flac, aac, m4a
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: wav, mp3, flac, aac, m4a

AS TARGET:
DIRECT SOURCES: aac, flac, m4a, mp3, wav, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: aac, flac, m4a, mp3, wav, avi, mkv, mov, mp4, ts, webm, wmv

### PDF

AS SOURCE:
DIRECT TARGETS: png, tiff, jpg
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: png, tiff, jpg

AS TARGET:
DIRECT SOURCES: ods, xls, xlsx, doc, docx, odp, odt, ppt, pptx, rtf, jpg, png, tiff, webp, epub
ONE-INTERMEDIATE SOURCES: avif, gif, md, html, azw3, mobi
TWO-INTERMEDIATE SOURCES: rst, tex, avi, mkv, mov, mp4, ts, webm, wmv, txt
ALL EFFECTIVE SOURCES: ods, xls, xlsx, doc, docx, odp, odt, ppt, pptx, rtf, jpg, png, tiff, webp, avif, gif, md, html, rst, tex, epub, azw3, mobi, avi, mkv, mov, mp4, ts, webm, wmv, txt

### PNG

AS SOURCE:
DIRECT TARGETS: avif, webp, pdf, tiff, gif
ONE-INTERMEDIATE TARGETS: jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: avif, webp, pdf, tiff, gif, jpg

AS TARGET:
DIRECT SOURCES: html, pdf, avif, gif, jpg, tiff, webp
ONE-INTERMEDIATE SOURCES: md, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, rst, avi, mkv, mov, mp4, ts, webm, wmv, epub, tex, txt
TWO-INTERMEDIATE SOURCES: azw3, mobi
ALL EFFECTIVE SOURCES: html, pdf, avif, gif, jpg, tiff, webp, md, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, rst, avi, mkv, mov, mp4, ts, webm, wmv, epub, tex, azw3, mobi, txt

### PPT

AS SOURCE:
DIRECT TARGETS: pdf, pptx
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: pdf, pptx, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### PPTX

AS SOURCE:
DIRECT TARGETS: pdf
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: pdf, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: odp, ppt
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: odp, ppt

### RST

AS SOURCE:
DIRECT TARGETS: html, md, txt, tex
ONE-INTERMEDIATE TARGETS: png, tiff, docx, odt, epub
TWO-INTERMEDIATE TARGETS: pdf, rtf, azw3, mobi, jpg
ALL EFFECTIVE TARGETS: html, md, txt, pdf, png, tiff, docx, odt, rtf, tex, epub, azw3, mobi, jpg

AS TARGET:
DIRECT SOURCES: md, html, docx
ONE-INTERMEDIATE SOURCES: doc, odt, rtf, tex, txt
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: md, html, docx, doc, odt, rtf, tex, txt

### RTF

AS SOURCE:
DIRECT TARGETS: odt, pdf, docx
ONE-INTERMEDIATE TARGETS: md, txt, html, png, tiff, jpg, epub, rst
TWO-INTERMEDIATE TARGETS: azw3, mobi, tex
ALL EFFECTIVE TARGETS: odt, pdf, md, txt, html, docx, png, tiff, jpg, epub, azw3, mobi, rst, tex

AS TARGET:
DIRECT SOURCES: doc, docx, odt
ONE-INTERMEDIATE SOURCES: md, html
TWO-INTERMEDIATE SOURCES: rst, tex, txt
ALL EFFECTIVE SOURCES: doc, docx, odt, md, html, rst, tex, txt

### TAR

AS SOURCE:
DIRECT TARGETS: zip, 7z
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: zip, 7z

AS TARGET:
DIRECT SOURCES: 7z, bz2, gz, xz, zip
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: 7z, bz2, gz, xz, zip

### TEX

AS SOURCE:
DIRECT TARGETS: md, html
ONE-INTERMEDIATE TARGETS: txt, docx, odt, rst, png, tiff
TWO-INTERMEDIATE TARGETS: pdf, epub, rtf, azw3, mobi
ALL EFFECTIVE TARGETS: md, txt, html, pdf, epub, docx, odt, rst, rtf, azw3, mobi, png, tiff

AS TARGET:
DIRECT SOURCES: md, rst
ONE-INTERMEDIATE SOURCES: html, docx, txt
TWO-INTERMEDIATE SOURCES: doc, odt, rtf
ALL EFFECTIVE SOURCES: md, rst, html, docx, doc, odt, rtf, txt

### TIFF

AS SOURCE:
DIRECT TARGETS: avif, webp, png, pdf, gif
ONE-INTERMEDIATE TARGETS: jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: avif, webp, png, pdf, gif, jpg

AS TARGET:
DIRECT SOURCES: html, avif, gif, jpg, png, webp, pdf
ONE-INTERMEDIATE SOURCES: doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, md, rst, avi, mkv, mov, mp4, ts, webm, wmv, epub, tex, txt
TWO-INTERMEDIATE SOURCES: azw3, mobi
ALL EFFECTIVE SOURCES: html, avif, gif, jpg, png, webp, pdf, doc, docx, odp, ods, odt, ppt, pptx, rtf, xls, xlsx, md, rst, avi, mkv, mov, mp4, ts, webm, wmv, epub, azw3, mobi, tex, txt

### TOML

AS SOURCE:
DIRECT TARGETS: json, yaml, csv, xml, tsv
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: json, yaml, csv, xml, tsv

AS TARGET:
DIRECT SOURCES: csv, json, tsv, xml, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, json, tsv, xml, yaml

### TS

AS SOURCE:
DIRECT TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### TSV

AS SOURCE:
DIRECT TARGETS: csv, json, yaml, toml, xml
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: csv, json, yaml, toml, xml

AS TARGET:
DIRECT SOURCES: csv, json, toml, xml, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, json, toml, xml, yaml

### TXT

AS SOURCE:
DIRECT TARGETS: md, html
ONE-INTERMEDIATE TARGETS: docx, odt, rst, tex, png, tiff
TWO-INTERMEDIATE TARGETS: pdf, epub, azw3, mobi, rtf
ALL EFFECTIVE TARGETS: md, pdf, html, epub, azw3, mobi, docx, odt, rst, rtf, tex, png, tiff

AS TARGET:
DIRECT SOURCES: md, rst, docx, html
ONE-INTERMEDIATE SOURCES: doc, odt, rtf, tex
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: md, rst, docx, html, doc, odt, rtf, tex

### WAV

AS SOURCE:
DIRECT TARGETS: mp3, ogg, flac, aac, m4a
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: mp3, ogg, flac, aac, m4a

AS TARGET:
DIRECT SOURCES: aac, flac, m4a, mp3, ogg, avi, mkv, mov, mp4, ts, webm, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: aac, flac, m4a, mp3, ogg, avi, mkv, mov, mp4, ts, webm, wmv

### WEBM

AS SOURCE:
DIRECT TARGETS: mp4, mkv, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: mp4, mkv, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: avi, mkv, mov, mp4, ts, wmv
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: avi, mkv, mov, mp4, ts, wmv

### WEBP

AS SOURCE:
DIRECT TARGETS: avif, png, pdf, tiff, gif
ONE-INTERMEDIATE TARGETS: jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: avif, png, pdf, tiff, gif, jpg

AS TARGET:
DIRECT SOURCES: avif, gif, jpg, png, tiff
ONE-INTERMEDIATE SOURCES: avi, mkv, mov, mp4, ts, webm, wmv
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: avif, gif, jpg, png, tiff, avi, mkv, mov, mp4, ts, webm, wmv

### WMV

AS SOURCE:
DIRECT TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, gif
ONE-INTERMEDIATE TARGETS: png, tiff, avif, jpg, webp
TWO-INTERMEDIATE TARGETS: pdf
ALL EFFECTIVE TARGETS: mp4, webm, mkv, aac, flac, m4a, mp3, ogg, wav, png, tiff, pdf, avif, jpg, webp, gif

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### XLS

AS SOURCE:
DIRECT TARGETS: ods, xlsx, pdf
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: ods, xlsx, pdf, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### XLSX

AS SOURCE:
DIRECT TARGETS: ods, pdf
ONE-INTERMEDIATE TARGETS: png, tiff, jpg
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: ods, pdf, png, tiff, jpg

AS TARGET:
DIRECT SOURCES: ods, xls
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: ods, xls

### XML

AS SOURCE:
DIRECT TARGETS: json, yaml, csv, toml, tsv
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: json, yaml, csv, toml, tsv

AS TARGET:
DIRECT SOURCES: csv, json, toml, tsv, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, json, toml, tsv, yaml

### XZ

AS SOURCE:
DIRECT TARGETS: tar, zip, 7z
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: tar, zip, 7z

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### YAML

AS SOURCE:
DIRECT TARGETS: json, csv, toml, xml, tsv
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: json, csv, toml, xml, tsv

AS TARGET:
DIRECT SOURCES: csv, json, toml, tsv, xml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, json, toml, tsv, xml

### ZIP

AS SOURCE:
DIRECT TARGETS: tar, 7z
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: tar, 7z

AS TARGET:
DIRECT SOURCES: 7z, bz2, gz, tar, xz
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: 7z, bz2, gz, tar, xz

## WEB

Formats: 50
Duplicate problems: PASS

### 7Z

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### AAC

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### AVI

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### AVIF

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### AZW3

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### BZ2

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### CSV

AS SOURCE:
DIRECT TARGETS: json, yaml, toml, tsv, xml
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: json, yaml, toml, tsv, xml

AS TARGET:
DIRECT SOURCES: tsv, json, toml, xml, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: tsv, json, toml, xml, yaml

### DOC

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### DOCX

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### EPUB

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### FLAC

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### GIF

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### GZ

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### HTML

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### JPG

AS SOURCE:
DIRECT TARGETS: png, webp, pdf
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: png, webp, pdf

AS TARGET:
DIRECT SOURCES: png, webp
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: png, webp

### JSON

AS SOURCE:
DIRECT TARGETS: yaml, csv, toml, xml, tsv
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: yaml, csv, toml, xml, tsv

AS TARGET:
DIRECT SOURCES: csv, toml, tsv, xml, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, toml, tsv, xml, yaml

### M4A

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### MD

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### MKV

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### MOBI

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### MOV

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### MP3

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### MP4

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### ODP

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### ODS

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### ODT

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### OGG

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### PDF

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: jpg, png, webp
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: jpg, png, webp

### PNG

AS SOURCE:
DIRECT TARGETS: webp, pdf, jpg
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: webp, pdf, jpg

AS TARGET:
DIRECT SOURCES: jpg, webp
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: jpg, webp

### PPT

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### PPTX

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### RST

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### RTF

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### TAR

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### TEX

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### TIFF

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### TOML

AS SOURCE:
DIRECT TARGETS: json, yaml, csv, xml, tsv
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: json, yaml, csv, xml, tsv

AS TARGET:
DIRECT SOURCES: csv, json, tsv, xml, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, json, tsv, xml, yaml

### TS

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### TSV

AS SOURCE:
DIRECT TARGETS: csv, json, yaml, toml, xml
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: csv, json, yaml, toml, xml

AS TARGET:
DIRECT SOURCES: csv, json, toml, xml, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, json, toml, xml, yaml

### TXT

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### WAV

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### WEBM

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### WEBP

AS SOURCE:
DIRECT TARGETS: png, pdf, jpg
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: png, pdf, jpg

AS TARGET:
DIRECT SOURCES: jpg, png
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: jpg, png

### WMV

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### XLS

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### XLSX

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### XML

AS SOURCE:
DIRECT TARGETS: json, yaml, csv, toml, tsv
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: json, yaml, csv, toml, tsv

AS TARGET:
DIRECT SOURCES: csv, json, toml, tsv, yaml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, json, toml, tsv, yaml

### XZ

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

### YAML

AS SOURCE:
DIRECT TARGETS: json, csv, toml, xml, tsv
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: json, csv, toml, xml, tsv

AS TARGET:
DIRECT SOURCES: csv, json, toml, tsv, xml
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: csv, json, toml, tsv, xml

### ZIP

AS SOURCE:
DIRECT TARGETS: -
ONE-INTERMEDIATE TARGETS: -
TWO-INTERMEDIATE TARGETS: -
ALL EFFECTIVE TARGETS: -

AS TARGET:
DIRECT SOURCES: -
ONE-INTERMEDIATE SOURCES: -
TWO-INTERMEDIATE SOURCES: -
ALL EFFECTIVE SOURCES: -

## PDF Windows Regression

PDF DIRECT TARGETS: png, tiff, jpg
PDF MULTISTEP TARGETS: -
PDF ALL EFFECTIVE TARGETS: png, tiff, jpg

PDF -> DOCX: UNAVAILABLE — No effective route within two intermediates
PDF -> TXT: UNAVAILABLE — No effective route within two intermediates
PDF -> MD: UNAVAILABLE — No effective route within two intermediates
PDF -> HTML: UNAVAILABLE — No effective route within two intermediates
PDF -> ODT: UNAVAILABLE — No effective route within two intermediates
PDF -> EPUB: UNAVAILABLE — No effective route within two intermediates
PDF -> PNG: AVAILABLE DIRECT — pdf -> png
PDF -> JPG: AVAILABLE DIRECT — pdf -> jpg
PDF -> TIFF: AVAILABLE DIRECT — pdf -> tiff

