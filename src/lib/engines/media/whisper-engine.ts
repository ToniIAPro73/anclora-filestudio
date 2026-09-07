// whisper.cpp (whisper-cli) local speech-to-text engine.
// Transcribes audio/video files fully offline using whisper.cpp's Metal/CPU
// backends. No cloud calls, no generative AI — only speech-to-text.
//
// Pipeline:
//   audio directly supported by whisper-cli (wav/mp3/flac/ogg) -> whisper-cli
//   video, or audio in another container (m4a/aac/...)         -> FFmpeg extracts
//                                                                  a temporary
//                                                                  WAV mono 16kHz
//                                                                  -> whisper-cli
//
// Binary discovery follows the same 3-tier pattern as every other engine
// (CONFIG override -> portable tools/ dir -> PATH, mac-aware). Models are
// detected (never auto-downloaded) from a per-OS user data directory.

import fs from "fs";
import os from "os";
import path from "path";
import type {
  ConversionEngine,
  EngineId,
  EngineProbeResult,
  ConversionCapability,
  ConversionPlan,
  ExecutionResult,
  ArtifactValidation,
} from "../../domain/engines";
import type { UniversalFileDescriptor, MediaAttributes } from "../../domain/descriptors";
import { ProcessRunner } from "../../infrastructure/processes/process-runner";
import { ensurePathSafety } from "../../security/path-safety";
import { CONFIG } from "../../config";
import { resolveMacAwareBinary } from "../../binary-resolution";
import { findFfmpegBinary } from "./ffmpeg-engine";

const ENGINE_ID: EngineId = "whisper-cli";

// whisper-cli's own supported-input list (per `whisper-cli --help`):
// "supported audio formats: flac, mp3, ogg, wav".
const WHISPER_DIRECT_AUDIO_EXTENSIONS = new Set(["wav", "mp3", "flac", "ogg"]);

export type WhisperOutputFormat = "txt" | "md" | "srt" | "vtt";

const OUTPUT_FORMAT_DEFS: Record<WhisperOutputFormat, { label: string; mime: string }> = {
  txt: { label: "TXT", mime: "text/plain" },
  md: { label: "Markdown", mime: "text/markdown" },
  srt: { label: "SRT", mime: "application/x-subrip" },
  vtt: { label: "VTT", mime: "text/vtt" },
};

export interface WhisperModel {
  id: string;
  fileName: string;
  filePath: string;
  sizeBytes: number;
}

// ── Binary discovery ─────────────────────────────────────────────────────────

export function findWhisperBinary(): string {
  // 1. Prefer ANCLORA_FILESTUDIO_WHISPER_PATH env var (portable distribution)
  const envPath = CONFIG.media.binaries.whisper;
  if (envPath && envPath !== "whisper-cli") return envPath;
  // 2. Portable path relative to cwd
  const portablePaths = [
    path.resolve(process.cwd(), "tools", "whisper", "bin", "whisper-cli.exe"),
    path.resolve(process.cwd(), "tools", "whisper", "whisper-cli.exe"),
    path.resolve(process.cwd(), "tools", "whisper", "whisper-cli"),
  ];
  for (const p of portablePaths) {
    if (fs.existsSync(/* turbopackIgnore: true */ p)) return p;
  }
  // 3. Fall back to PATH (macOS: also searches Homebrew's standard dirs — a
  // Finder-launched process may not inherit an interactive shell's PATH, so
  // this is what resolves /opt/homebrew/bin/whisper-cli on Apple Silicon).
  return resolveMacAwareBinary("whisper-cli");
}

// ── Model directory & discovery ───────────────────────────────────────────────

/**
 * Default whisper model directory. Follows the same env-override-first, then
 * per-OS user-data-dir convention as `defaultRuntimePackRoot()`
 * (src/lib/runtime-packs/platform.ts), using a single "Anclora FileStudio"
 * folder (macOS: ~/Library/Application Support/Anclora FileStudio/models/whisper).
 */
