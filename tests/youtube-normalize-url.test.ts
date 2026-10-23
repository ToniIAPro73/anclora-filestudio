import { describe, expect, it } from "vitest";
import { normalizeYoutubeUrl } from "../src/lib/youtube/normalize-url";

describe("normalizeYoutubeUrl", () => {
  it("accepts youtu.be links with query params", () => {
    expect(
      normalizeYoutubeUrl("https://youtu.be/88fD-UtG_yo?si=qVe-VQwLAs5LHorD")
    ).toBe("https://www.youtube.com/watch?v=88fD-UtG_yo");
  });

  it("trims whitespace and ignores trailing slashes for short links", () => {
    expect(normalizeYoutubeUrl(" https://youtu.be/88fD-UtG_yo/ \n")).toBe(
      "https://www.youtube.com/watch?v=88fD-UtG_yo"
    );
  });

  it("accepts /live/<id> links and rejects other paths", () => {
    expect(
      normalizeYoutubeUrl("https://www.youtube.com/live/5HaOxAAA5qI?si=rzBuBLnotx8Yzn7q")
    ).toBe("https://www.youtube.com/watch?v=5HaOxAAA5qI");
    expect(normalizeYoutubeUrl("https://www.youtube.com/channel/5HaOxAAA5qI")).toBeNull();
  });
});
