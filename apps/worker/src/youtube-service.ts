import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { execFile } from "node:child_process";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pipeline } from "node:stream";
import { Queue } from "bullmq";
import type { Sql } from "postgres";
import type { QueueJobPayload } from "@anclora/filestudio-core";
import {
  YOUTUBE_ERROR_MESSAGES,
  classifyYoutubeFailure,
  isYoutubeErrorCode,
  normalizeYoutubeInput,
} from "./youtube-url.js";

const MAX_RUNTIME_MS = 12 * 60 * 60 * 1000;
const METADATA_TIMEOUT_MS = 75_000;
const ARTIFACT_RETENTION_INTERVAL = "24 hours";
const MAX_ACTIVE_JOBS = 20;
const ACTIVE_STATUSES = ["queued", "downloading", "processing"];
const JOB_PATH = /^\/v1\/youtube\/jobs\/(yt_[0-9a-f-]{36})(?:\/(file))?$/i;

export const YOUTUBE_MEDIA_QUEUE_OPERATION = "youtube:convert";

export function startYoutubeService(input: {
  sql: Sql;
  queue: Queue<QueueJobPayload>;
  token: string;
  port: number;
  artifactRoot: string;
  cancelActive: (jobId: string) => void;
}) {
  const artifactRoot = resolve(input.artifactRoot);
  const cleanupTimer = setInterval(() => {
    void (async () => {
      const expired = await input.sql`DELETE FROM youtube_jobs WHERE status IN ('completed','failed','cancelled') AND updated_at < now() - ${ARTIFACT_RETENTION_INTERVAL}::interval RETURNING id`;
      for (const row of expired) await removeJobArtifacts(artifactRoot, String(row.id));
    })().catch((error) => console.error("[youtube-worker] artifact cleanup failed:", error instanceof Error ? error.message : "unknown"));
  }, 60 * 60 * 1000);
  cleanupTimer.unref();

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      if (req.method === "GET" && url.pathname === "/health") return sendJson(res, 200, { ok: true });
      if (!isAuthorized(req, input.token)) return sendJson(res, 401, { error: "UNAUTHORIZED" });

      if (url.pathname === "/v1/youtube/metadata") {
        if (req.method !== "POST") return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
        const body = await readJson(req) as { url?: unknown };
        const normalized = normalizeYoutubeInput(body?.url);
        if (!normalized) return sendJson(res, 400, { error: "INVALID_URL" });
        let metadata: Awaited<ReturnType<typeof runYtdlpJson>>;
        try {
          metadata = await runYtdlpJson(normalized);
        } catch (error) {
          const code = classifyYoutubeFailure(error instanceof YtdlpError ? error.stderr : "", error instanceof YtdlpError && error.timedOut);
          return sendJson(res, code === "YOUTUBE_TIMEOUT" ? 504 : 422, { error: YOUTUBE_ERROR_MESSAGES[code], code });
        }
        const formats = (metadata.formats ?? []).filter((f) => f.vcodec && f.vcodec !== "none" && Number.isInteger(f.height));
        const heights = [...new Set(formats.map((f) => f.height as number))].sort((a, b) => b - a);
        return sendJson(res, 200, {
          title: String(metadata.title ?? ""), channel: String(metadata.channel ?? metadata.uploader ?? ""),
          thumbnailUrl: typeof metadata.thumbnail === "string" ? metadata.thumbnail : null,
          normalizedUrl: normalized, durationSeconds: typeof metadata.duration === "number" ? metadata.duration : null,
          availableHeights: heights,
          videoFormats: formats.map((f) => ({ formatId: f.format_id ?? String(f.height), width: f.width ?? null, height: f.height ?? null, fps: f.fps ?? null, ext: f.ext ?? "mp4", vcodec: f.vcodec ?? null, acodec: f.acodec ?? null, isVideoOnly: f.acodec === "none", fileSizeBytes: f.filesize ?? null, fileSizeApproxBytes: f.filesize_approx ?? null })),
        });
      }

      if (url.pathname === "/v1/youtube/jobs") {
        if (req.method !== "POST") return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
        const body = await readJson(req);
        const parsed = validateJob(body);
        if (!parsed) return sendJson(res, 400, { error: "INVALID_REQUEST" });
        const [{ active }] = await input.sql`SELECT count(*)::int AS active FROM youtube_jobs WHERE status IN ${input.sql(ACTIVE_STATUSES)}`;
        if (Number(active) >= MAX_ACTIVE_JOBS) return sendJson(res, 429, { error: "El servicio remoto tiene demasiados trabajos activos. Inténtalo de nuevo más tarde.", code: "QUEUE_FULL" });
        const jobId = `yt_${randomUUID()}`;
        const outputPath = join(artifactRoot, `${jobId}.${parsed.format}`);
        await mkdir(artifactRoot, { recursive: true });
        await input.sql`INSERT INTO youtube_jobs (id, url, format, quality, status, output_path, created_at, updated_at)
          VALUES (${jobId}, ${parsed.url}, ${parsed.format}, ${parsed.quality}, 'queued', ${outputPath}, now(), now())`;
        const payload: QueueJobPayload = {
          jobId, operation: YOUTUBE_MEDIA_QUEUE_OPERATION, engineId: "ffmpeg-media",
          inputPath: parsed.url, outputPath,
          options: { format: parsed.format, quality: parsed.quality, timeoutMs: MAX_RUNTIME_MS },
          timeoutMs: MAX_RUNTIME_MS, clientId: "filestudio-desktop", workspaceId: "youtube-download",
        };
        await input.queue.add(YOUTUBE_MEDIA_QUEUE_OPERATION, payload, { jobId, attempts: 1, removeOnComplete: { age: 86400 }, removeOnFail: { age: 86400 } });
        return sendJson(res, 202, { jobId, status: "queued" });
      }

      const match = url.pathname.match(JOB_PATH);
      if (!match) return sendJson(res, 404, { error: "NOT_FOUND" });
      const [, jobId, file] = match;
      if (file && req.method !== "GET") return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
      const [job] = await input.sql`SELECT id, status, format, title, error_code, output_path, file_size_bytes FROM youtube_jobs WHERE id = ${jobId}`;
      if (!job) return sendJson(res, 404, { error: "JOB_NOT_FOUND" });

      if (file) {
        if (job.status !== "completed") return sendJson(res, 409, { error: "JOB_NOT_COMPLETED" });
        const artifact = resolve(String(job.output_path));
        const info = isInside(artifactRoot, artifact) ? await stat(artifact).catch(() => null) : null;
        if (!info?.isFile()) return sendJson(res, 410, { error: "El archivo ya no está disponible en el servicio remoto.", code: "ARTIFACT_EXPIRED" });
        res.writeHead(200, {
          "content-type": job.format === "mp3" ? "audio/mpeg" : "video/mp4",
          "content-disposition": `attachment; filename="${jobId}.${job.format}"`,
          "content-length": String(info.size),
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        });
        pipeline(createReadStream(artifact), res, () => undefined);
        return;
      }

      if (req.method === "GET") {
        const code = isYoutubeErrorCode(job.error_code) ? job.error_code : job.error_code ? "YOUTUBE_EXTRACTION_FAILED" : null;
        return sendJson(res, 200, {
          jobId: job.id, status: job.status, stage: job.status, progress: job.status === "completed" ? 100 : job.status === "queued" ? 0 : null, outputFormat: job.format,
          title: job.title, error: code ? YOUTUBE_ERROR_MESSAGES[code] : null, errorCode: code,
          downloadAvailable: job.status === "completed",
          file: job.status === "completed" ? { name: `${jobId}.${job.format}`, format: job.format, sizeBytes: Number(job.file_size_bytes) } : undefined,
        });
      }
      if (req.method === "DELETE") {
        if (ACTIVE_STATUSES.includes(String(job.status))) {
          await input.sql`UPDATE youtube_jobs SET status = 'cancelled', updated_at = now() WHERE id = ${jobId} AND status IN ${input.sql(ACTIVE_STATUSES)}`;
          input.cancelActive(jobId);
          await input.queue.remove(jobId).catch(() => undefined);
          await removeJobArtifacts(artifactRoot, jobId);
        }
        const [current] = await input.sql`SELECT status FROM youtube_jobs WHERE id = ${jobId}`;
        return sendJson(res, 200, { ok: true, status: current?.status ?? "cancelled" });
      }
      return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
    } catch (error) {
      if (res.headersSent) return void res.destroy();
      if (error instanceof RequestError) return sendJson(res, error.status, { error: error.code });
      sendJson(res, 500, { error: "INTERNAL_ERROR" });
    }
  });
  server.on("close", () => clearInterval(cleanupTimer));
  server.listen(input.port, "0.0.0.0");
  return server;
}

