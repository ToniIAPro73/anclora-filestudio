// whisper-cli binary discovery — mirrors calibre-macos-resolution.test.ts's
// approach: verify the 3-tier order (explicit config -> portable dir -> PATH,
// mac-aware) without depending on a real whisper.cpp install in CI.

import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { findWhisperBinary, defaultWhisperModelsRoot, listWhisperModels, getActiveWhisperModel } from "../../src/lib/engines/media/whisper-engine";
import { resolveOnAugmentedPath } from "../../src/lib/binary-resolution";

const originalPlatformOverride = process.env.ANCLORA_FILESTUDIO_PLATFORM;
const originalWhisperPath = process.env.ANCLORA_FILESTUDIO_WHISPER_PATH;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalPlatformOverride === undefined) delete process.env.ANCLORA_FILESTUDIO_PLATFORM;
  else process.env.ANCLORA_FILESTUDIO_PLATFORM = originalPlatformOverride;
  if (originalWhisperPath === undefined) delete process.env.ANCLORA_FILESTUDIO_WHISPER_PATH;
  else process.env.ANCLORA_FILESTUDIO_WHISPER_PATH = originalWhisperPath;
});

describe("findWhisperBinary — explicit config wins", () => {
  it("returns the explicit ANCLORA_FILESTUDIO_WHISPER_PATH override verbatim", async () => {
    vi.resetModules();
    process.env.ANCLORA_FILESTUDIO_WHISPER_PATH = "/custom/path/whisper-cli";
    const mod = await import("../../src/lib/engines/media/whisper-engine");
    expect(mod.findWhisperBinary()).toBe("/custom/path/whisper-cli");
  });
});

describe("findWhisperBinary — portable path", () => {
  it("prefers the portable tools/whisper/whisper-cli path when present on disk", () => {
    delete process.env.ANCLORA_FILESTUDIO_WHISPER_PATH;
    const portablePath = path.resolve(process.cwd(), "tools", "whisper", "whisper-cli");
    vi.spyOn(fs, "existsSync").mockImplementation((p: fs.PathLike) => p === portablePath);
    expect(findWhisperBinary()).toBe(portablePath);
  });
});

describe("findWhisperBinary — PATH fallback (macOS Apple Silicon Homebrew)", () => {
  it("resolves /opt/homebrew/bin/whisper-cli via resolveOnAugmentedPath", () => {
    const onPath = "/opt/homebrew/bin/whisper-cli";
    const fakes = {
      existsSync: (p: string) => p === onPath,
      statSync: () => ({ isFile: () => true }) as fs.Stats,
      accessSync: () => undefined,
    };
    const result = resolveOnAugmentedPath("whisper-cli", {
      pathEnv: "/usr/bin",
      extraDirs: ["/opt/homebrew/bin", "/usr/local/bin"],
      ...fakes,
    });
    expect(result).toBe(onPath);
  });

  it("returns null when whisper-cli is not on PATH or in any extra directory (genuinely missing)", () => {
    const result = resolveOnAugmentedPath("whisper-cli", {
      pathEnv: "/usr/bin",
      extraDirs: ["/opt/homebrew/bin", "/usr/local/bin"],
      existsSync: () => false,
      statSync: () => ({ isFile: () => false }) as fs.Stats,
      accessSync: () => undefined,
    });
    expect(result).toBeNull();
  });
});

describe("findWhisperBinary — cross-platform smoke", () => {
  it("on Windows, does not throw and returns a non-empty string", () => {
    process.env.ANCLORA_FILESTUDIO_PLATFORM = "windows";
    delete process.env.ANCLORA_FILESTUDIO_WHISPER_PATH;
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const result = findWhisperBinary();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("on Linux, does not throw and returns a non-empty string", () => {
    process.env.ANCLORA_FILESTUDIO_PLATFORM = "linux";
    delete process.env.ANCLORA_FILESTUDIO_WHISPER_PATH;
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const result = findWhisperBinary();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("Whisper model discovery", () => {
  it("returns an empty list when the models directory does not exist", () => {
    expect(listWhisperModels("/nonexistent/models/dir")).toEqual([]);
  });

  it("lists only ggml-*.bin files, deriving a stable id from the filename", () => {
    (vi.spyOn(fs, "readdirSync") as unknown as { mockReturnValue: (v: string[]) => void }).mockReturnValue([
      "ggml-small.bin", "ggml-tiny.en.bin", "readme.txt",
    ]);
    vi.spyOn(fs, "statSync").mockReturnValue({ size: 12345 } as fs.Stats);
    const models = listWhisperModels("/fake/models");
    expect(models.map((m) => m.id).sort()).toEqual(["small", "tiny.en"]);
  });

  it("getActiveWhisperModel prefers small > base > tiny when nothing is explicitly requested", () => {
    const models = [
      { id: "tiny", fileName: "ggml-tiny.bin", filePath: "/m/ggml-tiny.bin", sizeBytes: 1 },
      { id: "base", fileName: "ggml-base.bin", filePath: "/m/ggml-base.bin", sizeBytes: 1 },
      { id: "small", fileName: "ggml-small.bin", filePath: "/m/ggml-small.bin", sizeBytes: 1 },
    ];
    expect(getActiveWhisperModel(models)?.id).toBe("small");
  });

  it("getActiveWhisperModel returns the exact requested model id when present", () => {
    const models = [
      { id: "tiny", fileName: "ggml-tiny.bin", filePath: "/m/ggml-tiny.bin", sizeBytes: 1 },
      { id: "small", fileName: "ggml-small.bin", filePath: "/m/ggml-small.bin", sizeBytes: 1 },
    ];
    expect(getActiveWhisperModel(models, "tiny")?.id).toBe("tiny");
  });

  it("getActiveWhisperModel returns null when no models are installed", () => {
    expect(getActiveWhisperModel([])).toBeNull();
  });
});

describe("defaultWhisperModelsRoot", () => {
  it("returns a non-empty path ending in models/whisper", () => {
    const root = defaultWhisperModelsRoot();
    expect(root.replace(/\\/g, "/")).toMatch(/models\/whisper$/);
  });
});
