import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import JSZip from "jszip";
import { defaultRuntimePackRoot } from "./platform";
import { runtimePackRegistry } from "./registry";
import type {
  RuntimePackArchitecture,
  RuntimePackDefinition,
  RuntimePackId,
  RuntimePackInstallOptions,
  RuntimePackInstallState,
  RuntimePackPlatform,
  RuntimePackProgress,
  RuntimePackRegistry,
  RuntimePackState,
} from "./types";

export class RuntimePackError extends Error {
  constructor(
    public readonly code:
      | "RUNTIME_PACK_REQUIRED"
      | "RUNTIME_PACK_DOWNLOAD_FAILED"
      | "RUNTIME_PACK_HASH_MISMATCH"
      | "RUNTIME_PACK_INSTALL_FAILED"
      | "RUNTIME_PACK_BROKEN"
      | "RUNTIME_PACK_INCOMPATIBLE",
    message: string,
  ) {
    super(message);
    this.name = "RuntimePackError";
  }
}

interface RuntimePackManagerOptions {
  rootDir?: string;
  registry?: RuntimePackRegistry;
  platform: RuntimePackPlatform;
  architecture: RuntimePackArchitecture;
}

const INSTALL_STATE_FILE = "install.json";
const MANIFEST_FILE = "manifest.json";

function assertTrustedSource(definition: RuntimePackDefinition): void {
  const source = new URL(definition.source.url);
  const trusted = new URL(definition.source.trustedOrigin);
  if (source.protocol !== "https:" || trusted.protocol !== "https:") {
    throw new RuntimePackError("RUNTIME_PACK_DOWNLOAD_FAILED", "Runtime pack source must use HTTPS");
  }
  if (source.origin !== trusted.origin) {
    throw new RuntimePackError("RUNTIME_PACK_DOWNLOAD_FAILED", "Runtime pack source origin is not trusted");
  }
  if (/latest/i.test(source.pathname)) {
    throw new RuntimePackError("RUNTIME_PACK_DOWNLOAD_FAILED", "Runtime pack source must be version-pinned");
  }
  if (!/^[a-f0-9]{64}$/i.test(definition.sha256)) {
    throw new RuntimePackError("RUNTIME_PACK_HASH_MISMATCH", "Runtime pack manifest has no valid SHA256");
  }
}

function ensureInside(root: string, target: string): string {
  // turbopackIgnore: root/target are runtime pack paths under a dynamic,
  // user-configurable root (see platform.ts). The cwd-relative resolution is
  // intentional runtime behavior; there is nothing project-local to trace.
  const resolvedRoot = path.resolve(/* turbopackIgnore: true */ root);
  const resolvedTarget = path.resolve(/* turbopackIgnore: true */ target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return resolvedTarget;
  }
  throw new RuntimePackError("RUNTIME_PACK_INSTALL_FAILED", `Unsafe archive path: ${target}`);
}

function packageRoot(rootDir: string, definition: RuntimePackDefinition): string {
  // turbopackIgnore: rootDir is the dynamic runtime pack root (env override or
  // per-OS user data dir, see platform.ts). Pack install paths are runtime
  // state outside the project and must not be traced into the NFT file list.
  return path.join(/* turbopackIgnore: true */ rootDir, definition.id, definition.version);
}

function statePath(rootDir: string, definition: RuntimePackDefinition): string {
  return path.join(packageRoot(rootDir, definition), INSTALL_STATE_FILE);
}

function executablePath(rootDir: string, definition: RuntimePackDefinition): string {
  const rel = definition.executablePaths[definition.platform];
  // turbopackIgnore: executable path lives under the dynamic pack root (see packageRoot).
  return ensureInside(packageRoot(rootDir, definition), path.join(/* turbopackIgnore: true */ packageRoot(rootDir, definition), rel));
}

