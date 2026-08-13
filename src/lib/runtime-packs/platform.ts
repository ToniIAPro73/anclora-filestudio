import os from "os";
import path from "path";
import type { RuntimePackArchitecture, RuntimePackPlatform } from "./types";

export function currentRuntimePackPlatform(): RuntimePackPlatform {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "darwin";
  return "linux";
}

export function currentRuntimePackArchitecture(): RuntimePackArchitecture {
  return process.arch === "arm64" ? "arm64" : "x64";
}

export function defaultRuntimePackRoot(): string {
  if (process.env.ANCLORA_FILESTUDIO_RUNTIME_PACKS_DIR) {
    return path.resolve(process.env.ANCLORA_FILESTUDIO_RUNTIME_PACKS_DIR);
  }
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Anclora", "FileStudio", "runtime-packs");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Anclora", "FileStudio", "runtime-packs");
  }
  return path.join(os.homedir(), ".local", "share", "anclora-filestudio", "runtime-packs");
}
