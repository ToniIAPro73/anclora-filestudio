// Unit tests for the conversion router — bounded multistep route search.

import { describe, it, expect } from "vitest";
import { OPERATION_CATALOG } from "../../../src/lib/domain/operations";
import { buildConversionGraph } from "../../../src/lib/conversion-routing/graph";
import {
  MAX_INTERMEDIATES,
  findConversionRoutes,
  selectBestConversionRoute,
} from "../../../src/lib/conversion-routing/router";
import type { ConversionEdge } from "../../../src/lib/conversion-routing/types";

// ── Synthetic graph helpers ───────────────────────────────────────────────────

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

// ── Route search ──────────────────────────────────────────────────────────────

describe("findConversionRoutes", () => {
  it("finds a direct route", () => {
    const graph = graphOf(edge("a", "b"));
    const routes = findConversionRoutes(graph, "a", "b");

    expect(routes).toHaveLength(1);
    expect(routes[0].steps).toHaveLength(1);
    expect(routes[0].intermediateFormats).toEqual([]);
    expect(routes[0].classification).toBe("direct");
  });

  it("finds a one-intermediate route when there is no direct edge", () => {
    const graph = graphOf(edge("a", "b"), edge("b", "c"));
    const routes = findConversionRoutes(graph, "a", "c");

    expect(routes).toHaveLength(1);
    expect(routes[0].steps.map((s) => s.target)).toEqual(["b", "c"]);
    expect(routes[0].intermediateFormats).toEqual(["b"]);
    expect(routes[0].classification).toBe("multistep");
  });

  it("finds a two-intermediate route", () => {
    const graph = graphOf(edge("a", "b"), edge("b", "c"), edge("c", "d"));
    const routes = findConversionRoutes(graph, "a", "d");

    expect(routes).toHaveLength(1);
    expect(routes[0].intermediateFormats).toEqual(["b", "c"]);
  });

  it("does not offer routes needing three intermediates", () => {
    const graph = graphOf(
      edge("a", "b"),
      edge("b", "c"),
      edge("c", "d"),
      edge("d", "e")
    );

    expect(findConversionRoutes(graph, "a", "e")).toHaveLength(0);
    // Even a caller asking for more is clamped to the hard bound.
    expect(findConversionRoutes(graph, "a", "e", 10)).toHaveLength(0);
  });

  it("terminates on cyclic graphs and still finds the valid route", () => {
    const graph = graphOf(
      edge("a", "b"),
      edge("b", "c"),
      edge("c", "a"),
      edge("c", "d")
    );
    const routes = findConversionRoutes(graph, "a", "d");

    expect(routes).toHaveLength(1);
    expect(routes[0].intermediateFormats).toEqual(["b", "c"]);
  });

  it("never returns routes with more than MAX_INTERMEDIATES intermediates", () => {
    const graph = graphOf(
      edge("a", "b"),
      edge("b", "c"),
      edge("c", "d"),
      edge("a", "c"),
      edge("b", "d")
    );
    const routes = findConversionRoutes(graph, "a", "d", 99);

    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(route.intermediateFormats.length).toBeLessThanOrEqual(MAX_INTERMEDIATES);
    }
  });

  it("prefers a higher-quality multistep route over a shorter lossy one", () => {
    const graph = graphOf(
      edge("a", "d", { operationId: "direct-lossy", lossProfile: "lossy" }),
      edge("a", "b"),
      edge("b", "d")
    );
    const routes = findConversionRoutes(graph, "a", "d");
    const best = selectBestConversionRoute(routes);

    expect(routes).toHaveLength(2);
    expect(best?.steps.map((s) => s.operationId)).toEqual(["a-to-b", "b-to-d"]);
    expect(best?.classification).toBe("multistep");
  });

  it("applies the step penalty: direct > one intermediate > two intermediates", () => {
    const graph = graphOf(
      edge("a", "d"),
      edge("a", "b"),
      edge("b", "d"),
      edge("a", "x"),
      edge("x", "y"),
      edge("y", "d")
    );
    const routes = findConversionRoutes(graph, "a", "d");
    const bySteps = new Map(routes.map((r) => [r.steps.length, r.score]));

    expect(bySteps.get(1)).toBeCloseTo(1.0);
    expect(bySteps.get(2)).toBeCloseTo(0.9);
    expect(bySteps.get(3)).toBeCloseTo(0.8);
  });
});

