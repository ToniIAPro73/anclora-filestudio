// Execution tests for FFmpeg extract-frames: multi-output frame discovery,
// success/failure contract, and ZIP packaging.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import JSZip from "jszip";
import { FFmpegEngine } from "../../src/lib/engines/media/ffmpeg-engine";
import { CONFIG } from "../../src/lib/config";
import type { ConversionPlan } from "../../src/lib/domain/engines";
import { ProcessRunner } from "../../src/lib/infrastructure/processes/process-runner";

const testDir = path.join(CONFIG.media.tempDir, "tests", `ffmpeg-frames-${crypto.randomUUID()}`);

beforeAll(() => {
  fs.mkdirSync(testDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

async function writeSyntheticVideo(filePath: string, durationSeconds: number): Promise<void> {
  const runner = new ProcessRunner("ffmpeg", 30_000);
  const result = await runner.run({
    args: [
      "-y", "-f", "lavfi", "-i", `testsrc=duration=${durationSeconds}:size=64x64:rate=10`,
      "-pix_fmt", "yuv420p", filePath,
    ],
    timeoutMs: 30_000,
  });
  if (result.exitCode !== 0) throw new Error(`Failed to build synthetic video: ${result.stderr.slice(0, 300)}`);
}

function plan(inputPath: string, outputPath: string, options: Record<string, unknown> = {}): ConversionPlan {
  return {
    jobId: crypto.randomUUID(),
    engineId: "ffmpeg-media",
    operation: "extract-frames",
    inputPath,
    outputPath,
    outputFormat: "jpg",
    options,
    args: [],
    env: {},
    timeoutMs: 30_000,
    estimatedSizeBytes: null,
  };
}

describe("FFmpegEngine extract-frames", () => {
  it("probes ffmpeg availability without throwing", async () => {
    const probe = await new FFmpegEngine().probe();
    expect(typeof probe.available).toBe("boolean");
  });

  it("succeeds and packages numbered frames into a ZIP (regression: literal %04d path is never checked)", async () => {
    const engine = new FFmpegEngine();
    const probe = await engine.probe();
    if (!probe.available) {
      console.warn("SKIP: ffmpeg not available");
      return;
    }

    const inputPath = path.join(testDir, "two seconds.mp4");
    const outputPath = path.join(testDir, "two seconds frames.jpg");
    await writeSyntheticVideo(inputPath, 2);

    const result = await engine.execute(plan(inputPath, outputPath, { quality: "1", durationSeconds: 2 }));
    expect(result.success).toBe(true);
    expect(path.extname(result.outputPath).toLowerCase()).toBe(".zip");
    expect(fs.existsSync(result.outputPath)).toBe(true);
    // The original single-file path (the old literal check target) was never created.
    expect(fs.existsSync(outputPath)).toBe(false);

    const zip = await JSZip.loadAsync(fs.readFileSync(result.outputPath));
    const entries = Object.keys(zip.files);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.length).toBeLessThanOrEqual(4); // ~2 frames at 1fps for a 2s clip, generous bound
    for (const entry of entries) expect(entry).toMatch(/^frame-\d{4}\.jpg$/);

    // No orphan work dir left behind on success.
    const leftovers = fs.readdirSync(testDir).filter((e) => e.startsWith(".ffmpeg-frames-"));
    expect(leftovers).toEqual([]);
  });

  it("fails with a clear error and cleans up when FFmpeg exits 0 but produces zero frames", async () => {
    const engine = new FFmpegEngine();
    const probe = await engine.probe();
    if (!probe.available) {
      console.warn("SKIP: ffmpeg not available");
      return;
    }

    const inputPath = path.join(testDir, "seek past end.mp4");
    const outputPath = path.join(testDir, "seek past end frames.jpg");
    await writeSyntheticVideo(inputPath, 2);

    // Seeking past the clip's duration makes ffmpeg exit 0 with zero encoded frames —
    // exactly the "success by exit code alone" trap the old check fell into.
    const result = await engine.execute(plan(inputPath, outputPath, { quality: "1", trimStart: "999" }));
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(fs.existsSync(outputPath)).toBe(false);

    const leftovers = fs.readdirSync(testDir).filter((e) => e.startsWith(".ffmpeg-frames-"));
    expect(leftovers).toEqual([]);
  });

  it("fails cleanly when FFmpeg itself errors out (corrupt input)", async () => {
    const engine = new FFmpegEngine();
    const probe = await engine.probe();
    if (!probe.available) {
      console.warn("SKIP: ffmpeg not available");
      return;
    }

    const inputPath = path.join(testDir, "corrupt.mp4");
    const outputPath = path.join(testDir, "corrupt frames.jpg");
    fs.writeFileSync(inputPath, "not a real video file");

    const result = await engine.execute(plan(inputPath, outputPath, { quality: "1" }));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ffmpeg exit/);

    const leftovers = fs.readdirSync(testDir).filter((e) => e.startsWith(".ffmpeg-frames-"));
    expect(leftovers).toEqual([]);
  });

  it("handles filenames with spaces and Unicode characters", async () => {
    const engine = new FFmpegEngine();
    const probe = await engine.probe();
    if (!probe.available) {
      console.warn("SKIP: ffmpeg not available");
      return;
    }

    const inputPath = path.join(testDir, "vídeo con espacios áéí.mp4");
    const outputPath = path.join(testDir, "vídeo con espacios áéí frames.jpg");
    await writeSyntheticVideo(inputPath, 1);

    const result = await engine.execute(plan(inputPath, outputPath, { quality: "1", durationSeconds: 1 }));
    expect(result.success).toBe(true);
    const zip = await JSZip.loadAsync(fs.readFileSync(result.outputPath));
    expect(Object.keys(zip.files).length).toBeGreaterThan(0);
  });
});
