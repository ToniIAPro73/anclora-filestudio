// Unit tests for route scoring — weights, penalties, risk and quality bands.

import { describe, it, expect } from "vitest";
import {
  EDGE_QUALITY_WEIGHTS,
  EXPERIMENTAL_EDGE_FACTOR,
  STEP_PENALTIES,
  qualityBand,
  routeRisk,
  scoreConversionRoute,
} from "../../../src/lib/conversion-routing/scoring";
import type { ConversionEdge, ConversionRoute } from "../../../src/lib/conversion-routing/types";

function edge(over: Partial<ConversionEdge> = {}): ConversionEdge {
  return {
    source: "a",
    target: "b",
    operationId: "op",
    engineId: "engine-a",
    lossProfile: "lossless",
    resourceProfile: "low",
    experimental: false,
    outputCardinality: "single",
    supportsAsIntermediate: true,
    ...over,
  };
}

function route(over: Partial<ConversionRoute> = {}): ConversionRoute {
  return {
    source: "a",
    destination: "b",
    steps: [],
    intermediateFormats: [],
    score: 1,
    classification: "direct",
    risk: "low",
    ...over,
  };
}

describe("scoreConversionRoute", () => {
  it("scores a direct lossless edge as 1.0", () => {
    expect(scoreConversionRoute([edge()])).toBeCloseTo(1.0);
  });

  it("multiplies edge weights across steps and applies the step penalty", () => {
    const edges = [
      edge({ lossProfile: "lossy-controlled" }),
      edge({ lossProfile: "lossy" }),
    ];
    const expected =
      EDGE_QUALITY_WEIGHTS["lossy-controlled"] *
      EDGE_QUALITY_WEIGHTS.lossy *
      STEP_PENALTIES[1];
    expect(scoreConversionRoute(edges)).toBeCloseTo(expected);
  });

  it("penalizes experimental edges", () => {
    const plain = scoreConversionRoute([edge()]);
    const experimental = scoreConversionRoute([edge({ experimental: true })]);
    expect(experimental).toBeCloseTo(plain * EXPERIMENTAL_EDGE_FACTOR);
  });

  it("returns 0 for an empty path", () => {
    expect(scoreConversionRoute([])).toBe(0);
  });
});

describe("routeRisk", () => {
  const step = (lossProfile: ConversionEdge["lossProfile"]) => ({
    source: "a",
    target: "b",
    operationId: "op",
    engineId: "engine-a",
    lossProfile,
    resourceProfile: "low" as const,
  });

  it("is high when any step is structural-risk", () => {
    expect(routeRisk(route({ steps: [step("structural-risk")] }))).toBe("high");
  });

  it("is medium when any step is lossy", () => {
    expect(routeRisk(route({ steps: [step("lossy")] }))).toBe("medium");
  });

  it("is medium with two intermediates even if all steps are clean", () => {
    expect(
      routeRisk(
        route({
          steps: [step("lossless"), step("lossless"), step("lossless")],
          intermediateFormats: ["b", "c"],
        })
      )
    ).toBe("medium");
  });

  it("is low for a clean short route", () => {
    expect(
      routeRisk(route({ steps: [step("lossless")], intermediateFormats: [] }))
    ).toBe("low");
  });
});

describe("qualityBand", () => {
  it("maps scores to bands at the defined thresholds", () => {
    expect(qualityBand(1.0)).toBe("excellent");
    expect(qualityBand(0.85)).toBe("excellent");
    expect(qualityBand(0.7)).toBe("good");
    expect(qualityBand(0.65)).toBe("good");
    expect(qualityBand(0.5)).toBe("format-loss");
    expect(qualityBand(0.45)).toBe("format-loss");
    expect(qualityBand(0.2)).toBe("not-recommended");
  });
});
