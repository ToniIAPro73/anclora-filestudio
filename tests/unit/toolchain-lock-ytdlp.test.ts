// Toolchain lock contract (Fase 11 / Fase 12 items 19, 20):
// yt-dlp must be pinned to a concrete reproducible version with SHA-256 —
// never "latest" — in the same lock that portable builders consume.

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

interface LockTool {
  id: string;
  versions: {
    linux?: { version?: string; sha256?: string | null; sourceUrl?: string };
    "win-x64"?: { version?: string; sha256?: string | null; sourceUrl?: string };
    [k: string]: unknown;
  };
}

function loadLock(): { lockedAt: string; tools: LockTool[] } {
  const raw = fs.readFileSync(
    path.join(__dirname, "../../scripts/toolchain.lock.json"),
    "utf8"
  );
  return JSON.parse(raw) as { lockedAt: string; tools: LockTool[] };
}

describe("toolchain.lock.json — yt-dlp reproducible pin", () => {
  const lock = loadLock();
  const ytdlp = lock.tools.find((t) => t.id === "ytdlp");

  it("declares the yt-dlp tool", () => {
    expect(ytdlp).toBeDefined();
  });

  it("pins yt-dlp 2026.07.04 for both linux and win-x64 (tested version)", () => {
    expect(ytdlp!.versions.linux?.version).toBe("2026.07.04");
    expect(ytdlp!.versions["win-x64"]?.version).toBe("2026.07.04");
  });

  it("carries SHA-256 for both platforms (never trusts a bare version)", () => {
    expect(ytdlp!.versions.linux?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(ytdlp!.versions["win-x64"]?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("points at the versioned GitHub release URL (no rolling/latest URLs)", () => {
    expect(ytdlp!.versions.linux?.sourceUrl).toContain("2026.07.04");
    expect(ytdlp!.versions["win-x64"]?.sourceUrl).toContain("2026.07.04");
  });

  it("the whole lock file never uses the word 'latest' for downloads", () => {
    const raw = JSON.stringify(lock);
    expect(raw).not.toMatch(/download\/latest/);
  });

  it("lock is current (lockedAt after the pinned release date)", () => {
    expect(lock.lockedAt >= "2026-07-04").toBe(true);
  });
});