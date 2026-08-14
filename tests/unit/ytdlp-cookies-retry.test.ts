import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { cookiesFileHasDomainFor, withCookiesFallback } from "../../src/lib/media/ytdlp-cookies-retry";

describe("cookiesFileHasDomainFor", () => {
  let cookiesPath: string;

  afterEach(() => {
    if (cookiesPath) fs.rmSync(cookiesPath, { force: true });
  });

  function writeCookies(content: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cookies-domain-test-"));
    cookiesPath = path.join(dir, "cookies.txt");
    fs.writeFileSync(cookiesPath, content);
    return cookiesPath;
  }

  it("matches a youtube.com cookie for a youtube.com URL", () => {
    const p = writeCookies("# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t0\tSID\tabc\n");
    expect(cookiesFileHasDomainFor(p, "https://www.youtube.com/watch?v=x")).toBe(true);
  });

  it("matches a youtube.com cookie for a youtu.be URL (same platform, different domain)", () => {
    const p = writeCookies("# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t0\tSID\tabc\n");
    expect(cookiesFileHasDomainFor(p, "https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  });

  it("does NOT match a youtube.com cookie for a vimeo.com URL", () => {
    const p = writeCookies("# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t0\tSID\tabc\n");
    expect(cookiesFileHasDomainFor(p, "https://vimeo.com/12345")).toBe(false);
  });

  it("matches x.com cookies for a twitter.com URL (same platform)", () => {
    const p = writeCookies("# Netscape HTTP Cookie File\n.x.com\tTRUE\t/\tTRUE\t0\tSID\tabc\n");
    expect(cookiesFileHasDomainFor(p, "https://twitter.com/user/status/1")).toBe(true);
  });

  it("returns false for a nonexistent cookies file", () => {
    expect(cookiesFileHasDomainFor("/nonexistent/cookies.txt", "https://youtube.com/watch?v=x")).toBe(false);
  });

  it("returns false for an invalid URL", () => {
    const p = writeCookies("# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t0\tSID\tabc\n");
    expect(cookiesFileHasDomainFor(p, "not-a-url")).toBe(false);
  });
});

describe("withCookiesFallback", () => {
  it("returns the anonymous attempt's result without retrying when it succeeds", async () => {
    const attempt = vi.fn().mockResolvedValue("ok");
    const { result, usedCookies } = await withCookiesFallback(attempt, true);
    expect(result).toBe("ok");
    expect(usedCookies).toBe(false);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledWith(false);
  });

  it("retries with cookies when the anonymous attempt fails and cookies are configured", async () => {
    const attempt = vi.fn()
      .mockRejectedValueOnce(new Error("blocked"))
      .mockResolvedValueOnce("ok-with-cookies");
    const { result, usedCookies } = await withCookiesFallback(attempt, true);
    expect(result).toBe("ok-with-cookies");
    expect(usedCookies).toBe(true);
    expect(attempt).toHaveBeenNthCalledWith(1, false);
    expect(attempt).toHaveBeenNthCalledWith(2, true);
  });

  it("does not retry when cookies aren't configured — rethrows the anonymous failure", async () => {
    const err = new Error("blocked");
    const attempt = vi.fn().mockRejectedValue(err);
    await expect(withCookiesFallback(attempt, false)).rejects.toBe(err);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("propagates the cookies attempt's error when both attempts fail", async () => {
    const cookiesErr = new Error("still blocked with cookies");
    const attempt = vi.fn()
      .mockRejectedValueOnce(new Error("blocked"))
      .mockRejectedValueOnce(cookiesErr);
    await expect(withCookiesFallback(attempt, true)).rejects.toBe(cookiesErr);
  });
});
