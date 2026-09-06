#!/usr/bin/env bash
# build-macos-dmg.sh — Packages the already-built "Anclora FileStudio.app"
# into a distributable, drag-to-install DMG using only standard macOS
# tooling (hdiutil) — no external DMG-authoring dependency.
#
# Output:
#   dist/release/Anclora-FileStudio-macOS-arm64.dmg
#   dist/release/Anclora-FileStudio-macOS-arm64.dmg.sha256
#
# Usage: bash scripts/build-macos-dmg.sh
# Requires: dist/macos/app-staging/Anclora FileStudio.app already built
#           (bash scripts/build-macos-app.sh)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
die()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

echo "=== Anclora FileStudio — macOS DMG build ==="

[[ "$(uname -s)" == "Darwin" ]] || die "This script must run on macOS (got: $(uname -s))"
command -v hdiutil >/dev/null 2>&1 || die "hdiutil not found (standard macOS tool — unexpected)"

APP_DIR="$REPO_ROOT/dist/macos/app-staging/Anclora FileStudio.app"
[[ -d "$APP_DIR" ]] || die "App bundle not found: $APP_DIR — run scripts/build-macos-app.sh first"

OUT_DIR="$REPO_ROOT/dist/release"
DMG_NAME="Anclora-FileStudio-macOS-arm64.dmg"
DMG_PATH="$OUT_DIR/$DMG_NAME"
mkdir -p "$OUT_DIR"
rm -f "$DMG_PATH" "$DMG_PATH.sha256"

info "Staging DMG contents..."
DMG_STAGING="$(mktemp -d)"
trap 'rm -rf "$DMG_STAGING"' EXIT
cp -a "$APP_DIR" "$DMG_STAGING/"
# Visual drag-to-install target: a symlink to /Applications, resolved fresh
# by the OS on the user's machine — not a copy of the runner's /Applications.
ln -s /Applications "$DMG_STAGING/Applications"

info "Building DMG (hdiutil create -format UDZO)..."
hdiutil create \
  -volname "Anclora FileStudio" \
  -srcfolder "$DMG_STAGING" \
  -fs HFS+ \
  -format UDZO \
  -ov \
  "$DMG_PATH" \
  || die "hdiutil create failed"

[[ -f "$DMG_PATH" ]] || die "DMG was not created: $DMG_PATH"

SHA="$(shasum -a 256 "$DMG_PATH" | awk '{print $1}')"
echo "$SHA  $(basename "$DMG_PATH")" > "$DMG_PATH.sha256"

SIZE="$(du -sh "$DMG_PATH" | awk '{print $1}')"

echo ""
ok "=== DMG build complete ==="
ok "Package : $DMG_PATH"
ok "Size    : $SIZE"
ok "SHA-256 : $SHA"
ok "Verify  : shasum -a 256 -c $DMG_PATH.sha256"
