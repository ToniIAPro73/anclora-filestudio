// Route scoring — classification, risk and quality bands.
// Numeric scoring lives in quality.ts (per-dimension bottleneck model);
// scoreConversionRoute remains as a compatibility shim over it.

import type {
  ConversionEdge,
  ConversionRoute,
  QualityBand,
  RouteClassification,
  RouteRisk,
} from "./types";
import { composeRouteQuality, familyWeightsFor, routeFamily } from "./quality";

/**
 * Route score via the quality model: family-aware weighted bottleneck over
 * per-dimension preservation, with re-encode, certification, experimental
 * and irreversible-loss adjustments. Step count is NOT a factor — it is a
 * ranking tiebreaker, not a quality signal.
 */
export function scoreConversionRoute(edges: ConversionEdge[]): number {
  if (edges.length === 0) return 0;
  const source = edges[0].source;
  const target = edges[edges.length - 1].target;
  return composeRouteQuality(edges, routeFamily(source, target), familyWeightsFor(source, target)).score;
}

/**
 * Classification: "direct" for a single lossless/lossy-controlled step,
 * "lossy" when any edge is lossy or structural-risk, else "multistep".
 */
export function classifyRoute(route: ConversionRoute): RouteClassification {
  const hasLossyEdge = route.steps.some(
    (step) => step.lossProfile === "lossy" || step.lossProfile === "structural-risk"
  );
  if (route.steps.length === 1 && !hasLossyEdge) return "direct";
  if (hasLossyEdge) return "lossy";
  return "multistep";
}

/** Risk: high on structural-risk edges, medium on lossy edges or 2 intermediates. */
export function routeRisk(route: ConversionRoute): RouteRisk {
  if (route.steps.some((step) => step.lossProfile === "structural-risk")) return "high";
  if (
    route.steps.some((step) => step.lossProfile === "lossy") ||
    route.intermediateFormats.length === 2
  ) {
    return "medium";
  }
  return "low";
}

export function qualityBand(score: number): QualityBand {
  if (score >= 0.85) return "excellent";
  if (score >= 0.65) return "good";
  if (score >= 0.45) return "format-loss";
  return "not-recommended";
}
