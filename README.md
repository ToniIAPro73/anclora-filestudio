<!-- markdownlint-disable MD001 MD013 MD033 MD041 MD060 -->

<div align="center">

<img src="./public/brand/anclora-filestudio.png" alt="Anclora FileStudio" width="132" />

# Anclora FileStudio

### Multi-format file conversion and batch operations

FileStudio is a comprehensive file format conversion engine supporting images, PDFs, audio, video, structured data, and documents. Deploy as a web application, desktop tool, or service with unified format handling across multiple engine backends.

**Español** · [English](./README.en.md)

<br />

![Anclora](https://img.shields.io/badge/Anclora-ecosystem-111827)
![Categoría](https://img.shields.io/badge/categoría-MicroSaaS%20%C2%B7%20SecureFlow%20Prepare-4FB3BF)
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
| Categoría | MicroSaaS (familia comercial Anclora SecureFlow) |
| Acento de marca | `#14b8a6` (teal, `src/lib/filestudio-brand.ts`) |
| Tipografía | Inter |
| Repositorio canónico | `anclora-filestudio` |

## Anclora SecureFlow

FileStudio es el primer producto — capability **Prepare** — del tier SaaS comercial
**Anclora SecureFlow**, junto a Anclora PurgeDoc (Protect), Anclora TableExtract (Extract) y
Anclora CleanSheet (Automate):

> FileStudio prepara, convierte y organiza tus archivos para que el resto del flujo SecureFlow
> pueda trabajar con ellos.

- Se vende de forma independiente o incluido en packs de 2, 3 o 4 aplicaciones.
- El catálogo comercial y la whitelist de acceso viven en el repositorio `anclora-secureflow`
  (`src/data/products.ts`, `src/data/plans.ts`, `src/services/accessRequestService.ts`), no en
  este repositorio.
- El contrato de integración local (identificador, tier, capability, flags) se documenta en
  [docs/governance/secureflow-integration-contract.md](docs/governance/secureflow-integration-contract.md)
  y en `src/lib/filestudio-brand.ts` (campo `secureFlow`).
- Gobernanza del ecosistema: `anclora-vault/00-governance/registry/ecosystem-repos.json` y
  `anclora-group/contracts/core/ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md` clasifican FileStudio como
  `MicroSaaS` (antes `Interna`), igual que el resto de la familia SecureFlow.

## Funcionalidades principales

- **Conversión multi-formato** — Images (JPEG, PNG, WebP, AVIF), PDFs, audio (MP3, WAV, FLAC, M4A, OGG), video (MP4, WebM), structured data (JSON, YAML, TOML, XML, CSV, TSV), documents (via LibreOffice/Pandoc), ebooks (via Calibre)
- **Operaciones por lotes** — Batch convert, compress, resize, rotate, extract metadata, strip EXIF/GPS data
- **Validación defensiva** — Schema validation, loss-profile classification, engine availability checks before operations
- **Múltiples modos de despliegue** — Web (browser-based canvas processing), Desktop (native engines), Service (API with async queue workers)
- **Vídeo y Audio (Desktop only)** — local speech-to-text transcription via whisper.cpp (no cloud, no generative AI), embedded/YouTube subtitle extraction, audio/frame/thumbnail extraction, trim, metadata. See [docs/features/video-audio-tools.md](docs/features/video-audio-tools.md)
- **Control de calidad** — Playwright end-to-end tests, format-matrix reference, platform-specific verification (Windows/Linux/macOS portable builds)

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
- Release Desktop (Windows Setup.exe / macOS DMG / Linux portable): [`docs/release/RUNBOOK-RELEASE.md`](./docs/release/RUNBOOK-RELEASE.md), [`docs/portable-macos.md`](./docs/portable-macos.md)

---

<div align="center">

### Anclora Group

Uso interno

</div>
