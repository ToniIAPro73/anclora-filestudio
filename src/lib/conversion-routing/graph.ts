// Conversion graph — adjacency list of effectively available conversion edges.

import { normalizeFormatId } from "../domain/format-catalog";
import { getAvailableEdges, runtimeCapabilitiesFromEngineIds } from "../conversion-matrix";
import type { ConversionEnvironment } from "../conversion-matrix";
import type { ConversionEdge } from "./types";

/**
 * Builds the effective conversion graph for the given environment and set of
 * available engine/tool ids. Edge order is deterministic.
 */
export function buildConversionGraph(
  availableEngineIds: ReadonlySet<string>,
  options: { environment?: ConversionEnvironment; includeOcr?: boolean } = {}
): Map<string, ConversionEdge[]> {
  const runtime = runtimeCapabilitiesFromEngineIds(
    availableEngineIds,
    options.environment ?? "linux"
  );
  const graph = new Map<string, ConversionEdge[]>();

  for (const canonicalEdge of getAvailableEdges(runtime, { includeOcr: options.includeOcr })) {
    const source = normalizeFormatId(canonicalEdge.source);
    const target = normalizeFormatId(canonicalEdge.target);
    if (!source || !target || source === target) continue;
    const edge: ConversionEdge = {
      source,
      target,
      operationId: canonicalEdge.operationId,
      engineId: canonicalEdge.engineId,
      lossProfile: canonicalEdge.lossProfile,
      resourceProfile: "medium",
      experimental: false,
    };
    const list = graph.get(source) ?? [];
    list.push(edge);
    graph.set(source, list);
  }

  return graph;
}
