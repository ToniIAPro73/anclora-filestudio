// WhisperEngine.execute() pipeline coverage (Fase 34):
//   direct-compatible audio (wav/mp3/flac/ogg) -> whisper-cli directly
//   video / other audio container -> FFmpeg extracts WAV first -> whisper-cli
//   no audio stream / whisper missing / model missing / cleanup (success & failure)
//
// ProcessRunner is mocked (no real whisper.cpp/FFmpeg invocation) so this
// suite runs deterministically in CI. The real, non-mocked pipeline is
// additionally exercised against the actual installed whisper-cli in
// scripts/whisper-real-smoke.sh (Fases 37-39).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

const runMock = vi.fn();

vi.mock("../../src/lib/infrastructure/processes/process-runner", () => {
  class ProcessRunner {
    binary: string;
    constructor(binary: string) {
      this.binary = binary;
    }
    async run(opts: { args: string[] }) {
      return runMock(opts.args);
    }
    async probe() {
      return { available: true, version: "1.9.2", binaryPath: this.binary };
    }
  }
  return { ProcessRunner };
});

function writeFakeFfmpegOutput(args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const outputPath = args[args.length - 1];
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, "RIFF-fake-wav-bytes");
  return { exitCode: 0, stdout: "", stderr: "" };
}

function writeFakeWhisperOutput(args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const ofIndex = args.indexOf("-of");
  const outBase = args[ofIndex + 1];
  fs.mkdirSync(path.dirname(outBase), { recursive: true });
  fs.writeFileSync(`${outBase}.txt`, "Hola mundo.");
  fs.writeFileSync(`${outBase}.srt`, "1\n00:00:00,000 --> 00:00:02,000\nHola mundo.\n");
  fs.writeFileSync(`${outBase}.vtt`, "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHola mundo.\n");
  return { exitCode: 0, stdout: "", stderr: "" };
}

function isFfmpegArgs(args: string[]): boolean {
  return args.includes("-vn") || args.includes("-c:a");
}

let tempRoot: string;
let modelsDir: string;

beforeEach(() => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "whisper-pipeline-test-"));
  modelsDir = path.join(tempRoot, "models");
  fs.mkdirSync(modelsDir, { recursive: true });
  fs.writeFileSync(path.join(modelsDir, "ggml-small.bin"), "fake-model-bytes");
  process.env.ANCLORA_FILESTUDIO_WHISPER_MODELS_DIR = modelsDir;
  process.env.ANCLORA_FILESTUDIO_TEMP_DIR = tempRoot;
  runMock.mockReset();
  runMock.mockImplementation((args: string[]) => (
    isFfmpegArgs(args) ? writeFakeFfmpegOutput(args) : writeFakeWhisperOutput(args)
  ));
});

afterEach(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  delete process.env.ANCLORA_FILESTUDIO_WHISPER_MODELS_DIR;
  delete process.env.ANCLORA_FILESTUDIO_TEMP_DIR;
  vi.resetModules();
});

async function loadEngine() {
  vi.resetModules();
  const mod = await import("../../src/lib/engines/media/whisper-engine");
  return mod;
}

function makePlan(overrides: Partial<Record<string, unknown>> = {}) {
  const jobId = crypto.randomUUID();
  const inputPath = path.join(tempRoot, "input.mp3");
  fs.writeFileSync(inputPath, "fake-audio-bytes");
  const outputPath = path.join(tempRoot, "output.txt");
  return {
    jobId,
    engineId: "whisper-cli" as const,
    operation: "transcribe",
    inputPath,
    outputPath,
    outputFormat: "txt",
    options: { inputFormat: "mp3", language: "auto", timestamps: true },
    args: [],
    env: {},
    timeoutMs: 30_000,
    estimatedSizeBytes: null,
    ...overrides,
  };
}

describe("WhisperEngine.execute — direct audio (mp3)", () => {
  it("transcribes an already-compatible audio file without invoking FFmpeg", async () => {
    const { whisperEngine } = await loadEngine();
    const plan = makePlan();
    const result = await whisperEngine.execute(plan as never);
    expect(result.success).toBe(true);
    expect(fs.readFileSync(plan.outputPath, "utf8")).toContain("Hola mundo.");
    expect(runMock).toHaveBeenCalledTimes(1); // whisper only, no ffmpeg extraction
  });
});

