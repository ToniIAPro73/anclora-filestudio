import { createHmac, timingSafeEqual } from "node:crypto";

const JOB_ID = /^yt_[0-9a-f-]{36}$/i;

function config() {
  const base = process.env.ANCLORA_FILESTUDIO_REMOTE_API_URL?.replace(/\/$/, "");
  const token = process.env.ANCLORA_FILESTUDIO_REMOTE_API_TOKEN;
  if (!base || !token) throw new Error("REMOTE_YOUTUBE_NOT_CONFIGURED");
  if (new URL(base).protocol !== "https:") throw new Error("REMOTE_YOUTUBE_HTTPS_REQUIRED");
  return { base, token };
}

function remoteError(status: number, code: string, error: string) {
  return Response.json({ error, code }, { status, headers: { "cache-control": "no-store" } });
}

/** Network/config failures resolve to a JSON error Response so callers surface a useful code. */
export async function remoteYoutubeApi(path: string, init: RequestInit = {}) {
  if (!/^v1\/youtube\/(metadata|jobs|jobs\/yt_[0-9a-f-]{36})$/i.test(path)) throw new Error("REMOTE_YOUTUBE_INVALID_PATH");
  let settings: ReturnType<typeof config>;
  try { settings = config(); } catch (error) {
    return error instanceof Error && error.message === "REMOTE_YOUTUBE_HTTPS_REQUIRED"
      ? remoteError(503, "REMOTE_YOUTUBE_HTTPS_REQUIRED", "La URL del servicio remoto de YouTube debe ser HTTPS.")
      : remoteError(503, "REMOTE_YOUTUBE_NOT_CONFIGURED", "El servicio remoto de YouTube no está configurado.");
  }
  try {
    return await fetch(`${settings.base}/${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), authorization: `Bearer ${settings.token}`, ...(init.body ? { "content-type": "application/json" } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    return error instanceof Error && error.name === "TimeoutError"
      ? remoteError(504, "REMOTE_WORKER_TIMEOUT", "El servicio remoto de YouTube no respondió a tiempo.")
      : remoteError(502, "REMOTE_WORKER_UNAVAILABLE", "No se pudo contactar con el servicio remoto de YouTube.");
  }
}

export async function remoteYoutubeJob(jobId: string, method: "GET" | "DELETE" = "GET") {
  if (!JOB_ID.test(jobId)) throw new Error("REMOTE_YOUTUBE_INVALID_JOB");
  return remoteYoutubeApi(`v1/youtube/jobs/${jobId}`, { method });
}

export function remoteYoutubeEnabled() {
  return Boolean(process.env.ANCLORA_FILESTUDIO_REMOTE_API_URL && process.env.ANCLORA_FILESTUDIO_REMOTE_API_TOKEN);
}

export async function remoteYoutubeFile(jobId: string, signal?: AbortSignal) {
  if (!JOB_ID.test(jobId)) throw new Error("REMOTE_YOUTUBE_INVALID_JOB");
  const base = process.env.ANCLORA_FILESTUDIO_YOUTUBE_WORKER_URL?.replace(/\/$/, "");
  const token = process.env.ANCLORA_FILESTUDIO_YOUTUBE_WORKER_TOKEN;
  if (!base || !token) return remoteError(503, "REMOTE_YOUTUBE_DOWNLOAD_NOT_CONFIGURED", "La descarga directa desde el worker remoto no está configurada.");
  let protocol = "";
  try { protocol = new URL(base).protocol; } catch { /* invalid URL handled below */ }
  if (protocol !== "https:") return remoteError(503, "REMOTE_YOUTUBE_HTTPS_REQUIRED", "La URL del worker remoto debe ser HTTPS.");
  try {
    return await fetch(`${base}/v1/youtube/jobs/${jobId}/file`, {
      headers: { authorization: `Bearer ${token}` }, cache: "no-store", signal,
    });
  } catch {
    return remoteError(502, "REMOTE_WORKER_UNAVAILABLE", "No se pudo contactar con el worker remoto.");
  }
}

export function createRemoteDownloadToken(jobId: string) {
  const { token } = config();
  const expires = Math.floor(Date.now() / 1000) + 15 * 60;
  const signature = createHmac("sha256", token).update(`youtube-download:${jobId}:${expires}`).digest("hex");
  return `${expires}.${signature}`;
}

export function verifyRemoteDownloadToken(jobId: string, value: string | null) {
  if (!value || !JOB_ID.test(jobId)) return false;
  const [expiresText, signature] = value.split(".");
  const expires = Number(expiresText);
  if (!Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000) || expires > Math.floor(Date.now() / 1000) + 16 * 60 || !/^[a-f0-9]{64}$/.test(signature ?? "")) return false;
  try {
    const { token } = config();
    const expected = createHmac("sha256", token).update(`youtube-download:${jobId}:${expires}`).digest();
    const supplied = Buffer.from(signature, "hex");
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  } catch { return false; }
}
