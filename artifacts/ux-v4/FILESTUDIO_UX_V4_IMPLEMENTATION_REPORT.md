# FileStudio UX v4 Windows Gate Report

Date: 2026-08-12

Scope: QA/release diagnosis only. No UX redesign, no release, no version change and no push.

## Executive Status

FILESTUDIO UX V4: FAIL

The current candidate cannot be certified as UX v4 PASS for Windows-real release gates from this environment. The Windows portable artifact builds and verifies structurally, but native Windows execution was not available here, so Windows native Poppler, launcher/runtime, favicon runtime and portable smoke cannot be honestly marked PASS.

The previously reported multimedia blockers have been remediated in this phase:

- Real HLS ABR analysis now surfaces 480p, 720p and 1080p variants to the UI.
- The MP4 quality selector is source-derived and no longer shows a static or empty list.
- Audio URL "best" no longer maps to low MP3 VBR 7.
- Separate DASH video/audio mux was certified with a public demuxed Akamai Big Buck Bunny source.

Remaining non-media blockers from the broader Windows UX v4 gate still apply:

- The graph contains multistep routes, but no effective visible multistep route is offered by the current route selection for an executable E2E user flow; the jobs endpoint reselects the best effective route, so a visible multistep E2E run is blocked.
- Native Windows launcher/runtime/Poppler/favicons were not executed in this Linux environment.

## Windows Portable Candidate

Candidate folder:

`artifacts/ux-v4/windows-real-qa-20260812T195355Z`

Artifact:

`dist/windows/Anclora-FileStudio-Windows-x64-Core.zip`

ZIP SHA256:

`adb4b40a667e7d6493b0289e1ac7caef4ed9cd9303787dba93b2e50b3047d15d`

Build result:

- `pnpm build:portable:windows`: PASS
- Windows ZIP size: 235M
- Runtime locked in candidate: Node.js 24.16.0, yt-dlp 2026.06.09, better-sqlite3 12.10.1, sharp win32 x64 0.35.1, Pandoc 3.6.4, QPDF 11.10.0, Poppler 26.02.0-0
- Poppler lock SHA256: `993e4a94376ed712fafc7058d724ea0b943d118bbd2305cd9ed55174eb85cda5`

Verify result:

- `pnpm verify:portable:windows`: PASS, 98 checks
- Verified ZIP/SHA, manifest, runtime metadata, required server files, SBOM, Windows native modules, tools layout, BAT/PS1 launcher paths, 127.0.0.1 binding and absence of Linux binaries/secrets/workspace paths.

Smoke result:

- `pnpm smoke:portable:windows`: STRUCTURAL PASS, 42/42
- Native Windows acceptance: SKIPPED/BLOCKED because `powershell.exe` is not available in this Linux environment.
- Smoke warning: `semver@7.8.5`, expected `7.8.4`; non-fatal in current script.

Bundled tools evidence:

- `tools/poppler/Library/bin/pdftoppm.exe`: present in ZIP
- `tools/poppler/share/poppler/COPYING`: present in ZIP
- Launcher sets `ANCLORA_FILESTUDIO_POPPLER_PATH` to the bundled `tools\poppler` base and includes Poppler bin dirs in process PATH composition.

## Poppler

Linux native evidence:

- `pdftoppm version 24.02.0`
- Path: `/usr/bin/pdftoppm`
- Real one-page PDF from a path containing spaces generated a valid PNG.
- Real three-page PDF from a path containing spaces generated three valid PNG files.
- Unit coverage: `tests/unit/poppler-engine.test.ts` passed, including ZIP packaging for multipage output.
- Matrix/router coverage passed: QPDF rasterization binding remains zero and multi-output Poppler raster edges are excluded as unsafe intermediates.

Windows native evidence:

- Bundled `pdftoppm.exe`: present.
- Versioned Poppler payload: present and SHA locked.
- Runtime execution on Windows: BLOCKED, no Windows native runtime available here.

## Acquisition Gating

Browser verification used `agent-browser` against `http://127.0.0.1:3210`.

Observed:

- DOCX -> PDF workspace shows only local file dropzone.
- PNG -> WEBP workspace shows only local file dropzone.
- MP4 destination-first workspace shows local file and URL de vídeo.
- Google Drive and OneDrive are hidden.
- URL web generic and direct file URL are not independently implemented as separate modes in this UI; they remain absent from the tested flows.
- When only local file is valid, no extra tabs are shown.

