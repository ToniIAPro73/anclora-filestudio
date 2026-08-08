// Unit tests for the FFmpeg media conversion engine.
// Focuses on capability matrix, loss profiles, probe, and availability states.
// No execution tests (ffmpeg not installed in dev environment).

import { describe, it, expect } from "vitest";
import { FFmpegEngine } from "../../src/lib/engines/media/ffmpeg-engine";
import type { UniversalFileDescriptor, MediaAttributes } from "../../src/lib/domain/descriptors";
import type { EngineProbeResult } from "../../src/lib/domain/engines";
import crypto from "crypto";

function makeAudioDescriptor(
  fmt: string,
  overrides: Partial<MediaAttributes> = {},
): UniversalFileDescriptor {
  const attrs: MediaAttributes = {
    kind: "media",
    durationSeconds: 180,
    bitrate: 128000,
    hasAudio: true,
    hasVideo: false,
    hasSubtitles: false,
    audioCodec: "mp3",
    videoCodec: null,
    width: null,
    height: null,
    fps: null,
    ...overrides,
  };
  return {
    id: crypto.randomUUID(),
    category: "audio",
    originalName: `test.${fmt}`,
    extension: fmt,
    detectedMimeType: `audio/${fmt}`,
    detectedFormat: fmt,
    sizeBytes: 5_000_000,
    sha256: null,
    source: { kind: "local-upload", originalName: `test.${fmt}`, storedRelativePath: `test.${fmt}` },
    attributes: attrs,
    warnings: [],
    analyzedBy: ["ffprobe"],
    analyzedAt: new Date().toISOString(),
  };
}

function makeVideoDescriptor(
  fmt: string,
  overrides: Partial<MediaAttributes> = {},
): UniversalFileDescriptor {
  const attrs: MediaAttributes = {
    kind: "media",
    durationSeconds: 120,
    bitrate: 2_000_000,
    hasAudio: true,
    hasVideo: true,
    hasSubtitles: false,
    audioCodec: "aac",
    videoCodec: "h264",
    width: 1920,
    height: 1080,
    fps: 30,
    ...overrides,
  };
  return {
    id: crypto.randomUUID(),
    category: "video",
    originalName: `test.${fmt}`,
    extension: fmt,
    detectedMimeType: `video/${fmt}`,
    detectedFormat: fmt,
    sizeBytes: 50_000_000,
    sha256: null,
    source: { kind: "local-upload", originalName: `test.${fmt}`, storedRelativePath: `test.${fmt}` },
    attributes: attrs,
    warnings: [],
    analyzedBy: ["ffprobe"],
    analyzedAt: new Date().toISOString(),
  };
}

const AVAILABLE_PROBE: EngineProbeResult = {
  available: true,
  version: "6.0",
  binaryPath: "/usr/bin/ffmpeg",
  capabilities: ["transcode-audio", "transcode-video", "extract-audio", "normalize-audio", "remux", "trim", "create-gif", "extract-thumbnail", "extract-frames", "extract-subtitles"],
};

const UNAVAILABLE_PROBE: EngineProbeResult = {
  available: false,
  version: null,
  binaryPath: null,
  capabilities: [],
  error: "ffmpeg not found",
};

// ── Audio capabilities ───────────────────────────────────────────────────────

