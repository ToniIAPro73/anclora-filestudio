import fs from "fs";
import path from "path";
import { CONFIG } from "../config";
import type { ERROR_CODES } from "../errors";

// ---------------------------------------------------------------------------
// Stderr classification — maps raw yt-dlp output to user-safe error info.
// Shared by the metadata (analyze) path and the download/conversion path so
// both surface the same specific, non-misleading message instead of a
// generic fallback.
// ---------------------------------------------------------------------------

export type YtdlpErrorCategory = {
  code: keyof typeof ERROR_CODES;
  message: string;
  /**
   * True ONLY for per-format CDN delivery failures that a DIFFERENT source
   * representation can bypass (e.g. YouTube HTTP 403 mid-download of one
   * specific format while other representations still work — the real-world
   * H.264/MP4-403 but VP9/WebM-OK case this pipeline recovery addresses).
   *
   * Always false for login-required, age/geo restricted, private, removed,
   * bot-check, rate-limit, network and generic access-denied errors — those
   * must never trigger pointless codec/format fallback attempts.
   */
  recoverable: boolean;
};

function isYoutubeContext(s: string): boolean {
  return (
    s.includes("[youtube]") ||
    s.includes("youtube.com") ||
    s.includes("youtu.be") ||
    s.includes("www.youtube")
  );
}

export type YtdlpFailureContext = "metadata" | "download";

/**
 * A YouTube 403 is only a *delivery* failure (recoverable via an
 * alternative representation) when it happens DURING DOWNLOAD, after
 * metadata/formats resolved successfully. In the metadata phase the same
 * HTTP 403 means the webpage/API hop was refused — no format was ever
 * listed, so no alternative representation exists to fall back to.
 * The context is passed explicitly by the caller for this reason.
 */
function isFormatDelivery403(s: string, context: YtdlpFailureContext): boolean {
  if (!s.includes("403")) return false;
  if (!isYoutubeContext(s)) return false;
  if (context === "metadata") return false;
  // Extraction/webpage hops in a download run are NOT per-format delivery
  // failures either.
  if (
    s.includes("unable to download webpage") ||
    s.includes("unable to download api page") ||
    s.includes("unable to download player")
  ) {
    return false;
  }
  return true;
}

export function classifyYtdlpFailure(
  stderr: string,
  exitCode: number | null,
  context: YtdlpFailureContext = "download"
): YtdlpErrorCategory {
  // Null exit code means the process was killed (timeout or signal)
  if (exitCode === null) {
    return {
      code: "CONVERSION_TIMEOUT",
      message: "El análisis del vídeo tardó demasiado tiempo. Inténtalo de nuevo.",
      recoverable: false,
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
    return { code: "VIDEO_UNAVAILABLE", message: "El vídeo no está disponible, ha sido eliminado o la URL no existe.", recoverable: false };
  }

  // Cookies rotated/invalidated by YouTube (Google security measure) — a
  // DIFFERENT actionable cause than a generic bot-check: the fix is to
  // re-export a fresh cookies.txt, not just retry.
  if (
    s.includes("cookies are no longer valid") ||
    s.includes("cookies have been rotated") ||
    (s.includes("cookies") && s.includes("rotated"))
  ) {
    return {
      code: "YOUTUBE_BOT_VERIFICATION",
      message:
        "Las cookies de YouTube proporcionadas ya no son válidas (la sesión se ha rotado como medida de seguridad). Exporta un cookies.txt nuevo desde el navegador y súbelo de nuevo.",
      recoverable: false,
    };
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
      recoverable: false,
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
      recoverable: false,
    };
  }

  // YouTube login-gated content — distinct from a bot-check and from a
  // generic restriction. Trying alternative codecs/formats is pointless
  // here: no representation will download without an authorized session.
  if (
    s.includes("sign in to confirm your age") ||
    s.includes("sign in to continue") ||
    s.includes("log in to watch") ||
    s.includes("login required") ||
    s.includes("requires login") ||
    s.includes("requires authentication") ||
    s.includes("must log in") ||
    s.includes("must be logged in") ||
    s.includes("you need to sign in") ||
    s.includes("private video") ||
    s.includes("video is private") ||
    (s.includes("sign in") && s.includes("age"))
  ) {
    return {
      code: "YOUTUBE_LOGIN_REQUIRED",
      message:
        "El vídeo requiere iniciar sesión en YouTube para verse (contenido privado, restringido por edad o con acceso limitado). No se puede descargar sin una cuenta autorizada.",
      recoverable: false,
    };
  }

  // YouTube HTTP 403 DURING download of a concrete format — recoverable:
  // metadata/formats resolved fine, the CDN refused this representation,
  // an alternative codec/container (e.g. VP9/WebM instead of H.264/MP4)
  // may still download. The processor retries with the next candidate.
  if (isFormatDelivery403(s, context)) {
    return {
      code: "YOUTUBE_FORMAT_DELIVERY_403",
      message:
        "YouTube ha denegado la entrega de una representación concreta del vídeo (HTTP 403 en el CDN). Se reintenta automáticamente con una representación alternativa.",
      recoverable: true,
    };
  }

  // YouTube HTTP 403 outside a per-format delivery context (extraction,
  // webpage, generic API hop) — NOT recoverable via codec fallback.
  if (s.includes("403") && isYoutubeContext(s)) {
    return {
      code: "YOUTUBE_GENERIC_ACCESS_DENIED",
      message:
        "YouTube ha denegado el acceso (HTTP 403). Puede ser temporal o requerir configuración adicional.",
      recoverable: false,
    };
  }

  // Generic HTTP 403 / access denied without a specific bot-check or
  // Cloudflare signal — do not over-claim the cause.
  if (s.includes("access denied") || s.includes("403")) {
    return {
      code: "PROVIDER_ACCESS_DENIED",
      message:
        "El proveedor ha denegado el acceso (HTTP 403). Puede ser temporal o requerir configuración adicional.",
      recoverable: false,
    };
  }

  // Age restriction / authenticated-only / subscription content
  if (
    s.includes("age-restricted") ||
    s.includes("age restricted") ||
    s.includes("members only") ||
    s.includes("members-only") ||
    s.includes("premium") ||
    s.includes("subscription required")
  ) {
    return {
      code: "CONTENT_RESTRICTED",
      message:
        "El contenido requiere inicio de sesión, cuenta premium o tiene restricción de edad. El acceso autenticado no está soportado.",
      recoverable: false,
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
      recoverable: false,
    };
  }

  // Rate limiting
  if (s.includes("429") || s.includes("too many requests") || s.includes("rate limit")) {
    return {
      code: "RATE_LIMITED",
      message: "El proveedor está limitando las peticiones. Espera unos minutos e inténtalo de nuevo.",
      recoverable: false,
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
      recoverable: false,
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
      recoverable: false,
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
      recoverable: false,
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
      recoverable: false,
    };
  }

  // Generic catch-all
  return {
    code: "CONTENT_RESTRICTED",
    message: "No se pudo obtener información del vídeo. El sitio puede requerir inicio de sesión, tener protección anti-bot, o el contenido puede no estar disponible públicamente.",
    recoverable: false,
  };
}

// ---------------------------------------------------------------------------
// Sanitize stderr for log writing — strip tokens and limit length
// ---------------------------------------------------------------------------

export function sanitizeStderr(raw: string): string {
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
// Write structured entry to logs/ytdlp-errors.log (non-fatal, shared by
// every yt-dlp call site — analyze and download/conversion alike).
// ---------------------------------------------------------------------------

export function appendYtdlpErrorLog(entry: {
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