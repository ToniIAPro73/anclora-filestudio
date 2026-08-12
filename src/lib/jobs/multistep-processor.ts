// Multistep Job Processor — executes a bounded conversion route (up to 2
// intermediate formats) step by step, chaining engines inside an isolated
// job directory. Mirrors processUniversalJob's orchestration: recover job,
// resolve engine per step, execute, validate, persist — completed ONLY after
// the final artifact passes validation.

import path from "path";
import fs from "fs";
import crypto from "crypto";
import type { ConversionPlan, ExecutionResult } from "../domain/engines";
import type { FileCategory, LossProfile } from "../domain/descriptors";
import type { LossProfile as OperationLossProfile } from "../domain/operations";
import { getCapabilities, getEngine } from "../engines/registry";
import { jobManager } from "./job-manager";
import { CONFIG } from "../config";
import { ensurePathSafety } from "../security/path-safety";
import { FORMAT_BY_EXTENSION } from "../domain/format-catalog";
import { buildDescriptor } from "../detection/file-detector";
import {
  createAppError,
  type AppError,
  type ErrorCode,
} from "../errors/error-codes";
import { checkDiskSpace } from "./disk-space-check";
import { coordinatedCleanup } from "./coordinated-cleanup";
import {
  buildConvertedOutputFileName,
  buildUserErrorMessage,
  getOutputMimeType,
  validateOutputArtifact,
} from "./universal-job-processor";

// ── Route spec stored in the job's options_json ───────────────────────────────

export interface MultistepRouteStep {
  source: string;
  target: string;
  operationId: string;
  engineId: string;
  lossProfile?: OperationLossProfile;
}

export interface MultistepRouteSpec {
  destination: string;
  steps: MultistepRouteStep[];
}

/** Reads the multistep route spec from a job's options_json, if present. */
export function extractMultistepRoute(optionsJson: string | null): MultistepRouteSpec | null {
  if (!optionsJson) return null;
  try {
    const options = JSON.parse(optionsJson) as { multistepRoute?: MultistepRouteSpec };
    const route = options.multistepRoute;
    if (!route || typeof route.destination !== "string" || !Array.isArray(route.steps)) {
      return null;
    }
    if (route.steps.length === 0) return null;
    for (const step of route.steps) {
      if (
        typeof step?.source !== "string" ||
        typeof step?.target !== "string" ||
        typeof step?.engineId !== "string"
      ) {
        return null;
      }
    }
    return route;
  } catch {
    return null;
  }
}

// ── Log redaction (same approach as universal-job-processor) ──────────────────

function redact(message: string): string {
  return message.replace(/\/[^\s"',:;)]+/g, (m) => {
    const parts = m.split("/");
    return parts.length > 3 ? `/.../${parts.slice(-2).join("/")}` : m;
  });
}

// ── Main processor ────────────────────────────────────────────────────────────

