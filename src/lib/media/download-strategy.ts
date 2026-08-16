/**
 * Download strategy — decouples SOURCE FORMAT from OUTPUT FORMAT.
 *
 * The yt-dlp format selector describes the SOURCE representation to pull
 * from the provider (chosen for deliverability), NOT the container/codec
 * the user asked for. A source that byte-matches the output is merged or
 * remuxed directly; anything else goes through FFmpeg afterwards.
 *
 * Real-world motivation (verified on 88fD-UtG_yo):
 *   H.264/MP4 (formats 18/136/137) and AAC/M4A (140) → HTTP 403 mid-download
 *   VP9/WebM (248) + Opus (251)                                → full PASS
 * The video is NOT blocked: specific CDN representations are. So the
 * pipeline tries a preferred compatible source first and, on a recoverable
 * per-format 403, falls back to an alternate-codec source that it then
 * transcodes into the requested output format.
 *
 * No hardcoded format IDs (248/251) in production selectors — the strategy
 * is expressed in codec/container/resolution properties so it stays valid
 * as YouTube's format table changes.
 */
import { AudioOutputFormat, VideoOutputFormat } from "../jobs/job-types";
import { buildYtdlpFormatSelector, VideoQualitySelection } from "../quality/quality-contract";

export type DownloadSourceKind =
  | "preferred"
  | "alternate-codec"
  | "vp9-explicit"
  | "audio-fallback";

export interface DownloadCandidate {
  /** Stable identifier for logs/tests. */
  id: string;
  /** yt-dlp --format value describing the SOURCE representation. */
  formatSelector: string;
  /**
   * Container yt-dlp should merge the source into (video candidates).
   * mkv is the universal intermediate used whenever the source may not
   * be compatible with the requested container (it holds any codec).
   */
  mergeFormat?: "mp4" | "webm" | "mkv";
  sourceKind: DownloadSourceKind;
  /**
   * Whether the final output needs FFmpeg (remux or transcode). The
   * processor probes the downloaded source and decides remux vs transcode
   * dynamically; this flag documents the expected normal case.
   */
  requiresTranscode: boolean;
  /**
   * true: yt-dlp downloads/merges straight into the final output path
   * (preferred compatible source). false: download to an intermediate
   * source file, then finalize (remux/transcode) to the output path.
   */
  singleShot: boolean;
}

const AUDIO_OUTPUT_FORMATS: readonly AudioOutputFormat[] = ["mp3", "m4a", "wav", "flac", "ogg"];

function heightClause(limit: number | "max"): string {
  return limit === "max" ? "" : `[height=${limit}]`;
}

/**
 * Audio candidates. The source is chosen for deliverability, the output
 * format is produced by FFmpeg afterwards:
 *
 *   YouTube → bestaudio (Opus/WebM where that is what deliverable) → FFmpeg → MP3/M4A/WAV/FLAC/OGG
 *
 * m4a output prefers an m4a source first (direct remux when available);
 * every other output format starts from plain bestaudio, with an explicit
 * Opus/WebM alternative as the recoverable-403 fallback.
 */
export function buildAudioDownloadCandidates(format: AudioOutputFormat): DownloadCandidate[] {
  if (format === "m4a") {
    return [
      {
        id: "audio-m4a-preferred",
        formatSelector: "bestaudio[ext=m4a]/bestaudio",
        sourceKind: "preferred",
        requiresTranscode: false,
        singleShot: false,
      },
      {
        id: "audio-webm-alternate",
        formatSelector: "bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio[ext=m4a]/bestaudio",
        sourceKind: "alternate-codec",
        requiresTranscode: true,
        singleShot: false,
      },
    ];
  }
  return [
    {
      id: "audio-preferred",
      formatSelector: "bestaudio/best",
      sourceKind: "preferred",
      requiresTranscode: true,
      singleShot: false,
    },
    {
      id: "audio-opus-alternate",
      formatSelector: "bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio[ext=m4a]/bestaudio",
      sourceKind: "alternate-codec",
      requiresTranscode: true,
      singleShot: false,
    },
  ];
}

