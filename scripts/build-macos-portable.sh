#!/usr/bin/env bash
# build-macos-portable.sh — Builds Anclora FileStudio macOS arm64 (Apple Silicon) portable package.
# Produces: dist/macos/Anclora-FileStudio-macOS-arm64.zip + .sha256
# Does NOT modify Git state. Does NOT push. Does NOT create commits.
# Does NOT require sudo. Does NOT copy host libraries into runtime/.
# Architecture mirrors build-linux-portable.sh: Next.js standalone + bundled
# Node.js runtime + native modules (sharp, better-sqlite3) built for the
# target ABI, with optional external tools (ffmpeg, pandoc, qpdf, tesseract,
# poppler, yt-dlp, 7z) detected from the build host (Homebrew on macOS,
# equivalent to apt on Linux) rather than statically bundled. This is a
# deliberate scope decision, not a technical blocker — see docs/portable-macos.md.

set -euo pipefail

# ── Root detection (no hardcoded paths) ───────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Outputs ───────────────────────────────────────────────────────────────────
DIST_DIR="$REPO_ROOT/dist/macos"
PACKAGE_NAME="Anclora-FileStudio-macOS-arm64"
STAGING_BASE="$SCRIPT_DIR/.staging/macos"
PACKAGE_DIR="$STAGING_BASE/$PACKAGE_NAME"
ZIP_FILE="$DIST_DIR/${PACKAGE_NAME}.zip"
SHA_FILE="$ZIP_FILE.sha256"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

echo "=== Anclora FileStudio — macOS arm64 Portable Build ==="

[[ "$(uname -s)" == "Darwin" ]] || die "This script must run on macOS (got: $(uname -s))"
[[ "$(uname -m)" == "arm64" ]] || die "This script must run on Apple Silicon (arm64); got: $(uname -m)"

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

info "Version: $VERSION | Build: $BUILD_ID | Date: $BUILD_DATE"
echo ""

# ── Read toolchain.lock.json ──────────────────────────────────────────────────
LOCKFILE="$SCRIPT_DIR/toolchain.lock.json"
[[ -f "$LOCKFILE" ]] || die "toolchain.lock.json not found at $LOCKFILE"

NODE_DARWIN_VERSION="$(python3 -c "import json; d=json.load(open('$LOCKFILE')); print(d['runtimes']['darwin-arm64']['version'])")"
NODE_DARWIN_SHA256="$(python3 -c "import json; d=json.load(open('$LOCKFILE')); print(d['runtimes']['darwin-arm64']['sha256'])")"
NODE_DARWIN_URL="$(python3 -c "import json; d=json.load(open('$LOCKFILE')); print(d['runtimes']['darwin-arm64']['sourceUrl'])")"
NODE_ABI_EXPECTED="$(python3 -c "import json; d=json.load(open('$LOCKFILE')); print(d['runtimes']['darwin-arm64']['abi'])")"
NODE_DARWIN_TAR="node-v${NODE_DARWIN_VERSION}-darwin-arm64.tar.gz"
NODE_CACHE_DIR="$SCRIPT_DIR/.cache/macos-portable"
NODE_CACHE="$NODE_CACHE_DIR/$NODE_DARWIN_TAR"

info "Toolchain: Node.js v${NODE_DARWIN_VERSION} (ABI ${NODE_ABI_EXPECTED}) darwin-arm64"

# ── Prerequisites ─────────────────────────────────────────────────────────────
info "Checking prerequisites..."
command -v node >/dev/null 2>&1 || die "Node.js not found (needed for build only)"
if command -v pnpm >/dev/null 2>&1; then
  PKG_MGR="pnpm"
elif command -v npm >/dev/null 2>&1; then
  PKG_MGR="npm"
else
  die "Neither pnpm nor npm found"
fi
command -v zip >/dev/null 2>&1 || die "zip not found (required to produce the .zip artifact)"
command -v shasum >/dev/null 2>&1 || die "shasum not found"
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
info "Preparing Node.js v${NODE_DARWIN_VERSION} runtime cache..."
mkdir -p "$NODE_CACHE_DIR"

if [[ ! -f "$NODE_CACHE" ]]; then
  info "Downloading $NODE_DARWIN_TAR from nodejs.org..."
  curl --fail --location --retry 3 --progress-bar \
    -o "$NODE_CACHE" "$NODE_DARWIN_URL" \
    || { rm -f "$NODE_CACHE"; die "Failed to download Node.js darwin-arm64 tarball"; }
fi

# Verify SHA-256
ACTUAL_SHA="$(shasum -a 256 "$NODE_CACHE" | awk '{print $1}')"
if [[ "$ACTUAL_SHA" != "$NODE_DARWIN_SHA256" ]]; then
  die "Node.js tarball SHA-256 mismatch! Expected: $NODE_DARWIN_SHA256 Got: $ACTUAL_SHA"
fi
ok "Node.js v${NODE_DARWIN_VERSION} tarball verified (SHA-256 OK)"

# ── Clean and prepare staging ─────────────────────────────────────────────────
info "Preparing staging directory..."
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"/{app,runtime,tools,data,temp,logs,licenses}

# ── Embed Node.js binary into runtime/ ───────────────────────────────────────
info "Extracting node binary into runtime/..."
TMP_NODE_EXTRACT="$(mktemp -d)"
tar -C "$TMP_NODE_EXTRACT" -xzf "$NODE_CACHE" "node-v${NODE_DARWIN_VERSION}-darwin-arm64/bin/node" 2>/dev/null \
  || die "Failed to extract node binary from tarball"
