// REAL, non-mocked end-to-end smoke test for the legacy YouTube ->
// MP3/MP4 pipeline and its cancellation (GAP closure). Uses the exact
// production entrypoints (jobManager.createJob + processJob) — no
// mocking of yt-dlp/FFmpeg. Hits real network (YouTube via yt-dlp).
//
// NOT part of `pnpm test` (see vitest.manual-real.config.ts). Run with:
//   npx vitest run --config vitest.manual-real.config.ts scripts/legacy-youtube-real-smoke.real-smoke.test.ts
//
// Candidate: "Me at the zoo" (jNQXAC9IVRw) — short (~19s), stable, public.

import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { jobManager } from "../src/lib/jobs/job-manager";
import { processJob } from "../src/lib/media/processor";
import { cancelJobProcess } from "../src/lib/jobs/job-cancellation";
import { CONFIG } from "../src/lib/config";
import fs from "fs";
import path from "path";

const REAL_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw";
const CLIENT_IP = "127.0.0.1";

function jobDirFor(jobId: string): string {
  return path.join(CONFIG.media.tempDir, jobId);
}

function countRealMediaProcesses(): number {
  try {
    const out = execSync("ps aux").toString();
    return out.split("\n").filter((l) => /yt-dlp|ffmpeg/.test(l) && !/grep/.test(l)).length;
  } catch {
    return -1; // ps unavailable — not fatal, just skip the assertion
  }
}

describe("Legacy YouTube pipeline — REAL network smoke", () => {
  it(
    "YouTube -> MP3 completes normally end-to-end",
    async () => {
      const job = jobManager.createJob(REAL_URL, "mp3", "128", CLIENT_IP, "transcode-audio", "remote-url");
      await processJob(job.id);
      const final = jobManager.getJob(job.id)!;
      expect(final.status).toBe("completed");
      expect(final.file_size_bytes).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(jobDirFor(job.id), "output.mp3"))).toBe(true);
    },
    120_000,
  );

  it(
    "YouTube -> MP4 completes normally end-to-end",
    async () => {
      const job = jobManager.createJob(REAL_URL, "mp4", "best", CLIENT_IP, "transcode-video", "remote-url");
      await processJob(job.id);
      const final = jobManager.getJob(job.id)!;
      expect(final.status).toBe("completed");
      expect(final.file_size_bytes).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(jobDirFor(job.id), "output.mp4"))).toBe(true);
    },
    120_000,
  );

  it(
    "cancelling a real, in-flight YouTube -> MP3 job kills the child process and leaves no orphan / no partial success",
    async () => {
      const job = jobManager.createJob(REAL_URL, "mp3", "128", CLIENT_IP, "transcode-audio", "remote-url");
      const before = countRealMediaProcesses();

      const jobPromise = processJob(job.id);
      // Give yt-dlp a moment to actually spawn and start working before cancelling.
      await new Promise((r) => setTimeout(r, 800));
      const cancelled = cancelJobProcess(job.id);
      expect(cancelled).toBe(true);
      await jobPromise;

      const final = jobManager.getJob(job.id)!;
      expect(final.status).toBe("cancelled");
      expect(fs.existsSync(jobDirFor(job.id))).toBe(false);

      // Give the OS a moment to reap the killed process before checking.
      await new Promise((r) => setTimeout(r, 500));
      const after = countRealMediaProcesses();
      if (before >= 0 && after >= 0) {
        expect(after).toBeLessThanOrEqual(before);
      }
    },
    60_000,
  );
});
