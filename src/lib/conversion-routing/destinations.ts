// Destination discovery — available and recommended conversion targets
// for a given source format.

import { FORMAT_BY_EXTENSION, FORMAT_CATALOG } from "../domain/format-catalog";
import { normalizeFormatId } from "../domain/format-catalog";
import type { FileCategory } from "../domain/descriptors";
import { buildConversionGraph } from "./graph";
import {
  findConversionRoutes,
  MAX_INTERMEDIATES,
  selectBestConversionRoute,
} from "./router";
import { qualityBand } from "./scoring";
import type {
  ConversionRoute,
  ConversionRouteSummary,
  RouteClassification,
} from "./types";
import type { ConversionEnvironment } from "../conversion-matrix";

export interface EffectiveDiscoveryResult {
  direct: ConversionRoute[];
  oneIntermediate: ConversionRoute[];
  twoIntermediates: ConversionRoute[];
  all: ConversionRoute[];
}

/** Curated recommended destinations per source format category. */
const RECOMMENDED_BY_CATEGORY: Partial<Record<FileCategory, string[]>> = {
  document: ["pdf", "html", "md", "odt", "txt"],
  image: ["webp", "png", "jpeg", "avif"],
  audio: ["mp3", "ogg", "wav"],
  video: ["mp4", "webm"],
  ebook: ["epub", "pdf", "mobi"],
  pdf: ["docx", "txt", "png"],
  archive: ["zip", "tar"],
  "structured-data": ["json", "csv", "yaml"],
  "plain-text": ["md", "html", "pdf", "txt"],
};

const CLASSIFICATION_RANK: Record<RouteClassification, number> = {
  direct: 0,
  multistep: 1,
  lossy: 2,
};

function sourceCategory(source: string): FileCategory | undefined {
  const normalized = normalizeFormatId(source) ?? source;
  const format =
    FORMAT_CATALOG.find((fmt) => fmt.outputExtension === normalized || fmt.id === normalized) ??
    FORMAT_BY_EXTENSION.get(normalized);
  return format?.category;
}

/**
 * Curated recommended destinations for the source format's category,
 * limited to destinations actually present in the given routes.
 */
export function getRecommendedDestinations(
  source: string,
  routes: ConversionRoute[]
): Set<string> {
  const category = sourceCategory(source);
  const curated = category ? (RECOMMENDED_BY_CATEGORY[category] ?? []) : [];
  const available = new Set(routes.map((route) => route.destination));
  return new Set(curated.filter((id) => available.has(id)));
}

/**
 * Best route to every destination reachable from source within
 * MAX_INTERMEDIATES intermediate formats. Sorted by: recommended first,
 * then classification (direct < multistep < lossy), then score desc,
 * then destination asc.
 */
export function getAvailableDestinations(
  source: string,
  availableEngineIds: ReadonlySet<string>,
  options: { environment?: ConversionEnvironment; includeOcr?: boolean } = {}
): ConversionRoute[] {
  const normalizedSource = normalizeFormatId(source);
  if (!normalizedSource) return [];
  const graph = buildConversionGraph(availableEngineIds, options);

  const maxEdges = MAX_INTERMEDIATES + 1;
  const reachable = new Set<string>();
  const seen = new Set([normalizedSource]);
  const queue: Array<{ node: string; depth: number }> = [{ node: normalizedSource, depth: 0 }];
  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    if (depth >= maxEdges) continue;
    for (const edge of graph.get(node) ?? []) {
      if (seen.has(edge.target)) continue;
      seen.add(edge.target);
      reachable.add(edge.target);
      if (edge.supportsAsIntermediate) {
        queue.push({ node: edge.target, depth: depth + 1 });
      }
    }
  }

  const bestRoutes: ConversionRoute[] = [];
  for (const destination of reachable) {
    const best = selectBestConversionRoute(
      findConversionRoutes(graph, normalizedSource, destination)
    );
    if (best) bestRoutes.push(best);
  }

  const recommended = getRecommendedDestinations(normalizedSource, bestRoutes);
  return bestRoutes.sort((a, b) => {
    const recA = recommended.has(a.destination) ? 0 : 1;
    const recB = recommended.has(b.destination) ? 0 : 1;
    if (recA !== recB) return recA - recB;
    if (CLASSIFICATION_RANK[a.classification] !== CLASSIFICATION_RANK[b.classification]) {
      return CLASSIFICATION_RANK[a.classification] - CLASSIFICATION_RANK[b.classification];
    }
    if (b.score !== a.score) return b.score - a.score;
    return a.destination.localeCompare(b.destination);
  });
}

