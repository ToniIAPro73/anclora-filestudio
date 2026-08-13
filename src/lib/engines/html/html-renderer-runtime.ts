import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { CONFIG } from "../../config";
import {
  RuntimePackManager,
  currentRuntimePackArchitecture,
  currentRuntimePackPlatform,
} from "../../runtime-packs";

export interface HtmlRendererRuntime {
  available: boolean;
  version: string | null;
  binaryPath: string | null;
  source: "runtime-pack" | "env" | "system" | null;
  runtimePackId?: string;
  runtimePackState?: string;
  error?: string;
}

function candidatePaths(): Array<{ path: string; source: HtmlRendererRuntime["source"] }> {
  const envPath = process.env.ANCLORA_FILESTUDIO_CHROMIUM_PATH;
  const candidates: Array<{ path: string; source: HtmlRendererRuntime["source"] }> = [];
  if (envPath) candidates.push({ path: envPath, source: "env" });

  if (process.env.ANCLORA_FILESTUDIO_ALLOW_SYSTEM_CHROME === "1") {
    candidates.push(
      { path: process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : "/usr/bin/google-chrome", source: "system" },
      { path: process.platform === "win32" ? "C:\\Program Files\\Chromium\\Application\\chrome.exe" : "/usr/bin/chromium", source: "system" },
    );
  }

  return candidates;
}

export async function resolveHtmlRendererRuntimeAsync(): Promise<HtmlRendererRuntime> {
  const manager = new RuntimePackManager({
    platform: currentRuntimePackPlatform(),
    architecture: currentRuntimePackArchitecture(),
  });
  const state = await manager.getState("chromium-runtime");
  if ((state.state === "AVAILABLE" || state.state === "UPDATE_AVAILABLE") && state.executablePath && fs.existsSync(state.executablePath)) {
    return {
      available: true,
      version: state.health.version,
      binaryPath: state.executablePath,
      source: "runtime-pack",
      runtimePackId: "chromium-runtime",
      runtimePackState: state.state,
    };
  }

  for (const candidate of candidatePaths()) {
    if (fs.existsSync(/* turbopackIgnore: true */ candidate.path)) {
      return {
        available: true,
        version: null,
        binaryPath: candidate.path,
        source: candidate.source,
      };
    }
  }

  const installable = state.state === "NOT_INSTALLED" ? " Install chromium-runtime to enable HTML image rendering." : "";
  return {
    available: false,
    version: null,
    binaryPath: null,
    source: null,
    runtimePackId: "chromium-runtime",
    runtimePackState: state.state,
    error:
      `Chromium runtime pack not available (${state.state}).${installable}`,
  };
}

export function resolveHtmlRendererRuntime(): HtmlRendererRuntime {
  const manager = new RuntimePackManager({
    platform: currentRuntimePackPlatform(),
    architecture: currentRuntimePackArchitecture(),
  });
  const definition = manager.getDefinition("chromium-runtime");
  if (definition) {
    const root = manager.getInstallRoot();
    const installRoot = path.join(root, definition.id, definition.version);
    const executable = path.join(installRoot, definition.executablePaths[definition.platform]);
    const stateFile = path.join(installRoot, "install.json");
    if (fs.existsSync(/* turbopackIgnore: true */ stateFile) && fs.existsSync(/* turbopackIgnore: true */ executable)) {
      return {
        available: true,
        version: null,
        binaryPath: executable,
        source: "runtime-pack",
        runtimePackId: definition.id,
        runtimePackState: "AVAILABLE",
      };
    }
  }

  for (const candidate of candidatePaths()) {
    if (fs.existsSync(/* turbopackIgnore: true */ candidate.path)) {
      return {
        available: true,
        version: null,
        binaryPath: candidate.path,
        source: candidate.source,
      };
    }
  }

  return {
    available: false,
    version: null,
    binaryPath: null,
    source: null,
    runtimePackId: "chromium-runtime",
    runtimePackState: definition ? "NOT_INSTALLED" : "INCOMPATIBLE",
    error:
      "Chromium runtime pack not installed. Install chromium-runtime or set ANCLORA_FILESTUDIO_CHROMIUM_PATH explicitly.",
  };
}

export function fileUrlForDir(dirPath: string): string {
  const href = pathToFileURL(path.resolve(dirPath) + path.sep).href;
  return href.endsWith("/") ? href : `${href}/`;
}

export function rendererTempDir(jobId: string): string {
  return path.join(CONFIG.media.tempDir, jobId, "html-renderer-profile");
}
