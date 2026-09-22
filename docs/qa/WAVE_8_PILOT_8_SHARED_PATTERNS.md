# Wave 8 / Pilot 8 — Shared Product Patterns

Date: 2026-09-22  
Repository: `anclora-filestudio`  
Branch: `development`  
Design System: `@anclora/design-system` `0.14.0` at `4be18bd1cc632ceefae258b0462500b65f6ab32b`

## Scope

The pilot adopts the installed canonical patterns on the existing FileStudio workflow only:

- `file-upload`: `SourceSelector` and `WebFileDropzone`
- `processing-result`: `ArtifactResultCard`
- `bulk-action-bar`: `BatchActionToolbar` for genuine multi-job batches
- `destructive-confirmation`: `CloseAppButton`, retaining its real shutdown ownership

Business orchestration, API calls, download tokens, job polling, batch semantics, and shutdown behavior remain FileStudio-owned.

## Evidence

- `pnpm typecheck`: PASS
- `pnpm lint`: PASS
- focused Vitest suites: PASS, 22 tests
- `pnpm build`: PASS
- real `agent-browser` QA at `/convert?target=pdf`: PASS for desktop/mobile render, no horizontal overflow, main landmark, file input contract, and modal open/cancel focus return
- axe: no Pilot 8-specific structural violation after the dropzone fix; remaining findings are pre-existing navigation/tab semantics, legacy tiny text contrast, and manual-review contrast on the existing brand gradient/dialog surface

The browser QA did not submit a real upload, invoke conversion, download an artifact, or confirm application shutdown. This was intentional because the local runtime is production-backed and the repository contract requires service credentials and non-mutating QA. Unit tests use synthetic in-memory files only.

## Implementation notes

The immutable package was installed from the canonical Git SHA. Next/Turbopack could not resolve the package's nested relative imports through `system.css`, so the consumer imports the immutable package source layers directly in `src/app/globals.css`. This is a consumer compatibility workaround; the Design System repository was not changed.

The existing batch toolbar is a real multi-job action surface, but it does not expose checkbox-style item selection. Therefore the canonical selected-count semantics are not fully exercised and remain evidence-limited for a future pass.

## Wave 9 guardrail

No new evidence was collected for filter toolbar, combobox, data grid, inspector, file preview, onboarding, import flow, or entity-management promotion. These remain out of scope.