export async function processMultistepJob(jobId: string): Promise<void> {
  const log: string[] = [];
  let failedStepLabel: string | null = null;

  try {
    // 1. Recover job from DB
    const job = jobManager.getJob(jobId);
    if (!job) {
      throw createAppError("JOB_NOT_FOUND", `Job ${jobId} not found`, {
        stage: "recovery",
      });
    }
    if (job.status !== "queued") {
      throw createAppError(
        "INVALID_STATE",
        `Job ${jobId} is not queued (status: ${job.status})`,
        { stage: "recovery" },
      );
    }

    // 2. Recover the route spec stored at job creation
    const route = extractMultistepRoute(job.options_json);
    if (!route) {
      throw createAppError(
        "MISSING_CONVERSION_ID",
        `Job ${jobId} has no multistep route in its options`,
        { stage: "recovery" },
      );
    }
    const totalSteps = route.steps.length;
    log.push(`[multistep-job] Starting job ${jobId} with ${totalSteps} steps`);

    // 3. Get input file path
    const inputPath = resolveInputPath(job.input_reference, job.input_kind);
    if (!fs.existsSync(inputPath)) {
      throw createAppError("INPUT_NOT_FOUND", `Input file not found`, {
        stage: "recovery",
        technicalDetail: `Input not found at ${redact(inputPath)}`,
      });
    }

    jobManager.updateJob(jobId, {
      status: "processing",
      stage: `Preparando conversión en ${totalSteps} pasos`,
      progress: 5,
      started_at: new Date().toISOString(),
    });

    // 4. Disk space check (estimate generous margin for chained artifacts)
    const inputStat = fs.statSync(inputPath);
    const estimatedRequired = inputStat.size * 2 * totalSteps;
    const diskCheck = await checkDiskSpace(estimatedRequired, CONFIG.media.tempDir);
    if (!diskCheck.sufficient) {
      throw createAppError("INSUFFICIENT_DISK_SPACE", diskCheck.message, {
        stage: "pre-execution",
      });
    }

    // 5. Isolated working directory — intermediates live here so the
    //    existing coordinatedCleanup handles them (AC-FN-008)
    const jobDir = path.join(CONFIG.media.tempDir, jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    // 6. Execute each step in order
    let lastEngineId: string | null = null;
    let lastEngineVersion: string | null = null;
    let lastDurationMs = 0;
    let finalOutputPath = path.join(jobDir, `output.${route.destination}`);
    const allWarnings: string[] = [];

    for (let i = 0; i < totalSteps; i++) {
      const step = route.steps[i];
      const isFinal = i === totalSteps - 1;
      failedStepLabel = `${i + 1} de ${totalSteps} (${step.source} → ${step.target})`;

      const stepInputPath =
        i === 0 ? inputPath : path.join(jobDir, `step-${i}.${route.steps[i - 1].target}`);
      // Final step uses the canonical output name so token/download/naming
      // behave exactly like a single-step job (AC-FN-009)
      const stepOutputPath = isFinal
        ? path.join(jobDir, `output.${route.destination}`)
        : path.join(jobDir, `step-${i + 1}.${step.target}`);

      try {
        ensurePathSafety(stepOutputPath);
      } catch (err) {
        throw createAppError("UNSAFE_PATH", `Output path safety check failed`, {
          stage: "pre-execution",
          engineId: step.engineId,
          technicalDetail: String(err),
        });
      }

      // Re-validate the step capability against the registry
      const descriptor = await buildDescriptor(
        stepInputPath,
        {
          kind: "local-upload",
          originalName: path.basename(stepInputPath),
          storedRelativePath: path.relative(CONFIG.media.tempDir, stepInputPath),
        },
        `${jobId}-step-${i + 1}`,
      );
      const capabilities = await getCapabilities(descriptor);
      const matchingCap = capabilities.find(
        (cap) =>
          cap.engineId === step.engineId &&
          cap.outputFormat === step.target &&
          (cap.state === "available" || cap.state === "experimental"),
      );
      if (!matchingCap) {
        throw createAppError(
          "ENGINE_UNAVAILABLE",
          `No available capability for step ${failedStepLabel}`,
          {
            stage: "engine-resolution",
            engineId: step.engineId,
            technicalDetail: `Step ${failedStepLabel}: no capability for engine ${step.engineId} → ${step.target}`,
          },
        );
      }

      const engine = getEngine(step.engineId);
      if (!engine) {
        throw createAppError("ENGINE_NOT_FOUND", `Engine not found`, {
          stage: "engine-resolution",
          engineId: step.engineId,
        });
      }
      const probeResult = await engine.probe();
      if (!probeResult.available) {
        throw createAppError("ENGINE_UNAVAILABLE", `Engine is not available`, {
          stage: "engine-resolution",
          engineId: step.engineId,
          technicalDetail: probeResult.error ?? "unknown error",
        });
      }
      lastEngineId = step.engineId;
      lastEngineVersion = probeResult.version ?? null;

      const plan: ConversionPlan = {
        jobId,
        engineId: engine.id,
        operation: matchingCap.operation,
        inputPath: stepInputPath,
        outputPath: stepOutputPath,
        outputFormat: step.target,
        options: { inputFormat: step.source },
        args: [],
        env: {},
        timeoutMs: CONFIG.media.limits.conversionTimeoutSeconds * 1000,
        estimatedSizeBytes: estimatedRequired,
      };

      const stageLabel = `Paso ${i + 1} de ${totalSteps} · ${step.source.toUpperCase()} → ${step.target.toUpperCase()}`;
      const onProgress = (progress: number) => {
        const overall = ((i + progress / 100) / totalSteps) * 100;
        jobManager.updateJob(jobId, {
          progress: Math.min(Math.max(overall, 5), 90),
          stage: stageLabel,
        });
      };
      jobManager.updateJob(jobId, { progress: Math.max((i / totalSteps) * 100, 5), stage: stageLabel });

      let result: ExecutionResult;
      try {
        result = await engine.execute(plan, onProgress);
      } catch (err) {
        throw createAppError("ENGINE_EXECUTE_FAILED", `Engine execution failed`, {
          stage: "execution",
          engineId: step.engineId,
          technicalDetail: `Step ${failedStepLabel}: ${redact(String(err))}`,
          cause: err instanceof Error ? err : undefined,
        });
      }

      if (!result.success) {
        const logSummary = result.logs
          .filter(Boolean)
          .map((l) => l.trim().slice(0, 200))
          .join(" | ");
        const detail = result.error
          ? `${result.error}${logSummary ? ` [logs: ${logSummary}]` : ""}`
          : logSummary || "unknown error";
        throw createAppError("ENGINE_EXECUTE_FAILED", `Engine execution failed`, {
          stage: "execution",
          engineId: step.engineId,
          technicalDetail: `Step ${failedStepLabel}: ${redact(detail)}`,
        });
      }

      const actualStepOutputPath = result.outputPath || stepOutputPath;
      if (!isFinal && actualStepOutputPath !== stepOutputPath) {
        throw createAppError(
          "ENGINE_EXECUTE_FAILED",
          `Intermediate step returned an unexpected output path`,
          {
            stage: "execution",
            engineId: step.engineId,
            technicalDetail: `Step ${failedStepLabel}: expected ${redact(stepOutputPath)}, got ${redact(actualStepOutputPath)}`,
          },
        );
      }
      if (!fs.existsSync(actualStepOutputPath) || fs.statSync(actualStepOutputPath).size === 0) {
        throw createAppError(
          "ENGINE_EXECUTE_FAILED",
          `Engine reported success but step output is missing or empty`,
          {
            stage: "execution",
            engineId: step.engineId,
            technicalDetail: `Step ${failedStepLabel}: output missing/empty at ${redact(actualStepOutputPath)}`,
          },
        );
      }
      if (isFinal) {
        finalOutputPath = actualStepOutputPath;
      }

      lastDurationMs += result.durationMs;
      allWarnings.push(...result.warnings);
      log.push(`[multistep-job] Step ${i + 1}/${totalSteps} done (${step.engineId}, ${result.durationMs}ms)`);
    }

    // 7. Validate the final artifact (engine validation + deep validation)
    jobManager.updateJob(jobId, {
      status: "verifying",
      stage: "Verificando archivo de salida",
      progress: 95,
    });

    const finalStep = route.steps[totalSteps - 1];
    const finalEngine = getEngine(finalStep.engineId);
    if (finalEngine) {
      const validation = await finalEngine.validate(finalOutputPath, {
        jobId,
        engineId: finalEngine.id,
        operation: finalStep.operationId,
        inputPath: finalOutputPath,
        outputPath: finalOutputPath,
        outputFormat: route.destination,
        options: { inputFormat: finalStep.source },
        args: [],
        env: {},
        timeoutMs: CONFIG.media.limits.conversionTimeoutSeconds * 1000,
        estimatedSizeBytes: estimatedRequired,
      });
      if (!validation.valid) {
        const failedChecks = validation.checks
          .filter((c) => !c.passed)
          .map((c) => `${c.name}: ${c.detail ?? "failed"}`)
          .join("; ");
        throw createAppError("VALIDATION_FAILED", `Output validation failed`, {
          stage: "validation",
          engineId: finalStep.engineId,
          technicalDetail: failedChecks,
        });
      }
    }

    const finalOutputFormat = path.extname(finalOutputPath).toLowerCase() === ".zip" ? "zip" : route.destination;
    const deepValidation = validateOutputArtifact(finalOutputPath, finalOutputFormat);
    if (!deepValidation.valid) {
      throw createAppError("ARTIFACT_VALIDATION_FAILED", `Deep validation failed`, {
        stage: "validation",
        engineId: finalStep.engineId,
        technicalDetail: deepValidation.error ?? "unknown",
      });
    }

    log.push(`[multistep-job] Validation passed`);

    // 8. Persist metadata + download token (same contract as universal jobs)
    const outputMime = getOutputMimeType(finalOutputFormat);
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const relOutputPath = path.relative(CONFIG.media.tempDir, finalOutputPath);

    const currentJob = jobManager.getJob(jobId);
    const finalFileName = buildConvertedOutputFileName(
      currentJob?.input_title,
      jobId,
      finalOutputFormat,
    );

    const category = (FORMAT_BY_EXTENSION.get(finalOutputFormat)?.category ??
      "unknown") as FileCategory;

    jobManager.updateJob(jobId, {
      status: "completed",
      stage: "Completado",
      progress: 100,
      file_size_bytes: fs.statSync(finalOutputPath).size,
      mime_type: outputMime,
      download_token_hash: tokenHash,
      output_file_name: finalFileName,
      output_relative_path: relOutputPath,
      completed_at: new Date().toISOString(),
      category,
      engine_id: lastEngineId,
      engine_version: lastEngineVersion,
      output_mime_type: outputMime,
      loss_profile: routeLossProfile(route),
      validation_json: JSON.stringify({ deepValidation: deepValidation.checks }),
      warnings_json: allWarnings.length > 0 ? JSON.stringify(allWarnings) : null,
    });

    log.push(`[multistep-job] Job ${jobId} completed in ${lastDurationMs}ms across ${totalSteps} steps`);

    coordinatedCleanup().catch((err) => {
      console.error("[multistep-job] Post-job cleanup error:", redact(String(err)));
    });

    for (const msg of log) {
      console.log(redact(msg));
    }
  } catch (error: unknown) {
    const appError = error as AppError;
    const code: ErrorCode = appError?.code ?? "ENGINE_EXECUTE_FAILED";
    const message =
      error instanceof Error ? error.message : "Error interno del procesador.";
    const engineId = appError?.engineId ?? "unknown";
    const technicalDetail =
      appError?.technicalDetail ??
      (error instanceof Error ? error.message : "");

    const userMessage = buildUserErrorMessage(code, technicalDetail, engineId);

    jobManager.updateJob(jobId, {
      status: "failed",
      error_code: code,
      error_message: userMessage,
      stage: failedStepLabel ? `Error en paso ${failedStepLabel}` : "Error",
    });

    const logEntry = [
      `[multistep-job] Job ${jobId} FAILED`,
      `  step: ${failedStepLabel ?? "n/a"}`,
      `  engine: ${engineId}`,
      `  code: ${code}`,
      `  message: ${redact(message)}`,
      technicalDetail ? `  detail: ${redact(technicalDetail).slice(0, 500)}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    log.push(logEntry);
    for (const msg of log) {
      console.error(redact(msg));
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveInputPath(inputReference: string, inputKind: string): string {
  if (inputKind === "local-file" || inputKind === "universal-file") {
    return path.resolve(CONFIG.media.tempDir, inputReference);
  }
  return inputReference;
}

/** Worst loss profile across the route, mapped to the descriptor LossProfile. */
function routeLossProfile(route: MultistepRouteSpec): LossProfile {
  const MAP: Record<OperationLossProfile, LossProfile> = {
    lossless: "lossless",
    "lossy-controlled": "lossy",
    lossy: "lossy",
    "structural-risk": "structure-risk",
  };
  const RANK: Record<OperationLossProfile, number> = {
    lossless: 0,
    "lossy-controlled": 1,
    lossy: 2,
    "structural-risk": 3,
  };
  let worst: OperationLossProfile = "lossless";
  for (const step of route.steps) {
    const lp = step.lossProfile ?? "lossy";
    if (RANK[lp] > RANK[worst]) worst = lp;
  }
  return MAP[worst];
}