function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(/* turbopackIgnore: true */ filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function runExecutableProbe(
  binary: string,
  args: string[],
  timeoutMs: number,
): Promise<{ ok: boolean; version: string | null; error: string | null }> {
  return new Promise((resolve) => {
    let output = "";
    let done = false;
    const child = spawn(/* turbopackIgnore: true */ binary, args, { shell: false, windowsHide: true });
    const finish = (ok: boolean, error: string | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ ok, version: output.trim() || null, error });
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(false, "timeout");
    }, timeoutMs);
    child.stdout?.on("data", (chunk: Buffer) => {
      if (output.length < 4096) output += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (output.length < 4096) output += chunk.toString("utf8");
    });
    child.on("error", (err) => finish(false, err.message));
    child.on("close", (code) => {
      setTimeout(() => finish(code === 0, code === 0 ? null : `exit code ${code}`), 0);
    });
  });
}

export class RuntimePackManager {
  private readonly rootDir: string;
  private readonly registry: RuntimePackRegistry;
  private readonly platform: RuntimePackPlatform;
  private readonly architecture: RuntimePackArchitecture;

  constructor(options: RuntimePackManagerOptions) {
    this.rootDir = options.rootDir ?? defaultRuntimePackRoot();
    this.registry = options.registry ?? runtimePackRegistry;
    this.platform = options.platform;
    this.architecture = options.architecture;
  }

  getInstallRoot(): string {
    return this.rootDir;
  }

  getDefinition(id: RuntimePackId): RuntimePackDefinition | null {
    return this.registry.find(id, this.platform, this.architecture);
  }

  listDefinitions(): RuntimePackDefinition[] {
    return this.registry.list();
  }

