import fs from "fs";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import { CONFIG } from "../../config";

export interface HtmlRendererRuntime {
  available: boolean;
  version: string | null;
  binaryPath: string | null;
  source: "env" | "portable" | "playwright-cache" | null;
  error?: string;
}

const CACHE_DIR = path.join(os.homedir(), ".cache", "ms-playwright");

function candidatePaths(): Array<{ path: string; source: HtmlRendererRuntime["source"] }> {
  const envPath = process.env.ANCLORA_FILESTUDIO_CHROMIUM_PATH;
  const candidates: Array<{ path: string; source: HtmlRendererRuntime["source"] }> = [];
  if (envPath) candidates.push({ path: envPath, source: "env" });

  candidates.push(
    { path: path.resolve(process.cwd(), "tools", "chromium", "chrome-linux64", "chrome"), source: "portable" },
    { path: path.resolve(process.cwd(), "tools", "chromium", "chrome-win64", "chrome.exe"), source: "portable" },
    { path: path.resolve(process.cwd(), "tools", "chromium", "chrome"), source: "portable" },
  );

  try {
    const entries = fs
      .readdirSync(CACHE_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("chromium-"))
      .sort((a, b) => b.name.localeCompare(a.name));
    for (const entry of entries) {
      const root = path.join(CACHE_DIR, entry.name);
      candidates.push(
        { path: path.join(root, "chrome-linux64", "chrome"), source: "playwright-cache" },
        { path: path.join(root, "chrome-win64", "chrome.exe"), source: "playwright-cache" },
      );
    }
  } catch {
    // Cache is optional.
  }

  return candidates;
}

export function resolveHtmlRendererRuntime(): HtmlRendererRuntime {
  for (const candidate of candidatePaths()) {
    if (fs.existsSync(candidate.path)) {
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
    error:
      "Chromium runtime not found. Set ANCLORA_FILESTUDIO_CHROMIUM_PATH or place a locked Chromium build under tools/chromium.",
  };
}

export function fileUrlForDir(dirPath: string): string {
  const href = pathToFileURL(path.resolve(dirPath) + path.sep).href;
  return href.endsWith("/") ? href : `${href}/`;
}

export function rendererTempDir(jobId: string): string {
  return path.join(CONFIG.media.tempDir, jobId, "html-renderer-profile");
}
