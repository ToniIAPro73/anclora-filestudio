#!/usr/bin/env bash
# verify-macos-portable.sh — Full structural and integrity verification of the macOS arm64 portable.
# Fails with exit 1 on ANY issue. Does NOT skip on missing artifact.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(node -e 'const fs = require("fs"); const path = require("path"); console.log((fs.realpathSync.native || fs.realpathSync)(path.resolve(process.argv[1])))' "$SCRIPT_DIR/.." 2>/dev/null || (cd "$SCRIPT_DIR/.." && pwd -P))"
ZIP="$REPO_ROOT/dist/macos/Anclora-FileStudio-macOS-arm64.zip"
SHA_FILE="$ZIP.sha256"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
PASS=0; FAIL=0; WARN_COUNT=0

check() {
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo -e "${GREEN}[PASS]${NC} $desc"
    (( PASS++ )) || true
  else
    echo -e "${RED}[FAIL]${NC} $desc"
    (( FAIL++ )) || true
  fi
}

require() {
  local desc="$1" val="$2"
  if [[ -n "$val" ]]; then
    echo -e "${GREEN}[PASS]${NC} $desc: $val"
    (( PASS++ )) || true
  else
    echo -e "${RED}[FAIL]${NC} $desc: empty or missing"
    (( FAIL++ )) || true
  fi
}

sha256_of() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

echo ""
echo "=== Anclora FileStudio — macOS arm64 Portable Verification ==="
echo "Target: $ZIP"
echo ""

# ── 1. Artifact existence ─────────────────────────────────────────────────────
echo "--- 1. Artifact existence ---"
[[ -f "$ZIP" ]]      || { echo -e "${RED}[FAIL]${NC} Package not found: $ZIP"; exit 1; }
[[ -f "$SHA_FILE" ]] || { echo -e "${RED}[FAIL]${NC} SHA256 file not found: $SHA_FILE"; exit 1; }
echo -e "${GREEN}[PASS]${NC} zip exists: $(du -sh "$ZIP" | awk '{print $1}')"
echo -e "${GREEN}[PASS]${NC} sha256 file exists"
(( PASS+=2 )) || true

# ── 2. Checksum ───────────────────────────────────────────────────────────────
echo ""
echo "--- 2. Checksum ---"
EXPECTED_SHA="$(awk '{print $1}' "$SHA_FILE")"
ACTUAL_SHA="$(sha256_of "$ZIP")"
if [[ "$EXPECTED_SHA" == "$ACTUAL_SHA" ]]; then
  echo -e "${GREEN}[PASS]${NC} SHA-256 OK: $ACTUAL_SHA"
  (( PASS++ )) || true
else
  echo -e "${RED}[FAIL]${NC} SHA-256 MISMATCH (expected $EXPECTED_SHA, got $ACTUAL_SHA)"
  (( FAIL++ )) || true
fi

# ── 3. Extract and inspect ────────────────────────────────────────────────────
echo ""
echo "--- 3. Structure ---"

TMP_VERIFY="$(mktemp -d)"
trap "rm -rf '$TMP_VERIFY'" EXIT

unzip -q "$ZIP" -d "$TMP_VERIFY"
PKG="$TMP_VERIFY/Anclora-FileStudio-macOS-arm64"

[[ -d "$PKG" ]] || { echo -e "${RED}[FAIL]${NC} Root directory Anclora-FileStudio-macOS-arm64 missing"; (( FAIL++ )) || true; }

for f in \
  "start-anclora-filestudio.sh" \
  "stop-anclora-filestudio.sh" \
  "diagnose-anclora-filestudio.sh" \
  "manifest.json" \
  "VERSION.txt" \
  "LEEME.txt" \
  "THIRD_PARTY_NOTICES.txt" \
  "SBOM.cdx.json" \
  "app/server.js" \
  "app/.next/static" \
  "runtime/node"; do
  if [[ -e "$PKG/$f" ]]; then
    echo -e "${GREEN}[PASS]${NC} $f"
    (( PASS++ )) || true
  else
    echo -e "${RED}[FAIL]${NC} Missing: $f"
    (( FAIL++ )) || true
  fi
done

for d in app data temp logs; do
  check "dir: $d" test -d "$PKG/$d"
done

STATE_FILES="$(find "$PKG" \( -name '*.sqlite' -o -name '*.sqlite-wal' -o -name '*.sqlite-shm' \) -type f 2>/dev/null | head -20 || true)"
if [[ -n "$STATE_FILES" ]]; then
  echo "$STATE_FILES" | sed "s#^#$RED[FAIL]$NC Runtime state file: #"
  (( FAIL++ )) || true
