# FileStudio Optional Runtime Pack Architecture

## Decision

Selected model: **B. Optional official runtime pack**.

FileStudio Core keeps `playwright-core` but does not bundle Chromium. Heavy runtimes are delivered as versioned `RuntimePack` definitions with trusted fixed sources, SHA256 verification, atomic install, health probes and user-local install paths.

Hybrid fallback is allowed only as explicit advanced configuration (`ANCLORA_FILESTUDIO_CHROMIUM_PATH`, or system Chrome only when `ANCLORA_FILESTUDIO_ALLOW_SYSTEM_CHROME=1`). It is not primary product behavior.

## Primitive

```ts
type RuntimePackDefinition = {
  id: string
  name: string
  version: string
  platform: "windows" | "linux" | "darwin"
  architecture: "x64" | "arm64"
  source: { type: "https"; url: string; trustedOrigin: string }
  sha256: string
  compressedSize: number
  installedSize: number
  license: { name: string; url: string }
  notices: string[]
  capabilities: string[]
  executablePaths: Record<string, string>
  healthProbe: { type: string; executableKey: string; args: string[]; timeoutMs: number }
}
```

Implemented in `src/lib/runtime-packs`.

## State Model

Pack states:

- `NOT_REQUIRED`
- `NOT_INSTALLED`
- `DOWNLOADING`
- `VERIFYING`
- `INSTALLING`
- `AVAILABLE`
- `UPDATE_AVAILABLE`
- `BROKEN`
- `INCOMPATIBLE`

Capability states:

- `available`
- `installable`
- `unavailable-tool`
- `unsupported`

## Capability Relation

Capabilities can expose `requiredRuntimePacks` and `runtimeState`. The conversion matrix does not know download mechanics. It only marks HTML renderer routes as existing when the official compatible pack is installable.

Current dependency:

`HTML_RENDERER -> chromium-runtime`

This enables:

- HTML -> PNG
- HTML -> TIFF
- MD -> PNG
- MD -> TIFF
- RST -> PNG
- RST -> TIFF

## Install Paths

Windows:

`%LOCALAPPDATA%/Anclora/FileStudio/runtime-packs/`

Linux:

`~/.local/share/anclora-filestudio/runtime-packs/`

macOS-ready model:

`~/Library/Application Support/Anclora/FileStudio/runtime-packs/`

## Execution Gate

Discovery and routing can return installable routes. Job creation gates execution before creating work:

`route -> required packs -> runtime ready? -> create job`

Missing pack returns `RUNTIME_PACK_REQUIRED` with `requiredRuntimePacks`.

## Files

- `src/lib/runtime-packs/types.ts`
- `src/lib/runtime-packs/manager.ts`
- `src/lib/runtime-packs/registry.ts`
- `src/lib/runtime-packs/registry/chromium.ts`
- `src/lib/engines/html/html-renderer-runtime.ts`
- `src/app/api/capabilities/route.ts`
- `src/server/desktop-routes/jobs-route.ts`
