import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { CHROMIUM_RUNTIME_PACKS, CHROMIUM_RUNTIME_VERSION } from "../../../src/lib/runtime-packs/registry/chromium";

interface ToolchainLock {
  runtimePacks: {
    "chromium-runtime": {
      version: string;
      trustedOrigin: string;
      versions: Record<string, {
        sourceUrl: string;
        sha256: string;
        compressedSize: number;
        installedSize: number;
        executablePath: string;
      }>;
    };
  };
}

describe("chromium runtime pack lock contract", () => {
  it("keeps registry definitions pinned to scripts/toolchain.lock.json", () => {
    const lock = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/toolchain.lock.json"), "utf-8")) as ToolchainLock;
    const chromium = lock.runtimePacks["chromium-runtime"];
    expect(chromium.version).toBe(CHROMIUM_RUNTIME_VERSION);

    for (const definition of CHROMIUM_RUNTIME_PACKS) {
      const key = definition.platform === "windows" ? "win-x64" : `${definition.platform}-${definition.architecture}`;
      const locked = chromium.versions[key];
      expect(locked, key).toBeDefined();
      expect(definition.source.url).toBe(locked.sourceUrl);
      expect(definition.source.trustedOrigin).toBe(chromium.trustedOrigin);
      expect(definition.sha256).toBe(locked.sha256);
      expect(definition.compressedSize).toBe(locked.compressedSize);
      expect(definition.installedSize).toBe(locked.installedSize);
      expect(definition.executablePaths[definition.platform]).toBe(locked.executablePath);
    }
  });
});
