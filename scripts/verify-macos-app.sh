#!/usr/bin/env bash
# verify-macos-app.sh — Structural and integrity verification of the
# "Anclora FileStudio.app" bundle. Fails with exit 1 on ANY issue.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$REPO_ROOT/dist/macos/app-staging/Anclora FileStudio.app"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
PASS=0; FAIL=0; WARN_COUNT=0

pass() { echo -e "${GREEN}[PASS]${NC} $1"; (( PASS++ )) || true; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; (( FAIL++ )) || true; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; (( WARN_COUNT++ )) || true; }

echo ""
echo "=== Anclora FileStudio — macOS .app Verification ==="
echo "Target: $APP_DIR"
echo ""

[[ -d "$APP_DIR" ]] || { echo -e "${RED}[FAIL]${NC} App bundle not found: $APP_DIR"; exit 1; }
pass "App bundle directory exists"

CONTENTS_DIR="$APP_DIR/Contents"
INFO_PLIST="$CONTENTS_DIR/Info.plist"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
PAYLOAD_DIR="$RESOURCES_DIR/payload"

echo ""
echo "--- 1. Bundle structure ---"
for d in "$CONTENTS_DIR" "$MACOS_DIR" "$RESOURCES_DIR" "$PAYLOAD_DIR"; do
  [[ -d "$d" ]] && pass "dir: ${d#"$APP_DIR"/}" || fail "Missing dir: ${d#"$APP_DIR"/}"
done
[[ -f "$INFO_PLIST" ]] && pass "Contents/Info.plist exists" || fail "Contents/Info.plist missing"

echo ""
echo "--- 2. Info.plist ---"
if [[ -f "$INFO_PLIST" ]]; then
  if plutil -lint "$INFO_PLIST" >/dev/null 2>&1; then
    pass "Info.plist is valid plist XML"
  else
    fail "Info.plist failed plutil -lint"
  fi

  plist_value() { /usr/libexec/PlistBuddy -c "Print :$1" "$INFO_PLIST" 2>/dev/null || true; }

  BUNDLE_NAME="$(plist_value CFBundleName)"
  [[ "$BUNDLE_NAME" == "Anclora FileStudio" ]] && pass "CFBundleName = Anclora FileStudio" || fail "CFBundleName unexpected: '$BUNDLE_NAME'"

  BUNDLE_ID="$(plist_value CFBundleIdentifier)"
  [[ "$BUNDLE_ID" == "com.anclora.filestudio" ]] && pass "CFBundleIdentifier = com.anclora.filestudio" || fail "CFBundleIdentifier unexpected: '$BUNDLE_ID'"

  BUNDLE_EXEC="$(plist_value CFBundleExecutable)"
  if [[ -n "$BUNDLE_EXEC" ]]; then
    pass "CFBundleExecutable = $BUNDLE_EXEC"
    if [[ -f "$MACOS_DIR/$BUNDLE_EXEC" ]]; then
      pass "CFBundleExecutable file exists in Contents/MacOS"
      [[ -x "$MACOS_DIR/$BUNDLE_EXEC" ]] && pass "CFBundleExecutable is executable" || fail "CFBundleExecutable is NOT executable"
    else
      fail "CFBundleExecutable file missing: Contents/MacOS/$BUNDLE_EXEC"
    fi
  else
    fail "CFBundleExecutable is empty"
  fi

  BUNDLE_VERSION="$(plist_value CFBundleVersion)"
  [[ -n "$BUNDLE_VERSION" ]] && pass "CFBundleVersion: $BUNDLE_VERSION" || fail "CFBundleVersion is empty"

  BUNDLE_SHORT_VERSION="$(plist_value CFBundleShortVersionString)"
  [[ -n "$BUNDLE_SHORT_VERSION" ]] && pass "CFBundleShortVersionString: $BUNDLE_SHORT_VERSION" || fail "CFBundleShortVersionString is empty"

  BUNDLE_PKG_TYPE="$(plist_value CFBundlePackageType)"
  [[ "$BUNDLE_PKG_TYPE" == "APPL" ]] && pass "CFBundlePackageType = APPL" || fail "CFBundlePackageType unexpected: '$BUNDLE_PKG_TYPE'"
else
  fail "Cannot check plist keys — Info.plist missing"
fi

echo ""
echo "--- 3. Icon ---"
if [[ -f "$RESOURCES_DIR/AppIcon.icns" ]]; then
  pass "AppIcon.icns present"
  file "$RESOURCES_DIR/AppIcon.icns" | grep -qi "icon" && pass "AppIcon.icns has valid icns magic" || warn "AppIcon.icns file type unexpected"
else
  warn "AppIcon.icns missing (ICON_MISSING at build time — not a release blocker)"
fi

echo ""
echo "--- 4. Payload ---"
for f in "app/server.js" "runtime/node" "manifest.json"; do
  [[ -e "$PAYLOAD_DIR/$f" ]] && pass "payload/$f exists" || fail "Missing payload/$f"
done

NODE_BIN="$PAYLOAD_DIR/runtime/node"
if [[ -x "$NODE_BIN" ]]; then
  pass "payload/runtime/node is executable"
  if file "$NODE_BIN" | grep -qE "Mach-O.*arm64|ARM64"; then
    pass "payload/runtime/node is Mach-O arm64"
  else
    fail "payload/runtime/node is NOT Mach-O arm64"
  fi
else
  fail "payload/runtime/node missing or not executable"
fi

