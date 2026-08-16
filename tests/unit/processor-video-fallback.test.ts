/**
 * Integration tests for the VIDEO pipeline candidate fallback
 * (Fase 12 items 3, 4, 5, 9, 10, 11, 12, 13, 14):
 *   - preferred H.264/MP4 source first, recoverable 403 → alternate codec
 *     source (VP9/Opus) → FFmpeg transcode to H.264/AAC MP4 + faststart;
 *   - LOGIN_REQUIRED never triggers fallback;
 *   - WebM remuxes VP9/Opus without transcoding;
 *   - MKV remuxes;
 *   - requested resolution preserved (no silent downscale) and
 *     fallbackPolicy=reject respected;
 *   - FFmpeg errors stay differentiated.
 *
 * All spawn calls are mocked — no real binaries, no real YouTube video.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import * as child_process from "child_process";
import fs from "fs";
import path from "path";

const { TMP_ROOT } = vi.hoisted(() => {
  const root = `/tmp/anclora-fs-video-${process.pid}-${Date.now()}`;
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

// VP9 1080p + Opus — the real-world working representation for 88fD-UtG_yo.
const VP9_OPUS = [
  { index: 0, codec_type: "video", codec_name: "vp9", width: 1920, height: 1080, r_frame_rate: "30/1" },
  { index: 1, codec_type: "audio", codec_name: "opus", sample_rate: "48000", channels: 2 },
];
const H264_AAC = [
  { index: 0, codec_type: "video", codec_name: "h264", width: 1920, height: 1080, r_frame_rate: "30/1" },
  { index: 1, codec_type: "audio", codec_name: "aac", sample_rate: "48000", channels: 2 },
];
const VP9_720 = [
  { index: 0, codec_type: "video", codec_name: "vp9", width: 1280, height: 720, r_frame_rate: "30/1" },
  { index: 1, codec_type: "audio", codec_name: "opus", sample_rate: "48000", channels: 2 },
];

const spawnBehaviors: Array<(proc: FakeProc, args: string[]) => void> = [];
const spawnMock = vi.mocked(child_process.spawn);
spawnMock.mockImplementation((_bin: string, args: readonly string[]) => {
  const proc = makeFakeProc();
  const behavior = spawnBehaviors.shift();
  if (behavior) {
    behavior(proc, args as string[]);
  } else {
    setImmediate(() => proc.emit("close", 0));
  }
  return proc as unknown as ReturnType<typeof child_process.spawn>;
});

function ytdlpFailWith403(proc: FakeProc): void {
  setTimeout(() => {
    proc.stderr.emit("data", "ERROR: [youtube] 88fD-UtG_yo: Unable to download video data: HTTP Error 403: Forbidden\n");
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

function qualitySelection(profile: string, resolutionLimit: number | "max") {
  return JSON.stringify({ profile, resolutionLimit, fallbackPolicy: "reject" });
}

function ytdlpCallArgs(): string[][] {
  return spawnMock.mock.calls
    .filter((c) => c[0] === "yt-dlp")
    .map((c) => c[1] as string[]);
}

describe("processJob — video candidate fallback", () => {
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

  it("MP4 1080: preferred H.264 403 → alternate VP9/Opus source → FFmpeg H.264/AAC MP4 + faststart", async () => {
    getJobMock.mockReturnValue({
      id: "job-video-mp4-fallback",
      input_kind: "remote-url",
      input_reference: "https://www.youtube.com/watch?v=88fD-UtG_yo",
      input_title: null,
      output_format: "mp4",
      quality: qualitySelection("mp4-compatible", 1080),
    });

    const { processJob } = await import("../../src/lib/media/processor");
    const { CONFIG } = await import("../../src/lib/config");
    jobDir = path.join(CONFIG.media.tempDir, "job-video-mp4-fallback");
    const outputPath = path.join(jobDir, "output.mp4");

    let transcodeArgs: string[] = [];
    spawnBehaviors.push(
      ytdlpFailWith403,                                   // 1. preferred (single shot) → recoverable 403
      (proc) => { ytdlpSuccessWriting(jobDir, "source.mkv", proc); }, // 2. alternate source merged to mkv
      (proc) => { ffprobeWith(ffprobeJson(VP9_OPUS), proc); },        // 3. probe source
      (proc, args) => { transcodeArgs = args as string[]; ffmpegSuccessWriting(outputPath, proc); }, // 4. transcode
      (proc) => { ffprobeWith(ffprobeJson(H264_AAC, { format_name: "mp4" }), proc); }, // 5. post-download quality probe
      (proc) => { ffprobeWith(ffprobeJson(H264_AAC, { format_name: "mp4" }), proc); }  // 6. verify in processJob
    );

    const jobPromise = processJob("job-video-mp4-fallback");
    await flush();
    await jobPromise;

    const ytdlpArgs = ytdlpCallArgs();
    expect(ytdlpArgs).toHaveLength(2);

    // Attempt 1 stays the preferred compatible source (H.264/MP4).
    expect(ytdlpArgs[0].some((a) => a.includes("[ext=mp4]"))).toBe(true);
    // Attempt 2 is the alternate-codec source: no ext constraint, merged to mkv.
    const alternate = ytdlpArgs[1];
    expect(alternate.some((a) => a.includes("bestvideo*[height=1080]+bestaudio"))).toBe(true);
    expect(alternate.some((a) => a.includes("[ext=mp4]"))).toBe(false);
    expect(alternate).toContain("--merge-output-format");
    expect(alternate).toContain("mkv");
    expect(alternate.some((a) => a.includes("source.%(ext)s"))).toBe(true);

    // The VP9/Opus source is transcoded to H.264/AAC MP4 with faststart.
    expect(transcodeArgs).toContain("-c:v");
    expect(transcodeArgs).toContain("libx264");
    expect(transcodeArgs).toContain("-c:a");
    expect(transcodeArgs).toContain("aac");
    expect(transcodeArgs).toContain("+faststart");
    expect(transcodeArgs.some((a) => a.includes("scale=-2:min(1080"))).toBe(true); // resolution preserved

    expect(updateJobMock.mock.calls.some((c) => c[1]?.status === "completed")).toBe(true);

    // Success: no intermediate source.* files remain in the job dir (criterion 9).
    const leftovers = fs.readdirSync(jobDir).filter((f) => f.startsWith("source."));
    expect(leftovers).toEqual([]);
  });

  it("MP4: LOGIN_REQUIRED aborts after ONE attempt — never tries alternate codecs", async () => {
    getJobMock.mockReturnValue({
      id: "job-video-login",
      input_kind: "remote-url",
      input_reference: "https://www.youtube.com/watch?v=88fD-UtG_yo",
      input_title: null,
      output_format: "mp4",
      quality: qualitySelection("mp4-compatible", 1080),
    });

    spawnBehaviors.push((proc) => {
      setTimeout(() => {
        proc.stderr.emit("data", "ERROR: [youtube] 88fD-UtG_yo: Sign in to confirm your age.\n");
        proc.emit("close", 1);
      }, 5);
    });

    const { processJob } = await import("../../src/lib/media/processor");
    const jobPromise = processJob("job-video-login");
    await flush();
    await jobPromise;

    expect(ytdlpCallArgs()).toHaveLength(1);
    const failedCall = updateJobMock.mock.calls.find((c) => c[1]?.status === "failed");
    expect(failedCall).toBeDefined();
    expect(failedCall![1].error_code).toBe("YOUTUBE_LOGIN_REQUIRED");
  });

  it("WEBM: VP9/Opus alternate source is REMUXED (stream copy), never re-encoded", async () => {
    getJobMock.mockReturnValue({
      id: "job-video-webm",
      input_kind: "remote-url",
      input_reference: "https://www.youtube.com/watch?v=88fD-UtG_yo",
      input_title: null,
      output_format: "webm",
      quality: qualitySelection("mp4-compatible", 1080),
    });

    const { processJob } = await import("../../src/lib/media/processor");
    const { CONFIG } = await import("../../src/lib/config");
    jobDir = path.join(CONFIG.media.tempDir, "job-video-webm");
    const outputPath = path.join(jobDir, "output.webm");

    let remuxArgs: string[] = [];
    spawnBehaviors.push(
      ytdlpFailWith403,
      (proc) => { ytdlpSuccessWriting(jobDir, "source.webm", proc); },
      (proc) => { ffprobeWith(ffprobeJson(VP9_OPUS), proc); },
      (proc, args) => { remuxArgs = args as string[]; ffmpegSuccessWriting(outputPath, proc); },
      (proc) => { ffprobeWith(ffprobeJson(VP9_OPUS, { format_name: "webm" }), proc); },
      (proc) => { ffprobeWith(ffprobeJson(VP9_OPUS, { format_name: "webm" }), proc); }
    );

    const jobPromise = processJob("job-video-webm");
    await flush();
    await jobPromise;

    // Remux only: -c copy, no libvpx-vp9 re-encode.
    expect(remuxArgs).toEqual(
      expect.arrayContaining(["-y", "-i", path.join(jobDir, "source.webm"), "-c", "copy", outputPath])
    );
    expect(remuxArgs).not.toContain("libvpx-vp9");
    expect(updateJobMock.mock.calls.some((c) => c[1]?.status === "completed")).toBe(true);
  });

  it("MKV: alternate VP9 source is remuxed (copy) into mkv", async () => {
    getJobMock.mockReturnValue({
      id: "job-video-mkv",
      input_kind: "remote-url",
      input_reference: "https://www.youtube.com/watch?v=88fD-UtG_yo",
      input_title: null,
      output_format: "mkv",
      quality: qualitySelection("mp4-compatible", 1080),
    });

    const { processJob } = await import("../../src/lib/media/processor");
    const { CONFIG } = await import("../../src/lib/config");
    jobDir = path.join(CONFIG.media.tempDir, "job-video-mkv");
    const outputPath = path.join(jobDir, "output.mkv");

    let remuxArgs: string[] = [];
    spawnBehaviors.push(
      ytdlpFailWith403,
      (proc) => { ytdlpSuccessWriting(jobDir, "source.mkv", proc); },
      (proc) => { ffprobeWith(ffprobeJson(VP9_OPUS), proc); },
      (proc, args) => { remuxArgs = args as string[]; ffmpegSuccessWriting(outputPath, proc); },
      (proc) => { ffprobeWith(ffprobeJson(VP9_OPUS, { format_name: "matroska" }), proc); },
      (proc) => { ffprobeWith(ffprobeJson(VP9_OPUS, { format_name: "matroska" }), proc); }
    );

    const jobPromise = processJob("job-video-mkv");
    await flush();
    await jobPromise;

    expect(remuxArgs).toEqual(expect.arrayContaining(["-c", "copy"]));
    expect(ytdlpCallArgs()[1]).toContain("--merge-output-format");
    expect(updateJobMock.mock.calls.some((c) => c[1]?.status === "completed")).toBe(true);
  });

  it("MP4 1080 with fallbackPolicy=reject: a 720p deliverable raises QUALITY_NOT_DELIVERED (no silent downscale)", async () => {
    const H264_720 = [
      { index: 0, codec_type: "video", codec_name: "h264", width: 1280, height: 720, r_frame_rate: "30/1" },
      { index: 1, codec_type: "audio", codec_name: "aac", sample_rate: "48000", channels: 2 },
    ];
    getJobMock.mockReturnValue({
      id: "job-video-quality",
      input_kind: "remote-url",
      input_reference: "https://www.youtube.com/watch?v=88fD-UtG_yo",
      input_title: null,
      output_format: "mp4",
      quality: qualitySelection("mp4-compatible", 1080),
    });

    const { processJob } = await import("../../src/lib/media/processor");
    const { CONFIG } = await import("../../src/lib/config");
    jobDir = path.join(CONFIG.media.tempDir, "job-video-quality");
    const outputPath = path.join(jobDir, "output.mp4");

    spawnBehaviors.push(
      ytdlpFailWith403,
      (proc) => { ytdlpSuccessWriting(jobDir, "source.mkv", proc); },
      (proc) => { ffprobeWith(ffprobeJson(VP9_720), proc); },   // source is only 720p
      (proc) => { ffmpegSuccessWriting(outputPath, proc); }, // transcode keeps 720p
      (proc) => { ffprobeWith(ffprobeJson(H264_720, { format_name: "mp4" }), proc); } // output probe: 720p < 972
    );

    const jobPromise = processJob("job-video-quality");
    await flush();
    await jobPromise;

    // fallbackPolicy=reject → the 720p deliverable is NOT silently accepted.
    const qualityFailure = updateJobMock.mock.calls.find((c) => c[1]?.error_code === "QUALITY_NOT_DELIVERED");
    expect(qualityFailure).toBeDefined();
    expect(qualityFailure![1].error_message).toContain("720p");
  });

  it("FFmpeg conversion failures stay differentiated (ffmpeg-conversion stage, no generic leak)", async () => {
    getJobMock.mockReturnValue({
      id: "job-video-ffmpeg-fail",
      input_kind: "remote-url",
      input_reference: "https://www.youtube.com/watch?v=88fD-UtG_yo",
      input_title: null,
      output_format: "mp4",
      quality: qualitySelection("mp4-compatible", 1080),
    });

    const { processJob } = await import("../../src/lib/media/processor");
    const { CONFIG } = await import("../../src/lib/config");
    jobDir = path.join(CONFIG.media.tempDir, "job-video-ffmpeg-fail");

    spawnBehaviors.push(
      ytdlpFailWith403,
      (proc) => { ytdlpSuccessWriting(jobDir, "source.mkv", proc); },
      (proc) => { ffprobeWith(ffprobeJson(VP9_OPUS), proc); },
      (proc) => {
        setTimeout(() => {
          proc.stderr.emit("data", "Error while decoding stream #0:0\nInvalid data found when processing input\n");
          proc.emit("close", 1);
        }, 5);
      } // ffmpeg transcode fails
    );

    const jobPromise = processJob("job-video-ffmpeg-fail");
    await flush();
    await jobPromise;

    // No alternate-candidate retry after an FFmpeg error (not recoverable).
    expect(ytdlpCallArgs()).toHaveLength(2);
    const failedCall = updateJobMock.mock.calls.find((c) => c[1]?.status === "failed");
    expect(failedCall).toBeDefined();
    expect(failedCall![1].error_message).toContain("FFmpeg");
  });
});