describe("FFmpegEngine — audio capabilities", () => {
  const engine = new FFmpegEngine();

  it("returns no capabilities for non-audio/video category", () => {
    const desc = { ...makeAudioDescriptor("mp3"), category: "image" as const };
    expect(engine.getCapabilities(desc, AVAILABLE_PROBE)).toHaveLength(0);
  });

  it("returns no capabilities for audio without hasAudio", () => {
    const desc = makeAudioDescriptor("mp3", { hasAudio: false });
    expect(engine.getCapabilities(desc, AVAILABLE_PROBE)).toHaveLength(0);
  });

  it("returns no capabilities for unknown audio format", () => {
    const desc = makeAudioDescriptor("aac");
    expect(engine.getCapabilities(desc, AVAILABLE_PROBE)).toHaveLength(0);
  });

  it("returns audio conversion capabilities for MP3 input", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("mp3"), AVAILABLE_PROBE);
    const audioConversions = caps.filter((c) => c.operation === "transcode-audio");
    expect(audioConversions.length).toBe(5); // mp3, m4a, wav, flac, ogg
  });

  it("includes normalize-audio capability for audio input", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("mp3"), AVAILABLE_PROBE);
    const normalize = caps.find((c) => c.operation === "normalize-audio");
    expect(normalize).toBeDefined();
    expect(normalize?.label).toMatch(/ormalizar/i);
  });

  it("includes trim capability for audio input", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("wav"), AVAILABLE_PROBE);
    const trim = caps.find((c) => c.operation === "trim");
    expect(trim).toBeDefined();
  });

  it("MP3 input offers M4A, WAV, FLAC, OGG output", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("mp3"), AVAILABLE_PROBE);
    const outFmts = caps.filter((c) => c.operation === "transcode-audio").map((c) => c.outputFormat);
    expect(outFmts).toContain("m4a");
    expect(outFmts).toContain("wav");
    expect(outFmts).toContain("flac");
    expect(outFmts).toContain("ogg");
  });

  it("FLAC input offers MP3, M4A, WAV, OGG output", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("flac"), AVAILABLE_PROBE);
    const outFmts = caps.filter((c) => c.operation === "transcode-audio").map((c) => c.outputFormat);
    expect(outFmts).toContain("mp3");
    expect(outFmts).toContain("m4a");
    expect(outFmts).toContain("wav");
    expect(outFmts).toContain("ogg");
  });
});

// ── Video capabilities ───────────────────────────────────────────────────────

describe("FFmpegEngine — video capabilities", () => {
  const engine = new FFmpegEngine();

  it("returns video conversion capabilities for MP4 input", () => {
    const caps = engine.getCapabilities(makeVideoDescriptor("mp4"), AVAILABLE_PROBE);
    const videoConversions = caps.filter((c) => c.operation === "transcode-video" || c.operation === "remux");
    expect(videoConversions.length).toBe(3); // mp4, webm, mkv
  });

  it("includes extract-audio capability for video with audio", () => {
    const caps = engine.getCapabilities(makeVideoDescriptor("mp4"), AVAILABLE_PROBE);
    const extractAudio = caps.find((c) => c.operation === "extract-audio");
    expect(extractAudio).toBeDefined();
  });

  it("does not include extract-audio for video without audio", () => {
    const desc = makeVideoDescriptor("mp4", { hasAudio: false });
    const caps = engine.getCapabilities(desc, AVAILABLE_PROBE);
    const extractAudio = caps.find((c) => c.operation === "extract-audio");
    expect(extractAudio).toBeUndefined();
  });

  it("includes GIF creation capability", () => {
    const caps = engine.getCapabilities(makeVideoDescriptor("mp4"), AVAILABLE_PROBE);
    const gif = caps.find((c) => c.operation === "create-gif");
    expect(gif).toBeDefined();
    expect(gif?.outputFormat).toBe("gif");
  });

  it("includes thumbnail extraction capability", () => {
    const caps = engine.getCapabilities(makeVideoDescriptor("mp4"), AVAILABLE_PROBE);
    const thumb = caps.find((c) => c.operation === "extract-thumbnail");
    expect(thumb).toBeDefined();
  });

  it("includes frame extraction capability", () => {
    const caps = engine.getCapabilities(makeVideoDescriptor("mp4"), AVAILABLE_PROBE);
    const frames = caps.find((c) => c.operation === "extract-frames");
    expect(frames).toBeDefined();
  });

  it("includes subtitle extraction when hasSubtitles is true", () => {
    const desc = makeVideoDescriptor("mkv", { hasSubtitles: true });
    const caps = engine.getCapabilities(desc, AVAILABLE_PROBE);
    const subs = caps.find((c) => c.operation === "extract-subtitles");
    expect(subs).toBeDefined();
    expect(subs?.outputFormat).toBe("srt");
  });

  it("does not include subtitle extraction when hasSubtitles is false", () => {
    const caps = engine.getCapabilities(makeVideoDescriptor("mp4"), AVAILABLE_PROBE);
    const subs = caps.find((c) => c.operation === "extract-subtitles");
    expect(subs).toBeUndefined();
  });

  it("includes trim capability for video", () => {
    const caps = engine.getCapabilities(makeVideoDescriptor("mp4"), AVAILABLE_PROBE);
    const trim = caps.find((c) => c.operation === "trim");
    expect(trim).toBeDefined();
  });

  it("GIF warning for long videos (> 60s)", () => {
    const desc = makeVideoDescriptor("mp4", { durationSeconds: 150 });
    const caps = engine.getCapabilities(desc, AVAILABLE_PROBE);
    const gif = caps.find((c) => c.operation === "create-gif");
    expect(gif?.warnings.length).toBeGreaterThan(0);
    expect(gif?.warnings[0]).toMatch(/GIF/i);
  });

  it("GIF is experimental for very long videos (> 300s)", () => {
    const desc = makeVideoDescriptor("mp4", { durationSeconds: 400 });
    const caps = engine.getCapabilities(desc, AVAILABLE_PROBE);
    const gif = caps.find((c) => c.operation === "create-gif");
    expect(gif?.state).toBe("experimental");
  });
});

