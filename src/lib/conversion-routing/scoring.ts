// Route scoring — quality weights, step penalties, classification and risk.

import type { LossProfile } from "../domain/operations";
import type {
  ConversionEdge,
  ConversionRoute,
  QualityBand,
  RouteClassification,
  RouteRisk,
} from "./types";

/** Quality weight per edge, keyed by loss profile. Tunable. */
export const EDGE_QUALITY_WEIGHTS: Record<LossProfile, number> = {
  lossless: 1.0,
  "lossy-controlled": 0.9,
  lossy: 0.75,
  "structural-risk": 0.6,
};

/** Multiplier applied to edges whose target format is experimental. */
export const EXPERIMENTAL_EDGE_FACTOR = 0.85;

/** Penalty per number of intermediate formats (0 = direct). Tunable. */
export const STEP_PENALTIES: Record<number, number> = {
  0: 1.0,
  1: 0.9,
  2: 0.8,
};

/** Route score: product of edge weights × step penalty for the path length. */
export function scoreConversionRoute(edges: ConversionEdge[]): number {
  if (edges.length === 0) return 0;
  const edgeProduct = edges.reduce(
    (acc, edge) =>
      acc *
      EDGE_QUALITY_WEIGHTS[edge.lossProfile] *
      (edge.experimental ? EXPERIMENTAL_EDGE_FACTOR : 1),
    1
  );
  const intermediates = edges.length - 1;
  return edgeProduct * (STEP_PENALTIES[intermediates] ?? 0);
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