Status: PARTIAL PASS. Existing visible/hidden behavior matches the tested cases, but the conceptual `direct-url` and `web-url` modes are not separately certifiable as implemented capabilities.

## Media URL Analysis And Quality

Status after multimedia remediation: PASS.

Public test source:

`https://docs.evostream.com/sample_content/assets/hls-sintel-abr3/playlist.m3u8`

EvoStream documents this as a Sintel adaptive bitrate HLS master with 480p, 720p and 1080p variants.

Independent tool evidence:

- `yt-dlp -J` detected formats:
  - 854x480, format id 669
  - 1280x720, format id 1170
  - 1920x1080, format id 2249
- `ffprobe` detected corresponding HLS video/audio stream pairs for 480p, 720p and 1080p.

FileStudio analyzer evidence after remediation:

- `analyzeRemoteMedia()` returns `sourceKind: "hls"`, `sourceType: "hls"`, `analysisStatus: "resolved"`.
- HLS variants surfaced: 480p, 720p and 1080p.
- `bestVideo` resolves to format `2249`, 1920x1080.
- DASH separate sources preserve video-only and audio-only variants; `muxRequired: true` is exposed for separate-stream cases.

Execution evidence after remediation:

- Explicit 720p HLS selector produced a valid MP4; `ffprobe` confirmed `width=1280`, `height=720`, video `h264`, audio `aac`.
- Explicit "Mejor disponible" HLS selector produced a valid output; `ffprobe` confirmed `width=1920`, `height=1080`, video `h264`, audio `aac`.
- DASH separate stream mux was certified with `https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd`; yt-dlp selected `bbb_30fps_1280x720_4000k+bbb_a64k`, and `ffprobe` confirmed a 1280x720 MP4 with video and audio streams.
- Audio "best" no longer maps to `--audio-quality 7`; MP3 best maps to VBR 0 and produced an MP3 around 224 kbps in the real probe.
- Selected resolution selectors use exact `height=N`; no `height<=N` selector remains in the media quality contract.

UI smoke after remediation:

- `agent-browser` global 0.34.0 was used against `http://localhost:3000`.
- MP4 workspace showed valid acquisition modes only: device and video URL.
- The HLS URL analysis showed `Mejor disponible`, `480p`, `720p`, `1080p`; no static or duplicated resolution list was shown.
- Screenshots are under `artifacts/ux-v4/media-remediation/`.

Residual note:

- Local PATH still reports `yt-dlp 2024.04.09`. No toolchain lock was changed in this phase; Windows portable remains locked separately to `yt-dlp 2026.06.09`.
- The old EvoStream DASH bunny MPD still fails mux postprocessing with local PATH `yt-dlp 2024.04.09`, but a public demuxed DASH source was successfully muxed and no production path silently falls back to lower quality.

## Multistep E2E

Graph diagnosis:

- All effective destinations from `getAvailableDestinations()` using the full desktop engine set returned zero best visible multistep routes.
- Raw graph search found multistep routes, mainly audio conversion chains, but those are not surfaced as the effective user route because direct routes exist.
- The jobs endpoint recomputes and uses the best available route for a destination, so a hidden/manual multistep route cannot be used to certify the UX gate.

Status: BLOCKED/FAIL. No visible, safe, executable multistep E2E user flow was found in the current effective matrix.

## Quick Converter

Browser smoke:

- Source only: DOCX selected, destinations filtered to supported targets such as PDF/HTML/MD/TXT/ODT/JPG/PNG/TIFF; MP3 was not present.
- Target only: PDF selected, source list filtered to compatible document/ebook sources; image/audio/video sources were not offered.
- Source + target: DOCX -> PDF navigated to the conversion workspace.
- Invalid pairs were not selectable through the filtered lists.

Status: PASS for smoke scope.

## Results And Batch

Evidence:

- Unit and component tests covering result/batch simplification passed in the full suite.
- Browser E2E result download was not completed in this diagnosis because the requested sequence prioritized Windows/media/multistep gates and no fixes were allowed.

Status: PARTIAL PASS. Existing automated coverage passes; manual single/multiple result E2E remains a residual QA gap.

## Favicon

Direct runtime assets at `http://127.0.0.1:3210`:

