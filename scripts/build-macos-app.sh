#!/usr/bin/env bash
# build-macos-app.sh — Wraps the already-built macOS arm64 portable into a
# Finder-launchable "Anclora FileStudio.app" bundle.
#
# This does NOT rebuild the Next.js app, re-fetch the Node.js runtime, or
# re-resolve native modules — it repackages the EXACT payload of the already
# built + verified portable ZIP (dist/macos/Anclora-FileStudio-macOS-arm64.zip)
# unmodified under Contents/Resources/payload/, exactly like
# build-windows-installer-staging.sh repackages the Windows portable ZIP for
# the Inno Setup installer. Only the .app chrome (Info.plist, launcher,
# icon) is new.
#
# Does NOT modify Git state. Does NOT push. Does NOT require sudo.
#
# Usage: bash scripts/build-macos-app.sh
# Requires: dist/macos/Anclora-FileStudio-macOS-arm64.zip already built
#           (bash scripts/build-macos-portable.sh)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

echo "=== Anclora FileStudio — macOS .app bundle build ==="

[[ "$(uname -s)" == "Darwin" ]] || die "This script must run on macOS (got: $(uname -s))"

PORTABLE_ZIP="$REPO_ROOT/dist/macos/Anclora-FileStudio-macOS-arm64.zip"
[[ -f "$PORTABLE_ZIP" ]] || die "Portable ZIP not found: $PORTABLE_ZIP — run scripts/build-macos-portable.sh first"

APP_STAGING="$REPO_ROOT/dist/macos/app-staging"
APP_NAME="Anclora FileStudio.app"
APP_DIR="$APP_STAGING/$APP_NAME"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
PAYLOAD_DIR="$RESOURCES_DIR/payload"
# LaunchServices is more reliable when CFBundleExecutable is a simple token
# without spaces, while the bundle's user-facing name remains unchanged.
EXEC_NAME="AncloraFileStudio"

# ── Version / commit (same derivation as the Windows installer) ─────────────
if [[ -n "${GITHUB_REF:-}" && "$GITHUB_REF" == refs/tags/v* ]]; then
  APP_VERSION="${GITHUB_REF#refs/tags/v}"
else
  APP_VERSION="$(node -p "require('$REPO_ROOT/package.json').version" 2>/dev/null || echo "0.0.0")"
fi
GIT_COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo "unknown")"
GIT_COMMIT_SHORT="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
info "Version: $APP_VERSION | Commit: $GIT_COMMIT_SHORT"

# ── Extract portable payload verbatim ────────────────────────────────────────
info "Extracting portable payload from $PORTABLE_ZIP..."
rm -rf "$APP_STAGING"
mkdir -p "$MACOS_DIR" "$PAYLOAD_DIR"

EXTRACT_TMP="$(mktemp -d)"
trap 'rm -rf "$EXTRACT_TMP"' EXIT
unzip -q "$PORTABLE_ZIP" -d "$EXTRACT_TMP"
PAYLOAD_SRC="$EXTRACT_TMP/Anclora-FileStudio-macOS-arm64"
[[ -d "$PAYLOAD_SRC" ]] || die "Unexpected portable ZIP layout: $PAYLOAD_SRC not found"

cp -a "$PAYLOAD_SRC/." "$PAYLOAD_DIR/"
ok "Payload copied unmodified into Contents/Resources/payload/"

[[ -x "$PAYLOAD_DIR/runtime/node" ]] || die "Bundled Node.js missing or not executable in payload"
[[ -f "$PAYLOAD_DIR/app/server.js" ]] || die "app/server.js missing in payload"
[[ -f "$PAYLOAD_DIR/manifest.json" ]] || die "manifest.json missing in payload"

# ── Icon (reuse the existing FileStudio brand asset — do not invent a new one) ─
ICON_SRC="$REPO_ROOT/public/brand/anclora-filestudio.png"
ICON_STATUS="ICON_MISSING"
if [[ -f "$ICON_SRC" ]] && command -v sips >/dev/null 2>&1 && command -v iconutil >/dev/null 2>&1; then
  info "Generating AppIcon.icns from $ICON_SRC..."
  ICONSET_PARENT="$(mktemp -d)"
  ICONSET="$ICONSET_PARENT/AppIcon.iconset"
  mkdir -p "$ICONSET"
  for size in 16 32 128 256 512; do
    sips -z "$size" "$size" "$ICON_SRC" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null 2>&1 \
      || die "sips failed to generate ${size}x${size} icon"
    double=$((size * 2))
    sips -z "$double" "$double" "$ICON_SRC" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null 2>&1 \
      || die "sips failed to generate ${size}x${size}@2x icon"
  done
  if iconutil -c icns "$ICONSET" -o "$RESOURCES_DIR/AppIcon.icns"; then
    ICON_STATUS="OK"
    ok "AppIcon.icns generated from official FileStudio brand asset"
  else
    # Some macOS runner images ship an iconutil that rejects iconsets even
    # when all required PNG sizes and names are valid. The icon is optional
    # for a functional .app, so keep the bundle build portable and explicit.
    rm -f "$RESOURCES_DIR/AppIcon.icns"
    ICON_STATUS="ICON_MISSING"
    warn "iconutil rejected the generated iconset — continuing without AppIcon.icns"
  fi
  rm -rf "$ICONSET_PARENT"
