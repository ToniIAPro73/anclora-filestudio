#!/usr/bin/env bash
# build-linux-portable.sh — Builds Anclora FileStudio Linux x64 portable package.
# Produces: dist/linux/Anclora-FileStudio-Linux-x64.tar.zst + .sha256
# Does NOT modify Git state. Does NOT push. Does NOT create commits.
# Does NOT require sudo. Does NOT copy host libraries.

set -euo pipefail

# ── Root detection (no hardcoded paths) ───────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Outputs ───────────────────────────────────────────────────────────────────
DIST_DIR="$REPO_ROOT/dist/linux"
PACKAGE_NAME="Anclora-FileStudio-Linux-x64"
STAGING_BASE="$SCRIPT_DIR/.staging/linux"
PACKAGE_DIR="$STAGING_BASE/$PACKAGE_NAME"
TAR_FILE="$DIST_DIR/${PACKAGE_NAME}.tar.zst"
SHA_FILE="$TAR_FILE.sha256"

# ── Build metadata ─────────────────────────────────────────────────────────────
VERSION="$(node -p "require('$REPO_ROOT/package.json').version" 2>/dev/null || echo "0.1.0")"
BUILD_ID="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "dev")"
BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
GIT_COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo "unknown")"
SOURCE_TREE_CLEAN="true"
if ! git -C "$REPO_ROOT" diff --quiet -- . ':(exclude)artifacts/route-ranking/benchmark-results.json' 2>/dev/null || \
   ! git -C "$REPO_ROOT" diff --cached --quiet -- . ':(exclude)artifacts/route-ranking/benchmark-results.json' 2>/dev/null; then
  SOURCE_TREE_CLEAN="false"
fi

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

echo "=== Anclora FileStudio — Linux x64 Portable Build ==="
info "Version: $VERSION | Build: $BUILD_ID | Date: $BUILD_DATE"
echo ""

# ── Read toolchain.lock.json ──────────────────────────────────────────────────
LOCKFILE="$SCRIPT_DIR/toolchain.lock.json"
[[ -f "$LOCKFILE" ]] || die "toolchain.lock.json not found at $LOCKFILE"

NODE_LINUX_VERSION="$(python3 -c "import json; d=json.load(open('$LOCKFILE')); print(d['runtimes']['linux-x64']['version'])")"
NODE_LINUX_SHA256="$(python3 -c "import json; d=json.load(open('$LOCKFILE')); print(d['runtimes']['linux-x64']['sha256'])")"
NODE_LINUX_URL="$(python3 -c "import json; d=json.load(open('$LOCKFILE')); print(d['runtimes']['linux-x64']['sourceUrl'])")"
NODE_ABI_EXPECTED="$(python3 -c "import json; d=json.load(open('$LOCKFILE')); print(d['runtimes']['linux-x64']['abi'])")"
NODE_LINUX_TAR="node-v${NODE_LINUX_VERSION}-linux-x64.tar.gz"
NODE_CACHE_DIR="$SCRIPT_DIR/.cache/linux-portable"
NODE_CACHE="$NODE_CACHE_DIR/$NODE_LINUX_TAR"

info "Toolchain: Node.js v${NODE_LINUX_VERSION} (ABI ${NODE_ABI_EXPECTED})"

# ── Prerequisites ─────────────────────────────────────────────────────────────
info "Checking prerequisites..."

# zstd: accept user-local installation or fallback to gzip
USE_ZSTD=1
if ! command -v zstd >/dev/null 2>&1; then
  # Try common user locations
  for p in "$HOME/.local/bin/zstd" "/usr/local/bin/zstd" "/opt/homebrew/bin/zstd"; do
    if [[ -x "$p" ]]; then export PATH="$(dirname "$p"):$PATH"; break; fi
  done
fi
if ! command -v zstd >/dev/null 2>&1; then
  USE_ZSTD=0
  warn "zstd not found — falling back to gzip"
fi
command -v node >/dev/null 2>&1 || die "Node.js not found (needed for build only)"
if command -v pnpm >/dev/null 2>&1; then
  PKG_MGR="pnpm"
elif command -v npm >/dev/null 2>&1; then
  PKG_MGR="npm"
else
  die "Neither pnpm nor npm found"
fi
ok "Prerequisites OK (Package manager: $PKG_MGR)"

# ── Require .next/standalone ──────────────────────────────────────────────────
STANDALONE="$REPO_ROOT/.next/standalone"
STATIC_DIR="$REPO_ROOT/.next/static"
PUBLIC_DIR="$REPO_ROOT/public"

info "Building Next.js application for Desktop portable (output: standalone)..."
cd "$REPO_ROOT"
rm -rf "$REPO_ROOT/.next"
ANCLORA_FILESTUDIO_DEPLOYMENT_TARGET=desktop \
NEXT_PUBLIC_ANCLORA_FILESTUDIO_MODE=desktop \
NEXT_TELEMETRY_DISABLED=1 \
  $PKG_MGR run build:desktop
[[ -f "$STANDALONE/server.js" ]] || die ".next/standalone/server.js not found after build"
ok "Next.js Desktop build complete"

# ── Download Node.js runtime into cache (before staging wipe) ────────────────
info "Preparing Node.js v${NODE_LINUX_VERSION} runtime cache..."
mkdir -p "$NODE_CACHE_DIR"

if [[ ! -f "$NODE_CACHE" ]]; then
  info "Downloading $NODE_LINUX_TAR from nodejs.org..."
  curl --fail --location --retry 3 --progress-bar \
    -o "$NODE_CACHE" "$NODE_LINUX_URL" \
    || { rm -f "$NODE_CACHE"; die "Failed to download Node.js Linux tarball"; }
