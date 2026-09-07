// URL transcript job processor (GAP-A/B remediation). ProcessRunner is
// mocked — no real yt-dlp/FFmpeg/whisper-cli network or process spawning in
// CI. Covers: manual subtitles, automatic-only, no-subtitles -> Whisper
// fallback, audio-candidate fallback, failures, cancellation at every
// stage, and work-dir cleanup on success/failure/cancel. The real,
// non-mocked network pipeline is additionally exercised in
// scripts/url-transcript-real-smoke.sh.
//
// Every test loads the processor (and job-manager/job-cancellation) via a
// fresh `vi.resetModules()` + dynamic import, and always through the SAME
// `loadProcessor()` helper — this matters because job-cancellation.ts's
// AbortController registry is pure in-memory (not DB-backed): if the test
// imported it statically while the processor used a separately re-imported
// instance, cancelJobProcess() would silently no-op against the wrong map.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { CONFIG } from "../../src/lib/config";

const runMock = vi.fn();

vi.mock("../../src/lib/infrastructure/processes/process-runner", () => {
  class ProcessRunner {
    async run(opts: { args: string[]; signal?: AbortSignal }) {
      if (opts.signal?.aborted) return { exitCode: -1, stdout: "", stderr: "Process cancelled" };
      return runMock(opts.args, opts.signal);
    }
  }
  return { ProcessRunner };
});

function isYtdlpProbe(args: string[]) {
  return args.includes("-J");
}
function isYtdlpSubtitleDownload(args: string[]) {
  return args.includes("--write-subs") || args.includes("--write-auto-subs");
}
function isYtdlpAudioDownload(args: string[]) {
  return args.includes("--extract-audio");
}
function isWhisperInvocation(args: string[]) {
  return args.includes("-otxt");
}

function jsonResult(obj: unknown) {
  return { exitCode: 0, stdout: JSON.stringify(obj), stderr: "" };
}

function defaultRunMock(hasManual: boolean, hasAutomatic: boolean) {
  return (args: string[]) => {
    if (isYtdlpProbe(args)) {
      return jsonResult({
        title: "Vídeo de prueba",
        duration: 42,
        subtitles: hasManual ? { es: [{ ext: "vtt" }] } : {},
        automatic_captions: hasAutomatic ? { en: [{ ext: "vtt" }] } : {},
      });
    }
    if (isYtdlpSubtitleDownload(args)) {
      const oIndex = args.indexOf("-o");
      const template = args[oIndex + 1] as string;
      const langIndex = args.indexOf("--sub-langs");
      const lang = args[langIndex + 1] as string;
      const srtPath = template.replace("%(ext)s", `${lang}.srt`);
      fs.mkdirSync(path.dirname(srtPath), { recursive: true });
      fs.writeFileSync(srtPath, "1\n00:00:00,000 --> 00:00:01,000\nHola desde subtitulos\n");
      return { exitCode: 0, stdout: "", stderr: "" };
    }
    if (isYtdlpAudioDownload(args)) {
      const oIndex = args.indexOf("-o");
      const outPath = args[oIndex + 1] as string;
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, "fake-wav-bytes");
      return { exitCode: 0, stdout: "", stderr: "" };
    }
    if (isWhisperInvocation(args)) {
      const ofIndex = args.indexOf("-of");
      const outBase = args[ofIndex + 1] as string;
      fs.mkdirSync(path.dirname(outBase), { recursive: true });
      fs.writeFileSync(`${outBase}.txt`, "Hola desde whisper.");
      fs.writeFileSync(`${outBase}.srt`, "1\n00:00:00,000 --> 00:00:02,000\nHola desde whisper.\n");
      fs.writeFileSync(`${outBase}.vtt`, "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHola desde whisper.\n");
      return { exitCode: 0, stdout: "", stderr: "" };
    }
    // ffmpeg srt->vtt conversion
    const vttPath = args[args.length - 1];
    fs.writeFileSync(vttPath, "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHola\n");
    return { exitCode: 0, stdout: "", stderr: "" };
  };
}

let modelsDir: string;

beforeEach(() => {
  modelsDir = fs.mkdtempSync(path.join(CONFIG.media.tempDir, "url-job-models-"));
  fs.mkdirSync(modelsDir, { recursive: true });
  fs.writeFileSync(path.join(modelsDir, "ggml-small.bin"), "fake-model-bytes");
  process.env.ANCLORA_FILESTUDIO_WHISPER_MODELS_DIR = modelsDir;
  runMock.mockReset();
});

