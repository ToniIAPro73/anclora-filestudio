import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Queue } from "bullmq";
import type { Sql } from "postgres";
import type { QueueJobPayload } from "@anclora/filestudio-core";
import { QUEUE_NAMES } from "@anclora/filestudio-core";

const MAX_RUNTIME_MS = 12 * 60 * 60 * 1000;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"]);

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
      const expired = await input.sql`DELETE FROM youtube_jobs WHERE status IN ('completed','failed','cancelled') AND updated_at < now() - interval '24 hours' RETURNING output_path`;
      for (const row of expired) {
        const artifact = resolve(String(row.output_path));
        if (artifact.startsWith(`${artifactRoot}/`)) await rm(artifact, { force: true }).catch(() => undefined);
      }
    })().catch((error) => console.error("[youtube-worker] artifact cleanup failed:", error instanceof Error ? error.message : "unknown"));
  }, 60 * 60 * 1000);
  cleanupTimer.unref();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      if (req.method === "GET" && url.pathname === "/health") return sendJson(res, 200, { ok: true });
      if (!isAuthorized(req, input.token)) return sendJson(res, 401, { error: "UNAUTHORIZED" });

      if (req.method === "POST" && url.pathname === "/v1/youtube/metadata") {
        const body = await readJson(req) as { url?: unknown };
        const normalized = normalizeYoutubeInput(body?.url);
        if (!normalized) return sendJson(res, 400, { error: "INVALID_URL" });
        let metadata: Awaited<ReturnType<typeof runYtdlpJson>>;
        try {
          metadata = await runYtdlpJson(normalized);
        } catch {
          return sendJson(res, 422, { error: "YouTube no permitió leer los metadatos de forma anónima. El servicio no usa cookies personales y este vídeo puede no estar disponible." });
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

      if (req.method === "POST" && url.pathname === "/v1/youtube/jobs") {
        const body = await readJson(req);
        const parsed = validateJob(body);
        if (!parsed) return sendJson(res, 400, { error: "INVALID_REQUEST" });
        const jobId = `yt_${randomUUID()}`;
        const outputPath = join(artifactRoot, `${jobId}.${parsed.format}`);
        await mkdir(artifactRoot, { recursive: true });
        await input.sql`INSERT INTO youtube_jobs (id, url, format, quality, status, output_path, created_at, updated_at)
          VALUES (${jobId}, ${parsed.url}, ${parsed.format}, ${parsed.quality}, 'queued', ${outputPath}, now(), now())`;
        const payload: QueueJobPayload = {
          jobId, operation: "youtube:convert", engineId: "ffmpeg-media",
          inputPath: parsed.url, outputPath,
          options: { format: parsed.format, quality: parsed.quality, timeoutMs: MAX_RUNTIME_MS },
          timeoutMs: MAX_RUNTIME_MS, clientId: "filestudio-desktop", workspaceId: "youtube-download",
        };
        await input.queue.add("youtube:convert", payload, { jobId, attempts: 1, removeOnComplete: { age: 86400 }, removeOnFail: { age: 86400 } });
        return sendJson(res, 202, { jobId, status: "queued" });
      }

      const match = url.pathname.match(/^\/v1\/youtube\/jobs\/(yt_[0-9a-f-]+)(?:\/(file))?$/i);
      if (!match) return sendJson(res, 404, { error: "NOT_FOUND" });
      const [, jobId, file] = match;
      if (file && req.method !== "GET") return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
      const [job] = await input.sql`SELECT id, status, format, title, error_code, output_path, file_size_bytes FROM youtube_jobs WHERE id = ${jobId}`;
      if (!job) return sendJson(res, 404, { error: "JOB_NOT_FOUND" });
      if (file) {
        if (job.status !== "completed") return sendJson(res, 409, { error: "JOB_NOT_COMPLETED" });
        res.writeHead(200, {
          "content-type": job.format === "mp3" ? "audio/mpeg" : "video/mp4",
          "content-disposition": `attachment; filename="${jobId}.${job.format}"`,
          "content-length": String(job.file_size_bytes),
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        });
        createReadStream(String(job.output_path)).on("error", () => res.destroy()).pipe(res);
        return;
      }
      if (req.method === "GET") return sendJson(res, 200, {
        jobId: job.id, status: job.status, stage: job.status, progress: job.status === "completed" ? 100 : job.status === "queued" ? 0 : null, outputFormat: job.format,
        title: job.title, error: job.error_code ? "No se pudo obtener el vídeo desde YouTube." : null,
        downloadAvailable: job.status === "completed",
        file: job.status === "completed" ? { name: `${jobId}.${job.format}`, format: job.format, sizeBytes: Number(job.file_size_bytes) } : undefined,
      });
      if (req.method === "DELETE") {
        if (["queued", "downloading", "processing"].includes(String(job.status))) {
          input.cancelActive(jobId);
          await input.queue.remove(jobId).catch(() => undefined);
          await input.sql`UPDATE youtube_jobs SET status = 'cancelled', updated_at = now() WHERE id = ${jobId}`;
        }
        return sendJson(res, 200, { ok: true });
      }
      return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
    } catch {
      if (!res.headersSent) sendJson(res, 500, { error: "INTERNAL_ERROR" });
      else res.destroy();
    }
  });
  server.on("close", () => clearInterval(cleanupTimer));
  server.listen(input.port, "0.0.0.0");
  return server;
}