fi

# Verify SHA-256
ACTUAL_SHA="$(sha256sum "$NODE_CACHE" | awk '{print $1}')"
if [[ "$ACTUAL_SHA" != "$NODE_LINUX_SHA256" ]]; then
  die "Node.js tarball SHA-256 mismatch! Expected: $NODE_LINUX_SHA256 Got: $ACTUAL_SHA"
fi
ok "Node.js v${NODE_LINUX_VERSION} tarball verified (SHA-256 OK)"

# ── Clean and prepare staging ─────────────────────────────────────────────────
info "Preparing staging directory..."
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"/{app,runtime,tools,data,temp,logs,licenses,models}

# ── Embed Node.js binary into runtime/ ───────────────────────────────────────
info "Extracting node binary into runtime/..."
TMP_NODE_EXTRACT="$(mktemp -d)"
tar -C "$TMP_NODE_EXTRACT" -xzf "$NODE_CACHE" "node-v${NODE_LINUX_VERSION}-linux-x64/bin/node" 2>/dev/null \
  || die "Failed to extract node binary from tarball"
cp "$TMP_NODE_EXTRACT/node-v${NODE_LINUX_VERSION}-linux-x64/bin/node" "$PACKAGE_DIR/runtime/node"
rm -rf "$TMP_NODE_EXTRACT"
chmod +x "$PACKAGE_DIR/runtime/node"
file "$PACKAGE_DIR/runtime/node" | grep -q "ELF.*x86-64" || die "runtime/node is not ELF x86-64"
ok "runtime/node — ELF x86-64 — Node.js v${NODE_LINUX_VERSION}"

# ── Detect ABI using bundled node ─────────────────────────────────────────────
NODE_VERSION="$("$PACKAGE_DIR/runtime/node" --version)"
NODE_ABI="$("$PACKAGE_DIR/runtime/node" -e 'console.log(process.versions.modules)')"
[[ "$NODE_ABI" == "$NODE_ABI_EXPECTED" ]] || warn "ABI mismatch: expected $NODE_ABI_EXPECTED got $NODE_ABI"
info "Bundled Node.js $NODE_VERSION (ABI $NODE_ABI)"

# ── Copy Next.js standalone (whitelist approach) ──────────────────────────────
info "Copying Next.js standalone (whitelist)..."

# server.js — the entry point
cp "$STANDALONE/server.js" "$PACKAGE_DIR/app/server.js"

# node_modules — standalone traces only what it needs (a small subset)
if [[ -d "$STANDALONE/node_modules" ]]; then
  cp -r "$STANDALONE/node_modules" "$PACKAGE_DIR/app/node_modules"
fi

# .next build output: copy all of standalone's .next except build cache.
# IMPORTANT: Do NOT exclude node_modules here — Turbopack places external module
# stubs in .next/node_modules/ (e.g. better-sqlite3-<hash>, sharp-<hash>) which
# are required by the server at runtime. This is distinct from the top-level
# standalone/node_modules/ already copied above.
mkdir -p "$PACKAGE_DIR/app/.next"
if [[ -d "$STANDALONE/.next" ]]; then
  find "$STANDALONE/.next" -mindepth 1 -maxdepth 1 \
    ! -name "cache" | while read -r item; do
    cp -r "$item" "$PACKAGE_DIR/app/.next/"
  done
fi

# Static assets (client-side JS/CSS bundles) — from the repo's .next/static
# The standalone .next/static may be absent; the repo's .next/static is authoritative
if [[ -d "$STATIC_DIR" ]]; then
  rm -rf "$PACKAGE_DIR/app/.next/static"
  cp -r "$STATIC_DIR" "$PACKAGE_DIR/app/.next/static"
fi

# Public directory (robots.txt, icons, etc.)
if [[ -d "$PUBLIC_DIR" ]]; then
  cp -r "$PUBLIC_DIR" "$PACKAGE_DIR/app/public"
else
  mkdir -p "$PACKAGE_DIR/app/public"
fi

info "Removing build-only path metadata..."
find "$PACKAGE_DIR/app" \
  \( -name "*.map" \
  -o -name "*.nft.json" \
  -o -name "trace" \
  -o -name "turbopack-trace.json" \) \
  -type f -delete 2>/dev/null || true
ok "Build-only path metadata removed"

# ── Supplement untraced Next.js runtime externals ────────────────────────────
# Turbopack server chunks load Next.js runtime modules through dynamic external
# requires (e.x("next/dist/...", ...)) that the NFT output tracer does not
# follow. Copy any missing referenced module from the lockfile-installed
# Next.js in the repository (fails the build if the source is unavailable).
info "Checking Next.js runtime external references..."
python3 "$SCRIPT_DIR/next-runtime-refs.py" fix "$PACKAGE_DIR/app" "$REPO_ROOT"
ok "Next.js runtime externals complete"

REQUIRED_SERVER_FILES="$PACKAGE_DIR/app/.next/required-server-files.json"
[[ -f "$REQUIRED_SERVER_FILES" ]] || die "Next.js runtime metadata missing: app/.next/required-server-files.json"
python3 - "$REQUIRED_SERVER_FILES" "$REPO_ROOT" << 'PYEOF'
import json
import pathlib
import sys

metadata_path = pathlib.Path(sys.argv[1])
repo_root = pathlib.Path(sys.argv[2]).resolve().as_posix()

with metadata_path.open("r", encoding="utf-8") as fh:
    data = json.load(fh)