afterEach(() => {
  fs.rmSync(modelsDir, { recursive: true, force: true });
  delete process.env.ANCLORA_FILESTUDIO_WHISPER_MODELS_DIR;
  vi.resetModules();
});

async function loadProcessor() {
  vi.resetModules();
  const processor = await import("../../src/lib/jobs/url-transcript-processor");
  const { jobManager } = await import("../../src/lib/jobs/job-manager");
  const { cancelJobProcess } = await import("../../src/lib/jobs/job-cancellation");
  return { ...processor, jobManager, cancelJobProcess };
}

function jobDirFor(jobId: string): string {
  return path.join(CONFIG.media.tempDir, jobId);
}

describe("processUrlTranscriptJob — subtitle priority", () => {
  it("mode:auto with manual subtitles available downloads and uses them directly", async () => {
    runMock.mockImplementation(defaultRunMock(true, true));
    const { createUrlTranscriptJob, processUrlTranscriptJob, jobManager } = await loadProcessor();
    const job = createUrlTranscriptJob({
      url: "https://example.com/video",
      options: { mode: "auto", outputFormat: "txt" },
      clientIp: "127.0.0.1",
    });
    await processUrlTranscriptJob(job.id);
    const final = jobManager.getJob(job.id)!;
    expect(final.status).toBe("completed");
    const content = fs.readFileSync(path.join(jobDirFor(job.id), "output.txt"), "utf8");
    expect(content).toContain("Hola desde subtitulos");
    // whisper must NOT have run when subtitles exist
    expect(runMock.mock.calls.some(([args]) => isWhisperInvocation(args))).toBe(false);
  });

  it("mode:auto with only automatic captions falls back to them (not Whisper)", async () => {
    runMock.mockImplementation(defaultRunMock(false, true));
    const { createUrlTranscriptJob, processUrlTranscriptJob, jobManager } = await loadProcessor();
    const job = createUrlTranscriptJob({
      url: "https://example.com/video",
      options: { mode: "auto", outputFormat: "srt" },
      clientIp: "127.0.0.1",
    });
    await processUrlTranscriptJob(job.id);
    const final = jobManager.getJob(job.id)!;
    expect(final.status).toBe("completed");
    expect(runMock.mock.calls.some(([args]) => isWhisperInvocation(args))).toBe(false);
  });

  it("mode:subtitle with an explicit track skips the probe entirely", async () => {
    runMock.mockImplementation(defaultRunMock(true, true));
    const { createUrlTranscriptJob, processUrlTranscriptJob, jobManager } = await loadProcessor();
    const job = createUrlTranscriptJob({
      url: "https://example.com/video",
      options: { mode: "subtitle", source: "manual", lang: "es", outputFormat: "txt" },
      clientIp: "127.0.0.1",
    });
    await processUrlTranscriptJob(job.id);
    expect(jobManager.getJob(job.id)!.status).toBe("completed");
    expect(runMock.mock.calls.some(([args]) => isYtdlpProbe(args))).toBe(false);
  });
});

