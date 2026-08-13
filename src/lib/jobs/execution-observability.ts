import path from "path";
import type { EngineId } from "../domain/engines";
import type { RouteReasonCode } from "../conversion-routing";

export type ExecutionErrorCode =
  | "ENGINE_UNAVAILABLE"
  | "ENGINE_START_FAILED"
  | "ENGINE_CRASH"
  | "ENGINE_TIMEOUT"
  | "TEMPORARY_IO_ERROR"
  | "OUTPUT_WRITE_ERROR"
  | "PROCESS_EXIT_NONZERO"
  | "RUNTIME_PACK_BROKEN"
  | "RUNTIME_PACK_REQUIRED"
  | "INVALID_SOURCE"
  | "SOURCE_MISMATCH"
  | "CORRUPT_INPUT"
  | "UNSUPPORTED_CONTENT"
  | "QUALITY_GUARD_FAILED"
  | "SCANNED_CONTENT_REQUIRES_OCR"
  | "SECURITY_POLICY_BLOCKED"
  | "USER_CANCELLED"
  | "UNKNOWN";

export type FailureClass =
  | "RECOVERABLE_TECHNICAL"
  | "NON_RECOVERABLE_CONTENT"
  | "NON_RECOVERABLE_POLICY"
  | "USER_ACTION_REQUIRED"
  | "CANCELLED"
  | "UNKNOWN";

export type ExecutionEventName =
  | "conversion.started"
  | "conversion.route.selected"
  | "conversion.attempt.started"
  | "conversion.step.started"
  | "conversion.step.completed"
  | "conversion.step.failed"
  | "conversion.attempt.failed"
  | "conversion.fallback.selected"
  | "conversion.completed"
  | "conversion.failed"
  | "conversion.cancelled";

export type ExecutionStatus = "success" | "failed" | "cancelled";

export interface SafeExecutionError {
  code: ExecutionErrorCode;
  class: FailureClass;
  messageSafe: string;
  technicalDetailSafe?: string;
  stderrTail?: string;
  engineId?: string;
  runtimePackId?: string;
  retryable: boolean;
}

export interface ExecutionEvent {
  event: ExecutionEventName;
  conversionId: string;
  routeId?: string;
  attemptIndex?: number;
  stepIndex?: number;
  engineId?: string;
  status?: ExecutionStatus;
  errorCode?: ExecutionErrorCode;
  durationMs?: number;
  at: string;
}

export interface StepExecutionMetadata {
  stepIndex: number;
  sourceFormat: string;
  targetFormat: string;
  engineId: string;
  routeEdgeId: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  status: ExecutionStatus;
  errorCode?: ExecutionErrorCode;
  errorMessageSafe?: string;
  outputSize?: number;
  runtimePackId?: string;
}