config = data.get("config")
if isinstance(config, dict):
    if config.get("outputFileTracingRoot") == repo_root:
        config["outputFileTracingRoot"] = "."
    turbopack = config.get("turbopack")
    if isinstance(turbopack, dict) and turbopack.get("root") == repo_root:
        turbopack["root"] = "."

if data.get("appDir") == repo_root:
    data["appDir"] = "."

encoded = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
if repo_root in encoded:
    raise SystemExit("required-server-files.json still contains the build workspace path")

metadata_path.write_text(encoded, encoding="utf-8")
PYEOF
ok "Next.js runtime metadata preserved and sanitized"

python3 - "$PACKAGE_DIR/app/server.js" "$REPO_ROOT" << 'PYEOF'
import pathlib
import sys

server_js = pathlib.Path(sys.argv[1])
repo_root = sys.argv[2]
source = server_js.read_text(encoding="utf-8")
source = source.replace(repo_root, ".")
server_js.write_text(source, encoding="utf-8")
PYEOF
ok "Standalone server metadata sanitized"

# Minimal package.json for the standalone runtime
node -e "
const pkg = require('$REPO_ROOT/package.json');
const min = { name: pkg.name, version: pkg.version, private: true };
require('fs').writeFileSync('$PACKAGE_DIR/app/package.json', JSON.stringify(min, null, 2));
"

info "Removing dev-only Playwright wrapper package..."
rm -rf "$PACKAGE_DIR/app/node_modules/playwright"
find "$PACKAGE_DIR/app/node_modules" -path "*/node_modules/playwright" -type d -prune -exec rm -rf {} + 2>/dev/null || true
ok "Dev-only Playwright wrapper removed; playwright-core retained for renderer runtime"

# ── Copy native modules for linux-x64 ────────────────────────────────────────
info "Validating native modules (linux-x64)..."

# better-sqlite3: verify .node file is correct ELF
BS3_NODE=$(find "$PACKAGE_DIR/app" -name "better_sqlite3.node" -type f 2>/dev/null | head -1)
if [[ -z "$BS3_NODE" ]]; then
  # Not in standalone node_modules — copy from project
  BS3_SRC=$(find "$REPO_ROOT/node_modules/better-sqlite3" -name "better_sqlite3.node" -type f 2>/dev/null | head -1)
  if [[ -n "$BS3_SRC" ]]; then
    BS3_DEST_DIR="$PACKAGE_DIR/app/node_modules/better-sqlite3/build/Release"
    mkdir -p "$BS3_DEST_DIR"
    cp "$BS3_SRC" "$BS3_DEST_DIR/"
    BS3_NODE="$BS3_DEST_DIR/better_sqlite3.node"
    info "Copied better-sqlite3 native module"
  fi
fi

if [[ -n "${BS3_NODE:-}" ]] && [[ -f "$BS3_NODE" ]]; then
  file "$BS3_NODE" | grep -q "ELF.*x86-64" || die "better_sqlite3.node is not a Linux x64 ELF binary"
  BS3_PACKAGE_DIR="$(find "$PACKAGE_DIR/app/node_modules" -path "*/better-sqlite3/package.json" -type f 2>/dev/null | head -1 | xargs -r dirname)"
  [[ -n "$BS3_PACKAGE_DIR" ]] || die "better-sqlite3 package directory not found in package"

  if "$PACKAGE_DIR/runtime/node" -e "const Database=require('$BS3_PACKAGE_DIR'); const db=new Database(':memory:'); db.close();" >/dev/null 2>&1; then
    ok "better-sqlite3 loads OK with bundled Node.js"
  else
    info "Reinstalling better-sqlite3 native module for bundled Node.js ABI ${NODE_ABI}..."
    PREBUILD_INSTALL_BIN="$(find "$REPO_ROOT/node_modules/.pnpm" -path "*/prebuild-install/bin.js" -type f 2>/dev/null | head -1 || true)"
    [[ -n "$PREBUILD_INSTALL_BIN" ]] || die "prebuild-install not found; cannot install better-sqlite3 for bundled Node.js ABI ${NODE_ABI}"
    (
      cd "$BS3_PACKAGE_DIR"
      NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--no-deprecation" \
        node "$PREBUILD_INSTALL_BIN" -r node -t "$NODE_LINUX_VERSION" --platform linux --arch x64
    ) || die "Failed to install better-sqlite3 native module for Node.js ${NODE_LINUX_VERSION} ABI ${NODE_ABI}"
    BS3_NODE="$BS3_PACKAGE_DIR/build/Release/better_sqlite3.node"
    [[ -f "$BS3_NODE" ]] || die "better_sqlite3.node missing after ABI-targeted install"
    file "$BS3_NODE" | grep -q "ELF.*x86-64" || die "better_sqlite3.node after ABI-targeted install is not Linux x64 ELF"
    "$PACKAGE_DIR/runtime/node" -e "const Database=require('$BS3_PACKAGE_DIR'); const db=new Database(':memory:'); db.close();" >/dev/null 2>&1 \
      || die "better-sqlite3 still does not load with bundled Node.js after ABI-targeted install"
    ok "better-sqlite3 native module installed for bundled Node.js ABI ${NODE_ABI}"
  fi
else
  warn "better_sqlite3.node not found in package — SQLite persistence disabled"
fi

# ── Sharp + libvips: mandatory packaging from pnpm store ─────────────────────
# Root cause: Next.js standalone output trace copies .next/standalone/node_modules/
# but does NOT always follow .so files. The sharp optional native packages must
# be supplemented from the currently installed dependency graph.
info "Packaging Sharp native runtime from pnpm store (mandatory)..."