echo ""
echo "--- 5. Provenance ---"
MANIFEST="$PAYLOAD_DIR/manifest.json"
if [[ -f "$MANIFEST" ]]; then
  COMMIT_FULL="$(python3 -c "import json; print(json.load(open('$MANIFEST')).get('commitFull',''))" 2>/dev/null || echo '')"
  [[ -n "$COMMIT_FULL" ]] && pass "manifest.commitFull: $COMMIT_FULL" || fail "manifest.commitFull is empty"
  if [[ -n "${GITHUB_SHA:-}" ]]; then
    [[ "$COMMIT_FULL" == "$GITHUB_SHA" ]] && pass "manifest.commitFull matches GITHUB_SHA" || fail "manifest.commitFull ($COMMIT_FULL) != GITHUB_SHA ($GITHUB_SHA)"
  fi
  PLATFORM="$(python3 -c "import json; print(json.load(open('$MANIFEST')).get('platform',''))" 2>/dev/null || echo '')"
  [[ "$PLATFORM" == "darwin" ]] && pass "manifest.platform = darwin" || fail "manifest.platform unexpected: '$PLATFORM'"
  ARCH="$(python3 -c "import json; print(json.load(open('$MANIFEST')).get('arch',''))" 2>/dev/null || echo '')"
  [[ "$ARCH" == "arm64" ]] && pass "manifest.arch = arm64" || fail "manifest.arch unexpected: '$ARCH'"
else
  fail "payload/manifest.json missing — cannot verify provenance"
fi

BUILD_INFO="$RESOURCES_DIR/app-build-info.json"
if [[ -f "$BUILD_INFO" ]]; then
  pass "app-build-info.json present"
  if python3 -m json.tool "$BUILD_INFO" >/dev/null 2>&1; then
    pass "app-build-info.json is valid JSON"
  else
    fail "app-build-info.json is invalid JSON"
  fi
else
  fail "app-build-info.json missing"
fi

echo ""
echo "--- 6. Path portability / security ---"
DEV_PATH_REGEX='(/Users/runner/|/Users/[^[:space:]"'"'"'<>]*/anclora|/home/[^[:space:]"'"'"'<>]*/anclora|/home/toni/)'
DEV_PATH_FOUND="$(LC_ALL=C grep -IRnE "$DEV_PATH_REGEX" "$APP_DIR" \
    --exclude-dir=data --exclude-dir=temp --exclude-dir=logs \
    --exclude="*.node" --exclude="*.icns" \
    2>/dev/null | head -20 || true)"
if [[ -n "$DEV_PATH_FOUND" ]]; then
  echo "$DEV_PATH_FOUND"
  fail "Developer/runner workspace path found in .app bundle"
else
  pass "No developer/runner workspace paths in .app bundle"
fi

if grep -q '0\.0\.0\.0' "$MACOS_DIR"/* 2>/dev/null; then
  fail "Launcher binds to 0.0.0.0 (INSECURE)"
else
  pass "Launcher does not bind to 0.0.0.0"
fi

SECRET_FILES="$(find "$APP_DIR" \( -name ".env.local" -o -name ".env" -o -name "*.pem" -o -name "*.key" \) -type f 2>/dev/null || true)"
if [[ -n "$SECRET_FILES" ]]; then
  echo "$SECRET_FILES"
  fail "Secret file(s) found in bundle"
else
  pass "No secret files in bundle"
fi

if find "$APP_DIR" -name ".git" -type d 2>/dev/null | head -1 | grep -q .; then
  fail ".git directory found in bundle"
else
  pass "No .git in bundle"
fi

echo ""
echo "--- 7. Bundle Code Signature ---"
if command -v codesign >/dev/null 2>&1; then
  if codesign --verify --deep --strict --verbose=4 "$APP_DIR" >/dev/null 2>&1; then
    pass "codesign --verify --deep --strict passed"
  else
    fail "codesign --verify --deep --strict failed"
  fi

  CODE_RESOURCES="$CONTENTS_DIR/_CodeSignature/CodeResources"
  if [[ -f "$CODE_RESOURCES" ]]; then
    pass "Contents/_CodeSignature/CodeResources exists"
  else
    fail "Contents/_CodeSignature/CodeResources missing"
  fi

  CODESIGN_DV="$(codesign -dv --verbose=4 "$APP_DIR" 2>&1 || true)"
  if echo "$CODESIGN_DV" | grep -q "Identifier=com.anclora.filestudio"; then
    pass "codesign Identifier = com.anclora.filestudio"
  else
    fail "codesign Identifier unexpected or missing com.anclora.filestudio"
  fi

  if echo "$CODESIGN_DV" | grep -q "Info.plist=not bound"; then
    fail "codesign Info.plist is not bound"
  elif echo "$CODESIGN_DV" | grep -qE "Info\.plist entries=[1-9]"; then
    pass "codesign Info.plist is bound"
  else
    fail "codesign Info.plist entries missing"
  fi

  if echo "$CODESIGN_DV" | grep -q "Sealed Resources=none"; then
    fail "codesign Sealed Resources is none"
  elif echo "$CODESIGN_DV" | grep -qE "Sealed Resources version="; then
    pass "codesign Sealed Resources present"
  else
    fail "codesign Sealed Resources missing"
  fi
else
  fail "codesign tool not available on this host"
fi

echo ""
echo "=============================="
echo " Verification Summary"
echo "=============================="
echo -e " ${GREEN}PASS${NC}: $PASS"
echo -e " ${YELLOW}WARN${NC}: $WARN_COUNT"
echo -e " ${RED}FAIL${NC}: $FAIL"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "${RED}VERIFICATION FAILED${NC} — $FAIL check(s) failed"
  exit 1
else
  echo -e "${GREEN}VERIFICATION PASSED${NC} — .app bundle is valid"
  exit 0
fi
