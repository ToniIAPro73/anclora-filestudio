#!/usr/bin/env bash
# smoke-macos-app.sh — Real Finder-style smoke test for "Anclora FileStudio.app".
# Launches the actual .app via `open`, exactly as a user double-clicking it
# from Finder would, and validates the full lifecycle. Does NOT consider it
# sufficient that the .app merely exists on disk.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$REPO_ROOT/dist/macos/app-staging/Anclora FileStudio.app"

FAIL=0

if [[ ! -d "$APP_DIR" ]]; then
  echo "[FAIL] App bundle not found: $APP_DIR"
  echo "       Run 'bash scripts/build-macos-app.sh' first."
  exit 1
fi

echo "=== Smoke test — macOS .app (real Finder-style launch via 'open') ==="
echo "Bundle: $APP_DIR"

APP_SUPPORT="$HOME/Library/Application Support/Anclora/FileStudio"
PID_FILE="$APP_SUPPORT/anclora-filestudio.pid"
PORT_FILE="$APP_SUPPORT/data/anclora-filestudio.port"
LOG_FILE="$APP_SUPPORT/logs/app.log"

# Clean slate — a leftover instance from a previous run must not mask a
# real single-instance/relaunch regression in this run.
if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  [[ -n "$OLD_PID" ]] && kill "$OLD_PID" 2>/dev/null || true
  sleep 1
fi
rm -f "$PID_FILE" "$PORT_FILE"

echo ""
echo "--- Preflight Code Signature Check ---"
if ! codesign --verify --deep --strict "$APP_DIR" 2>/dev/null; then
  echo "[FAIL] App bundle code signature is invalid before launch: $APP_DIR"
  codesign --verify --deep --strict --verbose=4 "$APP_DIR" || true
  exit 1
fi
echo "[PASS] App bundle code signature is valid before launch"

echo ""
echo "--- Launch (open, as Finder would) ---"
open "$APP_DIR"

READY=0
for _ in $(seq 1 60); do
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

if [[ "$READY" -ne 1 ]]; then
  echo "[FAIL] Server did not become ready after 'open'"
  [[ -f "$LOG_FILE" ]] && tail -40 "$LOG_FILE"
  exit 1
fi
echo "[PASS] /api/health returned 200 (port $SMOKE_PORT, PID $SMOKE_PID) — no Terminal window required"

ROOT_CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$SMOKE_PORT/")"
if [[ "$ROOT_CODE" == "200" ]]; then
  echo "[PASS] GET / returned 200"
else
  echo "[FAIL] GET / returned $ROOT_CODE"
  (( FAIL++ )) || true
fi

echo ""
echo "--- Single instance ---"
INSTANCE_COUNT="$(lsof -nP -iTCP:"$SMOKE_PORT" -sTCP:LISTEN -t 2>/dev/null | wc -l | tr -d ' ' || true)"
if [[ "$INSTANCE_COUNT" -eq 1 ]]; then
  echo "[PASS] Exactly one server instance running"
else
  echo "[FAIL] Expected exactly 1 server instance, found $INSTANCE_COUNT"
  (( FAIL++ )) || true
fi

echo ""
echo "--- Relaunch reuses the running instance ---"
open "$APP_DIR"
sleep 2
INSTANCE_COUNT_AFTER="$(lsof -nP -iTCP:"$SMOKE_PORT" -sTCP:LISTEN -t 2>/dev/null | wc -l | tr -d ' ' || true)"
PID_AFTER="$(cat "$PID_FILE" 2>/dev/null || echo "")"
if [[ "$INSTANCE_COUNT_AFTER" -eq 1 && "$PID_AFTER" == "$SMOKE_PID" ]]; then
  echo "[PASS] Second launch reused the running instance (same PID, single listener)"
else
  echo "[FAIL] Second launch did not cleanly reuse the instance (instances=$INSTANCE_COUNT_AFTER, pid before=$SMOKE_PID after=$PID_AFTER)"
  (( FAIL++ )) || true
fi

if kill -0 "$SMOKE_PID" 2>/dev/null; then
  echo "[PASS] Server alive after relaunch check"
else
  echo "[FAIL] Server died during smoke"
  (( FAIL++ )) || true
fi

echo ""
echo "--- Clean shutdown ---"
kill "$SMOKE_PID" 2>/dev/null || true
for _ in $(seq 1 10); do
  kill -0 "$SMOKE_PID" 2>/dev/null || break
  sleep 0.5
done
if kill -0 "$SMOKE_PID" 2>/dev/null; then
  kill -9 "$SMOKE_PID" 2>/dev/null || true
  sleep 1
fi
rm -f "$PID_FILE" "$PORT_FILE"

if kill -0 "$SMOKE_PID" 2>/dev/null; then
  echo "[FAIL] Server still running after shutdown attempt"
  (( FAIL++ )) || true
else
  echo "[PASS] Server stopped cleanly"
fi

sleep 1
LAUNCHER_PIDS="$(pgrep -f "Contents/MacOS/AncloraFileStudio" 2>/dev/null || true)"
if [[ -z "$LAUNCHER_PIDS" ]]; then
  echo "[PASS] No launcher processes remain (clean lifecycle)"
else
  echo "[FAIL] Launcher process(es) still running after server stop: $LAUNCHER_PIDS"
  kill -9 $LAUNCHER_PIDS 2>/dev/null || true
  (( FAIL++ )) || true
fi

ORPHAN_LISTENERS="$(lsof -nP -iTCP:"$SMOKE_PORT" -sTCP:LISTEN -t 2>/dev/null | wc -l | tr -d ' ' || true)"
if [[ "$ORPHAN_LISTENERS" -eq 0 ]]; then
  echo "[PASS] No orphaned processes remain (port free)"
else
  echo "[FAIL] $ORPHAN_LISTENERS listener(s) still on port $SMOKE_PORT after shutdown"
  (( FAIL++ )) || true
fi

if grep -qE "MODULE_NOT_FOUND|Cannot find module" "$LOG_FILE" 2>/dev/null; then
  echo "[FAIL] App log contains a module load failure"
  (( FAIL++ )) || true
else
  echo "[PASS] No module load failure in app log"
fi

echo ""
if [[ "$FAIL" -gt 0 ]]; then
  echo "=== Smoke test FAILED ($FAIL issue(s)) ==="
  exit 1
else
  echo "=== Smoke test PASSED ==="
fi