else
  echo -e "${GREEN}[PASS]${NC} no SQLite/WAL/SHM runtime state in package"
  (( PASS++ )) || true
fi

if [[ -d "$PKG/app/node_modules/playwright" ]]; then
  echo -e "${RED}[FAIL]${NC} playwright package should not be in Core runtime"
  (( FAIL++ )) || true
else
  echo -e "${GREEN}[PASS]${NC} playwright package absent from Core runtime"
  (( PASS++ )) || true
fi

# ── 4. Executable permissions ─────────────────────────────────────────────────
echo ""
echo "--- 4. Executable permissions ---"
for sh in start-anclora-filestudio.sh stop-anclora-filestudio.sh diagnose-anclora-filestudio.sh; do
  check "executable: $sh" test -x "$PKG/$sh"
done
check "executable: runtime/node" test -x "$PKG/runtime/node"

# ── 5. JSON validity ──────────────────────────────────────────────────────────
echo ""
echo "--- 5. JSON files ---"
for jf in manifest.json SBOM.cdx.json; do
  if python3 -m json.tool "$PKG/$jf" >/dev/null 2>&1; then
    echo -e "${GREEN}[PASS]${NC} Valid JSON: $jf"
    (( PASS++ )) || true
  else
    echo -e "${RED}[FAIL]${NC} Invalid JSON: $jf"
    (( FAIL++ )) || true
  fi
done

# ── 6. Manifest fields ────────────────────────────────────────────────────────
echo ""
echo "--- 6. Manifest fields ---"
MANIFEST="$PKG/manifest.json"
for field in name version buildId buildDate commit commitFull source platform arch capabilities; do
  VAL="$(python3 -c "import json; d=json.load(open('$MANIFEST')); print(d.get('$field',''))" 2>/dev/null || echo '')"
  require "manifest.$field" "$VAL"
done

SOURCE_COMMIT="$(python3 -c "import json; d=json.load(open('$MANIFEST')); print(d.get('source',{}).get('commit',''))" 2>/dev/null || echo '')"
COMMIT_FULL="$(python3 -c "import json; d=json.load(open('$MANIFEST')); print(d.get('commitFull',''))" 2>/dev/null || echo '')"
[[ -n "$SOURCE_COMMIT" && "$SOURCE_COMMIT" == "$COMMIT_FULL" ]] && { echo -e "${GREEN}[PASS]${NC} manifest.source.commit matches commitFull"; (( PASS++ )) || true; } || { echo -e "${RED}[FAIL]${NC} manifest.source.commit does not match commitFull"; (( FAIL++ )) || true; }

if [[ -n "${GITHUB_SHA:-}" ]]; then
  [[ "$COMMIT_FULL" == "$GITHUB_SHA" ]] && { echo -e "${GREEN}[PASS]${NC} manifest.commitFull matches GITHUB_SHA"; (( PASS++ )) || true; } || { echo -e "${RED}[FAIL]${NC} manifest.commitFull ($COMMIT_FULL) does not match GITHUB_SHA ($GITHUB_SHA)"; (( FAIL++ )) || true; }
fi

PLATFORM="$(python3 -c "import json; print(json.load(open('$MANIFEST'))['platform'])" 2>/dev/null || echo '')"
[[ "$PLATFORM" == "darwin" ]] && { echo -e "${GREEN}[PASS]${NC} platform=darwin"; (( PASS++ )) || true; } || { echo -e "${RED}[FAIL]${NC} platform != darwin (got: $PLATFORM)"; (( FAIL++ )) || true; }

ARCH="$(python3 -c "import json; print(json.load(open('$MANIFEST'))['arch'])" 2>/dev/null || echo '')"
[[ "$ARCH" == "arm64" ]] && { echo -e "${GREEN}[PASS]${NC} arch=arm64"; (( PASS++ )) || true; } || { echo -e "${RED}[FAIL]${NC} arch != arm64 (got: $ARCH)"; (( FAIL++ )) || true; }

