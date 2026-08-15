export type AncloraRuntimePlatform = "windows" | NodeJS.Platform;

export function getAncloraRuntimePlatform(): AncloraRuntimePlatform {
  const explicit = process.env.ANCLORA_FILESTUDIO_PLATFORM?.trim().toLowerCase();
  if (explicit === "windows" || explicit === "win32") return "windows";
  // Explicit non-Windows overrides are honored so tests and diagnostics can
  // simulate another platform regardless of the host OS.
  if (explicit === "linux" || explicit === "darwin") return explicit;
  return process.platform;
}

export function isAncloraWindowsRuntime(): boolean {
  return getAncloraRuntimePlatform() === "windows" || getAncloraRuntimePlatform() === "win32";
}
