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
  osascript -e "display alert \"Anclora FileStudio\" message \"$1\" as ${2:-critical} giving up after 15" >/dev/null 2>&1 || true
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

LAUNCHER_LOG="$LOG_DIR/launcher.log"
echo "=== Anclora FileStudio Launcher $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" >> "$LAUNCHER_LOG"
echo "Launcher PID: $$ | PPID: $PPID" >> "$LAUNCHER_LOG"
echo "Bundle Contents: $CONTENTS_DIR" >> "$LAUNCHER_LOG"
echo "Node Binary: $NODE" >> "$LAUNCHER_LOG"

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
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  OLD_PORT="$(cat "$PORT_FILE" 2>/dev/null || true)"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    if [[ -n "$OLD_PORT" ]] && curl -sf --connect-timeout 1 --max-time 2 "http://127.0.0.1:$OLD_PORT/api/health" >/dev/null 2>&1; then
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Existing healthy instance detected (PID $OLD_PID, port $OLD_PORT). Relaunching browser." >> "$LAUNCHER_LOG"
      if [[ "${ANCLORA_FILESTUDIO_SKIP_BROWSER:-}" != "1" ]]; then
        open "http://127.0.0.1:$OLD_PORT" 2>/dev/null || true
      fi
      exit 0
    fi
  fi
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Cleaning up stale PID/port file (PID: ${OLD_PID:-<none>}, port: ${OLD_PORT:-<none>})" >> "$LAUNCHER_LOG"
  rm -f "$PID_FILE" "$PORT_FILE"
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
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Spawned Node.js server (PID: $APP_PID) on port $PORT" >> "$LAUNCHER_LOG"

# Clean lifecycle management: terminate child process on exit or signal
cleanup() {
  trap - SIGTERM SIGINT SIGHUP EXIT
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Cleanup triggered for launcher PID $$ (child PID: ${APP_PID:-none})" >> "$LAUNCHER_LOG"
  if [[ -n "${APP_PID:-}" ]] && kill -0 "$APP_PID" 2>/dev/null; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Sending SIGTERM to Node server (PID $APP_PID)..." >> "$LAUNCHER_LOG"
    kill -TERM "$APP_PID" 2>/dev/null || true
    for _ in $(seq 1 15); do
      kill -0 "$APP_PID" 2>/dev/null || break
      sleep 0.2
    done
    if kill -0 "$APP_PID" 2>/dev/null; then
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Sending SIGKILL to stubborn Node server (PID $APP_PID)..." >> "$LAUNCHER_LOG"
      kill -9 "$APP_PID" 2>/dev/null || true
    fi
  fi
  rm -f "$PID_FILE" "$PORT_FILE"
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Cleanup finished." >> "$LAUNCHER_LOG"
}
trap cleanup SIGTERM SIGINT SIGHUP EXIT

# Poll health endpoint with early crash detection
READY=0
for attempt in $(seq 1 45); do
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Node server process $APP_PID exited unexpectedly during startup" >> "$LAUNCHER_LOG"
    break
  fi
  if curl -sf --connect-timeout 1 --max-time 2 "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    READY=1
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Healthcheck passed on attempt $attempt (port $PORT)" >> "$LAUNCHER_LOG"
    break
  fi
  sleep 1
done

if [[ "$READY" -ne 1 ]]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: Application failed to respond within timeout on port $PORT" >> "$LAUNCHER_LOG"
  if [[ -f "$LOG_DIR/app.log" ]]; then
    echo "--- Last 20 lines of app.log ---" >> "$LAUNCHER_LOG"
    tail -n 20 "$LOG_DIR/app.log" >> "$LAUNCHER_LOG" 2>&1 || true
  fi
  alert "La aplicación tardó demasiado en responder. Revisa el registro en ~/Library/Application Support/Anclora/FileStudio/logs/app.log" warning
  exit 1
fi

if [[ "${ANCLORA_FILESTUDIO_SKIP_BROWSER:-}" != "1" ]]; then
  open "http://127.0.0.1:$PORT" 2>/dev/null || true
fi

