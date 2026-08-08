// Unit tests for unified analysis result types and helpers.

import { describe, it, expect } from "vitest";
import {
  isRemoteUrlAnalysis,
  isLocalMediaAnalysis,
  isUniversalFileAnalysis,
  deriveConfidence,
  normalizeCapabilityInfo,
} from "../../src/lib/domain/unified-analysis";
import type {
  AnalysisResult,
  RemoteUrlAnalysis,
  LocalMediaAnalysis,
  UniversalFileAnalysis,
  CapabilityInfo,
} from "../../src/lib/domain/unified-analysis";
import type { MediaDescriptor } from "../../src/lib/media/probe";

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeMediaDescriptor(): MediaDescriptor {
  return {
    container: null,
    durationSeconds: 120,
    sizeBytes: 5_000_000,
    bitrate: null,
    hasAudio: true,
    hasVideo: true,
    hasSubtitles: false,
    audioStreams: [{ index: 0, codec: "aac", sampleRate: 44100, channels: 2, channelLayout: "stereo", bitrate: null, language: null, isDefault: true }],
    videoStreams: [{ index: 1, codec: "h264", width: 1920, height: 1080, fps: 30, bitrate: null, pixelFormat: "yuv420p", isDefault: true }],
    subtitleStreams: [],
  };
}

function makeRemoteUrlAnalysis(): RemoteUrlAnalysis {
  return {
    kind: "remote-url",
    inputId: "remote-1",
    originalName: "Test Video",
    storedRelativePath: null,
    sizeBytes: null,
    descriptor: makeMediaDescriptor(),
    category: "video",
    detectedFormat: "mp4",
    confidence: "high",
    warnings: [],
    provider: "youtube",
    normalizedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "Test Video",
    channel: "Test Channel",
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  };
}

function makeLocalMediaAnalysis(): LocalMediaAnalysis {
  return {
    kind: "local-media",
    inputId: "local-1",
    originalName: "song.mp3",
    storedRelativePath: "uploads/abc/song.mp3",
    sizeBytes: 5_000_000,
    descriptor: makeMediaDescriptor(),
    category: "audio",
    detectedFormat: "mp3",
    confidence: "high",
    warnings: [],
  };
}

function makeUniversalFileAnalysis(): UniversalFileAnalysis {
  return {
    kind: "universal-file",
    inputId: "universal-1",
    originalName: "data.json",
    storedRelativePath: "uploads/def/data.json",
    sizeBytes: 1_000,
    descriptor: { kind: "structured-data", format: "json", rowCount: null, columnCount: null, encoding: "utf-8", isTabular: false, hasNestedStructures: false, hasXmlEntities: false },
    category: "structured-data",
    detectedFormat: "json",
    confidence: "high",
    warnings: [],
    detectedMimeType: "application/json",
    sha256: "abc123",
  };
}

// ── Tests: Discriminated union type narrowing ─────────────────────────────────

