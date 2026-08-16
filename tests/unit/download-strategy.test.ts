// Unit tests for download-strategy.ts (Fase 9 / Fase 12 items 3,4,6,7,9,10,11)
// Verifies the ordered candidate lists decouple SOURCE format from OUTPUT
// format, without hardcoded format IDs (248/251 stay out of production
// selectors) and without open-ended retry loops.

import { describe, it, expect } from "vitest";
import {
  buildDownloadCandidates,
  buildAudioDownloadCandidates,
  type DownloadCandidate,
} from "../../src/lib/media/download-strategy";
import type { VideoQualitySelection } from "../../src/lib/quality/quality-contract";

const MP4_1080: VideoQualitySelection = {
  profile: "mp4-compatible",
  resolutionLimit: 1080,
  fallbackPolicy: "reject",
};

const MP4_MAX: VideoQualitySelection = {
  profile: "mp4-compatible",
  resolutionLimit: "max",
  fallbackPolicy: "reject",
};

describe("buildAudioDownloadCandidates — SOURCE != OUTPUT", () => {
  it("mp3 → preferred bestaudio source + Opus/WebM alternate; both require transcode via FFmpeg", () => {
    const candidates = buildAudioDownloadCandidates("mp3");
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      id: "audio-preferred",
      sourceKind: "preferred",
      formatSelector: "bestaudio/best",
      singleShot: false,
    });
    expect(candidates[1]).toMatchObject({
      id: "audio-opus-alternate",
      sourceKind: "alternate-codec",
      singleShot: false,
    });
    // The fallback forces the functional Opus/WebM family without naming 251.
    expect(candidates[1].formatSelector).toContain("bestaudio[ext=webm]");
    expect(candidates[1].formatSelector).toContain("acodec=opus");
    expect(candidates[1].formatSelector).not.toMatch(/[\[(]251/);
  });

  it("m4a → prefers an m4a source (remux candidate) before the WebM alternate", () => {
    const candidates = buildAudioDownloadCandidates("m4a");
    expect(candidates[0].formatSelector).toBe("bestaudio[ext=m4a]/bestaudio");
    expect(candidates[1].formatSelector).toContain("bestaudio[ext=webm]");
  });

  it("every audio output format (mp3/m4a/wav/flac/ogg) is covered", () => {
    for (const fmt of ["mp3", "m4a", "wav", "flac", "ogg"] as const) {
      const candidates = buildAudioDownloadCandidates(fmt);
      expect(candidates.length).toBeGreaterThanOrEqual(2);
      expect(candidates.every((c) => c.singleShot === false)).toBe(true); // always two-stage
    }
  });
});

