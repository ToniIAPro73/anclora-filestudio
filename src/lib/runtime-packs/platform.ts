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
  // turbopackIgnore: runtime pack root is intentionally dynamic (env override or
  // per-OS user data dir outside the project). Nothing here should be traced
  // into the standalone bundle; without the annotation Turbopack cannot bound
  // the path and falls back to tracing the whole project (NFT warnings).
  if (process.env.ANCLORA_FILESTUDIO_RUNTIME_PACKS_DIR) {
    return path.resolve(/* turbopackIgnore: true */ process.env.ANCLORA_FILESTUDIO_RUNTIME_PACKS_DIR);
  }
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
    return path.join(/* turbopackIgnore: true */ localAppData, "Anclora", "FileStudio", "runtime-packs");
  }
  if (process.platform === "darwin") {
    return path.join(/* turbopackIgnore: true */ os.homedir(), "Library", "Application Support", "Anclora", "FileStudio", "runtime-packs");
  }
  return path.join(/* turbopackIgnore: true */ os.homedir(), ".local", "share", "anclora-filestudio", "runtime-packs");
}
