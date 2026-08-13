// Unit tests for quality-aware route ranking — RANK-001..010 (phase §43).
// Synthetic graphs isolate each rule; real-catalog tests anchor the model to
// the certified conversion matrix.

import { describe, it, expect } from "vitest";
import { OPERATION_CATALOG } from "../../../src/lib/domain/operations";
import { buildConversionGraph } from "../../../src/lib/conversion-routing/graph";
import {
  findConversionRoutes,
  MAX_INTERMEDIATES,
} from "../../../src/lib/conversion-routing/router";
import {
  bestRankedRoute,
  compareRankedRoutes,
  rankRoutes,
} from "../../../src/lib/conversion-routing/ranking";
import type { EdgeQualityProfile } from "../../../src/lib/conversion-routing/quality";
import type { ConversionEdge } from "../../../src/lib/conversion-routing/types";

// ── Synthetic helpers ─────────────────────────────────────────────────────────

function quality(over: Partial<EdgeQualityProfile> = {}): EdgeQualityProfile {
  return {
    preservation: { text: 0.9, structure: 0.9, layout: 0.9, tables: 0.9, images: 0.9, metadata: 0.9, mediaQuality: 0.9, resolution: 0.9, alpha: 0.9 },
    irreversibleLosses: [],
    reencodeRequired: false,
    pipelineMode: "na",
    runtimeCost: "medium",
    stability: 0.9,
    certification: "engine-inferred",
    ...over,
  };
}

function edge(
  source: string,
  target: string,
  over: Partial<ConversionEdge> = {}
): ConversionEdge {
  return {
    source,
    target,
    operationId: `${source}-to-${target}`,
    engineId: "engine-a",
    lossProfile: "lossless",
    resourceProfile: "low",
    experimental: false,
    outputCardinality: "single",
    supportsAsIntermediate: true,
    ...over,
  };
}

function graphOf(...edges: ConversionEdge[]): Map<string, ConversionEdge[]> {
  const graph = new Map<string, ConversionEdge[]>();
  for (const e of edges) {
    const list = graph.get(e.source) ?? [];
    list.push(e);
    graph.set(e.source, list);
  }
  return graph;
}

const ALL_DESKTOP = new Set(
  OPERATION_CATALOG.flatMap((op) => [op.engineId, ...op.dependencies])
);

// ── RANK-001..010 ─────────────────────────────────────────────────────────────

describe("RANK-001 — direct better than lossy multistep", () => {
  it("clean direct beats a chain with a destructive step", () => {
    const graph = graphOf(
      edge("md", "docx", { quality: quality() }),
      edge("md", "txt", {
        quality: quality({ preservation: { text: 0.95, structure: 0.1, layout: 0.05 }, irreversibleLosses: ["structure"] }),
      }),
      edge("txt", "docx", { quality: quality({ preservation: { text: 0.9, structure: 0.2, layout: 0.1 } }) })
    );
    const ranked = rankRoutes(findConversionRoutes(graph, "md", "docx"));
    expect(ranked).toHaveLength(2);
    expect(ranked[0].steps).toHaveLength(1);
    expect(ranked[0].quality.score).toBeGreaterThan(ranked[1].quality.score);
  });
});

describe("RANK-002 — multistep better than destructive direct", () => {
  it("a destructive direct edge loses to a fidelity-preserving chain", () => {
    const graph = graphOf(
      edge("a", "d", {
        operationId: "destructive-direct",
        quality: quality({ preservation: { structure: 0.3, layout: 0.2, text: 0.85 }, irreversibleLosses: ["structure", "layout"] }),
      }),
      edge("a", "b", { quality: quality() }),
      edge("b", "d", { quality: quality() })
    );
    const ranked = rankRoutes(findConversionRoutes(graph, "a", "d"));
    expect(ranked[0].steps.map((s) => s.operationId)).toEqual(["a-to-b", "b-to-d"]);
    expect(ranked[0].quality.score).toBeGreaterThan(ranked[1].quality.score);
  });
});

