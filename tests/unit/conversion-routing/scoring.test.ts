// Unit tests for route scoring — classification, risk, quality bands and the
// quality-model score shim. Numeric behavior is covered in ranking.test.ts.

import { describe, it, expect } from "vitest";
import {
  qualityBand,
  routeRisk,
  scoreConversionRoute,
} from "../../../src/lib/conversion-routing/scoring";
import { defaultEdgeQuality } from "../../../src/lib/conversion-routing/quality";
import type { ConversionEdge, ConversionRoute } from "../../../src/lib/conversion-routing/types";

function edge(over: Partial<ConversionEdge> = {}): ConversionEdge {
  const lossProfile = over.lossProfile ?? "lossless";
  return {
    source: "a",
    target: "b",
    operationId: "op",
    engineId: "engine-a",
    lossProfile,
    resourceProfile: "low",
    experimental: false,
    outputCardinality: "single",
    supportsAsIntermediate: true,
    quality: over.quality ?? defaultEdgeQuality(lossProfile),
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

describe("scoreConversionRoute (quality model)", () => {
  it("scores a direct lossless edge high", () => {
    expect(scoreConversionRoute([edge()])).toBeGreaterThan(0.8);
  });

  it("bottleneck: a destructive step dominates the route score", () => {
    const clean = scoreConversionRoute([edge({ lossProfile: "lossy-controlled" })]);
    const chain = scoreConversionRoute([
      edge({ lossProfile: "lossy-controlled" }),
      edge({ lossProfile: "structural-risk", target: "c" }),
    ]);
    expect(chain).toBeLessThan(clean);
  });

  it("penalizes experimental edges", () => {
    const plain = scoreConversionRoute([edge()]);
    const experimental = scoreConversionRoute([edge({ experimental: true })]);
    expect(experimental).toBeLessThan(plain);
  });

  it("does NOT penalize extra steps when quality is equal (steps are a tiebreaker)", () => {
    const one = scoreConversionRoute([edge({ quality: defaultEdgeQuality("lossless") })]);
    const two = scoreConversionRoute([
      edge(),
      edge({ target: "c" }),
    ]);
    expect(two).toBeCloseTo(one);
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
