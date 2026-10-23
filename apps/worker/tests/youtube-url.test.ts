import { describe, expect, it } from "vitest";
import { classifyYoutubeFailure, normalizeYoutubeInput } from "../src/youtube-url.js";

const CANONICAL = "https://www.youtube.com/watch?v=5HaOxAAA5qI";

describe("normalizeYoutubeInput", () => {
  it.each([
    "https://www.youtube.com/live/5HaOxAAA5qI?si=rzBuBLnotx8Yzn7q",
    "https://www.youtube.com/watch?v=5HaOxAAA5qI&list=PLx",
    "https://youtu.be/5HaOxAAA5qI?si=abc",
    "https://youtu.be/5HaOxAAA5qI/",
    "https://m.youtube.com/shorts/5HaOxAAA5qI",
    "https://www.youtube.com/embed/5HaOxAAA5qI",
  ])("accepts %s", (input) => {
    expect(normalizeYoutubeInput(input)).toBe(CANONICAL);
  });

  it.each([
    "http://www.youtube.com/watch?v=5HaOxAAA5qI",
    "https://evil.example/watch?v=5HaOxAAA5qI",
    "https://www.youtube.com.evil.example/watch?v=5HaOxAAA5qI",
    "https://evilyoutu.be/5HaOxAAA5qI",
    "https://user:pw@www.youtube.com/watch?v=5HaOxAAA5qI",
    "https://www.youtube.com:8443/watch?v=5HaOxAAA5qI",
    "https://www.youtube.com/redirect?v=5HaOxAAA5qI",
    "https://www.youtube.com/channel/5HaOxAAA5qI",
    "https://www.youtube.com/live/5HaOxAAA5qI/extra",
    "https://youtu.be/5HaOxAAA5qI/extra",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch?v=5HaOxAAA5q%2F",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "not a url",
    "",
  ])("rejects %s", (input) => {
    expect(normalizeYoutubeInput(input)).toBeNull();
  });

  it("rejects non-string input", () => {
    expect(normalizeYoutubeInput(undefined)).toBeNull();
    expect(normalizeYoutubeInput({ url: CANONICAL })).toBeNull();
  });
});

describe("classifyYoutubeFailure", () => {
  it("prioritises timeouts", () => {
    expect(classifyYoutubeFailure("anything", true)).toBe("YOUTUBE_TIMEOUT");
  });
  it("flags anonymous access blocks without mentioning cookies as the cause", () => {
    expect(classifyYoutubeFailure("ERROR: Sign in to confirm you're not a bot", false)).toBe("YOUTUBE_ANONYMOUS_ACCESS_BLOCKED");
    expect(classifyYoutubeFailure("HTTP Error 403: Forbidden", false)).toBe("YOUTUBE_ANONYMOUS_ACCESS_BLOCKED");
  });
  it("distinguishes unavailable videos, size limits and unknown failures", () => {
    expect(classifyYoutubeFailure("ERROR: Private video", false)).toBe("YOUTUBE_UNAVAILABLE");
    expect(classifyYoutubeFailure("File is larger than max-filesize", false)).toBe("YOUTUBE_FILE_TOO_LARGE");
    expect(classifyYoutubeFailure("boom", false)).toBe("YOUTUBE_EXTRACTION_FAILED");
  });
});