describe("RANK-003 — equivalent quality prefers fewer steps", () => {
  it("tie on quality → shorter route wins with SHORTER_EQUIVALENT_ROUTE", () => {
    const graph = graphOf(
      edge("a", "d", { quality: quality() }),
      edge("a", "b", { quality: quality() }),
      edge("b", "d", { quality: quality() })
    );
    const ranked = rankRoutes(findConversionRoutes(graph, "a", "d"));
    expect(ranked[0].steps).toHaveLength(1);
    expect(ranked[0].quality.score).toBeCloseTo(ranked[1].quality.score);
    expect(ranked[0].reasons).toContain("SHORTER_EQUIVALENT_ROUTE");
  });
});

describe("RANK-004 — equivalent steps prefers lower runtime cost", () => {
  it("tie on quality and steps → lower cost wins with LOWER_RUNTIME_COST", () => {
    const graph = graphOf(
      edge("a", "b", { operationId: "op-expensive", quality: quality({ runtimeCost: "high" }) }),
      edge("a", "b", { operationId: "op-cheap", quality: quality({ runtimeCost: "low" }) })
    );
    const ranked = rankRoutes(findConversionRoutes(graph, "a", "b"));
    expect(ranked[0].steps[0].operationId).toBe("op-cheap");
    expect(ranked[0].reasons).toContain("LOWER_RUNTIME_COST");
  });
});

describe("RANK-005 — irreversible structural loss propagates (bottleneck)", () => {
  it("DOCX→TXT→PDF stays below DOCX→PDF even with a great second step", () => {
    const graph = graphOf(
      edge("docx", "pdf", { quality: quality({ preservation: { text: 0.95, structure: 0.9, layout: 0.9, tables: 0.9, images: 0.9 } }) }),
      edge("docx", "txt", {
        quality: quality({ preservation: { text: 0.95, structure: 0.1, layout: 0.05, tables: 0.1, images: 0 }, irreversibleLosses: ["structure", "layout", "tables", "images"] }),
      }),
      edge("txt", "pdf", { quality: quality({ preservation: { text: 0.95, structure: 0.95, layout: 0.95, tables: 0.95, images: 0.95 } }) })
    );
    const ranked = rankRoutes(findConversionRoutes(graph, "docx", "pdf"));
    expect(ranked[0].steps).toHaveLength(1);
    const viaTxt = ranked[1];
    expect(viaTxt.quality.dimensions.layout).toBeLessThanOrEqual(0.05);
    expect(viaTxt.quality.irreversibleLosses).toContain("layout");
  });
});

describe("RANK-006 — remux preferred over transcode", () => {
  it("remux edge beats transcode edge for the same pair", () => {
    const graph = graphOf(
      edge("ts", "mp4", {
        operationId: "transcode",
        lossProfile: "lossy-controlled",
        quality: quality({ preservation: { mediaQuality: 0.85, resolution: 0.95, structure: 0.9, metadata: 0.75 }, reencodeRequired: true, pipelineMode: "transcode" }),
      }),
      edge("ts", "mp4", {
        operationId: "remux",
        lossProfile: "lossy-controlled",
        quality: quality({ preservation: { mediaQuality: 1.0, resolution: 1.0, structure: 0.95, metadata: 0.75 }, reencodeRequired: false, pipelineMode: "remux" }),
      })
    );
    const ranked = rankRoutes(findConversionRoutes(graph, "ts", "mp4"));
    expect(ranked[0].steps[0].operationId).toBe("remux");
    expect(ranked[0].reasons).toContain("REMUX_OVER_TRANSCODE");
    expect(ranked[0].reasons).toContain("AVOIDS_REENCODE");
  });

  it("real catalog: ts→mkv direct remux wins; ts→mp4 direct transcode wins on steps", () => {
    const graph = buildConversionGraph(ALL_DESKTOP);
    // →mkv is the only true remux target in the ffmpeg adapter (ffmpeg-engine.ts:195)
    const toMkv = rankRoutes(findConversionRoutes(graph, "ts", "mkv"));
    expect(toMkv[0].steps).toHaveLength(1);
    expect(toMkv[0].steps[0].quality?.pipelineMode).toBe("remux");
    // →mp4 transcodes in practice; the direct edge still wins over detours
    const toMp4 = rankRoutes(findConversionRoutes(graph, "ts", "mp4"));
    expect(toMp4[0].steps).toHaveLength(1);
    expect(toMp4[0].steps[0].quality?.pipelineMode).toBe("transcode");
  });
});

