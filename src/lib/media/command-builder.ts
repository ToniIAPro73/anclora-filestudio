import { AudioOutputFormat, VideoOutputFormat } from "../jobs/job-types";
import { CONFIG } from "../config";
import {
  VideoQualitySelection,
  buildYtdlpFormatSelector,
  parseLegacyQualityString,
} from "../quality/quality-contract";
import { isAncloraWindowsRuntime } from "../runtime-platform";

/**
 * Common yt-dlp flags injected on every invocation (metadata, download, conversion).
 * On Windows portable, SSL inspection by antivirus/corporate proxies breaks yt-dlp's
 * certificate verification. --no-check-certificates is the only reliable workaround
 * for portable distributions running in arbitrary Windows corporate environments.
 * It is NOT added in dev/Linux mode where TLS verification works as expected.
 *
 * --cookies is added only when ANCLORA_FILESTUDIO_YTDLP_COOKIES_PATH is set
 * locally (never by default, never in portables). Applied to both metadata
 * and download so a video that analyzes successfully also downloads.
 *
 * An authenticated request still needs signature/n-challenge solving (EJS)
 * to get real format URLs — without it yt-dlp only returns images. That
 * needs a JS runtime (--js-runtimes, using the same Node running this
 * server) plus the official yt-dlp EJS solver component, fetched once from
 * yt-dlp's own GitHub releases and cached locally. Both are gated behind
 * the same cookies opt-in so portables (which never set that var) are
 * untouched.
 */
export function getYtdlpCommonArgs(): string[] {
  const args: string[] = [];
  if (isAncloraWindowsRuntime()) {
    args.push("--no-check-certificates");
  }
  if (CONFIG.media.binaries.ytdlpCookiesPath) {
    args.push("--cookies", CONFIG.media.binaries.ytdlpCookiesPath);
    args.push("--js-runtimes", `node:${process.execPath}`);
    args.push("--remote-components", "ejs:github");
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
}

export function buildYtdlpArgs(options: YtdlpConversionOptions): string[] {
  const { url, format, quality, outputPath, ffmpegLocation } = options;

  const baseArgs = [
    ...getYtdlpCommonArgs(),
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
      args.push("-c:a", "aac", "-b:a", `${opts.quality}k`);
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

// Legacy export for backwards compatibility
export const buildConversionArgs = buildYtdlpArgs;
export type ConversionOptions = YtdlpConversionOptions;
