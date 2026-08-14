#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import JSZip from "jszip";

const rootDir = process.cwd();
const lockPath = path.join(rootDir, "scripts", "toolchain.lock.json");
const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
const pack = lock.runtimePacks?.["chromium-runtime"];
const platform = process.platform === "win32" ? "win-x64" : "linux-x64";
const locked = pack?.versions?.[platform];

if (!pack || !locked) {
  throw new Error(`No chromium-runtime lock entry for ${platform}`);
}

const runtimeRoot = process.env.ANCLORA_FILESTUDIO_RUNTIME_PACKS_DIR
  ? path.resolve(process.env.ANCLORA_FILESTUDIO_RUNTIME_PACKS_DIR)
  : path.join(os.homedir(), ".local", "share", "anclora-filestudio", "runtime-packs");

const finalRoot = path.join(runtimeRoot, "chromium-runtime", pack.version);
const executablePath = path.join(finalRoot, locked.executablePath);
const installStatePath = path.join(finalRoot, "install.json");

function ensureInside(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return resolvedTarget;
  }
  throw new Error(`Unsafe archive path: ${target}`);
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function download(url, destination) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  if (new URL(response.url).protocol !== "https:") {
    throw new Error("Download redirected to an insecure URL");
  }

  const output = fs.createWriteStream(destination, { flags: "wx" });
  try {
    for await (const chunk of response.body) {
      output.write(chunk);
    }
  } finally {
    output.end();
  }
}

async function extractZipSafe(archivePath, destination) {
  const zip = await JSZip.loadAsync(fs.readFileSync(archivePath));
  for (const entry of Object.values(zip.files)) {
    const unsafeOriginalName = typeof entry.unsafeOriginalName === "string"
      ? entry.unsafeOriginalName
      : entry.name;
    if (
      unsafeOriginalName !== entry.name ||
      entry.name.startsWith("/") ||
      /^[A-Za-z]:[\\/]/.test(entry.name) ||
      entry.name.includes("\0")
    ) {
      throw new Error(`Unsafe archive path: ${unsafeOriginalName}`);
    }

    const target = ensureInside(destination, path.join(destination, entry.name));
    if (entry.dir) {
      fs.mkdirSync(target, { recursive: true });
      continue;
    }

    const unixPermissions = entry.unixPermissions;
    if (typeof unixPermissions === "number" && (unixPermissions & 0o170000) === 0o120000) {
      throw new Error(`Unsafe archive symlink: ${entry.name}`);
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(await entry.async("uint8array")));

    const executableByMode = typeof unixPermissions === "number" && (unixPermissions & 0o111) !== 0;
    const executableByName = process.platform !== "win32" &&
      ["chrome", "chrome_crashpad_handler"].includes(path.basename(entry.name));
    if (process.platform !== "win32" && (executableByMode || executableByName)) {
      fs.chmodSync(target, 0o755);
    }
  }
}

function probeChromium(binary) {
  const result = spawnSync(binary, ["--version"], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: 8000,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status !== 0) {
    throw new Error(`Chromium probe failed: ${output || result.error?.message || `exit ${result.status}`}`);
  }
  if (!output.includes(pack.version)) {
    throw new Error(`Chromium version mismatch: expected ${pack.version}, got ${output}`);
  }
  return output;
}

if (fs.existsSync(installStatePath) && fs.existsSync(executablePath)) {
  const version = probeChromium(executablePath);
  console.log(`chromium-runtime already installed: ${version}`);
  console.log(`chromium path: ${executablePath}`);
  process.exit(0);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "chromium-runtime-ci-"));
const archivePath = path.join(tempDir, path.basename(new URL(locked.sourceUrl).pathname));
const staging = `${finalRoot}.staging-${process.pid}-${Date.now()}`;

try {
  console.log(`Installing chromium-runtime ${pack.version} from pinned lockfile URL`);
  await download(locked.sourceUrl, archivePath);
  const actualSha = await sha256File(archivePath);
  if (actualSha.toLowerCase() !== locked.sha256.toLowerCase()) {
    throw new Error(`chromium-runtime SHA256 mismatch: expected ${locked.sha256}, got ${actualSha}`);
  }

  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  await extractZipSafe(archivePath, staging);

  const stagedExecutable = ensureInside(staging, path.join(staging, locked.executablePath));
  if (!fs.existsSync(stagedExecutable)) {
    throw new Error(`Chromium executable missing after extraction: ${stagedExecutable}`);
  }
  const version = probeChromium(stagedExecutable);

  const installState = {
    id: "chromium-runtime",
    version: pack.version,
    platform: process.platform === "win32" ? "windows" : "linux",
    architecture: process.arch === "arm64" ? "arm64" : "x64",
    state: "AVAILABLE",
    installPath: finalRoot,
    executablePath,
    sourceUrl: locked.sourceUrl,
    sha256: locked.sha256,
    installedAt: new Date().toISOString(),
    health: {
      ok: true,
      version,
      error: null,
      checkedAt: new Date().toISOString(),
    },
  };

  fs.writeFileSync(path.join(staging, "manifest.json"), JSON.stringify(pack, null, 2));
  fs.writeFileSync(path.join(staging, "install.json"), JSON.stringify(installState, null, 2));
  fs.mkdirSync(path.dirname(finalRoot), { recursive: true });

  const previous = `${finalRoot}.previous-${process.pid}-${Date.now()}`;
  if (fs.existsSync(finalRoot)) fs.renameSync(finalRoot, previous);
  try {
    fs.renameSync(staging, finalRoot);
    fs.rmSync(previous, { recursive: true, force: true });
  } catch (error) {
    if (fs.existsSync(previous) && !fs.existsSync(finalRoot)) fs.renameSync(previous, finalRoot);
    throw error;
  }

  console.log(`chromium-runtime installed: ${version}`);
  console.log(`chromium path: ${executablePath}`);
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
  fs.rmSync(tempDir, { recursive: true, force: true });
}