PNPM_STORE="$REPO_ROOT/node_modules/.pnpm"

resolve_sharp_path() {
  local key="$1"
  node - "$key" <<'NODE'
const fs = require("fs");
const path = require("path");

const key = process.argv[2];

function findPackageDir(start) {
  let dir = path.dirname(start);
  while (dir !== path.dirname(dir)) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) return dir;
    dir = path.dirname(dir);
  }
  throw new Error("Could not locate sharp package.json from " + start);
}

const sharpPackageDir = findPackageDir(require.resolve("sharp"));
const sharpPackageJson = JSON.parse(fs.readFileSync(path.join(sharpPackageDir, "package.json"), "utf8"));
const imgDir = path.resolve(sharpPackageDir, "..", "@img");
const sharpNativeDir = fs.realpathSync(path.join(imgDir, "sharp-linux-x64"));
const libvipsDir = fs.realpathSync(path.join(imgDir, "sharp-libvips-linux-x64"));

const values = {
  sharpPackageDir,
  sharpVersion: sharpPackageJson.version,
  sharpNativeDir,
  libvipsDir,
};

if (!values[key]) throw new Error("Unknown sharp path key: " + key);
process.stdout.write(values[key]);
NODE
}

SHARP_PACKAGE_DIR="$(resolve_sharp_path sharpPackageDir)"
SHARP_VERSION="$(resolve_sharp_path sharpVersion)"
SHARP_X64_SRC="$(resolve_sharp_path sharpNativeDir)"
LIBVIPS_SRC="$(resolve_sharp_path libvipsDir)"

[[ "$SHARP_PACKAGE_DIR" == "$PNPM_STORE/"* ]] || die "Sharp package is not under pnpm store: $SHARP_PACKAGE_DIR"
[[ "$SHARP_X64_SRC" == "$PNPM_STORE/"* ]] || die "Sharp native package is not under pnpm store: $SHARP_X64_SRC"
[[ "$LIBVIPS_SRC" == "$PNPM_STORE/"* ]] || die "Sharp libvips package is not under pnpm store: $LIBVIPS_SRC"

SHARP_PACKAGE_REL="${SHARP_PACKAGE_DIR#"$PNPM_STORE/"}"
SHARP_X64_REL="${SHARP_X64_SRC#"$PNPM_STORE/"}"
LIBVIPS_REL="${LIBVIPS_SRC#"$PNPM_STORE/"}"

SHARP_NODE_SRC="$(find "$SHARP_X64_SRC/lib" -maxdepth 1 -name 'sharp-linux-x64-*.node' -type f 2>/dev/null | sort | head -1 || true)"
LIBVIPS_SO_SRC="$(find "$LIBVIPS_SRC/lib" -maxdepth 1 -name 'libvips-cpp.so.*' -type f ! -type l 2>/dev/null | sort | head -1 || true)"

# Hard fail if sources are missing — do not silently degrade
[[ -n "$SHARP_NODE_SRC" && -f "$SHARP_NODE_SRC" ]] || die "MISSING: sharp-linux-x64 native module in $SHARP_X64_SRC/lib — run 'pnpm install --frozen-lockfile'"
[[ -n "$LIBVIPS_SO_SRC" && -f "$LIBVIPS_SO_SRC" ]] || die "MISSING: libvips-cpp.so in $LIBVIPS_SRC/lib — run 'pnpm install --frozen-lockfile'"

# Validate source files are ELF x86-64 before copying
file "$SHARP_NODE_SRC" | grep -q "ELF.*x86-64" || die "$(basename "$SHARP_NODE_SRC") source is not ELF x86-64"
file "$LIBVIPS_SO_SRC" | grep -q "ELF.*x86-64" || die "$(basename "$LIBVIPS_SO_SRC") source is not ELF x86-64"

copy_pnpm_package_dir() {
  local src="$1"
  local rel="${src#"$PNPM_STORE/"}"
  local dest="$PACKAGE_DIR/app/node_modules/.pnpm/$rel"
  mkdir -p "$(dirname "$dest")"
  rm -rf "$dest"
  cp -a "$src" "$dest"
}

copy_pnpm_symlinks() {
  local src_dir="$1"
  local rel_dir="${src_dir#"$PNPM_STORE/"}"
  local dest_dir="$PACKAGE_DIR/app/node_modules/.pnpm/$rel_dir"
  mkdir -p "$dest_dir"
  find "$src_dir" -mindepth 1 -maxdepth 1 -type l -print0 | while IFS= read -r -d '' link; do
    local name
    name="$(basename "$link")"
    rm -f "$dest_dir/$name"
    cp -P "$link" "$dest_dir/$name"
  done
}

# Mirror the actual pnpm package directories. This physically places the native
# .node and .so files in the package and keeps the same relative symlink layout.
copy_pnpm_package_dir "$SHARP_X64_SRC"
copy_pnpm_package_dir "$LIBVIPS_SRC"
copy_pnpm_symlinks "$(dirname "$SHARP_PACKAGE_DIR")/@img"
copy_pnpm_symlinks "$(dirname "$SHARP_X64_SRC")"

# Ensure top-level node_modules/sharp exists when standalone tracing omits the
# workspace symlink but includes the pnpm package body.
SHARP_TOP_LINK="$PACKAGE_DIR/app/node_modules/sharp"
if [[ ! -e "$SHARP_TOP_LINK" && ! -L "$SHARP_TOP_LINK" ]]; then
  mkdir -p "$(dirname "$SHARP_TOP_LINK")"
  ln -s ".pnpm/$SHARP_PACKAGE_REL" "$SHARP_TOP_LINK"
