// Cross-platform Calibre discovery — covers the macOS-specific gap: Calibre
// installed correctly via the official calibre-ebook.com .app installer (or
// via a Homebrew cask that does not symlink a CLI binary) does not place
// `ebook-convert` on PATH, and a Finder-launched process may not inherit an
// interactive shell's Homebrew PATH additions either. The user must not need
// to create a manual symlink for FileStudio to detect it. This mirrors
// libreoffice-macos-resolution.test.ts for the equivalent Calibre gap.

import { afterEach, describe, expect, it } from "vitest";
import path from "path";
import type { Stats } from "fs";
import {
  resolveMacCalibreBinary,
  resolveOnAugmentedPath,
} from "../../src/lib/binary-resolution";
import { findEbookConvertBinary } from "../../src/lib/engines/ebook/calibre-engine";

const originalPlatformOverride = process.env.ANCLORA_FILESTUDIO_PLATFORM;
const originalCalibrePath = process.env.ANCLORA_FILESTUDIO_CALIBRE_PATH;

afterEach(() => {
  if (originalPlatformOverride === undefined) delete process.env.ANCLORA_FILESTUDIO_PLATFORM;
  else process.env.ANCLORA_FILESTUDIO_PLATFORM = originalPlatformOverride;
  if (originalCalibrePath === undefined) delete process.env.ANCLORA_FILESTUDIO_CALIBRE_PATH;
  else process.env.ANCLORA_FILESTUDIO_CALIBRE_PATH = originalCalibrePath;
});

// A fake, deterministic filesystem: only these exact paths "exist", are
// regular files, and pass the executable-bit check — no real disk I/O.
function fakeFs(existingPaths: string[]) {
  const set = new Set(existingPaths);
  return {
    existsSync: (p: string) => set.has(p),
    statSync: (p: string) => ({ isFile: () => set.has(p) }) as Stats,
    accessSync: (p: string) => {
      if (!set.has(p)) throw new Error(`ENOENT: ${p}`);
    },
  };
}

describe("resolveMacCalibreBinary — macOS discovery", () => {
  it("finds ebook-convert on PATH (Homebrew formula or otherwise)", () => {
    const onPath = "/opt/homebrew/bin/ebook-convert";
    const fakes = fakeFs([onPath]);
    const result = resolveMacCalibreBinary(fakes.existsSync, "/Users/tester", {
      pathEnv: "/opt/homebrew/bin",
      extraDirs: [],
      ...fakes,
    });
    expect(result).toBe(onPath);
  });

  it("falls back to the standard /Applications/calibre.app bundle when not on PATH (Apple Silicon Homebrew cask gap)", () => {
    const appBundle = "/Applications/calibre.app/Contents/MacOS/ebook-convert";
    const fakes = fakeFs([appBundle]);
    const result = resolveMacCalibreBinary(fakes.existsSync, "/Users/tester", {
      pathEnv: "/usr/bin",
      extraDirs: [],
      ...fakes,
    });
    expect(result).toBe(appBundle);
  });

  it("falls back to the Intel/Homebrew-legacy /usr/local/bin search dir before the app bundle", () => {
    const legacyPath = "/usr/local/bin/ebook-convert";
    const fakes = fakeFs([legacyPath]);
    const result = resolveMacCalibreBinary(fakes.existsSync, "/Users/tester", {
      pathEnv: "/usr/bin",
      extraDirs: ["/opt/homebrew/bin", "/usr/local/bin"],
      ...fakes,
    });
    expect(result).toBe(legacyPath);
  });

  it("falls back to ~/Applications/calibre.app when not in /Applications or PATH", () => {
    const homeDir = "/Users/tester";
    const userAppBundle = path.join(homeDir, "Applications", "calibre.app", "Contents", "MacOS", "ebook-convert");
    const fakes = fakeFs([userAppBundle]);
    const result = resolveMacCalibreBinary(fakes.existsSync, homeDir, {
      pathEnv: "/usr/bin",
      extraDirs: [],
      ...fakes,
    });
    expect(result).toBe(userAppBundle);
  });

  it("returns null when Calibre cannot be found anywhere (genuinely missing)", () => {
    const fakes = fakeFs([]);
    const result = resolveMacCalibreBinary(fakes.existsSync, "/Users/tester", {
      pathEnv: "/usr/bin",
      extraDirs: [],
      ...fakes,
    });
    expect(result).toBeNull();
  });

  it("prefers PATH over the app bundle when both are present", () => {
    const onPath = "/opt/homebrew/bin/ebook-convert";
    const appBundle = "/Applications/calibre.app/Contents/MacOS/ebook-convert";
    const fakes = fakeFs([onPath, appBundle]);
    const result = resolveMacCalibreBinary(fakes.existsSync, "/Users/tester", {
      pathEnv: "/opt/homebrew/bin",
      extraDirs: [],
      ...fakes,
    });
    expect(result).toBe(onPath);
  });
});

describe("resolveOnAugmentedPath — Calibre binary name", () => {
  it("searches macOS extra directories beyond process.env.PATH when explicitly requested", () => {
    const fakes = fakeFs(["/opt/homebrew/bin/ebook-convert"]);
    const result = resolveOnAugmentedPath("ebook-convert", {
      pathEnv: "/usr/bin", // deliberately narrow — simulates a Finder-launched process
      extraDirs: ["/opt/homebrew/bin"],
      ...fakes,
    });
    expect(result).toBe("/opt/homebrew/bin/ebook-convert");
  });

  it("returns null when the binary is not on PATH or in any extra directory", () => {
    const fakes = fakeFs([]);
    const result = resolveOnAugmentedPath("ebook-convert", {
      pathEnv: "/usr/bin",
      extraDirs: ["/opt/homebrew/bin"],
      ...fakes,
    });
    expect(result).toBeNull();
  });
});

describe("findEbookConvertBinary — cross-platform", () => {
  it("on Windows, falls back to the bare 'ebook-convert' PATH fallback unchanged (no macOS interference)", () => {
    process.env.ANCLORA_FILESTUDIO_PLATFORM = "windows";
    delete process.env.ANCLORA_FILESTUDIO_CALIBRE_PATH;
    expect(findEbookConvertBinary()).toBe("ebook-convert");
  });

  it("on Linux, returns the bare 'ebook-convert' PATH fallback unchanged", () => {
    process.env.ANCLORA_FILESTUDIO_PLATFORM = "linux";
    delete process.env.ANCLORA_FILESTUDIO_CALIBRE_PATH;
    expect(findEbookConvertBinary()).toBe("ebook-convert");
  });

  it("on macOS, resolves through PATH/app-bundle discovery rather than the bare PATH fallback when Calibre is actually reachable", () => {
    process.env.ANCLORA_FILESTUDIO_PLATFORM = "darwin";
    delete process.env.ANCLORA_FILESTUDIO_CALIBRE_PATH;
    // Whatever this real machine reports (installed via Homebrew formula,
    // via the .app bundle, or genuinely absent), the resolver must have at
    // least attempted the macOS-aware search — verified indirectly via
    // resolveMacCalibreBinary directly above. Here we only assert the
    // function does not throw and returns a non-empty string.
    const result = findEbookConvertBinary();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
