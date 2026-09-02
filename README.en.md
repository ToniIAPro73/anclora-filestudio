<!-- markdownlint-disable MD001 MD013 MD033 MD041 MD060 -->

<div align="center">

<img src="./public/brand/anclora-filestudio.png" alt="Anclora FileStudio" width="132" />

# Anclora FileStudio

### Multi-format file conversion and batch operations

FileStudio is a comprehensive file format conversion engine supporting images, PDFs, audio, video, structured data, and documents. Deploy as a web application, desktop tool, or service with unified format handling across multiple engine backends.

[Español](./README.md) · **English**

<br />

![Anclora](https://img.shields.io/badge/Anclora-ecosystem-111827)
![Category](https://img.shields.io/badge/category-Internal-4FB3BF)
![Languages](https://img.shields.io/badge/languages-ES%20%7C%20EN-047857)

</div>

---

> [!IMPORTANT]
> Internal Anclora ecosystem repository. Do not publish operational details, credentials, or sensitive logic outside authorized channels.

## What it is

FileStudio centralizes file format conversion workflows for the Anclora ecosystem. It handles defensive file ingestion, multi-format output, batch operations, and quality validation across desktop, web, and service deployments. Built around pluggable engine backends (Sharp for images, QPDF/Poppler for PDFs, FFmpeg for audio/video, Tesseract for OCR), FileStudio provides consistent APIs regardless of deployment context.

## Category in the ecosystem

| Field | Value |
|---|---|
| Category | Internal |
| Brand accent | `#4FB3BF` |
| Typography | Inter |
| Canonical repository | `anclora-filestudio` |

## Key features

- **Multi-format conversion** — Images (JPEG, PNG, WebP, AVIF), PDFs, audio (MP3, WAV, FLAC, M4A, OGG), video (MP4, WebM), structured data (JSON, YAML, TOML, XML, CSV, TSV), documents (via LibreOffice/Pandoc), ebooks (via Calibre)
- **Batch operations** — Batch convert, compress, resize, rotate, extract metadata, strip EXIF/GPS data
- **Defensive validation** — Schema validation, loss-profile classification, engine availability checks before operations
- **Multiple deployment modes** — Web (browser-based canvas processing), Desktop (native engines), Service (API with async queue workers)
- **Quality control** — Playwright end-to-end tests, format-matrix reference, platform-specific verification (Windows/Linux portable builds)

## Technology stack

| Area | Technology |
|---|---|
| Framework | Next.js 16, React 19 |
| Styling | Tailwind CSS 4 |
| Validation | Zod |
| Image engine | Sharp 0.35 |
| PDF engine | pdf-lib 1.17 |
| Audio/video engine | FFmpeg (via scripts) |
| Testing | Vitest, Playwright |
| Storage | better-sqlite3 |
| Icons | Lucide React |

## Local setup

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 — the web interface is served from the Next.js dev server.

To run the full test suite:

```bash
pnpm check  # lint + typecheck + test + build
```

## Supported languages

- Español (default)
- English

## Documentation and governance

- Supported format matrix: [`docs/format-matrix.md`](./docs/format-matrix.md)
- Diagnostic guide: [`docs/diagnostic-guide.md`](./docs/diagnostic-guide.md)
- Security and privacy: [`docs/security.md`](./docs/security.md), [`docs/privacy.md`](./docs/privacy.md)
- Governance and vault: `contracts/` and `docs/governance/`

---

<div align="center">

### Anclora Group

Internal use

</div>
