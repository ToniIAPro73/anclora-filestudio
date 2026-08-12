# FileStudio PDF→DOCX — Candidate Evaluation

Generated: 2026-08-13

Goal: close the last Tier 1 gap (PDF→DOCX) with real editable-DOCX quality,
safe licensing and reproducible execution. No SaaS. No forced adoption.

## Decision matrix

| CANDIDATE | QUALITY | LICENSE | WINDOWS | LINUX | BUNDLE | SIZE | MAINTENANCE | SECURITY | COMPLEXITY | DECISION |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LibreOffice `writer_pdf_import` | Good text/layout; tables flattened; headings lose style | MPL-2.0 — compatible | Yes (portable soffice already bundled) | Yes (24.2 verified) | Already bundled — zero new dependency | 0 MB extra | Active (TDF) | Known CVE surface, patched upstream; headless + profile isolation | Low — engine exists | **ADOPT (MVP)** |
| pdf2docx 0.5.13 | Best-in-class open source (real tables/headings) | MIT **but hard-depends on PyMuPDF ≥1.26.7 = AGPL-3.0** | Via Python | Via Python | Requires Python runtime + ~300–500 MB transitive deps (PyMuPDF, opencv-headless, numpy) | Very large | Active | Native libs | High — Python strategy + AGPL | **REJECT (license + bundle)** |
| Calibre `ebook-convert` pdf→docx | Weak: injects TOC/"Document Outline", flattens tables, reflows layout | GPL-3.0 | Yes | Yes | Already present but PDF edges declared:false | 0 MB extra | Active | Native | Low | **REJECT (quality: injected content, layout loss)** |
| pdfminer/pdfplumber + python-docx custom pipeline | Potentially good tables; unproven at MVP effort | MIT (clean) | Via Python | Via Python | Requires bundled Python runtime | Medium | Active deps | Low | High — own layout engine | **INVESTIGATE (future)** |
| MuPDF / PyMuPDF direct | Good extraction | AGPL-3.0 or commercial Artifex license | — | — | AGPL incompatible with proprietary portable distribution | — | Active | — | — | **REJECT (license, confirmed)** |
| SaaS (CloudConvert, Adobe, Aspose Cloud, ConvertAPI) | High | Commercial ToS | — | — | Violates local-first | — | — | Data leaves device | — | **REJECT (policy §10, comparison only)** |

## Candidate records

### LibreOffice writer_pdf_import

- NAME: LibreOffice Writer PDF import filter
- TYPE: existing native engine feature
- LANGUAGE/RUNTIME: C++ / soffice headless (already bundled in portable and installed on VPS)
- QUALITY EXPECTATION: MEDIUM-HIGH for text PDFs
- TEXT: faithful (no visual duplication; mc:AlternateContent pairs render once)
- TABLES: cell text preserved in reading order; NOT reconstructed as `w:tbl` objects
- IMAGES: embedded (`word/media`, `<a:blip>` verified)
- LAYOUT: absolute-positioned text frames — visually faithful, no reflow
- MULTIPAGE: all pages imported, page markers verified
- UNICODE: áéíóú ü ñ € £ © ™ α β γ Δ Ω ç ø å verified
- WINDOWS SUPPORT: yes — portable LibreOffice already in toolchain
- LINUX SUPPORT: yes — verified on VPS (LibreOffice 24.2.7.2)
- HEADLESS: yes (`--headless --convert-to docx --infilter="writer_pdf_import"`)
- CLI/API: CLI
- LICENSE: MPL-2.0
- REDISTRIBUTION: allowed (already bundled with notices)
- COMMERCIAL USE: allowed
- BUNDLE IMPACT: none — zero new dependency
- INSTALL SIZE: +0 MB
- RUNTIME SIZE: unchanged
- MAINTENANCE STATUS: active (The Document Foundation)
- RELEASE RECENCY: 24.2.x line current
- DEPENDENCY COMPLEXITY: none new
- SECURITY RISK: malformed-PDF surface handled by LO; isolated profile + timeout + temp-dir cleanup in adapter
- INTEGRATION COMPLEXITY: low — extends existing `libreoffice-engine`
- RECOMMENDATION: ADOPT

### pdf2docx

- NAME: pdf2docx 0.5.13 (PyPI)
- TYPE: Python library
- LICENSE: MIT **but requires PyMuPDF ≥ 1.26.7 (AGPL-3.0 / Artifex commercial)**; transitive: python-docx, fonttools, numpy, opencv-python-headless, fire
- REDISTRIBUTION: AGPL-3.0 of PyMuPDF is incompatible with FileStudio's proprietary portable distribution; commercial Artifex license required otherwise (cost + legal review)
- COMMERCIAL USE: blocked without Artifex license
- BUNDLE IMPACT: full Python runtime + ~300–500 MB native deps
- PYTHON REQUIRED: yes (3.9+); would force Python strategy (§22) — embeddable runtime or standalone exe, both heavy
- RECOMMENDATION: **REJECT** — AGPL contamination via mandatory PyMuPDF + bundle size/complexity. Not installed (§7: evaluation completed before install).

### Calibre ebook-convert

- LICENSE: GPL-3.0 (already handled as declared:false engine in matrix)
- QUALITY: measured on corpus — injects "Table of Contents" and "Document Outline" content not present in the source PDF; flattens tables to plain text; reflows layout ebook-style
- RECOMMENDATION: **REJECT** — quality below threshold (injected content violates fidelity)

## License conclusion

No ambiguity for the adopted path: LibreOffice is MPL-2.0, already bundled and
noticed; execution-only integration (no linking). pdf2docx is legally unusable
for FileStudio without an Artifex commercial license because PyMuPDF (AGPL-3.0)
is a mandatory dependency. If a future phase wants pdf2docx-class table
reconstruction, evaluate either an Artifex commercial license or the clean-MIT
pdfplumber + python-docx custom pipeline.
