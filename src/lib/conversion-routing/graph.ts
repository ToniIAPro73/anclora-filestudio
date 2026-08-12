// Conversion graph — adjacency list of available conversion edges,
// derived from OPERATION_CATALOG and the set of currently available engines.

import { OPERATION_CATALOG } from "../domain/operations";
import { FORMAT_BY_EXTENSION, FORMAT_CATALOG } from "../domain/format-catalog";
import type { FormatDefinition } from "../domain/format-catalog";
import type { ConversionEdge } from "./types";

function findFormat(formatId: string): FormatDefinition | undefined {
  return (
    FORMAT_CATALOG.find((fmt) => fmt.id === formatId) ??
    FORMAT_BY_EXTENSION.get(formatId)
  );
}

/**
 * Builds the conversion graph for the given set of available engine/tool ids.
 * Edge order is deterministic (catalog order, inputs × outputs).
 */
export function buildConversionGraph(
  availableEngineIds: ReadonlySet<string>
): Map<string, ConversionEdge[]> {
  const graph = new Map<string, ConversionEdge[]>();

  for (const op of OPERATION_CATALOG) {
    if (!availableEngineIds.has(op.engineId)) continue;
    // Mirror getCompatibleOperations: bundled tools (e.g. "sharp") need no probe.
    if (!op.dependencies.every((dep) => availableEngineIds.has(dep) || dep === "sharp")) {
      continue;
    }

    for (const source of op.inputFormats) {
      for (const target of op.outputFormats) {
        if (source === target) continue;
        const edge: ConversionEdge = {
          source,
          target,
          operationId: op.id,
          engineId: op.engineId,
          lossProfile: op.lossProfile,
          resourceProfile: op.resourceProfile,
          experimental: findFormat(target)?.experimental ?? false,
        };
        const list = graph.get(source) ?? [];
        list.push(edge);
        graph.set(source, list);
      }
    }
  }

  return graph;
}