export function defaultWhisperModelsRoot(): string {
  // turbopackIgnore: model dir is intentionally dynamic (env override or
  // per-OS user data dir outside the project), same rationale as runtime-packs.
  if (CONFIG.media.binaries.whisperModelsDir) {
    return path.resolve(/* turbopackIgnore: true */ CONFIG.media.binaries.whisperModelsDir);
  }
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
    return path.join(/* turbopackIgnore: true */ localAppData, "Anclora FileStudio", "models", "whisper");
  }
  if (process.platform === "darwin") {
    return path.join(/* turbopackIgnore: true */ os.homedir(), "Library", "Application Support", "Anclora FileStudio", "models", "whisper");
  }
  return path.join(/* turbopackIgnore: true */ os.homedir(), ".local", "share", "anclora-filestudio", "models", "whisper");
}

/** Preference order when no explicit model is requested. */
const MODEL_PREFERENCE = ["small", "base", "tiny"];

function modelIdFromFileName(fileName: string): string {
  // ggml-small.bin -> small, ggml-small.en.bin -> small.en
  const m = fileName.match(/^ggml-(.+)\.bin$/i);
  return m ? m[1] : fileName;
}

export function listWhisperModels(modelsDir: string = defaultWhisperModelsRoot()): WhisperModel[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(/* turbopackIgnore: true */ modelsDir);
  } catch {
    return [];
  }
  return entries
    .filter((name) => /^ggml-.+\.bin$/i.test(name))
    .map((fileName) => {
      const filePath = path.join(modelsDir, fileName);
      let sizeBytes = 0;
      try {
        sizeBytes = fs.statSync(filePath).size;
      } catch {
        sizeBytes = 0;
      }
      return { id: modelIdFromFileName(fileName), fileName, filePath, sizeBytes };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getActiveWhisperModel(
  models: WhisperModel[],
  requestedModelId?: string | null
): WhisperModel | null {
  if (models.length === 0) return null;
  if (requestedModelId) {
    const exact = models.find((m) => m.id === requestedModelId);
    if (exact) return exact;
  }
  for (const preferred of MODEL_PREFERENCE) {
    const match = models.find((m) => m.id === preferred || m.id.startsWith(`${preferred}.`));
    if (match) return match;
  }
  return models[0];
}

// ── Capability builder ────────────────────────────────────────────────────────

function buildTranscribeCapability(
  descriptor: UniversalFileDescriptor,
  outputFmt: WhisperOutputFormat,
  available: boolean,
  unavailableReason: string | undefined
): ConversionCapability {
  const def = OUTPUT_FORMAT_DEFS[outputFmt];
  return {
    id: `whisper-transcribe-${descriptor.id}-${outputFmt}`,
    operation: "transcribe",
    outputFormat: outputFmt,
    outputMime: def.mime,
    label: `Transcribir a ${def.label}`,
    description: "Transcripción local con whisper.cpp — el audio no sale de tu dispositivo.",
    lossProfile: "lossless",
    state: available ? "available" : "unavailable-tool",
    unavailableReason: available ? undefined : unavailableReason,
    recommended: outputFmt === "txt",
    presets: [],
    // unavailableReason is dropped by the client-facing CapabilityInfo shape
    // (see normalizeCapabilityInfo) — duplicate it into warnings, which does
    // survive, so the UI can still explain *why* transcription is greyed out.
    warnings: available ? [] : [unavailableReason ?? "Whisper no está disponible."],
    engineId: ENGINE_ID,
    mobilePortability: "desktop-only",
  };
}

// ── SRT parsing & Markdown rendering (Fase 15/16 — no summarization) ─────────

interface SrtSegment {
  startLabel: string; // HH:MM:SS
  text: string;
}

function srtTimeToLabel(srtTime: string): string {
  // "00:00:06,560" -> "00:00:06"
  return srtTime.split(",")[0] ?? srtTime;
}

export function parseSrt(srtContent: string): SrtSegment[] {
  const blocks = srtContent.replace(/\r\n/g, "\n").trim().split(/\n\n+/);
  const segments: SrtSegment[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;
    const start = timeLine.split("-->")[0]?.trim();
    if (!start) continue;
    const textLines = lines.slice(lines.indexOf(timeLine) + 1);
    const text = textLines.join(" ").trim();
    if (!text) continue;
    segments.push({ startLabel: srtTimeToLabel(start), text });
  }
  return segments;
}

export interface TranscriptMarkdownMeta {
  title: string;
  source: string;
  durationLabel: string;
  language: string;
  processedAtIso: string;
}

/**
 * Renders a Markdown transcript from real whisper.cpp segments only — no
 * summarization, no generated commentary (Fase 16).
 */
export function buildTranscriptMarkdown(
  meta: TranscriptMarkdownMeta,
  segments: SrtSegment[],
  includeTimestamps: boolean
): string {
  const header = [
    `# ${meta.title}`,
    "",
    `Fuente: ${meta.source}`,
    `Duración: ${meta.durationLabel}`,
    `Idioma: ${meta.language}`,
    `Fecha de procesamiento: ${meta.processedAtIso}`,
    "",
    "## Transcripción",
    "",
  ].join("\n");

  if (segments.length === 0) {
    return `${header}(Sin voz detectada en el audio.)\n`;
  }

  if (!includeTimestamps) {
    return `${header}${segments.map((s) => s.text).join(" ")}\n`;
  }

  const body = segments.map((s) => `### ${s.startLabel}\n${s.text}`).join("\n\n");
  return `${header}${body}\n`;
}

export function buildTimestampedTxt(segments: SrtSegment[]): string {
  if (segments.length === 0) return "";
  return segments.map((s) => `[${s.startLabel}] ${s.text}`).join("\n");
}

// ── Shared whisper-cli invocation (engine + URL transcription route) ────────

export interface RunWhisperResult {
  success: boolean;
  srtContent: string;
  txtContent: string;
  vttContent: string;
  segments: SrtSegment[];
  logs: string[];
  error?: string;
}

/**
 * Runs whisper-cli against an already-whisper-compatible audio file (wav,
 * mp3, flac or ogg) and returns its three raw outputs. Callers that start
 * from video or another audio container must extract/transcode to one of
 * those formats first (see WhisperEngine.execute for the FFmpeg step).
 */
export async function runWhisperTranscription(
  audioPath: string,
  options: {
    modelId?: string;
    language?: string;
    workDir: string;
    timeoutMs?: number;
    signal?: AbortSignal;
  }
): Promise<RunWhisperResult> {
  const models = listWhisperModels();
  const model = getActiveWhisperModel(models, options.modelId);
  if (!model) {
    return {
      success: false, srtContent: "", txtContent: "", vttContent: "", segments: [], logs: [],
      error: `No hay ningún modelo Whisper disponible en ${defaultWhisperModelsRoot()}.`,
    };
  }

  fs.mkdirSync(options.workDir, { recursive: true });
  const outBase = path.join(options.workDir, "transcript");
  const runner = new ProcessRunner(findWhisperBinary(), options.timeoutMs ?? 1_800_000);
  const result = await runner.run({
    args: [
      "-m", model.filePath,
      "-l", options.language || "auto",
      "-of", outBase,
      "-otxt", "-osrt", "-ovtt",
      "-np",
      "-f", audioPath,
    ],
    timeoutMs: options.timeoutMs ?? 1_800_000,
    signal: options.signal,
  });

  const srtPath = `${outBase}.srt`;
  const txtPath = `${outBase}.txt`;
  const vttPath = `${outBase}.vtt`;
  const logs = [result.stdout, result.stderr].filter(Boolean);

  if (result.exitCode !== 0 || !fs.existsSync(srtPath)) {
    return {
      success: false, srtContent: "", txtContent: "", vttContent: "", segments: [], logs,
      error: `whisper-cli exit ${result.exitCode}: ${result.stderr.slice(0, 300)}`,
    };
  }

  const srtContent = fs.readFileSync(srtPath, "utf8");
  return {
    success: true,
    srtContent,
    txtContent: fs.existsSync(txtPath) ? fs.readFileSync(txtPath, "utf8").trim() : "",
    vttContent: fs.existsSync(vttPath) ? fs.readFileSync(vttPath, "utf8") : "",
    segments: parseSrt(srtContent),
    logs,
  };
}

// ── Engine implementation ────────────────────────────────────────────────────

export class WhisperEngine implements ConversionEngine {
  readonly id: EngineId = ENGINE_ID;
  readonly supportedCategories = ["audio", "video"] as const;

  private _probeResult: EngineProbeResult | null = null;
  private _runner: ProcessRunner | null = null;

  private getRunner(): ProcessRunner {
    if (!this._runner) this._runner = new ProcessRunner(findWhisperBinary(), 1_800_000);
    return this._runner;
  }

  async probe(): Promise<EngineProbeResult> {
    if (this._probeResult) return this._probeResult;

    try {
      const binaryProbe = await this.getRunner().probe(["--version"]);
      const models = listWhisperModels();
      const available = binaryProbe.available && models.length > 0;

      let error: string | undefined;
      if (!binaryProbe.available) {
        error = "Whisper no está instalado. Instala whisper.cpp para transcribir localmente.";
      } else if (models.length === 0) {
        error = `Whisper está instalado pero no se encontró ningún modelo en ${defaultWhisperModelsRoot()}.`;
      }

      this._probeResult = {
        available,
        version: binaryProbe.version,
        binaryPath: binaryProbe.binaryPath,
        capabilities: available ? ["transcribe"] : [],
        error,
      };
    } catch (err) {
      this._probeResult = {
        available: false,
        version: null,
        binaryPath: null,
        capabilities: [],
        error: `Error al detectar Whisper: ${String(err)}`,
      };
    }

    return this._probeResult;
  }

  getCapabilities(
    descriptor: UniversalFileDescriptor,
    probeResult: EngineProbeResult
  ): ConversionCapability[] {
    if (descriptor.category !== "audio" && descriptor.category !== "video") return [];
    const attrs = descriptor.attributes as MediaAttributes;
    if (!attrs.hasAudio) return [];

    const available = probeResult.available;
    const reason = probeResult.error ?? "Whisper no está disponible.";
    const outputs: WhisperOutputFormat[] = ["txt", "md", "srt", "vtt"];
    return outputs.map((fmt) => buildTranscribeCapability(descriptor, fmt, available, reason));
  }

  async execute(
    plan: ConversionPlan,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<ExecutionResult> {
    const start = Date.now();
    onProgress?.(10, "Preparando");

    try {
      ensurePathSafety(plan.inputPath);
      ensurePathSafety(plan.outputPath);
    } catch (err) {
      return { success: false, outputPath: plan.outputPath, outputSizeBytes: 0, durationMs: 0, logs: [], warnings: [], error: String(err) };
    }

    if (plan.operation !== "transcribe") {
      return {
        success: false,
        outputPath: plan.outputPath,
        outputSizeBytes: 0,
        durationMs: Date.now() - start,
        logs: [],
        warnings: [],
        error: `Operación no soportada: ${plan.operation}`,
      };
    }

    const models = listWhisperModels();
    const model = getActiveWhisperModel(models, plan.options.modelId as string | undefined);
    if (!model) {
      return {
        success: false,
        outputPath: plan.outputPath,
        outputSizeBytes: 0,
        durationMs: Date.now() - start,
        logs: [],
        warnings: [],
        error: `No hay ningún modelo Whisper disponible en ${defaultWhisperModelsRoot()}.`,
      };
    }

    const workDir = path.join(path.dirname(plan.outputPath), `.whisper-${plan.jobId}`);
    fs.mkdirSync(workDir, { recursive: true });

    let audioPath = plan.inputPath;
    let tempAudioCreated = false;
    const logs: string[] = [];

    try {
      const inputExt = (plan.options.inputFormat as string | undefined)?.toLowerCase()
        ?? plan.inputPath.split(".").pop()?.toLowerCase()
        ?? "";
      const needsExtraction = !WHISPER_DIRECT_AUDIO_EXTENSIONS.has(inputExt);

      if (needsExtraction) {
        onProgress?.(20, "Preparando audio");
        audioPath = path.join(workDir, "audio.wav");
        const ffmpegRunner = new ProcessRunner(findFfmpegBinary(), 300_000);
        const ffmpegResult = await ffmpegRunner.run({
          args: ["-y", "-i", plan.inputPath, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", audioPath],
          timeoutMs: 300_000,
        });
        logs.push(ffmpegResult.stdout, ffmpegResult.stderr);
        if (ffmpegResult.exitCode !== 0 || !fs.existsSync(audioPath)) {
          return {
            success: false,
            outputPath: plan.outputPath,
            outputSizeBytes: 0,
            durationMs: Date.now() - start,
            logs: logs.filter(Boolean),
            warnings: [],
            error: `No se pudo extraer el audio: ffmpeg exit ${ffmpegResult.exitCode}: ${ffmpegResult.stderr.slice(0, 300)}`,
          };
        }
        tempAudioCreated = true;
      }

      onProgress?.(35, "Transcribiendo");
      const language = (plan.options.language as string) || "auto";
      const outBase = path.join(workDir, "transcript");
      const whisperArgs = [
        "-m", model.filePath,
        "-l", language,
        "-of", outBase,
        "-otxt", "-osrt", "-ovtt",
        "-np",
        "-f", audioPath,
      ];

      const whisperResult = await this.getRunner().run({
        args: whisperArgs,
        timeoutMs: plan.timeoutMs,
        signal: plan.abortSignal,
        onProgress: (line) => {
          if (/^\[\d\d:\d\d:\d\d/.test(line)) onProgress?.(60, "Transcribiendo");
        },
      });
      logs.push(whisperResult.stdout, whisperResult.stderr);

      const srtPath = `${outBase}.srt`;
      const txtPath = `${outBase}.txt`;
      const vttPath = `${outBase}.vtt`;

      if (whisperResult.exitCode !== 0 || !fs.existsSync(srtPath)) {
        return {
          success: false,
          outputPath: plan.outputPath,
          outputSizeBytes: 0,
          durationMs: Date.now() - start,
          logs: logs.filter(Boolean),
          warnings: [],
          error: `whisper-cli exit ${whisperResult.exitCode}: ${whisperResult.stderr.slice(0, 300)}`,
        };
      }

      onProgress?.(85, "Generando archivo");
      const srtContent = fs.readFileSync(srtPath, "utf8");
      const segments = parseSrt(srtContent);
      const includeTimestamps = plan.options.timestamps !== false;

      let finalContent: string;
      switch (plan.outputFormat) {
        case "srt":
          finalContent = srtContent;
          break;
        case "vtt":
          finalContent = fs.existsSync(vttPath) ? fs.readFileSync(vttPath, "utf8") : "";
          break;
        case "md":
          finalContent = buildTranscriptMarkdown(
            {
              title: (plan.options.title as string) || path.basename(plan.inputPath),
              source: (plan.options.sourceLabel as string) || path.basename(plan.inputPath),
              durationLabel: (plan.options.durationLabel as string) || "—",
              language: language === "auto" ? "Detección automática" : language,
              processedAtIso: new Date().toISOString(),
            },
            segments,
            includeTimestamps
          );
          break;
        case "txt":
        default:
          finalContent = includeTimestamps && segments.length > 0
            ? buildTimestampedTxt(segments)
            : fs.existsSync(txtPath) ? fs.readFileSync(txtPath, "utf8").trim() : "";
          break;
      }

      fs.writeFileSync(plan.outputPath, finalContent, "utf8");
      const stat = fs.statSync(plan.outputPath);
      onProgress?.(100, "Completado");

      return {
        success: true,
        outputPath: plan.outputPath,
        outputSizeBytes: stat.size,
        durationMs: Date.now() - start,
        logs: logs.filter(Boolean),
        warnings: segments.length === 0 ? ["No se detectó voz en el audio."] : [],
      };
    } finally {
      // Always clean up the temporary work dir (extracted WAV + raw whisper
      // txt/srt/vtt siblings) — success, failure, or cancellation.
      if (tempAudioCreated || fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
    }
  }

  async validate(outputPath: string): Promise<ArtifactValidation> {
    const checks: ArtifactValidation["checks"] = [];
    const exists = fs.existsSync(outputPath);
    checks.push({ name: "file-exists", passed: exists });
    if (!exists) return { valid: false, checks };

    const stat = fs.statSync(outputPath);
    // Empty transcript files are valid (no speech detected) — size-nonzero is
    // informational only for this engine, never a hard failure.
    checks.push({ name: "size-recorded", passed: true, detail: `${stat.size} bytes` });
    return { valid: true, checks };
  }
}

export const whisperEngine = new WhisperEngine();
