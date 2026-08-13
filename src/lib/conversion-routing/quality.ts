// Route quality model — auditable per-dimension preservation, family-aware
// weights, bottleneck loss propagation, certification levels and reason codes.
//
// Design contract (phase: Quality-Aware Routing):
// - Discovery answers reachability; ranking answers "best expected result".
// - No single opaque score: every route keeps its auditable dimensions.
// - Bottleneck principle: a route's preservation per dimension is the MIN of
//   its steps — irreversible loss propagates and cannot be recovered downstream.
// - Direct/shortest routes are NOT preferred by construction; step count and
//   runtime cost are tiebreakers only.
// - Deterministic: same inputs → same ordering, no randomness.

import type { FileCategory } from "../domain/descriptors";
import { FORMAT_BY_EXTENSION, FORMAT_CATALOG } from "../domain/format-catalog";
import { normalizeFormatId } from "../domain/format-catalog";
import type { LossProfile } from "../domain/operations";
import type { ConversionEdge, ConversionRoute } from "./types";

// ── Dimensions ───────────────────────────────────────────────────────────────

export type QualityDimension =
  | "text"
  | "structure"
  | "layout"
  | "images"
  | "tables"
  | "metadata"
  | "mediaQuality"
  | "resolution"
  | "alpha";

export const QUALITY_DIMENSIONS: readonly QualityDimension[] = [
  "text",
  "structure",
  "layout",
  "images",
  "tables",
  "metadata",
  "mediaQuality",
  "resolution",
  "alpha",
];

/** How the quality claim is backed. UNKNOWN never beats BENCHMARKED on ties. */
export type QualityCertification = "benchmarked" | "engine-inferred" | "unknown";

export const CERTIFICATION_RANK: Record<QualityCertification, number> = {
  benchmarked: 2,
  "engine-inferred": 1,
  unknown: 0,
};

/** Certification multiplier — an uncertified route must win on merits. */
export const CERTIFICATION_FACTOR: Record<QualityCertification, number> = {
  benchmarked: 1.0,
  "engine-inferred": 0.98,
  unknown: 0.92,
};

export type RuntimeCost = "low" | "medium" | "high";

export const RUNTIME_COST_RANK: Record<RuntimeCost, number> = { low: 0, medium: 1, high: 2 };

export type PipelineMode = "remux" | "transcode" | "na";

/**
 * Quality metadata attached to a conversion edge. `preservation` holds
 * per-dimension expected fidelity (0..1); a missing dimension means the edge
 * does not affect it (NA), not that it preserves it.
 */
export interface EdgeQualityProfile {
  preservation: Partial<Record<QualityDimension, number>>;
  /** Dimensions this edge destroys beyond downstream recovery (§14). */
  irreversibleLosses: QualityDimension[];
  /** True when the pipeline re-encodes/re-compresses the payload (§31). */
  reencodeRequired: boolean;
  pipelineMode: PipelineMode;
  runtimeCost: RuntimeCost;
  /** 0..1 — engine maturity and observed reliability (no invented telemetry). */
  stability: number;
  certification: QualityCertification;
}

/** Partial quality annotation allowed on canonical matrix edges. */
export type EdgeQualityInput = Partial<Omit<EdgeQualityProfile, "certification">> & {
  certification?: QualityCertification;
};

/** Severity order for legacy loss profiles (higher = worse). */
export const LOSS_PROFILE_SEVERITY: Record<LossProfile, number> = {
  lossless: 0,
  "lossy-controlled": 1,
  lossy: 2,
  "structural-risk": 3,
};

// ── Defaults (conservative, §82/§83) ─────────────────────────────────────────

const DEFAULT_PRESERVATION: Record<LossProfile, number> = {
  lossless: 0.95,
  "lossy-controlled": 0.8,
  lossy: 0.65,
  "structural-risk": 0.45,
};

const DEFAULT_IRREVERSIBLE: Record<LossProfile, QualityDimension[]> = {
  lossless: [],
  "lossy-controlled": [],
  lossy: ["mediaQuality"],
  "structural-risk": ["structure", "layout"],
};

/**
 * Conservative default profile derived from the legacy loss profile.
 * Certification stays "unknown": defaults must not outrank benchmarked routes.
 */
export function defaultEdgeQuality(lossProfile: LossProfile): EdgeQualityProfile {
  const value = DEFAULT_PRESERVATION[lossProfile];
  const preservation: Partial<Record<QualityDimension, number>> = {};
  for (const dim of QUALITY_DIMENSIONS) preservation[dim] = value;
  return {
    preservation,
    irreversibleLosses: DEFAULT_IRREVERSIBLE[lossProfile],
    reencodeRequired: lossProfile === "lossy" || lossProfile === "lossy-controlled",
    pipelineMode: "na",
    runtimeCost: "medium",
    stability: 0.7,
    certification: "unknown",
  };
}