# ── 6b. Bundled Node.js runtime ───────────────────────────────────────────────
echo ""
echo "--- 6b. Bundled Node.js runtime ---"
NODE_BIN="$PKG/runtime/node"
if [[ -f "$NODE_BIN" ]] && [[ -x "$NODE_BIN" ]]; then
  if file "$NODE_BIN" | grep -qE "Mach-O.*arm64|ARM64"; then
    NODE_VER="$("$NODE_BIN" --version 2>/dev/null || echo unknown)"
    echo -e "${GREEN}[PASS]${NC} runtime/node: Mach-O arm64 — $NODE_VER"
    (( PASS++ )) || true
    if grep -q '"$NODE" server.js\|runtime/node' "$PKG/start-anclora-filestudio.sh" 2>/dev/null; then
      echo -e "${GREEN}[PASS]${NC} Launcher uses bundled node"
      (( PASS++ )) || true
    else
      echo -e "${RED}[FAIL]${NC} Launcher does NOT reference bundled runtime/node"
      (( FAIL++ )) || true
    fi
  else
    echo -e "${RED}[FAIL]${NC} runtime/node is NOT Mach-O arm64 ($(file "$NODE_BIN"))"
    (( FAIL++ )) || true
  fi
else
  echo -e "${RED}[FAIL]${NC} runtime/node missing or not executable"
  (( FAIL++ )) || true
fi

# ── 7. Native modules — Mach-O arm64 ─────────────────────────────────────────
echo ""
echo "--- 7. Native modules (Mach-O arm64) ---"

BS3_NODE="$(find "$PKG/app" -name "better_sqlite3.node" -type f 2>/dev/null | head -1 || true)"
if [[ -n "$BS3_NODE" ]]; then
  if file "$BS3_NODE" | grep -qE "Mach-O.*arm64|ARM64"; then
    echo -e "${GREEN}[PASS]${NC} better_sqlite3.node is Mach-O arm64"
    (( PASS++ )) || true
    if command -v otool >/dev/null 2>&1; then
      if otool -L "$BS3_NODE" 2>/dev/null | grep -qi "not found"; then
        echo -e "${YELLOW}[WARN]${NC} better_sqlite3.node has unresolved dynamic deps"
        (( WARN_COUNT++ )) || true
      else
        echo -e "${GREEN}[PASS]${NC} better_sqlite3.node dynamic deps OK"
        (( PASS++ )) || true
      fi
    fi
    BS3_PACKAGE_DIR="$(find "$PKG/app/node_modules" -path "*/better-sqlite3/package.json" -type f 2>/dev/null | head -1 | xargs -r dirname)"
    if [[ -n "$BS3_PACKAGE_DIR" ]] && "$PKG/runtime/node" -e "const Database=require('$BS3_PACKAGE_DIR'); const db=new Database(':memory:'); db.close();" >/dev/null 2>&1; then
      echo -e "${GREEN}[PASS]${NC} better-sqlite3 loads with bundled node"
      (( PASS++ )) || true
    else
      echo -e "${RED}[FAIL]${NC} better-sqlite3 does not load with bundled node"
      (( FAIL++ )) || true
    fi
  else
    echo -e "${RED}[FAIL]${NC} better_sqlite3.node is NOT Mach-O arm64 ($(file "$BS3_NODE"))"
    (( FAIL++ )) || true
  fi
else
  echo -e "${YELLOW}[WARN]${NC} better_sqlite3.node not found"
  (( WARN_COUNT++ )) || true
fi

SHARP_NODE="$(find "$PKG/app" -name "sharp-darwin-arm64-*.node" -type f 2>/dev/null | sort | head -1 || true)"
if [[ -n "$SHARP_NODE" ]]; then
  if file "$SHARP_NODE" | grep -qE "Mach-O.*arm64|ARM64"; then
    echo -e "${GREEN}[PASS]${NC} $(basename "$SHARP_NODE") is Mach-O arm64"
    (( PASS++ )) || true
  else
    echo -e "${RED}[FAIL]${NC} $(basename "$SHARP_NODE") is NOT Mach-O arm64"
    (( FAIL++ )) || true
  fi
else
  echo -e "${RED}[FAIL]${NC} sharp-darwin-arm64 native module not found (Sharp not packaged)"
  (( FAIL++ )) || true
fi

# ── 7b. Sharp libvips runtime completeness ────────────────────────────────────
echo ""
echo "--- 7b. Sharp libvips runtime ---"

LIBVIPS_PKG_DIR="$(find "$PKG/app/node_modules/.pnpm" -path "*/node_modules/@img/sharp-libvips-darwin-arm64" -type d 2>/dev/null | sort | head -1 || true)"

