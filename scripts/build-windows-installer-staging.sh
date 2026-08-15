#!/usr/bin/env bash
# =============================================================================
# build-windows-installer-staging.sh
# Extracts the ALREADY-BUILT Windows portable ZIP into a clean staging
# directory for Inno Setup. Does NOT rebuild FileStudio — the portable ZIP
# is the single source of truth for the installer payload.
# Runs on Linux (validation/dry-run) and on the Windows CI runner (via
# `shell: bash`, using the Git Bash bundled with windows-latest).
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_ZIP="${1:-$REPO_ROOT/dist/windows/Anclora-FileStudio-Windows-x64-Core.zip}"
# Staging path must stay SHORT on Windows: ISCC opens source files by their
# literal (unresolved) path, and deep .next/node_modules payloads otherwise
# exceed MAX_PATH (260). CI overrides this with %RUNNER_TEMP%-based paths.
STAGING_BASE="${ANCLORA_INSTALLER_STAGING_BASE:-$REPO_ROOT/dist/installer-staging/windows}"
PACKAGE_NAME="Anclora-FileStudio-Windows-x64-Core"
STAGING_DIR="$STAGING_BASE/$PACKAGE_NAME"

[[ -f "$SOURCE_ZIP" ]] || die "Portable ZIP not found: $SOURCE_ZIP (build it first — this script does NOT rebuild it)"

# Windows Git Bash bundles a Windows-native python3 that cannot resolve
# MSYS-style /d/a/... paths — convert when cygpath is available.
to_python_path() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1"
  else
    printf '%s' "$1"
  fi
}

info "Source ZIP: $SOURCE_ZIP"
info "Staging dir: $STAGING_DIR"

# ── Clean staging (dedicated dist/ subdirectory only — never touches source) ─
if [[ -d "$STAGING_BASE" ]]; then
  info "Removing previous staging..."
  rm -rf -- "$STAGING_BASE"
fi
mkdir -p "$STAGING_BASE"

# ── Extract ────────────────────────────────────────────────────────────────
info "Extracting portable ZIP..."
if command -v unzip >/dev/null 2>&1; then
  unzip -q "$SOURCE_ZIP" -d "$STAGING_BASE"
else
  # Windows Git Bash / PowerShell fallback path
  python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$(to_python_path "$SOURCE_ZIP")" "$(to_python_path "$STAGING_BASE")"
fi
[[ -d "$STAGING_DIR" ]] || die "Extraction did not produce expected folder: $STAGING_DIR"
ok "Extracted"

# ── Validate expected payload ────────────────────────────────────────────────
info "Validating staged payload..."

REQUIRED_PATHS=(
  "INICIAR_ANCLORA_FILESTUDIO.bat"
  "INICIAR_ANCLORA_FILESTUDIO_SILENCIOSO.vbs"
  "CERRAR_ANCLORA_FILESTUDIO.bat"
  "DIAGNOSTICO_ANCLORA_FILESTUDIO.bat"
  "manifest.json"
  "runtime/node.exe"
  "app/server.js"
  "app/.next"
  "internal/start-anclora-filestudio.ps1"
  "internal/stop-anclora-filestudio.ps1"
)
for rel in "${REQUIRED_PATHS[@]}"; do
  [[ -e "$STAGING_DIR/$rel" ]] || die "Missing required path in staged payload: $rel"
done
ok "Launcher, manifest, and Next.js runtime present"

# No unexpected runtime state leaking in from a dev machine
UNWANTED_FOUND=0
while IFS= read -r -d '' f; do
  warn "Unexpected runtime-state file in payload: ${f#"$STAGING_DIR"/}"
  UNWANTED_FOUND=1
done < <(find "$STAGING_DIR" \( -name "*.sqlite" -o -name "*.sqlite-wal" -o -name "*.sqlite-shm" -o -name "*.pid" -o -name "*.port" \) -print0)
[[ "$UNWANTED_FOUND" -eq 0 ]] || die "Staged payload contains runtime state that should never ship — aborting"
ok "No stray SQLite/WAL/SHM/PID/port files"

# No nested build artifacts (a stale .git or this repo's own top-level
# dist/{windows,linux} accidentally bundled). node_modules/*/dist is normal
# npm package output and is NOT checked here.
if find "$STAGING_DIR" -iname ".git" -maxdepth 3 | grep -q .; then
  die "Staged payload contains a .git directory — aborting"
fi
if find "$STAGING_DIR" -type d \( -path "*/dist/windows" -o -path "*/dist/linux" \) | grep -q .; then
  die "Staged payload contains this repo's own dist/windows or dist/linux nested inside it — aborting"
fi
ok "No nested .git or repo-dist artifacts"

MANIFEST_COMMIT="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['commitFull'])" "$(to_python_path "$STAGING_DIR/manifest.json")")"
info "Staged manifest commitFull: $MANIFEST_COMMIT"

echo "$STAGING_DIR"
