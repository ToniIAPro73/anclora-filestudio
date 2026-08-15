; =============================================================================
; filestudio.iss — Anclora FileStudio Windows installer (Inno Setup)
;
; This installer does NOT build FileStudio. It packages the EXACT contents of
; the already-built Windows portable ZIP
; (dist/windows/Anclora-FileStudio-Windows-x64-Core.zip), extracted by
; scripts/build-windows-installer-staging.sh into StagingDir, unmodified
; except for the installer chrome itself (shortcuts, uninstaller, registry
; entry). The installed app is byte-equivalent to the portable.
;
; Build:
;   bash scripts/build-windows-installer-staging.sh
;   ISCC installer\windows\filestudio.iss ^
;     /DAppVersion=0.2.0 /DBuildCommit=<full sha> /DBuildCommitShort=<short sha>
;
; Override StagingDir/OutputDir with /D if building from a different layout
; (e.g. a CI runner checkout path).
; =============================================================================

#ifndef StagingDir
  #define StagingDir "..\..\dist\installer-staging\windows\Anclora-FileStudio-Windows-x64-Core"
#endif
#ifndef OutputDir
  #define OutputDir "..\..\dist\release"
#endif
#ifndef AppVersion
  #define AppVersion "0.0.0-dev"
#endif
#ifndef BuildCommit
  #define BuildCommit "unknown"
#endif
#ifndef BuildCommitShort
  #define BuildCommitShort "unknown"
#endif

#define AppName "Anclora FileStudio"
#define AppPublisher "Anclora"
#define AppExeLauncher "INICIAR_ANCLORA_FILESTUDIO.bat"
#define AppIconRel "app\public\favicon.ico"

; Stable AppId — DO NOT regenerate on future builds. Inno Setup uses this to
; recognize "same product, install in place / upgrade" across versions.
[Setup]
AppId={{1ED134A7-1BC4-41C1-A759-47D91AA19530}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppVerName={#AppName} {#AppVersion}
VersionInfoVersion={#AppVersion}
VersionInfoDescription={#AppName} Setup
DefaultDirName={localappdata}\Anclora\FileStudio
DefaultGroupName=Anclora FileStudio
DisableProgramGroupPage=yes
DisableDirPage=no
; No admin privileges required or requested — per-user install only.
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=commandline
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
OutputDir={#OutputDir}
OutputBaseFilename=Anclora-FileStudio-Setup-Windows-x64
SetupIconFile=..\..\public\favicon.ico
UninstallDisplayIcon={app}\{#AppIconRel}
UninstallDisplayName={#AppName}
; This installer is not code-signed yet — see docs/RELEASE_WINDOWS_INSTALLER.md.
; Windows SmartScreen may warn on first run; that is expected until signing
; is set up and is not itself a build error.

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; Recursive, whole-tree copy of the staged portable payload — the installer
; never selects individual files so it can never silently drift from the
; portable's actual contents. ignoreversion: FileStudio's own files aren't
; versioned per-file, the release as a whole is.
Source: "{#StagingDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeLauncher}"; WorkingDir: "{app}"; IconFilename: "{app}\{#AppIconRel}"; Comment: "{#AppName}"
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\{#AppExeLauncher}"; WorkingDir: "{app}"; IconFilename: "{app}\{#AppIconRel}"; Comment: "{#AppName}"
Name: "{autoprograms}\Desinstalar {#AppName}"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\{#AppExeLauncher}"; Description: "Iniciar {#AppName} ahora"; Flags: postinstall skipifsilent nowait

[Code]
// Optional, explicit, opt-in data wipe on uninstall — never the default path.
// data\, logs\, temp\, and runtime-packs\ are never in [Files]: they hold
// content the app creates/downloads at runtime (SQLite DB, uploaded cookies,
// downloaded runtime packs). Inno's uninstaller only ever removes files it
// installed, and only removes {app} itself if it ends up empty — so by
// default this content, and {app}, survive uninstall untouched.
// NOTE: keep this as //-style comments — a brace-style { } comment would be
// closed early by the "{app}" constants mentioned above and break ISCC.
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Msg: String;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    // A custom MsgBox is NOT suppressed by /VERYSILENT or /SUPPRESSMSGBOXES —
    // it would pop an invisible dialog on headless CI and hang forever.
    // Silent uninstall therefore always keeps user data (the safe default).
    if UninstallSilent then
      exit;
    Msg := 'Se han desinstalado los archivos de la aplicacion.' + #13#10 + #13#10 +
      'Deseas eliminar TAMBIEN tus datos guardados (historial, base de datos, ' +
      'cookies subidas y componentes descargados)?' + #13#10 + #13#10 +
      'Esta accion no se puede deshacer.';
    if MsgBox(Msg, mbConfirmation, MB_YESNO or MB_DEFBUTTON2) = IDYES then
    begin
      DelTree(ExpandConstant('{app}\data'), True, True, True);
      DelTree(ExpandConstant('{app}\logs'), True, True, True);
      DelTree(ExpandConstant('{app}\temp'), True, True, True);
      DelTree(ExpandConstant('{app}\runtime-packs'), True, True, True);
      RemoveDir(ExpandConstant('{app}'));
    end;
  end;
end;
