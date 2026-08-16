import { AudioOutputFormat, VideoOutputFormat } from "../jobs/job-types";
import { CONFIG } from "../config";
import {
  VideoQualitySelection,
  buildYtdlpFormatSelector,
  parseLegacyQualityString,
} from "../quality/quality-contract";
import { isAncloraWindowsRuntime } from "../runtime-platform";
import { resolveYtdlpNodeRuntime } from "./js-runtime";

/**
 * Common yt-dlp flags injected on every invocation (metadata, download, conversion).
 * On Windows portable, SSL inspection by antivirus/corporate proxies breaks yt-dlp's
 * certificate verification. --no-check-certificates is the only reliable workaround
 * for portable distributions running in arbitrary Windows corporate environments.
 * It is NOT added in dev/Linux mode where TLS verification works as expected.
 *
 * JS CAPABILITY vs AUTHENTICATION are deliberately decoupled:
 *
 * - CAPABILITY: yt-dlp needs a JS runtime to solve signed/n-challenged format
 *   URLs. That must work ANONYMOUSLY too, so --js-runtimes node:<runtime> is
 *   ALWAYS added (not gated behind cookies). The node path is resolved
 *   explicitly from the bundled portable runtime (js-runtime.ts) — never
 *   assumed to be process.execPath.
 * - AUTHENTICATION: --cookies is opt-in per call, not automatic: an
 *   authenticated session helps bypass a bot-check, but a stale/rotated
 *   cookie can also make YouTube revoke a signed segment URL mid-download
 *   for videos that would otherwise work fine anonymously. Callers try
 *   WITHOUT cookies first and only pass useCookies=true as a fallback retry
 *   after that attempt fails — see ytdlp-cookies-retry.ts. --cookies itself
 *   is only ever added when ANCLORA_FILESTUDIO_YTDLP_COOKIES_PATH is set or
 *   a data/cookies.txt drop-in exists (never by default, never in portables).
 *
 * EJS SOLVER: the official yt-dlp executables bundled by FileStudio (locked
 * to 2026.07.04 from the yt-dlp GitHub releases) EMBED the EJS component
 * (yt_dlp_ejs-0.8.0 — visible in `[debug] Optional libraries` even when
 * running with --no-remote-components). yt-dlp's own --remote-components
 * help states the flag "is currently not needed if you are using an
 * official executable". The flag only PERMITS fetching components from
 * GitHub/npm when required, so it is deliberately NEVER passed in any path
 * (anonymous or cookies): FileStudio portables must work without
 * downloading components from GitHub at runtime.
 */
export function getYtdlpCommonArgs(useCookies: boolean = false): string[] {
  const args: string[] = [];
  if (isAncloraWindowsRuntime()) {
    args.push("--no-check-certificates");
  }
  const nodeRuntime = resolveYtdlpNodeRuntime();
  if (nodeRuntime) {
    args.push("--js-runtimes", `node:${nodeRuntime}`);
  }
  if (useCookies && CONFIG.media.binaries.ytdlpCookiesPath) {
    args.push("--cookies", CONFIG.media.binaries.ytdlpCookiesPath);
  }
  return args;
}

export type OutputFormat = AudioOutputFormat | VideoOutputFormat;

export interface AudioConversionOptions {
  inputPath: string;
  outputPath: string;
  format: AudioOutputFormat;
  quality: string;
  normalize?: boolean;
  trimStart?: number;
  trimEnd?: number;
  audioStreamIndex?: number;
  /** Optional global metadata tags (e.g. title/artist recovered from the source video). */
  metadata?: Record<string, string>;
}

export interface VideoConversionOptions {
  inputPath: string;
  outputPath: string;
  format: VideoOutputFormat;
  quality: string;
  trimStart?: number;
  trimEnd?: number;
  audioStreamIndex?: number;
  videoStreamIndex?: number;
}

export interface YtdlpConversionOptions {
  url: string;
  format: OutputFormat;
  /** Accepts a typed VideoQualitySelection (new callers) or a legacy string (persisted jobs). */
  quality: string | VideoQualitySelection;
  outputPath: string;
  ffmpegLocation?: string;
  /** Fallback retry only — see ytdlp-cookies-retry.ts. Defaults to false (try anonymous first). */
  useCookies?: boolean;
}

