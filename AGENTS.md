# AI Agent Documentation - Anclora FileStudio

This document is the root agent entrypoint for `anclora-filestudio`.

The canonical local AOS adoption state is declared in [`.anclora/AOS_ADOPTION.md`](.anclora/AOS_ADOPTION.md). That declaration governs adoption metadata, local sources of truth, decision policy and exceptions.

## Current Architecture

FileStudio is in an incremental migration from a mature local Web/Desktop implementation to a distributed product/service architecture. Do not present engine parity as complete.

### Runtime Surfaces

| Surface | Current role | Capability status |
| --- | --- | --- |
| Vercel Web | Public Next.js web surface with browser-only processing, Vercel-safe health/capability metadata and no native binaries. | Limited by browser runtime. No server uploads or native conversion engines. |
| Web/Desktop local | Existing Next.js local app under `src/`, with SQLite, filesystem access and in-process conversion engines. | Most mature implementation today. |
| Service API | Private API under `apps/api`, intended for internal clients such as Nexus. | Implemented as service foundation; requires prepared service environment for full QA. |
| Worker | Queue worker under `apps/worker`. | Service-mode worker exists but does not yet have full Web/Desktop engine parity. |
| Local Agent | Authorized local execution bridge under `apps/local-agent`. | Pairing/local execution foundation exists; full engine parity is not complete. |
| Nexus integration | SDK and routing package under `packages/integrations/anclora-nexus`. | Reference integration package and contract tests for internal ecosystem consumers. |

### Repository Layout

```text
apps/
  api/                  Private Service API package.
  worker/               Service-mode queue worker package.
  local-agent/          Authorized local execution agent package.

packages/
  core/                 Shared service contracts, repositories, routing and job-state types.
  engines/              STUB for incremental engine migration. Do not assume migrated parity.
  sdk/                  TypeScript SDK for internal consumers.
  integrations/
    anclora-nexus/      Nexus routing policy, mock server and contract tests.

src/
  app/                  Current Next.js Web/Desktop routes and UI.
  components/           Current Web/Desktop UI components.
  i18n/                 Current message catalogs.
  lib/                  Current Web/Desktop engine implementation, registries, DB, jobs,
                        deployment-target guards, browser conversion and security helpers.
```

### Important Boundaries

- `src/lib/engines/**` is the current mature Web/Desktop engine implementation.
- `packages/engines` is a migration stub and must not be documented as equivalent to `src/lib/engines`.
- `apps/worker` and `apps/local-agent` must not be expanded for engine parity unless a separate architectural decision authorizes that work.
- Vercel Web must remain free of native binaries, local filesystem assumptions, SQLite runtime dependencies and long-running workers.
- Service API/Worker QA depends on service infrastructure that is outside this repository's local Wave 1 scope.
- Local Agent QA depends on local package/runtime preparation and explicit user consent flows.

## AOS Bootstrap

For governance or adoption work, read:

- [`.anclora/AOS_ADOPTION.md`](.anclora/AOS_ADOPTION.md)
- [`../anclora-knowledge/standards/AOS_ADOPTION_STANDARD.md`](../anclora-knowledge/standards/AOS_ADOPTION_STANDARD.md)
- [`../anclora-knowledge/knowledge/SOURCE_OF_TRUTH_REGISTRY.md`](../anclora-knowledge/knowledge/SOURCE_OF_TRUTH_REGISTRY.md)

Use the AOS model:

- ED: ecosystem decisions live in AOS.
- OD: operational and registry decisions live in Boveda/CHG.
- PD: FileStudio product and engineering decisions live in this repository.
- EX: AOS adoption exceptions live in `.anclora/AOS_ADOPTION.md`.

The pending decision [docs/governance/decision-expose-filestudio-as-product-infra.md](docs/governance/decision-expose-filestudio-as-product-infra.md) is not resolved by this document.

## QA Readiness

Wave 1 prepares QA infrastructure; it does not certify the full functional matrix as passing.

Local QA entrypoints:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm test:acceptance:fixtures`
- `pnpm test:acceptance:api`
- `pnpm test:acceptance:compare`

QA strategy is documented in [docs/qa/FILESTUDIO_QA_STRATEGY.md](docs/qa/FILESTUDIO_QA_STRATEGY.md).

## Current Implementation Notes

- `JobManager` is a per-process singleton. Scaling to multiple instances requires a durable queue and storage architecture.
- The `data/` directory holds local SQLite files. Do not delete runtime data during ordinary remediation.
- `better-sqlite3` requires native compatibility with the active Node.js ABI.
- Missing native binaries should degrade capabilities rather than break the Web/Desktop UI.
- All external process execution must keep `shell: false` unless a reviewed local wrapper explicitly justifies otherwise.
- Path safety must use resolved paths and relative containment checks, not raw `startsWith()` checks.
- The engine registry probes binary availability and caches results; missing tools are expected in partial environments.
- Do not use `--passWithNoTests` in the root test script.

## Historical Implementation Notes

This section preserves useful history. It is not the current architecture contract.

### Phase 1 - Initial Implementation

The first implementation created a local Next.js application for YouTube metadata and media conversion. It introduced secure process execution, temporary token handling, file management, a job manager and the first UI.

### Universal Conversion Suite

Later phases expanded FileStudio into a local universal conversion workspace:

- canonical format catalog and unified analysis result;
- in-process FFmpeg, Sharp, data, PDF, archive, Pandoc, LibreOffice, Calibre and Tesseract engines under `src/lib/engines`;
- error codes and i18n;
- batch processing;
- Windows/Linux portable packaging documentation.

### Service API and Distributed Architecture Work

Service-mode work added:

- `apps/api` for private API routes;
- `apps/worker` for queue processing;
- `apps/local-agent` for authorized local execution;
- `packages/core`, `packages/sdk` and `packages/integrations/anclora-nexus`;
- design documents for API, queue, storage, local agent and Nexus integration.

That migration is incomplete. The distributed packages do not yet replace the mature Web/Desktop engine implementation.