function buildMp4Candidates(selection: VideoQualitySelection): DownloadCandidate[] {
  const h = heightClause(selection.resolutionLimit);
  const preferred = buildYtdlpFormatSelector(selection);
  return [
    {
      id: "mp4-h264-preferred",
      formatSelector: preferred.formatArg,
      mergeFormat: preferred.mergeFormat as "mp4",
      sourceKind: "preferred",
      requiresTranscode: false,
      singleShot: true,
    },
    // No ext constraint: bestvideo* may be VP9/AV1 (WebM family). Merge
    // into mkv (holds any codec) and transcode to H.264/AAC afterwards.
    {
      id: "mp4-any-codec-alternate",
      formatSelector: `bestvideo*${h}+bestaudio/bestvideo*+bestaudio`,
      mergeFormat: "mkv",
      sourceKind: "alternate-codec",
      requiresTranscode: true,
      singleShot: false,
    },
    // Explicit VP9 (or AV1) + WebM audio — the representation family that
    // real-world CDN 403s consistently allow when H.264/MP4 is refused.
    {
      id: "mp4-vp9-explicit",
      formatSelector:
        `bestvideo*[vcodec^=vp9]${h}+bestaudio[ext=webm]/` +
        `bestvideo*[vcodec^=vp9]+bestaudio[ext=webm]/` +
        `bestvideo*[vcodec^=av01]${h}+bestaudio[ext=webm]/` +
        `bestvideo*[vcodec^=av01]+bestaudio[ext=webm]`,
      mergeFormat: "webm",
      sourceKind: "vp9-explicit",
      requiresTranscode: true,
      singleShot: false,
    },
  ];
}

function buildWebmCandidates(selection: VideoQualitySelection): DownloadCandidate[] {
  const h = heightClause(selection.resolutionLimit);
  return [
    {
      id: "webm-preferred",
      formatSelector:
        `bestvideo*${h}[ext=webm]+bestaudio[ext=webm]/` +
        `bestvideo*[ext=webm]+bestaudio[ext=webm]/` +
        `bestvideo*[ext=webm]+bestaudio`,
      mergeFormat: "webm",
      sourceKind: "preferred",
      requiresTranscode: false,
      singleShot: true,
    },
    {
      id: "webm-any-codec-alternate",
      formatSelector:
        `bestvideo*${h}+bestaudio[ext=webm]/` +
        `bestvideo*+bestaudio[ext=webm]/` +
        `bestvideo*+bestaudio`,
      mergeFormat: "webm",
      sourceKind: "alternate-codec",
      requiresTranscode: false,
      singleShot: false,
    },
  ];
}

function buildMkvCandidates(selection: VideoQualitySelection): DownloadCandidate[] {
  const h = heightClause(selection.resolutionLimit);
  return [
    {
      id: "mkv-preferred",
      formatSelector: `bestvideo*${h}+bestaudio/bestvideo*+bestaudio`,
      mergeFormat: "mkv",
      sourceKind: "preferred",
      requiresTranscode: false,
      singleShot: true,
    },
    {
      id: "mkv-vp9-alternate",
      formatSelector:
        `bestvideo*[vcodec^=vp9]${h}+bestaudio[ext=webm]/` +
        `bestvideo*+bestaudio`,
      mergeFormat: "mkv",
      sourceKind: "alternate-codec",
      requiresTranscode: false,
      singleShot: false,
    },
  ];
}

/**
 * Ordered, bounded list of download candidates for a job.
 *
 * - source-max profile: single candidate — the profile already accepts
 *   every codec/container, so there is no meaningful "alternate codec"
 *   fallback (any alternate would be the same selector).
 * - mp4-compatible profile: preferred compatible source → alternate
 *   any-codec source → explicit VP9/AV1 source (max 3 + cookies retry).
 * - Audio: preferred source → Opus/WebM alternative (max 2 + cookies retry).
 *
 * Determined, never open-ended: no loops, no infinite retries.
 */
export function buildDownloadCandidates(
  format: AudioOutputFormat | VideoOutputFormat,
  selection?: VideoQualitySelection
): DownloadCandidate[] {
  if ((AUDIO_OUTPUT_FORMATS as readonly string[]).includes(format)) {
    return buildAudioDownloadCandidates(format as AudioOutputFormat);
  }

  const videoFormat = format as VideoOutputFormat;
  const sel: VideoQualitySelection =
    selection ?? { profile: "source-max", resolutionLimit: "max", fallbackPolicy: "reject" };

  if (sel.profile === "source-max") {
    const preferred = buildYtdlpFormatSelector(sel);
    return [
      {
        id: "source-max",
        formatSelector: preferred.formatArg,
        mergeFormat: preferred.mergeFormat as "mkv",
        sourceKind: "preferred",
        requiresTranscode: false,
        singleShot: true,
      },
    ];
  }

  switch (videoFormat) {
    case "mp4":
      return buildMp4Candidates(sel);
    case "webm":
      return buildWebmCandidates(sel);
    case "mkv":
      return buildMkvCandidates(sel);
    default:
      return buildMp4Candidates(sel);
  }
}