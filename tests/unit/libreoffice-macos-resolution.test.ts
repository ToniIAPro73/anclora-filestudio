// Cross-platform LibreOffice discovery — covers the macOS-specific gap: an
// app installed correctly as /Applications/LibreOffice.app does not place
// `soffice` on PATH, and a Finder-launched process may not inherit an
// interactive shell's Homebrew PATH additions either. The user must not
// need to create a manual symlink for FileStudio to detect it.

import { afterEach, describe, expect, it } from "vitest";
import path from "path";
import type { Stats } from "fs";
import {
  resolveMacLibreOfficeBinary,
  resolveOnAugmentedPath,
} from "../../src/lib/binary-resolution";
import { findLibreofficeBinary } from "../../src/lib/engines/document/libreoffice-engine";

const originalPlatformOverride = process.env.ANCLORA_FILESTUDIO_PLATFORM;
const originalLibreOfficePath = process.env.ANCLORA_FILESTUDIO_LIBREOFFICE_PATH;

afterEach(() => {
  if (originalPlatformOverride === undefined) delete process.env.ANCLORA_FILESTUDIO_PLATFORM;
  else process.env.ANCLORA_FILESTUDIO_PLATFORM = originalPlatformOverride;
  if (originalLibreOfficePath === undefined) delete process.env.ANCLORA_FILESTUDIO_LIBREOFFICE_PATH;
  else process.env.ANCLORA_FILESTUDIO_LIBREOFFICE_PATH = originalLibreOfficePath;
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

describe("resolveMacLibreOfficeBinary — macOS discovery", () => {
  it("finds soffice on PATH (Homebrew or otherwise)", () => {
    const sofficeOnPath = "/opt/homebrew/bin/soffice";
    const fakes = fakeFs([sofficeOnPath]);
    const result = resolveMacLibreOfficeBinary(fakes.existsSync, "/Users/tester", {
      pathEnv: "/opt/homebrew/bin",
      extraDirs: [],
      ...fakes,
    });
    expect(result).toBe(sofficeOnPath);
  });

  it("falls back to the standard /Applications/LibreOffice.app bundle when not on PATH", () => {
    const appBundle = "/Applications/LibreOffice.app/Contents/MacOS/soffice";
    const fakes = fakeFs([appBundle]);
    const result = resolveMacLibreOfficeBinary(fakes.existsSync, "/Users/tester", {
      pathEnv: "/usr/bin",
      extraDirs: [],
      ...fakes,
    });
    expect(result).toBe(appBundle);
  });

  it("falls back to ~/Applications/LibreOffice.app when not in /Applications or PATH", () => {
    const homeDir = "/Users/tester";
    const userAppBundle = path.join(homeDir, "Applications", "LibreOffice.app", "Contents", "MacOS", "soffice");
    const fakes = fakeFs([userAppBundle]);
    const result = resolveMacLibreOfficeBinary(fakes.existsSync, homeDir, {
      pathEnv: "/usr/bin",
      extraDirs: [],
      ...fakes,
    });
    expect(result).toBe(userAppBundle);
  });

  it("returns null when LibreOffice cannot be found anywhere", () => {
    const fakes = fakeFs([]);
    const result = resolveMacLibreOfficeBinary(fakes.existsSync, "/Users/tester", {
      pathEnv: "/usr/bin",
      extraDirs: [],
      ...fakes,
    });
    expect(result).toBeNull();
  });

  it("prefers PATH over the app bundle when both are present", () => {
    const sofficeOnPath = "/opt/homebrew/bin/soffice";
    const appBundle = "/Applications/LibreOffice.app/Contents/MacOS/soffice";
    const fakes = fakeFs([sofficeOnPath, appBundle]);
    const result = resolveMacLibreOfficeBinary(fakes.existsSync, "/Users/tester", {
      pathEnv: "/opt/homebrew/bin",
      extraDirs: [],
      ...fakes,
    });
    expect(result).toBe(sofficeOnPath);
  });
});

describe("resolveOnAugmentedPath", () => {
  it("searches macOS extra directories beyond process.env.PATH when explicitly requested", () => {
    const fakes = fakeFs(["/opt/homebrew/bin/ffmpeg"]);
    const result = resolveOnAugmentedPath("ffmpeg", {
      pathEnv: "/usr/bin", // deliberately narrow — simulates a Finder-launched process
      extraDirs: ["/opt/homebrew/bin"],
      ...fakes,
    });
    expect(result).toBe("/opt/homebrew/bin/ffmpeg");
  });

  it("returns null when the binary is not on PATH or in any extra directory", () => {
    const fakes = fakeFs([]);
    const result = resolveOnAugmentedPath("ffmpeg", {
      pathEnv: "/usr/bin",
      extraDirs: ["/opt/homebrew/bin"],
      ...fakes,
    });
    expect(result).toBeNull();
  });
});

describe("findLibreofficeBinary — cross-platform", () => {
  it("on Windows, falls back to the bare pathFallback list unchanged (no macOS interference)", () => {
    process.env.ANCLORA_FILESTUDIO_PLATFORM = "windows";
    delete process.env.ANCLORA_FILESTUDIO_LIBREOFFICE_PATH;
    // No portable tools/libreoffice dir exists relative to whatever cwd this
    // test happens to run from, so it must fall through to the bare
    // Windows PATH fallback — unaffected by the macOS resolver.
    const result = findLibreofficeBinary();
    expect(["soffice.com", "soffice.exe"]).toContain(result);
  });

  it("on Linux, returns the bare 'libreoffice' PATH fallback unchanged", () => {
    process.env.ANCLORA_FILESTUDIO_PLATFORM = "linux";
    delete process.env.ANCLORA_FILESTUDIO_LIBREOFFICE_PATH;
    expect(findLibreofficeBinary()).toBe("libreoffice");
  });

  it("on macOS, resolves through PATH/app-bundle discovery rather than the generic Linux fallback", () => {
    process.env.ANCLORA_FILESTUDIO_PLATFORM = "darwin";
    delete process.env.ANCLORA_FILESTUDIO_LIBREOFFICE_PATH;
    // Whatever this real machine reports (installed, absent, PATH or app
    // bundle), the result must never be the bare "libreoffice" string —
    // that command does not exist on macOS, unlike Linux/Homebrew's cask.
    const result = findLibreofficeBinary();
    expect(result).not.toBe("libreoffice");
  });
});