describe("processUrlTranscriptJob — no subtitles -> Whisper fallback", () => {
  it("falls back to audio-only download + Whisper when no captions exist", async () => {
    runMock.mockImplementation(defaultRunMock(false, false));
    const { createUrlTranscriptJob, processUrlTranscriptJob, jobManager } = await loadProcessor();
    const job = createUrlTranscriptJob({
      url: "https://example.com/video",
      options: { mode: "auto", outputFormat: "txt", language: "auto" },
      clientIp: "127.0.0.1",
    });
    await processUrlTranscriptJob(job.id);
    const final = jobManager.getJob(job.id)!;
    expect(final.status).toBe("completed");
    expect(runMock.mock.calls.some(([args]) => isYtdlpAudioDownload(args))).toBe(true);
    expect(runMock.mock.calls.some(([args]) => isWhisperInvocation(args))).toBe(true);
    const content = fs.readFileSync(path.join(jobDirFor(job.id), "output.txt"), "utf8");
    expect(content).toContain("Hola desde whisper.");
  });

  it("never requests a full video download — only audio-only selectors", async () => {
    runMock.mockImplementation(defaultRunMock(false, false));
    const { createUrlTranscriptJob, processUrlTranscriptJob } = await loadProcessor();
    const job = createUrlTranscriptJob({
      url: "https://example.com/video",
      options: { mode: "auto", outputFormat: "txt" },
      clientIp: "127.0.0.1",
    });
    await processUrlTranscriptJob(job.id);
    for (const [args] of runMock.mock.calls) {
      if (isYtdlpAudioDownload(args)) {
        expect(args).not.toContain("--format");
        expect(args.join(" ")).not.toMatch(/-f\s+bestvideo/);
      }
    }
  });

  it("falls back to the alternate-codec candidate when the first audio selector fails", async () => {
    let audioAttempts = 0;
    runMock.mockImplementation((args: string[]) => {
      if (isYtdlpProbe(args)) return jsonResult({ title: "x", duration: 1, subtitles: {}, automatic_captions: {} });
      if (isYtdlpAudioDownload(args)) {
        audioAttempts += 1;
        if (audioAttempts === 1) return { exitCode: 1, stdout: "", stderr: "HTTP 403" };
        const oIndex = args.indexOf("-o");
        const outPath = args[oIndex + 1] as string;
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, "fake-wav-bytes");
        return { exitCode: 0, stdout: "", stderr: "" };
      }
      return defaultRunMock(false, false)(args);
    });
    const { createUrlTranscriptJob, processUrlTranscriptJob, jobManager } = await loadProcessor();
    const job = createUrlTranscriptJob({
      url: "https://example.com/video",
      options: { mode: "auto", outputFormat: "txt" },
      clientIp: "127.0.0.1",
    });
    await processUrlTranscriptJob(job.id);
    expect(jobManager.getJob(job.id)!.status).toBe("completed");
    expect(audioAttempts).toBe(2);
  });
});

describe("processUrlTranscriptJob — failures", () => {
  it("marks the job failed when yt-dlp probing fails entirely", async () => {
    runMock.mockImplementation((args: string[]) => {
      if (isYtdlpProbe(args)) return { exitCode: 1, stdout: "", stderr: "ERROR: Unsupported URL" };
      return { exitCode: 1, stdout: "", stderr: "" };
    });
    const { createUrlTranscriptJob, processUrlTranscriptJob, jobManager } = await loadProcessor();
    const job = createUrlTranscriptJob({
      url: "https://not-a-real-site.example/x",
      options: { mode: "auto", outputFormat: "txt" },
      clientIp: "127.0.0.1",
    });
    await processUrlTranscriptJob(job.id);
    const final = jobManager.getJob(job.id)!;
    expect(final.status).toBe("failed");
    expect(final.error_message).toMatch(/Unsupported URL/);
  });

  it("marks the job failed when Whisper transcription fails after audio download", async () => {
    runMock.mockImplementation((args: string[]) => {
      if (isYtdlpProbe(args)) return jsonResult({ title: "x", duration: 1, subtitles: {}, automatic_captions: {} });
      if (isYtdlpAudioDownload(args)) {
        const oIndex = args.indexOf("-o");
        const outPath = args[oIndex + 1] as string;
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, "fake-wav-bytes");
        return { exitCode: 0, stdout: "", stderr: "" };
      }
      if (isWhisperInvocation(args)) return { exitCode: 1, stdout: "", stderr: "whisper boom" };
      return { exitCode: 1, stdout: "", stderr: "" };
    });
    const { createUrlTranscriptJob, processUrlTranscriptJob, jobManager } = await loadProcessor();
    const job = createUrlTranscriptJob({
      url: "https://example.com/video",
      options: { mode: "auto", outputFormat: "txt" },
      clientIp: "127.0.0.1",
    });
    await processUrlTranscriptJob(job.id);
    expect(jobManager.getJob(job.id)!.status).toBe("failed");
  });
});