describe("Unified Analysis — discriminated union narrowing", () => {
  it("isRemoteUrlAnalysis narrows the type correctly", () => {
    const results: AnalysisResult[] = [
      makeRemoteUrlAnalysis(),
      makeLocalMediaAnalysis(),
      makeUniversalFileAnalysis(),
    ];

    const remoteResults = results.filter(isRemoteUrlAnalysis);
    expect(remoteResults).toHaveLength(1);
    expect(remoteResults[0]!.kind).toBe("remote-url");
    // After narrowing, provider is accessible
    expect(remoteResults[0]!.provider).toBe("youtube");
    expect(remoteResults[0]!.normalizedUrl).toBeTruthy();
  });

  it("isLocalMediaAnalysis narrows the type correctly", () => {
    const results: AnalysisResult[] = [
      makeRemoteUrlAnalysis(),
      makeLocalMediaAnalysis(),
      makeUniversalFileAnalysis(),
    ];

    const localResults = results.filter(isLocalMediaAnalysis);
    expect(localResults).toHaveLength(1);
    expect(localResults[0]!.kind).toBe("local-media");
    // After narrowing, storedRelativePath is a string
    expect(typeof localResults[0]!.storedRelativePath).toBe("string");
    expect(localResults[0]!.sizeBytes).toBeGreaterThan(0);
  });

  it("isUniversalFileAnalysis narrows the type correctly", () => {
    const results: AnalysisResult[] = [
      makeRemoteUrlAnalysis(),
      makeLocalMediaAnalysis(),
      makeUniversalFileAnalysis(),
    ];

    const universalResults = results.filter(isUniversalFileAnalysis);
    expect(universalResults).toHaveLength(1);
    expect(universalResults[0]!.kind).toBe("universal-file");
    // After narrowing, detectedMimeType and sha256 are accessible
    expect(universalResults[0]!.detectedMimeType).toBe("application/json");
    expect(universalResults[0]!.sha256).toBe("abc123");
  });

  it("each type guard excludes the other variants", () => {
    const remote = makeRemoteUrlAnalysis();
    const local = makeLocalMediaAnalysis();
    const universal = makeUniversalFileAnalysis();

    expect(isRemoteUrlAnalysis(remote)).toBe(true);
    expect(isRemoteUrlAnalysis(local)).toBe(false);
    expect(isRemoteUrlAnalysis(universal)).toBe(false);

    expect(isLocalMediaAnalysis(remote)).toBe(false);
    expect(isLocalMediaAnalysis(local)).toBe(true);
    expect(isLocalMediaAnalysis(universal)).toBe(false);

    expect(isUniversalFileAnalysis(remote)).toBe(false);
    expect(isUniversalFileAnalysis(local)).toBe(false);
    expect(isUniversalFileAnalysis(universal)).toBe(true);
  });

  it("switch on kind discriminates correctly", () => {
    const results: AnalysisResult[] = [
      makeRemoteUrlAnalysis(),
      makeLocalMediaAnalysis(),
      makeUniversalFileAnalysis(),
    ];

    const kinds = results.map((r) => {
      switch (r.kind) {
        case "remote-url": return `remote:${r.provider}`;
        case "local-media": return `local:${r.storedRelativePath}`;
        case "universal-file": return `universal:${r.detectedMimeType}`;
      }
    });

    expect(kinds).toEqual([
      "remote:youtube",
      "local:uploads/abc/song.mp3",
      "universal:application/json",
    ]);
  });
});

// ── Tests: deriveConfidence ───────────────────────────────────────────────────

describe("Unified Analysis — deriveConfidence", () => {
  it("returns 'high' when detected by magic and extension matches with no mismatch", () => {
    expect(deriveConfidence(true, true, false)).toBe("high");
  });

  it("returns 'medium' when detected by magic but extension mismatch", () => {
    expect(deriveConfidence(true, true, true)).toBe("medium");
  });

  it("returns 'medium' when detected by magic only", () => {
    expect(deriveConfidence(true, false, false)).toBe("medium");
  });

  it("returns 'medium' when extension matches but no magic detection", () => {
    expect(deriveConfidence(false, true, false)).toBe("medium");
  });

  it("returns 'low' when no magic and no extension match", () => {
    expect(deriveConfidence(false, false, false)).toBe("low");
  });

  it("returns 'low' when no magic and extension mismatch", () => {
    expect(deriveConfidence(false, false, true)).toBe("low");
  });
});

// ── Tests: normalizeCapabilityInfo ─────────────────────────────────────────────

