import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import JSZip from "jszip";
import { afterEach, describe, expect, it } from "vitest";
import { RuntimePackError, RuntimePackManager, StaticRuntimePackRegistry } from "../../../src/lib/runtime-packs";
import type { RuntimePackDefinition } from "../../../src/lib/runtime-packs";
import { getAvailableDestinations } from "../../../src/lib/conversion-routing";

const tempRoots: string[] = [];

function tempDir(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
  tempRoots.push(dir);
  return dir;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

const isWindows = process.platform === "win32";
const fixtureExecutable = isWindows ? "bin/fake-runtime.exe" : "bin/fake-runtime";
const fixturePlatform = isWindows ? "windows" : "linux";

async function createFakePack(entries: Record<string, string | Buffer>): Promise<{ archivePath: string; sha256: string; size: number }> {
  const root = tempDir("runtime-pack-fixture");
  const zip = new JSZip();
  for (const [name, content] of Object.entries(entries)) {
    zip.file(name, content, { unixPermissions: name === "bin/fake-runtime" ? 0o100755 : 0o100644 });
  }
  const buffer = Buffer.from(await zip.generateAsync({ type: "uint8array", platform: "UNIX" }));
  const archivePath = path.join(root, "fake-runtime.zip");
  fs.writeFileSync(archivePath, buffer);
  return {
    archivePath,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    size: buffer.byteLength,
  };
}

function definition(overrides: Partial<RuntimePackDefinition> = {}): RuntimePackDefinition {
  return {
    id: "fake-runtime",
    name: "Fake Runtime",
    version: "1.0.0",
    platform: fixturePlatform,
    architecture: "x64",
    source: {
      type: "https",
      url: "https://example.com/runtime-packs/fake-runtime-1.0.0.zip",
      trustedOrigin: "https://example.com",
    },
    sha256: "0".repeat(64),
    compressedSize: 0,
    installedSize: 0,
    license: { name: "Test", url: "https://example.com/license" },
    notices: ["test notice"],
    capabilities: ["FAKE_CAPABILITY"],
    executablePaths: {
      linux: fixtureExecutable,
      windows: fixtureExecutable,
      darwin: "bin/fake-runtime",
    },
    healthProbe: {
      type: "executable-version",
      executableKey: fixturePlatform,
      args: ["--version"],
      expectedVersion: "1.0.0",
      timeoutMs: 5_000,
    },
    ...overrides,
  };
}

function manager(rootDir: string, def: RuntimePackDefinition): RuntimePackManager {
  return new RuntimePackManager({
    rootDir,
    platform: fixturePlatform,
    architecture: "x64",
    registry: new StaticRuntimePackRegistry([def]),
  });
}

function goodFixture(): Record<string, string | Buffer> {
  return isWindows
    ? { [fixtureExecutable]: fs.readFileSync(process.execPath) }
    : { [fixtureExecutable]: "#!/bin/sh\necho Fake 1.0.0\n" };
}

function badFixture(): Record<string, string | Buffer> {
  return isWindows
    ? { [fixtureExecutable]: Buffer.from("not-a-windows-executable") }
    : { [fixtureExecutable]: "#!/bin/sh\nexit 2\n" };
}

describe("RuntimePackManager", () => {
  it("PACK-001 parses trusted static manifests", () => {
    const def = definition({ sha256: "a".repeat(64) });
    const registry = new StaticRuntimePackRegistry([def]);
    expect(registry.find("fake-runtime", "linux", "x64")).toEqual(def);
  });

  it("PACK-002/PACK-003 selects by platform and architecture", () => {
    const linux = definition({ sha256: "a".repeat(64) });
    const windows = definition({ platform: "windows", sha256: "b".repeat(64) });
    const registry = new StaticRuntimePackRegistry([linux, windows]);
    expect(registry.find("fake-runtime", "linux", "x64")?.platform).toBe("linux");
    expect(registry.find("fake-runtime", "windows", "x64")?.platform).toBe("windows");
    expect(registry.find("fake-runtime", "linux", "arm64")).toBeNull();
  });

  it("PACK-004 rejects SHA mismatch and leaves no executable", async () => {
    const pack = await createFakePack(goodFixture());
    const def = definition({ sha256: "f".repeat(64), compressedSize: pack.size });
    const root = tempDir("runtime-pack-root");
    await expect(manager(root, def).installArchive(def, pack.archivePath)).rejects.toMatchObject({
      code: "RUNTIME_PACK_HASH_MISMATCH",
    } satisfies Partial<RuntimePackError>);
    expect(fs.existsSync(path.join(root, "fake-runtime", "1.0.0", fixtureExecutable))).toBe(false);
  });

  it("PACK-005/PACK-006 installs atomically after verify and probe", async () => {
    const pack = await createFakePack(goodFixture());
    const def = definition({ sha256: pack.sha256, compressedSize: pack.size });
    const root = tempDir("runtime-pack-root");
    const installed = await manager(root, def).installArchive(def, pack.archivePath);
    expect(installed.state).toBe("AVAILABLE");
    expect(fs.existsSync(path.join(root, "fake-runtime", "1.0.0", "manifest.json"))).toBe(true);
    expect(fs.existsSync(path.join(root, "fake-runtime", "1.0.0.staging"))).toBe(false);
  });

  it("PACK-007 cleans interrupted or invalid archive installs", async () => {
    const root = tempDir("runtime-pack-root");
    const archive = path.join(root, "broken.zip");
    fs.writeFileSync(archive, "not a zip");
    const def = definition({ sha256: crypto.createHash("sha256").update("not a zip").digest("hex"), compressedSize: 9 });
    await expect(manager(root, def).installArchive(def, archive)).rejects.toMatchObject({
      code: "RUNTIME_PACK_INSTALL_FAILED",
    } satisfies Partial<RuntimePackError>);
    const packRoot = path.join(root, "fake-runtime");
    expect(fs.existsSync(packRoot) ? fs.readdirSync(packRoot).filter((name) => name.includes("staging")) : []).toHaveLength(0);
  });

  it("PACK-008/PACK-009 reports broken runtime after health probe failure", async () => {
    const pack = await createFakePack(badFixture());
    const def = definition({ sha256: pack.sha256, compressedSize: pack.size });
    const root = tempDir("runtime-pack-root");
    await expect(manager(root, def).installArchive(def, pack.archivePath)).rejects.toMatchObject({
      code: "RUNTIME_PACK_BROKEN",
    } satisfies Partial<RuntimePackError>);
  });

  it("PACK-010 uninstalls only the selected pack version", async () => {
    const pack = await createFakePack(goodFixture());
    const def = definition({ sha256: pack.sha256, compressedSize: pack.size });
    const root = tempDir("runtime-pack-root");
    const runtime = manager(root, def);
    await runtime.installArchive(def, pack.archivePath);
    await runtime.uninstall("fake-runtime");
    expect(fs.existsSync(path.join(root, "fake-runtime", "1.0.0"))).toBe(false);
  });

  it("PACK-011 preserves previous version when upgrade install fails", async () => {
    const ok = await createFakePack(goodFixture());
    const root = tempDir("runtime-pack-root");
    const v1 = definition({ sha256: ok.sha256, compressedSize: ok.size });
    await manager(root, v1).installArchive(v1, ok.archivePath);
    const bad = await createFakePack(badFixture());
    const v2 = definition({ version: "1.0.0", sha256: bad.sha256, compressedSize: bad.size });
    await expect(manager(root, v2).installArchive(v2, bad.archivePath)).rejects.toMatchObject({
      code: "RUNTIME_PACK_BROKEN",
    } satisfies Partial<RuntimePackError>);
    expect(fs.existsSync(path.join(root, "fake-runtime", "1.0.0", "install.json"))).toBe(true);
  });

  it("PACK-012 keeps HTML image routes discoverable as installable", () => {
    const routes = getAvailableDestinations("md", new Set(["pandoc", "html-renderer-installable", "sharp"]), {
      environment: "linux",
    });
    const png = routes.find((route) => route.destination === "png");
    expect(png?.steps.map((step) => `${step.source}->${step.target}`)).toEqual(["md->html", "html->png"]);
  });

  it("rejects zip-slip paths", async () => {
    const pack = await createFakePack({
      "../escape": "bad",
      [fixtureExecutable]: goodFixture()[fixtureExecutable],
    });
    const def = definition({ sha256: pack.sha256, compressedSize: pack.size });
    const root = tempDir("runtime-pack-root");
    await expect(manager(root, def).installArchive(def, pack.archivePath)).rejects.toMatchObject({
      code: "RUNTIME_PACK_INSTALL_FAILED",
    } satisfies Partial<RuntimePackError>);
  });
});