describe("RANK-007 — repeated re-encode penalized", () => {
  it("double lossy encode scores below a single one", () => {
    const lossy = () =>
      quality({ preservation: { mediaQuality: 0.85, structure: 0.9, metadata: 0.75 }, reencodeRequired: true });
    const graph = graphOf(
      edge("aac", "mp3", { quality: lossy() }),
      edge("aac", "ogg", { quality: lossy() }),
      edge("ogg", "mp3", { quality: lossy() })
    );
    const ranked = rankRoutes(findConversionRoutes(graph, "aac", "mp3"));
    expect(ranked[0].steps).toHaveLength(1);
    expect(ranked[0].quality.reencodeCount).toBe(1);
    expect(ranked[1].quality.reencodeCount).toBe(2);
    expect(ranked[0].quality.score).toBeGreaterThan(ranked[1].quality.score);
  });
});

describe("RANK-008 — source analysis can change ranking", () => {
  it("scanned PDF rejects text-layer edges and OCR becomes the winner", () => {
    const graph = buildConversionGraph(ALL_DESKTOP, { includeOcr: true });
    const routes = findConversionRoutes(graph, "pdf", "txt");

    const textPdf = rankRoutes(routes, { sourceAnalysis: { kind: "pdf-text", hasTextLayer: true } });
    expect(textPdf[0].steps[0].operationId).toBe("pdf:extract-text");

    const scanned = rankRoutes(routes, { sourceAnalysis: { kind: "pdf-scanned", hasTextLayer: false } });
    const winner = scanned.find((r) => !r.rejected);
    expect(winner?.steps[0].operationId).toBe("pdf:ocr");
    const rejected = scanned.filter((r) => r.rejected);
    expect(rejected.length).toBeGreaterThan(0);
    expect(rejected.every((r) => r.rejectionReasons.includes("UNSUPPORTED_CONTENT_PATH"))).toBe(true);
  });
});

describe("RANK-009 — unsafe route excluded", () => {
  it("rejected routes sort last and never win", () => {
    const graph = graphOf(
      edge("pdf", "txt", {
        operationId: "needs-text",
        quality: quality(),
        contentRequirements: { requiresTextLayer: true },
      }),
      edge("pdf", "txt", {
        operationId: "ocr-fallback",
        engineId: "engine-b",
        quality: quality({ preservation: { text: 0.6, structure: 0.2, metadata: 0.3 }, runtimeCost: "high" }),
      })
    );
    const ranked = rankRoutes(findConversionRoutes(graph, "pdf", "txt"), {
      sourceAnalysis: { hasTextLayer: false },
    });
    expect(ranked[0].rejected).toBe(false);
    expect(ranked[0].steps[0].operationId).toBe("ocr-fallback");
    expect(ranked[1].rejected).toBe(true);
    expect(bestRankedRoute(findConversionRoutes(graph, "pdf", "txt"), {
      sourceAnalysis: { hasTextLayer: false },
    })?.steps[0].operationId).toBe("ocr-fallback");
  });
});

describe("RANK-010 — deterministic ordering", () => {
  it("same inputs in any order produce the same ranking", () => {
    const graph = graphOf(
      edge("a", "d", { operationId: "op-z", quality: quality() }),
      edge("a", "d", { operationId: "op-a", quality: quality() }),
      edge("a", "b", { quality: quality({ runtimeCost: "high" }) }),
      edge("b", "d", { quality: quality({ runtimeCost: "high" }) })
    );
    const routes = findConversionRoutes(graph, "a", "d");
    const first = rankRoutes(routes).map((r) => r.routeId);
    const second = rankRoutes([...routes].reverse()).map((r) => r.routeId);
    expect(first).toEqual(second);
    // stable id breaks exact ties
    expect(first[0]).toContain("op-a");
  });

  it("compareRankedRoutes is a total order (antisymmetric, transitive ties)", () => {
    const graph = buildConversionGraph(ALL_DESKTOP);
    const ranked = rankRoutes(findConversionRoutes(graph, "md", "pdf"));
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(compareRankedRoutes(ranked[i], ranked[i + 1])).toBeLessThan(0);
      expect(compareRankedRoutes(ranked[i + 1], ranked[i])).toBeGreaterThan(0);
    }
  });
});