describe("processUrlTranscriptJob — cancellation reaches child processes", () => {
  it("cancelling during the yt-dlp probe stage marks the job cancelled, not failed", async () => {
    const { createUrlTranscriptJob, processUrlTranscriptJob, jobManager, cancelJobProcess } = await loadProcessor();
    const job = createUrlTranscriptJob({
      url: "https://example.com/video",
      options: { mode: "auto", outputFormat: "txt" },
      clientIp: "127.0.0.1",
    });
    let capturedSignal: AbortSignal | undefined;
    runMock.mockImplementation((args: string[], signal?: AbortSignal) => {
      if (isYtdlpProbe(args)) {
        capturedSignal = signal;
        cancelJobProcess(job.id);
        return { exitCode: -1, stdout: "", stderr: "Process cancelled" };
      }
      return { exitCode: 1, stdout: "", stderr: "" };
    });
    await processUrlTranscriptJob(job.id);
    expect(jobManager.getJob(job.id)!.status).toBe("cancelled");
    expect(capturedSignal).toBeDefined();
  });

  it("cancelling during audio-only download marks the job cancelled and cleans up", async () => {
    const { createUrlTranscriptJob, processUrlTranscriptJob, jobManager, cancelJobProcess } = await loadProcessor();
    const job = createUrlTranscriptJob({
      url: "https://example.com/video",
      options: { mode: "auto", outputFormat: "txt" },
      clientIp: "127.0.0.1",
    });
    runMock.mockImplementation((args: string[]) => {
      if (isYtdlpProbe(args)) return jsonResult({ title: "x", duration: 1, subtitles: {}, automatic_captions: {} });
      if (isYtdlpAudioDownload(args)) {
        cancelJobProcess(job.id);
        return { exitCode: -1, stdout: "", stderr: "Process cancelled" };
      }
      return { exitCode: 1, stdout: "", stderr: "" };
    });
    await processUrlTranscriptJob(job.id);
    expect(jobManager.getJob(job.id)!.status).toBe("cancelled");
    expect(fs.existsSync(path.join(jobDirFor(job.id), ".work"))).toBe(false);
  });

  it("cancelling during Whisper transcription marks the job cancelled and cleans up", async () => {
    const { createUrlTranscriptJob, processUrlTranscriptJob, jobManager, cancelJobProcess } = await loadProcessor();
    const job = createUrlTranscriptJob({
      url: "https://example.com/video",
      options: { mode: "auto", outputFormat: "txt" },
      clientIp: "127.0.0.1",
    });
    runMock.mockImplementation((args: string[]) => {
      if (isYtdlpProbe(args)) return jsonResult({ title: "x", duration: 1, subtitles: {}, automatic_captions: {} });
      if (isYtdlpAudioDownload(args)) {
        const oIndex = args.indexOf("-o");
        const outPath = args[oIndex + 1] as string;
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, "fake-wav-bytes");
        return { exitCode: 0, stdout: "", stderr: "" };
      }
      if (isWhisperInvocation(args)) {
        cancelJobProcess(job.id);
        return { exitCode: -1, stdout: "", stderr: "Process cancelled" };
      }
      return { exitCode: 1, stdout: "", stderr: "" };
    });
    await processUrlTranscriptJob(job.id);
    expect(jobManager.getJob(job.id)!.status).toBe("cancelled");
    expect(fs.existsSync(path.join(jobDirFor(job.id), ".work"))).toBe(false);
  });
});

describe("processUrlTranscriptJob — temp cleanup", () => {
  it("removes the .work dir on success but keeps the final output file", async () => {
    runMock.mockImplementation(defaultRunMock(true, false));
    const { createUrlTranscriptJob, processUrlTranscriptJob } = await loadProcessor();
    const job = createUrlTranscriptJob({
      url: "https://example.com/video",
      options: { mode: "auto", outputFormat: "txt" },
      clientIp: "127.0.0.1",
    });
    await processUrlTranscriptJob(job.id);
    expect(fs.existsSync(path.join(jobDirFor(job.id), ".work"))).toBe(false);
    expect(fs.existsSync(path.join(jobDirFor(job.id), "output.txt"))).toBe(true);
  });

  it("removes the .work dir even when the job fails", async () => {
    runMock.mockImplementation((args: string[]) => {
      if (isYtdlpProbe(args)) return { exitCode: 1, stdout: "", stderr: "boom" };
      return { exitCode: 1, stdout: "", stderr: "" };
    });
    const { createUrlTranscriptJob, processUrlTranscriptJob, jobManager } = await loadProcessor();
    const job = createUrlTranscriptJob({
      url: "https://example.com/video",
      options: { mode: "auto", outputFormat: "txt" },
      clientIp: "127.0.0.1",
    });
    await processUrlTranscriptJob(job.id);
    expect(jobManager.getJob(job.id)!.status).toBe("failed");
    expect(fs.existsSync(path.join(jobDirFor(job.id), ".work"))).toBe(false);
  });
});
