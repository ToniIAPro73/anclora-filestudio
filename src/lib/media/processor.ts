import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { CONFIG } from "../config";
import { jobManager } from "../jobs/job-manager";
import { buildYtdlpArgs, buildFfmpegAudioArgs, buildFfmpegVideoArgs } from "./command-builder";
import { parseProgress } from "./progress-parser";
import { probeFile, verifyMediaOutput, probeOutputFile, type MediaDescriptor } from "./probe";
import { sanitizeFilename } from "../security/sanitize-filename";
import { parseLegacyQualityString, VideoQualitySelection, VideoQualitySelectionSchema } from "../quality/quality-contract";
import { getVideoMetadata } from "./metadata";
import { AudioOutputFormat, VideoOutputFormat } from "../jobs/job-types";
import { createAppError, ERROR_MESSAGES, type AppError, type ErrorCode } from "../errors/error-codes";
import { checkDiskSpace } from "../jobs/disk-space-check";
import { classifyYtdlpFailure, sanitizeStderr, appendYtdlpErrorLog } from "./ytdlp-stderr-classifier";
import crypto from "crypto";

const AUDIO_FORMATS: AudioOutputFormat[] = ["mp3", "m4a", "wav", "flac", "ogg"];
const VIDEO_FORMATS: VideoOutputFormat[] = ["mp4", "webm", "mkv"];
const IMAGE_OUTPUT_FORMATS = ["gif", "jpg", "jpeg", "png"] as const;

/**
 * Resolves a quality value from the DB quality column.
 * The column may hold a JSON-serialized VideoQualitySelection (new path)
 * or a legacy string like "1080", "best", "5" (old path).
 * Returns VideoQualitySelection when parseable, otherwise the raw string.
 */
function resolveQuality(qualityStr: string): VideoQualitySelection | string {
  if (qualityStr.startsWith("{")) {
    try {
      const parsed = JSON.parse(qualityStr);
      const result = VideoQualitySelectionSchema.safeParse(parsed);
      if (result.success) return result.data;
    } catch {
      // fall through to legacy
    }
  }
  return qualityStr;
}

function getMimeType(format: string): string {
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav",
    flac: "audio/flac",
    ogg: "audio/ogg",
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    gif: "image/gif",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
  };
  return map[format] ?? "application/octet-stream";
}

