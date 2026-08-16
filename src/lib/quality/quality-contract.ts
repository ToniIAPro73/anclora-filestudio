import { z } from 'zod';

export const QualityProfileSchema = z.enum(['source-max', 'mp4-compatible']);
export type QualityProfile = z.infer<typeof QualityProfileSchema>;

export const ResolutionLimitSchema = z.union([
  z.literal('max'),
  z.literal(360),
  z.literal(480),
  z.literal(720),
  z.literal(1080),
  z.literal(1440),
  z.literal(2160),
]);
export type ResolutionLimit = z.infer<typeof ResolutionLimitSchema>;

export const VideoQualitySelectionSchema = z.object({
  profile: QualityProfileSchema,
  resolutionLimit: ResolutionLimitSchema,
  requestedFps: z.number().optional(),
  fallbackPolicy: z.enum(['reject', 'confirm-required']).default('reject'),
});
export type VideoQualitySelection = z.infer<typeof VideoQualitySelectionSchema>;

export interface FormatSelectorResult {
  formatArg: string;
  mergeFormat: string;
  willRecode: boolean;
}

export function buildYtdlpFormatSelector(selection: VideoQualitySelection): FormatSelectorResult {
  const { profile, resolutionLimit } = selection;

  if (profile === 'source-max') {
    if (resolutionLimit === 'max') {
      return {
        formatArg: 'bestvideo*+bestaudio/bestvideo*',
        mergeFormat: 'mkv',
        willRecode: false,
      };
    }
    // Numeric resolution limit — no [ext=mp4] constraint so WebM/VP9/AV1 streams are eligible
    return {
      formatArg: `bestvideo*[height=${resolutionLimit}]+bestaudio/bestvideo*[height=${resolutionLimit}]`,
      mergeFormat: 'mkv',
      willRecode: false,
    };
  }

  // mp4-compatible profile. The SELECTOR must be strictly compatible with
  // the candidate it feeds (single-shot: yt-dlp writes this straight into
  // the output .mp4). NO internal fallback to bare `bestvideo*+bestaudio` or
  // `bestvideo*`: that would let yt-dlp silently land on a VP9/AV1+Opus
  // source DURING the first attempt and merge it into an MP4 container
  // (VP9-in-MP4 is not conventional MP4, no transcode runs, and the pipeline
  // never learns which representation was used). Codec fallback is the
  // DownloadStrategy's job via its alternate candidates, driven by a
  // recoverable per-format 403 — never the yt-dlp selector's.
  if (resolutionLimit === 'max') {
    return {
      formatArg: 'bestvideo*[ext=mp4]+bestaudio[ext=m4a]',
      mergeFormat: 'mp4',
      willRecode: false,
    };
  }

  // mp4-compatible + numeric resolution limit (H.264/MP4 video + AAC/M4A
  // audio only; progressive `best` allowed as an extra strict alternative).
  return {
    formatArg: [
      `bestvideo*[height=${resolutionLimit}][ext=mp4]+bestaudio[ext=m4a]`,
      `best[height=${resolutionLimit}][ext=mp4]`,
    ].join('/'),
    mergeFormat: 'mp4',
    willRecode: false,
  };
}

const AUDIO_QUALITY_STRINGS = new Set(['128', '192', '256', '320']);

/**
 * Adapter for legacy quality strings stored in persisted jobs.
 * Maps the old string-based quality values to a typed VideoQualitySelection.
 *
 * @throws {TypeError} if quality is an audio bitrate string or cannot be interpreted.
 */
export function parseLegacyQualityString(quality: string, format?: string): VideoQualitySelection {
  void format;
  const trimmed = quality.trim();

  if (AUDIO_QUALITY_STRINGS.has(trimmed)) {
    throw new TypeError(
      `parseLegacyQualityString: quality "${trimmed}" is an audio bitrate — not applicable for video quality selection.`
    );
  }

  // Treat empty / "best" / "max" / NaN as source-max + max
  if (
    trimmed === '' ||
    trimmed === 'best' ||
    trimmed === 'max' ||
    Number.isNaN(Number(trimmed))
  ) {
    return VideoQualitySelectionSchema.parse({
      profile: 'source-max',
      resolutionLimit: 'max',
    });
  }

  const numeric = Number(trimmed);

  switch (numeric) {
    case 360:
    case 480:
    case 720:
    case 1080:
      return VideoQualitySelectionSchema.parse({
        profile: 'mp4-compatible',
        resolutionLimit: numeric,
      });

    case 1440:
    case 2160:
      // These resolutions were not previously selectable; treat as source-max
      return VideoQualitySelectionSchema.parse({
        profile: 'source-max',
        resolutionLimit: numeric,
      });

    default:
      throw new TypeError(
        `parseLegacyQualityString: cannot interpret quality string "${quality}". Expected a known resolution (360/480/720/1080/1440/2160), "best", "max", or empty.`
      );
  }
}
