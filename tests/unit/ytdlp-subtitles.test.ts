// yt-dlp caption detection/download (Fase 36). yt-dlp is mocked — no real
// network/YouTube dependency in CI. Covers: manual subtitles present,
// automatic-only, no subtitles at all, and audio-only fallback download.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const runMock = vi.fn();

vi.mock("../../src/lib/infrastructure/processes/process-runner", () => {
  class ProcessRunner {
    async run(opts: { args: string[] }) {
      return runMock(opts.args);
    }
  }
  return { ProcessRunner };
});

let tempRoot: string;

beforeEach(() => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ytdlp-subtitles-test-"));
  runMock.mockReset();
});

afterEach(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  vi.resetModules();
});

describe("probeUrlCaptions", () => {
  it("parses manual and automatic caption tracks from yt-dlp -J output", async () => {
    runMock.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({
        title: "Charla de ejemplo",
        duration: 125,
        subtitles: { es: [{ ext: "vtt" }, { ext: "srt" }] },
        automatic_captions: { en: [{ ext: "vtt" }] },
      }),
      stderr: "",
    });
    const { probeUrlCaptions } = await import("../../src/lib/media/ytdlp-subtitles");
    const info = await probeUrlCaptions("https://www.youtube.com/watch?v=abc12345678");
    expect(info.title).toBe("Charla de ejemplo");
    expect(info.durationSeconds).toBe(125);
    expect(info.manual).toEqual([{ lang: "es", formats: ["vtt", "srt"] }]);
    expect(info.automatic).toEqual([{ lang: "en", formats: ["vtt"] }]);
  });

  it("reports no captions at all when both dictionaries are absent", async () => {
    runMock.mockResolvedValue({ exitCode: 0, stdout: JSON.stringify({ title: "Sin subtítulos" }), stderr: "" });
    const { probeUrlCaptions } = await import("../../src/lib/media/ytdlp-subtitles");
    const info = await probeUrlCaptions("https://example.com/video");
    expect(info.manual).toEqual([]);
    expect(info.automatic).toEqual([]);
  });

  it("throws with the yt-dlp stderr when the URL is unsupported", async () => {
    runMock.mockResolvedValue({ exitCode: 1, stdout: "", stderr: "ERROR: Unsupported URL" });
    const { probeUrlCaptions } = await import("../../src/lib/media/ytdlp-subtitles");
    await expect(probeUrlCaptions("https://not-a-real-video-site.example/x")).rejects.toThrow(/Unsupported URL/);
  });
});

describe("downloadUrlSubtitle", () => {
  it("returns the normalized SRT path once yt-dlp writes it", async () => {
    runMock.mockImplementation((args: string[]) => {
      const outIndex = args.indexOf("-o");
      const template = args[outIndex + 1] as string;
      const srtPath = template.replace("%(ext)s", "es.srt");
      fs.writeFileSync(srtPath, "1\n00:00:00,000 --> 00:00:01,000\nHola\n");
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const { downloadUrlSubtitle } = await import("../../src/lib/media/ytdlp-subtitles");
    const result = await downloadUrlSubtitle("https://example.com/video", "es", "manual", tempRoot);
    expect(result.kind).toBe("manual");
    expect(fs.existsSync(result.srtPath)).toBe(true);
  });

  it("throws NO_SUBTITLES-style error when yt-dlp produces no file", async () => {
    runMock.mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });
    const { downloadUrlSubtitle } = await import("../../src/lib/media/ytdlp-subtitles");
    await expect(downloadUrlSubtitle("https://example.com/video", "xx", "automatic", tempRoot)).rejects.toThrow();
  });
});

describe("downloadUrlAudioOnly", () => {
  it("resolves once yt-dlp writes the WAV file (audio-only, no video download)", async () => {
    runMock.mockImplementation((args: string[]) => {
      const outIndex = args.indexOf("-o");
      const outPath = args[outIndex + 1] as string;
      fs.writeFileSync(outPath, "fake-wav-bytes");
      // Assert no video-format selector is present — audio-only per spec.
      expect(args).toContain("--extract-audio");
      expect(args).not.toContain("--format");
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const { downloadUrlAudioOnly } = await import("../../src/lib/media/ytdlp-subtitles");
    const outputPath = path.join(tempRoot, "audio.wav");
    await downloadUrlAudioOnly("https://example.com/video", outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);
  });
});
