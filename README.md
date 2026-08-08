<!-- markdownlint-disable MD001 MD013 MD033 MD041 MD060 -->

<div align="center">

<img src="./public/brand/anclora-filestudio.png" alt="Anclora FileStudio" width="132" />

# Anclora FileStudio

### Multi-format file conversion and batch operations

FileStudio is a comprehensive file format conversion engine supporting images, PDFs, audio, video, structured data, and documents. Deploy as a web application, desktop tool, or service with unified format handling across multiple engine backends.

**Español** · [English](./README.en.md)

<br />

![Anclora](https://img.shields.io/badge/Anclora-ecosystem-111827)
![Categoría](https://img.shields.io/badge/categoría-Interna-4FB3BF)
![Idiomas](https://img.shields.io/badge/idiomas-ES%20%7C%20EN-047857)

</div>

---

> [!IMPORTANT]
> Repositorio interno del ecosistema Anclora. No publicar detalles operativos, credenciales,
> datos reales ni lógica sensible fuera de los canales autorizados.

## Qué es

FileStudio centralizes file format conversion workflows for the Anclora ecosystem. It handles defensive file ingestion, multi-format output, batch operations, and quality validation across desktop, web, and service deployments. Built around pluggable engine backends (Sharp for images, QPDF/Poppler for PDFs, FFmpeg for audio/video, Tesseract for OCR), FileStudio provides consistent APIs regardless of deployment context.

## Categoría en el ecosistema

| Campo | Valor |
|---|---|
| Categoría | Interna |
| Acento de marca | `#4FB3BF` |
| Tipografía | Inter |
| Repositorio canónico | `anclora-fileStudio` |

## Funcionalidades principales

- **Conversión multi-formato** — Images (JPEG, PNG, WebP, AVIF), PDFs, audio (MP3, WAV, FLAC, M4A, OGG), video (MP4, WebM), structured data (JSON, YAML, TOML, XML, CSV, TSV), documents (via LibreOffice/Pandoc), ebooks (via Calibre)
- **Operaciones por lotes** — Batch convert, compress, resize, rotate, extract metadata, strip EXIF/GPS data
- **Validación defensiva** — Schema validation, loss-profile classification, engine availability checks before operations
- **Múltiples modos de despliegue** — Web (browser-based canvas processing), Desktop (native engines), Service (API with async queue workers)
- **Control de calidad** — Playwright end-to-end tests, format-matrix reference, platform-specific verification (Windows/Linux portable builds)

## Stack tecnológico

| Área | Tecnología |
|---|---|
| Framework | Next.js 16, React 19 |
| Styling | Tailwind CSS 4 |
| Validación | Zod |
| Motor de imágenes | Sharp 0.35 |
| Motor PDF | pdf-lib 1.17 |
| Motor de audivisuales | FFmpeg (via scripts) |
| Testing | Vitest, Playwright |
| Almacenamiento | better-sqlite3 |
| Tipografía | Lucide React icons |

## Arranque local

```bash
pnpm install
pnpm dev
```

Abre http://localhost:3000 — la interfaz web se sirve desde el servidor de desarrollo Next.js.

Para ejecutar suite de test completa:

```bash
pnpm check  # lint + typecheck + test + build
```

## Idiomas soportados

- Español (predeterminado)
- English

## Documentación y gobernanza

- Matriz de formatos soportados: [`docs/format-matrix.md`](./docs/format-matrix.md)
- Guía de diagnóstico: [`docs/diagnostic-guide.md`](./docs/diagnostic-guide.md)
- Seguridad y privacidad: [`docs/security.md`](./docs/security.md), [`docs/privacy.md`](./docs/privacy.md)
- Gobernanza y bóveda: `contracts/` y `docs/governance/`

---

<div align="center">

### Anclora Group

Uso interno

</div>
