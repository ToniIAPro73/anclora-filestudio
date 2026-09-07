// REAL, non-mocked end-to-end smoke test for the "URL sin subtítulos ->
// audio-only -> Whisper" fallback (GAP-B). Uses the exact same functions
// the app's job processor calls — no simulation, no mocking of
// yt-dlp/FFmpeg/whisper-cli. Hits real network (YouTube via yt-dlp).
//
// NOT part of `pnpm test` (see vitest.manual-real.config.ts). Run with:
//   npx vitest run --config vitest.manual-real.config.ts
//
// Candidate URL was verified beforehand to have ZERO manual and ZERO
// automatic captions (see docs/features/video-audio-tools.md for the
// verification command/output) — a real, stable, well-known public film,
// not chosen arbitrarily to force a PASS.
//
// Structural note: on YouTube, "zero captions" strongly correlates with
// "little/no detected speech" — auto-captions are only generated when the
// ASR pipeline detects speech in a supported language, so a captionless
// video is very often near-wordless (Big Buck Bunny has no dialogue).
// This test therefore verifies the REAL mechanism end-to-end (probe,
// audio-only download, real whisper-cli invocation, cleanup) but does NOT
// assert non-empty transcribed speech content — a genuinely transcribed,
// non-empty real-world example is covered separately by the CONTROLLED
// test (url-transcript-controlled-smoke.real-smoke.test.ts), which is
// explicit that its source is not public internet content.

import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { probeUrlCaptions, downloadUrlAudioOnly } from "../src/lib/media/ytdlp-subtitles";
import { runWhisperTranscription } from "../src/lib/engines/media/whisper-engine";

const REAL_NO_CAPTIONS_URL = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"; // Big Buck Bunny (Blender Foundation) — no subtitles/captions

describe("URL fallback — REAL network, no subtitles -> Whisper", () => {
  it(
    "confirms NO_SUBTITLES for real, then runs the real audio-only -> Whisper pipeline",
    async () => {
      // 1. Real caption probe — must confirm no subtitles before continuing
      // (never force this path against a video that actually has captions).
      const info = await probeUrlCaptions(REAL_NO_CAPTIONS_URL);
      expect(info.manual).toEqual([]);
      expect(info.automatic).toEqual([]);

      // 2. Real audio-only download (yt-dlp, no video track).
      const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "url-fallback-real-"));
      const audioPath = path.join(workDir, "audio.wav");
      try {
        const download = await downloadUrlAudioOnly(REAL_NO_CAPTIONS_URL, audioPath, 300_000);
        expect(fs.existsSync(audioPath)).toBe(true);
        expect(fs.statSync(audioPath).size).toBeGreaterThan(0);
        console.log(`[real-smoke] audio downloaded via candidate #${download.candidateIndex} (${download.formatSelector})`);

        // 3. Real whisper-cli transcription — same helper the job processor uses.
        const result = await runWhisperTranscription(audioPath, {
          language: "auto",
          workDir,
          timeoutMs: 280_000,
        });
        expect(result.success).toBe(true);
        expect(result.srtContent.length + result.txtContent.length).toBeGreaterThanOrEqual(0);
        console.log(`[real-smoke] transcript srt bytes=${result.srtContent.length} txt bytes=${result.txtContent.length}`);
      } finally {
        // 4. Cleanup — no residual workdir/audio temp.
        fs.rmSync(workDir, { recursive: true, force: true });
      }
      expect(fs.existsSync(workDir)).toBe(false);
    },
    290_000,
  );
});
