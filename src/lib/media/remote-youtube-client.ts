import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const JOB_ID = /^yt_[0-9a-f-]{36}$/i;

function config() {
  const base = process.env.ANCLORA_FILESTUDIO_REMOTE_API_URL?.replace(/\/$/, "");
  const token = process.env.ANCLORA_FILESTUDIO_REMOTE_API_TOKEN;
  if (!base || !token) throw new Error("REMOTE_YOUTUBE_NOT_CONFIGURED");
  if (new URL(base).protocol !== "https:") throw new Error("REMOTE_YOUTUBE_HTTPS_REQUIRED");
  return { base, token };
}

export async function remoteYoutubeApi(path: string, init: RequestInit = {}) {
  if (!/^v1\/youtube\/(metadata|jobs|jobs\/yt_[0-9a-f-]{36})$/i.test(path)) throw new Error("REMOTE_YOUTUBE_INVALID_PATH");
  const { base, token } = config();
  return fetch(`${base}/${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });
}

export async function remoteYoutubeJob(jobId: string, method: "GET" | "DELETE" = "GET") {
  if (!JOB_ID.test(jobId)) throw new Error("REMOTE_YOUTUBE_INVALID_JOB");
  return remoteYoutubeApi(`v1/youtube/jobs/${jobId}`, { method });
}

export function remoteYoutubeEnabled() {
  return Boolean(process.env.ANCLORA_FILESTUDIO_REMOTE_API_URL && process.env.ANCLORA_FILESTUDIO_REMOTE_API_TOKEN);
}

export async function remoteYoutubeFile(jobId: string) {
  if (!JOB_ID.test(jobId)) throw new Error("REMOTE_YOUTUBE_INVALID_JOB");
  const base = process.env.ANCLORA_FILESTUDIO_YOUTUBE_WORKER_URL?.replace(/\/$/, "");
  const token = process.env.ANCLORA_FILESTUDIO_YOUTUBE_WORKER_TOKEN;
  if (!base || !token) throw new Error("REMOTE_YOUTUBE_DOWNLOAD_NOT_CONFIGURED");
  if (new URL(base).protocol !== "https:") throw new Error("REMOTE_YOUTUBE_HTTPS_REQUIRED");
  return fetch(`${base}/v1/youtube/jobs/${jobId}/file`, {
    headers: { authorization: `Bearer ${token}` }, cache: "no-store",
  });
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
