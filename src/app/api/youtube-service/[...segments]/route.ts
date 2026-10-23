import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Context = { params: Promise<{ segments: string[] }> };

async function proxy(req: NextRequest, context: Context) {
  const expected = process.env.YOUTUBE_REMOTE_API_TOKEN ?? "";
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(expected); const b = Buffer.from(provided);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  const { segments } = await context.params;
  const path = segments.join("/");
  if (!/^(v1\/youtube\/(metadata|jobs|jobs\/yt_[0-9a-f-]+))$/i.test(path)) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (req.method === "GET" && path.endsWith("/metadata") || path.endsWith("/file")) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const worker = process.env.YOUTUBE_WORKER_URL?.replace(/\/$/, "");
  const workerToken = process.env.YOUTUBE_WORKER_TOKEN ?? "";
  if (!worker || !workerToken) return Response.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  if (new URL(worker).protocol !== "https:") return Response.json({ error: "WORKER_HTTPS_REQUIRED" }, { status: 503 });
  const upstream = await fetch(`${worker}/${path}`, {
    method: req.method,
    headers: {
      authorization: `Bearer ${workerToken}`,
      ...(req.headers.get("content-type") ? { "content-type": req.headers.get("content-type")! } : {}),
    },
    ...(req.method === "POST" ? { body: await req.arrayBuffer() } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(110_000),
  }).catch(() => null);
  if (!upstream) return Response.json({ error: "REMOTE_WORKER_UNAVAILABLE" }, { status: 502 });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
  });
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
