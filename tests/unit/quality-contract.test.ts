// Unit tests for quality-contract.ts
// Covers: buildYtdlpFormatSelector, parseLegacyQualityString, VideoQualitySelectionSchema

import { describe, it, expect } from 'vitest';
import {
  buildYtdlpFormatSelector,
  parseLegacyQualityString,
  VideoQualitySelectionSchema,
} from '../../src/lib/quality/quality-contract';

// ---------------------------------------------------------------------------
// buildYtdlpFormatSelector
// ---------------------------------------------------------------------------

describe('buildYtdlpFormatSelector — source-max profile', () => {
  it('source-max + max → formatArg does NOT contain [ext=mp4], mergeFormat is mkv, willRecode is false', () => {
    const result = buildYtdlpFormatSelector({
      profile: 'source-max',
      resolutionLimit: 'max',
      fallbackPolicy: 'reject',
    });
    expect(result.formatArg).not.toContain('[ext=mp4]');
    expect(result.mergeFormat).toBe('mkv');
    expect(result.willRecode).toBe(false);
  });

  it('source-max + 2160 → formatArg contains exact height=2160 but NOT [ext=mp4], mergeFormat is mkv', () => {
    const result = buildYtdlpFormatSelector({
      profile: 'source-max',
      resolutionLimit: 2160,
      fallbackPolicy: 'reject',
    });
    expect(result.formatArg).toContain('height=2160');
    expect(result.formatArg).not.toContain('height<=');
    expect(result.formatArg).not.toContain('[ext=mp4]');
    expect(result.mergeFormat).toBe('mkv');
  });

  it('source-max + 1080 → formatArg does NOT contain [ext=mp4]', () => {
    const result = buildYtdlpFormatSelector({
      profile: 'source-max',
      resolutionLimit: 1080,
      fallbackPolicy: 'reject',
    });
    expect(result.formatArg).not.toContain('[ext=mp4]');
    expect(result.formatArg).toContain('height=1080');
    expect(result.formatArg).not.toContain('height<=');
    expect(result.mergeFormat).toBe('mkv');
  });
});

describe('buildYtdlpFormatSelector — no silent downgrade', () => {
  it('source-max + max uses video-containing source fallback, not lower progressive best fallback', () => {
    const result = buildYtdlpFormatSelector({
      profile: 'source-max',
      resolutionLimit: 'max',
      fallbackPolicy: 'reject',
    });
    expect(result.formatArg).toBe('bestvideo*+bestaudio/bestvideo*');
    expect(result.formatArg.split('/')).not.toContain('best');
  });

  it('mp4-compatible + 720 never asks for height<=720', () => {
    const result = buildYtdlpFormatSelector({
      profile: 'mp4-compatible',
      resolutionLimit: 720,
      fallbackPolicy: 'reject',
    });
    expect(result.formatArg).toContain('height=720');
    expect(result.formatArg).not.toContain('height<=');
  });
});