fi

# Mandatory post-copy validation
LIBVIPS_SO_PKG="$PACKAGE_DIR/app/node_modules/.pnpm/$LIBVIPS_REL/lib/$(basename "$LIBVIPS_SO_SRC")"
[[ -f "$LIBVIPS_SO_PKG" ]] || die "$(basename "$LIBVIPS_SO_SRC") still missing after copy — check pnpm store"
[[ -L "$LIBVIPS_SO_PKG" ]] && die "$(basename "$LIBVIPS_SO_SRC") is a symlink — must be a real file in the package"
file "$LIBVIPS_SO_PKG" | grep -q "ELF.*x86-64" || die "$(basename "$LIBVIPS_SO_SRC") in package is not ELF x86-64"

# Validate sharp .node is present
SHARP_NODE="$PACKAGE_DIR/app/node_modules/.pnpm/$SHARP_X64_REL/lib/$(basename "$SHARP_NODE_SRC")"
[[ -f "$SHARP_NODE" ]] || die "$(basename "$SHARP_NODE_SRC") not found in package after copy"
file "$SHARP_NODE" | grep -q "ELF.*x86-64" || die "$(basename "$SHARP_NODE_SRC") in package is not ELF x86-64"

# ldd check: RPATH in the .node uses $ORIGIN/../../sharp-libvips-linux-x64/lib/
# After our copy the symlink resolves to the package's libvips lib/ where .so now lives.
if command -v ldd >/dev/null 2>&1; then
  LDD_OUT="$(ldd "$SHARP_NODE" 2>&1 || true)"
  if echo "$LDD_OUT" | grep -q "not found"; then
    UNRESOLVED="$(echo "$LDD_OUT" | grep "not found")"
    die "sharp .node has unresolved dynamic dependencies:\n$UNRESOLVED"
  else
    ok "sharp .node dynamic deps OK (ldd — no 'not found')"
  fi
fi

ok "Sharp ${SHARP_VERSION} native runtime packaged ($(basename "$SHARP_NODE_SRC"), $(basename "$LIBVIPS_SO_SRC"))"

# Verify: no .dll files in Linux package (Windows artifacts)
DLL_COUNT=$(find "$PACKAGE_DIR" -name "*.dll" | wc -l)
if [[ "$DLL_COUNT" -gt 0 ]]; then
  die "Windows .dll files found in Linux package (count: $DLL_COUNT)"
fi
ok "No .dll files in package (OK)"

# ── Detect available system tools ─────────────────────────────────────────────
info "Detecting system tools..."

declare -A TOOL_VERSIONS=()
declare -A TOOLS_BUNDLED=()

detect_tool() {
  local name="$1" bin="$2"
  if command -v "$bin" >/dev/null 2>&1; then
    TOOL_VERSIONS["$name"]="$("$bin" --version 2>&1 | head -1 | sed 's/\x1b\[[0-9;]*m//g' || echo 'detected')"
    TOOLS_BUNDLED["$name"]="system"
  else
    TOOL_VERSIONS["$name"]="not-found"
    TOOLS_BUNDLED["$name"]="absent"
  fi
}

detect_tool "ffmpeg"    "ffmpeg"
detect_tool "ffprobe"   "ffprobe"
detect_tool "yt-dlp"   "yt-dlp"
detect_tool "qpdf"      "qpdf"
detect_tool "7z"        "7zz"
[[ "${TOOLS_BUNDLED["7z"]}" == "absent" ]] && detect_tool "7z" "7z"
detect_tool "pandoc"    "pandoc"
detect_tool "tesseract" "tesseract"
detect_tool "pdftoppm"  "pdftoppm"
detect_tool "calibre"   "calibredb"

for t in ffmpeg ffprobe yt-dlp qpdf 7z; do
  if [[ "${TOOLS_BUNDLED[$t]}" == "absent" ]]; then
    warn "Tool '$t' not available on this system — capability will be disabled"
  else
    ok "$t: ${TOOL_VERSIONS[$t]}"
  fi
done

# ── Compute capabilities from actually available tools ────────────────────────
CAPABILITIES="[]"
CAPS=()
# Data Engine is always available (pure Node)
CAPS+=("\"data\"")
# Sharp always bundled
[[ -n "${SHARP_NODE:-}" ]] && CAPS+=("\"image\"")
# SQLite always bundled
[[ -n "${BS3_NODE:-}" ]] && CAPS+=("\"history\"")
[[ "${TOOLS_BUNDLED["ffmpeg"]}" == "system" ]] && CAPS+=("\"audio\"" "\"video\"" "\"thumbnail\"")
[[ "${TOOLS_BUNDLED["yt-dlp"]}" == "system" ]] && CAPS+=("\"youtube\"")
[[ "${TOOLS_BUNDLED["qpdf"]}" == "system" ]] && CAPS+=("\"pdf\"")
[[ "${TOOLS_BUNDLED["7z"]}" == "system" ]] && CAPS+=("\"archive\"")
[[ "${TOOLS_BUNDLED["pandoc"]}" == "system" ]] && CAPS+=("\"document\"")
[[ "${TOOLS_BUNDLED["tesseract"]}" == "system" ]] && CAPS+=("\"ocr\"")
[[ "${TOOLS_BUNDLED["calibre"]}" == "system" ]] && CAPS+=("\"ebook\"")
CAPABILITIES="[$(IFS=,; echo "${CAPS[*]}")]"