export async function processJob(jobId: string) {
  const job = jobManager.getJob(jobId);
  if (!job) return;

  const outputFormat = job.output_format;
  const isAudio = AUDIO_FORMATS.includes(outputFormat as AudioOutputFormat);
  const isVideo = VIDEO_FORMATS.includes(outputFormat as VideoOutputFormat);
  const isImageOutput = IMAGE_OUTPUT_FORMATS.includes(outputFormat as (typeof IMAGE_OUTPUT_FORMATS)[number]);
  const extension = `.${outputFormat}`;

  const jobDir = path.join(CONFIG.media.tempDir, jobId);
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }

  const outputPath = path.join(jobDir, `output${extension}`);
  let inputDescriptor: MediaDescriptor | null = null;

  try {
    // Check disk space before processing
    const estimatedRequired = 100 * 1024 * 1024; // 100 MB estimate for media conversion
    const diskCheck = await checkDiskSpace(estimatedRequired, CONFIG.media.tempDir);
    if (!diskCheck.sufficient) {
      const err = createAppError("INSUFFICIENT_DISK_SPACE", diskCheck.message, { stage: "pre-processing" });
      jobManager.updateJob(jobId, {
        status: "failed",
        error_code: err.code,
        error_message: diskCheck.message,
        stage: "Error",
      });
      return;
    }

    if (job.input_kind === "remote-url") {
      await processRemoteUrl(jobId, job.input_reference, outputFormat, job.quality, outputPath);
    } else if (job.input_kind === "local-file") {
      const inputPath = path.join(CONFIG.media.tempDir, job.input_reference);
      inputDescriptor = await probeFile(inputPath);
      if (!inputDescriptor) {
        throw createAppError("INPUT_CORRUPTED", "El archivo de entrada está corrupto o no se puede leer.", {
          stage: "pre-processing",
        });
      }
      if (isAudio) {
        await processLocalAudio(jobId, inputPath, outputFormat as AudioOutputFormat, job.quality, outputPath);
      } else if (isVideo) {
        await processLocalVideo(jobId, inputPath, outputFormat as VideoOutputFormat, job.quality, outputPath);
      } else if (outputFormat === "gif") {
        await processLocalGif(jobId, inputPath, job.quality, outputPath);
      } else if (outputFormat === "jpg" || outputFormat === "jpeg" || outputFormat === "png") {
        await processLocalThumbnail(jobId, inputPath, outputFormat, outputPath);
      } else {
        const err = createAppError("INPUT_UNSUPPORTED", `Formato no soportado: ${outputFormat}`, { stage: "pre-processing" });
        jobManager.updateJob(jobId, {
          status: "failed",
          error_code: err.code,
          error_message: err.message,
          stage: "Error",
        });
        return;
      }
    } else {
      const err = createAppError("INPUT_UNSUPPORTED", "Tipo de entrada no soportado.", { stage: "pre-processing" });
      jobManager.updateJob(jobId, {
        status: "failed",
        error_code: err.code,
        error_message: err.message,
        stage: "Error",
      });
      return;
    }

    // Verify output
    jobManager.updateJob(jobId, {
      status: "verifying",
      stage: "Verificando archivo",
      progress: 95,
    });

    const stats = fs.statSync(outputPath);
    if (isImageOutput) {
      const verification = verifyImageOutput(outputPath, outputFormat);
      if (!verification.isValid) {
        const err = createAppError("ARTIFACT_VALIDATION_FAILED", "La verificación del archivo ha fallado.", {
          stage: "validation",
          technicalDetail: verification.reason,
        });
        jobManager.updateJob(jobId, {
          status: "failed",
          error_code: err.code,
          error_message: ERROR_MESSAGES[err.code],
          stage: "Error",
        });
        return;
      }
    } else {
      const mediaExpectation = {
        requireAudio: isAudio || job.operation === "extract-audio" || (isVideo && inputDescriptor?.hasAudio === true),
        requireVideo: isVideo,
        requireDuration: true,
      };
      const verification = await verifyMediaOutput(outputPath, mediaExpectation);
      if (!verification.isValid) {
        const technicalDetail = `expected audio=${mediaExpectation.requireAudio} video=${mediaExpectation.requireVideo}; actual audio=${verification.hasAudio} video=${verification.hasVideo}`;
      const err = createAppError("ARTIFACT_VALIDATION_FAILED", "La verificación del archivo ha fallado.", {
        stage: "validation",
        technicalDetail,
      });
        jobManager.updateJob(jobId, {
          status: "failed",
          error_code: err.code,
          error_message: ERROR_MESSAGES[err.code],
          stage: "Error",
        });
        return;
      }
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Compute safe relative path for the output
    const relOutputPath = path.relative(CONFIG.media.tempDir, outputPath);

    // Retrieve title for filename
    const currentJob = jobManager.getJob(jobId);
    const titleBase = currentJob?.input_title
      ? sanitizeFilename(currentJob.input_title)
      : `output_${jobId.substring(0, 8)}`;
    const finalFileName = `${titleBase}${extension}`;

    jobManager.updateJob(jobId, {
      status: "completed",
      stage: "Completado",
      progress: 100,
      file_size_bytes: stats.size,
      mime_type: getMimeType(outputFormat),
      download_token_hash: tokenHash,
      output_file_name: finalFileName,
      output_relative_path: relOutputPath,
      completed_at: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const appError = error as AppError;
    const isClassifiedAppError = error instanceof Error && error.name === "AppError";
    const code: ErrorCode = appError?.code ?? "ENGINE_EXECUTE_FAILED";
    // Prefer the error's own message when it's a real, classified AppError —
    // createAppError() always sets a specific, user-safe reason there. Any
    // other thrown value (e.g. a raw Node ENOENT, which also happens to have
    // a `.code`) falls back to the generic per-code catalog instead of
    // leaking its technical message (which can contain local file paths).
    const message = isClassifiedAppError && appError?.message
      ? appError.message
      : (ERROR_MESSAGES[code] ?? "Error interno del procesador.");
    const technicalDetail =
      appError?.technicalDetail ??
      (error instanceof Error ? error.message : String(error));
    console.error(
      `[legacy-media] Job ${jobId} failed code=${code} stage=${appError?.stage ?? "unknown"} detail=${redactMediaError(technicalDetail)}`,
    );
    jobManager.updateJob(jobId, {
      status: "failed",
      error_code: code,
      error_message: message,
      stage: "Error",
    });
  }
}

function redactMediaError(message: string): string {
  return message.replace(/\/[^\s"',:;)]+/g, (m) => {
    const parts = m.split("/");
    return parts.length > 3 ? `/.../${parts.slice(-2).join("/")}` : m;
  }).slice(0, 500);
}

async function processRemoteUrl(
  jobId: string,
  inputReference: string,
  outputFormat: string,
  quality: string,
  outputPath: string
): Promise<void> {
  // inputReference is the full URL or videoId
  const url = inputReference.startsWith("http")
    ? inputReference
    : `https://www.youtube.com/watch?v=${inputReference}`;

  const metadata = await getVideoMetadata(url);

  jobManager.updateJob(jobId, {
    status: "downloading",
    stage: "Descargando y convirtiendo",
    started_at: new Date().toISOString(),
  });

  // Update job title if not set
  const currentJob = jobManager.getJob(jobId);
  if (!currentJob?.input_title && metadata.title) {
    jobManager.updateJob(jobId, {
      output_file_name: sanitizeFilename(metadata.title) + `.${outputFormat}`,
    });
  }

  const resolvedQuality = resolveQuality(quality);

  const args = buildYtdlpArgs({
    url,
    format: outputFormat as AudioOutputFormat | VideoOutputFormat,
    quality: resolvedQuality,
    outputPath,
    ffmpegLocation: path.dirname(CONFIG.media.binaries.ffmpeg),
  });

  await runProcess(CONFIG.media.binaries.ytdlp, args, jobId);
  await ensureOutputAtPath(outputPath, CONFIG.media.binaries.ffmpeg);

  // Probe output for quality verification (video jobs only)
  const isVideoOutputFormat = ["mp4", "webm", "mkv"].includes(outputFormat);
  if (isVideoOutputFormat) {
    try {
      const probe = await probeOutputFile(outputPath, CONFIG.media.binaries.ffprobe);

      // Determine requested quality selection
      let requestedSelection: VideoQualitySelection | null = null;
      try {
        if (typeof resolvedQuality !== "string") {
          requestedSelection = resolvedQuality;
        } else {
          requestedSelection = parseLegacyQualityString(resolvedQuality, outputFormat);
        }
      } catch {
        // Audio bitrate string or uninterpretable quality — skip quality check
        requestedSelection = null;
      }

      if (
        requestedSelection !== null &&
        requestedSelection.resolutionLimit !== "max" &&
        requestedSelection.fallbackPolicy === "reject" &&
        probe.height !== null &&
        typeof requestedSelection.resolutionLimit === "number" &&
        probe.height < requestedSelection.resolutionLimit * 0.9
      ) {
        jobManager.updateJob(jobId, {
          status: "failed",
          error_code: "QUALITY_NOT_DELIVERED",
          error_message: `Resolución entregada (${probe.height}p) inferior a la solicitada (${requestedSelection.resolutionLimit}p). El vídeo puede no tener ese formato disponible.`,
          stage: "Error",
        });
        return;
      }

      // Log probe results for diagnostics
      console.info(
        `[probe] jobId=${jobId} height=${probe.height} fps=${probe.fps} videoCodec=${probe.videoCodec} audioCodec=${probe.audioCodec} container=${probe.container} duration=${probe.durationSeconds}s size=${probe.fileSizeBytes}B`
      );
    } catch (probeErr) {
      // Non-fatal: probe failure should not block a completed download
      console.warn("[probe] probeOutputFile failed (non-fatal):", probeErr);
    }
  }
}

async function processLocalAudio(
  jobId: string,
  inputPath: string,
  format: AudioOutputFormat,
  quality: string,
  outputPath: string
): Promise<void> {
  jobManager.updateJob(jobId, {
    status: "processing",
    stage: "Convirtiendo audio",
    started_at: new Date().toISOString(),
  });

  const args = buildFfmpegAudioArgs({ inputPath, outputPath, format, quality });
  await runProcess(CONFIG.media.binaries.ffmpeg, args, jobId);
}

async function processLocalVideo(
  jobId: string,
  inputPath: string,
  format: VideoOutputFormat,
  quality: string,
  outputPath: string
): Promise<void> {
  jobManager.updateJob(jobId, {
    status: "processing",
    stage: "Convirtiendo vídeo",
    started_at: new Date().toISOString(),
  });

  const args = buildFfmpegVideoArgs({ inputPath, outputPath, format, quality });
  await runProcess(CONFIG.media.binaries.ffmpeg, args, jobId);
}

async function processLocalGif(
  jobId: string,
  inputPath: string,
  quality: string,
  outputPath: string
): Promise<void> {
  jobManager.updateJob(jobId, {
    status: "processing",
    stage: "Creando GIF",
    started_at: new Date().toISOString(),
  });

  const width = Number.parseInt(quality, 10);
  const scaleWidth = Number.isFinite(width) && width > 0 ? width : 480;
  const args = [
    "-y",
    "-i", inputPath,
    "-t", "10",
    "-vf", `fps=10,scale=${scaleWidth}:-1:flags=lanczos`,
    "-loop", "0",
    outputPath,
  ];
  await runProcess(CONFIG.media.binaries.ffmpeg, args, jobId);
}

async function processLocalThumbnail(
  jobId: string,
  inputPath: string,
  format: string,
  outputPath: string
): Promise<void> {
  jobManager.updateJob(jobId, {
    status: "processing",
    stage: "Extrayendo miniatura",
    started_at: new Date().toISOString(),
  });

  const codecArgs = format === "png" ? ["-frames:v", "1"] : ["-frames:v", "1", "-q:v", "2"];
  const args = ["-y", "-ss", "0", "-i", inputPath, ...codecArgs, outputPath];
  await runProcess(CONFIG.media.binaries.ffmpeg, args, jobId);
}

function verifyImageOutput(outputPath: string, outputFormat: string): { isValid: boolean; reason?: string } {
  const bytes = fs.readFileSync(outputPath);
  if (bytes.length === 0) return { isValid: false, reason: "empty output" };
  if (outputFormat === "gif") {
    return { isValid: bytes.subarray(0, 3).toString("ascii") === "GIF" };
  }
  if (outputFormat === "jpg" || outputFormat === "jpeg") {
    return { isValid: bytes[0] === 0xff && bytes[1] === 0xd8 };
  }
  if (outputFormat === "png") {
    return { isValid: bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) };
  }
  return { isValid: false, reason: `unsupported image output ${outputFormat}` };
}

function runProcess(
  binary: string,
  args: string[],
  jobId: string
): Promise<void> {
  const isYtdlp = binary === CONFIG.media.binaries.ytdlp;

  return new Promise((resolve, reject) => {
    const proc = spawn(binary, args, {
      shell: false,
      windowsHide: true,
      timeout: CONFIG.media.limits.conversionTimeoutSeconds * 1000,
    });

    let stderrBuffer = "";

    proc.stdout.on("data", (data: Buffer) => {
      const line = data.toString();
      const progress = parseProgress(line);
      if (progress !== null) {
        jobManager.updateJob(jobId, { progress: Math.min(progress, 90) });
      }
    });

    // ffmpeg outputs to stderr; yt-dlp also emits errors there — capture the
    // full text so a failure can be classified instead of just logging an
    // opaque exit code.
    proc.stderr.on("data", (data: Buffer) => {
      const line = data.toString();
      stderrBuffer += line;
      const progress = parseProgress(line);
      if (progress !== null) {
        jobManager.updateJob(jobId, { progress: Math.min(progress, 90) });
      }
    });

    proc.on("close", (code: number | null) => {
      if (code !== 0) {
        const sanitized = sanitizeStderr(stderrBuffer);
        console.error(
          `[processor] ${path.basename(binary)} exited (code=${code ?? "killed"}) job=${jobId}`,
          sanitized
        );

        if (isYtdlp) {
          const category = classifyYtdlpFailure(stderrBuffer, code);
          appendYtdlpErrorLog({
            ts: new Date().toISOString(),
            cmd: `${path.basename(binary)} ${args.join(" ")}`,
            exitCode: code,
            stderr: sanitized,
          });
          reject(createAppError("ENGINE_EXECUTE_FAILED", category.message, {
            stage: "execution",
            technicalDetail: sanitized,
          }));
          return;
        }

        const err = createAppError("ENGINE_EXECUTE_FAILED", `Proceso finalizado con código ${code}`, {
          stage: "execution",
          technicalDetail: sanitized,
        });
        reject(err);
        return;
      }
      resolve();
    });

    proc.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(createAppError("TOOL_NOT_AVAILABLE", "Dependencia no encontrada. Comprueba que yt-dlp y ffmpeg están disponibles.", {
          stage: "execution",
        }));
      } else {
        reject(createAppError("ENGINE_EXECUTE_FAILED", err.message, {
          stage: "execution",
          cause: err,
        }));
      }
    });
  });
}