// ── Loss profiles ────────────────────────────────────────────────────────────

describe("FFmpegEngine — loss profiles", () => {
  const engine = new FFmpegEngine();

  it("audio → MP3 is lossy", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("wav"), AVAILABLE_PROBE);
    const mp3 = caps.find((c) => c.operation === "transcode-audio" && c.outputFormat === "mp3");
    expect(mp3?.lossProfile).toBe("lossy");
  });

  it("audio → M4A is lossy", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("wav"), AVAILABLE_PROBE);
    const m4a = caps.find((c) => c.operation === "transcode-audio" && c.outputFormat === "m4a");
    expect(m4a?.lossProfile).toBe("lossy");
  });

  it("audio → OGG is lossy", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("flac"), AVAILABLE_PROBE);
    const ogg = caps.find((c) => c.operation === "transcode-audio" && c.outputFormat === "ogg");
    expect(ogg?.lossProfile).toBe("lossy");
  });

  it("audio → WAV is lossless", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("mp3"), AVAILABLE_PROBE);
    const wav = caps.find((c) => c.operation === "transcode-audio" && c.outputFormat === "wav");
    expect(wav?.lossProfile).toBe("lossless");
  });

  it("audio → FLAC is lossless", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("mp3"), AVAILABLE_PROBE);
    const flac = caps.find((c) => c.operation === "transcode-audio" && c.outputFormat === "flac");
    expect(flac?.lossProfile).toBe("lossless");
  });

  it("normalize-audio is metadata-risk", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("mp3"), AVAILABLE_PROBE);
    const normalize = caps.find((c) => c.operation === "normalize-audio");
    expect(normalize?.lossProfile).toBe("metadata-risk");
  });

  it("video → MP4 (transcode) is lossy", () => {
    const caps = engine.getCapabilities(makeVideoDescriptor("webm"), AVAILABLE_PROBE);
    const mp4 = caps.find((c) => c.operation === "transcode-video" && c.outputFormat === "mp4");
    expect(mp4?.lossProfile).toBe("lossy");
  });

  it("video → MKV (remux) is lossless", () => {
    const caps = engine.getCapabilities(makeVideoDescriptor("mp4"), AVAILABLE_PROBE);
    const mkv = caps.find((c) => c.outputFormat === "mkv");
    expect(mkv?.lossProfile).toBe("lossless");
  });

  it("extract-audio is lossless", () => {
    const caps = engine.getCapabilities(makeVideoDescriptor("mp4"), AVAILABLE_PROBE);
    const extract = caps.find((c) => c.operation === "extract-audio");
    expect(extract?.lossProfile).toBe("lossless");
  });

  it("GIF creation is lossy", () => {
    const caps = engine.getCapabilities(makeVideoDescriptor("mp4"), AVAILABLE_PROBE);
    const gif = caps.find((c) => c.operation === "create-gif");
    expect(gif?.lossProfile).toBe("lossy");
  });

  it("trim is lossless", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("mp3"), AVAILABLE_PROBE);
    const trim = caps.find((c) => c.operation === "trim");
    expect(trim?.lossProfile).toBe("lossless");
  });

  it("extract-subtitles is lossless", () => {
    const desc = makeVideoDescriptor("mkv", { hasSubtitles: true });
    const caps = engine.getCapabilities(desc, AVAILABLE_PROBE);
    const subs = caps.find((c) => c.operation === "extract-subtitles");
    expect(subs?.lossProfile).toBe("lossless");
  });
});

