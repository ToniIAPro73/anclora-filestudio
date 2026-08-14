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
});
