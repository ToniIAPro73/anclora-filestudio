import { describe, expect, it } from "vitest";
import { selectFallbackRoute } from "../../src/lib/jobs/fallback-policy";
import type { FallbackRouteCandidate } from "../../src/lib/jobs/fallback-policy";
import type { SafeExecutionError } from "../../src/lib/jobs/execution-observability";

function route(routeId: string, score: number, engineId: string): FallbackRouteCandidate {
  return {
    routeId,
    routeScore: score,
    qualityBand: score >= 0.75 ? "good" : "format-loss",
    steps: [{ engineId }],
  };
}

function failure(code: SafeExecutionError["code"], engineId = "engine-a"): SafeExecutionError {
  return {
    code,
    class: code === "USER_CANCELLED" ? "CANCELLED" : code === "RUNTIME_PACK_REQUIRED" ? "USER_ACTION_REQUIRED" : "RECOVERABLE_TECHNICAL",
    messageSafe: "safe",
    engineId,
    retryable: true,
  };
}

describe("controlled fallback policy", () => {
  it("FALLBACK-002 allows timeout fallback to the next safe route", () => {
    const primary = route("primary", 0.8, "engine-a");
    const fallback = route("fallback", 0.7, "engine-b");
    const decision = selectFallbackRoute({
      rankedRoutes: [primary, fallback],
      failedRoute: primary,
      failedAttemptIndex: 1,
      failure: failure("ENGINE_TIMEOUT"),
      attemptedRouteIds: new Set(["primary"]),
    });
    expect(decision.allowed).toBe(true);
    expect(decision.route?.routeId).toBe("fallback");
    expect(decision.reasons).toContain("PRIMARY_ENGINE_TIMEOUT");
    expect(decision.reasons).toContain("FAILURE_DOMAIN_AVOIDED");
  });

  it("FALLBACK-003 allows crash fallback", () => {
    const primary = route("primary", 0.8, "engine-a");
    const fallback = route("fallback", 0.7, "engine-b");
    expect(selectFallbackRoute({
      rankedRoutes: [primary, fallback],
      failedRoute: primary,
      failedAttemptIndex: 1,
      failure: failure("ENGINE_CRASH"),
      attemptedRouteIds: new Set(["primary"]),
    }).allowed).toBe(true);
  });

  it("FALLBACK-004/005/006/007/012 blocks content, runtime-required and cancelled failures", () => {
    const primary = route("primary", 0.8, "engine-a");
    const fallback = route("fallback", 0.7, "engine-b");
    for (const code of ["SOURCE_MISMATCH", "CORRUPT_INPUT", "SCANNED_CONTENT_REQUIRES_OCR", "RUNTIME_PACK_REQUIRED", "USER_CANCELLED"] as const) {
      expect(selectFallbackRoute({
        rankedRoutes: [primary, fallback],
        failedRoute: primary,
        failedAttemptIndex: 1,
        failure: { ...failure(code), code },
        attemptedRouteIds: new Set(["primary"]),
      }).allowed).toBe(false);
    }
  });

  it("FALLBACK-008 rejects fallback below quality floor or score delta", () => {
    const primary = route("primary", 0.85, "engine-a");
    expect(selectFallbackRoute({
      rankedRoutes: [primary, route("too-low", 0.5, "engine-b")],
      failedRoute: primary,
      failedAttemptIndex: 1,
      failure: failure("ENGINE_TIMEOUT"),
      attemptedRouteIds: new Set(["primary"]),
    }).allowed).toBe(false);
    expect(selectFallbackRoute({
      rankedRoutes: [primary, route("too-far", 0.6, "engine-b")],
      failedRoute: primary,
      failedAttemptIndex: 1,
      failure: failure("ENGINE_TIMEOUT"),
      attemptedRouteIds: new Set(["primary"]),
    }).allowed).toBe(false);
  });

  it("FALLBACK-009 rejects fallback in the same failed engine domain", () => {
    const primary = route("primary", 0.8, "engine-a");
    const sameEngine = route("same-engine", 0.7, "engine-a");
    expect(selectFallbackRoute({
      rankedRoutes: [primary, sameEngine],
      failedRoute: primary,
      failedAttemptIndex: 1,
      failure: failure("ENGINE_TIMEOUT", "engine-a"),
      attemptedRouteIds: new Set(["primary"]),
    }).allowed).toBe(false);
  });

  it("prevents route loops and limits to one fallback by default", () => {
    const primary = route("primary", 0.8, "engine-a");
    const fallback = route("fallback", 0.7, "engine-b");
    expect(selectFallbackRoute({
      rankedRoutes: [primary, fallback],
      failedRoute: fallback,
      failedAttemptIndex: 2,
      failure: failure("ENGINE_TIMEOUT", "engine-b"),
      attemptedRouteIds: new Set(["primary", "fallback"]),
    }).allowed).toBe(false);
  });
});
