# FileStudio HTML Renderer Implementation

## Implemented Primitive

Primitive: `HTML_RENDERER`

Canonical edges:

- `html -> png` via `html-renderer`
- `html -> tiff` via `html-renderer`

Derived graph routes:

- `md -> html -> png`
- `md -> html -> tiff`
- `rst -> html -> png`
- `rst -> html -> tiff`

No manual MD/RST image routes were added.

## Files

- `src/lib/engines/html/html-renderer-runtime.ts`
- `src/lib/engines/html/html-renderer-engine.ts`
- `src/lib/engines/registry.ts`
- `src/lib/domain/engines.ts`
- `src/lib/domain/operations.ts`
- `src/lib/conversion-matrix/engines.ts`
- `src/lib/conversion-matrix/matrix.ts`
- `src/lib/conversion-routing/quality.ts`
- `src/lib/jobs/capability-routing.ts`
- `tests/integration/html-renderer-engine.test.ts`
- `tests/unit/conversion-matrix-quickwins.test.ts`
- `tests/unit/conversion-routing/ranking.test.ts`
- `tests/unit/conversion-matrix.test.ts`

## Runtime Resolver

Resolution order:

1. `ANCLORA_FILESTUDIO_CHROMIUM_PATH`
2. future portable/runtime paths under `tools/chromium`
3. Playwright cache, used only as explicit local Linux E2E runtime

The resolver is the single source for diagnostics, routing availability and execution.

## Rendering Behavior

- Input HTML fragments are normalized into a complete document.
- A neutral base stylesheet is injected for readable markup output.
- No Anclora branding is injected.
- Output is a full-page screenshot, not initial viewport only.
- Max render height: 16000 px.
- Max pixels: 24000000.
- Oversized documents fail with a controlled error; they are not silently truncated.

## TIFF

TIFF is implemented as:

`HTML -> PNG buffer -> Sharp TIFF/LZW`

Metadata:

- `pipelineMode`: `transcode`
- `reencodeRequired`: `true`
- extra runtime: Sharp encode step
- quality: visually high, structurally irreversible

## Web Strategy

The renderer is Desktop-only. Vercel Web remains browser-only and does not gain native HTML rendering.

## Windows Static Readiness

No Windows portable build was generated.

Future Windows bundle design:

- place locked Chrome for Testing/Chromium under `tools/chromium/chrome-win64/chrome.exe`
- record browser version, archive SHA256, executable SHA256, source URL, notices and SBOM
- set or resolve binary path through `ANCLORA_FILESTUDIO_CHROMIUM_PATH`
- use same isolated profile and launch args
- run static resolver tests before native QA