# ── Tools manifest (only what's actually present) ─────────────────────────────
# Write tool entries to a temp JSON file to avoid shell quoting issues with version strings
TOOLS_JSON_FILE="$(mktemp /tmp/anclora-tools-XXXXXX.json)"
trap "rm -f '$TOOLS_JSON_FILE'" EXIT
python3 - "$TOOLS_JSON_FILE" << 'PYTOOLS'
import sys, json, subprocess, shutil

tools = [
  ("ffmpeg",     "ffmpeg"),
  ("ffprobe",    "ffprobe"),
  ("yt-dlp",     "yt-dlp"),
  ("qpdf",       "qpdf"),
  ("7z",         "7zz"),
  ("7z",         "7z"),
  ("pandoc",     "pandoc"),
  ("tesseract",  "tesseract"),
  ("pdftoppm",   "pdftoppm"),
  ("calibre",    "calibredb"),
]

seen = set()
out = []
for tool_id, binary in tools:
  if tool_id in seen:
    continue
  path = shutil.which(binary)
  if path:
    try:
      ver = subprocess.run([binary, "--version"], capture_output=True, text=True, timeout=5)
      version_line = (ver.stdout or ver.stderr or "").splitlines()[0].strip()
    except Exception:
      version_line = "detected"
    out.append({"id": tool_id, "source": "system", "version": version_line})
    seen.add(tool_id)

json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False)
print(f"Tool manifest: {len(out)} tools")
PYTOOLS

TOOLS_JSON="$(cat "$TOOLS_JSON_FILE")"

# ── Launchers ─────────────────────────────────────────────────────────────────
info "Creating launchers..."

cat > "$PACKAGE_DIR/start-anclora-filestudio.sh" << 'LAUNCH'
#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$DIR/runtime/node"

# Self-contained: use the bundled Node.js runtime
if [[ ! -x "$NODE" ]]; then
  echo "[ERROR] runtime/node not found at $NODE"
  echo "        Re-extract the package from the original archive."
  exit 1
fi

export ANCLORA_FILESTUDIO_DATA_DIR="$DIR/data"
export ANCLORA_FILESTUDIO_TEMP_DIR="$DIR/temp"
export ANCLORA_FILESTUDIO_LOG_DIR="$DIR/logs"
export ANCLORA_FILESTUDIO_TOOLS_DIR="$DIR/tools"
export NODE_ENV="production"

# Port selection: use env or find a free port in range 3847-3857
if [[ -z "${ANCLORA_FILESTUDIO_PORT:-}" ]]; then
  for p in 3847 3848 3849 3850 3851 3852 3853 3854 3855 3856 3857; do
    if ! ss -ltn 2>/dev/null | grep -q ":$p " && \
       ! netstat -ltn 2>/dev/null | grep -q ":$p "; then
      ANCLORA_FILESTUDIO_PORT="$p"
      break
    fi
  done
  : "${ANCLORA_FILESTUDIO_PORT:=3847}"
fi
export PORT="$ANCLORA_FILESTUDIO_PORT"
export HOSTNAME="127.0.0.1"

mkdir -p "$DIR/data" "$DIR/temp" "$DIR/logs"

PID_FILE="$DIR/anclora-filestudio.pid"

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE")"
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Anclora FileStudio ya está corriendo (PID $OLD_PID)"
    echo "Usa ./stop-anclora-filestudio.sh primero."
    exit 1
  else
    rm -f "$PID_FILE"
  fi
fi

cd "$DIR/app"
echo "Iniciando Anclora FileStudio en http://127.0.0.1:$PORT ..."
"$NODE" server.js >> "$DIR/logs/app.log" 2>&1 &
APP_PID="$!"
echo "$APP_PID" > "$PID_FILE"

# Wait for health endpoint
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    echo "Listo en http://127.0.0.1:$PORT (PID $APP_PID)"
    xdg-open "http://127.0.0.1:$PORT" 2>/dev/null || true
    exit 0
  fi
  sleep 1
done

echo "La app tardó demasiado en responder. Revisa logs/app.log"
exit 1
LAUNCH

cat > "$PACKAGE_DIR/stop-anclora-filestudio.sh" << 'STOP'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/anclora-filestudio.pid"
if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE")"
  if kill -0 "$PID" 2>/dev/null; then
    # Kill only this specific process tree, not all node processes
    kill -- "-$(ps -o pgid= -p "$PID" 2>/dev/null | tr -d ' ')" 2>/dev/null || kill "$PID" 2>/dev/null || true
    echo "Anclora FileStudio detenido (PID $PID)"
  else
    echo "El proceso $PID ya no está corriendo"
  fi
  rm -f "$PID_FILE"
else
  echo "No se encontró PID file — la app puede no estar corriendo"
fi
STOP

cat > "$PACKAGE_DIR/diagnose-anclora-filestudio.sh" << 'DIAG'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$DIR/runtime/node"
echo "=== Anclora FileStudio — Diagnóstico ==="
echo ""
echo "--- Directorio ---"
echo "Raíz: $DIR"
df -h "$DIR" | tail -1
echo ""
echo "--- Runtime (bundled) ---"
if [[ -f "$DIR/app/server.js" ]]; then
  echo "server.js: OK"
else
  echo "server.js: FALTA"
fi
if [[ -x "$NODE" ]]; then
  echo "Node.js (bundled): $("$NODE" --version)"
else
  echo "Node.js (bundled): NO ENCONTRADO (runtime/node)"