/** Merges a matrix annotation over the conservative defaults. */
export function resolveEdgeQuality(
  lossProfile: LossProfile,
  input?: EdgeQualityInput
): EdgeQualityProfile {
  const base = defaultEdgeQuality(lossProfile);
  if (!input) return base;
  return {
    preservation: { ...base.preservation, ...input.preservation },
    irreversibleLosses: input.irreversibleLosses ?? base.irreversibleLosses,
    reencodeRequired: input.reencodeRequired ?? base.reencodeRequired,
    pipelineMode: input.pipelineMode ?? base.pipelineMode,
    runtimeCost: input.runtimeCost ?? base.runtimeCost,
    stability: input.stability ?? base.stability,
    certification: input.certification ?? base.certification,
  };
}

// ── Families (§11) ───────────────────────────────────────────────────────────

export type RouteFamily =
  | "document"
  | "image"
  | "audio"
  | "video"
  | "data"
  | "archive"
  | "ebook"
  | "generic";

const CATEGORY_TO_FAMILY: Partial<Record<FileCategory, RouteFamily>> = {
  document: "document",
  spreadsheet: "document",
  presentation: "document",
  pdf: "document",
  "plain-text": "document",
  image: "image",
  audio: "audio",
  video: "video",
  "structured-data": "data",
  archive: "archive",
  ebook: "ebook",
};

function categoryOf(formatId: string): FileCategory | undefined {
  const normalized = normalizeFormatId(formatId) ?? formatId;
  const format =
    FORMAT_CATALOG.find((fmt) => fmt.outputExtension === normalized || fmt.id === normalized) ??
    FORMAT_BY_EXTENSION.get(normalized);
  return format?.category;
}

/** Family is decided by the TARGET (what the user wants), source as fallback. */
export function routeFamily(source: string, target: string): RouteFamily {
  return (
    CATEGORY_TO_FAMILY[categoryOf(target) ?? "unknown"] ??
    CATEGORY_TO_FAMILY[categoryOf(source) ?? "unknown"] ??
    "generic"
  );
}

/**
 * Family weights over dimensions. Only weighted dimensions participate in the
 * route score — irrelevant dimensions are not invented per family (§8/§10).
 */
export const FAMILY_WEIGHTS: Record<RouteFamily, Partial<Record<QualityDimension, number>>> = {
  document: { text: 0.3, structure: 0.25, layout: 0.2, tables: 0.15, images: 0.1 },
  image: { mediaQuality: 0.35, resolution: 0.3, alpha: 0.2, metadata: 0.15 },
  audio: { mediaQuality: 0.6, structure: 0.25, metadata: 0.15 },
  video: { mediaQuality: 0.35, resolution: 0.25, structure: 0.25, metadata: 0.15 },
  data: { structure: 0.6, text: 0.2, metadata: 0.2 },
  archive: { structure: 0.6, metadata: 0.4 },
  ebook: { text: 0.35, structure: 0.35, images: 0.15, metadata: 0.15 },
  generic: { structure: 0.4, text: 0.3, layout: 0.15, metadata: 0.15 },
};

/**
 * Target-expressiveness overrides: quality is judged against what the TARGET
 * format can hold. A txt target cannot preserve layout, so losing layout is
 * not double-penalized when the user explicitly asked for plain text.
 */
export const TARGET_WEIGHT_OVERRIDES: Record<string, Partial<Record<QualityDimension, number>>> = {
  txt: { text: 0.7, structure: 0.2, metadata: 0.1 },
  md: { text: 0.35, structure: 0.35, layout: 0.05, tables: 0.15, images: 0.1 },
  html: { text: 0.25, structure: 0.3, layout: 0.25, tables: 0.1, images: 0.1 },
  csv: { structure: 0.5, text: 0.3, metadata: 0.2 },
  tsv: { structure: 0.5, text: 0.3, metadata: 0.2 },
  pdf: { text: 0.25, structure: 0.2, layout: 0.2, tables: 0.15, images: 0.15, alpha: 0.05 },
  gif: { mediaQuality: 0.6, resolution: 0.2, structure: 0.1, metadata: 0.1 },
};

