const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const ID_PATH_PREFIXES = new Set(["live", "shorts", "embed"]);

/**
 * Returns the canonical `watch?v=` URL for an accepted YouTube link, or null.
 * Accepts only https, a fixed host allow-list, no credentials/port, and one of:
 * `/watch?v=<id>`, `/live/<id>`, `/shorts/<id>`, `/embed/<id>`, `youtu.be/<id>`.
 */
export function normalizeYoutubeInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (host === "youtu.be") {
    if (segments.length === 1) id = segments[0];
  } else if (segments.length === 1 && segments[0] === "watch") {
    id = url.searchParams.get("v");
  } else if (segments.length === 2 && ID_PATH_PREFIXES.has(segments[0])) {
    id = segments[1];
  }
  if (!id || !VIDEO_ID.test(id)) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}

export type YoutubeErrorCode =
  | "YOUTUBE_ANONYMOUS_ACCESS_BLOCKED"
  | "YOUTUBE_UNAVAILABLE"
  | "YOUTUBE_TIMEOUT"
  | "YOUTUBE_FILE_TOO_LARGE"
  | "YOUTUBE_EXTRACTION_FAILED";

export const YOUTUBE_ERROR_MESSAGES: Record<YoutubeErrorCode, string> = {
  YOUTUBE_ANONYMOUS_ACCESS_BLOCKED:
    "YouTube no permitió el acceso anónimo desde el servicio remoto (bloqueo anti-bot, verificación o token requerido). El servicio no usa cookies de usuario; este vídeo puede no estar disponible por esta vía.",
  YOUTUBE_UNAVAILABLE:
    "El vídeo no está disponible para el servicio remoto (privado, eliminado, con restricción de edad o de región).",
  YOUTUBE_TIMEOUT: "La conversión superó el tiempo máximo permitido y se canceló.",
  YOUTUBE_FILE_TOO_LARGE: "El archivo resultante supera el tamaño máximo permitido por el servicio.",
  YOUTUBE_EXTRACTION_FAILED: "No se pudo obtener el vídeo desde YouTube.",
};

export function isYoutubeErrorCode(value: unknown): value is YoutubeErrorCode {
  return typeof value === "string" && value in YOUTUBE_ERROR_MESSAGES;
}

/** Classifies yt-dlp failures from stderr/timeouts; never inspects or requests cookies. */
export function classifyYoutubeFailure(stderr: string, timedOut: boolean): YoutubeErrorCode {
  if (timedOut) return "YOUTUBE_TIMEOUT";
  const text = stderr.toLowerCase();
  if (text.includes("larger than max-filesize") || text.includes("max-filesize")) return "YOUTUBE_FILE_TOO_LARGE";
  if (/sign in to confirm|not a bot|po token|http error 403|http error 429|too many requests/.test(text)) {
    return "YOUTUBE_ANONYMOUS_ACCESS_BLOCKED";
  }
  if (/private video|video unavailable|has been removed|not available in your country|age-restricted|members-only|this live event|premieres in/.test(text)) {
    return "YOUTUBE_UNAVAILABLE";
  }
  return "YOUTUBE_EXTRACTION_FAILED";
}
