# Windows Native QA — UX v4 Final Candidate

Candidate:

```text
dist/windows/Anclora-FileStudio-Windows-x64-Core.zip
SHA256: 243427e485b6ded9b204ceb879455590bad337448faea75bfe4a129d4bcc9f85
Built from HEAD: 066001cf1238b843ae0ef9d331e184e0b95d632d
```

Run on Windows 10/11 x64 PowerShell, not Wine and not WSL.

1. Extract into a new clean folder:

```powershell
$QaRoot = "C:\Users\toni\Anclora-FileStudio-QA-UXV4-FINAL"
New-Item -ItemType Directory -Force -Path $QaRoot | Out-Null
Expand-Archive -Force ".\Anclora-FileStudio-Windows-x64-Core.zip" $QaRoot
$App = Join-Path $QaRoot "Anclora-FileStudio-Windows-x64-Core"
```

2. Verify no global Poppler dependency and probe bundled Poppler:

```powershell
where.exe pdftoppm
& (Join-Path $App "tools\poppler\Library\bin\pdftoppm.exe") -v
```

Expected: bundled command prints version. FileStudio must work even if `where.exe pdftoppm` finds nothing.

3. Start with the real launcher:

```powershell
& (Join-Path $App "INICIAR_ANCLORA_FILESTUDIO.bat")
```

Use the browser opened by the launcher, or open `http://127.0.0.1:3847`.

4. Poppler native conversions from UI:

```text
PDF -> PNG, one-page PDF: output PNG valid.
PDF -> JPG, one-page PDF: output JPEG valid.
PDF -> PNG, 3-page PDF: page-001/page-002/page-003 delivered together as ZIP.
Path with spaces: C:\Users\toni\FileStudio QA Final\PDF con espacios\prueba documento.pdf
Invalid PDF: controlled human error, no crash, no pdftoppm.exe process left.
```

5. Multistep native E2E:

```text
DOCX -> PNG
Expected route before convert: DOCX -> PDF -> PNG
Expected label: Conversión en varios pasos
Expected progress: Paso 1 de 2, Paso 2 de 2
Expected final file: <input-name>.png
Expected cleanup: no orphan intermediate files outside temp job directory.
```

6. Favicon direct assets:

```text
http://127.0.0.1:3847/favicon.ico
http://127.0.0.1:3847/favicon-32.png
http://127.0.0.1:3847/favicon-512.png
http://127.0.0.1:3847/icon.png
http://127.0.0.1:3847/apple-touch-icon.png
```

Expected: current FileStudio icon for all assets. Record HTTP status, content type, SHA256 and visual screenshot.

7. Favicon old-build -> new-build cache invalidation:

```text
Start an older build with the legacy favicon on the same host/port.
Open it in normal Chrome or Edge profile.
Close the older build.
Start this candidate with the same host/port.
Do not clear browser cache.
Open or refresh FileStudio.
```

Expected: current favicon appears automatically. If manual cache clearing is required, this gate is FAIL.

8. Stop normally:

```powershell
& (Join-Path $App "CERRAR_ANCLORA_FILESTUDIO.bat")
Get-Process node,pdftoppm -ErrorAction SilentlyContinue
```

Expected: no orphan Node or Poppler process from FileStudio.

Also run existing native scripts where available:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\smoke-windows-portable.ps1 -ZipPath .\dist\windows\Anclora-FileStudio-Windows-x64-Core.zip
powershell.exe -ExecutionPolicy Bypass -File .\scripts\validate-windows-office-portable.ps1
```
