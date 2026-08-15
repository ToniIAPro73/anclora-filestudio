' =============================================================================
' INICIAR_ANCLORA_FILESTUDIO_SILENCIOSO.vbs
' Silent launcher for Anclora FileStudio (Windows)
'
' Purpose:
'   - Runs INICIAR_ANCLORA_FILESTUDIO.bat with the console window hidden.
'   - Used by the installed shortcuts (wscript.exe + this .vbs) so that
'     launching the app shows no black console and opens exactly ONE
'     browser window. Launching the .bat directly through a .lnk shortcut
'     from Windows Explorer can execute it twice, opening two browser
'     windows; going through wscript.exe + this .vbs runs it exactly once.
'   - INICIAR_ANCLORA_FILESTUDIO.bat remains available for manual use and
'     diagnostics (it shows the console with status output).
'
' Requirements: standard Windows only (wscript.exe, WScript.Shell,
' Scripting.FileSystemObject, cmd.exe). No external dependencies.
' =============================================================================

Option Explicit

Dim fso
Dim shell
Dim appDir
Dim batPath
Dim cmdLine

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

' This .vbs always lives next to the .bat, at the install/portable root.
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = fso.BuildPath(appDir, "INICIAR_ANCLORA_FILESTUDIO.bat")

If Not fso.FileExists(batPath) Then
    shell.Popup "No se encuentra INICIAR_ANCLORA_FILESTUDIO.bat junto a " & _
        WScript.ScriptFullName & ". El paquete puede estar incompleto.", _
        15, "Anclora FileStudio", 16
    WScript.Quit 1
End If

' cmd.exe /c "C:\...\INICIAR_ANCLORA_FILESTUDIO.bat"
' Window style 0 = hidden window; False = do not wait for the .bat to exit.
' The .bat delegates the server to a background process and must return
' control to the shortcut immediately.
cmdLine = "cmd.exe /c """ & batPath & """"
shell.Run cmdLine, 0, False

Set fso = Nothing
Set shell = Nothing