export function buildYtdlpArgs(options: YtdlpConversionOptions): string[] {
  const { url, format, quality, outputPath, ffmpegLocation, useCookies } = options;

  const baseArgs = [
    ...getYtdlpCommonArgs(useCookies),
    "--no-playlist",
    "--newline",
    ...(ffmpegLocation ? ["--ffmpeg-location", ffmpegLocation] : []),
    "--output",
    outputPath,
    "--embed-metadata",
    url,
  ];

  const audioFormats: AudioOutputFormat[] = ["mp3", "m4a", "wav", "flac", "ogg"];
  if (audioFormats.includes(format as AudioOutputFormat)) {
    // Audio quality must be a string; VideoQualitySelection is not valid here.
    const qualityStr = typeof quality === "string" ? quality : "best";
    const args = [
      "--extract-audio",
      "--audio-format",
      format,
      ...baseArgs,
    ];
    const mappedQuality = mapAudioQuality(qualityStr, format as AudioOutputFormat);
    return mappedQuality ? ["--audio-quality", mappedQuality, ...args] : args;
  }

  // Video: resolve typed selection or adapt legacy string
  const selection: VideoQualitySelection =
    typeof quality === "string"
      ? parseLegacyQualityString(quality, format)
      : quality;

  const { formatArg, mergeFormat } = buildYtdlpFormatSelector(selection);

  return [
    "--format",
    formatArg,
    "--merge-output-format",
    mergeFormat,
    ...baseArgs,
  ];
}

export interface YtdlpSourceDownloadOptions {
  url: string;
  /** yt-dlp --format value for the SOURCE representation (may differ from the output format). */
  formatSelector: string;
  /**
   * yt-dlp --output template for the intermediate source file, e.g.
   * `<jobDir>/source.%(ext)s`. The processor locates the real extension
   * afterwards and finalizes (remux/transcode) into the requested output.
   */
  outputTemplate: string;
  ffmpegLocation?: string;
  useCookies?: boolean;
  /** Container to merge the source into (video fallback candidates). */
  mergeFormat?: "mp4" | "webm" | "mkv";
  embedMetadata?: boolean;
}

/**
 * Two-stage download args: pull a SOURCE representation (chosen by a
 * download-strategy candidate), then post-process it with FFmpeg into the
 * OUTPUT format. Used by:
 *  - the anonymous audio pipeline (source ≠ output: e.g. Opus/WebM → MP3);
 *  - the video alternate-codec fallback (e.g. VP9/Opus → H.264/AAC MP4).
 */
export function buildYtdlpSourceDownloadArgs(options: YtdlpSourceDownloadOptions): string[] {
  const args = [
    ...getYtdlpCommonArgs(options.useCookies),
    "--no-playlist",
    "--newline",
    ...(options.ffmpegLocation ? ["--ffmpeg-location", options.ffmpegLocation] : []),
    "--format",
    options.formatSelector,
    "--output",
    options.outputTemplate,
  ];
  if (options.mergeFormat) {
    args.push("--merge-output-format", options.mergeFormat);
  }
  if (options.embedMetadata) {
    args.push("--embed-metadata");
  }
  args.push(options.url);
  return args;
}

/** Build ffmpeg args for local file audio conversion */
export function buildFfmpegAudioArgs(opts: AudioConversionOptions): string[] {
  const args: string[] = ["-y", "-i", opts.inputPath];

  if (opts.trimStart !== undefined) {
    args.push("-ss", String(opts.trimStart));
  }
  if (opts.trimEnd !== undefined) {
    args.push("-to", String(opts.trimEnd));
  }

  if (opts.audioStreamIndex !== undefined) {
    args.push("-map", `0:a:${opts.audioStreamIndex}`);
  }

  if (opts.normalize) {
    args.push("-af", "loudnorm=I=-16:TP=-1.5:LRA=11");
  }

  switch (opts.format) {
    case "mp3":
      args.push("-c:a", "libmp3lame", "-q:a", mapMp3Quality(opts.quality));
      break;
    case "m4a":
      args.push("-c:a", "aac", "-b:a", `${resolveFfmpegAudioBitrateKbps(opts.quality)}k`);
      break;
    case "wav":
      args.push("-c:a", "pcm_s16le");
      break;
    case "flac":
      args.push("-c:a", "flac");
      break;
    case "ogg":
      args.push("-c:a", "libvorbis", "-q:a", "4");
      break;
  }

  if (opts.metadata) {
    for (const [key, value] of Object.entries(opts.metadata)) {
      if (value) args.push("-metadata", `${key}=${value}`);
    }
  }

  args.push(opts.outputPath);
  return args;
}