export async function updateYoutubeJob(sql: Sql, jobId: string, status: string, errorCode?: string) {
  if (status === "completed") {
    const [job] = await sql`SELECT output_path FROM youtube_jobs WHERE id = ${jobId}`;
    if (job) {
      const { stat } = await import("node:fs/promises");
      const info = await stat(String(job.output_path));
      await sql`UPDATE youtube_jobs SET status = 'completed', file_size_bytes = ${info.size}, updated_at = now() WHERE id = ${jobId} AND status <> 'cancelled'`;
    }
  } else {
    await sql`UPDATE youtube_jobs SET status = ${status}, error_code = ${errorCode ?? null}, updated_at = now() WHERE id = ${jobId} AND status <> 'cancelled'`;
  }
}

export const YOUTUBE_RUNTIME_MS = MAX_RUNTIME_MS;

function validateJob(body: unknown): { url: string; format: "mp3" | "mp4"; quality: string } | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  if (value.rightsConfirmed !== true || typeof value.url !== "string" || !["mp3", "mp4"].includes(String(value.format))) return null;
  try {
    const normalized = normalizeYoutubeInput(value.url);
    if (!normalized) return null;
    const quality = typeof value.quality === "string" && /^\d{3,4}p$/.test(value.quality) ? value.quality : "best";
    return { url: normalized, format: value.format as "mp3" | "mp4", quality };
  } catch { return null; }
}

function normalizeYoutubeInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase()) || url.username || url.password || url.port) return null;
    const id = url.hostname.endsWith("youtu.be") ? url.pathname.slice(1) : url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).at(-1);
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return `https://www.youtube.com/watch?v=${id}`;
  } catch { return null; }
}

function runYtdlpJson(url: string): Promise<{ title?: unknown; channel?: unknown; uploader?: unknown; thumbnail?: unknown; duration?: unknown; formats?: Array<{ format_id?: string; vcodec?: string; acodec?: string; height?: number; width?: number; fps?: number; ext?: string; filesize?: number; filesize_approx?: number }> }> {
  return new Promise((resolve, reject) => {
    execFile("yt-dlp", ["--ignore-config", "--dump-single-json", "--skip-download", "--no-playlist", "--no-warnings", url], { timeout: 90_000, maxBuffer: 8 * 1024 * 1024 }, (error, stdout) => {
      if (error) return reject(error);
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error("YOUTUBE_METADATA_INVALID")); }
    });
  });
}

function isAuthorized(req: IncomingMessage, token: string) {
  const supplied = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(supplied); const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) { const part = Buffer.from(chunk); size += part.length; if (size > 16_384) throw new Error("REQUEST_TOO_LARGE"); chunks.push(part); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(body));
}
