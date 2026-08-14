/**
 * Tests for the opt-in YouTube/X/Instagram cookies upload endpoint.
 *
 * Covers: loopback (portable) bypasses the token, non-loopback (VPS) requires
 * a matching token and fails closed when none is configured, oversized/
 * multi-domain/malformed files are rejected, and DELETE removes the file.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";

let dataDir: string;
let cookiesUploadToken = "";
let loopback = false;

vi.mock("@/lib/config", () => ({
  get CONFIG() {
    return {
      media: { dataDir },
      security: { get cookiesUploadToken() { return cookiesUploadToken; } },
    };
  },
}));

vi.mock("@/lib/deployment-target", () => ({
  isLoopbackOnlyRuntime: () => loopback,
}));

const NETSCAPE_HEADER = "# Netscape HTTP Cookie File\n# https://curl.haxx.se/rfc/cookie_spec.html\n\n";
const ONE_DOMAIN_COOKIES = `${NETSCAPE_HEADER}.youtube.com\tTRUE\t/\tTRUE\t0\tSID\tabc123\n`;

function manyDomainCookies(count: number): string {
  let out = NETSCAPE_HEADER;
  for (let i = 0; i < count; i++) {
    out += `.site${i}.example.com\tTRUE\t/\tTRUE\t0\tSID\tabc${i}\n`;
  }
  return out;
}

function makeUploadRequest(fileContent: string, opts: { token?: string; filename?: string } = {}) {
  const formData = new FormData();
  formData.append("file", new File([fileContent], opts.filename ?? "cookies.txt", { type: "text/plain" }));
  const headers: Record<string, string> = {};
  if (opts.token !== undefined) headers["x-anclora-admin-token"] = opts.token;
  return new NextRequest("http://localhost/api/settings/cookies", {
    method: "POST",
    headers,
    body: formData,
  });
}

function makeDeleteRequest(token?: string) {
  const headers: Record<string, string> = {};
  if (token !== undefined) headers["x-anclora-admin-token"] = token;
  return new NextRequest("http://localhost/api/settings/cookies", { method: "DELETE", headers });
}

describe("settings-cookies-route", () => {
  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "anclora-cookies-test-"));
    cookiesUploadToken = "";
    loopback = false;
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it("GET reports absent, requiresToken=true, tokenConfigured=false on a non-loopback deploy with no token set", async () => {
    const { GET } = await import("../../src/server/desktop-routes/settings-cookies-route");
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ present: false, requiresToken: true, tokenConfigured: false });
  });

  it("POST fails closed (401) on non-loopback when no token is configured server-side", async () => {
    const { POST } = await import("../../src/server/desktop-routes/settings-cookies-route");
    const res = await POST(makeUploadRequest(ONE_DOMAIN_COOKIES, { token: "anything" }));
    expect(res.status).toBe(401);
  });

  it("POST fails (401) on non-loopback with a wrong token", async () => {
    cookiesUploadToken = "correct-token";
    const { POST } = await import("../../src/server/desktop-routes/settings-cookies-route");
    const res = await POST(makeUploadRequest(ONE_DOMAIN_COOKIES, { token: "wrong-token" }));
    expect(res.status).toBe(401);
  });

  it("POST succeeds on non-loopback with the correct token and writes cookies.txt", async () => {
    cookiesUploadToken = "correct-token";
    const { POST } = await import("../../src/server/desktop-routes/settings-cookies-route");
    const res = await POST(makeUploadRequest(ONE_DOMAIN_COOKIES, { token: "correct-token" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.domainCount).toBe(1);
    expect(fs.readFileSync(path.join(dataDir, "cookies.txt"), "utf8")).toContain(".youtube.com");
  });

  it("POST succeeds on loopback (portable) without any token", async () => {
    loopback = true;
    const { POST } = await import("../../src/server/desktop-routes/settings-cookies-route");
    const res = await POST(makeUploadRequest(ONE_DOMAIN_COOKIES));
    expect(res.status).toBe(200);
  });

  it("POST rejects a file with too many distinct domains (full browser export mistake)", async () => {
    loopback = true;
    const { POST } = await import("../../src/server/desktop-routes/settings-cookies-route");
    const res = await POST(makeUploadRequest(manyDomainCookies(25)));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("TOO_MANY_DOMAINS");
  });

  it("POST rejects a file that isn't Netscape-format cookies", async () => {
    loopback = true;
    const { POST } = await import("../../src/server/desktop-routes/settings-cookies-route");
    const res = await POST(makeUploadRequest("not a cookies file at all"));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("INVALID_COOKIES_FILE");
  });

  it("POST rejects an oversized file", async () => {
    loopback = true;
    const { POST } = await import("../../src/server/desktop-routes/settings-cookies-route");
    const huge = NETSCAPE_HEADER + "a".repeat(300 * 1024);
    const res = await POST(makeUploadRequest(huge));
    expect(res.status).toBe(413);
  });

  it("DELETE removes an existing cookies.txt", async () => {
    loopback = true;
    const { POST, DELETE, GET } = await import("../../src/server/desktop-routes/settings-cookies-route");
    await POST(makeUploadRequest(ONE_DOMAIN_COOKIES));
    expect((await (await GET()).json()).present).toBe(true);

    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(200);
    expect((await (await GET()).json()).present).toBe(false);
  });

  it("DELETE fails closed (401) on non-loopback without a matching token", async () => {
    cookiesUploadToken = "correct-token";
    const { DELETE } = await import("../../src/server/desktop-routes/settings-cookies-route");
    const res = await DELETE(makeDeleteRequest("wrong"));
    expect(res.status).toBe(401);
  });
});
