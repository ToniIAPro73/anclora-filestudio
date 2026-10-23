import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const JOB = "yt_123e4567-e89b-12d3-a456-426614174000";

beforeEach(() => {
  process.env.YOUTUBE_REMOTE_API_TOKEN = "a".repeat(40);
  process.env.YOUTUBE_WORKER_TOKEN = "w".repeat(40);
  process.env.YOUTUBE_WORKER_URL = "https://worker.example.test/worker";
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

async function call(method: string, path: string, token: string | null = "a".repeat(40), body?: string) {
  const route = await import("../../src/app/api/youtube-service/[...segments]/route");
  const req = new Request(`http://localhost/api/youtube-service/${path}`, {
    method, body, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
  });
  const handler = { GET: route.GET, POST: route.POST, DELETE: route.DELETE }[method as "GET"];
  return handler(req as never, { params: Promise.resolve({ segments: path.split("/") }) });
}

describe("Vercel YouTube control proxy", () => {
  it("requires the API bearer token", async () => {
    expect((await call("POST", "v1/youtube/metadata", null, "{}")).status).toBe(401);
    expect((await call("POST", "v1/youtube/metadata", "b".repeat(40), "{}")).status).toBe(401);
  });

  it("fails closed when the API token is not configured", async () => {
    delete process.env.YOUTUBE_REMOTE_API_TOKEN;
    expect((await call("POST", "v1/youtube/metadata", "", "{}")).status).toBe(401);
  });

  it("never proxies artifact bytes or unknown paths and enforces methods", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await call("GET", `v1/youtube/jobs/${JOB}/file`)).status).toBe(404);
    expect((await call("GET", "v1/youtube/metadata")).status).toBe(405);
    expect((await call("POST", `v1/youtube/jobs/${JOB}`)).status).toBe(405);
    expect((await call("POST", "v1/other")).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports missing or non-HTTPS worker configuration with codes", async () => {
    delete process.env.YOUTUBE_WORKER_URL;
    const missing = await call("POST", "v1/youtube/metadata", undefined, "{}");
    expect(missing.status).toBe(503);
    expect((await missing.json()).code).toBe("REMOTE_YOUTUBE_NOT_CONFIGURED");
    process.env.YOUTUBE_WORKER_URL = "http://worker.example.test/worker";
    expect((await (await call("POST", "v1/youtube/metadata", undefined, "{}")).json()).code).toBe("WORKER_HTTPS_REQUIRED");
  });

  it("forwards allowed requests with the separate worker token and maps timeouts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ jobId: JOB }), { status: 202, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const ok = await call("POST", "v1/youtube/jobs", undefined, JSON.stringify({ url: "https://youtu.be/5HaOxAAA5qI" }));
    expect(ok.status).toBe(202);
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toBe("https://worker.example.test/worker/v1/youtube/jobs");
    expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${"w".repeat(40)}`);

    const timeout = Object.assign(new Error("t"), { name: "TimeoutError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));
    const res = await call("GET", `v1/youtube/jobs/${JOB}`);
    expect(res.status).toBe(504);
    expect((await res.json()).code).toBe("REMOTE_WORKER_TIMEOUT");
  });
});

describe("Desktop remote YouTube client", () => {
  it("signs and verifies download tokens bound to the job id and expiry", async () => {
    process.env.ANCLORA_FILESTUDIO_REMOTE_API_URL = "https://app.example.test/api/youtube-service";
    process.env.ANCLORA_FILESTUDIO_REMOTE_API_TOKEN = "a".repeat(40);
    const client = await import("../../src/lib/media/remote-youtube-client");
    const token = client.createRemoteDownloadToken(JOB);
    expect(client.verifyRemoteDownloadToken(JOB, token)).toBe(true);
    expect(client.verifyRemoteDownloadToken("yt_223e4567-e89b-12d3-a456-426614174000", token)).toBe(false);
    expect(client.verifyRemoteDownloadToken(JOB, `${token.split(".")[0]}.${"0".repeat(64)}`)).toBe(false);
    expect(client.verifyRemoteDownloadToken(JOB, "1.".concat("0".repeat(64)))).toBe(false);
    expect(client.verifyRemoteDownloadToken(JOB, null)).toBe(false);
  });

  it("returns coded JSON errors instead of throwing when unconfigured or unreachable", async () => {
    delete process.env.ANCLORA_FILESTUDIO_REMOTE_API_URL;
    delete process.env.ANCLORA_FILESTUDIO_REMOTE_API_TOKEN;
    const client = await import("../../src/lib/media/remote-youtube-client");
    expect(client.remoteYoutubeEnabled()).toBe(false);
    const unconfigured = await client.remoteYoutubeApi("v1/youtube/metadata", { method: "POST", body: "{}" });
    expect(unconfigured.status).toBe(503);
    expect((await unconfigured.json()).code).toBe("REMOTE_YOUTUBE_NOT_CONFIGURED");

    process.env.ANCLORA_FILESTUDIO_REMOTE_API_URL = "https://app.example.test/api/youtube-service";
    process.env.ANCLORA_FILESTUDIO_REMOTE_API_TOKEN = "a".repeat(40);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const down = await client.remoteYoutubeApi("v1/youtube/metadata", { method: "POST", body: "{}" });
    expect(down.status).toBe(502);
    expect((await down.json()).code).toBe("REMOTE_WORKER_UNAVAILABLE");
    await expect(client.remoteYoutubeApi("v1/youtube/../../etc")).rejects.toThrow();
  });
});
