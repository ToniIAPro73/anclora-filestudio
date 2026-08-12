// Server-side engine availability for the conversion graph.
// Kept out of index.ts so the barrel stays free of registry/server imports.

import { diagnoseAllEngines } from "../engines/registry";

/**
 * Returns the set of engine/tool ids currently available, for graph building.
 * Includes probed engine ids, tool names reported in probe capabilities
 * (e.g. "pdftoppm"), and the always-bundled "sharp".
 */
export async function getAvailableEngineIds(): Promise<ReadonlySet<string>> {
  const available = new Set<string>(["sharp"]);
  const diagnostics = await diagnoseAllEngines();
  for (const diag of diagnostics) {
    if (!diag.probe.available) continue;
    available.add(diag.engineId);
    for (const capability of diag.probe.capabilities) {
      available.add(capability);
    }
  }
  return available;
}
