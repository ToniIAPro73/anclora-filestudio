// Multistep Job Processor — executes a bounded ranked conversion route (up to 2
// intermediate formats) with controlled fallback and structured observability.

import path from "path";
import fs from "fs";
import crypto from "crypto";
import type { ConversionPlan } from "../domain/engines";
import type { FileCategory, LossProfile } from "../domain/descriptors";
import type { LossProfile as OperationLossProfile } from "../domain/operations";
import type { RouteReasonCode } from "../conversion-routing";
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
import { selectFallbackRoute } from "./fallback-policy";
import {
  elapsedMs,
  mapAppErrorCode,
  nowIso,
  redactPathLike,
  routeEngines,
  serializeExecutionError,
  stepRouteEdgeId,
  type ConversionAttemptMetadata,
  type ConversionExecutionMetadata,
  type ExecutionEvent,
  type SafeExecutionError,
  type StepExecutionMetadata,
} from "./execution-observability";
import {
  buildConvertedOutputFileName,
  buildUserErrorMessage,
  getOutputMimeType,
  validateOutputArtifact,
} from "./universal-job-processor";

export interface MultistepRouteStep {
  source: string;
  target: string;
  operationId: string;
  engineId: string;
  lossProfile?: OperationLossProfile;
}

export interface MultistepRouteSpec {
  destination: string;
  routeId?: string;
  routeScore?: number;
  qualityBand?: string;
  routeReasons?: RouteReasonCode[];
  steps: MultistepRouteStep[];
}

interface MultistepJobOptions {
  multistepRoute?: MultistepRouteSpec;
  rankedRoutes?: MultistepRouteSpec[];
  executionTestOverrides?: {
    failRoutes?: Record<string, { code?: string; message?: string; engineId?: string }>;
  };
}

interface AttemptOutcome {
  success: boolean;
  attempt: ConversionAttemptMetadata;
  events: ExecutionEvent[];
  route: RequiredRouteSpec;
  finalOutputPath?: string;
  finalOutputFormat?: string;
  lastEngineId?: string | null;
  lastEngineVersion?: string | null;
  durationMs: number;
  warnings: string[];
  failure?: SafeExecutionError;
  appErrorCode?: ErrorCode;
  appErrorMessage?: string;
}

type RequiredRouteSpec = MultistepRouteSpec & {
  routeId: string;
  routeScore: number;
  qualityBand: string;
  routeReasons: RouteReasonCode[];
};

export function extractMultistepRoute(optionsJson: string | null): MultistepRouteSpec | null {
  const options = parseOptions(optionsJson);
  return normalizeRouteSpec(options?.multistepRoute ?? null);
}

export function extractRankedMultistepRoutes(optionsJson: string | null): MultistepRouteSpec[] {
  const options = parseOptions(optionsJson);
  const routes = Array.isArray(options?.rankedRoutes) ? options.rankedRoutes : [];
  return routes.map((route) => normalizeRouteSpec(route)).filter((route): route is MultistepRouteSpec => route !== null);
}