describe("Unified Analysis — normalizeCapabilityInfo", () => {
  it("normalizes a capability with all fields specified", () => {
    const cap = normalizeCapabilityInfo({
      id: "cap-1",
      outputFormat: "mp3",
      outputLabel: "MP3 Audio",
      state: "available",
      lossProfile: "lossy",
      engineId: "ffmpeg-media",
      mobilePortability: "portable-domain",
      warnings: [],
    });

    expect(cap).toEqual({
      id: "cap-1",
      outputFormat: "mp3",
      outputLabel: "MP3 Audio",
      state: "available",
      lossProfile: "lossy",
      engineId: "ffmpeg-media",
      mobilePortability: "portable-domain",
      warnings: [],
    });
  });

  it("derives outputLabel from label when outputLabel is missing", () => {
    const cap = normalizeCapabilityInfo({
      id: "cap-2",
      outputFormat: "pdf",
      label: "PDF Document",
      engineId: "qpdf",
      mobilePortability: "portable-domain",
      warnings: ["Large file"],
    });

    expect(cap.outputLabel).toBe("PDF Document");
  });

  it("derives outputLabel from outputFormat uppercase when both label and outputLabel are missing", () => {
    const cap = normalizeCapabilityInfo({
      id: "cap-3",
      outputFormat: "xlsx",
      engineId: "libreoffice",
      mobilePortability: "replace-adapter-on-mobile",
      warnings: [],
    });

    expect(cap.outputLabel).toBe("XLSX");
  });

  it("defaults state to 'unavailable-tool' when unavailableReason is provided", () => {
    const cap = normalizeCapabilityInfo({
      id: "cap-4",
      outputFormat: "epub",
      engineId: "calibre",
      mobilePortability: "replace-adapter-on-mobile",
      warnings: [],
      unavailableReason: "Calibre not installed",
    });

    expect(cap.state).toBe("unavailable-tool");
  });

  it("defaults state to 'available' when no state or reason is provided", () => {
    const cap = normalizeCapabilityInfo({
      id: "cap-5",
      outputFormat: "json",
      engineId: "data-ts",
      mobilePortability: "portable-domain",
      warnings: [],
    });

    expect(cap.state).toBe("available");
  });

  it("defaults lossProfile to 'lossy' when not provided", () => {
    const cap = normalizeCapabilityInfo({
      id: "cap-6",
      outputFormat: "mp3",
      engineId: "ffmpeg-media",
      mobilePortability: "portable-domain",
      warnings: [],
    });

    expect(cap.lossProfile).toBe("lossy");
  });

  it("preserves explicit lossProfile values", () => {
    const profiles: Array<{ input: "lossless" | "metadata-risk" | "layout-risk" | "lossy" | "experimental"; expected: string }> = [
      { input: "lossless", expected: "lossless" },
      { input: "metadata-risk", expected: "metadata-risk" },
      { input: "layout-risk", expected: "layout-risk" },
      { input: "lossy", expected: "lossy" },
      { input: "experimental", expected: "experimental" },
    ];

    for (const { input, expected } of profiles) {
      const cap = normalizeCapabilityInfo({
        id: `cap-loss-${input}`,
        outputFormat: "test",
        lossProfile: input,
        engineId: "data-ts",
        mobilePortability: "portable-domain",
        warnings: [],
      });
      expect(cap.lossProfile).toBe(expected);
    }
  });

  it("defaults warnings to empty array when not provided", () => {
    const cap = normalizeCapabilityInfo({
      id: "cap-7",
      outputFormat: "csv",
      engineId: "data-ts",
      mobilePortability: "portable-domain",
      warnings: undefined as unknown as string[],
    });

    expect(cap.warnings).toEqual([]);
  });

  it("returns a valid CapabilityInfo type", () => {
    const cap: CapabilityInfo = normalizeCapabilityInfo({
      id: "cap-typecheck",
      outputFormat: "md",
      outputLabel: "Markdown",
      state: "available",
      lossProfile: "lossless",
      engineId: "pandoc",
      mobilePortability: "portable-domain",
      warnings: [],
    });

    // Type narrowing: if it compiles, it's the right type
    expect(cap.id).toBe("cap-typecheck");
    expect(cap.outputFormat).toBe("md");
  });
});
