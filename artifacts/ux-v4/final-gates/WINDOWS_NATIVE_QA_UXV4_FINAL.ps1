param(
  [Parameter(Mandatory = $true)]
  [string]$ExtractedAppRoot,
  [int]$Port = 3847
)

$ErrorActionPreference = "Stop"

function Write-Section([string]$Name) {
  Write-Host ""
  Write-Host "=== $Name ==="
}

function Assert-Path([string]$Path) {
  if (-not (Test-Path $Path)) {
    throw "Missing required path: $Path"
  }
}

$App = (Resolve-Path $ExtractedAppRoot).Path
$Evidence = Join-Path $App "uxv4-final-windows-evidence"
New-Item -ItemType Directory -Force -Path $Evidence | Out-Null

Write-Section "Candidate"
$ZipSha = "243427e485b6ded9b204ceb879455590bad337448faea75bfe4a129d4bcc9f85"
Write-Host "Expected ZIP SHA256: $ZipSha"
Write-Host "Extracted app root: $App"

Write-Section "Bundled Poppler"
$BundledPdftoppm = Join-Path $App "tools\poppler\Library\bin\pdftoppm.exe"
Assert-Path $BundledPdftoppm
"where.exe pdftoppm:" | Tee-Object -FilePath (Join-Path $Evidence "poppler-probe.txt")
try {
  where.exe pdftoppm 2>&1 | Tee-Object -Append -FilePath (Join-Path $Evidence "poppler-probe.txt")
} catch {
  "No global pdftoppm found." | Tee-Object -Append -FilePath (Join-Path $Evidence "poppler-probe.txt")
}
"& bundled pdftoppm -v:" | Tee-Object -Append -FilePath (Join-Path $Evidence "poppler-probe.txt")
& $BundledPdftoppm -v 2>&1 | Tee-Object -Append -FilePath (Join-Path $Evidence "poppler-probe.txt")

Write-Section "Launcher"
$Start = Join-Path $App "INICIAR_ANCLORA_FILESTUDIO.bat"
$Stop = Join-Path $App "CERRAR_ANCLORA_FILESTUDIO.bat"
Assert-Path $Start
Assert-Path $Stop
Write-Host "Start FileStudio with: $Start"
Write-Host "After the launcher is ready, press Enter here to capture favicon HTTP evidence."
Read-Host | Out-Null

Write-Section "Favicon Assets"
$Base = "http://127.0.0.1:$Port"
$Assets = @(
  "/favicon.ico",
  "/favicon-32.png",
  "/favicon-512.png",
  "/icon.png",
  "/apple-touch-icon.png"
)

$Rows = @()
foreach ($Asset in $Assets) {
  $Url = "$Base$Asset"
  $Out = Join-Path $Evidence ($Asset.TrimStart("/") -replace "/", "-")
  Invoke-WebRequest -Uri $Url -OutFile $Out -UseBasicParsing | Out-Null
  $Hash = (Get-FileHash -Algorithm SHA256 $Out).Hash.ToLowerInvariant()
  $Head = Invoke-WebRequest -Uri $Url -Method Head -UseBasicParsing
  $Rows += [pscustomobject]@{
    Asset = $Asset
    Status = [int]$Head.StatusCode
    ContentType = $Head.Headers["Content-Type"]
    CacheControl = $Head.Headers["Cache-Control"]
    ETag = $Head.Headers["ETag"]
    SHA256 = $Hash
    Bytes = (Get-Item $Out).Length
  }
}
$Rows | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 (Join-Path $Evidence "favicon-assets.json")
$Rows | Format-Table -AutoSize

Write-Section "Manual Gates Required"
@"
Run these from the UI and record screenshots in:
$Evidence

1. PDF -> PNG one-page PDF: output PNG valid.
2. PDF -> JPG one-page PDF: output JPEG valid.
3. PDF -> PNG three-page PDF: page-001/page-002/page-003 in ZIP.
4. Same PDF flow from a path with spaces.
5. Invalid PDF: controlled error and no pdftoppm.exe process leak.
6. DOCX -> PNG: route visible as DOCX -> PDF -> PNG, progress Paso 1 de 2 and Paso 2 de 2, final <input>.png.
7. Favicon old-build -> new-build on same host/port without clearing cache.
8. Stop with CERRAR_ANCLORA_FILESTUDIO.bat and verify no FileStudio node/pdftoppm processes remain.
"@ | Tee-Object -FilePath (Join-Path $Evidence "manual-gates-required.txt")

Write-Section "Process Snapshot"
Get-Process node,pdftoppm -ErrorAction SilentlyContinue |
  Select-Object ProcessName, Id, Path |
  ConvertTo-Json -Depth 4 |
  Set-Content -Encoding UTF8 (Join-Path $Evidence "process-snapshot.json")

Write-Host "Evidence directory: $Evidence"
