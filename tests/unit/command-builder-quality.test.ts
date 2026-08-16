// Unit tests for buildYtdlpArgs in command-builder.ts
// Covers: VideoQualitySelection typed input, legacy string adapter, audio formats

import { describe, it, expect, vi } from 'vitest';
import { buildFfmpegVideoArgs, buildYtdlpArgs } from '../../src/lib/media/command-builder';

const DUMMY_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const DUMMY_OUTPUT = '/tmp/output.mp4';

// ---------------------------------------------------------------------------
// source-max profile
// ---------------------------------------------------------------------------

describe('buildYtdlpArgs — source-max profile', () => {
  it('source-max + max → does NOT contain --no-check-certificates in non-Windows mode', () => {
    // Explicit override: deleting the env var is not enough on a Windows host.
    process.env.ANCLORA_FILESTUDIO_PLATFORM = 'linux';
    const args = buildYtdlpArgs({
      url: DUMMY_URL,
      format: 'mp4',
      quality: { profile: 'source-max', resolutionLimit: 'max', fallbackPolicy: 'reject' },
      outputPath: DUMMY_OUTPUT,
    });
    expect(args).not.toContain('--no-check-certificates');
    delete process.env.ANCLORA_FILESTUDIO_PLATFORM;
  });

  it('source-max + max → contains --no-check-certificates in Windows portable mode', () => {
    process.env.ANCLORA_FILESTUDIO_PLATFORM = 'windows';
    const args = buildYtdlpArgs({
      url: DUMMY_URL,
      format: 'mp4',
      quality: { profile: 'source-max', resolutionLimit: 'max', fallbackPolicy: 'reject' },
      outputPath: DUMMY_OUTPUT,
    });
    expect(args).toContain('--no-check-certificates');
    delete process.env.ANCLORA_FILESTUDIO_PLATFORM;
  });

  it('source-max → result does NOT contain [ext=mp4] in any argument', () => {
    const args = buildYtdlpArgs({
      url: DUMMY_URL,
      format: 'mp4',
      quality: { profile: 'source-max', resolutionLimit: 'max', fallbackPolicy: 'reject' },
      outputPath: DUMMY_OUTPUT,
    });
    const hasExtMp4 = args.some((a) => a.includes('[ext=mp4]'));
    expect(hasExtMp4).toBe(false);
  });

  it('source-max + 2160 → result contains exact height=2160 and does NOT contain [ext=mp4] before bestaudio', () => {
    const args = buildYtdlpArgs({
      url: DUMMY_URL,
      format: 'mp4',
      quality: { profile: 'source-max', resolutionLimit: 2160, fallbackPolicy: 'reject' },
      outputPath: DUMMY_OUTPUT,
    });
    const formatArg = args.find((a) => a.includes('height=2160'));
    expect(formatArg).toBeDefined();
    // Should not constrain to mp4 extension on source-max
    expect(formatArg).not.toContain('[ext=mp4]');
  });
});

// ---------------------------------------------------------------------------
// mp4-compatible profile
// ---------------------------------------------------------------------------

describe('buildYtdlpArgs — mp4-compatible profile', () => {
  it('mp4-compatible + 1080 → result contains bestvideo*[height=1080][ext=mp4]', () => {
    const args = buildYtdlpArgs({
      url: DUMMY_URL,
      format: 'mp4',
      quality: { profile: 'mp4-compatible', resolutionLimit: 1080, fallbackPolicy: 'reject' },
      outputPath: DUMMY_OUTPUT,
    });
    const formatArg = args.find((a) => a.includes('bestvideo*[height=1080][ext=mp4]'));
    expect(formatArg).toBeDefined();
    expect(formatArg).not.toContain('height<=');
  });
});

// ---------------------------------------------------------------------------
// Audio format
// ---------------------------------------------------------------------------

describe('buildYtdlpArgs — audio format (mp3)', () => {
  it('format mp3 + quality 320 → result contains --extract-audio and does NOT contain --no-check-certificates', () => {
    // Explicit override: deleting the env var is not enough on a Windows host.
    process.env.ANCLORA_FILESTUDIO_PLATFORM = 'linux';
    const args = buildYtdlpArgs({
      url: DUMMY_URL,
      format: 'mp3',
      quality: '320',
      outputPath: '/tmp/output.mp3',
    });
    expect(args).toContain('--extract-audio');
    expect(args).not.toContain('--no-check-certificates');
    delete process.env.ANCLORA_FILESTUDIO_PLATFORM;
  });

  it("format mp3 + quality best → uses highest encoder quality, not low VBR 7", () => {
    const args = buildYtdlpArgs({
      url: DUMMY_URL,
      format: "mp3",
      quality: "best",
      outputPath: "/tmp/output.mp3",
    });
    const qualityIndex = args.indexOf("--audio-quality");
    expect(qualityIndex).toBeGreaterThanOrEqual(0);
    expect(args[qualityIndex + 1]).toBe("0");
    expect(args).not.toEqual(expect.arrayContaining(["--audio-quality", "7"]));
  });
});

