// Route search — bounded BFS over the conversion graph.

import { classifyRoute, routeRisk } from "./scoring";
import { bestRankedRoute } from "./ranking";
import { composeRouteQuality, familyWeightsFor, routeFamily } from "./quality";
import type { ConversionEdge, ConversionRoute, ConversionStep } from "./types";

/** Hard bound on intermediate formats per route. */
export const MAX_INTERMEDIATES = 2;

function buildRoute(
  source: string,
  destination: string,
  edges: ConversionEdge[]
): ConversionRoute {
  const steps: ConversionStep[] = edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    operationId: edge.operationId,
    engineId: edge.engineId,
    lossProfile: edge.lossProfile,
    resourceProfile: edge.resourceProfile,
    quality: edge.quality,
    contentRequirements: edge.contentRequirements,
  }));
  const quality = composeRouteQuality(
    edges,
    routeFamily(source, destination),
    familyWeightsFor(source, destination)
  );
  const partial: ConversionRoute = {
    source,
    destination,
    steps,
    intermediateFormats: edges.slice(0, -1).map((edge) => edge.target),
    score: quality.score,
    classification: "direct",
    risk: "low",
  };
  return { ...partial, classification: classifyRoute(partial), risk: routeRisk(partial) };
}

/**
 * Finds all routes from source to destination with at most `maxIntermediates`
 * intermediate formats (clamped to MAX_INTERMEDIATES). BFS over paths with a
 * per-path visited set, so cyclic graphs terminate.
 */
export function findConversionRoutes(
  graph: Map<string, ConversionEdge[]>,
  source: string,
  destination: string,
  maxIntermediates: number = MAX_INTERMEDIATES
): ConversionRoute[] {
  const maxEdges = Math.min(Math.max(maxIntermediates, 0), MAX_INTERMEDIATES) + 1;
  const routes: ConversionRoute[] = [];
  const queue: ConversionEdge[][] = [[]];

  while (queue.length > 0) {
    const path = queue.shift()!;
    if (path.length >= maxEdges) continue;
    const current = path.length === 0 ? source : path[path.length - 1].target;
    const visited = new Set([source, ...path.map((edge) => edge.target)]);

    for (const edge of graph.get(current) ?? []) {
      if (visited.has(edge.target)) continue;
      const nextPath = [...path, edge];
      if (edge.target === destination) {
        routes.push(buildRoute(source, destination, nextPath));
      } else if (edge.supportsAsIntermediate) {
        queue.push(nextPath);
      }
    }
  }

  return routes;
}

/**
 * Quality-aware best-route selection: delegates to the ranking model
 * (fidelity first, steps and runtime cost as tiebreakers only).
 * Returns null on an empty route set.
 */
export function selectBestConversionRoute(
  routes: ConversionRoute[]
): ConversionRoute | null {
  return bestRankedRoute(routes);
}