else
  warn "ICON_MISSING: no source icon at $ICON_SRC, or sips/iconutil unavailable — building without AppIcon.icns"
fi

# ── Contents/MacOS/<executable> — the Finder double-click entrypoint ────────
# LaunchServices requires the bundle executable to be native; keep the
# relocatable runtime logic in a companion script and use a tiny native shim.
info "Writing launcher (Contents/MacOS/$EXEC_NAME)..."
LAUNCHER_SCRIPT="$MACOS_DIR/${EXEC_NAME}-launcher.sh"
cat > "$LAUNCHER_SCRIPT" << 'LAUNCHER'
#!/usr/bin/env bash
# Anclora FileStudio.app launcher.
# Resolves the bundle's own real location at run time (works from
# /Applications, ~/Desktop, a mounted DMG, or any other path) — never a
# build-time or runner-specific absolute path.
set -euo pipefail

CONTENTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
PAYLOAD_DIR="$RESOURCES_DIR/payload"
NODE="$PAYLOAD_DIR/runtime/node"

alert() {
  osascript -e "display alert \"Anclora FileStudio\" message \"$1\" as ${2:-critical}" >/dev/null 2>&1 || true
}

if [[ ! -x "$NODE" ]]; then
  alert "No se encontró el runtime incluido en la aplicación. Reinstala Anclora FileStudio."
  exit 1
fi

# Persistent data lives outside the (relocatable, potentially read-only)
# bundle, under the standard per-user Application Support directory — the
# same convention already used by the runtime-packs manager for macOS.
APP_SUPPORT="$HOME/Library/Application Support/Anclora/FileStudio"
DATA_DIR="$APP_SUPPORT/data"
TEMP_DIR="$APP_SUPPORT/temp"
LOG_DIR="$APP_SUPPORT/logs"
mkdir -p "$DATA_DIR" "$TEMP_DIR" "$LOG_DIR"

export ANCLORA_FILESTUDIO_DATA_DIR="$DATA_DIR"
export ANCLORA_FILESTUDIO_TEMP_DIR="$TEMP_DIR"
export ANCLORA_FILESTUDIO_LOG_DIR="$LOG_DIR"
export ANCLORA_FILESTUDIO_TOOLS_DIR="$PAYLOAD_DIR/tools"
export ANCLORA_FILESTUDIO_NODE_PATH="$NODE"
export NODE_ENV="production"

# A Finder/LaunchServices-launched process does not necessarily inherit an
# interactive shell's PATH (e.g. Homebrew's eval "$(brew shellenv)" in
# ~/.zprofile never runs). FileStudio's own external-tool resolver
# (src/lib/binary-resolution.ts) already searches these directories
# directly; this just gives spawned helper shells the same visibility.
if [[ -d "/opt/homebrew/bin" ]]; then
  export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$PATH"
fi

PID_FILE="$APP_SUPPORT/anclora-filestudio.pid"
PORT_FILE="$DATA_DIR/anclora-filestudio.port"

# Reuse an already-running instance instead of starting a second one.
if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE")"
  if kill -0 "$OLD_PID" 2>/dev/null; then
    if [[ -f "$PORT_FILE" ]]; then
      open "http://127.0.0.1:$(cat "$PORT_FILE")" 2>/dev/null || true
    fi
    exit 0
  fi
  rm -f "$PID_FILE"
fi

if [[ -z "${ANCLORA_FILESTUDIO_PORT:-}" ]]; then
  for p in 3847 3848 3849 3850 3851 3852 3853 3854 3855 3856 3857; do
    if ! lsof -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
      ANCLORA_FILESTUDIO_PORT="$p"
      break
    fi
  done
  : "${ANCLORA_FILESTUDIO_PORT:=3847}"
fi
export PORT="$ANCLORA_FILESTUDIO_PORT"
export HOSTNAME="127.0.0.1"

cd "$PAYLOAD_DIR/app"
"$NODE" server.js >> "$LOG_DIR/app.log" 2>&1 &
APP_PID="$!"
echo "$APP_PID" > "$PID_FILE"
echo "$PORT" > "$PORT_FILE"