// ── Real-catalog anchors ──────────────────────────────────────────────────────

describe("real catalog — certified route anchors", () => {
  it("DOCX→PNG keeps the certified DOCX→PDF→PNG route (§50)", () => {
    const graph = buildConversionGraph(ALL_DESKTOP);
    const best = bestRankedRoute(findConversionRoutes(graph, "docx", "png"));
    expect(best?.steps.map((s) => `${s.source}->${s.target}`)).toEqual(["docx->pdf", "pdf->png"]);
    expect(best!.steps.length - 1).toBeLessThanOrEqual(MAX_INTERMEDIATES);
  });

  it("PNG→PDF direct beats the alpha-destroying JPG detour (§17)", () => {
    const graph = buildConversionGraph(ALL_DESKTOP);
    const ranked = rankRoutes(findConversionRoutes(graph, "png", "pdf"));
    expect(ranked[0].steps).toHaveLength(1);
    const viaJpg = ranked.find((r) => r.intermediateFormats.includes("jpg"));
    expect(viaJpg).toBeDefined();
    expect(viaJpg!.quality.irreversibleLosses).toContain("alpha");
    expect(ranked[0].quality.score).toBeGreaterThan(viaJpg!.quality.score);
  });

  it("image direct Sharp edges beat inferior GIF detours", () => {
    const graph = buildConversionGraph(ALL_DESKTOP);
    for (const [source, target] of [
      ["png", "jpg"],
      ["jpg", "png"],
      ["webp", "jpg"],
      ["tiff", "jpg"],
    ] as const) {
      const ranked = rankRoutes(findConversionRoutes(graph, source, target));
      expect(ranked[0].steps.map((step) => `${step.source}->${step.target}:${step.engineId}`), `${source}->${target}`).toEqual([
        `${source}->${target}:sharp-image`,
      ]);
      expect(ranked[0].intermediateFormats).not.toContain("gif");
    }
  });

  it("PDF→DOCX direct remains the winner (§49)", () => {
    const graph = buildConversionGraph(ALL_DESKTOP);
    const best = bestRankedRoute(findConversionRoutes(graph, "pdf", "docx"));
    expect(best?.steps.map((s) => s.operationId)).toEqual(["office:pdf-to-docx"]);
  });

  it("AAC→MP3 direct ties the lossless-detour and wins on steps (§15)", () => {
    const graph = buildConversionGraph(ALL_DESKTOP);
    const ranked = rankRoutes(findConversionRoutes(graph, "aac", "mp3"));
    expect(ranked[0].steps).toHaveLength(1);
  });

  it("no reachable route drops to not-recommended scoring territory without cause", () => {
    // Certified direct conversions must stay executable (jobs gate: band !== not-recommended).
    const graph = buildConversionGraph(ALL_DESKTOP);
    for (const [source, target] of [
      ["pdf", "txt"], ["pdf", "html"], ["pdf", "md"], ["pdf", "docx"],
      ["docx", "pdf"], ["docx", "rtf"], ["odp", "pdf"], ["odp", "pptx"],
      ["png", "pdf"], ["jpg", "pdf"], ["aac", "mp3"], ["wmv", "mp4"], ["ts", "mp4"],
      ["md", "docx"], ["docx", "odt"], ["html", "png"], ["html", "tiff"],
      ["md", "png"], ["md", "tiff"], ["rst", "png"], ["rst", "tiff"],
    ] as const) {
      const best = bestRankedRoute(findConversionRoutes(graph, source, target));
      expect(best, `${source}→${target} must have a viable route`).not.toBeNull();
      expect(best!.quality.score, `${source}→${target} score ${best!.quality.score} < 0.45`).toBeGreaterThanOrEqual(0.45);
    }
  });
});