/**
 * yt-dlp can rewrite the requested extension when a merge/extraction lands
 * in a different container than the literal outputPath implied — e.g. the
 * "source-max" video quality profile always merges into mkv, which yt-dlp
 * then uses as the REAL file extension even though outputPath ends in
 * .mp4. Left unhandled, the later fs.statSync(outputPath) throws a raw
 * ENOENT with a full local path. Detect that case and remux (stream copy,
 * no re-encode) into the exact path the rest of the pipeline expects.
 */
async function ensureOutputAtPath(outputPath: string, ffmpegBinary: string): Promise<void> {
  if (fs.existsSync(outputPath)) return;

  const jobDir = path.dirname(outputPath);
  const expectedName = path.basename(outputPath);
  const baseName = path.basename(outputPath, path.extname(outputPath));
  const siblings = fs
    .readdirSync(jobDir)
    .filter((f) => f !== expectedName && f.startsWith(baseName));

  if (siblings.length !== 1) {
    throw createAppError(
      "ENGINE_EXECUTE_FAILED",
      "La conversión no generó el archivo esperado. Prueba con el perfil de calidad 'MP4 compatible'.",
      {
        stage: "verify-output",
        technicalDetail: `expected ${expectedName} in ${jobDir}, found: ${siblings.join(", ") || "nothing"}`,
      }
    );
  }

  await remuxToPath(path.join(jobDir, siblings[0]), outputPath, ffmpegBinary);
}

function remuxToPath(fromPath: string, toPath: string, ffmpegBinary: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBinary, ["-y", "-i", fromPath, "-c", "copy", toPath], {
      shell: false,
      windowsHide: true,
    });

    proc.on("close", (code: number | null) => {
      fs.rmSync(fromPath, { force: true });
      if (code !== 0 || !fs.existsSync(toPath)) {
        reject(
          createAppError(
            "ENGINE_EXECUTE_FAILED",
            "El vídeo se descargó pero no se pudo empaquetar en el formato solicitado (códec no compatible). Prueba con el perfil de calidad 'MP4 compatible'.",
            { stage: "remux" }
          )
        );
        return;
      }
      resolve();
    });

    proc.on("error", () => {
      reject(createAppError("TOOL_NOT_AVAILABLE", "No se pudo ejecutar ffmpeg para finalizar la conversión.", { stage: "remux" }));
    });
  });
}
