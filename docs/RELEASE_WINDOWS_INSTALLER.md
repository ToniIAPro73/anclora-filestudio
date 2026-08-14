# Windows Installer & GitHub Release

This document covers the Windows Inno Setup installer built on top of the
existing Windows portable, and the GitHub Actions release pipeline that
builds, verifies, and (optionally) publishes it.

## Portable vs. Setup

Nothing about FileStudio's own behavior changes with the installer. The
Setup.exe **packages the already-built portable ZIP unmodified** — it does
not rebuild the app, does not add code, and does not change any conversion
logic. The only things the installer adds on top of the portable are:

- a per-user install location instead of "wherever you extracted the ZIP",
- a Start Menu entry and Desktop shortcut created automatically,
- an uninstaller,
- upgrade-in-place support across versions.

If you don't want any of that, the portable ZIP (`Anclora-FileStudio-Windows-x64-Core.zip`)
still works exactly as before — extract it anywhere and run
`INICIAR_ANCLORA_FILESTUDIO.bat`. The installer is an additional distribution
option, not a replacement.

## Install path

```
%LOCALAPPDATA%\Anclora\FileStudio
```

No administrator privileges are required or requested (`PrivilegesRequired=lowest`
in `installer/windows/filestudio.iss`). The installed layout is identical to
the portable's own layout (`app\`, `runtime\`, `tools\`, `data\`, `logs\`,
`temp\`, plus the launcher `.bat` files at the root) — the launcher scripts
compute every path relative to their own location, so installing into
`%LOCALAPPDATA%\Anclora\FileStudio` instead of a portable folder works with
zero changes to the launcher logic.

Runtime packs (optional native components downloaded on demand, e.g. the
Chromium renderer) already resolve independently to
`%LOCALAPPDATA%\Anclora\FileStudio\runtime-packs` regardless of where the app
itself is installed (`src/lib/runtime-packs/platform.ts`) — under the
installed layout this lands inside the same install root as a natural
subdirectory.

## Shortcuts

- Desktop: `Anclora FileStudio.lnk`
- Start Menu: `Anclora FileStudio` (with an uninstall shortcut alongside it)

Both point at `INICIAR_ANCLORA_FILESTUDIO.bat` inside the install directory —
the same real launcher the portable ships, not a new one.

## Persistence across upgrades

The installer's `[Files]` section only ever adds/overwrites the files it
ships (the app code, runtime, and bundled tools). It never touches, and
never lists in `[Setup]`/`[Files]`:

- `data\` — SQLite database, uploaded `cookies.txt`
- `logs\` — `app.log`, `server.log`, `error.log`
- `temp\` — in-flight job working directories
- `runtime-packs\` — downloaded optional native components

These directories ship in the ZIP only as empty placeholders (a single
`placeholder.txt` each, so the folders exist on first run) — the real
content is created by FileStudio itself at runtime, entirely outside the
installer's file list. Installing a new version overwrites application
files and leaves this content untouched.

## Uninstall

By default, uninstalling removes only the application files the installer
placed — `data\`, `logs\`, `temp\`, and `runtime-packs\` are **not** deleted,
and Inno Setup only removes the install directory itself if it ends up
empty (so it stays if any of that content remains).

The uninstaller then asks a separate, explicit question: whether to *also*
delete that saved data (history, database, uploaded cookies, downloaded
runtime packs). This is opt-in and irreversible — declining leaves
everything in place for a future reinstall.

## Signing

**Status: UNSIGNED.** There is no code-signing certificate configured for
this project. Windows SmartScreen will show an "unrecognized app" warning
on first run of both the installer and (for portables) the bundled
`yt-dlp.exe`/`ffmpeg.exe`. This is expected, not a build failure. Users can
proceed via "More info" → "Run anyway"; the SHA-256 checksums published with
every release let anyone verify the download matches what CI actually built.

Signing is a deliberate extension point, not implemented here: nothing in
`installer/windows/filestudio.iss` or the release workflow needs to change
structurally to add a `SignTool` step later — it would only require a
`[Setup] SignTool=...` directive plus a securely-stored certificate
(never committed to this repository).

## Building the installer locally

You need a Windows machine (or the GitHub Actions Windows runner — see
below); Inno Setup's compiler (`ISCC.exe`) does not run natively on Linux,
and this project does not use Wine as its build path.

```powershell
# 1. Build the portable ZIP (same script as always, unchanged)
pnpm build:portable:windows