// ---------------------------------------------------------------------------
// Legacy string adapter
// ---------------------------------------------------------------------------

describe('buildYtdlpArgs — legacy string quality adapter', () => {
  it("legacy string '1080' with format mp4 → does NOT throw, uses adapter", () => {
    expect(() =>
      buildYtdlpArgs({
        url: DUMMY_URL,
        format: 'mp4',
        quality: '1080',
        outputPath: DUMMY_OUTPUT,
      })
    ).not.toThrow();
  });

  it("legacy string 'best' with format mp4 → does NOT throw and does NOT produce [ext=mp4] args", () => {
    let args: string[] = [];
    expect(() => {
      args = buildYtdlpArgs({
        url: DUMMY_URL,
        format: 'mp4',
        quality: 'best',
        outputPath: DUMMY_OUTPUT,
      });
    }).not.toThrow();
    // 'best' maps to source-max so no [ext=mp4]
    expect(args.some((a) => a.includes('[ext=mp4]'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Node/EJS capability vs cookies authentication — decoupled (Fase 2)
// ---------------------------------------------------------------------------

describe('buildYtdlpArgs — Node/EJS capability is NOT gated behind cookies', () => {
  it('anonymous args include --js-runtimes node:<runtime> and never --cookies/--remote-components', () => {
    process.env.ANCLORA_FILESTUDIO_PLATFORM = 'linux';
    const args = buildYtdlpArgs({
      url: DUMMY_URL,
      format: 'mp4',
      quality: { profile: 'source-max', resolutionLimit: 'max', fallbackPolicy: 'reject' },
      outputPath: DUMMY_OUTPUT,
    });
    expect(args).toContain('--js-runtimes');
    expect(args.some((a) => a.startsWith('node:'))).toBe(true);
    expect(args).not.toContain('--cookies');
    expect(args).not.toContain('--remote-components');
    delete process.env.ANCLORA_FILESTUDIO_PLATFORM;
  });

  it('useCookies=true with a configured cookies file adds --cookies ON TOP of --js-runtimes but NEVER --remote-components (official executables embed EJS)', async () => {
    process.env.ANCLORA_FILESTUDIO_YTDLP_COOKIES_PATH = '/tmp/fs-test-cookies.txt';
    process.env.ANCLORA_FILESTUDIO_PLATFORM = 'linux';
    vi.resetModules();
    const fresh = await import('../../src/lib/media/command-builder');
    const args = fresh.buildYtdlpArgs({
      url: DUMMY_URL,
      format: 'mp4',
      quality: { profile: 'source-max', resolutionLimit: 'max', fallbackPolicy: 'reject' },
      outputPath: DUMMY_OUTPUT,
      useCookies: true,
    });
    expect(args).toContain('--cookies');
    expect(args).toContain('/tmp/fs-test-cookies.txt');
    expect(args).toContain('--js-runtimes'); // always, anonymous or not
    // v1.0.1: the official yt-dlp executables embed the EJS component
    // (yt_dlp_ejs-0.8.0). --remote-components would only PERMIT fetching
    // from GitHub at runtime — never needed, so never passed.
    expect(args).not.toContain('--remote-components');
    expect(args.some((a) => a.startsWith('ejs:'))).toBe(false);
    delete process.env.ANCLORA_FILESTUDIO_YTDLP_COOKIES_PATH;
    delete process.env.ANCLORA_FILESTUDIO_PLATFORM;
    vi.resetModules();
  });
});

describe('buildFfmpegVideoArgs — local video stream mapping', () => {
  it('maps the first video stream when audio is mapped optionally', () => {
    const args = buildFfmpegVideoArgs({
      inputPath: '/tmp/input.mp4',
      outputPath: '/tmp/output.webm',
      format: 'webm',
      quality: '720',
    });

    expect(args).toContain('-map');
    expect(args).toEqual(expect.arrayContaining(['-map', '0:v:0', '-map', '0:a?']));
  });

  it('does not treat legacy UI quality 5 as a 5px WebM height', () => {
    const args = buildFfmpegVideoArgs({
      inputPath: '/tmp/input.mp4',
      outputPath: '/tmp/output.webm',
      format: 'webm',
      quality: '5',
    });

    expect(args).toContain('scale=-2:min(720\\,ih)');
    expect(args).not.toContain('scale=-2:min(5\\,ih)');
  });
});