/** Build ffmpeg args for local file video conversion */
export function buildFfmpegVideoArgs(opts: VideoConversionOptions): string[] {
  const args: string[] = ["-y", "-i", opts.inputPath];

  if (opts.trimStart !== undefined) {
    args.push("-ss", String(opts.trimStart));
  }
  if (opts.trimEnd !== undefined) {
    args.push("-to", String(opts.trimEnd));
  }

  if (opts.videoStreamIndex !== undefined) {
    args.push("-map", `0:v:${opts.videoStreamIndex}`);
  } else {
    args.push("-map", "0:v:0");
  }
  if (opts.audioStreamIndex !== undefined) {
    args.push("-map", `0:a:${opts.audioStreamIndex}`);
  } else {
    args.push("-map", "0:a?");
  }

  const height = normalizeVideoHeight(opts.quality, opts.format);

  switch (opts.format) {
    case "mp4":
      args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");
      args.push("-c:a", "aac", "-b:a", "128k");
      if (height !== null) {
        args.push("-vf", `scale=-2:min(${height}\\,ih)`);
      }
      args.push("-movflags", "+faststart");
      break;
    case "webm":
      args.push("-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0");
      args.push("-c:a", "libopus", "-b:a", "128k");
      if (height !== null) {
        args.push("-vf", `scale=-2:min(${height}\\,ih)`);
      }
      break;
    case "mkv":
      args.push("-c:v", "copy", "-c:a", "copy");
      break;
  }

  args.push(opts.outputPath);
  return args;
}

function normalizeVideoHeight(quality: string, format: VideoOutputFormat): number | null {
  const parsed = parseInt(quality, 10);
  if (Number.isFinite(parsed) && parsed >= 144) return parsed;
  if (quality === "0" || quality === "copy") return null;
  if (format === "webm") return 720;
  if (format === "mp4") return 1080;
  return null;
}

function mapAudioQuality(quality: string, format: AudioOutputFormat): string {
  const normalized = quality.trim().toLowerCase();
  if (normalized === "best" || normalized === "max" || normalized === "") {
    if (format === "mp3") return "0";
    if (format === "ogg") return "10";
    return "";
  }
  if (normalized === "high" || normalized === "alta") {
    if (format === "mp3") return "2";
    if (format === "ogg") return "8";
    return "256K";
  }
  if (normalized === "standard" || normalized === "estandar" || normalized === "estándar") {
    if (format === "mp3") return "5";
    if (format === "ogg") return "5";
    return "192K";
  }
  if (normalized === "light" || normalized === "ligera") {
    if (format === "mp3") return "7";
    if (format === "ogg") return "3";
    return "128K";
  }
  if (format === "mp3") {
    const bitrate = parseInt(quality, 10);
    if (bitrate >= 320) return "0";
    if (bitrate >= 192) return "2";
    if (bitrate >= 128) return "5";
    return "7";
  }
  return quality;
}

function mapMp3Quality(quality: string): string {
  const bitrate = parseInt(quality, 10);
  if (bitrate >= 320) return "0";
  if (bitrate >= 256) return "1";
  if (bitrate >= 192) return "2";
  if (bitrate >= 128) return "5";
  return "7";
}

/**
 * Normalize a job quality value ("best", "high", "standard", "light",
 * "192", ...) to a concrete AAC bitrate in kbps for `-b:a <n>k`.
 * Guards against building an invalid `-b:a bestk` (legacy jobs may store
 * non-numeric quality words for audio).
 */
export function resolveFfmpegAudioBitrateKbps(quality: string): string {
  const normalized = quality.trim().toLowerCase();
  if (normalized === "best" || normalized === "max" || normalized === "") return "192";
  if (normalized === "high" || normalized === "alta") return "256";
  if (normalized === "standard" || normalized === "estandar" || normalized === "estándar") return "192";
  if (normalized === "light" || normalized === "ligera") return "128";
  const bitrate = parseInt(quality, 10);
  if (Number.isFinite(bitrate) && bitrate > 0) return String(Math.min(bitrate, 512));
  return "192";
}

// Legacy export for backwards compatibility
export const buildConversionArgs = buildYtdlpArgs;
export type ConversionOptions = YtdlpConversionOptions;
