import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { CONFIG } from "../config";
import { AppError, ERROR_CODES, ERROR_MESSAGES } from "../errors";
import { MetadataResponse } from "../youtube/schemas";
import { getYtdlpCommonArgs } from "./command-builder";
import { classifyYtdlpFailure, sanitizeStderr, appendYtdlpErrorLog } from "./ytdlp-stderr-classifier";
import { withCookiesFallback, cookiesFileHasDomainFor } from "./ytdlp-cookies-retry";

export interface VideoFormat {
  formatId: string;
  protocol?: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  ext: string;
  vcodec: string | null;
  acodec: string | null;
  isVideoOnly: boolean;
  isAudioOnly?: boolean;
  fileSizeBytes: number | null;
  fileSizeApproxBytes: number | null;
  tbr: number | null;
  vbr?: number | null;
  abr?: number | null;
}

export interface AudioFormatVariant {
  formatId: string;
  protocol?: string | null;
  ext: string;
  acodec: string | null;
  abr: number | null;
  sampleRate: number | null;
  channels: number | null;
  fileSizeBytes: number | null;
  fileSizeApproxBytes: number | null;
  tbr: number | null;
  hasAudio: boolean;
}

interface YtdlpFormat {
  format_id?: string;
  protocol?: string;
  vcodec?: string;
  acodec?: string;
  height?: number;
  width?: number;
  fps?: number;
  ext?: string;
  filesize?: number;
  filesize_approx?: number;
  tbr?: number;
  vbr?: number;
  abr?: number;
  asr?: number;
  audio_channels?: number;
}

// ---------------------------------------------------------------------------
// Validate that the configured binary path looks usable
// ---------------------------------------------------------------------------