export function groupRoutesByIntermediateCount(routes: ConversionRoute[]): EffectiveDiscoveryResult {
  const direct: ConversionRoute[] = [];
  const oneIntermediate: ConversionRoute[] = [];
  const twoIntermediates: ConversionRoute[] = [];

  for (const route of routes) {
    if (route.intermediateFormats.length === 0) direct.push(route);
    else if (route.intermediateFormats.length === 1) oneIntermediate.push(route);
    else if (route.intermediateFormats.length === 2) twoIntermediates.push(route);
  }

  return {
    direct,
    oneIntermediate,
    twoIntermediates,
    all: routes,
  };
}

export function getAllEffectiveTargets(
  source: string,
  availableEngineIds: ReadonlySet<string>,
  options: { environment?: ConversionEnvironment; includeOcr?: boolean } = {}
): EffectiveDiscoveryResult {
  return groupRoutesByIntermediateCount(getAvailableDestinations(source, availableEngineIds, options));
}

export function getTargetsForSource(
  source: string,
  availableEngineIds: ReadonlySet<string>,
  options: { environment?: ConversionEnvironment; includeOcr?: boolean } = {}
): ConversionRoute[] {
  return getAllEffectiveTargets(source, availableEngineIds, options).all;
}

export function getSourcesForTarget(
  target: string,
  availableEngineIds: ReadonlySet<string>,
  options: { environment?: ConversionEnvironment; includeOcr?: boolean } = {}
): ConversionRoute[] {
  const normalizedTarget = normalizeFormatId(target);
  if (!normalizedTarget) return [];

  const sources = new Set<string>();
  const graph = buildConversionGraph(availableEngineIds, options);
  for (const [source] of graph) sources.add(source);

  const routes: ConversionRoute[] = [];
  for (const source of sources) {
    const best = selectBestConversionRoute(
      findConversionRoutes(graph, source, normalizedTarget)
    );
    if (best) routes.push(best);
  }

  return routes.sort((a, b) => {
    if (a.steps.length !== b.steps.length) return a.steps.length - b.steps.length;
    if (b.score !== a.score) return b.score - a.score;
    return a.source.localeCompare(b.source);
  });
}

export function getAllEffectiveSources(
  target: string,
  availableEngineIds: ReadonlySet<string>,
  options: { environment?: ConversionEnvironment; includeOcr?: boolean } = {}
): EffectiveDiscoveryResult {
  return groupRoutesByIntermediateCount(getSourcesForTarget(target, availableEngineIds, options));
}

export function getBestRoute(
  source: string,
  target: string,
  availableEngineIds: ReadonlySet<string>,
  options: { environment?: ConversionEnvironment; includeOcr?: boolean } = {}
): ConversionRoute | null {
  const normalizedSource = normalizeFormatId(source);
  const normalizedTarget = normalizeFormatId(target);
  if (!normalizedSource || !normalizedTarget) return null;
  const graph = buildConversionGraph(availableEngineIds, options);
  return selectBestConversionRoute(
    findConversionRoutes(graph, normalizedSource, normalizedTarget)
  );
}

/**
 * Builds a client-safe summary of a route (no engine/operation ids).
 */
export function toConversionRouteSummary(
  route: ConversionRoute,
  recommended: boolean
): ConversionRouteSummary {
  return {
    steps: route.steps.map((step) => ({ source: step.source, target: step.target })),
    classification: route.classification,
    risk: route.risk,
    qualityBand: qualityBand(route.score),
    recommended,
  };
}

/** Prefix for synthetic multistep capability ids: `route-{source}-{destination}`. */
export const ROUTE_CAPABILITY_PREFIX = "route-";

/**
 * Parses a synthetic multistep capability id into source/destination.
 * Format ids never contain "-", so the destination is always the last
 * segment and the source is everything in between.
 */
export function parseRouteCapabilityId(
  capabilityId: string
): { source: string; destination: string } | null {
  if (!capabilityId.startsWith(ROUTE_CAPABILITY_PREFIX)) return null;
  const rest = capabilityId.slice(ROUTE_CAPABILITY_PREFIX.length);
  const lastDash = rest.lastIndexOf("-");
  if (lastDash <= 0 || lastDash === rest.length - 1) return null;
  return {
    source: rest.slice(0, lastDash),
    destination: rest.slice(lastDash + 1),
  };
}