cp "$TMP_NODE_EXTRACT/node-v${NODE_DARWIN_VERSION}-darwin-arm64/bin/node" "$PACKAGE_DIR/runtime/node"
rm -rf "$TMP_NODE_EXTRACT"
chmod +x "$PACKAGE_DIR/runtime/node"
file "$PACKAGE_DIR/runtime/node" | grep -qE "Mach-O.*arm64|ARM64" || die "runtime/node is not a Mach-O arm64 binary"
ok "runtime/node — Mach-O arm64 — Node.js v${NODE_DARWIN_VERSION}"

# ── Detect ABI using bundled node ─────────────────────────────────────────────
NODE_VERSION="$("$PACKAGE_DIR/runtime/node" --version)"
NODE_ABI="$("$PACKAGE_DIR/runtime/node" -e 'console.log(process.versions.modules)')"
[[ "$NODE_ABI" == "$NODE_ABI_EXPECTED" ]] || warn "ABI mismatch: expected $NODE_ABI_EXPECTED got $NODE_ABI"
info "Bundled Node.js $NODE_VERSION (ABI $NODE_ABI)"

# ── Copy Next.js standalone (whitelist approach) ──────────────────────────────
info "Copying Next.js standalone (whitelist)..."

cp "$STANDALONE/server.js" "$PACKAGE_DIR/app/server.js"

if [[ -d "$STANDALONE/node_modules" ]]; then
  cp -r "$STANDALONE/node_modules" "$PACKAGE_DIR/app/node_modules"
fi

mkdir -p "$PACKAGE_DIR/app/.next"
if [[ -d "$STANDALONE/.next" ]]; then
  find "$STANDALONE/.next" -mindepth 1 -maxdepth 1 \
    ! -name "cache" | while read -r item; do
    cp -r "$item" "$PACKAGE_DIR/app/.next/"
  done
fi

if [[ -d "$STATIC_DIR" ]]; then
  rm -rf "$PACKAGE_DIR/app/.next/static"
  cp -r "$STATIC_DIR" "$PACKAGE_DIR/app/.next/static"
fi

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

info "Checking Next.js runtime external references..."
python3 "$SCRIPT_DIR/next-runtime-refs.py" fix "$PACKAGE_DIR/app" "$REPO_ROOT"
ok "Next.js runtime externals complete"

# ── Auto-heal Next.js runtime dependencies untraced by the standalone tracer ─
# The Next.js file tracer follows static requires but misses some of next's
# own runtime-computed requires (observed: @swc/helpers, @next/env, postcss,
# styled-jsx, ...). Rather than hardcoding each one, boot-probe `require('next')`
# + the start-server entry point actually used by server.js, and on
# MODULE_NOT_FOUND copy the missing package whole from the pnpm store, then
# retry. Bounded iteration count — a real unresolvable gap still fails loudly.
info "Auto-healing untraced Next.js runtime dependencies..."
for _heal_attempt in $(seq 1 15); do
  HEAL_RESULT="$(cd "$PACKAGE_DIR/app" && "$PACKAGE_DIR/runtime/node" -e "
