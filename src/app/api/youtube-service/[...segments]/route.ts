import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Context = { params: Promise<{ segments: string[] }> };

const ALLOWED_ROUTES: Array<[RegExp, string[]]> = [
  [/^v1\/youtube\/metadata$/, ["POST"]],
  [/^v1\/youtube\/jobs$/, ["POST"]],
  [/^v1\/youtube\/jobs\/yt_[0-9a-f-]{36}$/i, ["GET", "DELETE"]],
];

async function proxy(req: NextRequest, context: Context) {
  const expected = process.env.YOUTUBE_REMOTE_API_TOKEN ?? "";
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(expected); const b = Buffer.from(provided);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  const { segments } = await context.params;
  const path = segments.join("/");
  // Control-plane only: metadata and job state. Artifact bytes (`/file`) never pass through Vercel.
  const allowedMethods = ALLOWED_ROUTES.find(([pattern]) => pattern.test(path))?.[1];
  if (!allowedMethods) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!allowedMethods.includes(req.method)) return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
  const worker = process.env.YOUTUBE_WORKER_URL?.replace(/\/$/, "");
  const workerToken = process.env.YOUTUBE_WORKER_TOKEN ?? "";
  if (!worker || !workerToken) return Response.json({ error: "El servicio remoto de YouTube no está configurado.", code: "REMOTE_YOUTUBE_NOT_CONFIGURED" }, { status: 503 });
  let workerProtocol: string;
  try { workerProtocol = new URL(worker).protocol; } catch { workerProtocol = ""; }
  if (workerProtocol !== "https:") return Response.json({ error: "La URL del worker remoto debe ser HTTPS.", code: "WORKER_HTTPS_REQUIRED" }, { status: 503 });
  const upstream = await fetch(`${worker}/${path}`, {
    method: req.method,
    headers: {
      authorization: `Bearer ${workerToken}`,
      ...(req.headers.get("content-type") ? { "content-type": req.headers.get("content-type")! } : {}),
    },
    ...(req.method === "POST" ? { body: await req.arrayBuffer() } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(110_000),
  }).catch((error: unknown) => (error instanceof Error && error.name === "TimeoutError" ? "timeout" as const : null));
  if (upstream === "timeout") return Response.json({ error: "El worker remoto no respondió a tiempo.", code: "REMOTE_WORKER_TIMEOUT" }, { status: 504 });
  if (!upstream) return Response.json({ error: "No se pudo contactar con el worker remoto.", code: "REMOTE_WORKER_UNAVAILABLE" }, { status: 502 });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
  });
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
