#!/usr/bin/env bash
# verify-macos-dmg.sh — Mounts and verifies the macOS release DMG.
# Fails with exit 1 on ANY issue. Always unmounts, even on failure.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DMG_PATH="$REPO_ROOT/dist/release/Anclora-FileStudio-macOS-arm64.dmg"
SHA_FILE="$DMG_PATH.sha256"

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'
PASS=0; FAIL=0
pass() { echo -e "${GREEN}[PASS]${NC} $1"; (( PASS++ )) || true; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; (( FAIL++ )) || true; }

echo ""
echo "=== Anclora FileStudio — macOS DMG Verification ==="
echo "Target: $DMG_PATH"
echo ""

[[ -f "$DMG_PATH" ]] || { echo -e "${RED}[FAIL]${NC} DMG not found: $DMG_PATH"; exit 1; }
[[ -f "$SHA_FILE" ]] || { echo -e "${RED}[FAIL]${NC} Checksum file not found: $SHA_FILE"; exit 1; }
pass "DMG exists: $(du -sh "$DMG_PATH" | awk '{print $1}')"

echo ""
echo "--- Checksum ---"
EXPECTED_SHA="$(awk '{print $1}' "$SHA_FILE")"
ACTUAL_SHA="$(shasum -a 256 "$DMG_PATH" | awk '{print $1}')"
[[ "$EXPECTED_SHA" == "$ACTUAL_SHA" ]] && pass "SHA-256 matches: $ACTUAL_SHA" || fail "SHA-256 mismatch (expected $EXPECTED_SHA, got $ACTUAL_SHA)"

echo ""
echo "--- Mount and inspect ---"
MOUNT_PLIST="$(mktemp)"
MOUNT_POINT=""
cleanup() {
  if [[ -n "$MOUNT_POINT" ]]; then
    hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
  fi
  rm -f "$MOUNT_PLIST"
}
trap cleanup EXIT

hdiutil attach "$DMG_PATH" -nobrowse -readonly -plist > "$MOUNT_PLIST" 2>/dev/null \
  || { fail "hdiutil attach failed"; echo "=============================="; echo "FAIL: $FAIL"; exit 1; }

MOUNT_POINT="$(python3 -c "
import plistlib
with open('$MOUNT_PLIST', 'rb') as f:
    data = plistlib.load(f)
for entity in data.get('system-entities', []):
    mp = entity.get('mount-point')
    if mp:
        print(mp)
        break
")"
[[ -n "$MOUNT_POINT" ]] && pass "DMG mounted at: $MOUNT_POINT" || fail "Could not determine mount point"

if [[ -n "$MOUNT_POINT" ]]; then
  APP_IN_DMG="$MOUNT_POINT/Anclora FileStudio.app"
  [[ -d "$APP_IN_DMG" ]] && pass "Anclora FileStudio.app present inside DMG" || fail "Anclora FileStudio.app missing inside DMG"

  [[ -f "$APP_IN_DMG/Contents/Info.plist" ]] && pass "App Info.plist present inside DMG" || fail "App Info.plist missing inside DMG"
  [[ -x "$APP_IN_DMG/Contents/Resources/payload/runtime/node" ]] && pass "Bundled Node runtime present and executable inside DMG" || fail "Bundled Node runtime missing/not executable inside DMG"

  if [[ -L "$MOUNT_POINT/Applications" ]]; then
    LINK_TARGET="$(readlink "$MOUNT_POINT/Applications")"
    [[ "$LINK_TARGET" == "/Applications" ]] && pass "Applications symlink present and points to /Applications" || fail "Applications symlink points to unexpected target: $LINK_TARGET"
  else
    fail "Applications symlink missing (needed for drag-to-install)"
  fi

  DEV_PATH_REGEX='(/Users/runner/|/Users/[^[:space:]"'"'"'<>]*/anclora|/home/[^[:space:]"'"'"'<>]*/anclora|/home/toni/)'
  DEV_PATH_FOUND="$(LC_ALL=C grep -IRnE "$DEV_PATH_REGEX" "$APP_IN_DMG" \
      --exclude-dir=data --exclude-dir=temp --exclude-dir=logs \
      --exclude="*.node" --exclude="*.icns" \
      2>/dev/null | head -20 || true)"
  if [[ -n "$DEV_PATH_FOUND" ]]; then
    echo "$DEV_PATH_FOUND"
    fail "Developer/runner workspace path found inside mounted DMG"
  else
    pass "No developer/runner workspace paths inside mounted DMG"
  fi

  echo ""
  echo "--- DMG App Code Signature & Integrity ---"
  if codesign --verify --deep --strict --verbose=4 "$APP_IN_DMG" >/dev/null 2>&1; then
    pass "Mounted app bundle signature valid (codesign --verify --deep --strict)"
  else
    fail "Mounted app bundle signature verification failed"
  fi

  [[ -f "$APP_IN_DMG/Contents/_CodeSignature/CodeResources" ]] \
    && pass "Mounted app Contents/_CodeSignature/CodeResources exists" \
    || fail "Mounted app Contents/_CodeSignature/CodeResources missing"

  DMG_EXTRACT_DIR="$(mktemp -d)"
  cp -a "$APP_IN_DMG" "$DMG_EXTRACT_DIR/"
  EXTRACTED_APP="$DMG_EXTRACT_DIR/Anclora FileStudio.app"

  echo ""
  echo "--- Extracted App Code Signature (Packaging Integrity) ---"
  if codesign --verify --deep --strict --verbose=4 "$EXTRACTED_APP" >/dev/null 2>&1; then
    pass "Extracted app bundle signature valid (packaging preserves signature)"
  else
    fail "Extracted app bundle signature verification failed"
  fi

  [[ -f "$EXTRACTED_APP/Contents/_CodeSignature/CodeResources" ]] \
    && pass "Extracted app Contents/_CodeSignature/CodeResources exists" \
    || fail "Extracted app Contents/_CodeSignature/CodeResources missing"

  EXTRACTED_CS="$(codesign -dv --verbose=4 "$EXTRACTED_APP" 2>&1 || true)"
  if echo "$EXTRACTED_CS" | grep -q "Identifier=com.anclora.filestudio"; then
    pass "Extracted app Identifier = com.anclora.filestudio"
  else
    fail "Extracted app Identifier mismatch"
  fi

  if echo "$EXTRACTED_CS" | grep -q "Info.plist=not bound"; then
    fail "Extracted app Info.plist is not bound"
  elif echo "$EXTRACTED_CS" | grep -qE "Info\.plist entries=[1-9]"; then
    pass "Extracted app Info.plist is bound"
  else
    fail "Extracted app Info.plist entries missing"
  fi

  if echo "$EXTRACTED_CS" | grep -q "Sealed Resources=none"; then
    fail "Extracted app Sealed Resources is none"
  elif echo "$EXTRACTED_CS" | grep -qE "Sealed Resources version="; then
    pass "Extracted app Sealed Resources present"
  else
    fail "Extracted app Sealed Resources missing"
  fi

  rm -rf "$DMG_EXTRACT_DIR"
fi

echo ""
echo "=============================="
echo " Verification Summary"
echo "=============================="
echo -e " ${GREEN}PASS${NC}: $PASS"
echo -e " ${RED}FAIL${NC}: $FAIL"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "${RED}VERIFICATION FAILED${NC} — $FAIL check(s) failed"
  exit 1
else
  echo -e "${GREEN}VERIFICATION PASSED${NC} — DMG is valid"
  exit 0
fi
