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
};

export function classifyYtdlpFailure(stderr: string, exitCode: number | null): YtdlpErrorCategory {
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