export async function processMultistepJob(jobId: string): Promise<void> {
  const log: string[] = [];
  let failedStepLabel: string | null = null;
  let metadata: ConversionExecutionMetadata | null = null;
  let jobDir: string | null = null;

  try {
    const job = jobManager.getJob(jobId);
    if (!job) throw createAppError("JOB_NOT_FOUND", `Job ${jobId} not found`, { stage: "recovery" });
    if (job.status !== "queued") {
      throw createAppError("INVALID_STATE", `Job ${jobId} is not queued (status: ${job.status})`, { stage: "recovery" });
    }

    const primary = requireRoute(extractMultistepRoute(job.options_json));
    const rankedFromOptions = extractRankedMultistepRoutes(job.options_json).map(requireRoute);
    const rankedRoutes = uniqueRoutes(rankedFromOptions.length > 0 ? rankedFromOptions : [primary]);
    const selectedRoute = rankedRoutes.find((route) => route.routeId === primary.routeId) ?? rankedRoutes[0]!;
    const totalSteps = selectedRoute.steps.length;
    const options = parseOptions(job.options_json);

    log.push(`[multistep-job] Starting job ${jobId} with ${totalSteps} steps`);

    const inputPath = resolveInputPath(job.input_reference, job.input_kind);
    if (!fs.existsSync(inputPath)) {
      throw createAppError("INPUT_NOT_FOUND", "Input file not found", {
        stage: "recovery",
        technicalDetail: `Input not found at ${redact(inputPath)}`,
      });
    }

    const startedAt = nowIso();
    const startedAtMs = performance.now();
    metadata = {
      conversionId: jobId,
      sourceFormat: selectedRoute.steps[0]?.source ?? job.input_format ?? "unknown",
      targetFormat: selectedRoute.destination,
      selectedRouteId: selectedRoute.routeId,
      selectedRouteScore: selectedRoute.routeScore,
      selectedQualityBand: selectedRoute.qualityBand,
      routeReasons: selectedRoute.routeReasons,
      fallbackUsed: false,
      attemptCount: 0,
      finalStatus: "failed",
      startedAt,
      attempts: [],
      events: [],
    };
    emit(metadata, { event: "conversion.started", conversionId: jobId, at: startedAt });
    emit(metadata, {
      event: "conversion.route.selected",
      conversionId: jobId,
      routeId: selectedRoute.routeId,
      at: nowIso(),
    });

    jobManager.updateJob(jobId, {
      status: "processing",
      stage: `Preparando conversión en ${totalSteps} pasos`,
      progress: 5,
      started_at: startedAt,
    });

    const inputStat = fs.statSync(inputPath);
    const estimatedRequired = inputStat.size * 2 * totalSteps;
    const diskCheck = await checkDiskSpace(estimatedRequired, CONFIG.media.tempDir);
    if (!diskCheck.sufficient) {
      throw createAppError("INSUFFICIENT_DISK_SPACE", diskCheck.message, { stage: "pre-execution" });
    }

    jobDir = path.join(CONFIG.media.tempDir, jobId);
    resetAttemptDirectory(jobDir);

    const attemptedRouteIds = new Set<string>();
    let currentRoute: RequiredRouteSpec | null = selectedRoute;
    let attemptIndex = 0;
    let finalOutcome: AttemptOutcome | null = null;

    while (currentRoute) {
      attemptIndex += 1;
      attemptedRouteIds.add(currentRoute.routeId);
      const outcome = await executeRouteAttempt({
        jobId,
        jobDir,
        inputPath,
        route: currentRoute,
        attemptIndex,
        estimatedRequired,
        log,
        setFailedStepLabel: (label) => { failedStepLabel = label; },
        testOverride: options?.executionTestOverrides?.failRoutes?.[currentRoute.routeId],
      });
      metadata.attempts.push(outcome.attempt);
      metadata.events.push(...outcome.events);
      metadata.attemptCount = metadata.attempts.length;

      if (outcome.success) {
        finalOutcome = outcome;
        break;
      }

      emit(metadata, {
        event: "conversion.attempt.failed",
        conversionId: jobId,
        routeId: currentRoute.routeId,
        attemptIndex,
        status: "failed",
        errorCode: outcome.failure?.code,
        durationMs: outcome.durationMs,
        at: nowIso(),
      });

      const decision = selectFallbackRoute({
        rankedRoutes,
        failedRoute: currentRoute,
        failedAttemptIndex: attemptIndex,
        failure: outcome.failure!,
        attemptedRouteIds,
      });
      if (!decision.allowed || !decision.route) {
        finalOutcome = outcome;
        break;
      }

      metadata.fallbackUsed = true;
      metadata.fallbackReason = decision.reasons.join(",");
      emit(metadata, {
        event: "conversion.fallback.selected",
        conversionId: jobId,
        routeId: decision.route.routeId,
        attemptIndex: attemptIndex + 1,
        at: nowIso(),
      });
      log.push(
        JSON.stringify({
          event: "conversion.fallback.selected",
          conversionId: jobId,
          primaryRouteId: currentRoute.routeId,
          fallbackRouteId: decision.route.routeId,
          fallbackReasons: decision.reasons,
        }),
      );
      resetAttemptDirectory(jobDir);
      currentRoute = requireRoute(decision.route as MultistepRouteSpec);
    }

    if (!finalOutcome) throw createAppError("ENGINE_EXECUTE_FAILED", "No route attempt executed", { stage: "execution" });

    if (!finalOutcome.success) {
      metadata.finalStatus = finalOutcome.failure?.class === "CANCELLED" ? "cancelled" : "failed";
      metadata.finalRouteId = finalOutcome.route.routeId;
      metadata.completedAt = nowIso();
      metadata.durationMs = elapsedMs(startedAtMs);
      emit(metadata, {
        event: metadata.finalStatus === "cancelled" ? "conversion.cancelled" : "conversion.failed",
        conversionId: jobId,
        routeId: finalOutcome.route.routeId,
        status: metadata.finalStatus,
        errorCode: finalOutcome.failure?.code,
        durationMs: metadata.durationMs,
        at: metadata.completedAt,
      });
      if (jobDir) fs.rmSync(jobDir, { recursive: true, force: true });
      const code = finalOutcome.appErrorCode ?? "ENGINE_EXECUTE_FAILED";
      const userMessage = buildUserErrorMessage(
        code,
        finalOutcome.failure?.technicalDetailSafe ?? finalOutcome.failure?.messageSafe ?? "",
        finalOutcome.failure?.engineId ?? "unknown",
      );
      jobManager.updateJob(jobId, {
        status: metadata.finalStatus === "cancelled" ? "cancelled" : "failed",
        error_code: code,
        error_message: userMessage,
        stage: failedStepLabel ? `Error en paso ${failedStepLabel}` : "Error",
        toolchain_snapshot_json: JSON.stringify({ execution: metadata }),
      });
      return;
    }

    const finalOutputPath = finalOutcome.finalOutputPath!;
    const finalOutputFormat = finalOutcome.finalOutputFormat!;
    const finalStep = finalOutcome.route.steps[finalOutcome.route.steps.length - 1]!;

    jobManager.updateJob(jobId, {
      status: "verifying",
      stage: "Verificando archivo de salida",
      progress: 95,
    });

    const finalEngine = getEngine(finalStep.engineId);
    if (finalEngine) {
      const validation = await finalEngine.validate(finalOutputPath, {
        jobId,
        engineId: finalEngine.id,
        operation: finalStep.operationId,
        inputPath: finalOutputPath,
        outputPath: finalOutputPath,
        outputFormat: finalOutcome.route.destination,
        options: { inputFormat: finalStep.source },
        args: [],
        env: {},
        timeoutMs: CONFIG.media.limits.conversionTimeoutSeconds * 1000,
        estimatedSizeBytes: estimatedRequired,
      });
      if (!validation.valid) {
        throw createAppError("VALIDATION_FAILED", "Output validation failed", {
          stage: "validation",
          engineId: finalStep.engineId,
          technicalDetail: validation.checks
            .filter((c) => !c.passed)
            .map((c) => `${c.name}: ${c.detail ?? "failed"}`)
            .join("; "),
        });
      }
    }

    const deepValidation = validateOutputArtifact(finalOutputPath, finalOutputFormat);
    if (!deepValidation.valid) {
      throw createAppError("ARTIFACT_VALIDATION_FAILED", "Deep validation failed", {
        stage: "validation",
        engineId: finalStep.engineId,
        technicalDetail: deepValidation.error ?? "unknown",
      });
    }

    metadata.finalStatus = "success";
    metadata.finalRouteId = finalOutcome.route.routeId;
    metadata.completedAt = nowIso();
    metadata.durationMs = elapsedMs(startedAtMs);
    emit(metadata, {
      event: "conversion.completed",
      conversionId: jobId,
      routeId: finalOutcome.route.routeId,
      status: "success",
      durationMs: metadata.durationMs,
      at: metadata.completedAt,
    });

    log.push("[multistep-job] Validation passed");

    const outputMime = getOutputMimeType(finalOutputFormat);
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const relOutputPath = path.relative(CONFIG.media.tempDir, finalOutputPath);
    const currentJob = jobManager.getJob(jobId);
    const finalFileName = buildConvertedOutputFileName(currentJob?.input_title, jobId, finalOutputFormat);
    const category = (FORMAT_BY_EXTENSION.get(finalOutputFormat)?.category ?? "unknown") as FileCategory;
    const warnings = [...finalOutcome.warnings];
    if (metadata.fallbackUsed) {
      warnings.push("Se utilizó una ruta alternativa por fallo técnico recuperable de la ruta principal.");
    }

    jobManager.updateJob(jobId, {
      status: "completed",
      stage: "Completado",
      progress: 100,
      file_size_bytes: fs.statSync(finalOutputPath).size,
      mime_type: outputMime,
      download_token_hash: tokenHash,
      output_file_name: finalFileName,
      output_relative_path: relOutputPath,
      completed_at: metadata.completedAt,
      category,
      engine_id: finalOutcome.lastEngineId,
      engine_version: finalOutcome.lastEngineVersion,
      output_mime_type: outputMime,
      loss_profile: routeLossProfile(finalOutcome.route),
      validation_json: JSON.stringify({ deepValidation: deepValidation.checks }),
      warnings_json: warnings.length > 0 ? JSON.stringify(warnings) : null,
      toolchain_snapshot_json: JSON.stringify({ execution: metadata }),
    });

    log.push(`[multistep-job] Job ${jobId} completed in ${metadata.durationMs}ms across ${metadata.attemptCount} attempt(s)`);
    coordinatedCleanup().catch((err) => {
      console.error("[multistep-job] Post-job cleanup error:", redact(String(err)));
    });

    for (const event of metadata.events) console.log(JSON.stringify(event));
    for (const msg of log) console.log(redact(msg));
  } catch (error: unknown) {
    const appError = error as AppError;
    const code: ErrorCode = appError?.code ?? "ENGINE_EXECUTE_FAILED";
    const engineId = appError?.engineId ?? "unknown";
    const technicalDetail = appError?.technicalDetail ?? (error instanceof Error ? error.message : "");
    const safe = serializeExecutionError({
      error,
      code: mapAppErrorCode(code, technicalDetail),
      message: error instanceof Error ? error.message : "Error interno del procesador.",
      technicalDetail,
      engineId,
    });
    if (metadata) {
      metadata.finalStatus = safe.class === "CANCELLED" ? "cancelled" : "failed";
      metadata.completedAt = nowIso();
      emit(metadata, {
        event: metadata.finalStatus === "cancelled" ? "conversion.cancelled" : "conversion.failed",
        conversionId: jobId,
        status: metadata.finalStatus,
        errorCode: safe.code,
        at: metadata.completedAt,
      });
    }
    if (jobDir) fs.rmSync(jobDir, { recursive: true, force: true });
    const userMessage = buildUserErrorMessage(code, technicalDetail, engineId);
    jobManager.updateJob(jobId, {
      status: safe.class === "CANCELLED" ? "cancelled" : "failed",
      error_code: code,
      error_message: userMessage,
      stage: failedStepLabel ? `Error en paso ${failedStepLabel}` : "Error",
      toolchain_snapshot_json: metadata ? JSON.stringify({ execution: metadata }) : undefined,
    });

    const logEntry = [
      `[multistep-job] Job ${jobId} FAILED`,
      `  step: ${failedStepLabel ?? "n/a"}`,
      `  engine: ${engineId}`,
      `  code: ${code}`,
      `  message: ${redact(error instanceof Error ? error.message : "Error interno del procesador.")}`,
      technicalDetail ? `  detail: ${redact(technicalDetail).slice(0, 500)}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    console.error(logEntry);
  }
}

async function executeRouteAttempt(params: {
  jobId: string;
  jobDir: string;
  inputPath: string;
  route: RequiredRouteSpec;
  attemptIndex: number;
  estimatedRequired: number;
  log: string[];
  setFailedStepLabel: (label: string) => void;
  testOverride?: { code?: string; message?: string; engineId?: string };
}): Promise<AttemptOutcome> {
  const attemptStartedAt = nowIso();
  const attemptStartedAtMs = performance.now();
  const events: ExecutionEvent[] = [{
    event: "conversion.attempt.started",
    conversionId: params.jobId,
    routeId: params.route.routeId,
    attemptIndex: params.attemptIndex,
    at: attemptStartedAt,
  }];
  const attempt: ConversionAttemptMetadata = {
    attemptIndex: params.attemptIndex,
    routeId: params.route.routeId,
    routeScore: params.route.routeScore,
    qualityBand: params.route.qualityBand,
    engines: routeEngines(params.route.steps),
    runtimePacks: [],
    startedAt: attemptStartedAt,
    status: "failed",
    steps: [],
  };

  const overrideFailure = testOverrideFailure(params);
  if (overrideFailure) return overrideFailure(attempt, events, attemptStartedAtMs);

  let lastEngineId: string | null = null;
  let lastEngineVersion: string | null = null;
  let finalOutputPath = path.join(params.jobDir, `output.${params.route.destination}`);
  const warnings: string[] = [];

  for (let i = 0; i < params.route.steps.length; i++) {
    const step = params.route.steps[i]!;
    const totalSteps = params.route.steps.length;
    const isFinal = i === totalSteps - 1;
    const failedStepLabel = `${i + 1} de ${totalSteps} (${step.source} → ${step.target})`;
    params.setFailedStepLabel(failedStepLabel);

    const stepInputPath = i === 0 ? params.inputPath : path.join(params.jobDir, `step-${i}.${params.route.steps[i - 1]!.target}`);
    const stepOutputPath = isFinal ? path.join(params.jobDir, `output.${params.route.destination}`) : path.join(params.jobDir, `step-${i + 1}.${step.target}`);
    const stepMeta: StepExecutionMetadata = {
      stepIndex: i + 1,
      sourceFormat: step.source,
      targetFormat: step.target,
      engineId: step.engineId,
      routeEdgeId: stepRouteEdgeId(step),
      startedAt: nowIso(),
      status: "failed",
    };
    const stepStartedAtMs = performance.now();
    attempt.steps.push(stepMeta);
    events.push({
      event: "conversion.step.started",
      conversionId: params.jobId,
      routeId: params.route.routeId,
      attemptIndex: params.attemptIndex,
      stepIndex: i + 1,
      engineId: step.engineId,
      at: stepMeta.startedAt,
    });

    try {
      ensurePathSafety(stepOutputPath);
      const descriptor = await buildDescriptor(
        stepInputPath,
        {
          kind: "local-upload",
          originalName: path.basename(stepInputPath),
          storedRelativePath: path.relative(CONFIG.media.tempDir, stepInputPath),
        },
        `${params.jobId}-attempt-${params.attemptIndex}-step-${i + 1}`,
      );
      const capabilities = await getCapabilities(descriptor);
      const matchingCap = capabilities.find(
        (cap) =>
          cap.engineId === step.engineId &&
          cap.outputFormat === step.target &&
          (cap.state === "available" || cap.state === "experimental"),
      );
      if (!matchingCap) {
        throw createAppError("ENGINE_UNAVAILABLE", `No available capability for step ${failedStepLabel}`, {
          stage: "engine-resolution",
          engineId: step.engineId,
          technicalDetail: `Step ${failedStepLabel}: no capability for engine ${step.engineId} -> ${step.target}`,
        });
      }

      const engine = getEngine(step.engineId);
      if (!engine) throw createAppError("ENGINE_NOT_FOUND", "Engine not found", { stage: "engine-resolution", engineId: step.engineId });
      const probeResult = await engine.probe();
      if (!probeResult.available) {
        throw createAppError("ENGINE_UNAVAILABLE", "Engine is not available", {
          stage: "engine-resolution",
          engineId: step.engineId,
          technicalDetail: probeResult.error ?? "unknown error",
        });
      }
      lastEngineId = step.engineId;
      lastEngineVersion = probeResult.version ?? null;

      const plan: ConversionPlan = {
        jobId: params.jobId,
        engineId: engine.id,
        operation: matchingCap.operation,
        inputPath: stepInputPath,
        outputPath: stepOutputPath,
        outputFormat: step.target,
        options: { inputFormat: step.source },
        args: [],
        env: {},
        timeoutMs: CONFIG.media.limits.conversionTimeoutSeconds * 1000,
        estimatedSizeBytes: params.estimatedRequired,
      };
      const stageLabel = `Paso ${i + 1} de ${totalSteps} · ${step.source.toUpperCase()} → ${step.target.toUpperCase()}`;
      jobManager.updateJob(params.jobId, { progress: Math.max((i / totalSteps) * 100, 5), stage: stageLabel });
      const result = await engine.execute(plan, (progress: number) => {
        const overall = ((i + progress / 100) / totalSteps) * 100;
        jobManager.updateJob(params.jobId, {
          progress: Math.min(Math.max(overall, 5), 90),
          stage: stageLabel,
        });
      });

      if (!result.success) {
        const normalizedErrorCode = mapAppErrorCode("ENGINE_EXECUTE_FAILED", result.error ?? "");
        return failAttempt({
          params,
          attempt,
          events,
          stepMeta,
          stepStartedAtMs,
          attemptStartedAtMs,
          appErrorCode: normalizedErrorCode === "SCANNED_CONTENT_REQUIRES_OCR"
            ? "SCANNED_CONTENT_REQUIRES_OCR"
            : "ENGINE_EXECUTE_FAILED",
          engineId: step.engineId,
          message: result.error ?? "Engine execution failed",
          technicalDetail: result.error,
          logs: result.logs,
        });
      }

      const actualStepOutputPath = result.outputPath || stepOutputPath;
      if (!isFinal && actualStepOutputPath !== stepOutputPath) {
        throw createAppError("ENGINE_EXECUTE_FAILED", "Intermediate step returned an unexpected output path", {
          stage: "execution",
          engineId: step.engineId,
          technicalDetail: `Step ${failedStepLabel}: expected ${redact(stepOutputPath)}, got ${redact(actualStepOutputPath)}`,
        });
      }
      if (!fs.existsSync(actualStepOutputPath) || fs.statSync(actualStepOutputPath).size === 0) {
        throw createAppError("ENGINE_EXECUTE_FAILED", "Engine reported success but step output is missing or empty", {
          stage: "execution",
          engineId: step.engineId,
          technicalDetail: `Step ${failedStepLabel}: output missing/empty at ${redact(actualStepOutputPath)}`,
        });
      }
      if (isFinal) finalOutputPath = actualStepOutputPath;

      stepMeta.status = "success";
      stepMeta.completedAt = nowIso();
      stepMeta.durationMs = elapsedMs(stepStartedAtMs);
      stepMeta.outputSize = fs.statSync(actualStepOutputPath).size;
      events.push({
        event: "conversion.step.completed",
        conversionId: params.jobId,
        routeId: params.route.routeId,
        attemptIndex: params.attemptIndex,
        stepIndex: i + 1,
        engineId: step.engineId,
        status: "success",
        durationMs: stepMeta.durationMs,
        at: stepMeta.completedAt,
      });
      warnings.push(...result.warnings);
      params.log.push(`[multistep-job] Step ${i + 1}/${totalSteps} done (${step.engineId}, ${result.durationMs}ms)`);
    } catch (err) {
      const appError = err as AppError;
      return failAttempt({
        params,
        attempt,
        events,
        stepMeta,
        stepStartedAtMs,
        attemptStartedAtMs,
        appErrorCode: appError?.code ?? "ENGINE_EXECUTE_FAILED",
        engineId: appError?.engineId ?? step.engineId,
        message: err instanceof Error ? err.message : "Engine execution failed",
        technicalDetail: appError?.technicalDetail,
        error: err,
      });
    }
  }

  attempt.status = "success";
  attempt.completedAt = nowIso();
  attempt.durationMs = elapsedMs(attemptStartedAtMs);
  return {
    success: true,
    attempt,
    events,
    route: params.route,
    finalOutputPath,
    finalOutputFormat: path.extname(finalOutputPath).toLowerCase() === ".zip" ? "zip" : params.route.destination,
    lastEngineId,
    lastEngineVersion,
    durationMs: attempt.durationMs,
    warnings,
  };
}

function failAttempt(input: {
  params: Parameters<typeof executeRouteAttempt>[0];
  attempt: ConversionAttemptMetadata;
  events: ExecutionEvent[];
  stepMeta: StepExecutionMetadata;
  stepStartedAtMs: number;
  attemptStartedAtMs: number;
  appErrorCode: ErrorCode;
  engineId: string;
  message: string;
  technicalDetail?: string;
  logs?: string[];
  error?: unknown;
}): AttemptOutcome {
  const code = mapAppErrorCode(input.appErrorCode, `${input.message} ${input.technicalDetail ?? ""} ${(input.logs ?? []).join(" ")}`);
  const failure = serializeExecutionError({
    error: input.error,
    code,
    message: input.message,
    technicalDetail: input.technicalDetail,
    logs: input.logs,
    engineId: input.engineId,
  });
  input.stepMeta.status = failure.class === "CANCELLED" ? "cancelled" : "failed";
  input.stepMeta.completedAt = nowIso();
  input.stepMeta.durationMs = elapsedMs(input.stepStartedAtMs);
  input.stepMeta.errorCode = failure.code;
  input.stepMeta.errorMessageSafe = failure.messageSafe;
  input.events.push({
    event: "conversion.step.failed",
    conversionId: input.params.jobId,
    routeId: input.params.route.routeId,
    attemptIndex: input.params.attemptIndex,
    stepIndex: input.stepMeta.stepIndex,
    engineId: input.engineId,
    status: input.stepMeta.status,
    errorCode: failure.code,
    durationMs: input.stepMeta.durationMs,
    at: input.stepMeta.completedAt,
  });
  input.attempt.status = input.stepMeta.status;
  input.attempt.failure = failure;
  input.attempt.completedAt = nowIso();
  input.attempt.durationMs = elapsedMs(input.attemptStartedAtMs);
  return {
    success: false,
    attempt: input.attempt,
    events: input.events,
    route: input.params.route,
    durationMs: input.attempt.durationMs,
    warnings: [],
    failure,
    appErrorCode: input.appErrorCode,
    appErrorMessage: input.message,
  };
}

function testOverrideFailure(params: Parameters<typeof executeRouteAttempt>[0]) {
  if (!params.testOverride || process.env.NODE_ENV !== "test") return null;
  return (
    attempt: ConversionAttemptMetadata,
    events: ExecutionEvent[],
    attemptStartedAtMs: number,
  ): AttemptOutcome => {
    const step = params.route.steps[0]!;
    const stepMeta: StepExecutionMetadata = {
      stepIndex: 1,
      sourceFormat: step.source,
      targetFormat: step.target,
      engineId: params.testOverride?.engineId ?? step.engineId,
      routeEdgeId: stepRouteEdgeId(step),
      startedAt: nowIso(),
      completedAt: nowIso(),
      durationMs: 0,
      status: "failed",
    };
    attempt.steps.push(stepMeta);
    return failAttempt({
      params,
      attempt,
      events,
      stepMeta,
      stepStartedAtMs: performance.now(),
      attemptStartedAtMs,
      appErrorCode: "ENGINE_EXECUTE_FAILED",
      engineId: stepMeta.engineId,
      message: params.testOverride?.message ?? "Injected execution failure",
      technicalDetail: params.testOverride?.message,
      logs: [],
    });
  };
}

function parseOptions(optionsJson: string | null): MultistepJobOptions | null {
  if (!optionsJson) return null;
  try {
    return JSON.parse(optionsJson) as MultistepJobOptions;
  } catch {
    return null;
  }
}

function normalizeRouteSpec(route: unknown): MultistepRouteSpec | null {
  if (!route || typeof route !== "object") return null;
  const value = route as MultistepRouteSpec;
  if (typeof value.destination !== "string" || !Array.isArray(value.steps) || value.steps.length === 0) return null;
  for (const step of value.steps) {
    if (typeof step?.source !== "string" || typeof step?.target !== "string" || typeof step?.engineId !== "string") return null;
  }
  return value;
}

function requireRoute(route: MultistepRouteSpec | null): RequiredRouteSpec {
  if (!route) {
    throw createAppError("MISSING_CONVERSION_ID", "Job has no multistep route in its options", { stage: "recovery" });
  }
  const syntheticId = route.steps.map((step) => `${step.source}>${step.target}:${step.operationId}`).join("|");
  return {
    ...route,
    routeId: route.routeId ?? syntheticId,
    routeScore: route.routeScore ?? 0,
    qualityBand: route.qualityBand ?? "unknown",
    routeReasons: route.routeReasons ?? [],
  };
}

function uniqueRoutes(routes: RequiredRouteSpec[]): RequiredRouteSpec[] {
  const seen = new Set<string>();
  const out: RequiredRouteSpec[] = [];
  for (const route of routes) {
    if (seen.has(route.routeId)) continue;
    seen.add(route.routeId);
    out.push(route);
  }
  return out;
}

function emit(metadata: ConversionExecutionMetadata, event: ExecutionEvent): void {
  metadata.events.push(event);
}

function resetAttemptDirectory(jobDir: string): void {
  fs.rmSync(jobDir, { recursive: true, force: true });
  fs.mkdirSync(jobDir, { recursive: true });
}

function resolveInputPath(inputReference: string, inputKind: string): string {
  if (inputKind === "local-file" || inputKind === "universal-file") {
    return path.resolve(CONFIG.media.tempDir, inputReference);
  }
  return inputReference;
}

function redact(message: string): string {
  return redactPathLike(message);
}

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
