import { afterAll, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { buildFfmpegVideoArgs } from "../../src/lib/media/command-builder";
import { CONFIG } from "../../src/lib/config";

const hasFfmpeg =
  spawnSync(CONFIG.media.binaries.ffmpeg, ["-version"], { stdio: "ignore" }).status === 0 &&
  spawnSync(CONFIG.media.binaries.ffprobe, ["-version"], { stdio: "ignore" }).status === 0;

const testDir = path.join(
  CONFIG.media.tempDir,
  "tests",
  `gate2b-media-${crypto.randomUUID()}`,
);

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

(hasFfmpeg ? describe : describe.skip)("Gate 2B media regression — MP4 to WebM", () => {
  it("preserves video and audio streams and produces a valid WebM", () => {
    fs.mkdirSync(testDir, { recursive: true });
    const input = path.join(testDir, "source.mp4");
    const output = path.join(testDir, "output.webm");

    execFileSync(CONFIG.media.binaries.ffmpeg, [
      "-y",
      "-f", "lavfi",
      "-i", "testsrc=size=160x120:rate=15:duration=1",
      "-f", "lavfi",
      "-i", "sine=frequency=880:duration=1",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-shortest",
      input,
    ], { stdio: "ignore" });

    const args = buildFfmpegVideoArgs({
      inputPath: input,
      outputPath: output,
      format: "webm",
      quality: "5",
    });
    execFileSync(CONFIG.media.binaries.ffmpeg, args, { stdio: "ignore" });

    const probe = JSON.parse(execFileSync(CONFIG.media.binaries.ffprobe, [
      "-v", "error",
      "-show_format",
      "-show_streams",
      "-print_format", "json",
      output,
    ], { encoding: "utf8" })) as {
      streams: Array<{ codec_type: string; codec_name: string; width?: number; height?: number }>;
      format: { format_name?: string; duration?: string };
    };

    const video = probe.streams.find((stream) => stream.codec_type === "video");
    const audio = probe.streams.find((stream) => stream.codec_type === "audio");
    const stat = fs.statSync(output);

    expect(probe.format.format_name).toContain("webm");
    expect(video?.codec_name).toBe("vp9");
    expect(audio?.codec_name).toBe("opus");
    expect(video?.width).toBeGreaterThan(0);
    expect(video?.height).toBeGreaterThan(0);
    expect(Number(probe.format.duration)).toBeGreaterThan(0);
    expect(stat.size).toBeGreaterThan(0);
  });
});