- `/favicon.ico`: 200, `image/x-icon`, SHA256 `7488c656bbfe0ccb9093121463d3ed5e7a7c6ac94938288c4698bf9e56f27a0b`, ICO with 6 icons.
- `/favicon-32.png`: 200, `image/png`, SHA256 `dae79a4eb5e87187d0fc4b68a92821bf5bdccc3047f29c374efde83bc9a346a2`, 32x32.
- `/favicon-512.png`: 200, `image/png`, SHA256 `dcebc03b88f0807387975cb2853897b02ac2740b76ec08b56d63b4355356aa73`, 512x512.
- `/icon.png`: 200, `image/png`, SHA256 `dcebc03b88f0807387975cb2853897b02ac2740b76ec08b56d63b4355356aa73`, 512x512.
- `/apple-touch-icon.png`: 200, `image/png`, SHA256 `8886697996420e1072c906b5d29d6e356ea712457fecffe3f94cc078e7edf8b0`, 180x180.

Cache invalidation:

- Metadata cache-busting exists in implementation.
- Old-build -> new-build same-origin browser cache scenario was not run because no prior Windows runtime/build session was available.
- Incognito Windows was not run.

Status: DIRECT ASSETS PASS, CACHE INVALIDATION REAL SCENARIO BLOCKED.

## Regression

- `pnpm typecheck`: PASS
- `pnpm lint`: PASS with 3 existing `<img>` warnings in `src/components/inspector/compare-inspector-modal.tsx`
- `pnpm test`: PASS, 895 passed, 1 skipped
- `pnpm build`: PASS with Turbopack NFT tracing warnings
- Targeted Poppler/router/favicon tests: PASS, 52 tests
- Targeted media quality contract tests: PASS, 72 tests

## Release Blockers

- Windows native launcher/runtime/Poppler execution not run; no Windows machine or `powershell.exe` available here.
- No visible effective multistep route available for user E2E certification.
- Favicon cache invalidation old-build -> new-build scenario not run on Windows.

## Remaining Risks

- Windows portable structural PASS is strong packaging evidence but not a replacement for native Windows execution.
- Local Linux PATH `yt-dlp` remains 2024.04.09 while Windows candidate bundles 2026.06.09; no toolchain lock update was made in this multimedia phase.
- EvoStream bunny DASH mux still fails with local PATH `yt-dlp`/FFmpeg, but Akamai demuxed DASH mux passes and no silent downgrade path remains.
- Result/batch UX has automated coverage but lacks a manual/browser E2E conversion result capture in this diagnosis.

## Final Three Gates

Date: 2026-08-12

Scope:

- Windows Native + Poppler preparation.
- Multistep E2E real.
- Favicon Windows preparation and cache invalidation evidence.

### Multistep E2E

Status: PASS on Linux, ready for Windows native QA.

Effective productive route found:

```text
DOCX -> PDF -> PNG
```

Why it is valid:

- No direct `DOCX -> PNG` edge exists in the effective graph for this engine set.
- The selected route uses real production primitives:
  - `DOCX -> PDF` via LibreOffice.
  - `PDF -> PNG` via Poppler.
- The UI showed the route before conversion as `DOCX PDF PNG` with `Conversión en varios pasos`.
- The backend log showed both real steps:
  - `Step 1/2 done (libreoffice, 4262ms)`
  - `Step 2/2 done (poppler, 248ms)`
- Final output: `fixture-docx.png`, PNG, 15 KB.

Evidence:

- `artifacts/ux-v4/final-gates-runtime-multistep.tmp.json`
- `artifacts/ux-v4/final-gates/multistep-linux-e2e.json`
- `artifacts/ux-v4/final-gates/multistep-ui-route-visible.png`
- `artifacts/ux-v4/final-gates/multistep-ui-result.png`

Safety:

- Router tests cover `>2` intermediates rejected.
- Router tests cover multi-output edges rejected as unsafe intermediates.
- A focused real-catalog test now covers `DOCX -> PDF -> PNG` discovery.

### Favicon

Status: prepared in VPS; Windows old-build -> new-build remains native QA gate.

Direct runtime assets from `http://localhost:3000`:

- `/favicon.ico`: 200, `image/x-icon`, SHA256 `7488c656bbfe0ccb9093121463d3ed5e7a7c6ac94938288c4698bf9e56f27a0b`, ICO with 6 icons.
- `/favicon-32.png`: 200, `image/png`, SHA256 `dae79a4eb5e87187d0fc4b68a92821bf5bdccc3047f29c374efde83bc9a346a2`, 32x32.
- `/favicon-512.png`: 200, `image/png`, SHA256 `dcebc03b88f0807387975cb2853897b02ac2740b76ec08b56d63b4355356aa73`, 512x512.
- `/icon.png`: 200, `image/png`, SHA256 `dcebc03b88f0807387975cb2853897b02ac2740b76ec08b56d63b4355356aa73`, 512x512.
- `/apple-touch-icon.png`: 200, `image/png`, SHA256 `8886697996420e1072c906b5d29d6e356ea712457fecffe3f94cc078e7edf8b0`, 180x180.

