/**
 * Regression test: when yt-dlp merges into a different container than the
 * literal outputPath implied (e.g. "source-max" quality always merges into
 * mkv while the user requested mp4), the job must not crash with a raw
 * ENOENT leaking a local file path — it must remux into the exact
 * requested path, or fail with a clear, classified message.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { EventEmitter } from "events";
import * as child_process from "child_process";
import fs from "fs";
import path from "path";

vi.mock("child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("child_process")>();
  return { ...original, spawn: vi.fn() };
});

vi.mock("@/lib/media/metadata", () => ({
  getVideoMetadata: vi.fn().mockResolvedValue({
    videoId: "88fD-UtG_yo",
    title: "Test Video",
    channel: "Test Channel",
    thumbnailUrl: null,
    durationSeconds: 120,
    durationLabel: "2:00",
    availableHeights: [1080],
    supported: true,
    videoFormats: [],
    audioFormats: [],
  }),
}));

vi.mock("@/lib/jobs/disk-space-check", () => ({
  checkDiskSpace: vi.fn().mockResolvedValue({ sufficient: true, message: "" }),
}));

const updateJobMock = vi.fn();
const getJobMock = vi.fn();

vi.mock("@/lib/jobs/job-manager", () => ({
  jobManager: {
    getJob: (...args: unknown[]) => getJobMock(...args),
    updateJob: (...args: unknown[]) => updateJobMock(...args),
  },
}));

function makeFakeProcess() {
  const proc = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
}

describe("processJob — yt-dlp extension mismatch (source-max merges to mkv, target is mp4)", () => {
  let jobDir: string;

  afterEach(() => {
    vi.clearAllMocks();
    if (jobDir) fs.rmSync(jobDir, { recursive: true, force: true });
  });

  it("remuxes the actual mkv output into the requested output.mp4 path", async () => {
    getJobMock.mockReturnValue({
      id: "job-mismatch",
      input_kind: "remote-url",
      input_reference: "https://youtu.be/88fD-UtG_yo",
      input_title: null,
      output_format: "mp4",
      quality: JSON.stringify({ profile: "source-max", resolutionLimit: "max", fallbackPolicy: "reject" }),
    });

    const spawnMock = vi.mocked(child_process.spawn);

    // First spawn (yt-dlp) is controlled manually below — it "writes"
    // output.mkv instead of output.mp4 (the real-world extension-rewrite
    // behavior this test exercises). Every later spawn (ffmpeg remux,
    // ffprobe post-verify steps) auto-succeeds immediately — their exact
    // timing isn't what this test is about.
    const ytdlpProc = makeFakeProcess();
    const ffmpegProc = makeFakeProcess();
    let call = 0;
    spawnMock.mockImplementation(() => {
      call++;
      if (call === 1) return ytdlpProc as unknown as ReturnType<typeof child_process.spawn>;
      if (call === 2) return ffmpegProc as unknown as ReturnType<typeof child_process.spawn>;
      const proc = makeFakeProcess();
      setImmediate(() => proc.emit("close", 0));
      return proc as unknown as ReturnType<typeof child_process.spawn>;
    });

    const { processJob } = await import("../../src/lib/media/processor");
    const { CONFIG } = await import("../../src/lib/config");

    const jobPromise = processJob("job-mismatch");

    // Let getVideoMetadata + disk check settle
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    jobDir = path.join(CONFIG.media.tempDir, "job-mismatch");
    // Simulate yt-dlp having actually written output.mkv (not output.mp4)
    fs.mkdirSync(jobDir, { recursive: true });
    fs.writeFileSync(path.join(jobDir, "output.mkv"), "fake-mkv-bytes");
    ytdlpProc.emit("close", 0);

    // Let ensureOutputAtPath's readdirSync/spawn(ffmpeg) kick in
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    // Simulate ffmpeg remux producing the real output.mp4
    fs.writeFileSync(path.join(jobDir, "output.mp4"), "fake-mp4-bytes");
    ffmpegProc.emit("close", 0);

    await jobPromise;

    // The core fix: ensureOutputAtPath must have found the mkv yt-dlp
    // actually wrote and remuxed it into the exact path the rest of the
    // pipeline expects — no more raw ENOENT on a nonexistent output.mp4.
    expect(fs.existsSync(path.join(jobDir, "output.mp4"))).toBe(true);
    expect(fs.existsSync(path.join(jobDir, "output.mkv"))).toBe(false);

    // Any later failure (this test doesn't fake real ffprobe JSON output,
    // so the post-verify step legitimately can't succeed) must NOT be the
    // raw, path-leaking ENOENT this fix specifically eliminates.
    const failedCall = updateJobMock.mock.calls.find((c) => c[1]?.status === "failed");
    if (failedCall) {
      expect(failedCall[1].error_message).not.toContain("ENOENT");
      expect(failedCall[1].error_message).not.toContain(jobDir);
    }
  });

  it("fails with a clear, non-leaking message when yt-dlp produces no output file at all", async () => {
    getJobMock.mockReturnValue({
      id: "job-noout",
      input_kind: "remote-url",
      input_reference: "https://youtu.be/88fD-UtG_yo",
      input_title: null,
      output_format: "mp4",
      quality: JSON.stringify({ profile: "mp4-compatible", resolutionLimit: "max", fallbackPolicy: "reject" }),
    });

    const spawnMock = vi.mocked(child_process.spawn);
    const ytdlpProc = makeFakeProcess();
    spawnMock.mockReturnValue(ytdlpProc as unknown as ReturnType<typeof child_process.spawn>);

    const { processJob } = await import("../../src/lib/media/processor");
    const { CONFIG } = await import("../../src/lib/config");

    const jobPromise = processJob("job-noout");

    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    jobDir = path.join(CONFIG.media.tempDir, "job-noout");
    fs.mkdirSync(jobDir, { recursive: true });
    // yt-dlp "succeeds" (exit 0) but writes nothing — no output.* at all.
    ytdlpProc.emit("close", 0);

    await jobPromise;

    const failedCall = updateJobMock.mock.calls.find((c) => c[1]?.status === "failed");
    expect(failedCall).toBeDefined();
    expect(failedCall![1].error_message).not.toContain("ENOENT");
    expect(failedCall![1].error_message).not.toContain(jobDir);
    expect(failedCall![1].error_message).toContain("MP4 compatible");
  });
});
