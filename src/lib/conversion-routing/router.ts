// Route search — bounded BFS over the conversion graph.

import { classifyRoute, routeRisk, scoreConversionRoute } from "./scoring";
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
  }));
  const partial: ConversionRoute = {
    source,
    destination,
    steps,
    intermediateFormats: edges.slice(0, -1).map((edge) => edge.target),
    score: scoreConversionRoute(edges),
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
 * Deterministic best-route selection: score desc, then steps asc,
 * then first operationId asc. Returns null on an empty route set.
 */
export function selectBestConversionRoute(
  routes: ConversionRoute[]
): ConversionRoute | null {
  if (routes.length === 0) return null;
  const sorted = [...routes].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.steps.length !== b.steps.length) return a.steps.length - b.steps.length;
    return (a.steps[0]?.operationId ?? "").localeCompare(b.steps[0]?.operationId ?? "");
  });
  return sorted[0];
}