Rendered HTML metadata:

```text
/favicon-32.png?v=dae79a4eb5e8
/favicon-512.png?v=dcebc03b88f0
/icon.png?v=dcebc03b88f0
/favicon.ico?v=7488c656bbfe
/apple-touch-icon.png?v=888669799642
```

Cache invalidation:

- The query value is derived from SHA-256 content hash, not a manual version.
- Linux old-build -> new-build was not fully runnable because no old FileStudio build with legacy favicon is available in this VPS.
- Windows native QA must run the full old-build -> new-build same-host/same-port browser profile scenario without clearing cache.

Evidence:

- `artifacts/ux-v4/final-gates/favicon-runtime-manifest.json`
- `artifacts/ux-v4/final-gates/favicon-html-current.html`
- `artifacts/ux-v4/final-gates/favicon-cache-invalidation-linux.json`
- `artifacts/ux-v4/final-gates/favicon-512-visual.png`
- `artifacts/ux-v4/final-gates/favicon-ico-visual.png`

### Poppler Windows Preparation

Status: prepared and packaged; native Windows execution remains required.

Toolchain lock:

```text
Poppler: 26.02.0-0
Distribution: oschwartz10612/poppler-windows
Asset: Release-26.02.0-0.zip
SHA256: 993e4a94376ed712fafc7058d724ea0b943d118bbd2305cd9ed55174eb85cda5
License: GPL-2.0
```

Final ZIP inventory:

- `tools/poppler/Library/bin/pdftoppm.exe`: present.
- Poppler entries: 456.
- Poppler DLLs: 26.
- Favicon assets included in `app/public`.
- QPDF rasterization active bindings: 0.

Resolver policy:

```text
configured/bundled Poppler
-> tools/poppler/Library/bin
-> tools/poppler/bin
-> tools/poppler root
-> PATH fallback
```

The Windows launcher sets `ANCLORA_FILESTUDIO_POPPLER_PATH` to bundled `tools\poppler` and adds Poppler bin directories to PATH for DLL lookup.

Evidence:

- `artifacts/ux-v4/final-gates/poppler-windows-prep-manifest.json`
- `artifacts/ux-v4/final-gates/windows-candidate-zip-inventory.json`

### Regression And Candidate

Regression:

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS, 0 errors, 3 existing `<img>` warnings.
- `pnpm test`: PASS, 896 passed, 1 skipped.
- `pnpm build`: PASS, Turbopack NFT tracing warnings.

Windows portable:

- Build: PASS.
- Verify: PASS, 98 checks.
- Smoke: PASS, 42/42 structural checks; native Windows acceptance skipped because `powershell.exe` is unavailable in the VPS.

Final candidate:

```text
dist/windows/Anclora-FileStudio-Windows-x64-Core.zip
Size: 245795211 bytes
SHA256: 243427e485b6ded9b204ceb879455590bad337448faea75bfe4a129d4bcc9f85
Build HEAD: 066001cf1238b843ae0ef9d331e184e0b95d632d
```

Windows native QA package:

- `artifacts/ux-v4/final-gates/WINDOWS_NATIVE_QA_UXV4_FINAL.md`
- `artifacts/ux-v4/final-gates/WINDOWS_NATIVE_QA_UXV4_FINAL.ps1`

### Gate Status

Pre-Windows-native result:

```text
MULTISTEP ROUTING: PASS
MULTISTEP EXECUTOR: PASS
MULTISTEP SAFETY: PASS

FAVICON DIRECT ASSETS: PASS
FAVICON HASHING: PASS
FAVICON HTML METADATA: PASS
FAVICON LINUX CACHE INVALIDATION: DOCUMENTED ENVIRONMENT LIMIT

POPPLER WINDOWS BUNDLE: PASS
POPPLER WINDOWS DEPENDENCIES: PASS
POPPLER TOOLCHAIN LOCK: PASS
POPPLER BUNDLED PRIORITY LOGIC: PASS

WINDOWS NATIVE QA: BLOCKED IN VPS
FILESTUDIO UX V4: FAIL until final candidate passes native Windows QA
```