fi
echo ""
echo "--- Módulos nativos ---"
BS3="$(find "$DIR/app" -name 'better_sqlite3.node' 2>/dev/null | head -1)"
[[ -n "$BS3" ]] && echo "better-sqlite3: OK ($BS3)" || echo "better-sqlite3: NO ENCONTRADO"
SHARP="$(find "$DIR/app" -name 'sharp*.node' 2>/dev/null | head -1)"
[[ -n "$SHARP" ]] && echo "sharp: OK" || echo "sharp: NO ENCONTRADO"
echo ""
echo "--- Herramientas del sistema ---"
for cmd in ffmpeg ffprobe yt-dlp qpdf 7zz 7z pandoc tesseract pdftoppm calibredb; do
  if command -v "$cmd" >/dev/null 2>&1; then
    VER="$("$cmd" --version 2>&1 | head -1)"
    echo "$cmd: $VER"
  else
    echo "$cmd: NO INSTALADO"
  fi
done
echo ""
echo "--- Estado ---"
PID_FILE="$DIR/anclora-filestudio.pid"
if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Proceso: CORRIENDO (PID $(cat "$PID_FILE"))"
else
  echo "Proceso: NO CORRIENDO"
fi
echo ""
echo "--- Manifest ---"
[[ -f "$DIR/manifest.json" ]] && cat "$DIR/manifest.json" | python3 -m json.tool 2>/dev/null || cat "$DIR/manifest.json"
DIAG

chmod +x "$PACKAGE_DIR/start-anclora-filestudio.sh" \
         "$PACKAGE_DIR/stop-anclora-filestudio.sh" \
         "$PACKAGE_DIR/diagnose-anclora-filestudio.sh"

ok "Launchers created"

# ── VERSION.txt ───────────────────────────────────────────────────────────────
printf "Anclora FileStudio %s\nBuild: %s\nDate: %s\nCommit: %s\nPlatform: linux-x64\n" \
  "$VERSION" "$BUILD_ID" "$BUILD_DATE" "$GIT_COMMIT" > "$PACKAGE_DIR/VERSION.txt"

# ── LEEME.txt ─────────────────────────────────────────────────────────────────
cat > "$PACKAGE_DIR/LEEME.txt" << README
Anclora FileStudio ${VERSION} — Linux x64 Portable
===================================================

INICIO:
  ./start-anclora-filestudio.sh

PARADA:
  ./stop-anclora-filestudio.sh

DIAGNÓSTICO:
  ./diagnose-anclora-filestudio.sh

REQUISITOS DEL SISTEMA:
  - Node.js 20+ (ya incluido en el standalone de la app)
  - glibc 2.31+ (Ubuntu 20.04+, Debian 11+, cualquier distribución moderna)

HERRAMIENTAS OPCIONALES (instalar con apt o el gestor de paquetes del sistema):
  sudo apt install ffmpeg yt-dlp qpdf p7zip-full
  sudo apt install pandoc tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng poppler-utils

DATOS:
  Los datos se guardan en ./data/ — no borres esta carpeta al actualizar.
  Los logs se escriben en ./logs/

PUERTOS:
  La aplicación escucha solo en 127.0.0.1 (loopback).
  Puerto por defecto: 3847 (configurable con ANCLORA_FILESTUDIO_PORT).

SOPORTE: https://github.com/ToniIAPro73/Anclora-FileStudio
README

# ── manifest.json ─────────────────────────────────────────────────────────────
info "Generating manifest.json..."

python3 << PYEOF
import json, os

tools_json = json.load(open("$TOOLS_JSON_FILE"))
caps = json.loads('$CAPABILITIES')
tree_clean = "$SOURCE_TREE_CLEAN" == "true"

bs3_node = "$BS3_NODE"
sharp_node = "$SHARP_NODE"

manifest = {
  "name": "Anclora FileStudio",
  "version": "$VERSION",
  "buildId": "$BUILD_ID",
  "buildDate": "$BUILD_DATE",
  "commit": "$GIT_COMMIT",
  "commitFull": "$GIT_COMMIT",
  "source": {
    "commit": "$GIT_COMMIT",
    "shortCommit": "$BUILD_ID",
    "treeCleanExcludingKnownArtifacts": tree_clean,
    "knownExcludedDirtyPaths": ["artifacts/route-ranking/benchmark-results.json"]
  },
  "platform": "linux",
  "arch": "x64",
  "packageName": "$PACKAGE_NAME",
  "toolchainId": "anclora-filestudio-linux-x64-v1",
  "runtime": {
    "engine": "node",
    "version": "$NODE_VERSION",
    "abi": "$NODE_ABI",
    "source": "system"
  },
  "components": {
    "nextStandalone": True,
    "dataEngine": True,
    "betterSqlite3": bool(bs3_node and os.path.exists(bs3_node)),
    "sharp": bool(sharp_node and os.path.exists(sharp_node))
  },
  "tools": tools_json,
  "capabilities": caps,
  "licenses": [
    {"id": "MIT", "component": "Anclora FileStudio"},
    {"id": "MIT", "component": "Node.js"},
    {"id": "MIT", "component": "Next.js"},
    {"id": "MIT", "component": "better-sqlite3"},
    {"id": "Apache-2.0", "component": "sharp"}
  ],
  "distribution": "Core",
  "notes": "External tools (ffmpeg, yt-dlp, qpdf, etc.) must be installed separately on Linux."
}

with open("$PACKAGE_DIR/manifest.json", "w") as f:
    json.dump(manifest, f, indent=2)

print(f"manifest.json: {len(caps)} capabilities, {len(tools_json)} tools")
PYEOF