for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    if [[ "${ANCLORA_FILESTUDIO_SKIP_BROWSER:-}" != "1" ]]; then
      open "http://127.0.0.1:$PORT" 2>/dev/null || true
    fi
    exit 0
  fi
  kill -0 "$APP_PID" 2>/dev/null || break
  sleep 1
done

alert "La aplicación tardó demasiado en responder. Revisa el registro en ~/Library/Application Support/Anclora/FileStudio/logs/app.log" warning
exit 1
LAUNCHER
chmod +x "$LAUNCHER_SCRIPT"

command -v clang >/dev/null 2>&1 || die "clang is required to build the native macOS launcher"
LAUNCHER_C="$EXTRACT_TMP/${EXEC_NAME}.c"
cat > "$LAUNCHER_C" << 'LAUNCHER_C_SOURCE'
#include <limits.h>
#include <mach-o/dyld.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

extern char **environ;

int main(void) {
  char executable[PATH_MAX];
  uint32_t size = (uint32_t)sizeof(executable);
  if (_NSGetExecutablePath(executable, &size) != 0) {
    fputs("Unable to resolve the FileStudio launcher path\n", stderr);
    return 1;
  }

  char resolved[PATH_MAX];
  if (realpath(executable, resolved) == NULL) {
    perror("realpath");
    return 1;
  }

  char *separator = strrchr(resolved, '/');
  if (separator == NULL) {
    fputs("Invalid FileStudio launcher path\n", stderr);
  return 1;
  }
  *separator = '\0';

  char script[PATH_MAX];
  int written = snprintf(script, sizeof(script), "%s/AncloraFileStudio-launcher.sh", resolved);
  if (written < 0 || (size_t)written >= sizeof(script)) {
    fputs("FileStudio launcher path is too long\n", stderr);
    return 1;
  }

  char *bash_argv[] = {"/bin/bash", script, NULL};
  execve("/bin/bash", bash_argv, environ);
  perror("execve");
  return 1;
}
LAUNCHER_C_SOURCE
clang -O2 -Wall -Wextra -o "$MACOS_DIR/$EXEC_NAME" "$LAUNCHER_C" \
  || die "clang failed to build the native macOS launcher"
chmod +x "$MACOS_DIR/$EXEC_NAME"
ok "Native launcher written and made executable"

# ── Info.plist ────────────────────────────────────────────────────────────────
info "Writing Info.plist..."
ICON_KEY=""
if [[ "$ICON_STATUS" == "OK" ]]; then
  ICON_KEY="  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
"
fi
cat > "$CONTENTS_DIR/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>Anclora FileStudio</string>
  <key>CFBundleDisplayName</key>
  <string>Anclora FileStudio</string>
  <key>CFBundleIdentifier</key>
  <string>com.anclora.filestudio</string>
  <key>CFBundleVersion</key>
  <string>${APP_VERSION}</string>
  <key>CFBundleShortVersionString</key>
  <string>${APP_VERSION}</string>
  <key>CFBundleExecutable</key>
  <string>${EXEC_NAME}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
${ICON_KEY}  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>LSApplicationCategoryType</key>
  <string>public.app-category.productivity</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>NSHumanReadableCopyright</key>
  <string>Anclora FileStudio</string>
</dict>
</plist>
PLIST
plutil -lint "$CONTENTS_DIR/Info.plist" >/dev/null || die "Info.plist failed plutil -lint"
ok "Info.plist written and valid"

printf 'APPL????' > "$CONTENTS_DIR/PkgInfo"

# ── Build-time provenance record for verify-macos-app.sh ────────────────────
cat > "$RESOURCES_DIR/app-build-info.json" << EOF
{
  "version": "${APP_VERSION}",
  "commitFull": "${GIT_COMMIT}",
  "commitShort": "${GIT_COMMIT_SHORT}",
  "iconStatus": "${ICON_STATUS}",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# ── Verify no developer/runner absolute paths leaked into the bundle ────────
info "Checking for developer/runner path leakage..."
DEV_PATH_REGEX='(/Users/runner/|/Users/[^[:space:]"'"'"'<>]*/anclora|/home/[^[:space:]"'"'"'<>]*/anclora|/home/toni/)'
DEV_PATH_FOUND="$(LC_ALL=C grep -IRnE "$DEV_PATH_REGEX" "$APP_DIR" \
    --exclude-dir=data --exclude-dir=temp --exclude-dir=logs \
    --exclude="*.node" --exclude="*.icns" \
    2>/dev/null | head -20 || true)"
if [[ -n "$DEV_PATH_FOUND" ]]; then
  echo "$DEV_PATH_FOUND"
  die "Developer/runner workspace path found in .app bundle"
fi
ok "No developer/runner workspace paths found in .app bundle"

echo ""
ok "=== App bundle build complete ==="
ok "Bundle : $APP_DIR"
ok "Icon   : $ICON_STATUS"