  async getState(id: RuntimePackId): Promise<RuntimePackInstallState> {
    const definition = this.getDefinition(id);
    if (!definition) {
      return {
        id,
        version: "unknown",
        platform: this.platform,
        architecture: this.architecture,
        state: "INCOMPATIBLE",
        installPath: null,
        executablePath: null,
        sourceUrl: null,
        sha256: null,
        installedAt: null,
        health: { ok: false, version: null, error: "No compatible runtime pack manifest", checkedAt: null },
      };
    }

    const installPath = packageRoot(this.rootDir, definition);
    const stateFile = statePath(this.rootDir, definition);
    const executable = executablePath(this.rootDir, definition);
    if (!fs.existsSync(/* turbopackIgnore: true */ stateFile)) {
      return this.emptyState(definition, "NOT_INSTALLED", null);
    }

    let installed: RuntimePackInstallState;
    try {
      installed = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ stateFile, "utf8")) as RuntimePackInstallState;
    } catch {
      return this.emptyState(definition, "BROKEN", "Install state is unreadable");
    }

    if (!fs.existsSync(/* turbopackIgnore: true */ executable)) {
      return {
        ...installed,
        state: "BROKEN",
        executablePath: executable,
        health: { ok: false, version: null, error: "Runtime executable missing", checkedAt: new Date().toISOString() },
      };
    }

    return {
      ...installed,
      installPath,
      executablePath: executable,
      state: installed.version === definition.version ? installed.state : "UPDATE_AVAILABLE",
    };
  }

  async probe(id: RuntimePackId): Promise<RuntimePackInstallState> {
    const definition = this.getDefinition(id);
    if (!definition) {
      return this.emptyState(
        { id, version: "unknown", platform: this.platform, architecture: this.architecture } as RuntimePackDefinition,
        "INCOMPATIBLE",
        "No compatible runtime pack manifest",
      );
    }
    const current = await this.getState(id);
    if (
      current.state !== "AVAILABLE" &&
      current.state !== "UPDATE_AVAILABLE" &&
      current.state !== "BROKEN"
    ) {
      return current;
    }
    const executable = executablePath(this.rootDir, definition);
    const probe = await runExecutableProbe(executable, definition.healthProbe.args, definition.healthProbe.timeoutMs);
    const versionOk = !definition.healthProbe.expectedVersion ||
      (probe.version?.includes(definition.healthProbe.expectedVersion) ?? false);
    const next: RuntimePackInstallState = {
      ...current,
      state: probe.ok && versionOk
        ? (current.state === "UPDATE_AVAILABLE" ? "UPDATE_AVAILABLE" : "AVAILABLE")
        : "BROKEN",
      health: {
        ok: probe.ok && versionOk,
        version: probe.version,
        error: probe.ok && versionOk ? null : (probe.error ?? "Version mismatch"),
        checkedAt: new Date().toISOString(),
      },
    };
    fs.writeFileSync(/* turbopackIgnore: true */ statePath(this.rootDir, definition), JSON.stringify(next, null, 2));
    return next;
  }

  async ensureAvailable(id: RuntimePackId): Promise<RuntimePackInstallState> {
    const state = await this.probe(id);
    if (state.state !== "AVAILABLE" && state.state !== "UPDATE_AVAILABLE") {
      throw new RuntimePackError(
        state.state === "INCOMPATIBLE" ? "RUNTIME_PACK_INCOMPATIBLE" : "RUNTIME_PACK_REQUIRED",
        `${id} is ${state.state}`,
      );
    }
    return state;
  }

  async installFromSource(id: RuntimePackId, options: RuntimePackInstallOptions = {}): Promise<RuntimePackInstallState> {
    const definition = this.requireDefinition(id);
    assertTrustedSource(definition);
    const tempDir = fs.mkdtempSync(path.join(/* turbopackIgnore: true */ os.tmpdir(), `${definition.id}-download-`));
    const archivePath = path.join(/* turbopackIgnore: true */ tempDir, path.basename(new URL(definition.source.url).pathname));
    try {
      await this.download(definition, archivePath, options);
      return await this.installArchive(definition, archivePath, options);
    } finally {
      fs.rmSync(/* turbopackIgnore: true */ tempDir, { recursive: true, force: true });
    }
  }

  async installArchive(
    definition: RuntimePackDefinition,
    archivePath: string,
    options: RuntimePackInstallOptions = {},
  ): Promise<RuntimePackInstallState> {
    if (definition.platform !== this.platform || definition.architecture !== this.architecture) {
      throw new RuntimePackError("RUNTIME_PACK_INCOMPATIBLE", "Runtime pack is not compatible with this platform");
    }
    assertTrustedSource(definition);
    options.onProgress?.(this.progress(definition.id, "VERIFYING", fs.statSync(/* turbopackIgnore: true */ archivePath).size, definition.compressedSize));
    const actualSha = await sha256File(archivePath);
    if (actualSha.toLowerCase() !== definition.sha256.toLowerCase()) {
      fs.rmSync(/* turbopackIgnore: true */ archivePath, { force: true });
      throw new RuntimePackError("RUNTIME_PACK_HASH_MISMATCH", "Runtime pack SHA256 mismatch");
    }

    options.onProgress?.(this.progress(definition.id, "INSTALLING", definition.compressedSize, definition.compressedSize));
    const finalRoot = packageRoot(this.rootDir, definition);
    const parent = path.dirname(finalRoot);
    const staging = `${finalRoot}.staging-${process.pid}-${Date.now()}`;
    fs.rmSync(/* turbopackIgnore: true */ staging, { recursive: true, force: true });
    fs.mkdirSync(/* turbopackIgnore: true */ staging, { recursive: true });
    fs.mkdirSync(/* turbopackIgnore: true */ parent, { recursive: true });
    try {
      await this.extractZipSafe(archivePath, staging);
      // turbopackIgnore: staging paths derive from the dynamic pack root (see packageRoot).
      fs.writeFileSync(path.join(/* turbopackIgnore: true */ staging, MANIFEST_FILE), JSON.stringify(definition, null, 2));
      const executable = ensureInside(staging, path.join(/* turbopackIgnore: true */ staging, definition.executablePaths[definition.platform]));
      if (process.platform !== "win32" && fs.existsSync(/* turbopackIgnore: true */ executable)) {
        fs.chmodSync(/* turbopackIgnore: true */ executable, 0o755);
      }
      const probe = await runExecutableProbe(executable, definition.healthProbe.args, definition.healthProbe.timeoutMs);
      if (!probe.ok) {
        throw new RuntimePackError("RUNTIME_PACK_BROKEN", probe.error ?? "Runtime health probe failed");
      }
      const installed: RuntimePackInstallState = {
        id: definition.id,
        version: definition.version,
        platform: definition.platform,
        architecture: definition.architecture,
        state: "AVAILABLE",
        installPath: finalRoot,
        executablePath: executablePath(this.rootDir, definition),
        sourceUrl: definition.source.url,
        sha256: definition.sha256,
        installedAt: new Date().toISOString(),
        health: { ok: true, version: probe.version, error: null, checkedAt: new Date().toISOString() },
      };
      fs.writeFileSync(path.join(/* turbopackIgnore: true */ staging, INSTALL_STATE_FILE), JSON.stringify(installed, null, 2));
      const previous = `${finalRoot}.previous-${process.pid}-${Date.now()}`;
      if (fs.existsSync(/* turbopackIgnore: true */ finalRoot)) fs.renameSync(/* turbopackIgnore: true */ finalRoot, previous);
      try {
        fs.renameSync(/* turbopackIgnore: true */ staging, finalRoot);
        fs.rmSync(/* turbopackIgnore: true */ previous, { recursive: true, force: true });
      } catch (err) {
        if (fs.existsSync(/* turbopackIgnore: true */ previous) && !fs.existsSync(/* turbopackIgnore: true */ finalRoot)) fs.renameSync(/* turbopackIgnore: true */ previous, finalRoot);
        throw err;
      }
      return installed;
    } catch (err) {
      fs.rmSync(/* turbopackIgnore: true */ staging, { recursive: true, force: true });
      if (err instanceof RuntimePackError) throw err;
      throw new RuntimePackError("RUNTIME_PACK_INSTALL_FAILED", String(err));
    }
  }

  async uninstall(id: RuntimePackId): Promise<void> {
    const definition = this.requireDefinition(id);
    const target = packageRoot(this.rootDir, definition);
    ensureInside(path.join(this.rootDir, definition.id), target);
    fs.rmSync(/* turbopackIgnore: true */ target, { recursive: true, force: true });
  }

  requiredPacksForCapability(capability: string): RuntimePackDefinition[] {
    return this.registry
      .list()
      .filter((definition) =>
        definition.platform === this.platform &&
        definition.architecture === this.architecture &&
        definition.capabilities.includes(capability)
      );
  }

  private requireDefinition(id: RuntimePackId): RuntimePackDefinition {
    const definition = this.getDefinition(id);
    if (!definition) {
      throw new RuntimePackError("RUNTIME_PACK_INCOMPATIBLE", `No compatible runtime pack manifest for ${id}`);
    }
    return definition;
  }

  private emptyState(
    definition: Pick<RuntimePackDefinition, "id" | "version" | "platform" | "architecture" | "source" | "sha256">,
    state: RuntimePackState,
    error: string | null,
  ): RuntimePackInstallState {
    return {
      id: definition.id,
      version: definition.version,
      platform: definition.platform,
      architecture: definition.architecture,
      state,
      installPath: null,
      executablePath: null,
      sourceUrl: "source" in definition ? definition.source.url : null,
      sha256: "sha256" in definition ? definition.sha256 : null,
      installedAt: null,
      health: { ok: false, version: null, error, checkedAt: null },
      ...(error ? { error } : {}),
    };
  }

  private progress(
    id: RuntimePackId,
    state: RuntimePackState,
    bytesDownloaded: number,
    totalBytes: number | null,
  ): RuntimePackProgress {
    return {
      id,
      state,
      bytesDownloaded,
      totalBytes,
      percent: totalBytes && totalBytes > 0 ? Math.min(100, (bytesDownloaded / totalBytes) * 100) : null,
    };
  }

  private async download(
    definition: RuntimePackDefinition,
    destination: string,
    options: RuntimePackInstallOptions,
  ): Promise<void> {
    const controller = new AbortController();
    const signal = options.signal ?? controller.signal;
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15 * 60_000);
    try {
      const response = await fetch(definition.source.url, { redirect: "follow", signal });
      if (!response.ok || !response.body) {
        throw new RuntimePackError("RUNTIME_PACK_DOWNLOAD_FAILED", `Download failed: ${response.status}`);
      }
      if (new URL(response.url).protocol !== "https:") {
        throw new RuntimePackError("RUNTIME_PACK_DOWNLOAD_FAILED", "Download redirected to an insecure URL");
      }
      const total = Number(response.headers.get("content-length")) || definition.compressedSize || null;
      const out = fs.createWriteStream(/* turbopackIgnore: true */ destination, { flags: "wx" });
      let downloaded = 0;
      try {
        for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
          if (signal.aborted) throw new RuntimePackError("RUNTIME_PACK_DOWNLOAD_FAILED", "Download cancelled");
          downloaded += chunk.byteLength;
          out.write(chunk);
          options.onProgress?.(this.progress(definition.id, "DOWNLOADING", downloaded, total));
        }
      } finally {
        out.end();
      }
    } catch (err) {
      fs.rmSync(/* turbopackIgnore: true */ destination, { force: true });
      if (err instanceof RuntimePackError) throw err;
      throw new RuntimePackError("RUNTIME_PACK_DOWNLOAD_FAILED", String(err));
    } finally {
      clearTimeout(timeout);
    }
  }

  private async extractZipSafe(archivePath: string, destination: string): Promise<void> {
    const zip = await JSZip.loadAsync(fs.readFileSync(/* turbopackIgnore: true */ archivePath));
    const entries = Object.values(zip.files);
    for (const entry of entries) {
      const unsafeOriginalName = "unsafeOriginalName" in entry && typeof entry.unsafeOriginalName === "string"
        ? entry.unsafeOriginalName
        : entry.name;
      if (
        unsafeOriginalName !== entry.name ||
        entry.name.startsWith("/") ||
        /^[A-Za-z]:[\\/]/.test(entry.name) ||
        entry.name.includes("\0")
      ) {
        throw new RuntimePackError("RUNTIME_PACK_INSTALL_FAILED", `Unsafe archive path: ${unsafeOriginalName}`);
      }
      // turbopackIgnore: extraction targets live under the dynamic pack root (see packageRoot).
      const target = ensureInside(destination, path.join(/* turbopackIgnore: true */ destination, entry.name));
      if (entry.dir) {
        fs.mkdirSync(/* turbopackIgnore: true */ target, { recursive: true });
        continue;
      }
      const unixPermissions = entry.unixPermissions;
      if (typeof unixPermissions === "number" && (unixPermissions & 0o170000) === 0o120000) {
        throw new RuntimePackError("RUNTIME_PACK_INSTALL_FAILED", `Unsafe archive symlink: ${entry.name}`);
      }
      fs.mkdirSync(/* turbopackIgnore: true */ path.dirname(target), { recursive: true });
      fs.writeFileSync(/* turbopackIgnore: true */ target, Buffer.from(await entry.async("uint8array")));
      const executableByMode = typeof unixPermissions === "number" && (unixPermissions & 0o111) !== 0;
      const executableByName = process.platform !== "win32" &&
        ["chrome", "chrome_crashpad_handler"].includes(path.basename(entry.name));
      if (process.platform !== "win32" && (executableByMode || executableByName)) {
        fs.chmodSync(/* turbopackIgnore: true */ target, 0o755);
      }
    }
  }
}
