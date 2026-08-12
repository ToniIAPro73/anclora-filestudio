import { getVideoMetadata } from '../media/metadata';
import type { AudioFormatVariant, VideoFormat } from '../media/metadata';
import { AppError } from '../errors';
import { validateRemoteUrl, redactSensitiveQueryParams } from './ssrf-guard';
import { classifyRemoteUrl } from './url-classifier';
import type { SourceKind } from './url-classifier';
import { analyzeWebPage } from './web-page-analyzer';
import type { MediaSource } from './web-page-analyzer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { SourceKind };

export interface AudioVariant {
  formatId: string;
  protocol?: string | null;
  ext: string;
  acodec: string | null;
  abr: number | null;
  sampleRate?: number | null;
  channels?: number | null;
  fileSizeBytes: number | null;
  hasAudio?: boolean;
}

export interface RemoteMediaAnalysis {
  sourceKind: SourceKind;
  sourceProvider: string | null;
  sourceUrlRedacted: string;
  /** True ONLY when validateRemoteUrl() blocks the URL (SSRF / private network). */
  ssrfBlocked: boolean;
  isPubliclyAccessible: boolean;
  requiresAuthentication: boolean;
  drmDetected: boolean;
  extractorAvailable: boolean;
  analysisStatus: string;
  videoVariants: VideoFormat[];
  audioVariants: AudioVariant[];
  bestVideo?: VideoFormat;
  bestAudio?: AudioVariant;
  muxRequired?: boolean;
  sourceType?: 'hls' | 'dash' | 'progressive' | 'other';
  limitationMessages: string[];
  alternativeMessage: string | null;
  title?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  durationLabel?: string;
  /**
   * When both yt-dlp and HTML analysis failed, stores the classified error so
   * the route can forward it directly instead of returning a generic message.
   */
  classifiedError?: { code: string; message: string; status: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mediaSourceToVideoFormat(src: MediaSource, index: number): VideoFormat {
  return {
    formatId: `remote-${index}`,
    width: null,
    height: null,
    fps: null,
    ext: src.url.split('.').pop()?.split('?')[0] ?? src.mimeType?.split('/')[1] ?? 'unknown',
    vcodec: null,
    acodec: null,
    isVideoOnly: false,
    fileSizeBytes: null,
    fileSizeApproxBytes: null,
    tbr: null,
  };
}

function audioVariantsFromFormats(
  videoFormats: VideoFormat[],
  audioFormats: AudioFormatVariant[] = [],
): AudioVariant[] {
  const seen = new Set<string>();
  const variants: AudioVariant[] = [];
  for (const format of audioFormats) {
    if (!format.acodec) continue;
    const key = `${format.formatId}:${format.acodec}:${format.abr ?? ""}:${format.sampleRate ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    variants.push({
      formatId: format.formatId,
      protocol: format.protocol ?? null,
      ext: format.ext,
      acodec: format.acodec,
      abr: format.abr ?? null,
      sampleRate: format.sampleRate ?? null,
      channels: format.channels ?? null,
      fileSizeBytes: format.fileSizeBytes,
      hasAudio: format.hasAudio,
    });
  }

  for (const format of videoFormats) {
    if (!format.acodec) continue;
    const key = `${format.formatId}:${format.acodec}:${format.abr ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    variants.push({
      formatId: format.formatId,
      protocol: format.protocol ?? null,
      ext: format.ext,
      acodec: format.acodec,
      abr: format.abr ?? null,
      fileSizeBytes: format.fileSizeBytes,
      hasAudio: true,
    });
  }
  return variants;
}

function pickBestVideo(formats: VideoFormat[]): VideoFormat | undefined {
  return [...formats].sort((a, b) => {
    const height = (b.height ?? 0) - (a.height ?? 0);
    if (height !== 0) return height;
    const bitrate = (b.vbr ?? b.tbr ?? 0) - (a.vbr ?? a.tbr ?? 0);
    if (bitrate !== 0) return bitrate;
    return (b.fps ?? 0) - (a.fps ?? 0);
  })[0];
}

function pickBestAudio(formats: AudioVariant[]): AudioVariant | undefined {
  return [...formats].sort((a, b) => {
    const bitrate = (b.abr ?? 0) - (a.abr ?? 0);
    if (bitrate !== 0) return bitrate;
    return (b.fileSizeBytes ?? 0) - (a.fileSizeBytes ?? 0);
  })[0];
}

function sourceTypeFromKind(sourceKind: SourceKind): RemoteMediaAnalysis['sourceType'] {
  if (sourceKind === 'hls' || sourceKind === 'dash') return sourceKind;
  if (sourceKind === 'direct-media') return 'progressive';
  return 'other';
}

async function analyzeWithYtdlp(
  url: string,
  sourceKind: SourceKind,
  sourceProvider: string | null,
  sourceUrlRedacted: string,
): Promise<RemoteMediaAnalysis> {
  const meta = await getVideoMetadata(url);
  const audioVariants = audioVariantsFromFormats(meta.videoFormats, meta.audioFormats);
  const bestVideo = pickBestVideo(meta.videoFormats);
  const bestAudio = pickBestAudio(audioVariants);
  return {
    sourceKind,
    sourceProvider,
    sourceUrlRedacted,
    ssrfBlocked: false,
    isPubliclyAccessible: true,
    requiresAuthentication: false,
    drmDetected: false,
    extractorAvailable: true,
    analysisStatus: 'resolved',
    videoVariants: meta.videoFormats,
    audioVariants,
    bestVideo,
    bestAudio,
    muxRequired: Boolean(bestVideo?.isVideoOnly && bestAudio),
    sourceType: sourceTypeFromKind(sourceKind),
    limitationMessages: [],
    alternativeMessage: null,
    title: meta.title,
    thumbnailUrl: meta.thumbnailUrl,
    durationSeconds: meta.durationSeconds,
    durationLabel: meta.durationLabel,
  };
}

const EMPTY_SSRF_BLOCK = (sourceUrlRedacted: string, reason: string): RemoteMediaAnalysis => ({
  sourceKind: 'unsupported-or-protected',
  sourceProvider: null,
  sourceUrlRedacted,
  ssrfBlocked: true,
  isPubliclyAccessible: false,
  requiresAuthentication: false,
  drmDetected: false,
  extractorAvailable: false,
  analysisStatus: 'failed',
  videoVariants: [],
  audioVariants: [],
  limitationMessages: [reason],
  alternativeMessage: null,
});

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function analyzeRemoteMedia(url: string): Promise<RemoteMediaAnalysis> {
  const sourceUrlRedacted = redactSensitiveQueryParams(url);

  // Layer 1 — SSRF guard (network security requirement; hard block)
  const guard = await validateRemoteUrl(url);
  if (!guard.safe) {
    return EMPTY_SSRF_BLOCK(sourceUrlRedacted, guard.reason ?? 'URL bloqueada por seguridad de red.');
  }

  // Layer 2 — Classify URL by extension / Content-Type / host
  const classification = await classifyRemoteUrl(url);

  // Layer 3 — Dispatch by kind
  switch (classification.kind) {
    case 'youtube': {
      try {
        return await analyzeWithYtdlp(url, 'youtube', 'YouTube', sourceUrlRedacted);
      } catch (err) {
        const appErr = err instanceof AppError ? err : null;
        return {
          sourceKind: 'youtube',
          sourceProvider: 'YouTube',
          sourceUrlRedacted,
          ssrfBlocked: false,
          isPubliclyAccessible: false,
          requiresAuthentication: false,
          drmDetected: false,
          extractorAvailable: true,
          analysisStatus: 'failed',
          videoVariants: [],
          audioVariants: [],
          limitationMessages: [appErr?.message ?? (err instanceof Error ? err.message : String(err))],
          alternativeMessage: null,
          classifiedError: appErr
            ? { code: appErr.code, message: appErr.message, status: appErr.status ?? 500 }
            : undefined,
        };
      }
    }

    case 'direct-media': {
      const ext = url.split('.').pop()?.split('?')[0] ?? 'unknown';
      return {
        sourceKind: 'direct-media',
        sourceProvider: classification.sourceProvider,
        sourceUrlRedacted,
        ssrfBlocked: false,
        isPubliclyAccessible: true,
        requiresAuthentication: false,
        drmDetected: false,
        extractorAvailable: true,
        analysisStatus: 'resolved',
        videoVariants: [
          {
            formatId: 'direct-0',
            width: null,
            height: null,
            fps: null,
            ext,
            vcodec: null,
            acodec: null,
            isVideoOnly: false,
            fileSizeBytes: null,
            fileSizeApproxBytes: null,
            tbr: null,
          },
        ],
        audioVariants: [],
        limitationMessages: [],
        alternativeMessage: null,
      };
    }

    case 'hls':
    case 'dash': {
      const kindLabel = classification.kind === 'hls' ? 'HLS' : 'DASH';
      try {
        return await analyzeWithYtdlp(url, classification.kind, classification.sourceProvider, sourceUrlRedacted);
      } catch (err) {
        const appErr = err instanceof AppError ? err : null;
        return {
          sourceKind: classification.kind,
          sourceProvider: classification.sourceProvider,
          sourceUrlRedacted,
          ssrfBlocked: false,
          isPubliclyAccessible: false,
          requiresAuthentication: false,
          drmDetected: classification.drmDetected,
          extractorAvailable: true,
          analysisStatus: 'failed',
          videoVariants: [],
          audioVariants: [],
          limitationMessages: [appErr?.message ?? (err instanceof Error ? err.message : String(err))],
          alternativeMessage: classification.drmDetected
            ? `Stream ${kindLabel} protegido con DRM detectado. Anclora FileStudio no puede procesar contenido DRM.`
            : null,
          classifiedError: appErr
            ? { code: appErr.code, message: appErr.message, status: appErr.status ?? 500 }
            : undefined,
        };
      }
    }

    case 'web-page': {
      // Strategy: try yt-dlp first (supports hundreds of sites), then fall back
      // to HTML source extraction for simple pages with <video>/<source> tags.
      // Auth/DRM heuristics from HTML are NOT used as blocking signals.

      let ytdlpError: AppError | null = null;

      try {
        return await analyzeWithYtdlp(url, 'web-page', classification.sourceProvider, sourceUrlRedacted);
      } catch (err) {
        ytdlpError = err instanceof AppError ? err : new AppError('INTERNAL_ERROR', err instanceof Error ? err.message : String(err), 500);
      }

      // yt-dlp failed — try HTML analysis for simple pages with direct video elements
      const pageResult = await analyzeWebPage(url);
      const videoVariants = pageResult.sources
        .filter((s) => s.kind === 'direct')
        .map(mediaSourceToVideoFormat);

      if (videoVariants.length > 0) {
        // HTML found direct sources; return them (ignore auth/DRM heuristics)
        return {
          sourceKind: 'web-page',
          sourceProvider: classification.sourceProvider,
          sourceUrlRedacted,
          ssrfBlocked: false,
          isPubliclyAccessible: true,
          requiresAuthentication: false,
          drmDetected: false,
          extractorAvailable: true,
          analysisStatus: 'partial',
          videoVariants,
          audioVariants: [],
          limitationMessages: pageResult.limitationMessage ? [pageResult.limitationMessage] : [],
          alternativeMessage: null,
        };
      }

      // Both failed — propagate the classified yt-dlp error
      return {
        sourceKind: 'web-page',
        sourceProvider: classification.sourceProvider,
        sourceUrlRedacted,
        ssrfBlocked: false,
        isPubliclyAccessible: false,
        requiresAuthentication: false,
        drmDetected: false,
        extractorAvailable: false,
        analysisStatus: 'failed',
        videoVariants: [],
        audioVariants: [],
        limitationMessages: [ytdlpError.message],
        alternativeMessage: null,
        classifiedError: {
          code: ytdlpError.code,
          message: ytdlpError.message,
          status: ytdlpError.status ?? 500,
        },
      };
    }

    case 'unsupported-or-protected':
    default: {
      // Try yt-dlp anyway — it supports many sites that look "unsupported"
      // by extension/content-type alone (Vimeo, Twitter, TikTok, etc.)
      try {
        return await analyzeWithYtdlp(url, 'unsupported-or-protected', null, sourceUrlRedacted);
      } catch (err) {
        const appErr = err instanceof AppError ? err : new AppError('INTERNAL_ERROR', err instanceof Error ? err.message : String(err), 500);
        return {
          sourceKind: 'unsupported-or-protected',
          sourceProvider: null,
          sourceUrlRedacted,
          ssrfBlocked: false,
          isPubliclyAccessible: false,
          requiresAuthentication: false,
          drmDetected: false,
          extractorAvailable: false,
          analysisStatus: 'failed',
          videoVariants: [],
          audioVariants: [],
          limitationMessages: [appErr.message],
          alternativeMessage: null,
          classifiedError: {
            code: appErr.code,
            message: appErr.message,
            status: appErr.status ?? 500,
          },
        };
      }
    }
  }
}
