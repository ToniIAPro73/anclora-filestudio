// Quality-aware route ranking — orders candidate routes by expected fidelity.
//
// Ranking answers "which route produces the best final result?" — never
// availability (discovery) and never price (product policy lives elsewhere).
// Tiebreaker order (§45, justified in FILESTUDIO_ROUTE_QUALITY_MODEL.md):
//   1. quality score desc        — best expected final result wins
//   2. irreversible loss count asc
//   3. certification rank desc   — UNKNOWN never displaces BENCHMARKED
//   4. steps asc                 — simpler route only when quality is tied
//   5. runtime cost asc
//   6. stable route id asc       — deterministic, no randomness

import {
  CERTIFICATION_RANK,
  RUNTIME_COST_RANK,
  composeRouteQuality,
  explainRouteChoice,
  familyWeightsFor,
  routeFamily,
  routeId,
} from "./quality";
import type {
  RouteQualityReport,
  RouteReasonCode,
  RouteRejectionCode,
} from "./quality";
import type { ConversionRoute } from "./types";

export interface RankedRoute extends ConversionRoute {
  routeId: string;
  quality: RouteQualityReport;
  rank: number;
  /** Why this route won against the next viable challenger (rank 1 only). */
  reasons: RouteReasonCode[];
  rejected: boolean;
  rejectionReasons: RouteRejectionCode[];
}

/**
 * Optional real-file analysis that can change ranking (§29/§30).
 * No AI — just measured facts about the source content.
 */
export interface RouteSourceAnalysis {
  kind?: "pdf-text" | "pdf-scanned" | "pdf-mixed";
  hasTextLayer?: boolean;
}

export interface RankRoutesOptions {
  sourceAnalysis?: RouteSourceAnalysis;
}

/** Total ordering for ranked routes. Exported for tests and audit tooling. */
export function compareRankedRoutes(a: RankedRoute, b: RankedRoute): number {
  if (a.rejected !== b.rejected) return a.rejected ? 1 : -1;
  if (b.quality.score !== a.quality.score) return b.quality.score - a.quality.score;
  if (a.quality.irreversibleLosses.length !== b.quality.irreversibleLosses.length) {
    return a.quality.irreversibleLosses.length - b.quality.irreversibleLosses.length;
  }
  if (CERTIFICATION_RANK[a.quality.certification] !== CERTIFICATION_RANK[b.quality.certification]) {
    return CERTIFICATION_RANK[b.quality.certification] - CERTIFICATION_RANK[a.quality.certification];
  }
  if (a.steps.length !== b.steps.length) return a.steps.length - b.steps.length;
  if (RUNTIME_COST_RANK[a.quality.runtimeCost] !== RUNTIME_COST_RANK[b.quality.runtimeCost]) {
    return RUNTIME_COST_RANK[a.quality.runtimeCost] - RUNTIME_COST_RANK[b.quality.runtimeCost];
  }
  return a.routeId.localeCompare(b.routeId);
}

function rejectionReasons(
  route: ConversionRoute,
  options: RankRoutesOptions
): RouteRejectionCode[] {
  const reasons: RouteRejectionCode[] = [];
  const analysis = options.sourceAnalysis;
  if (analysis?.hasTextLayer === false || analysis?.kind === "pdf-scanned") {
    for (const step of route.steps) {
      if (step.contentRequirements?.requiresTextLayer) {
        reasons.push("UNSUPPORTED_CONTENT_PATH");
        break;
      }
    }
  }
  return reasons;
}

/**
 * Ranks candidate routes (from findConversionRoutes) best-first.
 * Rejected routes stay visible at the tail with their rejection codes —
 * ranking excludes, discovery stays honest (§35/§36).
 */
export function rankRoutes(
  routes: ConversionRoute[],
  options: RankRoutesOptions = {}
): RankedRoute[] {
  const ranked: RankedRoute[] = routes.map((route) => {
    const quality = composeRouteQuality(
      route.steps.map((step) => ({
        source: step.source,
        target: step.target,
        operationId: step.operationId,
        engineId: step.engineId,
        lossProfile: step.lossProfile,
        resourceProfile: step.resourceProfile,
        experimental: false,
        outputCardinality: "single",
        supportsAsIntermediate: true,
        quality: step.quality,
        contentRequirements: step.contentRequirements,
      })),
      routeFamily(route.source, route.destination),
      familyWeightsFor(route.source, route.destination)
    );
    const rejections = rejectionReasons(route, options);
    return {
      ...route,
      score: quality.score,
      routeId: routeId(route),
      quality,
      rank: 0,
      reasons: [],
      rejected: rejections.length > 0,
      rejectionReasons: rejections,
    };
  });

  ranked.sort(compareRankedRoutes);
  ranked.forEach((route, index) => {
    route.rank = index + 1;
  });

  const winner = ranked.find((route) => !route.rejected);
  const challenger = ranked.find((route) => route !== winner && !route.rejected);
  if (winner) {
    winner.reasons = challenger
      ? explainRouteChoice(winner.quality, challenger.quality, winner, challenger)
      : ["ONLY_VIABLE_ROUTE"];
  }

  return ranked;
}

/** Best viable route, or null when every candidate is rejected/absent. */
export function bestRankedRoute(
  routes: ConversionRoute[],
  options: RankRoutesOptions = {}
): RankedRoute | null {
  return rankRoutes(routes, options).find((route) => !route.rejected) ?? null;
}