describe("WhisperEngine.execute — video via FFmpeg extraction (mp4)", () => {
  it("extracts audio with FFmpeg first, then transcribes the extracted WAV", async () => {
    const { whisperEngine } = await loadEngine();
    const plan = makePlan({
      inputPath: (() => {
        const p = path.join(tempRoot, "input.mp4");
        fs.writeFileSync(p, "fake-mp4-bytes");
        return p;
      })(),
      options: { inputFormat: "mp4", language: "auto", timestamps: true },
      outputFormat: "srt",
      outputPath: path.join(tempRoot, "output.srt"),
    });
    const result = await whisperEngine.execute(plan as never);
    expect(result.success).toBe(true);
    expect(fs.readFileSync(plan.outputPath, "utf8")).toContain("Hola mundo.");
    expect(runMock).toHaveBeenCalledTimes(2); // ffmpeg extraction + whisper
  });

  it("cleans up the temporary work dir (extracted WAV + raw whisper outputs) on success", async () => {
    const { whisperEngine } = await loadEngine();
    const plan = makePlan({
      inputPath: (() => {
        const p = path.join(tempRoot, "input.mov");
        fs.writeFileSync(p, "fake-mov-bytes");
        return p;
      })(),
      options: { inputFormat: "mov" },
    });
    await whisperEngine.execute(plan as never);
    const workDir = path.join(path.dirname(plan.outputPath), `.whisper-${plan.jobId}`);
    expect(fs.existsSync(workDir)).toBe(false);
  });
});

describe("WhisperEngine.execute — failure and edge paths", () => {
  it("fails with WHISPER_MODEL_MISSING-style error when no model is installed", async () => {
    fs.rmSync(path.join(modelsDir, "ggml-small.bin"));
    const { whisperEngine } = await loadEngine();
    const result = await whisperEngine.execute(makePlan() as never);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/modelo/i);
  });

  it("cleans up the work dir even when whisper-cli fails", async () => {
    runMock.mockImplementation((args: string[]) => (
      isFfmpegArgs(args) ? writeFakeFfmpegOutput(args) : { exitCode: 1, stdout: "", stderr: "boom" }
    ));
    const { whisperEngine } = await loadEngine();
    const plan = makePlan();
    const result = await whisperEngine.execute(plan as never);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/whisper-cli exit 1/);
    const workDir = path.join(path.dirname(plan.outputPath), `.whisper-${plan.jobId}`);
    expect(fs.existsSync(workDir)).toBe(false);
  });

  it("fails cleanly (no throw) when FFmpeg audio extraction fails", async () => {
    runMock.mockImplementation((args: string[]) => (
      isFfmpegArgs(args) ? { exitCode: 1, stdout: "", stderr: "no audio stream" } : writeFakeWhisperOutput(args)
    ));
    const { whisperEngine } = await loadEngine();
    const plan = makePlan({
      inputPath: (() => {
        const p = path.join(tempRoot, "silent.mp4");
        fs.writeFileSync(p, "fake-mp4-bytes");
        return p;
      })(),
      options: { inputFormat: "mp4" },
    });
    const result = await whisperEngine.execute(plan as never);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/extraer el audio/);
  });

  it("rejects an unsupported operation without touching the filesystem", async () => {
    const { whisperEngine } = await loadEngine();
    const result = await whisperEngine.execute(makePlan({ operation: "trim" }) as never);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no soportada/);
  });
});

describe("WhisperEngine.probe", () => {
  it("reports unavailable with a model-missing reason when the binary exists but no model is installed", async () => {
    fs.rmSync(path.join(modelsDir, "ggml-small.bin"));
    const { whisperEngine } = await loadEngine();
    const probe = await whisperEngine.probe();
    expect(probe.available).toBe(false);
    expect(probe.error).toMatch(/modelo/i);
  });

  it("reports available when both the binary and a model are present", async () => {
    const { whisperEngine } = await loadEngine();
    const probe = await whisperEngine.probe();
    expect(probe.available).toBe(true);
    expect(probe.capabilities).toContain("transcribe");
  });
});
