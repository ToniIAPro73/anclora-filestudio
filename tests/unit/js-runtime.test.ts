// Unit tests for resolveYtdlpNodeRuntime (js-runtime.ts)
// Covers: explicit env override, Windows portable bundled runtime,
//         Linux portable bundled runtime, process.execPath fallback.
//         (Fase 12 items 16/17/18)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("fs")>();
  const mocked = { ...original, existsSync: vi.fn() };
  // CJS interop: default export must be the mocked namespace object.
  return { ...mocked, default: mocked };
});

import fs from "fs";
import { resolveYtdlpNodeRuntime } from "../../src/lib/media/js-runtime";

describe("resolveYtdlpNodeRuntime", () => {
  const existsMock = vi.mocked(fs.existsSync);
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    existsMock.mockReset();
  });

  afterEach(() => {
    delete process.env.ANCLORA_FILESTUDIO_NODE_PATH;
    delete process.env.ANCLORA_FILESTUDIO_PLATFORM;
    cwdSpy?.mockRestore();
  });

  it("uses the explicit ANCLORA_FILESTUDIO_NODE_PATH when it EXISTS as a regular file", () => {
    process.env.ANCLORA_FILESTUDIO_NODE_PATH = "/opt/fs/runtime/node";
    const statSpy = vi.spyOn(fs, "statSync").mockReturnValue({ isFile: () => true } as fs.Stats);
    const result = resolveYtdlpNodeRuntime();
    expect(result).toBe("/opt/fs/runtime/node");
    statSpy.mockRestore();
  });

  it("REJECTS a nonexistent explicit ANCLORA_FILESTUDIO_NODE_PATH and falls through to the bundled portable runtime", () => {
    process.env.ANCLORA_FILESTUDIO_NODE_PATH = "C:\\Anclora FileStudio\\runtime\\node.exe"; // does not exist on this host
    process.env.ANCLORA_FILESTUDIO_PLATFORM = "windows";
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("C:\\Anclora FileStudio-Windows-x64");
    existsMock.mockImplementation((p) =>
      String(p).includes("runtime") && String(p).endsWith("node.exe")
    );
    const result = resolveYtdlpNodeRuntime();
    // The env var is NOT returned; the canonical bundled runtime wins.
    expect(result!.endsWith("runtime\\node.exe") || result!.endsWith("runtime/node.exe")).toBe(true);
    expect(result).not.toBe("C:\\Anclora FileStudio\\runtime\\node.exe");
  });

  it("ignores an explicit path that is a DIRECTORY (not a file)", () => {
    process.env.ANCLORA_FILESTUDIO_NODE_PATH = "/opt/fs/runtime"; // directory
    const statSpy = vi.spyOn(fs, "statSync").mockReturnValue({ isFile: () => false } as fs.Stats);
    existsMock.mockImplementation((p) => String(p) === process.execPath);
    const result = resolveYtdlpNodeRuntime();
    expect(result).toBe(process.execPath);
    statSpy.mockRestore();
  });

  it("resolves the Windows portable bundled runtime <cwd>/runtime/node.exe", () => {
    process.env.ANCLORA_FILESTUDIO_PLATFORM = "windows";
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("C:\\Anclora FileStudio-Windows-x64");
    existsMock.mockImplementation((p) =>
      String(p).includes("runtime") && String(p).endsWith("node.exe")
    );
    const result = resolveYtdlpNodeRuntime();
    expect(result).not.toBeNull();
    expect(result!.endsWith("runtime/node.exe") || result!.endsWith("runtime\\node.exe")).toBe(true);
    expect(result).not.toBe(process.execPath); // canonical bundled runtime wins
  });

  it("resolves the Linux portable bundled runtime <cwd>/runtime/node", () => {
    process.env.ANCLORA_FILESTUDIO_PLATFORM = "linux";
    const fakeCwd = "/home/user/Anclora-FileStudio-Linux";
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(fakeCwd);
    existsMock.mockImplementation((p) => String(p).endsWith("runtime/node"));
    const result = resolveYtdlpNodeRuntime();
    expect(result).toBe(`${fakeCwd}/runtime/node`);
  });

  it("does NOT pick runtime/node.exe on Linux (correct executable name per platform)", () => {
    process.env.ANCLORA_FILESTUDIO_PLATFORM = "linux";
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/opt/fs");
    // Only a .exe file exists — on Linux that must NOT be picked; the dev
    // execPath fallback (a real node) is what resolves instead.
    existsMock.mockImplementation((p) => String(p).endsWith("node.exe") || String(p) === process.execPath);
    const result = resolveYtdlpNodeRuntime();
    expect(result).not.toBeNull(); // falls through to process.execPath
    expect(result!.endsWith("node.exe")).toBe(false);
  });

  it("falls back to process.execPath in dev mode when no portable runtime exists", () => {
    existsMock.mockImplementation((p) => String(p) === process.execPath);
    const result = resolveYtdlpNodeRuntime();
    expect(result).toBe(process.execPath);
  });
});