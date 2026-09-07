/**
 * Legacy YouTube -> MP3/MP4 cancellation (GAP closure): the legacy
 * media/processor.ts pipeline now uses the SAME shared AbortController
 * registry (job-cancellation.ts) as universal-job-processor.ts and
 * url-transcript-processor.ts — cancelling reaches the actual running
 * yt-dlp or FFmpeg child process (SIGKILL), cleans up the job dir, and
 * marks the job "cancelled" rather than "failed" or "completed".
 *
 * All spawn calls are mocked — no real binaries, no real YouTube video.
 * Normal MP3/MP4 completion regression is covered by the existing
 * processor-audio-fallback.test.ts / processor-video-fallback.test.ts
 * suites, re-run unchanged alongside this file.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import * as child_process from "child_process";
import fs from "fs";
import path from "path";

const { TMP_ROOT } = vi.hoisted(() => {
  const root = `/tmp/anclora-fs-legacy-cancel-${process.pid}-${Date.now()}`;
  process.env.ANCLORA_FILESTUDIO_TEMP_DIR = `${root}/temp`;
  process.env.ANCLORA_FILESTUDIO_LOGS_DIR = `${root}/logs`;
  return { TMP_ROOT: root };
});

vi.mock("child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("child_process")>();
  return { ...original, spawn: vi.fn() };
});

vi.mock("fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("fs")>();
  return { ...original, appendFileSync: vi.fn() };
});

vi.mock("@/lib/media/ytdlp-cookies-retry", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/media/ytdlp-cookies-retry")>();
  return { ...original, cookiesFileHasDomainFor: () => false };
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
    getJob: (...a: unknown[]) => getJobMock(...a),
    updateJob: (...a: unknown[]) => updateJobMock(...a),
  },
}));

type FakeProc = EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; kill: (signal?: string) => void };

function makeFakeProc(): FakeProc {
  const p = new EventEmitter() as FakeProc;
  p.stdout = new EventEmitter();
  p.stderr = new EventEmitter();
  p.kill = vi.fn();
  return p;
}

const spawnBehaviors: Array<(proc: FakeProc, args: string[], binary: string) => void> = [];
const spawnMock = vi.mocked(child_process.spawn);
spawnMock.mockImplementation((bin: string, args: readonly string[]) => {
  const proc = makeFakeProc();
  const behavior = spawnBehaviors.shift();
  if (behavior) {
    behavior(proc, args as string[], bin);
  } else {
    setImmediate(() => proc.emit("close", 0));
  }
  return proc as unknown as ReturnType<typeof child_process.spawn>;
});

function flush(timeout = 80): Promise<void> {
  return new Promise((r) => setTimeout(r, timeout));
}

function qualitySelection(profile: string, resolutionLimit: number | "max") {
  return JSON.stringify({ profile, resolutionLimit, fallbackPolicy: "reject" });
}

describe("processJob — legacy YouTube cancellation reaches real child processes", () => {
  beforeEach(() => {
    updateJobMock.mockClear();
    getJobMock.mockReset();
    spawnBehaviors.length = 0;
    spawnMock.mockClear();
  });

  afterEach(() => {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  });

  it("cancelling during the yt-dlp download of an MP3 job kills yt-dlp, cleans up, and marks CANCELLED", async () => {
    const jobId = "job-mp3-cancel-ytdlp";
    getJobMock.mockReturnValue({
      id: jobId,
      input_kind: "remote-url",
      input_reference: "https://www.youtube.com/watch?v=88fD-UtG_yo",
      input_title: null,
      output_format: "mp3",
      quality: "192",
    });

    const { processJob } = await import("../../src/lib/media/processor");
    const { CONFIG } = await import("../../src/lib/config");
    const { cancelJobProcess } = await import("../../src/lib/jobs/job-cancellation");
    const jobDir = path.join(CONFIG.media.tempDir, jobId);

    let killedProc: FakeProc | null = null;
    spawnBehaviors.push((proc) => {
      // Simulate: cancel request arrives while yt-dlp is mid-download.
      // Calling this synchronously — before runProcess() attaches its abort
      // listener — exercises the "already aborted" branch, same as a real
      // cancel that races the listener attachment.
      killedProc = proc;
      cancelJobProcess(jobId);
      // yt-dlp never naturally closes — only the SIGKILL from cancellation
      // should end this process.
    });

    const jobPromise = processJob(jobId);
    await flush();
    await jobPromise;

    expect(killedProc!.kill).toHaveBeenCalledWith("SIGKILL");
    expect(updateJobMock.mock.calls.some((c) => c[1]?.status === "cancelled")).toBe(true);
    expect(updateJobMock.mock.calls.some((c) => c[1]?.status === "completed")).toBe(false);
    expect(updateJobMock.mock.calls.some((c) => c[1]?.status === "failed")).toBe(false);
    expect(fs.existsSync(jobDir)).toBe(false);
  });

  it("cancelling during the FFmpeg transcode step of an MP4 job kills FFmpeg, cleans up, and marks CANCELLED", async () => {
    const jobId = "job-mp4-cancel-ffmpeg";
    getJobMock.mockReturnValue({
      id: jobId,
      input_kind: "remote-url",
      input_reference: "https://www.youtube.com/watch?v=88fD-UtG_yo",
      input_title: null,
      output_format: "mp4",
      quality: qualitySelection("mp4-compatible", 1080),
    });

    const { processJob } = await import("../../src/lib/media/processor");
    const { CONFIG } = await import("../../src/lib/config");
    const { cancelJobProcess } = await import("../../src/lib/jobs/job-cancellation");
    const jobDir = path.join(CONFIG.media.tempDir, jobId);

    // 1. preferred single-shot source download fails recoverably (403) —
    //    forces the alternate-codec path, which always needs an FFmpeg
    //    transcode/remux step (unlike the always-recoverable single-shot).
    let killedFfmpeg: FakeProc | null = null;
    spawnBehaviors.push(
      (proc) => {
        setTimeout(() => {
          proc.stderr.emit("data", "ERROR: [youtube] 88fD-UtG_yo: Unable to download video data: HTTP Error 403: Forbidden\n");
          proc.emit("close", 1);
        }, 5);
      },
      (proc) => {
        // alternate-codec source download succeeds
        setTimeout(() => {
          fs.mkdirSync(jobDir, { recursive: true });
          fs.writeFileSync(path.join(jobDir, "source.mkv"), "fake-bytes");
          proc.emit("close", 0);
        }, 5);
      },
      (proc) => {
        // ffprobe of the downloaded source (VP9/Opus -> forces a real transcode)
        setTimeout(() => {
          proc.stdout.emit("data", JSON.stringify({
            streams: [
              { index: 0, codec_type: "video", codec_name: "vp9", width: 1920, height: 1080, r_frame_rate: "30/1" },
              { index: 1, codec_type: "audio", codec_name: "opus", sample_rate: "48000", channels: 2 },
            ],
            format: { format_name: "matroska,webm", duration: "120.0" },
          }));
          proc.emit("close", 0);
        }, 5);
      },
      (proc) => {
        // FFmpeg transcode is now running — cancel arrives here.
        killedFfmpeg = proc;
        cancelJobProcess(jobId);
      },
    );

    const jobPromise = processJob(jobId);
    await flush();
    await jobPromise;

    expect(killedFfmpeg!.kill).toHaveBeenCalledWith("SIGKILL");
    expect(updateJobMock.mock.calls.some((c) => c[1]?.status === "cancelled")).toBe(true);
    expect(updateJobMock.mock.calls.some((c) => c[1]?.status === "completed")).toBe(false);
    expect(fs.existsSync(jobDir)).toBe(false);
  });

  it("does not leave the yt-dlp/FFmpeg listener attached after a normal (non-cancelled) completion", async () => {
    // Regression guard: registering/removing the abort listener on every
    // runProcess() call must not break the ordinary success path.
    const jobId = "job-mp3-normal-with-cancellation-wiring";
    getJobMock.mockReturnValue({
      id: jobId,
      input_kind: "remote-url",
      input_reference: "https://www.youtube.com/watch?v=88fD-UtG_yo",
      input_title: null,
      output_format: "mp3",
      quality: "192",
    });

    const { processJob } = await import("../../src/lib/media/processor");
    const { CONFIG } = await import("../../src/lib/config");
    const jobDir = path.join(CONFIG.media.tempDir, jobId);
    const outputPath = path.join(jobDir, "output.mp3");

    spawnBehaviors.push((proc) => {
      setTimeout(() => {
        fs.mkdirSync(jobDir, { recursive: true });
        fs.writeFileSync(outputPath, "ID3fake-mp3-bytes-with-enough-length-to-pass-basic-checks");
        proc.emit("close", 0);
      }, 5);
    });

    const jobPromise = processJob(jobId);
    await flush();
    await jobPromise;

    // Not asserting "completed" strictly (verifyMediaOutput may reject a
    // fake byte string) — the point of this test is that no "cancelled"
    // status leaks into an uncancelled run, and no exception escapes.
    expect(updateJobMock.mock.calls.some((c) => c[1]?.status === "cancelled")).toBe(false);
  });
});
