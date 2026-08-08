import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { expectedOutputPath, LocalOperationRegistry } from "../src/operations.js";
import type { AgentJob } from "../src/types.js";

describe("LocalOperationRegistry", () => {
  it("executes a real JSON to YAML conversion and returns hash metadata", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agent-op-"));
    const input = join(dir, "input.json");
    const output = join(dir, "output.yaml");
    writeFileSync(input, JSON.stringify({ hello: "world", count: 2 }));

    const job: AgentJob = {
      id: "job_json",
      operation: "data.json-to-yaml",
      inputSizeBytes: 27,
      inputFilename: "input.json",
      inputMimeType: "application/json",
      options: {},
      requestingOrg: "Test",
      requestingApp: "Vitest",
      retentionMinutes: 1,
      timeoutMs: 10_000,
    };

    const result = await new LocalOperationRegistry().execute(job, input, output, new AbortController().signal);
    expect(readFileSync(output, "utf8")).toContain("hello: world");
    expect(result.outputSizeBytes).toBeGreaterThan(0);
    expect(result.outputSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("does not advertise unavailable optional sharp operation when probe fails", async () => {
    const caps = await new LocalOperationRegistry([]).capabilities({
      deviceName: "x",
      platform: "linux",
      arch: "x64",
      version: "test",
      policy: "ask-always",
      approvedOperations: [],
      maxFileSizeBytes: 10,
      maxConcurrent: 1,
    }, "dev", "idle");
    expect(caps.operations).toEqual([]);
  });

  it("executes image:resize with sharp, strips metadata and reports output MIME", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agent-resize-"));
    const input = join(dir, "cover.png");
    await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 4,
        background: { r: 74, g: 159, b: 216, alpha: 1 },
      },
    }).png().toFile(input);

    const job: AgentJob = {
      id: "job_resize",
      operation: "image:resize",
      inputSizeBytes: 1,
      inputFilename: "cover.png",
      inputMimeType: "image/png",
      options: { width: 160, fit: "inside", quality: 90 },
      requestingOrg: "anclora",
      requestingApp: "anclora-talent",
      retentionMinutes: 30,
      timeoutMs: 10_000,
    };
    const output = expectedOutputPath(dir, job);
    const result = await new LocalOperationRegistry().execute(job, input, output, new AbortController().signal);
    const metadata = await sharp(output).metadata();

    expect(output.endsWith(".png")).toBe(true);
    expect(metadata.width).toBe(160);
    expect(metadata.height).toBe(90);
    expect(metadata.exif).toBeUndefined();
    expect(result.outputMimeType).toBe("image/png");
  });

  it("executes image:convert to requested output format", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agent-convert-"));
    const input = join(dir, "cover.png");
    await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 3,
        background: { r: 8, g: 16, b: 25 },
      },
    }).png().toFile(input);

    const job: AgentJob = {
      id: "job_convert",
      operation: "image:convert",
      inputSizeBytes: 1,
      inputFilename: "cover.png",
      inputMimeType: "image/png",
      options: { outputFormat: "webp", quality: 80 },
      requestingOrg: "anclora",
      requestingApp: "anclora-talent",
      retentionMinutes: 30,
      timeoutMs: 10_000,
    };
    const output = expectedOutputPath(dir, job);
    const result = await new LocalOperationRegistry().execute(job, input, output, new AbortController().signal);
    const metadata = await sharp(output).metadata();

    expect(output.endsWith(".webp")).toBe(true);
    expect(metadata.format).toBe("webp");
    expect(result.outputMimeType).toBe("image/webp");
  });

  it("rejects image operations with unsupported MIME", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agent-mime-"));
    const input = join(dir, "input.txt");
    writeFileSync(input, "not image");
    const job: AgentJob = {
      id: "job_mime",
      operation: "image:resize",
      inputSizeBytes: 9,
      inputFilename: "input.txt",
      inputMimeType: "text/plain",
      options: { width: 160 },
      requestingOrg: "anclora",
      requestingApp: "anclora-talent",
      retentionMinutes: 30,
      timeoutMs: 10_000,
    };

    await expect(
      new LocalOperationRegistry().execute(job, input, join(dir, "output.png"), new AbortController().signal)
    ).rejects.toThrow("UPLOAD_MIME_REJECTED");
  });

  it("does not advertise sharp image operations when probe is unavailable", async () => {
    const caps = await new LocalOperationRegistry([{
      id: "image:resize",
      engineId: "sharp-image",
      inputMimeTypes: ["image/png"],
      outputMimeType: "image/png",
      async probe() {
        return { available: false, version: null };
      },
      async execute() {
        throw new Error("should not run");
      },
    }]).capabilities({
      deviceName: "x",
      platform: "linux",
      arch: "x64",
      version: "test",
      policy: "ask-always",
      approvedOperations: [],
      maxFileSizeBytes: 10,
      maxConcurrent: 1,
    }, "dev", "idle");
    expect(caps.operations).not.toContain("image:resize");
  });
});