try {
  require('next');
  require('next/dist/server/lib/start-server');
  console.log('HEAL_OK');
} catch (e) {
  if (e.code === 'MODULE_NOT_FOUND') {
    const m = /Cannot find module '([^']+)'/.exec(e.message);
    const requirer = (e.requireStack && e.requireStack[0]) || '';
    console.log('HEAL_MISSING ' + (m ? m[1] : '') + '\t' + requirer);
  } else {
    console.log('HEAL_FATAL ' + e.message.split(String.fromCharCode(10))[0]);
  }
}
" 2>&1)"

  if [[ "$HEAL_RESULT" == "HEAL_OK" ]]; then
    ok "Next.js runtime dependencies resolve cleanly (after $((_heal_attempt - 1)) auto-heal fix(es))"
    break
  fi

  HEAL_LINE="$(echo "$HEAL_RESULT" | grep -m1 '^HEAL_MISSING ')"
  if [[ -z "$HEAL_LINE" ]]; then
    die "Next.js runtime boot-probe failed with an unresolvable error: $HEAL_RESULT"
  fi
  MISSING_SPEC="$(echo "$HEAL_LINE" | sed 's/^HEAL_MISSING //' | cut -f1)"
  REQUIRER_FILE="$(echo "$HEAL_LINE" | cut -f2)"

  if [[ "$MISSING_SPEC" == .* ]]; then
    # Relative specifier: the requiring file's own package is present but
    # incomplete (the tracer copied some files, not all). Find that
    # package's root (nearest ancestor with package.json) and its name,
    # then re-copy the whole package fresh from the pnpm store.
    [[ -n "$REQUIRER_FILE" ]] || die "Auto-heal: relative specifier '$MISSING_SPEC' with no requireStack — cannot locate owning package"
    OWNER_DIR="$(dirname "$REQUIRER_FILE")"
    while [[ "$OWNER_DIR" != "/" && ! -f "$OWNER_DIR/package.json" ]]; do
      OWNER_DIR="$(dirname "$OWNER_DIR")"
    done
    [[ -f "$OWNER_DIR/package.json" ]] || die "Auto-heal: could not find package.json above $REQUIRER_FILE"
    MISSING_PKG="$(python3 -c "import json; print(json.load(open('$OWNER_DIR/package.json'))['name'])")"
  elif [[ "$MISSING_SPEC" == @*/* ]]; then
    MISSING_PKG="$(echo "$MISSING_SPEC" | cut -d/ -f1-2)"
  else
    MISSING_PKG="$(echo "$MISSING_SPEC" | cut -d/ -f1)"
  fi

  MISSING_DEST="$PACKAGE_DIR/app/node_modules/$MISSING_PKG"
  MISSING_PKG_STORE_GLOB="$(echo "$MISSING_PKG" | sed 's/\//+/')"
  MISSING_SRC="$(find "$REPO_ROOT/node_modules/.pnpm" -maxdepth 1 -iname "${MISSING_PKG_STORE_GLOB}@*" -type d 2>/dev/null | sort | tail -1)"
  [[ -n "$MISSING_SRC" ]] || die "Auto-heal: '$MISSING_PKG' (needed for '$MISSING_SPEC') not found in the pnpm store"
  MISSING_PKG_DIR="$MISSING_SRC/node_modules/$MISSING_PKG"
  [[ -d "$MISSING_PKG_DIR" ]] || die "Auto-heal: package directory missing under $MISSING_SRC for '$MISSING_PKG'"

  rm -rf "$MISSING_DEST"
  mkdir -p "$(dirname "$MISSING_DEST")"
  cp -a "$MISSING_PKG_DIR" "$MISSING_DEST"
  ok "Auto-heal: (re)copied '$MISSING_PKG' into app/node_modules (needed for '$MISSING_SPEC')"

  if [[ "$_heal_attempt" -eq 15 ]]; then
    die "Auto-heal did not converge after 15 attempts — last missing spec: $MISSING_SPEC"
  fi
done

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

node -e "
const pkg = require('$REPO_ROOT/package.json');
const min = { name: pkg.name, version: pkg.version, private: true };
require('fs').writeFileSync('$PACKAGE_DIR/app/package.json', JSON.stringify(min, null, 2));
"

info "Removing dev-only Playwright wrapper package..."
rm -rf "$PACKAGE_DIR/app/node_modules/playwright"
find "$PACKAGE_DIR/app/node_modules" -path "*/node_modules/playwright" -type d -prune -exec rm -rf {} + 2>/dev/null || true
ok "Dev-only Playwright wrapper removed; playwright-core retained for renderer runtime"

# ── Validate native modules for darwin-arm64 ─────────────────────────────────
info "Validating native modules (darwin-arm64)..."

BS3_NODE=$(find "$PACKAGE_DIR/app" -name "better_sqlite3.node" -type f 2>/dev/null | head -1)
if [[ -z "$BS3_NODE" ]]; then
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
  file "$BS3_NODE" | grep -qE "Mach-O.*arm64|ARM64" || die "better_sqlite3.node is not a macOS arm64 Mach-O binary"
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
        node "$PREBUILD_INSTALL_BIN" -r node -t "$NODE_DARWIN_VERSION" --platform darwin --arch arm64
    ) || die "Failed to install better-sqlite3 native module for Node.js ${NODE_DARWIN_VERSION} ABI ${NODE_ABI}"
    BS3_NODE="$BS3_PACKAGE_DIR/build/Release/better_sqlite3.node"
    [[ -f "$BS3_NODE" ]] || die "better_sqlite3.node missing after ABI-targeted install"
    file "$BS3_NODE" | grep -qE "Mach-O.*arm64|ARM64" || die "better_sqlite3.node after ABI-targeted install is not macOS arm64 Mach-O"
    "$PACKAGE_DIR/runtime/node" -e "const Database=require('$BS3_PACKAGE_DIR'); const db=new Database(':memory:'); db.close();" >/dev/null 2>&1 \
      || die "better-sqlite3 still does not load with bundled Node.js after ABI-targeted install"
    ok "better-sqlite3 native module installed for bundled Node.js ABI ${NODE_ABI}"
  fi
else
  warn "better_sqlite3.node not found in package — SQLite persistence disabled"
fi

# ── Repair the Turbopack-externalized better-sqlite3 stub ────────────────────
# Turbopack externalizes better-sqlite3 into a content-hashed stub folder
# under .next/node_modules/better-sqlite3-<hash>/ with its OWN copy of
# build/Release/better_sqlite3.node — a separate physical file from
# app/node_modules/better-sqlite3/. That copy came from the tracer using the
# repo's dev Node.js ABI, not the bundled runtime's ABI, so it dlopen-fails
# at runtime even though the primary copy above was correctly reinstalled.
if [[ -n "${BS3_NODE:-}" ]] && [[ -f "$BS3_NODE" ]]; then
  info "Repairing Turbopack better-sqlite3 stub(s) with the ABI-correct binary..."
  BS3_STUB_FOUND=0
  while IFS= read -r -d '' STUB_DIR; do
    BS3_STUB_FOUND=1
    STUB_NODE="$STUB_DIR/build/Release/better_sqlite3.node"
    mkdir -p "$(dirname "$STUB_NODE")"
    cp -f "$BS3_NODE" "$STUB_NODE"
    file "$STUB_NODE" | grep -qE "Mach-O.*arm64|ARM64" || die "Repaired stub $STUB_NODE is not macOS arm64 Mach-O"
    ok "Repaired stub: $STUB_DIR"
  done < <(find "$PACKAGE_DIR/app/.next/node_modules" -maxdepth 1 -type d -name "better-sqlite3-*" -print0 2>/dev/null)
  [[ "$BS3_STUB_FOUND" -eq 1 ]] || warn "No Turbopack better-sqlite3-* stub folder found under .next/node_modules — nothing to repair"
fi

# ── Supplement better-sqlite3's declared JS dependency (bindings) ───────────
# Turbopack externalizes better-sqlite3 into a content-hashed stub folder
# under .next/node_modules/better-sqlite3-<hash>/ whose lib/database.js does
# `require('bindings')` as a fallback path resolver. The standalone tracer
# does not follow it. Without it, any App Route that touches the database
# (history/jobs/batch) 500s on first request even though the server boots
# and /api/health responds fine.
info "Checking better-sqlite3's declared JS dependency (bindings)..."
for BS3_DEP in bindings file-uri-to-path; do
  BS3_DEP_DEST="$PACKAGE_DIR/app/node_modules/$BS3_DEP"
  if [[ -e "$BS3_DEP_DEST" ]]; then
    continue
  fi
  BS3_DEP_SRC="$(find "$REPO_ROOT/node_modules/.pnpm" -maxdepth 1 -iname "${BS3_DEP}@*" -type d 2>/dev/null | sort | tail -1)"
  [[ -n "$BS3_DEP_SRC" ]] || die "better-sqlite3 dependency '$BS3_DEP' not found in the pnpm store — cannot package a working history/jobs engine"
  BS3_DEP_PKG_DIR="$BS3_DEP_SRC/node_modules/$BS3_DEP"
  [[ -d "$BS3_DEP_PKG_DIR" ]] || die "'$BS3_DEP' package directory missing under $BS3_DEP_SRC"
  mkdir -p "$(dirname "$BS3_DEP_DEST")"
  cp -a "$BS3_DEP_PKG_DIR" "$BS3_DEP_DEST"
  ok "Copied missing better-sqlite3 dependency: $BS3_DEP"
done

# ── Sharp + libvips: mandatory packaging from pnpm store ─────────────────────
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
const sharpNativeDir = fs.realpathSync(path.join(imgDir, "sharp-darwin-arm64"));
const libvipsDir = fs.realpathSync(path.join(imgDir, "sharp-libvips-darwin-arm64"));

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
SHARP_ARM64_SRC="$(resolve_sharp_path sharpNativeDir)"
LIBVIPS_SRC="$(resolve_sharp_path libvipsDir)"

[[ "$SHARP_PACKAGE_DIR" == "$PNPM_STORE/"* ]] || die "Sharp package is not under pnpm store: $SHARP_PACKAGE_DIR"
[[ "$SHARP_ARM64_SRC" == "$PNPM_STORE/"* ]] || die "Sharp native package is not under pnpm store: $SHARP_ARM64_SRC"
[[ "$LIBVIPS_SRC" == "$PNPM_STORE/"* ]] || die "Sharp libvips package is not under pnpm store: $LIBVIPS_SRC"

SHARP_PACKAGE_REL="${SHARP_PACKAGE_DIR#"$PNPM_STORE/"}"
SHARP_ARM64_REL="${SHARP_ARM64_SRC#"$PNPM_STORE/"}"
LIBVIPS_REL="${LIBVIPS_SRC#"$PNPM_STORE/"}"

SHARP_NODE_SRC="$(find "$SHARP_ARM64_SRC/lib" -maxdepth 1 -name 'sharp-darwin-arm64-*.node' -type f 2>/dev/null | sort | head -1 || true)"
LIBVIPS_DYLIB_SRC="$(find "$LIBVIPS_SRC/lib" -maxdepth 1 -name 'libvips-cpp.*.dylib' -type f ! -type l 2>/dev/null | sort | head -1 || true)"

[[ -n "$SHARP_NODE_SRC" && -f "$SHARP_NODE_SRC" ]] || die "MISSING: sharp-darwin-arm64 native module in $SHARP_ARM64_SRC/lib — run 'pnpm install --frozen-lockfile'"
[[ -n "$LIBVIPS_DYLIB_SRC" && -f "$LIBVIPS_DYLIB_SRC" ]] || die "MISSING: libvips-cpp.dylib in $LIBVIPS_SRC/lib — run 'pnpm install --frozen-lockfile'"

file "$SHARP_NODE_SRC" | grep -qE "Mach-O.*arm64|ARM64" || die "$(basename "$SHARP_NODE_SRC") source is not Mach-O arm64"
file "$LIBVIPS_DYLIB_SRC" | grep -qE "Mach-O.*arm64|ARM64" || die "$(basename "$LIBVIPS_DYLIB_SRC") source is not Mach-O arm64"

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
    # The Next.js standalone file tracer sometimes pre-materializes an
    # incomplete real (non-symlink) stub at this exact path (package.json +
    # a JS shim, no native binary) before this step runs. A stale stub or a
    # previous partial copy must not survive here — always replace.
    rm -rf "$dest_dir/$name"
    cp -P "$link" "$dest_dir/$name"
    if [[ ! -e "$dest_dir/$name" ]]; then
      # The relative symlink target doesn't resolve from the destination
      # (this pnpm store layout nests the real package directly rather than
      # as a separate top-level .pnpm entry) — materialize real content
      # instead of a broken symlink.
      rm -f "$dest_dir/$name"
      cp -aL "$link" "$dest_dir/$name"
    fi
  done
}

