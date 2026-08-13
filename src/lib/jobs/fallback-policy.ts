import type { ExecutionErrorCode, SafeExecutionError } from "./execution-observability";
import { routeEngines } from "./execution-observability";

export type FallbackReasonCode =
  | "PRIMARY_ENGINE_TIMEOUT"
  | "PRIMARY_ENGINE_CRASH"
  | "PRIMARY_PROCESS_EXIT_NONZERO"
  | "PRIMARY_TEMPORARY_IO_ERROR"
  | "PRIMARY_OUTPUT_WRITE_ERROR"
  | "ALTERNATIVE_ENGINE_AVAILABLE"
  | "QUALITY_FLOOR_MET"
  | "FAILURE_DOMAIN_AVOIDED";

export interface FallbackPolicy {
  enabled: boolean;
  maxFallbackAttempts: number;
  minimumAbsoluteScore: number;
  maxQualityDelta: number;
  allowRuntimePackBrokenFallback: boolean;
}

export const DEFAULT_FALLBACK_POLICY: FallbackPolicy = {
  enabled: true,
  maxFallbackAttempts: 1,
  minimumAbsoluteScore: 0.55,
  maxQualityDelta: 0.18,
  allowRuntimePackBrokenFallback: false,
};

export interface FallbackDecision {
  allowed: boolean;
  route?: FallbackRouteCandidate;
  reasons: FallbackReasonCode[];
  rejectedReason?: string;
}

export interface FallbackRouteCandidate {
  routeId: string;
  routeScore: number;
  qualityBand: string;
  rejected?: boolean;
  steps: Array<{ engineId: string }>;
}

const TECHNICAL_FALLBACK_CODES = new Set<ExecutionErrorCode>([
  "ENGINE_START_FAILED",
  "ENGINE_CRASH",
  "ENGINE_TIMEOUT",
  "TEMPORARY_IO_ERROR",
  "OUTPUT_WRITE_ERROR",
  "PROCESS_EXIT_NONZERO",
]);

function failureReason(code: ExecutionErrorCode): FallbackReasonCode | null {
  switch (code) {
    case "ENGINE_TIMEOUT":
      return "PRIMARY_ENGINE_TIMEOUT";
    case "ENGINE_CRASH":
    case "ENGINE_START_FAILED":
      return "PRIMARY_ENGINE_CRASH";
    case "TEMPORARY_IO_ERROR":
      return "PRIMARY_TEMPORARY_IO_ERROR";
    case "OUTPUT_WRITE_ERROR":
      return "PRIMARY_OUTPUT_WRITE_ERROR";
    case "PROCESS_EXIT_NONZERO":
      return "PRIMARY_PROCESS_EXIT_NONZERO";
    default:
      return null;
  }
}

export function hasFailureDomainOverlap(route: FallbackRouteCandidate, failure: SafeExecutionError): boolean {
  if (failure.engineId && route.steps.some((step) => step.engineId === failure.engineId)) {
    return true;
  }
  if (failure.runtimePackId && route.steps.some((step) => step.engineId === failure.runtimePackId)) {
    return true;
  }
  return false;
}

export function selectFallbackRoute(params: {
  rankedRoutes: FallbackRouteCandidate[];
  failedRoute: FallbackRouteCandidate;
  failedAttemptIndex: number;
  failure: SafeExecutionError;
  attemptedRouteIds: ReadonlySet<string>;
  policy?: Partial<FallbackPolicy>;
}): FallbackDecision {
  const policy = { ...DEFAULT_FALLBACK_POLICY, ...params.policy };
  if (!policy.enabled) return { allowed: false, reasons: [], rejectedReason: "FALLBACK_DISABLED" };
  if (params.failedAttemptIndex > policy.maxFallbackAttempts) {
    return { allowed: false, reasons: [], rejectedReason: "ATTEMPT_LIMIT_REACHED" };
  }
  if (!TECHNICAL_FALLBACK_CODES.has(params.failure.code)) {
    if (!(params.failure.code === "RUNTIME_PACK_BROKEN" && policy.allowRuntimePackBrokenFallback)) {
      return { allowed: false, reasons: [], rejectedReason: `NON_RECOVERABLE_${params.failure.code}` };
    }
  }

  const reason = failureReason(params.failure.code);
  for (const route of params.rankedRoutes) {
    if (route.routeId === params.failedRoute.routeId) continue;
    if (params.attemptedRouteIds.has(route.routeId)) continue;
    if (route.rejected) continue;
    if (route.routeScore < policy.minimumAbsoluteScore) continue;
    if (params.failedRoute.routeScore - route.routeScore > policy.maxQualityDelta) continue;
    if (hasFailureDomainOverlap(route, params.failure)) continue;
    if (routeEngines(route.steps).length === 0) continue;
    return {
      allowed: true,
      route,
      reasons: [
        ...(reason ? [reason] : []),
        "ALTERNATIVE_ENGINE_AVAILABLE",
        "QUALITY_FLOOR_MET",
        "FAILURE_DOMAIN_AVOIDED",
      ],
    };
  }

  return { allowed: false, reasons: [], rejectedReason: "NO_SAFE_FALLBACK_ROUTE" };
}
