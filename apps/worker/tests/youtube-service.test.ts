import { mkdtemp, mkdir, readdir, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isInside, removeJobArtifacts, startYoutubeService } from "../src/youtube-service.js";

const TOKEN = "t".repeat(40);
const JOB = "yt_123e4567-e89b-12d3-a456-426614174000";
let server: Server | null = null;

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = null;
});

async function start() {
  const sql = vi.fn(() => { throw new Error("database must not be reached"); });
  const queue = { add: vi.fn(), remove: vi.fn() };
  server = startYoutubeService({
    sql: sql as never, queue: queue as never, token: TOKEN, port: 0,
    artifactRoot: join(tmpdir(), "yt-test-root"), cancelActive: vi.fn(),
  });
  await new Promise<void>((resolve) => server!.once("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = (path: string, init: RequestInit = {}, token: string | null = TOKEN) =>
    fetch(`${base}${path}`, { ...init, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" } });
  return { call, sql, queue };
}

describe("youtube worker control surface", () => {
  it("serves health without auth and rejects other routes without the bearer token", async () => {
    const { call } = await start();
    expect((await call("/health", {}, null)).status).toBe(200);
    expect((await call("/v1/youtube/jobs", { method: "POST", body: "{}" }, null)).status).toBe(401);
    expect((await call("/v1/youtube/jobs", { method: "POST", body: "{}" }, "wrong".padEnd(40, "x"))).status).toBe(401);
  });

  it("rejects non-YouTube and malformed metadata/job requests before touching yt-dlp or the database", async () => {
    const { call, sql, queue } = await start();
    const metadata = await call("/v1/youtube/metadata", { method: "POST", body: JSON.stringify({ url: "https://169.254.169.254/latest" }) });
    expect(metadata.status).toBe(400);
    expect((await call("/v1/youtube/metadata", { method: "POST", body: "not json" })).status).toBe(400);
    expect((await call("/v1/youtube/metadata", { method: "GET" })).status).toBe(405);

    const noRights = await call("/v1/youtube/jobs", { method: "POST", body: JSON.stringify({ url: "https://youtu.be/5HaOxAAA5qI", format: "mp4" }) });
    expect(noRights.status).toBe(400);
    const badFormat = await call("/v1/youtube/jobs", { method: "POST", body: JSON.stringify({ url: "https://youtu.be/5HaOxAAA5qI", format: "mkv", rightsConfirmed: true }) });
    expect(badFormat.status).toBe(400);
    const ssrf = await call("/v1/youtube/jobs", { method: "POST", body: JSON.stringify({ url: "https://evil.example/watch?v=5HaOxAAA5qI", format: "mp3", rightsConfirmed: true }) });
    expect(ssrf.status).toBe(400);
    expect(sql).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("returns 404 for malformed job ids and 405 for non-GET file requests", async () => {
    const { call } = await start();
    expect((await call("/v1/youtube/jobs/yt_../../etc/passwd")).status).toBe(404);
    expect((await call(`/v1/youtube/jobs/${JOB}/file`, { method: "DELETE" })).status).toBe(405);
  });
});

describe("artifact path safety", () => {
  it("uses relative containment instead of prefix matching", () => {
    expect(isInside("/data/artifacts", "/data/artifacts/yt_a.mp4")).toBe(true);
    expect(isInside("/data/artifacts", "/data/artifacts-evil/yt_a.mp4")).toBe(false);
    expect(isInside("/data/artifacts", "/data/artifacts/../secret")).toBe(false);
    expect(isInside("/data/artifacts", "/data/artifacts")).toBe(false);
  });

  it("removes only the job's artifact and partial files", async () => {
    const root = await mkdtemp(join(tmpdir(), "yt-artifacts-"));
    await mkdir(root, { recursive: true });
    const other = "yt_223e4567-e89b-12d3-a456-426614174000";
    for (const name of [`${JOB}.mp4`, `${JOB}.mp4.part`, `${JOB}.f137.mp4`, `${other}.mp4`]) await writeFile(join(root, name), "x");
    await removeJobArtifacts(root, JOB);
    expect(await readdir(root)).toEqual([`${other}.mp4`]);
    await removeJobArtifacts(root, "../escape");
    expect(await readdir(root)).toEqual([`${other}.mp4`]);
  });
});