/** Applies a status transition unless the job was cancelled; resolves to whether it was applied. */
export async function updateYoutubeJob(sql: Sql, jobId: string, status: string, errorCode?: string, artifactRoot?: string): Promise<boolean> {
  if (status === "completed") {
    const [job] = await sql`SELECT output_path FROM youtube_jobs WHERE id = ${jobId}`;
    if (job) {
      const info = await stat(String(job.output_path));
      const rows = await sql`UPDATE youtube_jobs SET status = 'completed', file_size_bytes = ${info.size}, updated_at = now() WHERE id = ${jobId} AND status <> 'cancelled' RETURNING id`;
      return rows.length > 0;
    }
    return false;
  }
  const rows = await sql`UPDATE youtube_jobs SET status = ${status}, error_code = ${errorCode ?? null}, updated_at = now() WHERE id = ${jobId} AND status <> 'cancelled' RETURNING id`;
  if (status === "failed" && artifactRoot) await removeJobArtifacts(resolve(artifactRoot), jobId);
  return rows.length > 0;
}

/** Removes the final artifact and yt-dlp partial/intermediate files for one job. */
export async function removeJobArtifacts(artifactRoot: string, jobId: string) {
  if (!/^yt_[0-9a-f-]{36}$/i.test(jobId)) return;
  const entries = await readdir(artifactRoot).catch(() => [] as string[]);
  await Promise.all(entries
    .filter((name) => name.startsWith(`${jobId}.`))
    .map((name) => join(artifactRoot, name))
    .filter((path) => isInside(artifactRoot, path))
    .map((path) => rm(path, { force: true }).catch(() => undefined)));
}