/** Effective weights for a source→target pair: family base + target override. */
export function familyWeightsFor(
  source: string,
  target: string
): Partial<Record<QualityDimension, number>> {
  const normalizedSource = normalizeFormatId(source) ?? source;
  const normalizedTarget = normalizeFormatId(target) ?? target;
  const sourceFamily = CATEGORY_TO_FAMILY[categoryOf(normalizedSource) ?? "unknown"];
  if (
    ["png", "tiff"].includes(normalizedTarget) &&
    (sourceFamily === "document" || sourceFamily === "ebook")
  ) {
    return { text: 0.2, layout: 0.25, images: 0.2, tables: 0.15, mediaQuality: 0.1, resolution: 0.08, metadata: 0.02 };
  }
  return TARGET_WEIGHT_OVERRIDES[normalizedTarget] ?? FAMILY_WEIGHTS[routeFamily(source, target)];
}

// ── Route quality composition (bottleneck, §12/§13/§14) ─────────────────────

export interface RouteQualityReport {
  family: RouteFamily;
  /** Bottleneck (min) preservation per family-weighted dimension. */
  dimensions: Partial<Record<QualityDimension, number>>;
  /** Irreversible losses accumulated across steps (union, family-relevant). */
  irreversibleLosses: QualityDimension[];
  reencodeCount: number;
  runtimeCost: RuntimeCost;
  stability: number;
  certification: QualityCertification;
  /** Final comparable score (0..1) — derived, never the only artifact (§9). */
  score: number;
}

export const EXPERIMENTAL_EDGE_FACTOR = 0.85;

/** Penalty per payload re-encode generation in media families (§16/§17). */
export const REENCODE_PENALTY = 0.07;

/** Routes carrying irreversible loss on weighted dims never reach "excellent". */
export const IRREVERSIBLE_LOSS_CAP = 0.84;

export function composeRouteQuality(
  edges: ConversionEdge[],
  family: RouteFamily,
  weightOverride?: Partial<Record<QualityDimension, number>>
): RouteQualityReport {
  const weights = weightOverride ?? FAMILY_WEIGHTS[family];
  const weightedDims = Object.keys(weights) as QualityDimension[];

  const dimensions: Partial<Record<QualityDimension, number>> = {};
  for (const dim of weightedDims) {
    let min = 1;
    let touched = false;
    for (const edge of edges) {
      const quality = edge.quality ?? defaultEdgeQuality(edge.lossProfile);
      const value = quality.preservation[dim];
      if (value === undefined) continue; // edge does not affect this dimension
      touched = true;
      if (value < min) min = value;
    }
    // NA across every step: the dimension is not applicable to this route and
    // its weight is redistributed (renormalization below) — never treated as
    // perfect preservation, never as hidden loss (§9).
    if (touched) dimensions[dim] = min;
  }

  const irreversible = new Set<QualityDimension>();
  let reencodeCount = 0;
  let runtimeCost: RuntimeCost = "low";
  let stability = 1;
  let certification: QualityCertification = "benchmarked";
  for (const edge of edges) {
    const quality = edge.quality ?? defaultEdgeQuality(edge.lossProfile);
    for (const loss of quality.irreversibleLosses) {
      if (dimensions[loss] !== undefined) irreversible.add(loss);
    }
    if (quality.reencodeRequired) reencodeCount += 1;
    if (RUNTIME_COST_RANK[quality.runtimeCost] > RUNTIME_COST_RANK[runtimeCost]) {
      runtimeCost = quality.runtimeCost;
    }
    if (quality.stability < stability) stability = quality.stability;
    if (CERTIFICATION_RANK[quality.certification] < CERTIFICATION_RANK[certification]) {
      certification = quality.certification;
    }
  }

  // Renormalized weighted bottleneck: only dimensions at least one step
  // actually affects carry weight (§11 target expressiveness).
  let score = 0;
  let totalWeight = 0;
  for (const dim of weightedDims) {
    if (dimensions[dim] === undefined) continue;
    const weight = weights[dim] ?? 0;
    totalWeight += weight;
    score += weight * dimensions[dim];
  }
  if (totalWeight > 0) score /= totalWeight;

  // Re-encode generations compound quality loss in media pipelines (§16).
  score *= 1 - REENCODE_PENALTY * reencodeCount;
  // Uncertified claims are discounted (§83/§85).
  score *= CERTIFICATION_FACTOR[certification];
  if (edges.some((edge) => edge.experimental)) score *= EXPERIMENTAL_EDGE_FACTOR;
  // Irreversible damage caps the route below "excellent" (§14).
  if (irreversible.size > 0) score = Math.min(score, IRREVERSIBLE_LOSS_CAP);

  return {
    family,
    dimensions,
    irreversibleLosses: [...irreversible].sort(),
    reencodeCount,
    runtimeCost,
    stability,
    certification,
    score: Math.round(score * 1000) / 1000,
  };
}

/** Scores a whole route. Single-step routes keep full edge fidelity. */
export function scoreRouteQuality(route: ConversionRoute): RouteQualityReport {
  const edges: ConversionEdge[] = route.steps.map((step) => ({
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
  }));
  return composeRouteQuality(
    edges,
    routeFamily(route.source, route.destination),
    familyWeightsFor(route.source, route.destination)
  );
}

