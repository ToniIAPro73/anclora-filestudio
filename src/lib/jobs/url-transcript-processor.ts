// URL transcript job processor — third processor over the SAME `jobs`
// table used by media/processor.ts (legacy) and universal-job-processor.ts
// (universal engines). Not a second job system: same DB row shape, same
// job-route.ts GET/DELETE, same /token and /download routes, same shared
// cancellation registry (job-cancellation.ts).
//
// Real phases (no simulated/interpolated percentages — each stage string
// corresponds to an actual step the pipeline is executing):
//   Analizando URL -> Comprobando subtítulos -> Descargando subtítulos
//   | Descargando audio -> Preparando audio -> Transcribiendo
//   -> Generando archivo -> Completado / Error / Cancelado
//
// Priority: manual subtitles -> automatic captions -> local Whisper
// fallback (audio-only download, never the full video).

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getDb } from "../infrastructure/db/database";
import { jobManager } from "./job-manager";
import { CONFIG } from "../config";
import { ensurePathSafety } from "../security/path-safety";
import { sanitizeFilename } from "../security/sanitize-filename";
import { registerAbortController, clearAbortController } from "./job-cancellation";
import { probeUrlCaptions, downloadUrlSubtitle, downloadUrlAudioOnly } from "../media/ytdlp-subtitles";
import {
  runWhisperTranscription,
  parseSrt,
  buildTimestampedTxt,
  buildTranscriptMarkdown,
  type WhisperOutputFormat,
} from "../engines/media/whisper-engine";
import { findFfmpegBinary } from "../engines/media/ffmpeg-engine";
import { ProcessRunner } from "../infrastructure/processes/process-runner";
import type { JobRow } from "../infrastructure/db/job-repository";
import { ERROR_MESSAGES } from "../errors/error-codes";

export interface UrlTranscriptOptions {
  /** "subtitle": user already picked an explicit track from the probe UI.
   *  "auto": no pre-selection — the job itself runs the full
   *  manual -> automatic -> Whisper priority chain. */
  mode: "subtitle" | "auto";
  source?: "manual" | "automatic";
  lang?: string;
  language?: string;
  outputFormat: WhisperOutputFormat;
  timestamps?: boolean;
}

interface CreateUrlTranscriptJobParams {
  url: string;
  options: UrlTranscriptOptions;
  clientIp: string;
}

const OUTPUT_MIME: Record<WhisperOutputFormat, string> = {
  txt: "text/plain",
  md: "text/markdown",
  srt: "application/x-subrip",
  vtt: "text/vtt",
};

export function createUrlTranscriptJob(params: CreateUrlTranscriptJobParams): JobRow {
  const db = getDb();
  const id = crypto.randomBytes(16).toString("hex");
  const ttl = CONFIG.media.limits.jobTtlMinutes;
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000).toISOString();

  db.prepare(
    `
    INSERT INTO jobs (
      id, input_kind, input_reference, input_title,
      operation, output_format, quality, options_json,
      status, stage, progress,
      client_ip, expires_at
    ) VALUES (?, 'remote-url', ?, ?, 'url-transcribe', ?, ?, ?, 'queued', 'En cola', 0, ?, ?)
  `,
  ).run(
    id,
    params.url,
    params.url,
    params.options.outputFormat,
    params.options.outputFormat.toUpperCase(),
    JSON.stringify(params.options),
    params.clientIp,
    expiresAt,
  );

  return jobManager.getJob(id)!;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

async function convertSrtToVtt(srtContent: string, workDir: string, signal?: AbortSignal): Promise<string> {
  const srtPath = path.join(workDir, "convert-in.srt");
  const vttPath = path.join(workDir, "convert-out.vtt");
  fs.writeFileSync(srtPath, srtContent, "utf8");
  const runner = new ProcessRunner(findFfmpegBinary(), 30_000);
  const result = await runner.run({ args: ["-y", "-i", srtPath, vttPath], timeoutMs: 30_000, signal });
  if (result.exitCode !== 0 || !fs.existsSync(vttPath)) return "";
  return fs.readFileSync(vttPath, "utf8");
}