export function isInside(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

export const YOUTUBE_RUNTIME_MS = MAX_RUNTIME_MS;

function validateJob(body: unknown): { url: string; format: "mp3" | "mp4"; quality: string } | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  if (value.rightsConfirmed !== true || typeof value.url !== "string" || !["mp3", "mp4"].includes(String(value.format))) return null;
  const normalized = normalizeYoutubeInput(value.url);
  if (!normalized) return null;
  const quality = typeof value.quality === "string" && /^\d{3,4}p$/.test(value.quality) ? value.quality : "best";
  return { url: normalized, format: value.format as "mp3" | "mp4", quality };
}

class YtdlpError extends Error {
  constructor(readonly stderr: string, readonly timedOut: boolean) { super("YTDLP_FAILED"); }
}

function runYtdlpJson(url: string): Promise<{ title?: unknown; channel?: unknown; uploader?: unknown; thumbnail?: unknown; duration?: unknown; formats?: Array<{ format_id?: string; vcodec?: string; acodec?: string; height?: number; width?: number; fps?: number; ext?: string; filesize?: number; filesize_approx?: number }> }> {
  return new Promise((resolvePromise, reject) => {
    execFile("yt-dlp", ["--ignore-config", "--no-cache-dir", "--dump-single-json", "--skip-download", "--no-playlist", "--no-warnings", url], { timeout: METADATA_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(new YtdlpError(String(stderr ?? ""), Boolean((error as { killed?: boolean }).killed)));
      try { resolvePromise(JSON.parse(stdout)); } catch { reject(new YtdlpError("", false)); }
    });
  });
}

function isAuthorized(req: IncomingMessage, token: string) {
  const supplied = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(supplied); const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

class RequestError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) {
    const part = Buffer.from(chunk); size += part.length;
    if (size > 16_384) throw new RequestError(413, "REQUEST_TOO_LARGE");
    chunks.push(part);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new RequestError(400, "INVALID_REQUEST"); }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(body));
}