if [[ -n "$LIBVIPS_PKG_DIR" && -d "$LIBVIPS_PKG_DIR" ]]; then
  echo -e "${GREEN}[PASS]${NC} @img/sharp-libvips-darwin-arm64 directory exists"
  (( PASS++ )) || true
else
  echo -e "${RED}[FAIL]${NC} @img/sharp-libvips-darwin-arm64 directory missing"
  (( FAIL++ )) || true
fi

LIBVIPS_DYLIB=""
if [[ -n "$LIBVIPS_PKG_DIR" ]]; then
  LIBVIPS_DYLIB="$(find "$LIBVIPS_PKG_DIR/lib" -maxdepth 1 -name "libvips-cpp.*.dylib" -type f 2>/dev/null | sort | head -1 || true)"
fi
if [[ -f "$LIBVIPS_DYLIB" ]] && [[ ! -L "$LIBVIPS_DYLIB" ]]; then
  echo -e "${GREEN}[PASS]${NC} $(basename "$LIBVIPS_DYLIB") is a real file (not symlink)"
  (( PASS++ )) || true
  if file "$LIBVIPS_DYLIB" | grep -qE "Mach-O.*arm64|ARM64"; then
    echo -e "${GREEN}[PASS]${NC} $(basename "$LIBVIPS_DYLIB") is Mach-O arm64"
    (( PASS++ )) || true
  else
    echo -e "${RED}[FAIL]${NC} $(basename "$LIBVIPS_DYLIB") is NOT Mach-O arm64 ($(file "$LIBVIPS_DYLIB" 2>/dev/null | head -1))"
    (( FAIL++ )) || true
  fi
  SO_SIZE="$(stat -f%z "$LIBVIPS_DYLIB" 2>/dev/null || stat -c%s "$LIBVIPS_DYLIB" 2>/dev/null || echo 0)"
  if [[ "$SO_SIZE" -gt 1000000 ]]; then
    echo -e "${GREEN}[PASS]${NC} $(basename "$LIBVIPS_DYLIB") size OK ($(( SO_SIZE / 1024 / 1024 ))MB)"
    (( PASS++ )) || true
  else
    echo -e "${RED}[FAIL]${NC} $(basename "$LIBVIPS_DYLIB") too small (${SO_SIZE} bytes) — likely a stub"
    (( FAIL++ )) || true
  fi
elif [[ -L "$LIBVIPS_DYLIB" ]]; then
  echo -e "${RED}[FAIL]${NC} $(basename "$LIBVIPS_DYLIB") is a symlink — must be a real file in the package"
  (( FAIL++ )) || true
else
  echo -e "${RED}[FAIL]${NC} libvips-cpp.dylib missing from package"
  (( FAIL++ )) || true
fi