copy_pnpm_package_dir "$SHARP_ARM64_SRC"
copy_pnpm_package_dir "$LIBVIPS_SRC"
copy_pnpm_symlinks "$(dirname "$SHARP_PACKAGE_DIR")/@img"
copy_pnpm_symlinks "$(dirname "$SHARP_ARM64_SRC")"

SHARP_TOP_LINK="$PACKAGE_DIR/app/node_modules/sharp"
if [[ ! -e "$SHARP_TOP_LINK" && ! -L "$SHARP_TOP_LINK" ]]; then
  mkdir -p "$(dirname "$SHARP_TOP_LINK")"
  ln -s ".pnpm/$SHARP_PACKAGE_REL" "$SHARP_TOP_LINK"
fi

LIBVIPS_DYLIB_PKG="$PACKAGE_DIR/app/node_modules/.pnpm/$LIBVIPS_REL/lib/$(basename "$LIBVIPS_DYLIB_SRC")"
[[ -f "$LIBVIPS_DYLIB_PKG" ]] || die "$(basename "$LIBVIPS_DYLIB_SRC") still missing after copy — check pnpm store"
[[ -L "$LIBVIPS_DYLIB_PKG" ]] && die "$(basename "$LIBVIPS_DYLIB_SRC") is a symlink — must be a real file in the package"
file "$LIBVIPS_DYLIB_PKG" | grep -qE "Mach-O.*arm64|ARM64" || die "$(basename "$LIBVIPS_DYLIB_SRC") in package is not Mach-O arm64"

