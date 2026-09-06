#!/usr/bin/env bash
# smoke-macos-portable.sh — Real boot smoke test for the macOS arm64 portable.
# Extracts the artifact, boots the bundled server, verifies health + one
# App Route response, confirms single-instance, stops cleanly, and checks
# no orphaned processes remain. Fails with exit 1 when the package is missing.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ZIP="$REPO_ROOT/dist/macos/Anclora-FileStudio-macOS-arm64.zip"

if [[ ! -f "$ZIP" ]]; then
  echo "[FAIL] Package not found: $ZIP"
  echo "       Run 'pnpm build:portable:macos' first."
  exit 1
fi

echo "=== Smoke test — macOS arm64 portable ==="
echo "Package: $(du -sh "$ZIP" | awk '{print $1}') → $ZIP"

TMP_DIR="$(mktemp -d)"
FAIL=0
SMOKE_PID=""

cleanup() {
  if [[ -n "$SMOKE_PID" ]] && kill -0 "$SMOKE_PID" 2>/dev/null; then
    kill "$SMOKE_PID" 2>/dev/null || true
    wait "$SMOKE_PID" 2>/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "Extracting..."
unzip -q "$ZIP" -d "$TMP_DIR"
PKG="$TMP_DIR/Anclora-FileStudio-macOS-arm64"

# ── Required files ────────────────────────────────────────────────────────────
for f in \
  "start-anclora-filestudio.sh" \
  "stop-anclora-filestudio.sh" \
  "manifest.json" \
  "VERSION.txt" \
  "app/server.js" \
  "app/.next/static" \
  "runtime/node"; do
  if [[ -e "$PKG/$f" ]]; then
    echo "[PASS] $f"
  else
    echo "[FAIL] Missing: $f"
    (( FAIL++ )) || true
  fi
done

# ── Developer paths ───────────────────────────────────────────────────────────
DEV_PATTERN="/home/toni/projects|/home/antonio|/Users/[^/]+/Developer/anclora|convertidor_youtube_mp3"
DEV_HITS="$(grep -rE "$DEV_PATTERN" "$TMP_DIR" \
  --exclude="server.js" \
  --exclude="required-server-files.json" \
  --exclude="trace" \
  2>/dev/null || true)"
if [[ -n "$DEV_HITS" ]]; then
  echo "[FAIL] Developer paths found in package"
  echo "$DEV_HITS" | head -5
  (( FAIL++ )) || true
else
  echo "[PASS] No developer paths (excl. Next.js build artifacts)"
fi

# ── Checksum ──────────────────────────────────────────────────────────────────
SHA_FILE="$ZIP.sha256"
if [[ -f "$SHA_FILE" ]]; then
  EXPECTED_SHA="$(awk '{print $1}' "$SHA_FILE")"
  ACTUAL_SHA="$(shasum -a 256 "$ZIP" 2>/dev/null | awk '{print $1}' || sha256sum "$ZIP" | awk '{print $1}')"
  if [[ "$EXPECTED_SHA" == "$ACTUAL_SHA" ]]; then
    echo "[PASS] SHA-256 OK"
  else
    echo "[FAIL] SHA-256 mismatch"
    (( FAIL++ )) || true
  fi
else
  echo "[FAIL] .sha256 file missing"
  (( FAIL++ )) || true
fi

# ── Manifest JSON parseable ───────────────────────────────────────────────────
if python3 -m json.tool "$PKG/manifest.json" >/dev/null 2>&1; then
  echo "[PASS] manifest.json is valid JSON"
else
  echo "[FAIL] manifest.json is invalid JSON"
  (( FAIL++ )) || true
fi

# ── arm64 sanity on bundled node ──────────────────────────────────────────────
if file "$PKG/runtime/node" | grep -qE "Mach-O.*arm64|ARM64"; then
  echo "[PASS] runtime/node is Mach-O arm64"
else
  echo "[FAIL] runtime/node is NOT Mach-O arm64"
  (( FAIL++ )) || true
fi

# ── Sharp: real PNG→WebP conversion using bundled node ───────────────────────
echo ""
echo "--- Sharp PNG→WebP conversion (bundled node) ---"

NODE_BIN="$PKG/runtime/node"
LIBVIPS_DYLIB="$(find "$PKG/app/node_modules/.pnpm" \
  -path "*/node_modules/@img/sharp-libvips-darwin-arm64/lib/libvips-cpp.*.dylib" \
  -type f 2>/dev/null | sort | head -1 || true)"

if [[ ! -x "$NODE_BIN" ]]; then
  echo "[FAIL] runtime/node not executable — cannot run Sharp test"
  (( FAIL++ )) || true
elif [[ -z "$LIBVIPS_DYLIB" ]]; then
  echo "[FAIL] libvips-cpp.dylib not found in package — Sharp cannot load"
  (( FAIL++ )) || true
else
  TEST_PNG="$TMP_DIR/test-input.png"
  TEST_WEBP="$TMP_DIR/test-output.webp"
  python3 - "$TEST_PNG" << 'MKPNG'
import struct, zlib, sys

def make_png(path):
    def chunk(name, data):
        c = struct.pack('>I', len(data)) + name + data
        return c + struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
    w, h = 4, 4
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    raw = b''.join(b'\x00' + b'\xff\x00\x00' * w for _ in range(h))
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

make_png(sys.argv[1])
MKPNG

  SHARP_TEST_RESULT="$(cd "$PKG/app" && "$NODE_BIN" -e "
const sharp = require('sharp');
sharp('$TEST_PNG')
  .webp({ quality: 80 })
  .toFile('$TEST_WEBP')
  .then(info => {
    console.log('OK width=' + info.width + ' height=' + info.height + ' size=' + info.size);
    process.exit(0);
  })
  .catch(err => {
    console.error('ERR', err.message);
    process.exit(1);
  });
" 2>&1 || echo "EXEC_FAILED")"

  if echo "$SHARP_TEST_RESULT" | grep -q "^OK"; then
    WEBP_SIZE="$(stat -f%z "$TEST_WEBP" 2>/dev/null || stat -c%s "$TEST_WEBP" 2>/dev/null || echo 0)"
    if [[ "$WEBP_SIZE" -gt 0 ]]; then
      echo "[PASS] Sharp PNG→WebP: $SHARP_TEST_RESULT (output ${WEBP_SIZE} bytes)"
    else
      echo "[FAIL] Sharp PNG→WebP: output file empty or missing"
      (( FAIL++ )) || true
    fi
  else
    echo "[FAIL] Sharp PNG→WebP conversion failed: $SHARP_TEST_RESULT"
    (( FAIL++ )) || true
  fi
fi

# ── Runtime smoke: boot via the real launcher, health, single instance ──────
echo ""
echo "--- Runtime smoke (real launcher boot + App Route evaluation) ---"

if [[ ! -x "$NODE_BIN" ]]; then
  echo "[FAIL] runtime/node not executable — cannot run server smoke"
  (( FAIL++ )) || true
else
  chmod +x "$PKG"/*.sh

  SMOKE_LOG="$PKG/logs/app.log"
  mkdir -p "$PKG/data" "$PKG/temp" "$PKG/logs"

  ANCLORA_FILESTUDIO_SKIP_BROWSER=1 "$PKG/start-anclora-filestudio.sh" >"$TMP_DIR/launcher.log" 2>&1 || true

  PID_FILE="$PKG/anclora-filestudio.pid"
  PORT_FILE="$PKG/data/anclora-filestudio.port"

  READY=0
  SMOKE_PORT=""
  for _ in $(seq 1 30); do
    if [[ -f "$PID_FILE" && -f "$PORT_FILE" ]]; then
      SMOKE_PID="$(cat "$PID_FILE")"
      SMOKE_PORT="$(cat "$PORT_FILE")"
      if curl -fsS -o /dev/null "http://127.0.0.1:$SMOKE_PORT/api/health" 2>/dev/null; then
        READY=1
        break
      fi
    fi
    sleep 1
  done

  if [[ "$READY" -eq 1 ]]; then
    echo "[PASS] /api/health returned 200 (port $SMOKE_PORT, PID $SMOKE_PID)"

    ROOT_CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$SMOKE_PORT/")"
    if [[ "$ROOT_CODE" == "200" ]]; then
      echo "[PASS] GET / returned 200"
    else
      echo "[FAIL] GET / returned $ROOT_CODE"
      (( FAIL++ )) || true
    fi

    BATCH_CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$SMOKE_PORT/api/batch")"
    if [[ "$BATCH_CODE" -lt 500 ]]; then
      echo "[PASS] GET /api/batch evaluated App Route (HTTP $BATCH_CODE)"
    else
      echo "[FAIL] GET /api/batch returned $BATCH_CODE — App Route evaluation failed"
      (( FAIL++ )) || true
    fi

    # Single-instance check: exactly one process listening on the app port.
    # Next.js rewrites its own process title to "next-server (vX.Y.Z)" at
    # startup, so `pgrep -f <original argv>` no longer matches on macOS —
    # count listeners on the port instead, which reflects actual behavior.
    INSTANCE_COUNT="$(lsof -nP -iTCP:"$SMOKE_PORT" -sTCP:LISTEN -t 2>/dev/null | wc -l | tr -d ' ' || true)"
    if [[ "$INSTANCE_COUNT" -eq 1 ]]; then
      echo "[PASS] Exactly one server instance running"
    else
      echo "[FAIL] Expected exactly 1 server instance, found $INSTANCE_COUNT"
      (( FAIL++ )) || true
    fi

    # Re-running the launcher must detect the existing instance, not spawn a second one.
    ANCLORA_FILESTUDIO_SKIP_BROWSER=1 "$PKG/start-anclora-filestudio.sh" >"$TMP_DIR/launcher-second.log" 2>&1 || true
    INSTANCE_COUNT_AFTER="$(lsof -nP -iTCP:"$SMOKE_PORT" -sTCP:LISTEN -t 2>/dev/null | wc -l | tr -d ' ' || true)"
    if [[ "$INSTANCE_COUNT_AFTER" -eq 1 ]]; then
      echo "[PASS] Re-running launcher did not spawn a second instance"
    else
      echo "[FAIL] Re-running launcher resulted in $INSTANCE_COUNT_AFTER instances"
      (( FAIL++ )) || true
    fi

    if kill -0 "$SMOKE_PID" 2>/dev/null; then
      echo "[PASS] Server alive after App Route evaluation"
    else
      echo "[FAIL] Server died during smoke"
      (( FAIL++ )) || true
    fi

    echo ""
    echo "--- Clean shutdown ---"
    OLD_SMOKE_PID="$SMOKE_PID"
    "$PKG/stop-anclora-filestudio.sh"
    sleep 1
    if kill -0 "$OLD_SMOKE_PID" 2>/dev/null; then
      echo "[FAIL] Server still running after stop-anclora-filestudio.sh"
      (( FAIL++ )) || true
    else
      echo "[PASS] Server stopped cleanly"
    fi
    SMOKE_PID=""

    # Orphan check: the original PID must be gone AND nothing must still be
    # listening on the app port (Next.js rewrites its own process title, so
    # a pgrep -f on the original argv is not a reliable orphan detector here).
    ORPHAN_PORT_LISTENERS="$(lsof -nP -iTCP:"$SMOKE_PORT" -sTCP:LISTEN -t 2>/dev/null | wc -l | tr -d ' ' || true)"
    if [[ "$ORPHAN_PORT_LISTENERS" -eq 0 ]] && ! kill -0 "$OLD_SMOKE_PID" 2>/dev/null; then
      echo "[PASS] No orphaned processes remain"
    else
      echo "[FAIL] Orphaned process/listener remains on port $SMOKE_PORT (PID $OLD_SMOKE_PID, listeners=$ORPHAN_PORT_LISTENERS)"
      (( FAIL++ )) || true
    fi
  else
    echo "[FAIL] Server did not become ready"
    tail -30 "$SMOKE_LOG" 2>/dev/null || true
    tail -30 "$TMP_DIR/launcher.log" 2>/dev/null || true
    (( FAIL++ )) || true
  fi

  if grep -qE "MODULE_NOT_FOUND|Failed to load external module|Cannot find module" "$SMOKE_LOG" 2>/dev/null; then
    echo "[FAIL] Server log contains module load failure:"
    grep -E "MODULE_NOT_FOUND|Failed to load external module|Cannot find module" "$SMOKE_LOG" | head -5
    (( FAIL++ )) || true
  elif [[ "$READY" -eq 1 ]]; then
    echo "[PASS] No module load failure in server log"
  fi
fi

echo ""
if [[ "$FAIL" -gt 0 ]]; then
  echo "=== Smoke test FAILED ($FAIL issue(s)) ==="
  exit 1
else
  echo "=== Smoke test PASSED ==="
fi