describe("selectBestConversionRoute", () => {
  it("returns null on an empty route set", () => {
    expect(selectBestConversionRoute([])).toBeNull();
  });

  it("is deterministic and breaks ties by first operationId", () => {
    const graph = graphOf(
      edge("a", "b", { operationId: "op-z" }),
      edge("a", "b", { operationId: "op-a" })
    );
    const routes = findConversionRoutes(graph, "a", "b");

    expect(routes).toHaveLength(2);
    const first = selectBestConversionRoute(routes);
    const second = selectBestConversionRoute([...routes].reverse());
    expect(first?.steps[0].operationId).toBe("op-a");
    expect(second?.steps[0].operationId).toBe("op-a");
  });
});

describe("route classification", () => {
  it("classifies a single lossless/lossy-controlled step as direct", () => {
    const lossless = findConversionRoutes(graphOf(edge("a", "b")), "a", "b");
    const controlled = findConversionRoutes(
      graphOf(edge("a", "b", { lossProfile: "lossy-controlled" })),
      "a",
      "b"
    );
    expect(lossless[0].classification).toBe("direct");
    expect(controlled[0].classification).toBe("direct");
  });

  it("classifies a one-step lossy route as lossy", () => {
    const routes = findConversionRoutes(
      graphOf(edge("a", "b", { lossProfile: "lossy" })),
      "a",
      "b"
    );
    expect(routes[0].classification).toBe("lossy");
  });

  it("classifies a clean multistep route as multistep", () => {
    const routes = findConversionRoutes(
      graphOf(edge("a", "b"), edge("b", "c")),
      "a",
      "c"
    );
    expect(routes[0].classification).toBe("multistep");
  });

  it("classifies a multistep route with a lossy edge as lossy", () => {
    const routes = findConversionRoutes(
      graphOf(edge("a", "b", { lossProfile: "structural-risk" }), edge("b", "c")),
      "a",
      "c"
    );
    expect(routes[0].classification).toBe("lossy");
  });
});

// ── Real catalog graph ────────────────────────────────────────────────────────

describe("buildConversionGraph (real catalog)", () => {
  const allEngines = new Set(
    OPERATION_CATALOG.flatMap((op) => [op.engineId, ...op.dependencies])
  );

  it("builds without throwing and produces edges", () => {
    const graph = buildConversionGraph(allEngines);
    expect(graph.size).toBeGreaterThan(0);
    expect(graph.get("jpeg")?.length).toBeGreaterThan(0);
  });

  it("excludes edges whose engine is unavailable", () => {
    const graph = buildConversionGraph(new Set(["sharp-image"]));

    expect(graph.get("jpeg")?.length).toBeGreaterThan(0);
    expect(graph.get("pdf")).toBeUndefined();
    expect(graph.get("mp3")).toBeUndefined();
  });

  it("excludes edges whose dependencies are unavailable", () => {
    // pdf:to-png depends on qpdf + pdftoppm; with qpdf only it must be absent.
    const withoutDep = buildConversionGraph(new Set(["qpdf"]));
    const withDep = buildConversionGraph(new Set(["qpdf", "pdftoppm"]));

    const allEdges = (graph: Map<string, ConversionEdge[]>) =>
      [...graph.values()].flat();
    expect(
      allEdges(withoutDep).some((e) => e.operationId === "pdf:to-png")
    ).toBe(false);
    expect(
      allEdges(withDep).some((e) => e.operationId === "pdf:to-png")
    ).toBe(true);
  });
});
