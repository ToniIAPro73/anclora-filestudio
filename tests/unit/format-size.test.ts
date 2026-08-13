import { describe, expect, it } from "vitest";
import { formatBytes } from "../../src/lib/browser-tools/common/filenames";

describe("small file size formatting", () => {
  it("does not render non-empty files as 0 KB", () => {
    expect(formatBytes(1)).toBe("1 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
  });
});
