import { describe, it, expect } from "vitest";
import { classifyYtdlpFailure } from "../../src/lib/media/ytdlp-stderr-classifier";

describe("classifyYtdlpFailure", () => {
  it("classifies rotated/invalid cookies distinctly from a generic bot-check", () => {
    const result = classifyYtdlpFailure(
      "WARNING: [youtube] The provided YouTube account cookies are no longer valid. " +
        "They have likely been rotated in the browser as a security measure.",
      1
    );
    expect(result.code).toBe("YOUTUBE_BOT_VERIFICATION");
    expect(result.message).toContain("ya no son válidas");
    expect(result.message.toLowerCase()).not.toContain("cloudflare");
  });

  it("still classifies YouTube's own bot-check text", () => {
    const result = classifyYtdlpFailure("ERROR: Sign in to confirm you're not a bot.", 1);
    expect(result.code).toBe("YOUTUBE_BOT_VERIFICATION");
  });

  it("classifies explicit Cloudflare text separately", () => {
    const result = classifyYtdlpFailure("Attention Required! | Cloudflare", 1);
    expect(result.code).toBe("PROVIDER_VERIFICATION");
  });

  it("classifies a bare 403 as generic access denied, not Cloudflare", () => {
    const result = classifyYtdlpFailure("HTTP Error 403: Forbidden", 1);
    expect(result.code).toBe("PROVIDER_ACCESS_DENIED");
    expect(result.message.toLowerCase()).not.toContain("cloudflare");
  });

  // ── v1.0.1: per-format delivery vs login vs generic YouTube 403 ──────────

  it("classifies a YouTube 403 DURING DOWNLOAD as recoverable format delivery 403", () => {
    const result = classifyYtdlpFailure(
      "ERROR: [youtube] 88fD-UtG_yo: Unable to download video data: HTTP Error 403: Forbidden",
      1,
      "download"
    );
    expect(result.code).toBe("YOUTUBE_FORMAT_DELIVERY_403");
    expect(result.recoverable).toBe(true);
  });

  it("classifies a plain YouTube 403 mid-download as recoverable (formats were already listed)", () => {
    const result = classifyYtdlpFailure("ERROR: [youtube] 88fD-UtG_yo: HTTP Error 403: Forbidden", 1, "download");
    expect(result.code).toBe("YOUTUBE_FORMAT_DELIVERY_403");
    expect(result.recoverable).toBe(true);
  });

  it("does NOT classify a YouTube 403 in the METADATA phase as recoverable", () => {
    const result = classifyYtdlpFailure(
      "ERROR: [youtube] 88fD-UtG_yo: Unable to download webpage: HTTP Error 403: Forbidden",
      1,
      "metadata"
    );
    expect(result.code).toBe("YOUTUBE_GENERIC_ACCESS_DENIED");
    expect(result.recoverable).toBe(false);
  });

  it("classifies login-gated content as YOUTUBE_LOGIN_REQUIRED (never recoverable)", () => {
    const result = classifyYtdlpFailure("ERROR: [youtube] abc: Sign in to confirm your age.", 1);
    expect(result.code).toBe("YOUTUBE_LOGIN_REQUIRED");
    expect(result.recoverable).toBe(false);
  });

  it("classifies 'Log in to watch' as YOUTUBE_LOGIN_REQUIRED", () => {
    const result = classifyYtdlpFailure("ERROR: [youtube] abc: Log in to watch this video.", 1);
    expect(result.code).toBe("YOUTUBE_LOGIN_REQUIRED");
  });

  it("classifies private videos as YOUTUBE_LOGIN_REQUIRED", () => {
    const result = classifyYtdlpFailure("ERROR: [youtube] abc: This video is private.", 1);
    expect(result.code).toBe("YOUTUBE_LOGIN_REQUIRED");
  });

  it("keeps members-only/premium content as CONTENT_RESTRICTED", () => {
    const result = classifyYtdlpFailure("ERROR: [youtube] abc: This video is members-only.", 1);
    expect(result.code).toBe("CONTENT_RESTRICTED");
    expect(result.recoverable).toBe(false);
  });
});
