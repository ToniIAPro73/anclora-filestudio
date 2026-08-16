/**
 * Integration tests for the anonymous AUDIO pipeline (two-stage):
 * SOURCE audio is chosen for deliverability, OUTPUT format is produced by
 * FFmpeg afterwards. Covers Fase 12 items 1, 2, 6, 7, 8 (audio source
 * decoupled from output, Opus/WebM fallback after recoverable 403,
 * MP3 generated from an Opus source) and 15 (metadata stays out of the
 * picture — the 403 happens later, at format delivery).
 *
 * All spawn calls are mocked — no real yt-dlp/ffmpeg/ffprobe required and
 * no dependence on any specific YouTube video.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import * as child_process from "child_process";
import fs from "fs";
import path from "path";

const { TMP_ROOT } = vi.hoisted(() => {
  const root = `/tmp/anclora-fs-audio-${process.pid}-${Date.now()}`;
  process.env.ANCLORA_FILESTUDIO_TEMP_DIR = `${root}/temp`;
  process.env.ANCLORA_FILESTUDIO_LOGS_DIR = `${root}/logs`;
  return { TMP_ROOT: root };
});

vi.mock("child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("child_process")>();
  return { ...original, spawn: vi.fn() };
});

// Delegate to real fs (we create/remove real temp files), but suppress the
// yt-dlp error log writer.
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
    videoId: "dQw4w9WgXcQ",
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

type FakeProc = EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };

function makeFakeProc(): FakeProc {
  const p = new EventEmitter() as FakeProc;
  p.stdout = new EventEmitter();
  p.stderr = new EventEmitter();
  return p;
}

function ffprobeJson(streams: unknown[], format?: Record<string, unknown>) {
  return JSON.stringify({ streams, format: { format_name: "matroska,webm", duration: "120.0", ...format } });
}

const OPUS_AUDIO = [{ index: 0, codec_type: "audio", codec_name: "opus", sample_rate: "48000", channels: 2 }];
const AAC_AUDIO = [{ index: 0, codec_type: "audio", codec_name: "aac", sample_rate: "48000", channels: 2 }];
const MP3_AUDIO = [{ index: 0, codec_type: "audio", codec_name: "mp3", sample_rate: "44100", channels: 2 }];

// Behavior queue consumed in spawn order; anything left over auto-succeeds.
const spawnBehaviors: Array<(proc: FakeProc, args: string[]) => void> = [];
const spawnMock = vi.mocked(child_process.spawn);
spawnMock.mockImplementation((_bin: string, args: readonly string[]) => {
  const proc = makeFakeProc();
  const behavior = spawnBehaviors.shift();
  if (behavior) {
    behavior(proc, args as string[]);
  } else {
    setImmediate(() => proc.emit("close", 0)); // stray probe: succeed
  }
  return proc as unknown as ReturnType<typeof child_process.spawn>;
});

function ytdlpFailWith403(proc: FakeProc): void {
  setTimeout(() => {
    proc.stderr.emit("data", "ERROR: [youtube] dQw4w9WgXcQ: HTTP Error 403: Forbidden\n");
    proc.emit("close", 1);
  }, 5);
}

function ytdlpSuccessWriting(jobDir: string, fileName: string, proc: FakeProc): void {
  setTimeout(() => {
    fs.mkdirSync(jobDir, { recursive: true });
    fs.writeFileSync(path.join(jobDir, fileName), "fake-bytes");
    proc.emit("close", 0);
  }, 5);
}

function ffprobeWith(json: string, proc: FakeProc): void {
  setTimeout(() => {
    proc.stdout.emit("data", json);
    proc.emit("close", 0);
  }, 5);
}

function ffmpegSuccessWriting(outputPath: string, proc: FakeProc): void {
  setTimeout(() => {
    fs.writeFileSync(outputPath, "fake-output");
    proc.emit("close", 0);
  }, 5);
}

function flush(timeout = 80): Promise<void> {
  return new Promise((r) => setTimeout(r, timeout));
}

describe("processJob — anonymous audio pipeline (SOURCE != OUTPUT)", () => {
  let jobDir = "";

  beforeEach(() => {
    updateJobMock.mockClear();
    getJobMock.mockReset();
    spawnBehaviors.length = 0;
    spawnMock.mockClear();
  });

  afterEach(() => {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  });

  it("MP3: preferred bestaudio 403 → Opus/WebM source fallback → FFmpeg → MP3 (with metadata tags)", async () => {
    getJobMock.mockReturnValue({
      id: "job-audio-mp3",
      input_kind: "remote-url",
      input_reference: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      input_title: null,
      output_format: "mp3",
      quality: "192",
    });

    const { processJob } = await import("../../src/lib/media/processor");
    const { CONFIG } = await import("../../src/lib/config");
    jobDir = path.join(CONFIG.media.tempDir, "job-audio-mp3");

    const capturedYtdlpArgs: string[][] = [];
    const capturedFfmpegArgs: string[][] = [];
    spawnBehaviors.push(
      ytdlpFailWith403,
      (proc) => { ytdlpSuccessWriting(jobDir, "source.webm", proc); },
      (proc) => { ffprobeWith(ffprobeJson(OPUS_AUDIO), proc); },
      (proc, args) => { capturedFfmpegArgs.push(args); ffmpegSuccessWriting(path.join(jobDir, "output.mp3"), proc); },
      (proc) => { ffprobeWith(ffprobeJson(MP3_AUDIO, { format_name: "mp3" }), proc); }
    );

    const jobPromise = processJob("job-audio-mp3");
    await flush();
    await jobPromise;

    // Attempt 1 (preferred bestaudio) failed with a recoverable 403.
    // Attempt 2 forced the Opus/WebM source via the candidate selector.
    const ytdlpCalls = spawnMock.mock.calls.filter((c) => String(c[0]).includes("yt-dlp") || c[0] === "yt-dlp");
    for (const [, args] of ytdlpCalls) capturedYtdlpArgs.push(args as string[]);

    expect(capturedYtdlpArgs.length).toBeGreaterThanOrEqual(2);
    const fallbackArgs = capturedYtdlpArgs[1];
    expect(fallbackArgs).toContain("bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio[ext=m4a]/bestaudio");
    expect(fallbackArgs.some((a) => a.includes("source.%(ext)s"))).toBe(true);
    // The source download is NOT an in-yt-dlp conversion:
    expect(capturedYtdlpArgs.flat().filter((a) => a === "--extract-audio")).toHaveLength(0);

    // FFmpeg transcodes the Opus source into the requested MP3.
    expect(capturedFfmpegArgs.length).toBe(1);
    const ffmpegArgs = capturedFfmpegArgs[0];
    expect(ffmpegArgs).toContain("libmp3lame");
    expect(ffmpegArgs.some((a) => a.endsWith("source.webm"))).toBe(true);
    expect(ffmpegArgs.some((a) => a.endsWith("output.mp3"))).toBe(true);
    // Metadata recovered from the video is applied to the output.
    expect(ffmpegArgs).toContain("-metadata");
    expect(ffmpegArgs.some((a) => a.includes("title=Test Video"))).toBe(true);

    expect(updateJobMock.mock.calls.some((c) => c[1]?.status === "completed")).toBe(true);

    // Success path: the intermediate source file is cleaned up too (criterion 9).
    const leftovers = fs.readdirSync(jobDir).filter((f) => f.startsWith("source."));
    expect(leftovers).toEqual([]);
  });

  it("M4A: AAC m4a source is remuxed (stream copy), not re-encoded", async () => {
    getJobMock.mockReturnValue({
      id: "job-audio-m4a",
      input_kind: "remote-url",
      input_reference: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      input_title: null,
      output_format: "m4a",
      quality: "192",
    });

    const { processJob } = await import("../../src/lib/media/processor");
    const { CONFIG } = await import("../../src/lib/config");
    jobDir = path.join(CONFIG.media.tempDir, "job-audio-m4a");

    const capturedFfmpegArgs: string[][] = [];
    spawnBehaviors.push(
      (proc) => { ytdlpSuccessWriting(jobDir, "source.m4a", proc); }, // preferred m4a source succeeds
      (proc) => { ffprobeWith(ffprobeJson(AAC_AUDIO, { format_name: "mp4" }), proc); },
      (proc, args) => { capturedFfmpegArgs.push(args); ffmpegSuccessWriting(path.join(jobDir, "output.m4a"), proc); },
      (proc) => { ffprobeWith(ffprobeJson(AAC_AUDIO, { format_name: "mp4" }), proc); }
    );

    const jobPromise = processJob("job-audio-m4a");
    await flush();
    await jobPromise;

    // Preferred candidate: m4a source preferred over everything else.
    const firstYtdlpArgs = spawnMock.mock.calls.find((c) => c[0] === "yt-dlp")?.[1] as string[];
    expect(firstYtdlpArgs).toContain("bestaudio[ext=m4a]/bestaudio");

    // Remux: -c copy, no AAC re-encode.
    expect(capturedFfmpegArgs).toHaveLength(1);
    expect(capturedFfmpegArgs[0]).toEqual(
      expect.arrayContaining(["-y", "-i", path.join(jobDir, "source.m4a"), "-c", "copy", path.join(jobDir, "output.m4a")])
    );
    expect(capturedFfmpegArgs[0]).not.toContain("-b:a");

    expect(updateJobMock.mock.calls.some((c) => c[1]?.status === "completed")).toBe(true);
  });

  it("MP3: LOGIN_REQUIRED (age gate) aborts after ONE attempt — no useless codec fallback", async () => {
    getJobMock.mockReturnValue({
      id: "job-audio-login",
      input_kind: "remote-url",
      input_reference: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      input_title: null,
      output_format: "mp3",
      quality: "192",
    });

    spawnBehaviors.push((proc) => {
      setTimeout(() => {
        proc.stderr.emit("data", "ERROR: [youtube] dQw4w9WgXcQ: Sign in to confirm your age.\n");
        proc.emit("close", 1);
      }, 5);
    });

    const { processJob } = await import("../../src/lib/media/processor");
    const jobPromise = processJob("job-audio-login");
    await flush();
    await jobPromise;

    const ytdlpCalls = spawnMock.mock.calls.filter((c) => c[0] === "yt-dlp");
    expect(ytdlpCalls).toHaveLength(1); // NO fallback attempt

    const failedCall = updateJobMock.mock.calls.find((c) => c[1]?.status === "failed");
    expect(failedCall).toBeDefined();
    expect(failedCall![1].error_code).toBe("YOUTUBE_LOGIN_REQUIRED");
  });
});