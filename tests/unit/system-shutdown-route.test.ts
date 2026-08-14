/**
 * Tests for the graceful-shutdown endpoint. Covers: loopback (portable)
 * bypasses the token, non-loopback (VPS) requires a matching admin token
 * and fails closed when none is configured — a shared server shouldn't be
 * killable by anyone who can reach the page.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

let cookiesUploadToken = "";
let loopback = false;

vi.mock("@/lib/config", () => ({
  get CONFIG() {
    return { security: { get cookiesUploadToken() { return cookiesUploadToken; } } };
  },
}));

vi.mock("@/lib/deployment-target", () => ({
  isLoopbackOnlyRuntime: () => loopback,
}));

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

function makeRequest(token?: string) {
  const headers: Record<string, string> = {};
  if (token !== undefined) headers["x-anclora-admin-token"] = token;
  return new NextRequest("http://localhost/api/shutdown", { headers });
}

describe("system-shutdown-route", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("fails closed (401) on non-loopback when no token is configured server-side", async () => {
    const { GET } = await import("../../src/server/desktop-routes/system-shutdown-route");
    const res = await GET(makeRequest("anything"));
    expect(res.status).toBe(401);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("fails (401) on non-loopback with a wrong token", async () => {
    cookiesUploadToken = "correct-token";
    const { GET } = await import("../../src/server/desktop-routes/system-shutdown-route");
    const res = await GET(makeRequest("wrong-token"));
    expect(res.status).toBe(401);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("succeeds on non-loopback with the correct token", async () => {
    vi.useFakeTimers();
    cookiesUploadToken = "correct-token";
    const { GET } = await import("../../src/server/desktop-routes/system-shutdown-route");
    const res = await GET(makeRequest("correct-token"));
    expect(res.status).toBe(200);
    vi.runAllTimers();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("succeeds on loopback (portable) without any token, matching stop-anclora-filestudio.ps1's plain GET", async () => {
    vi.useFakeTimers();
    loopback = true;
    const { GET } = await import("../../src/server/desktop-routes/system-shutdown-route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    vi.runAllTimers();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