ok "manifest.json generated"

# ── THIRD_PARTY_NOTICES.txt ───────────────────────────────────────────────────
cp "$REPO_ROOT/THIRD_PARTY_NOTICES.txt" "$PACKAGE_DIR/THIRD_PARTY_NOTICES.txt" 2>/dev/null || \
  echo "Anclora FileStudio includes open source software. See licenses/ directory." \
    > "$PACKAGE_DIR/THIRD_PARTY_NOTICES.txt"

# Copy license files if present
cp -r "$REPO_ROOT/licenses" "$PACKAGE_DIR/licenses/" 2>/dev/null || true

# ── SBOM (minimal CycloneDX) ──────────────────────────────────────────────────
cat > "$PACKAGE_DIR/SBOM.cdx.json" << SBOM
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.4",
  "version": 1,
  "metadata": {
    "timestamp": "$BUILD_DATE",
    "component": {
      "type": "application",
      "name": "Anclora FileStudio",
      "version": "$VERSION"
    }
  },
  "components": [
    {"type":"library","name":"next","version":"$(node -p "require('$REPO_ROOT/node_modules/next/package.json').version" 2>/dev/null || echo 'unknown')","licenses":[{"license":{"id":"MIT"}}]},
    {"type":"library","name":"react","version":"$(node -p "require('$REPO_ROOT/node_modules/react/package.json').version" 2>/dev/null || echo 'unknown')","licenses":[{"license":{"id":"MIT"}}]},
    {"type":"library","name":"better-sqlite3","version":"$(node -p "require('$REPO_ROOT/node_modules/better-sqlite3/package.json').version" 2>/dev/null || echo 'unknown')","licenses":[{"license":{"id":"MIT"}}]},
    {"type":"library","name":"sharp","version":"$(node -p "require('$REPO_ROOT/node_modules/sharp/package.json').version" 2>/dev/null || echo 'unknown')","licenses":[{"license":{"id":"Apache-2.0"}}]}
  ]
}
SBOM

# ── Verify no developer paths leaked ─────────────────────────────────────────
info "Checking for developer path leakage..."

DEV_PATH_REGEX='(/home/[^[:space:]"'"'"'<>]*/[^[:space:]"'"'"'<>]*/anclora/|/workspace/anclora/|/home/toni/)'
DEV_PATH_FOUND="$(LC_ALL=C grep -IRnE "$DEV_PATH_REGEX" "$PACKAGE_DIR" \
    --exclude-dir=data --exclude-dir=temp --exclude-dir=logs \
    --exclude="*.node" --exclude="*.tar.zst" \
    2>/dev/null | head -20 || true)"
if [[ -n "$DEV_PATH_FOUND" ]]; then
  echo "$DEV_PATH_FOUND"
  die "Developer workspace path found in Linux portable package"
fi
ok "No developer workspace paths found in package"

# ── Check: no .env.local or secrets ──────────────────────────────────────────
find "$PACKAGE_DIR" \( -name ".env.local" -o -name ".env" -o -name "*.pem" -o -name "*.key" \) -type f 2>/dev/null | while read -r f; do
  die "Secret file found in package: $f"
done
ok "No secrets found in package"

# ── Check: no .git directory ─────────────────────────────────────────────────
[[ -d "$PACKAGE_DIR/.git" ]] && die ".git directory found in package"
find "$PACKAGE_DIR" -name ".git" -type d 2>/dev/null | head -1 | grep -q . && die ".git found in package" || ok "No .git in package"

# ── Fix executable permissions ────────────────────────────────────────────────
chmod +x "$PACKAGE_DIR"/*.sh

# ── Package ────────────────────────────────────────────────────────────────────
mkdir -p "$DIST_DIR"

export SOURCE_DATE_EPOCH="$(git -C "$REPO_ROOT" log -1 --format=%ct 2>/dev/null || date +%s)"

if [[ "$USE_ZSTD" -eq 1 ]]; then
  info "Creating tar.zst package..."
  rm -f "$TAR_FILE" "$SHA_FILE"
  tar -C "$STAGING_BASE" \
    --sort=name \
    --mtime="@${SOURCE_DATE_EPOCH}" \
    --owner=0 \
    --group=0 \
    --numeric-owner \
    -cf - "$PACKAGE_NAME/" | zstd -T0 -19 -o "$TAR_FILE"
  PACKAGE_ARCHIVE_NAME="${PACKAGE_NAME}.tar.zst"
else
  TAR_FILE="$DIST_DIR/${PACKAGE_NAME}.tar.gz"
  SHA_FILE="$TAR_FILE.sha256"
  info "Creating tar.gz package..."
  rm -f "$TAR_FILE" "$SHA_FILE"
  tar -C "$STAGING_BASE" \
    --sort=name \
    --mtime="@${SOURCE_DATE_EPOCH}" \
    --owner=0 \
    --group=0 \
    --numeric-owner \
    -czf "$TAR_FILE" "$PACKAGE_NAME/"
  PACKAGE_ARCHIVE_NAME="${PACKAGE_NAME}.tar.gz"
fi

SHA="$(sha256sum "$TAR_FILE" | awk '{print $1}')"
echo "$SHA  ${PACKAGE_ARCHIVE_NAME}" > "$SHA_FILE"

SIZE="$(du -sh "$TAR_FILE" | awk '{print $1}')"

ok ""
ok "=== Build complete ==="
ok "Package : $TAR_FILE"
ok "Size    : $SIZE"
ok "SHA-256 : $SHA"
ok "Verify  : sha256sum -c $SHA_FILE"
