/**
 * Route ranking audit — enumerates every effective source→target pair with
 * more than one route, compares the LEGACY heuristic (edge-weight product ×
 * step penalty) with the quality-aware ranking, and emits the changed-winners
 * list. Read-only: writes artifacts, touches no runtime state.
 *
 * Usage: npx tsx scripts/audit-route-ranking.ts
 */

import fs from "fs";
import path from "path";
import { OPERATION_CATALOG } from "../src/lib/domain/operations";
import { FORMAT_CATALOG } from "../src/lib/domain/format-catalog";
import { buildConversionGraph } from "../src/lib/conversion-routing/graph";
import { findConversionRoutes } from "../src/lib/conversion-routing/router";
import { rankRoutes } from "../src/lib/conversion-routing/ranking";
import { qualityBand } from "../src/lib/conversion-routing/scoring";
import type { ConversionEdge, ConversionRoute } from "../src/lib/conversion-routing/types";
import type { LossProfile } from "../src/lib/domain/operations";

const ALL_DESKTOP = new Set(
  OPERATION_CATALOG.flatMap((op) => [op.engineId, ...op.dependencies])
);

// ── Legacy heuristic (pre-ranking), kept inline for comparison only ──────────

const LEGACY_EDGE_WEIGHTS: Record<LossProfile, number> = {
  lossless: 1.0,
  "lossy-controlled": 0.9,
  lossy: 0.75,
  "structural-risk": 0.6,
};
const LEGACY_STEP_PENALTIES: Record<number, number> = { 0: 1.0, 1: 0.9, 2: 0.8 };

function legacyScore(route: ConversionRoute): number {
  const product = route.steps.reduce((acc, step) => acc * LEGACY_EDGE_WEIGHTS[step.lossProfile], 1);
  return product * (LEGACY_STEP_PENALTIES[route.intermediateFormats.length] ?? 0);
}

function legacyBest(routes: ConversionRoute[]): ConversionRoute | null {
  if (routes.length === 0) return null;
  return [...routes].sort((a, b) => {
    const scoreDiff = legacyScore(b) - legacyScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    if (a.steps.length !== b.steps.length) return a.steps.length - b.steps.length;
    return (a.steps[0]?.operationId ?? "").localeCompare(b.steps[0]?.operationId ?? "");
  })[0];
}

function routeText(route: ConversionRoute): string {
  return [route.source, ...route.steps.map((s) => s.target)].join("→");
}

// ── Audit ─────────────────────────────────────────────────────────────────────

const graph = buildConversionGraph(ALL_DESKTOP, { environment: "linux" });
const formats = FORMAT_CATALOG.map((fmt) => fmt.id);

interface PairAudit {
  pair: string;
  routeCount: number;
  routes: string[];
  legacyChoice: string | null;
  rankedChoice: string | null;
  rankedScore: number;
  rankedBand: string;
  reasons: string[];
  changed: boolean;
}

const multiRoutePairs: PairAudit[] = [];
let totalReachablePairs = 0;
let notRecommendedWinners = 0;

for (const source of [...graph.keys()].sort()) {
  const destinations = new Set<string>();
  for (const target of formats) {
    if (target === source) continue;
    const routes = findConversionRoutes(graph, source, target);
    if (routes.length === 0) continue;
    destinations.add(target);
    totalReachablePairs += 1;
    if (routes.length < 2) continue;

    const ranked = rankRoutes(routes);
    const winner = ranked.find((r) => !r.rejected) ?? null;
    const legacy = legacyBest(routes);
    if (winner && qualityBand(winner.score) === "not-recommended") notRecommendedWinners += 1;

    multiRoutePairs.push({
      pair: `${source}→${target}`,
      routeCount: routes.length,
      routes: ranked.map((r) => `${routeText(r)} [${r.quality.score}]`),
      legacyChoice: legacy ? routeText(legacy) : null,
      rankedChoice: winner ? routeText(winner) : null,
      rankedScore: winner?.quality.score ?? 0,
      rankedBand: winner ? qualityBand(winner.score) : "none",
      reasons: winner?.reasons ?? [],
      changed: !!legacy && !!winner && routeText(legacy) !== routeText(winner),
    });
  }
}

const changedWinners = multiRoutePairs.filter((p) => p.changed);

const result = {
  generatedAt: new Date().toISOString(),
  environment: "linux",
  engineIds: [...ALL_DESKTOP].sort(),
  totalReachablePairs,
  multiRoutePairCount: multiRoutePairs.length,
  changedWinnerCount: changedWinners.length,
  notRecommendedWinners,
  changedWinners,
  multiRoutePairs,
};

const outDir = path.join(process.cwd(), "artifacts", "route-ranking");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "FILESTUDIO_ROUTE_RANKING_AUDIT.json"),
  JSON.stringify(result, null, 2)
);

const lines: string[] = [
  "# FileStudio — Route Ranking Audit",
  "",
  `Generated: ${result.generatedAt} (linux, full desktop toolchain)`,
  "",
  `- Reachable pairs: ${totalReachablePairs}`,
  `- Multi-route pairs: ${multiRoutePairs.length}`,
  `- Changed winners vs legacy heuristic: ${changedWinners.length}`,
  `- Winners scoring not-recommended: ${notRecommendedWinners}`,
  "",
  "## Changed winners (legacy → ranked)",
  "",
  "| Pair | Legacy choice | Ranked choice | Score | Reasons |",
  "| --- | --- | --- | --- | --- |",
  ...changedWinners.map(
    (p) => `| ${p.pair} | ${p.legacyChoice} | ${p.rankedChoice} | ${p.rankedScore} | ${p.reasons.join(", ")} |`
  ),
  "",
  "## All multi-route pairs",
  "",
  "| Pair | Routes | Legacy | Ranked | Band | Changed |",
  "| --- | --- | --- | --- | --- | --- |",
  ...multiRoutePairs.map(
    (p) =>
      `| ${p.pair} | ${p.routeCount} | ${p.legacyChoice} | ${p.rankedChoice} | ${p.rankedBand} | ${p.changed ? "YES" : "no"} |`
  ),
  "",
];
fs.writeFileSync(path.join(outDir, "FILESTUDIO_ROUTE_RANKING_AUDIT.md"), lines.join("\n"));

console.log(JSON.stringify({
  totalReachablePairs,
  multiRoutePairCount: multiRoutePairs.length,
  changedWinnerCount: changedWinners.length,
  notRecommendedWinners,
}, null, 2));