SHARP_NODE="$PACKAGE_DIR/app/node_modules/.pnpm/$SHARP_ARM64_REL/lib/$(basename "$SHARP_NODE_SRC")"
[[ -f "$SHARP_NODE" ]] || die "$(basename "$SHARP_NODE_SRC") not found in package after copy"
file "$SHARP_NODE" | grep -qE "Mach-O.*arm64|ARM64" || die "$(basename "$SHARP_NODE_SRC") in package is not Mach-O arm64"

if command -v otool >/dev/null 2>&1; then
  OTOOL_OUT="$(otool -L "$SHARP_NODE" 2>&1 || true)"
  if echo "$OTOOL_OUT" | grep -qi "not found\|no such file"; then
    die "sharp .node has unresolved dynamic dependencies:\n$OTOOL_OUT"
  else
    ok "sharp .node dynamic deps OK (otool -L)"
  fi
fi

ok "Sharp ${SHARP_VERSION} native runtime packaged ($(basename "$SHARP_NODE_SRC"), $(basename "$LIBVIPS_DYLIB_SRC"))"

# ── Supplement sharp's declared JS dependencies untraced by Next's file tracer ─
# sharp/package.json declares dependencies on detect-libc, semver and
# @img/colour, but the Next.js standalone output tracer does not always
# follow them (observed on this pnpm store layout, where they resolve as
# nested deps of the sharp package itself rather than hoisted top-level
# packages). Without them `require('sharp')` fails at runtime with
# MODULE_NOT_FOUND. Copy any missing one from wherever pnpm actually placed it.
info "Checking sharp's declared JS dependencies (detect-libc, semver, @img/colour)..."
for SHARP_DEP in detect-libc semver "@img/colour"; do
  DEP_DEST="$PACKAGE_DIR/app/node_modules/$SHARP_DEP"
  if [[ -e "$DEP_DEST" ]]; then
    continue
  fi
  DEP_SRC="$(find "$(dirname "$SHARP_PACKAGE_DIR")" -maxdepth 2 -path "*/$SHARP_DEP" -type d 2>/dev/null | head -1)"
  if [[ -z "$DEP_SRC" ]]; then
    DEP_SRC="$(find "$REPO_ROOT/node_modules/.pnpm" -maxdepth 4 -path "*/node_modules/$SHARP_DEP" -type d 2>/dev/null | sort | tail -1)"
  fi
  [[ -n "$DEP_SRC" && -f "$DEP_SRC/package.json" ]] || die "sharp dependency '$SHARP_DEP' not found anywhere (checked sharp's own node_modules and the pnpm store) — cannot package a working Sharp runtime"
  mkdir -p "$(dirname "$DEP_DEST")"
  cp -a "$DEP_SRC" "$DEP_DEST"
  ok "Copied missing sharp dependency: $SHARP_DEP"
done

# ── Ensure the platform-native @img packages are reachable from wherever the
#    tracer actually placed the `sharp` package ────────────────────────────
# Next's standalone tracer sometimes materializes a REAL (non-symlink) copy
# of the sharp JS files directly at app/node_modules/sharp (rather than a
# symlink into the pnpm store), because it follows sharp's static requires
# but not its runtime-computed optionalDependency platform requires. When
# that happens, Node's ancestor node_modules search for
# require("@img/sharp-darwin-arm64/sharp.node") from inside that copy never
# reaches the .pnpm-nested placement done above — it only reaches
# app/node_modules/@img (same level as detect-libc/semver above). Place the
# native platform packages there too so resolution succeeds regardless of
# whether app/node_modules/sharp ended up as a copy or a symlink.
for IMG_PKG_PAIR in "sharp-darwin-arm64:$SHARP_ARM64_SRC" "sharp-libvips-darwin-arm64:$LIBVIPS_SRC"; do
  IMG_PKG_NAME="${IMG_PKG_PAIR%%:*}"
  IMG_PKG_SRC="${IMG_PKG_PAIR#*:}"
  IMG_PKG_DEST="$PACKAGE_DIR/app/node_modules/@img/$IMG_PKG_NAME"
  if [[ -e "$IMG_PKG_DEST" ]]; then
    continue
  fi
  mkdir -p "$(dirname "$IMG_PKG_DEST")"
  cp -a "$IMG_PKG_SRC" "$IMG_PKG_DEST"
  ok "Copied $IMG_PKG_NAME to app/node_modules/@img (top-level resolution fallback)"
done

SHARP_ROOT_LOAD_CHECK="$(cd "$PACKAGE_DIR/app" && "$PACKAGE_DIR/runtime/node" -e "require('sharp'); console.log('OK')" 2>&1 || echo "FAILED")"
echo "$SHARP_ROOT_LOAD_CHECK" | grep -q "^OK" || die "require('sharp') from app/ still fails after dependency supplementation: $SHARP_ROOT_LOAD_CHECK"
ok "require('sharp') resolves cleanly from app/ with bundled node"

