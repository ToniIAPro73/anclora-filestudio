import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { CONFIG } from "../config";
import { AppError, ERROR_CODES, ERROR_MESSAGES } from "../errors";
import { MetadataResponse } from "../youtube/schemas";
import { getYtdlpCommonArgs } from "./command-builder";

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
// Stderr classification — maps raw yt-dlp output to user-safe error info
// ---------------------------------------------------------------------------

type YtdlpErrorCategory = {
  code: keyof typeof ERROR_CODES;
  message: string;
};

function classifyYtdlpFailure(stderr: string, exitCode: number | null): YtdlpErrorCategory {
  // Null exit code means the process was killed (timeout or signal)
  if (exitCode === null) {
    return {
      code: "CONVERSION_TIMEOUT",
      message: "El análisis del vídeo tardó demasiado tiempo. Inténtalo de nuevo.",
    };
  }

  const s = stderr.toLowerCase();

  // Video unavailable / deleted / not found
  if (
    s.includes("video unavailable") ||
    s.includes("this video is not available") ||
    s.includes("has been removed") ||
    s.includes("404") ||
    s.includes("not found")
  ) {
    return { code: "VIDEO_UNAVAILABLE", message: "El vídeo no está disponible, ha sido eliminado o la URL no existe." };
  }

  // YouTube's own bot-check wording — BEFORE generic "sign in" to give a
  // specific error. This is a PROVIDER-SIDE challenge from Google/YouTube
  // itself, NOT Cloudflare — there is no Cloudflare evidence in this phrasing.
  if (
    s.includes("not a bot") ||
    s.includes("confirm you're not") ||
    s.includes("confirm you’re not") // curly apostrophe — YouTube's actual stderr text
  ) {
    return {
      code: "YOUTUBE_BOT_VERIFICATION",
      message:
        "YouTube ha rechazado el análisis automático de este vídeo (verificación anti-bot). El vídeo puede seguir funcionando desde el portable local o en otra red.",
    };
  }

  // Explicit Cloudflare / CAPTCHA challenge — only when the provider's own
  // response literally names it. Do NOT infer Cloudflare from a bare 403.
  if (
    s.includes("cloudflare") ||
    s.includes("captcha") ||
    s.includes("i'm not a robot") ||
    s.includes("are you a robot")
  ) {
    return {
      code: "PROVIDER_VERIFICATION",
      message:
        "El proveedor exige verificación de seguridad (Cloudflare o captcha) para acceder automáticamente. Este sitio puede no ser compatible.",
    };
  }

  // Generic HTTP 403 / access denied without a specific bot-check or
  // Cloudflare signal — do not over-claim the cause.
  if (s.includes("access denied") || s.includes("403")) {
    return {
      code: "PROVIDER_ACCESS_DENIED",
      message:
        "El proveedor ha denegado el acceso (HTTP 403). Puede ser temporal o requerir configuración adicional.",
    };
  }

  // Age restriction / authenticated-only / subscription content
  if (
    s.includes("confirm your age") ||
    s.includes("age-restricted") ||
    s.includes("age restricted") ||
    s.includes("requires authentication") ||
    s.includes("sign in") ||
    s.includes("login required") ||
    s.includes("members only") ||
    s.includes("members-only") ||
    s.includes("premium") ||
    s.includes("subscription required") ||
    s.includes("private video") ||
    s.includes("log in")
  ) {
    return {
      code: "CONTENT_RESTRICTED",
      message:
        "El contenido requiere inicio de sesión, cuenta premium o tiene restricción de edad. El acceso autenticado no está soportado.",
    };
  }

  // Geographic restriction
  if (
    s.includes("geo") ||
    s.includes("not available in your country") ||
    s.includes("not available in your region") ||
    s.includes("region") && s.includes("blocked") ||
    s.includes("country") && s.includes("not available")
  ) {
    return {
      code: "CONTENT_RESTRICTED",
      message: "El vídeo no está disponible en tu región o país.",
    };
  }

  // Rate limiting
  if (s.includes("429") || s.includes("too many requests") || s.includes("rate limit")) {
    return {
      code: "RATE_LIMITED",
      message: "El proveedor está limitando las peticiones. Espera unos minutos e inténtalo de nuevo.",
    };
  }

  // General extraction failure (site-specific extractor failed)
  if (
    s.includes("unable to extract") ||
    s.includes("could not find") ||
    s.includes("no video formats") ||
    s.includes("no suitable format") ||
    s.includes("unsupported url")
  ) {
    return {
      code: "CONTENT_RESTRICTED",
      message:
        "No se pudo extraer el vídeo de este sitio. Puede que el sitio no sea compatible, requiera autenticación o haya cambiado su estructura.",
    };
  }

  // yt-dlp outdated
  if (
    s.includes("outdated") ||
    s.includes("please update") ||
    (s.includes("update") && s.includes("yt-dlp"))
  ) {
    return {
      code: "INTERNAL_ERROR",
      message: "La versión de yt-dlp incluida necesita actualización. Descarga el portable más reciente.",
    };
  }

  // SSL certificate failure
  if (
    s.includes("ssl") ||
    s.includes("certificate_verify_failed") ||
    s.includes("certificate verify failed") ||
    s.includes("certificate error")
  ) {
    return {
      code: "INTERNAL_ERROR",
      message:
        "Error de certificado SSL al conectar con YouTube. Comprueba la configuración de red o proxy.",
    };
  }

  // Network / connection errors
  if (
    s.includes("network") ||
    s.includes("urlopen error") ||
    s.includes("name or service not known") ||
    s.includes("connection refused") ||
    s.includes("no route to host") ||
    s.includes("errno 11001") ||  // Windows DNS resolution failure
    s.includes("getaddrinfo failed")
  ) {
    return {
      code: "INTERNAL_ERROR",
      message: "Error de red al analizar el vídeo. Comprueba la conexión a Internet.",
    };
  }

  // Generic catch-all
  return {
    code: "CONTENT_RESTRICTED",
    message: "No se pudo obtener información del vídeo. El sitio puede requerir inicio de sesión, tener protección anti-bot, o el contenido puede no estar disponible públicamente.",
  };
}

// ---------------------------------------------------------------------------
// Sanitize stderr for log writing — strip tokens and limit length
// ---------------------------------------------------------------------------

function sanitizeStderr(raw: string): string {
  return raw
    .replace(/https?:\/\/[^\s"')]+/g, (url) => {
      try {
        const u = new URL(url);
        u.search = u.search ? "?[params-redacted]" : "";
        return u.toString();
      } catch {
        return "[url]";
      }
    })
    .slice(0, 3000);
}

// ---------------------------------------------------------------------------
// Write structured entry to logs/ytdlp-errors.log (non-fatal)
// ---------------------------------------------------------------------------

function appendYtdlpErrorLog(entry: {
  ts: string;
  cmd: string;
  exitCode: number | null;
  stderr: string;
}): void {
  try {
    fs.mkdirSync(CONFIG.media.logsDir, { recursive: true });
    const logFile = path.join(CONFIG.media.logsDir, "ytdlp-errors.log");
    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // Non-fatal: log failure must not block the error flow
  }
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

export async function getVideoMetadata(url: string): Promise<MetadataResponse> {
  const ytdlpBin = CONFIG.media.binaries.ytdlp;

  // Early validation — catch missing binary before spawning
  validateBinaryPath(ytdlpBin);

  return new Promise((resolve, reject) => {
    const args = [
      ...getYtdlpCommonArgs(),
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