# 2. Stage the installer payload from that ZIP (Git Bash / WSL)
bash scripts/build-windows-installer-staging.sh

# 3. Compile with Inno Setup (adjust the ISCC path to your install)
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" `
  /DAppVersion="0.2.0" /DBuildCommit="<full sha>" /DBuildCommitShort="<short sha>" `
  installer\windows\filestudio.iss
```

Output: `dist\release\Anclora-FileStudio-Setup-Windows-x64.exe`.

## GitHub Actions release pipeline

Workflow: `.github/workflows/release-filestudio.yml`.

Every artifact is built **from the tagged commit, on GitHub-hosted
runners** — the workflow never downloads anything from the Anclora VPS,
never talks to Caddy or `filestudio.dev.anclora.com`, and never reuses a
locally- or VPS-built ZIP as a release source. Each portable build's
`manifest.json` (`commitFull`) is checked against `GITHUB_SHA` before it's
allowed to flow into the release; a mismatch fails the workflow.

Jobs, in dependency order:

1. **validate** — `pnpm lint && pnpm typecheck && pnpm test && pnpm build` (same gates as `ci.yml`).
2. **build-linux-portable** / **build-windows-portable** — build the respective
   portable via the canonical `pnpm build:portable:*` scripts, run the
   canonical `verify-*` and `smoke-*` scripts, check provenance, upload as a
   workflow artifact.
3. **build-windows-setup** — downloads the Windows portable artifact from
   step 2 (never rebuilds it, never fetches it from elsewhere), stages it,
   installs Inno Setup via Chocolatey, compiles `filestudio.iss`, then runs
   a full install → launch → health-check → uninstall smoke test on the
   runner itself.
4. **package** — downloads all three artifacts, re-verifies provenance
   across all of them, generates `release-manifest.json` and
   `SHA256SUMS.txt` (`scripts/generate-release-manifest.mjs`), uploads the
   full bundle as a workflow artifact, and — **only if every prior job
   succeeded and `publish` is true** — creates the GitHub Release.

### Dry run (no public Release)

```
Actions → release-filestudio → Run workflow → publish: false (default)
```

This runs the entire pipeline — build, verify, smoke-test, package — and
uploads everything as a workflow artifact bundle (`release-bundle`,
30-day retention) for inspection, without creating a public Release or a
tag. Use this to validate a change before committing to a version.

### Publishing a real release

1. Confirm the version. `package.json`'s `version` field is the source of
   truth; there is no release tag yet as of this writing, so the first tag
   is a deliberate choice, not an assumption — see the diagnostic report
   this document accompanies for the suggested first version and why it's
   not created automatically.
2. Tag the approved commit and push the tag:
   ```
   git tag v0.2.0
   git push origin v0.2.0
   ```
   Pushing the tag is what triggers the workflow with `publish=true`
   automatically — no manual `workflow_dispatch` toggle needed for a real
   release.
3. Watch the Actions run. If any gate fails, no Release is created — fix
   the issue, delete the tag (`git push origin :refs/tags/vX.Y.Z && git tag -d vX.Y.Z`),
   and re-tag once the fix is in.

### Verifying a downloaded release asset

```bash
# Linux/macOS
sha256sum -c SHA256SUMS.txt

# Windows (PowerShell)
Get-FileHash .\Anclora-FileStudio-Setup-Windows-x64.exe -Algorithm SHA256
# compare against the matching line in SHA256SUMS.txt or release-manifest.json
```

### Permissions

The workflow requests `contents: read` at the top level and elevates only
the `package` job to `contents: write` (the only job that creates the
Release). It uses the Actions-provided `secrets.GITHUB_TOKEN` exclusively —
no personal access token is stored or required.

## Repository visibility

Creating a GitHub Release does not change repository visibility. If this
repository is private, release assets remain visible only to accounts with
read access to the repo — the workflow does not alter that.