// ── Availability states ──────────────────────────────────────────────────────

describe("FFmpegEngine — availability states", () => {
  const engine = new FFmpegEngine();

  it("marks all capabilities as available when probe succeeds", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("mp3"), AVAILABLE_PROBE);
    expect(caps.every((c) => c.state === "available")).toBe(true);
  });

  it("marks all capabilities as unavailable-tool when probe fails", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("mp3"), UNAVAILABLE_PROBE);
    expect(caps.every((c) => c.state === "unavailable-tool")).toBe(true);
  });

  it("unavailable-tool capabilities include explanatory reason", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("mp3"), UNAVAILABLE_PROBE);
    expect(caps[0]?.unavailableReason).toMatch(/[Ff][Ff]mpeg/);
  });

  it("video capabilities are unavailable when probe fails", () => {
    const caps = engine.getCapabilities(makeVideoDescriptor("mp4"), UNAVAILABLE_PROBE);
    expect(caps.every((c) => c.state === "unavailable-tool")).toBe(true);
    expect(caps.length).toBeGreaterThan(0);
  });
});

// ── Engine ID and categories ─────────────────────────────────────────────────

describe("FFmpegEngine — identity", () => {
  const engine = new FFmpegEngine();

  it("has correct engine id", () => {
    expect(engine.id).toBe("ffmpeg-media");
  });

  it("supports audio and video categories", () => {
    expect(engine.supportedCategories).toContain("audio");
    expect(engine.supportedCategories).toContain("video");
  });

  it("all capabilities carry ffmpeg-media engineId", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("mp3"), AVAILABLE_PROBE);
    expect(caps.every((c) => c.engineId === "ffmpeg-media")).toBe(true);
  });
});

// ── Recommendations ──────────────────────────────────────────────────────────

describe("FFmpegEngine — recommendations", () => {
  const engine = new FFmpegEngine();

  it("MP3 is recommended for audio conversion", () => {
    const caps = engine.getCapabilities(makeAudioDescriptor("wav"), AVAILABLE_PROBE);
    const audioCaps = caps.filter((c) => c.operation === "transcode-audio");
    const recommended = audioCaps.find((c) => c.recommended);
    expect(recommended?.outputFormat).toBe("mp3");
  });

  it("MP4 is recommended for video conversion", () => {
    const caps = engine.getCapabilities(makeVideoDescriptor("webm"), AVAILABLE_PROBE);
    const videoCaps = caps.filter((c) => c.operation === "transcode-video" || c.operation === "remux");
    const recommended = videoCaps.find((c) => c.recommended);
    expect(recommended?.outputFormat).toBe("mp4");
  });
});

// ── Probe ────────────────────────────────────────────────────────────────────

describe("FFmpegEngine — probe", () => {
  it("has probe method that returns EngineProbeResult", async () => {
    const engine = new FFmpegEngine();
    const result = await engine.probe();
    expect(result).toHaveProperty("available");
    expect(result).toHaveProperty("version");
    expect(result).toHaveProperty("capabilities");
    expect(typeof result.available).toBe("boolean");
  });
});