describe('buildYtdlpFormatSelector — mp4-compatible profile', () => {
  it('mp4-compatible + 1080 → formatArg contains [ext=mp4], mergeFormat is mp4', () => {
    const result = buildYtdlpFormatSelector({
      profile: 'mp4-compatible',
      resolutionLimit: 1080,
      fallbackPolicy: 'reject',
    });
    expect(result.formatArg).toContain('[ext=mp4]');
    expect(result.mergeFormat).toBe('mp4');
  });

  it('mp4-compatible + max → formatArg contains [ext=mp4], mergeFormat is mp4', () => {
    const result = buildYtdlpFormatSelector({
      profile: 'mp4-compatible',
      resolutionLimit: 'max',
      fallbackPolicy: 'reject',
    });
    expect(result.formatArg).toContain('[ext=mp4]');
    expect(result.mergeFormat).toBe('mp4');
  });

  // ── v1.0.1 Punto A: the mp4-compatible selector is STRICTLY MP4. No
  // internal "/bestvideo*+bestaudio" or bare "bestvideo*" fallback: yt-dlp
  // must never silently downgrade to VP9/Opus inside the first attempt and
  // merge it into an MP4 without transcode. Codec fallback belongs to the
  // DownloadStrategy candidates (driven by a recoverable 403), not here.
  it('mp4-compatible + max → NO internal fallback to bare bestvideo* (strict H.264/AAC-MP4 only)', () => {
    const result = buildYtdlpFormatSelector({
      profile: 'mp4-compatible',
      resolutionLimit: 'max',
      fallbackPolicy: 'reject',
    });
    expect(result.formatArg).toBe('bestvideo*[ext=mp4]+bestaudio[ext=m4a]');
    expect(result.formatArg).not.toMatch(/bestvideo\*\+bestaudio(?:\/|$)/);
    expect(result.formatArg).not.toMatch(/\/bestvideo\*$/);
  });

  it('mp4-compatible + 1080 → every slash-alternative stays strictly MP4 (ext=mp4; no bare bestvideo*)', () => {
    const result = buildYtdlpFormatSelector({
      profile: 'mp4-compatible',
      resolutionLimit: 1080,
      fallbackPolicy: 'reject',
    });
    // Separate streams (H.264/MP4 + AAC/M4A) with progressive muxed MP4 as
    // the secondary strict alternative — both are conventional MP4.
    expect(result.formatArg).toBe(
      'bestvideo*[height=1080][ext=mp4]+bestaudio[ext=m4a]/best[height=1080][ext=mp4]'
    );
    const alternatives = result.formatArg.split('/');
    for (const alt of alternatives) {
      expect(alt).toMatch(/\[ext=mp4\]/);
      expect(alt).not.toMatch(/bestvideo\*\+bestaudio/);
    }
    // The separated-streams alternative must carry AAC/M4A audio.
    expect(alternatives[0]).toMatch(/\[ext=m4a\]/);
  });
});

// ---------------------------------------------------------------------------
// parseLegacyQualityString
// ---------------------------------------------------------------------------

describe('parseLegacyQualityString', () => {
  it("'1080' → profile mp4-compatible, resolutionLimit 1080", () => {
    const result = parseLegacyQualityString('1080', 'mp4');
    expect(result.profile).toBe('mp4-compatible');
    expect(result.resolutionLimit).toBe(1080);
  });

  it("'720' → profile mp4-compatible, resolutionLimit 720", () => {
    const result = parseLegacyQualityString('720', 'mp4');
    expect(result.profile).toBe('mp4-compatible');
    expect(result.resolutionLimit).toBe(720);
  });

  it("'best' → profile source-max, resolutionLimit 'max'", () => {
    const result = parseLegacyQualityString('best', 'mp4');
    expect(result.profile).toBe('source-max');
    expect(result.resolutionLimit).toBe('max');
  });

  it("'' (empty string) → profile source-max, resolutionLimit 'max'", () => {
    const result = parseLegacyQualityString('', 'mp4');
    expect(result.profile).toBe('source-max');
    expect(result.resolutionLimit).toBe('max');
  });

  it("regression: parseInt('best', 10) is NaN AND parseLegacyQualityString('best') does NOT throw or return a numeric height", () => {
    // Verify the root cause the fix addressed: parseInt('best') returns NaN
    expect(parseInt('best', 10)).toBeNaN();

    // Confirm the fixed code handles it gracefully
    let caughtError: unknown = null;
    let result: ReturnType<typeof parseLegacyQualityString> | null = null;
    try {
      result = parseLegacyQualityString('best', 'mp4');
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).toBeNull();
    expect(result).not.toBeNull();
    // resolutionLimit must NOT be a number (it would have been NaN from parseInt before the fix)
    expect(typeof result!.resolutionLimit).not.toBe('number');
    expect(result!.resolutionLimit).toBe('max');
  });
});

// ---------------------------------------------------------------------------
// VideoQualitySelectionSchema — Zod validation
// ---------------------------------------------------------------------------

describe('VideoQualitySelectionSchema — invalid inputs rejected', () => {
  it("rejects { profile: 'invalid', resolutionLimit: 'max' }", () => {
    const parseResult = VideoQualitySelectionSchema.safeParse({
      profile: 'invalid',
      resolutionLimit: 'max',
    });
    expect(parseResult.success).toBe(false);
  });

  it("rejects { profile: 'source-max', resolutionLimit: 999 } (non-allowed height)", () => {
    const parseResult = VideoQualitySelectionSchema.safeParse({
      profile: 'source-max',
      resolutionLimit: 999,
    });
    expect(parseResult.success).toBe(false);
  });
});
