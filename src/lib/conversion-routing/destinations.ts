// Destination discovery — available and recommended conversion targets
// for a given source format.

import { FORMAT_BY_EXTENSION, FORMAT_CATALOG } from "../domain/format-catalog";
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
  const format =
    FORMAT_CATALOG.find((fmt) => fmt.id === source) ??
    FORMAT_BY_EXTENSION.get(source);
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
  availableEngineIds: ReadonlySet<string>
): ConversionRoute[] {
  const graph = buildConversionGraph(availableEngineIds);

  const maxEdges = MAX_INTERMEDIATES + 1;
  const reachable = new Set<string>();
  const seen = new Set([source]);
  const queue: Array<{ node: string; depth: number }> = [{ node: source, depth: 0 }];
  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    if (depth >= maxEdges) continue;
    for (const edge of graph.get(node) ?? []) {
      if (seen.has(edge.target)) continue;
      seen.add(edge.target);
      reachable.add(edge.target);
      queue.push({ node: edge.target, depth: depth + 1 });
    }
  }

  const bestRoutes: ConversionRoute[] = [];
  for (const destination of reachable) {
    const best = selectBestConversionRoute(
      findConversionRoutes(graph, source, destination)
    );
    if (best) bestRoutes.push(best);
  }

  const recommended = getRecommendedDestinations(source, bestRoutes);
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