// ── Reason codes (§28) ───────────────────────────────────────────────────────

export type RouteReasonCode =
  | "HIGHER_FIDELITY"
  | "HIGHER_LAYOUT_FIDELITY"
  | "PRESERVES_TABLES"
  | "PRESERVES_IMAGES"
  | "PRESERVES_ALPHA"
  | "PRESERVES_RESOLUTION"
  | "AVOIDS_LOSSY_INTERMEDIATE"
  | "AVOIDS_IRREVERSIBLE_LOSS"
  | "AVOIDS_REENCODE"
  | "REMUX_OVER_TRANSCODE"
  | "HIGHER_STABILITY"
  | "CERTIFIED_ROUTE"
  | "SHORTER_EQUIVALENT_ROUTE"
  | "LOWER_RUNTIME_COST"
  | "DETERMINISTIC_TIEBREAK"
  | "ONLY_VIABLE_ROUTE";

export type RouteRejectionCode =
  | "UNSAFE_CARDINALITY"
  | "CATASTROPHIC_STRUCTURAL_LOSS"
  | "UNSUPPORTED_CONTENT_PATH"
  | "KNOWN_BROKEN_ADAPTER";

/** Stable route identifier — last-resort deterministic tiebreaker (§44). */
export function routeId(route: ConversionRoute): string {
  return route.steps.map((step) => `${step.source}>${step.target}:${step.operationId}`).join("|");
}

const DIMENSION_REASON: Partial<Record<QualityDimension, RouteReasonCode>> = {
  layout: "HIGHER_LAYOUT_FIDELITY",
  tables: "PRESERVES_TABLES",
  images: "PRESERVES_IMAGES",
  alpha: "PRESERVES_ALPHA",
  resolution: "PRESERVES_RESOLUTION",
};

/**
 * Explains why `winner` beats ` challenger`: dimension wins, avoided losses,
 * avoided re-encodes, or tiebreaker wins. Auditable, no UX copy in core (§27/§28).
 */
export function explainRouteChoice(
  winner: RouteQualityReport,
  challenger: RouteQualityReport,
  winnerRoute: ConversionRoute,
  challengerRoute: ConversionRoute
): RouteReasonCode[] {
  const reasons = new Set<RouteReasonCode>();

  const dims = new Set<QualityDimension>([
    ...(Object.keys(winner.dimensions) as QualityDimension[]),
    ...(Object.keys(challenger.dimensions) as QualityDimension[]),
  ]);
  for (const dim of dims) {
    const w = winner.dimensions[dim] ?? 1;
    const c = challenger.dimensions[dim] ?? 1;
    if (w > c + 0.001) reasons.add(DIMENSION_REASON[dim] ?? "HIGHER_FIDELITY");
  }

  const extraLosses = challenger.irreversibleLosses.filter(
    (loss) => !winner.irreversibleLosses.includes(loss)
  );
  if (extraLosses.length > 0) {
    reasons.add(
      challengerRoute.steps.length > winnerRoute.steps.length
        ? "AVOIDS_LOSSY_INTERMEDIATE"
        : "AVOIDS_IRREVERSIBLE_LOSS"
    );
  }

  if (winner.reencodeCount < challenger.reencodeCount) {
    reasons.add("AVOIDS_REENCODE");
    const remux = winnerRoute.steps.some(
      (step) => step.quality?.pipelineMode === "remux"
    );
    if (remux) reasons.add("REMUX_OVER_TRANSCODE");
  }

  if (winner.stability > challenger.stability + 0.001) reasons.add("HIGHER_STABILITY");
  if (CERTIFICATION_RANK[winner.certification] > CERTIFICATION_RANK[challenger.certification]) {
    reasons.add("CERTIFIED_ROUTE");
  }

  if (
    Math.abs(winner.score - challenger.score) < 0.005 &&
    winnerRoute.steps.length < challengerRoute.steps.length
  ) {
    reasons.add("SHORTER_EQUIVALENT_ROUTE");
  }
  if (RUNTIME_COST_RANK[winner.runtimeCost] < RUNTIME_COST_RANK[challenger.runtimeCost]) {
    reasons.add("LOWER_RUNTIME_COST");
  }

  if (reasons.size === 0) {
    // Exact quality tie broken by certification/steps/cost already covered
    // above; reaching here means the stable routeId decided (§44)
    reasons.add(
      Math.abs(winner.score - challenger.score) < 0.005
        ? "DETERMINISTIC_TIEBREAK"
        : "HIGHER_FIDELITY"
    );
  }
  return [...reasons];
}