describe("buildDownloadCandidates — video", () => {
  it("mp4 1080 → ordered candidates: preferred H.264/MP4, alternate no-ext, explicit VP9", () => {
    const candidates = buildDownloadCandidates("mp4", MP4_1080);
    expect(candidates).toHaveLength(3);

    const [preferred, alternate, vp9] = candidates;
    expect(preferred.sourceKind).toBe("preferred");
    expect(preferred.singleShot).toBe(true);
    expect(preferred.mergeFormat).toBe("mp4");
    expect(preferred.formatSelector).toContain("[ext=mp4]"); // H.264/MP4 compatible

    expect(alternate.sourceKind).toBe("alternate-codec");
    expect(alternate.singleShot).toBe(false);
    expect(alternate.mergeFormat).toBe("mkv"); // universal intermediate
    expect(alternate.formatSelector).toContain("bestvideo*[height=1080]+bestaudio");
    expect(alternate.formatSelector).not.toContain("[ext=mp4]"); // any codec allowed

    expect(vp9.sourceKind).toBe("vp9-explicit");
    expect(vp9.formatSelector).toContain("vcodec^=vp9");
    expect(vp9.formatSelector).toContain("bestaudio[ext=webm]");
  });

  // v1.0.1 Punto A: the preferred single-shot candidate must NEVER silently
  // become another candidate. Its selector is strictly H.264/AAC-MP4 — no
  // internal yt-dlp fallback to bare bestvideo* (that would produce a
  // VP9/Opus MP4 without transcode, invisible to the pipeline, and would
  // skip the alternate-codec fallback policy entirely).
  it("mp4 preferred candidate is STRICTLY MP4-compatible — no internal codec downgrade", () => {
    const [preferred] = buildDownloadCandidates("mp4", MP4_1080);
    expect(preferred.id).toBe("mp4-h264-preferred");
    expect(preferred.singleShot).toBe(true); // straight into the output .mp4
    expect(preferred.formatSelector).toBe(
      "bestvideo*[height=1080][ext=mp4]+bestaudio[ext=m4a]/best[height=1080][ext=mp4]"
    );
    // The bare no-ext fallbacks are forbidden inside the preferred selector.
    expect(preferred.formatSelector).not.toMatch(/bestvideo\*\+bestaudio/);
    expect(preferred.formatSelector).not.toMatch(/\/bestvideo\*/);

    const [preferredMax] = buildDownloadCandidates("mp4", MP4_MAX);
    expect(preferredMax.formatSelector).toBe("bestvideo*[ext=mp4]+bestaudio[ext=m4a]");
    expect(preferredMax.formatSelector).not.toMatch(/bestvideo\*\+bestaudio/);
  });

  it("no hardcoded YouTube format IDs (248/251) in any production selector", () => {
    const seen = new Set<string>();
    const selections: VideoQualitySelection[] = [
      MP4_1080,
      MP4_MAX,
      { profile: "source-max", resolutionLimit: "max", fallbackPolicy: "reject" },
    ];
    for (const selection of selections) {
      for (const fmt of ["mp4", "webm", "mkv"] as const) {
        for (const c of buildDownloadCandidates(fmt, selection)) {
          seen.add(c.id);
          expect(c.formatSelector).not.toMatch(/(^|[^\d])(248|251)([^\d]|$)/);
        }
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it("mp4 max → alternate uses bestvideo*+bestaudio without height constraint", () => {
    const candidates = buildDownloadCandidates("mp4", MP4_MAX);
    expect(candidates[1].formatSelector).toContain("bestvideo*+bestaudio");
    expect(candidates[1].formatSelector).not.toContain("height=");
  });

  it("webm → preferred restricts to ext=webm; alternate allows any codec and finalizes (probe decides remux vs transcode)", () => {
    const candidates = buildDownloadCandidates("webm", MP4_1080);
    expect(candidates).toHaveLength(2);
    expect(candidates[0].formatSelector).toContain("[ext=webm]");
    expect(candidates[0].singleShot).toBe(true);
    expect(candidates[1].sourceKind).toBe("alternate-codec");
    expect(candidates[1].mergeFormat).toBe("webm");
  });

  it("mkv → both candidates merge to mkv (remux-compatible)", () => {
    const candidates = buildDownloadCandidates("mkv", MP4_1080);
    expect(candidates).toHaveLength(2);
    expect(candidates.every((c) => c.mergeFormat === "mkv")).toBe(true);
  });

  it("source-max → a single candidate (any codec already accepted, no alternate exists)", () => {
    const candidates = buildDownloadCandidates("mp4", {
      profile: "source-max",
      resolutionLimit: "max",
      fallbackPolicy: "reject",
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ id: "source-max", singleShot: true, sourceKind: "preferred" });
  });

  it("candidate chain is bounded (max 3 video, 2 audio) — no open loops", () => {
    expect(buildDownloadCandidates("mp4", MP4_1080).length).toBeLessThanOrEqual(3);
    expect(buildDownloadCandidates("webm", MP4_1080).length).toBeLessThanOrEqual(2);
    expect(buildAudioDownloadCandidates("mp3").length).toBeLessThanOrEqual(2);
  });

  it("candidate ids are unique within a list (deterministic strategy)", () => {
    for (const fmt of ["mp4", "webm", "mkv"] as const) {
      const ids = buildDownloadCandidates(fmt, MP4_1080).map((c: DownloadCandidate) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});