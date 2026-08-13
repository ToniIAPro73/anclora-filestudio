# FileStudio Windows Native QA Instructions

VERSION: 0.2.0
FINAL GIT SHA: 880f1d4f264c8e8eac67e7fc4c9d87771fd21d82
ARTIFACT: dist/windows/Anclora-FileStudio-Windows-x64-Core.zip
SHA256: 88503587896e6d75fce9512290ea2288dc59989071e0997e06dbb48714115a69

Run this QA on a real Windows x64 machine. Do not run from WSL, Wine, a Linux-side unzip, or from inside the repository.

Extract the ZIP to an arbitrary user path outside the repo, for example:

```text
C:\Users\<usuario>\Downloads\Anclora-FileStudio-Windows-x64-Core
```

Use a standard non-admin Windows user unless a step explicitly says otherwise. Record PASS/FAIL with notes and screenshots/logs for failures.

## STARTUP

- First execution from `INICIAR_ANCLORA_FILESTUDIO.bat`.
- Starts without administrator privileges.
- Browser launches automatically or URL is clearly usable.
- Health/service becomes ready.
- Restart works after closing and starting again.
- `CERRAR_ANCLORA_FILESTUDIO.bat` performs a clean shutdown.

## PATHS

- Run from a folder path containing spaces.
- Use input filenames with Unicode characters.
- Use input filenames in Spanish.
- Use normal user folders such as Downloads, Documents, Desktop.
- Confirm portable `data`, `temp`, and `logs` directories are used under the extracted package.

## PERSISTENCE

- SQLite database is created under portable `data`.
- Conversion history is recorded.
- History persists after restart.

## CORE CONVERSIONS

- DOCX to PDF.
- PDF to DOCX.
- PDF to ODT.
- PDF to TXT.
- PDF to PNG.
- PNG to JPG.
- JPG to WEBP.
- PNG to PDF.
- JSON to YAML.
- YAML to JSON.
- CSV to JSON.
- MD to HTML.
- HTML to PNG.
- AAC to MP3.
- WAV to MP3.
- MKV to MP4.
- WMV to MP4.
- TS to MP4.
- MP4 to WEBM.
- PDF merge.
- PDF split.

## RUNTIME PACK

- Verify absent state before installation.
- Verify installable state and explicit consent UI.
- Start download only after consent.
- Verify checksum step.
- Verify install completes.
- Verify health probe passes.
- Run a conversion requiring the runtime pack after installation.

## ERROR PATHS

- Invalid input returns controlled failure.
- Unsupported input returns controlled failure.
- Missing optional tool is reported clearly.
- Controlled fallback is visible where supported.
- No fake success.
- No empty output artifact.

## UX

- Home loads.
- Convert works.
- Tools works.
- History works.
- Diagnostics works.
- File picker works.
- Drag/drop works.
- Navigation works.
- Browser refresh works.
- Responsive behavior is acceptable at common desktop and narrow widths.
- Keyboard navigation reaches primary controls.
- Basic accessibility labels/focus states are usable.

## WINDOWS-SPECIFIC

- Note Windows Defender behavior if observable.
- Filenames with spaces work.
- Unicode filenames work.
- Long-ish paths work within normal Windows limits.
- Shutdown leaves no orphan `node.exe`, `ffmpeg.exe`, `yt-dlp.exe`, `soffice.exe`, `pandoc.exe`, or `qpdf.exe` processes.
- Temp files are cleaned up or bounded after conversions and shutdown.

## RESULT

WINDOWS NATIVE QA: PENDING