# Verify: no .exe/.dll files in macOS package (Windows artifacts)
FOREIGN_COUNT=$(find "$PACKAGE_DIR" \( -name "*.dll" -o -name "*.exe" -o -name "*.so" \) | wc -l | tr -d ' ')
if [[ "$FOREIGN_COUNT" -gt 0 ]]; then
  die "Windows/Linux artifacts found in macOS package (count: $FOREIGN_COUNT)"
fi
ok "No .dll/.exe/.so files in package (OK)"

# ── Boot-probe the packaged server for real (catches untraced deps that only
#    surface once an App Route module — not just `require('next')` — is
#    evaluated, e.g. the better-sqlite3 Turbopack stub's `bindings` require) ──
info "Boot-probing packaged server (real HTTP request to /api/batch)..."
BOOT_PROBE_PORT=39123
BOOT_PROBE_DIR="$(mktemp -d)"
BOOT_PROBE_LOG="$BOOT_PROBE_DIR/boot-probe.log"
(
  cd "$PACKAGE_DIR/app"
  NODE_ENV=production PORT="$BOOT_PROBE_PORT" HOSTNAME=127.0.0.1 \
    ANCLORA_FILESTUDIO_DATA_DIR="$BOOT_PROBE_DIR/data" \
    ANCLORA_FILESTUDIO_TEMP_DIR="$BOOT_PROBE_DIR/temp" \
    ANCLORA_FILESTUDIO_LOG_DIR="$BOOT_PROBE_DIR/logs" \
    "$PACKAGE_DIR/runtime/node" server.js >"$BOOT_PROBE_LOG" 2>&1 &
  echo $! > "$BOOT_PROBE_DIR/pid"
)
BOOT_PROBE_PID="$(cat "$BOOT_PROBE_DIR/pid")"
BOOT_PROBE_READY=0
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$BOOT_PROBE_PORT/api/health" 2>/dev/null; then
    BOOT_PROBE_READY=1
    break
  fi
  kill -0 "$BOOT_PROBE_PID" 2>/dev/null || break
  sleep 1
done
if [[ "$BOOT_PROBE_READY" -ne 1 ]]; then
  cat "$BOOT_PROBE_LOG"
  kill "$BOOT_PROBE_PID" 2>/dev/null || true
  die "Boot-probe: server did not become healthy"
fi
BOOT_PROBE_BATCH_CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$BOOT_PROBE_PORT/api/batch")"
kill "$BOOT_PROBE_PID" 2>/dev/null || true
wait "$BOOT_PROBE_PID" 2>/dev/null || true
if [[ "$BOOT_PROBE_BATCH_CODE" -ge 500 ]]; then
  cat "$BOOT_PROBE_LOG"
  die "Boot-probe: GET /api/batch returned $BOOT_PROBE_BATCH_CODE — an App Route module failed to load (see log above)"
fi
if grep -qE "MODULE_NOT_FOUND|Cannot find module" "$BOOT_PROBE_LOG" 2>/dev/null; then
  cat "$BOOT_PROBE_LOG"
  die "Boot-probe: server log contains a module load failure"
fi
rm -rf "$BOOT_PROBE_DIR"
ok "Boot-probe: /api/health and /api/batch both responded without module errors (HTTP $BOOT_PROBE_BATCH_CODE)"

# ── Detect available system tools (via Homebrew, build-host only) ────────────
# Plain variables, not associative arrays: macOS ships bash 3.2 as /bin/bash,
# which lacks `declare -A`. This must run under both bash 3.2 and bash 4+.
info "Detecting system tools (build-host, e.g. Homebrew)..."

tool_present() { command -v "$1" >/dev/null 2>&1; }

HAS_FFMPEG=absent;    tool_present ffmpeg    && HAS_FFMPEG=system
HAS_FFPROBE=absent;   tool_present ffprobe   && HAS_FFPROBE=system
HAS_YTDLP=absent;     tool_present yt-dlp    && HAS_YTDLP=system
HAS_QPDF=absent;      tool_present qpdf      && HAS_QPDF=system
HAS_7Z=absent;        tool_present 7zz       && HAS_7Z=system
[[ "$HAS_7Z" == "absent" ]] && tool_present 7z && HAS_7Z=system
HAS_PANDOC=absent;    tool_present pandoc    && HAS_PANDOC=system
HAS_TESSERACT=absent; tool_present tesseract && HAS_TESSERACT=system
HAS_PDFTOPPM=absent;  tool_present pdftoppm  && HAS_PDFTOPPM=system
HAS_CALIBRE=absent;   tool_present calibredb && HAS_CALIBRE=system

for t_name in ffmpeg:HAS_FFMPEG ffprobe:HAS_FFPROBE yt-dlp:HAS_YTDLP qpdf:HAS_QPDF 7z:HAS_7Z pandoc:HAS_PANDOC tesseract:HAS_TESSERACT pdftoppm:HAS_PDFTOPPM; do
  t_label="${t_name%%:*}"
  t_var="${t_name#*:}"
  if [[ "${!t_var}" == "absent" ]]; then
    warn "Tool '$t_label' not available on this build host — capability will be disabled unless the end user installs it (e.g. via Homebrew)"
  else
    ok "$t_label: detected"
  fi
done

# ── Compute capabilities from actually available tools ────────────────────────
CAPS=()
CAPS+=("\"data\"")
[[ -n "${SHARP_NODE:-}" ]] && CAPS+=("\"image\"")
[[ -n "${BS3_NODE:-}" ]] && CAPS+=("\"history\"")
[[ "$HAS_FFMPEG" == "system" ]] && CAPS+=("\"audio\"" "\"video\"" "\"thumbnail\"")
[[ "$HAS_YTDLP" == "system" ]] && CAPS+=("\"youtube\"")
[[ "$HAS_QPDF" == "system" ]] && CAPS+=("\"pdf\"")
[[ "$HAS_7Z" == "system" ]] && CAPS+=("\"archive\"")
[[ "$HAS_PANDOC" == "system" ]] && CAPS+=("\"document\"")
[[ "$HAS_TESSERACT" == "system" ]] && CAPS+=("\"ocr\"")
[[ "$HAS_CALIBRE" == "system" ]] && CAPS+=("\"ebook\"")
CAPABILITIES="[$(IFS=,; echo "${CAPS[*]}")]"

