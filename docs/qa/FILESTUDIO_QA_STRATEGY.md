# FileStudio QA Strategy

This document defines the local QA readiness baseline for FileStudio. It does not certify the complete functional matrix as passing.

## A. Vercel Web QA

Vercel Web validates the public browser surface, health metadata, privacy constraints and browser-only conversions. It must not require native binaries, SQLite, server-side uploads, workers or local filesystem access.

Primary checks:

- `pnpm test:vercel`
- `pnpm build:vercel`
- browser E2E against a Vercel-mode build or preview when an authenticated preview URL is available

## B. Web/Desktop QA

Web/Desktop is the current local Next.js implementation under `src/`. It owns the mature conversion engines that run in-process with local filesystem and SQLite state.

Primary checks:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:acceptance:fixtures`
- conversion-suite runs against a local Desktop server when native tools are installed

## C. Service API/Worker QA

The Service API and Worker live under `apps/api` and `apps/worker`. They are separate service-mode components for private API and asynchronous processing. Current Wave 1 readiness does not assert full engine parity with Web/Desktop.

Primary checks:

- `pnpm test:api`
- `pnpm test:workers`
- package-level builds for service components
- acceptance suite against a prepared service environment when PostgreSQL, Redis and storage are provisioned

## D. Local Agent QA

The Local Agent lives under `apps/local-agent`. It supports authorized local execution and pairing flows for integrations such as Nexus. Current Wave 1 readiness does not assert full engine parity with Web/Desktop.

Primary checks:

- `pnpm test:local-agent`
- `pnpm smoke:local-agent`
- pairing, consent and credential-store tests
- platform packaging checks when portable build artifacts exist

## E. Portable Windows/Linux QA

Portable QA validates packaged local runtimes, bundled toolchains and clean-machine behavior. It depends on generated distribution artifacts and platform-specific execution.

Primary checks:

- `pnpm build:portable:windows`
- `pnpm build:portable:linux`
- `pnpm verify:portable:windows`
- `pnpm verify:portable:linux`
- `pnpm test:acceptance:compare`

## Acceptance Corpus

The canonical generated corpus is produced by:

```bash
pnpm test:acceptance:fixtures
```

It is deterministic and small. Generated files are intentionally ignored under `tests/acceptance/fixtures/generated/`; the committed source of truth is `scripts/acceptance/generate-fixtures.mjs` plus validator logic.

The corpus tracks:

- category: image, audio, video, document, pdf, archive, ebook or data
- complexity: simple, medium, complex or malformed
- fixture kind: canonical or edge-case
- SHA-256 hashes for generated files
- skipped fixtures when external tools are unavailable

Native-tool-dependent fixtures are skipped with explicit reasons instead of installing system packages during QA.