# Hold launcher process alive to maintain Dock presence and lifecycle control
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Master launcher active. Waiting on Node server (PID $APP_PID)..." >> "$LAUNCHER_LOG"
wait "$APP_PID" || true
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Node server has terminated. Exiting launcher." >> "$LAUNCHER_LOG"
exit 0
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

# ── Sign the entire .app bundle (Steps 9-12) ─────────────────────────────────
# Finalize all bundle contents above before signing; do NOT modify bundle after this.
SIGNING_IDENTITY="${MACOS_SIGNING_IDENTITY:-${APPLE_SIGNING_IDENTITY:--}}"
info "Signing entire .app bundle with identity: '$SIGNING_IDENTITY'..."

SIGN_ARGS=("--force" "--deep" "--sign" "$SIGNING_IDENTITY")
if [[ "$SIGNING_IDENTITY" != "-" ]]; then
  SIGN_ARGS+=("--options" "runtime" "--timestamp")
fi

# Step 9a: Sign all nested Mach-O binaries inside-out
info "Signing nested Mach-O libraries and executables inside-out..."
while IFS= read -r bin; do
  if file "$bin" | grep -q "Mach-O"; then
    codesign "${SIGN_ARGS[@]}" "$bin" || die "Failed to sign nested Mach-O binary: $bin"
  fi
done < <(find "$APP_DIR" -type f \( -name "*.dylib" -o -name "*.node" -o -path "*/runtime/node" -o -path "*/MacOS/*" \))
ok "Nested Mach-O binaries signed"

# Step 9b: codesign --force --deep --sign - "$APP"
info "Signing top-level .app bundle..."
codesign "${SIGN_ARGS[@]}" "$APP_DIR" || die "codesign failed for $APP_DIR"
ok "codesign completed successfully"

# Step 10: codesign --verify --deep --strict --verbose=4 "$APP"
info "Validating code signature (deep, strict)..."
codesign --verify --deep --strict --verbose=4 "$APP_DIR" \
  || die "codesign --verify failed for $APP_DIR"
ok "Signature valid on disk and satisfies designated requirement"

# Verify runtime/node is explicitly signed
NODE_CS="$(codesign -dv "$PAYLOAD_DIR/runtime/node" 2>&1)"
if [[ "$SIGNING_IDENTITY" == "-" ]]; then
  echo "$NODE_CS" | grep -q "Signature=adhoc" || die "runtime/node signature is not adhoc"
fi
ok "runtime/node signature verified"

# Step 11: verify $APP/Contents/_CodeSignature/CodeResources exists
CODE_RESOURCES="$CONTENTS_DIR/_CodeSignature/CodeResources"
[[ -f "$CODE_RESOURCES" ]] || die "Missing code signature resource: $CODE_RESOURCES"
ok "Contents/_CodeSignature/CodeResources exists ($(stat -f%z "$CODE_RESOURCES" 2>/dev/null || stat -c%s "$CODE_RESOURCES") bytes)"

# Step 12: codesign -dv --verbose=4 "$APP" and enforce bundle properties
CODESIGN_DETAILS="$(codesign -dv --verbose=4 "$APP_DIR" 2>&1)"
echo "$CODESIGN_DETAILS"

echo "$CODESIGN_DETAILS" | grep -q "Identifier=com.anclora.filestudio" \
  || die "codesign check failed: Identifier is not 'com.anclora.filestudio'"
ok "codesign Identifier = com.anclora.filestudio"

if echo "$CODESIGN_DETAILS" | grep -q "Info.plist=not bound"; then
  die "codesign check failed: Info.plist is not bound"
fi
echo "$CODESIGN_DETAILS" | grep -qE "Info\.plist entries=[1-9]" \
  || die "codesign check failed: Info.plist entries not bound"
ok "codesign Info.plist is bound"

if echo "$CODESIGN_DETAILS" | grep -q "Sealed Resources=none"; then
  die "codesign check failed: Sealed Resources is none"
fi
echo "$CODESIGN_DETAILS" | grep -qE "Sealed Resources version=" \
  || die "codesign check failed: Sealed Resources missing"
ok "codesign Sealed Resources present"

echo ""
ok "=== App bundle build complete ==="
ok "Bundle : $APP_DIR"
ok "Icon   : $ICON_STATUS"
ok "Signature: VALID (com.anclora.filestudio)"