TOOLS_JSON_FILE="$(mktemp /tmp/anclora-tools-macos-XXXXXX.json)"
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

# ── Launcher ──────────────────────────────────────────────────────────────────
info "Creating launchers..."

cat > "$PACKAGE_DIR/start-anclora-filestudio.sh" << 'LAUNCH'
#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$DIR/runtime/node"

if [[ ! -x "$NODE" ]]; then
  echo "[ERROR] runtime/node not found at $NODE"
  echo "        Re-extract the package from the original archive."
  exit 1
fi

export ANCLORA_FILESTUDIO_DATA_DIR="$DIR/data"
export ANCLORA_FILESTUDIO_TEMP_DIR="$DIR/temp"
export ANCLORA_FILESTUDIO_LOG_DIR="$DIR/logs"
export ANCLORA_FILESTUDIO_TOOLS_DIR="$DIR/tools"
export ANCLORA_FILESTUDIO_NODE_PATH="$NODE"
export NODE_ENV="production"

# Optional external tools installed via Homebrew (ffmpeg, pandoc, qpdf,
# tesseract, poppler, yt-dlp) — detected at runtime, not bundled. See
# diagnose-anclora-filestudio.sh and LEEME.txt.
if [[ -d "/opt/homebrew/bin" ]]; then
  export PATH="/opt/homebrew/bin:$PATH"
fi

PORT_FILE="$DIR/data/anclora-filestudio.port"
PID_FILE="$DIR/anclora-filestudio.pid"

# Detect an already-running instance via the PID file before picking a port.
if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE")"
  if kill -0 "$OLD_PID" 2>/dev/null; then
    if [[ -f "$PORT_FILE" ]]; then
      RUNNING_PORT="$(cat "$PORT_FILE")"
      echo "Anclora FileStudio ya está corriendo (PID $OLD_PID) en http://127.0.0.1:$RUNNING_PORT"
      open "http://127.0.0.1:$RUNNING_PORT" 2>/dev/null || true
      exit 0
    fi
    echo "Anclora FileStudio ya está corriendo (PID $OLD_PID)"
    echo "Usa ./stop-anclora-filestudio.sh primero."
    exit 1
  else
    rm -f "$PID_FILE"
  fi
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

mkdir -p "$DIR/data" "$DIR/temp" "$DIR/logs"

cd "$DIR/app"
echo "Iniciando Anclora FileStudio en http://127.0.0.1:$PORT ..."
"$NODE" server.js >> "$DIR/logs/app.log" 2>&1 &
APP_PID="$!"
echo "$APP_PID" > "$PID_FILE"
echo "$PORT" > "$PORT_FILE"

for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    echo "Listo en http://127.0.0.1:$PORT (PID $APP_PID)"
    if [[ "${ANCLORA_FILESTUDIO_SKIP_BROWSER:-}" != "1" ]]; then
      open "http://127.0.0.1:$PORT" 2>/dev/null || true
    fi
    exit 0
  fi
  kill -0 "$APP_PID" 2>/dev/null || break
  sleep 1
done

echo "La app tardó demasiado en responder. Revisa logs/app.log"
exit 1
LAUNCH

cat > "$PACKAGE_DIR/stop-anclora-filestudio.sh" << 'STOP'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/anclora-filestudio.pid"
PORT_FILE="$DIR/data/anclora-filestudio.port"
if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE")"
  if kill -0 "$PID" 2>/dev/null; then
    # Kill by PID only — the server does not run under its own process
    # group, and killing -PGID here would also signal whatever launched
    # this script (shell, terminal, or a calling test harness).
    kill "$PID" 2>/dev/null || true
    for _i in $(seq 1 10); do
      kill -0 "$PID" 2>/dev/null || break
      sleep 0.3
    done
    kill -0 "$PID" 2>/dev/null && kill -9 "$PID" 2>/dev/null || true
    echo "Anclora FileStudio detenido (PID $PID)"
  else
    echo "El proceso $PID ya no está corriendo"
  fi
  rm -f "$PID_FILE" "$PORT_FILE"
else
  echo "No se encontró PID file — la app puede no estar corriendo"
fi
STOP

cat > "$PACKAGE_DIR/diagnose-anclora-filestudio.sh" << 'DIAG'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$DIR/runtime/node"
[[ -d "/opt/homebrew/bin" ]] && export PATH="/opt/homebrew/bin:$PATH"
echo "=== Anclora FileStudio — Diagnóstico (macOS arm64) ==="
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
  echo "Node.js (bundled): $("$NODE" --version) ($(file "$NODE" | sed 's/.*: //'))"
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
echo "--- Herramientas del sistema (Homebrew u otro gestor) ---"
for cmd in ffmpeg ffprobe yt-dlp qpdf 7zz 7z pandoc tesseract pdftoppm calibredb; do
  if command -v "$cmd" >/dev/null 2>&1; then
    VER="$("$cmd" --version 2>&1 | head -1)"
    echo "$cmd: $VER"
  else
    echo "$cmd: NO INSTALADO"
  fi