export async function processUrlTranscriptJob(jobId: string): Promise<void> {
  const abortController = new AbortController();
  registerAbortController(jobId, abortController);
  const signal = abortController.signal;

  const setPhase = (stage: string, progress: number) => {
    jobManager.updateJob(jobId, { stage, progress });
  };

  const jobDir = path.join(CONFIG.media.tempDir, jobId);
  const workDir = path.join(jobDir, ".work");

  try {
    const job = jobManager.getJob(jobId);
    if (!job) return;
    jobManager.updateJob(jobId, { status: "processing", started_at: new Date().toISOString() });

    const url = job.input_reference;
    const options: UrlTranscriptOptions = job.options_json
      ? JSON.parse(job.options_json)
      : { mode: "auto", outputFormat: "txt" as WhisperOutputFormat };
    const outputFormat = options.outputFormat;
    const includeTimestamps = options.timestamps !== false;

    fs.mkdirSync(workDir, { recursive: true });
    const outputPath = path.join(jobDir, `output.${outputFormat}`);
    ensurePathSafety(outputPath);

    setPhase("Analizando URL", 5);

    let srtContent: string | null = null;
    let vttContent: string | undefined;
    let txtContent: string | undefined;
    let title = url;
    let durationLabel = "—";
    let languageLabel = options.language || "auto";

    if (options.mode === "subtitle" && options.source && options.lang) {
      setPhase("Descargando subtítulos", 30);
      const downloaded = await downloadUrlSubtitle(url, options.lang, options.source, workDir, 60_000, signal);
      srtContent = fs.readFileSync(downloaded.srtPath, "utf8");
      languageLabel = options.lang;
    } else {
      setPhase("Comprobando subtítulos", 15);
      const info = await probeUrlCaptions(url, 30_000, signal);
      title = info.title;
      durationLabel = formatDuration(info.durationSeconds);

      const manualLang = info.manual[0]?.lang;
      const autoLang = info.automatic[0]?.lang;

      if (manualLang) {
        setPhase("Descargando subtítulos", 30);
        const downloaded = await downloadUrlSubtitle(url, manualLang, "manual", workDir, 60_000, signal);
        srtContent = fs.readFileSync(downloaded.srtPath, "utf8");
        languageLabel = manualLang;
      } else if (autoLang) {
        setPhase("Descargando subtítulos", 30);
        const downloaded = await downloadUrlSubtitle(url, autoLang, "automatic", workDir, 60_000, signal);
        srtContent = fs.readFileSync(downloaded.srtPath, "utf8");
        languageLabel = autoLang;
      } else {
        // NO_SUBTITLES — not a failure, fall back to local Whisper.
        setPhase("Descargando audio", 45);
        const audioPath = path.join(workDir, "audio.wav");
        await downloadUrlAudioOnly(url, audioPath, 300_000, signal);

        setPhase("Preparando audio", 55);
        if (!fs.existsSync(audioPath)) {
          throw new Error(ERROR_MESSAGES.AUDIO_EXTRACTION_FAILED);
        }

        setPhase("Transcribiendo", 60);
        const whisperResult = await runWhisperTranscription(audioPath, {
          language: options.language || "auto",
          workDir,
          timeoutMs: CONFIG.media.limits.conversionTimeoutSeconds * 1000,
          signal,
        });
        if (!whisperResult.success) {
          throw new Error(whisperResult.error || ERROR_MESSAGES.TRANSCRIPTION_FAILED);
        }
        srtContent = whisperResult.srtContent;
        vttContent = whisperResult.vttContent;
        txtContent = whisperResult.txtContent;
        languageLabel = (options.language || "auto") === "auto" ? "Detección automática" : (options.language as string);
      }
    }

    setPhase("Generando archivo", 90);
    const segments = srtContent ? parseSrt(srtContent) : [];
    let finalContent: string;
    switch (outputFormat) {
      case "srt":
        finalContent = srtContent ?? "";
        break;
      case "vtt":
        finalContent = vttContent !== undefined ? vttContent : await convertSrtToVtt(srtContent ?? "", workDir, signal);
        break;
      case "md":
        finalContent = buildTranscriptMarkdown(
          { title, source: url, durationLabel, language: languageLabel, processedAtIso: new Date().toISOString() },
          segments,
          includeTimestamps,
        );
        break;
      case "txt":
      default:
        finalContent = includeTimestamps
          ? buildTimestampedTxt(segments)
          : (txtContent && txtContent.length > 0 ? txtContent : segments.map((s) => s.text).join(" "));
        break;
    }

    fs.writeFileSync(outputPath, finalContent, "utf8");
    const stat = fs.statSync(outputPath);

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const fileName = sanitizeFilename(`${title || "transcripcion"}.${outputFormat}`) || `transcripcion.${outputFormat}`;

    jobManager.updateJob(jobId, {
      status: "completed",
      stage: "Completado",
      progress: 100,
      output_file_name: fileName,
      output_relative_path: path.relative(CONFIG.media.tempDir, outputPath),
      file_size_bytes: stat.size,
      mime_type: OUTPUT_MIME[outputFormat],
      download_token_hash: tokenHash,
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    if (abortController.signal.aborted) {
      jobManager.updateJob(jobId, { status: "cancelled", stage: "Cancelado", cancelled_at: new Date().toISOString() });
    } else {
      const message = err instanceof Error ? err.message : "Error interno.";
      jobManager.updateJob(jobId, {
        status: "failed",
        stage: "Error",
        error_message: message.slice(0, 500),
      });
    }
  } finally {
    clearAbortController(jobId);
    // Remove only the intermediate work dir (downloaded subtitles, audio.wav,
    // raw whisper txt/srt/vtt) — never the job dir itself, which still holds
    // output.<ext> for the /token and /download routes until TTL cleanup.
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}