BROKEN_SYMLINKS="$(find "$PKG/app/node_modules/.pnpm" -path "*/sharp@*/node_modules/@img/*" ! -exec test -e {} \; -print 2>/dev/null || true)"
if [[ -z "$BROKEN_SYMLINKS" ]]; then
  echo -e "${GREEN}[PASS]${NC} No broken symlinks in sharp pnpm tree"
  (( PASS++ )) || true
else
  echo -e "${RED}[FAIL]${NC} Broken symlinks in sharp pnpm tree:"
  echo "$BROKEN_SYMLINKS" | head -5
  (( FAIL++ )) || true
fi

if [[ -n "$SHARP_NODE" ]] && command -v otool >/dev/null 2>&1; then
  OTOOL_OUT="$(otool -L "$SHARP_NODE" 2>&1 || true)"
  if echo "$OTOOL_OUT" | grep -qi "not found"; then
    echo -e "${RED}[FAIL]${NC} sharp .node has unresolved dynamic deps:"
    echo "$OTOOL_OUT" | grep -i "not found"
    (( FAIL++ )) || true
  else
    echo -e "${GREEN}[PASS]${NC} sharp .node dynamic deps OK (otool -L)"
    (( PASS++ )) || true
  fi
fi

NODE_BIN_VERIFY="${PKG}/runtime/node"
if [[ -x "$NODE_BIN_VERIFY" ]] && [[ -n "$SHARP_NODE" ]]; then
  SHARP_LOAD_RESULT="$(cd "$PKG/app" && "$NODE_BIN_VERIFY" -e "
const s = require('sharp');
const v = s.versions;
if (!v || !v.sharp || !v.vips) { console.error('versions missing'); process.exit(1); }
console.log('sharp=' + v.sharp + ' vips=' + v.vips);
" 2>&1 || echo "FAILED")"
  if echo "$SHARP_LOAD_RESULT" | grep -Eq "sharp=[0-9]+\\.[0-9]+\\.[0-9]+ vips=[0-9]+\\.[0-9]+\\.[0-9]+"; then
    echo -e "${GREEN}[PASS]${NC} Sharp loads with bundled node: $SHARP_LOAD_RESULT"
    (( PASS++ )) || true
  else
    echo -e "${RED}[FAIL]${NC} Sharp load test with bundled node failed: $SHARP_LOAD_RESULT"
    (( FAIL++ )) || true
  fi
fi

FOREIGN_COUNT="$(find "$PKG" \( -name "*.dll" -o -name "*.exe" -o -name "*.so" \) 2>/dev/null | wc -l | tr -d ' ')"
if [[ "$FOREIGN_COUNT" -eq 0 ]]; then
  echo -e "${GREEN}[PASS]${NC} No Windows/Linux artifacts (.dll/.exe/.so absent)"
  (( PASS++ )) || true
else
  echo -e "${RED}[FAIL]${NC} $FOREIGN_COUNT Windows/Linux artifact(s) found in macOS package"
  (( FAIL++ )) || true
fi

# ── 7c. Next.js runtime metadata ─────────────────────────────────────────────
echo ""
echo "--- 7c. Next.js runtime metadata ---"
REQUIRED_SERVER_FILES="$PKG/app/.next/required-server-files.json"
if [[ -f "$REQUIRED_SERVER_FILES" ]]; then
  if python3 -c "import json; json.load(open('$REQUIRED_SERVER_FILES', encoding='utf-8'))" 2>/dev/null; then
    echo -e "${GREEN}[PASS]${NC} required-server-files.json is valid JSON"
    (( PASS++ )) || true
  else
    echo -e "${RED}[FAIL]${NC} required-server-files.json is not valid JSON"
    (( FAIL++ )) || true
  fi

  REQUIRED_SERVER_FILES_CHECK="$(python3 - "$REQUIRED_SERVER_FILES" "$REPO_ROOT" << 'PYEOF' 2>&1
import json
import pathlib
import sys

metadata_path = pathlib.Path(sys.argv[1])
repo_root = pathlib.Path(sys.argv[2]).resolve().as_posix()
text = metadata_path.read_text(encoding="utf-8")
data = json.loads(text)

if repo_root in text:
    raise SystemExit("contains repository root")

for field in ("version", "config", "files"):
    if field not in data:
        raise SystemExit(f"missing field: {field}")

for value in (data.get("appDir"), data.get("config", {}).get("outputFileTracingRoot"), data.get("config", {}).get("repoRoot"), data.get("config", {}).get("turbopack", {}).get("root")):
    if isinstance(value, str) and value.startswith("/"):
        raise SystemExit(f"absolute workspace-style metadata field: {value}")

files = data.get("files")
if not isinstance(files, list) or ".next/routes-manifest.json" not in files:
    raise SystemExit("runtime files list is missing required Next.js manifests")
PYEOF
)"
  if [[ -z "$REQUIRED_SERVER_FILES_CHECK" ]]; then
    echo -e "${GREEN}[PASS]${NC} required-server-files.json keeps runtime metadata without workspace paths"
    (( PASS++ )) || true
  else
    echo -e "${RED}[FAIL]${NC} required-server-files.json invalid: $REQUIRED_SERVER_FILES_CHECK"
    (( FAIL++ )) || true
  fi
else
  echo -e "${RED}[FAIL]${NC} required-server-files.json missing"
  (( FAIL++ )) || true
fi

# ── 7d. Next.js runtime externals referenced by server chunks ────────────────
echo ""
echo "--- 7d. Next.js runtime external references ---"
NEXT_REFS_REPORT="$(python3 "$REPO_ROOT/scripts/next-runtime-refs.py" check "$PKG/app" 2>&1 || true)"
NEXT_REFS_MISSING=0
while IFS= read -r line; do
  case "$line" in
    "OK "*)
      echo -e "${GREEN}[PASS]${NC} ${line#OK }"
      (( PASS++ )) || true
      ;;
    "MISSING "*)
      echo -e "${RED}[FAIL]${NC} missing referenced Next.js runtime module: ${line#MISSING }"
      (( FAIL++ )) || true
      NEXT_REFS_MISSING=$((NEXT_REFS_MISSING+1))
      ;;
  esac
done <<< "$NEXT_REFS_REPORT"
if [[ "$NEXT_REFS_MISSING" -eq 0 && "$NEXT_REFS_REPORT" == *"OK "* ]]; then
  echo -e "${GREEN}[PASS]${NC} all referenced Next.js runtime modules present"
  (( PASS++ )) || true
elif [[ "$NEXT_REFS_REPORT" != *"OK "* ]]; then
  echo -e "${RED}[FAIL]${NC} could not enumerate Next.js runtime references: $NEXT_REFS_REPORT"
  (( FAIL++ )) || true
fi

# ── 8. Security: no secrets, no .git, no dev paths ───────────────────────────
echo ""
echo "--- 8. Security ---"

SECRET_PATTERNS='BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY|api[_-]?key\s*=\s*["\x27][^"]+|client[_-]?secret\s*='
if grep -rqiE "$SECRET_PATTERNS" "$PKG" --include="*.json" --include="*.env" --include="*.txt" 2>/dev/null; then
  echo -e "${RED}[FAIL]${NC} Potential secret found in package"
  (( FAIL++ )) || true
else
  echo -e "${GREEN}[PASS]${NC} No secrets detected"
  (( PASS++ )) || true
fi

if [[ -d "$PKG/.git" ]] || find "$PKG" -name ".git" -type d 2>/dev/null | grep -q .; then
  echo -e "${RED}[FAIL]${NC} .git directory found in package"
  (( FAIL++ )) || true
else
  echo -e "${GREEN}[PASS]${NC} No .git in package"
  (( PASS++ )) || true
fi

DEV_PATH_REGEX='(/home/[^[:space:]"'"'"'<>]*/[^[:space:]"'"'"'<>]*/anclora/|/workspace/anclora/|/home/toni/|/Users/[^[:space:]"'"'"'<>]*/anclora)'
DEV_PATH_FOUND="$(LC_ALL=C grep -IRnE "$DEV_PATH_REGEX" "$PKG" \
    --exclude-dir=data --exclude-dir=temp --exclude-dir=logs \
    --exclude="*.node" --exclude="*.zip" \
    2>/dev/null | head -20 || true)"