function validateBinaryPath(binPath: string): void {
  // If the configured path is just a bare command name (e.g. "yt-dlp"),
  // we depend on PATH. That's acceptable in dev but emit a warning in production.
  if (!path.isAbsolute(binPath)) {
    console.warn(
      `[metadata] yt-dlp binary is not an absolute path: "${binPath}". ` +
      `Set ANCLORA_FILESTUDIO_YTDLP_PATH to the bundled binary path in portable mode.`
    );
    return;
  }
  // In production portable mode, verify the file actually exists
  if (!fs.existsSync(binPath)) {
    throw new AppError(
      ERROR_CODES.DEPENDENCY_MISSING,
      ERROR_MESSAGES.DEPENDENCY_MISSING,
      500
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Tries anonymous first, falls back to cookies only on failure (see
 * ytdlp-cookies-retry.ts — a stale cookie can break videos that would
 * otherwise work fine without it). When the anonymous attempt fails with a
 * bot-check-shaped error and no cookies are configured at all, appends a
 * hint that uploading cookies (Diagnostics panel) may unblock it.
 */
export async function getVideoMetadata(url: string): Promise<MetadataResponse> {
  const cookiesPath = CONFIG.media.binaries.ytdlpCookiesPath;
  const cookiesConfigured = Boolean(cookiesPath) && cookiesFileHasDomainFor(cookiesPath, url);
  try {
    const { result } = await withCookiesFallback(
      (useCookies) => attemptGetVideoMetadata(url, useCookies),
      cookiesConfigured
    );
    return result;
  } catch (err) {
    if (
      !cookiesConfigured &&
      err instanceof AppError &&
      err.code === "YOUTUBE_BOT_VERIFICATION"
    ) {
      throw new AppError(
        err.code,
        `${err.message} Puedes subir un archivo de cookies (panel Diagnóstico) y volver a intentarlo.`,
        err.status,
        err.technicalDetail
      );
    }
    throw err;
  }
}

function attemptGetVideoMetadata(url: string, useCookies: boolean): Promise<MetadataResponse> {
  const ytdlpBin = CONFIG.media.binaries.ytdlp;

  // Early validation — catch missing binary before spawning
  validateBinaryPath(ytdlpBin);

  return new Promise((resolve, reject) => {
    const args = [
      ...getYtdlpCommonArgs(useCookies),
      "--dump-single-json",
      "--skip-download",
      "--no-playlist",
      "--socket-timeout",
      "20",
      url,
    ];

    // Build a clean environment: inherit parent env but remove Python/curl SSL
    // overrides that may be inherited from system config or antivirus proxies.
    // If those vars point to invalid/missing paths, Python (yt-dlp) fails with
    // CERTIFICATE_VERIFY_FAILED even though the network is fine.
    // We do NOT set PYTHONHTTPSVERIFY=0 — that would disable verification.
    // Clearing invalid overrides restores Python's default certifi verification.
    const spawnEnv: NodeJS.ProcessEnv = { ...process.env };
    const SSL_ENV_OVERRIDES = [
      "PYTHONHTTPSVERIFY",   // =0 disables SSL; if set to garbage, confuses yt-dlp
      "REQUESTS_CA_BUNDLE",  // if invalid path → SSL fail in Python requests
      "SSL_CERT_FILE",       // if invalid path → SSL fail in Python ssl module
      "CURL_CA_BUNDLE",      // if invalid path → SSL fail in curl-based yt-dlp transports
    ] as const;
    for (const key of SSL_ENV_OVERRIDES) {
      delete spawnEnv[key];
    }

    const proc = spawn(ytdlpBin, args, {
      shell: false,
      windowsHide: true,
      timeout: CONFIG.media.limits.metadataTimeoutSeconds * 1000,
      env: spawnEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        const sanitized = sanitizeStderr(stderr);
        const category = classifyYtdlpFailure(stderr, code);

        // Always log yt-dlp failures with command info and sanitized stderr
        console.error(
          `[metadata] yt-dlp exited (code=${code ?? "killed"}) cmd="${ytdlpBin} ${args.join(" ")}"`,
          sanitized
        );
        appendYtdlpErrorLog({
          ts: new Date().toISOString(),
          cmd: `${path.basename(ytdlpBin)} ${args.join(" ")}`,
          exitCode: code,
          stderr: sanitized,
        });

        return reject(new AppError(ERROR_CODES[category.code], category.message, 500));
      }

      try {
        const data = JSON.parse(stdout);

        const durationSeconds = data.duration || 0;
        if (durationSeconds > CONFIG.media.limits.maxDurationSeconds) {
          return reject(
            new AppError(
              ERROR_CODES.DURATION_LIMIT_EXCEEDED,
              "El vídeo excede la duración máxima permitida."
            )
          );
        }

        const formats = (data.formats || []) as YtdlpFormat[];
        const availableHeights = Array.from(
          new Set(
            formats
              .filter((f) => f.vcodec !== "none" && f.height)
              .map((f) => f.height as number)
          )
        ).sort((a, b) => b - a);

        const videoFormats: VideoFormat[] = formats
          .filter((f) => f.vcodec !== "none" && f.height && f.height > 0)
          .map((f) => ({
            formatId: f.format_id ?? "",
            protocol: f.protocol ?? null,
            width: f.width ?? null,
            height: f.height ?? null,
            fps: f.fps ?? null,
            ext: f.ext ?? "",
            vcodec: f.vcodec ?? null,
            acodec: f.acodec && f.acodec !== "none" ? f.acodec : null,
            isVideoOnly: f.acodec === "none",
            isAudioOnly: false,
            fileSizeBytes: f.filesize ?? null,
            fileSizeApproxBytes: f.filesize_approx ?? null,
            tbr: f.tbr ?? null,
            vbr: f.vbr ?? null,
            abr: f.abr ?? null,
          }));

        const audioFormats: AudioFormatVariant[] = formats
          .filter((f) => (!f.vcodec || f.vcodec === "none") && f.acodec && f.acodec !== "none")
          .map((f) => ({
            formatId: f.format_id ?? "",
            protocol: f.protocol ?? null,
            ext: f.ext ?? "",
            acodec: f.acodec ?? null,
            abr: f.abr ?? f.tbr ?? null,
            sampleRate: f.asr ?? null,
            channels: f.audio_channels ?? null,
            fileSizeBytes: f.filesize ?? null,
            fileSizeApproxBytes: f.filesize_approx ?? null,
            tbr: f.tbr ?? null,
            hasAudio: true,
          }));

        resolve({
          videoId: data.id,
          title: data.title,
          channel: data.uploader || data.channel,
          thumbnailUrl: data.thumbnail,
          durationSeconds: durationSeconds,
          durationLabel: formatDuration(durationSeconds),
          availableHeights,
          supported: true,
          videoFormats,
          audioFormats,
        });
      } catch {
        reject(
          new AppError(
            ERROR_CODES.INTERNAL_ERROR,
            "Error al procesar la respuesta de metadatos."
          )
        );
      }
    });

    proc.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        console.error(`[metadata] yt-dlp binary not found: "${ytdlpBin}"`);
        appendYtdlpErrorLog({
          ts: new Date().toISOString(),
          cmd: ytdlpBin,
          exitCode: null,
          stderr: `ENOENT: binary not found at "${ytdlpBin}"`,
        });
        reject(
          new AppError(
            ERROR_CODES.DEPENDENCY_MISSING,
            ERROR_MESSAGES.DEPENDENCY_MISSING,
            500
          )
        );
      } else {
        console.error(`[metadata] yt-dlp spawn error:`, err);
        appendYtdlpErrorLog({
          ts: new Date().toISOString(),
          cmd: ytdlpBin,
          exitCode: null,
          stderr: `spawn error: ${err.code ?? err.message}`,
        });
        reject(
          new AppError(ERROR_CODES.INTERNAL_ERROR, "Error al ejecutar yt-dlp.", 500)
        );
      }
    });
  });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s]
    .map((v) => v.toString().padStart(2, "0"))
    .filter((v, i) => v !== "00" || i > 0)
    .join(":");
}