export interface ConversionAttemptMetadata {
  attemptIndex: number;
  routeId: string;
  routeScore: number;
  qualityBand: string;
  engines: string[];
  runtimePacks: string[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  status: ExecutionStatus;
  failure?: SafeExecutionError;
  steps: StepExecutionMetadata[];
}

export interface ConversionExecutionMetadata {
  conversionId: string;
  sourceFormat: string;
  targetFormat: string;
  selectedRouteId: string;
  selectedRouteScore: number;
  selectedQualityBand: string;
  routeReasons: RouteReasonCode[];
  fallbackUsed: boolean;
  fallbackReason?: string;
  attemptCount: number;
  finalRouteId?: string;
  finalStatus: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  attempts: ConversionAttemptMetadata[];
  events: ExecutionEvent[];
}

const STDERR_LIMIT = 4000;
const DETAIL_LIMIT = 1200;

export function nowIso(): string {
  return new Date().toISOString();
}

export function elapsedMs(startedAtMs: number): number {
  return Math.max(0, Math.round(performance.now() - startedAtMs));
}

export function redactPathLike(input: string): string {
  return input
    .replace(/[A-Za-z]:\\[^\s"',:;)]+/g, (value) => {
      const normalized = value.replace(/\\/g, "/");
      return `/.../${path.basename(normalized)}`;
    })
    .replace(/\/[^\s"',:;)]+/g, (value) => {
      const parts = value.split("/");
      return parts.length > 3 ? `/.../${parts.slice(-1).join("/")}` : value;
    })
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
    .replace(/([?&](?:token|signature|sig|key|password|secret)=)[^&\s]+/gi, "$1[redacted]");
}

export function truncateTail(value: string, limit = STDERR_LIMIT): string {
  if (value.length <= limit) return value;
  return value.slice(-limit);
}

export function serializeExecutionError(input: {
  error?: unknown;
  code?: ExecutionErrorCode;
  class?: FailureClass;
  message?: string;
  technicalDetail?: string;
  stderr?: string;
  logs?: string[];
  engineId?: string;
  runtimePackId?: string;
  retryable?: boolean;
}): SafeExecutionError {
  const rawMessage =
    input.message ??
    (input.error instanceof Error ? input.error.message : input.error ? String(input.error) : "unknown error");
  const rawDetail =
    input.technicalDetail ??
    (input.error instanceof Error && input.error.cause ? String(input.error.cause) : undefined);
  const logTail = input.stderr ?? (input.logs ?? []).filter(Boolean).join("\n");
  const code = input.code ?? "UNKNOWN";
  const failureClass = input.class ?? classifyExecutionError(code);
  return {
    code,
    class: failureClass,
    messageSafe: redactPathLike(rawMessage).slice(0, DETAIL_LIMIT),
    technicalDetailSafe: rawDetail ? redactPathLike(rawDetail).slice(0, DETAIL_LIMIT) : undefined,
    stderrTail: logTail ? redactPathLike(truncateTail(logTail)) : undefined,
    engineId: input.engineId,
    runtimePackId: input.runtimePackId,
    retryable: input.retryable ?? failureClass === "RECOVERABLE_TECHNICAL",
  };
}

export function classifyExecutionError(code: ExecutionErrorCode): FailureClass {
  switch (code) {
    case "ENGINE_START_FAILED":
    case "ENGINE_CRASH":
    case "ENGINE_TIMEOUT":
    case "TEMPORARY_IO_ERROR":
    case "OUTPUT_WRITE_ERROR":
    case "PROCESS_EXIT_NONZERO":
      return "RECOVERABLE_TECHNICAL";
    case "INVALID_SOURCE":
    case "SOURCE_MISMATCH":
    case "CORRUPT_INPUT":
    case "UNSUPPORTED_CONTENT":
    case "QUALITY_GUARD_FAILED":
    case "SCANNED_CONTENT_REQUIRES_OCR":
      return "NON_RECOVERABLE_CONTENT";
    case "SECURITY_POLICY_BLOCKED":
    case "RUNTIME_PACK_BROKEN":
      return "NON_RECOVERABLE_POLICY";
    case "ENGINE_UNAVAILABLE":
    case "RUNTIME_PACK_REQUIRED":
      return "USER_ACTION_REQUIRED";
    case "USER_CANCELLED":
      return "CANCELLED";
    case "UNKNOWN":
      return "UNKNOWN";
  }
}

export function mapAppErrorCode(code: string, detail = ""): ExecutionErrorCode {
  if (code === "PROCESS_TIMEOUT") return "ENGINE_TIMEOUT";
  if (code === "PROCESS_CANCELLED") return "USER_CANCELLED";
  if (code === "ENGINE_UNAVAILABLE" || code === "ENGINE_NOT_FOUND" || code === "TOOL_NOT_AVAILABLE") return "ENGINE_UNAVAILABLE";
  if (code === "RUNTIME_PACK_REQUIRED") return "RUNTIME_PACK_REQUIRED";
  if (code === "RUNTIME_PACK_BROKEN") return "RUNTIME_PACK_BROKEN";
  if (code === "INPUT_CORRUPTED") return "CORRUPT_INPUT";
  if (code === "INPUT_UNSUPPORTED") return "UNSUPPORTED_CONTENT";
  if (code === "QUALITY_NOT_DELIVERED" || code === "VALIDATION_FAILED" || code === "ARTIFACT_VALIDATION_FAILED") return "QUALITY_GUARD_FAILED";
  if (code === "UNSAFE_PATH" || code === "ARCHIVE_UNSAFE") return "SECURITY_POLICY_BLOCKED";
  if (code === "INPUT_NOT_FOUND" || code === "SOURCE_FORMAT_MISMATCH") return "SOURCE_MISMATCH";
  if (/requiere OCR|escanead/i.test(detail)) return "SCANNED_CONTENT_REQUIRES_OCR";
  if (/timed?\s*out|timeout|SIGKILL/i.test(detail)) return "ENGINE_TIMEOUT";
  if (/exit code|non.?zero|c[oó]digo\s+[1-9]/i.test(detail)) return "PROCESS_EXIT_NONZERO";
  if (/EIO|EBUSY|EMFILE|temporar/i.test(detail)) return "TEMPORARY_IO_ERROR";
  if (/ENOSPC|EACCES|output|write/i.test(detail)) return "OUTPUT_WRITE_ERROR";
  if (/crash|segmentation|SIGSEGV|SIGABRT/i.test(detail)) return "ENGINE_CRASH";
  if (code === "ENGINE_EXECUTE_FAILED") return "PROCESS_EXIT_NONZERO";
  return "UNKNOWN";
}

export function routeEngines(steps: Array<{ engineId: string }>): EngineId[] {
  return [...new Set(steps.map((step) => step.engineId))] as EngineId[];
}

export function stepRouteEdgeId(step: { source: string; target: string; operationId: string }): string {
  return `${step.source}>${step.target}:${step.operationId}`;
}