if [[ -n "$DEV_PATH_FOUND" ]]; then
  echo "$DEV_PATH_FOUND"
  echo -e "${RED}[FAIL]${NC} Developer workspace path found in package"
  (( FAIL++ )) || true
else
  echo -e "${GREEN}[PASS]${NC} No developer workspace paths in package"
  (( PASS++ )) || true
fi

# ── 9. Launcher security ──────────────────────────────────────────────────────
echo ""
echo "--- 9. Launcher security ---"

if grep -q "127.0.0.1" "$PKG/start-anclora-filestudio.sh" 2>/dev/null; then
  echo -e "${GREEN}[PASS]${NC} Launcher binds to 127.0.0.1"
  (( PASS++ )) || true
else
  echo -e "${RED}[FAIL]${NC} Launcher does not explicitly bind to 127.0.0.1"
  (( FAIL++ )) || true
fi

if grep -qE "0\.0\.0\.0" "$PKG/start-anclora-filestudio.sh" 2>/dev/null; then
  echo -e "${RED}[FAIL]${NC} Launcher binds to 0.0.0.0 (INSECURE)"
  (( FAIL++ )) || true
else
  echo -e "${GREEN}[PASS]${NC} Launcher does not bind to 0.0.0.0"
  (( PASS++ )) || true
fi

# ── 10. Licenses ──────────────────────────────────────────────────────────────
echo ""
echo "--- 10. Licenses ---"
check "THIRD_PARTY_NOTICES.txt present" test -f "$PKG/THIRD_PARTY_NOTICES.txt"
check "SBOM.cdx.json present" test -f "$PKG/SBOM.cdx.json"

# ── 11. No absolute build-host paths inside internal scripts ─────────────────
echo ""
echo "--- 11. Path portability ---"
if grep -rlE "$SCRIPT_DIR|$REPO_ROOT" "$PKG"/*.sh 2>/dev/null | grep -q .; then
  echo -e "${RED}[FAIL]${NC} Launcher scripts reference the build runner's absolute paths"
  (( FAIL++ )) || true
else
  echo -e "${GREEN}[PASS]${NC} Launcher scripts contain no build-runner absolute paths"
  (( PASS++ )) || true
fi

# ── Summary ───────────────────────────────────────────────────────────────────
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
  echo -e "${GREEN}VERIFICATION PASSED${NC} — macOS arm64 portable is valid"
  exit 0
fi