done
echo ""
echo "--- Gatekeeper / quarantine ---"
xattr -p com.apple.quarantine "$DIR/runtime/node" 2>/dev/null && echo "com.apple.quarantine PRESENTE en runtime/node" || echo "sin atributo de cuarentena en runtime/node"
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
printf "Anclora FileStudio %s\nBuild: %s\nDate: %s\nCommit: %s\nPlatform: darwin-arm64\n" \
  "$VERSION" "$BUILD_ID" "$BUILD_DATE" "$GIT_COMMIT" > "$PACKAGE_DIR/VERSION.txt"

# ── LEEME.txt ─────────────────────────────────────────────────────────────────
cat > "$PACKAGE_DIR/LEEME.txt" << README
Anclora FileStudio ${VERSION} — macOS arm64 (Apple Silicon) Portable
======================================================================

Este paquete NO está firmado ni notarizado por Apple. Es normal que
macOS Gatekeeper muestre una advertencia al primer arranque.

INICIO:
  ./start-anclora-filestudio.sh

  Si Gatekeeper bloquea el binario runtime/node o el script con el
  mensaje "no se puede abrir porque el desarrollador no pudo
  verificarse", ejecuta una vez:

    xattr -dr com.apple.quarantine .

  desde dentro de la carpeta extraída, y vuelve a intentarlo. También
  puedes ir a Ajustes del Sistema → Privacidad y seguridad → y pulsar
  "Abrir de todas formas" tras el primer intento fallido.

PARADA:
  ./stop-anclora-filestudio.sh
  (o el botón "Cerrar aplicación" en la esquina superior derecha de la
  propia app en el navegador — libera el puerto igual)

DIAGNÓSTICO:
  ./diagnose-anclora-filestudio.sh

REQUISITOS DEL SISTEMA:
  - macOS 13 (Ventura) o superior, Apple Silicon (arm64).
  - Node.js ya incluido (bundled) — no requiere instalación.

HERRAMIENTAS OPCIONALES (instalar con Homebrew si las necesitas):
  brew install ffmpeg qpdf pandoc tesseract tesseract-lang poppler yt-dlp sevenzip

  Sin estas herramientas la app funciona (edición de imágenes vía
  Sharp, historial vía SQLite, motor de datos) pero las capacidades de
  audio/vídeo, PDF, documentos, OCR y descarga de YouTube quedan
  deshabilitadas hasta instalarlas.

DATOS:
  Los datos se guardan en ./data/ — no borres esta carpeta al actualizar.
  Los logs se escriben en ./logs/

VÍDEOS QUE PIDEN INICIAR SESIÓN (opcional, bajo tu responsabilidad):
  Algunos vídeos de YouTube (y de X/Twitter o Instagram) exigen una
  cuenta autenticada para poder analizarlos. Si te ocurre:
    1. Exporta las cookies de esa cuenta desde tu navegador (extensión
       tipo "Get cookies.txt LOCALLY"), solo del sitio en cuestión —
       NO exportes "todas las cookies" del navegador.
    2. Copia ese archivo a ./data/cookies.txt
    3. Reinicia Anclora FileStudio.
  Usa preferiblemente una cuenta secundaria, no tu cuenta personal —
  el proveedor puede limitar la cuenta si detecta patrones
  automatizados. Nunca compartas ni subas ese archivo a ningún sitio;
  contiene tu sesión real. Elimínalo de ./data/ si dejas de necesitarlo.

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
  "platform": "darwin",
  "arch": "arm64",
  "packageName": "$PACKAGE_NAME",
  "toolchainId": "anclora-filestudio-macos-arm64-v1",
  "runtime": {
    "engine": "node",
    "version": "$NODE_VERSION",
    "abi": "$NODE_ABI",
    "source": "bundled"
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
  "signed": False,
  "notarized": False,
  "notes": "Unsigned, unnotarized build — Gatekeeper will warn on first launch. External tools (ffmpeg, yt-dlp, qpdf, pandoc, tesseract, poppler) must be installed separately on macOS (e.g. via Homebrew)."
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

DEV_PATH_REGEX='(/home/[^[:space:]"'"'"'<>]*/[^[:space:]"'"'"'<>]*/anclora/|/workspace/anclora/|/home/toni/|/Users/[^[:space:]"'"'"'<>]*/anclora)'
DEV_PATH_FOUND="$(LC_ALL=C grep -IRnE "$DEV_PATH_REGEX" "$PACKAGE_DIR" \
    --exclude-dir=data --exclude-dir=temp --exclude-dir=logs \
    --exclude="*.node" --exclude="*.zip" \
    2>/dev/null | head -20 || true)"
if [[ -n "$DEV_PATH_FOUND" ]]; then
  echo "$DEV_PATH_FOUND"
  die "Developer workspace path found in macOS portable package"
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

# ── Package (zip, preserving symlinks and executable bits) ──────────────────
mkdir -p "$DIST_DIR"
rm -f "$ZIP_FILE" "$SHA_FILE"

info "Creating ZIP package..."
(
  cd "$STAGING_BASE"
  zip -X -r -y -q "$ZIP_FILE" "$PACKAGE_NAME"
)
[[ -f "$ZIP_FILE" ]] || die "ZIP was not created"

SHA="$(shasum -a 256 "$ZIP_FILE" | awk '{print $1}')"
echo "$SHA  $(basename "$ZIP_FILE")" > "$SHA_FILE"

SIZE="$(du -sh "$ZIP_FILE" | awk '{print $1}')"

ok ""
ok "=== Build complete ==="
ok "Package : $ZIP_FILE"
ok "Size    : $SIZE"
ok "SHA-256 : $SHA"
ok "Verify  : shasum -a 256 -c $SHA_FILE"
