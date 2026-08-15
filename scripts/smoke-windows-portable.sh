#!/usr/bin/env bash
# Windows portable smoke: small payload checks, then real native execution.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ZIP="$REPO_ROOT/dist/windows/Anclora-FileStudio-Windows-x64-Core.zip"
SHA="$ZIP.sha256"
PS1="$SCRIPT_DIR/smoke-windows-portable.ps1"
TMP_DIR=""
LOG="$(mktemp)"
MAIN_STATUS=0

cleanup() {
  local status=$MAIN_STATUS
  if [[ -n "$TMP_DIR" && -d "$TMP_DIR" ]]; then
    rm -rf "$TMP_DIR"
  fi
  rm -f "$LOG"
  return "$status"
}
trap cleanup EXIT

fail() {
  echo "[FAIL] $*"
  MAIN_STATUS=1
}

echo "=== Smoke test — Windows portable ==="
if [[ ! -f "$ZIP" ]]; then fail "Portable ZIP not found: $ZIP"; exit 1; fi
if [[ ! -f "$SHA" ]]; then fail "Portable SHA256 file not found: $SHA"; exit 1; fi

echo "[CHECK] Verifying SHA-256..."
if (cd "$(dirname "$ZIP")" && sha256sum -c "$(basename "$SHA")"); then
  echo "[PASS] SHA-256 OK"
else
  fail "SHA-256 verification failed"
  exit 1
fi

echo ""
echo "--- Structural checks ---"
TMP_DIR="$(mktemp -d)"
if unzip -q "$ZIP" -d "$TMP_DIR"; then :; else fail "ZIP extraction failed"; exit 1; fi
PKG="$TMP_DIR/Anclora-FileStudio-Windows-x64-Core"

STRUCTURAL_FILES=(
  "app/server.js"
  "app/.next/required-server-files.json"
  "app/.next/routes-manifest.json"
  "app/.next/build-manifest.json"
  "app/.next/prerender-manifest.json"
  "app/.next/app-path-routes-manifest.json"
  "runtime/node.exe"
  "internal/start-anclora-filestudio.ps1"
  "internal/stop-anclora-filestudio.ps1"
  "data"
  "logs"
)
STRUCTURAL_PASS=0
STRUCTURAL_FAIL=0
for file in "${STRUCTURAL_FILES[@]}"; do
  if [[ -e "$PKG/$file" ]]; then
    echo "[PASS] $file"
    STRUCTURAL_PASS=$((STRUCTURAL_PASS + 1))
  else
    echo "[FAIL] Missing: $file"
    STRUCTURAL_FAIL=$((STRUCTURAL_FAIL + 1))
  fi
done

REQUIRED_SERVER_FILES="$PKG/app/.next/required-server-files.json"
REQUIRED_CHECK=""
if REQUIRED_CHECK="$(python3 - "$REQUIRED_SERVER_FILES" "$REPO_ROOT" <<'PY'
import json
import pathlib
import sys

metadata_path = pathlib.Path(sys.argv[1])
repo_root = pathlib.Path(sys.argv[2]).resolve()
text = metadata_path.read_text(encoding="utf-8")
data = json.loads(text)
if repo_root.as_posix() in text or str(repo_root) in text:
    raise SystemExit("contains repository root")
if not isinstance(data.get("files"), list):
    raise SystemExit("files must be a list")
for field in ("version", "config", "files"):
    if field not in data:
        raise SystemExit(f"missing field: {field}")
print(f"keys={','.join(data.keys())} files={len(data['files'])}")
print(f"routes-listed={'.next/routes-manifest.json' in data['files']}")
PY
)"; then
  echo "[PASS] required-server-files.json valid"
  echo "       $REQUIRED_CHECK"
  STRUCTURAL_PASS=$((STRUCTURAL_PASS + 1))
else
  echo "[FAIL] required-server-files.json invalid: $REQUIRED_CHECK"
  STRUCTURAL_FAIL=$((STRUCTURAL_FAIL + 1))
fi

if [[ -f "$PKG/app/.next/routes-manifest.json" ]]; then
  echo "[PASS] routes-manifest physically present"
  STRUCTURAL_PASS=$((STRUCTURAL_PASS + 1))
else
  echo "[FAIL] routes-manifest physically missing"
  STRUCTURAL_FAIL=$((STRUCTURAL_FAIL + 1))
fi

echo ""
echo "--- Structural: $STRUCTURAL_PASS PASS, $STRUCTURAL_FAIL FAIL ---"
if [[ "$STRUCTURAL_FAIL" -ne 0 ]]; then
  MAIN_STATUS=1
  exit 1
fi

echo ""
echo "--- Native acceptance test ---"
if ! command -v powershell.exe >/dev/null 2>&1; then
  fail "powershell.exe not found; native test cannot run"
  exit 1
fi
if ! command -v cygpath >/dev/null 2>&1; then
  fail "cygpath not found; cannot pass Git Bash paths to PowerShell"
  exit 1
fi
echo "[PASS] Windows path conversion"
WIN_ZIP="$(cygpath -w "$ZIP")"
WIN_PS1="$(cygpath -w "$PS1")"
echo "[CHECK] Validating native smoke PowerShell syntax..."
if powershell.exe -NoProfile -NonInteractive -Command '& {
  $scriptPath = $args[0]
  $tokens = $null
  $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile(
    $scriptPath,
    [ref]$tokens,
    [ref]$errors
  ) | Out-Null
  if ($errors.Count -gt 0) {
    foreach ($errorRecord in $errors) {
      Write-Host ("line=" + $errorRecord.Extent.StartLineNumber + " column=" + $errorRecord.Extent.StartColumnNumber + " message=" + $errorRecord.Message)
    }
    exit 1
  }
}' "$WIN_PS1"; then
  echo "[PASS] PowerShell smoke syntax valid"
else
  status=$?
  echo "[FAIL] PowerShell smoke syntax invalid"
  echo "PHASE: POWERSHELL_PARSE"
  echo "EXIT CODE: $status"
  MAIN_STATUS=1
  exit 1
fi
echo "[CHECK] Running native acceptance test..."
if powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass \
    -File "$WIN_PS1" -ZipPath "$WIN_ZIP" >"$LOG" 2>&1; then
  cat "$LOG"
  echo "[PASS] Native runtime command executed"
else
  status=$?
  cat "$LOG"
  echo "[FAIL] Windows portable runtime smoke failed"
  phase="$(sed -n 's/^PHASE: //p' "$LOG" | tail -1)"
  if [[ -z "$phase" ]]; then phase="UNKNOWN"; fi
  echo "PHASE: $phase"
  echo "PORTABLE ROOT: extracted by native acceptance script"
  echo "PID: reported by native acceptance script"
  echo "URL: reported by native acceptance script"
  echo "PROCESS ALIVE: reported by native acceptance script"
  echo "STDOUT/STDERR: see native acceptance output above"
  echo "LOG TAIL:"
  tail -80 "$LOG"
  echo "EXIT CODE: $status"
  MAIN_STATUS=1
fi

exit "$MAIN_STATUS"
