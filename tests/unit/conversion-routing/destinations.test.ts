// Unit tests for destination helpers — route capability id parsing and
// client-safe route summaries.

import { describe, it, expect } from "vitest";
import {
  parseRouteCapabilityId,
  toConversionRouteSummary,
} from "../../../src/lib/conversion-routing/destinations";
import type { ConversionRoute } from "../../../src/lib/conversion-routing/types";

describe("parseRouteCapabilityId", () => {
  it("parses a synthetic route capability id from the end", () => {
    expect(parseRouteCapabilityId("route-docx-epub")).toEqual({
      source: "docx",
      destination: "epub",
    });
    expect(parseRouteCapabilityId("route-md-html")).toEqual({
      source: "md",
      destination: "html",
    });
  });

  it("returns null for non-route capability ids", () => {
    expect(parseRouteCapabilityId("sharp-convert-abc123-png")).toBeNull();
    expect(parseRouteCapabilityId("qpdf-abc123-linearize")).toBeNull();
    expect(parseRouteCapabilityId("")).toBeNull();
  });

  it("returns null for malformed route ids", () => {
    expect(parseRouteCapabilityId("route-")).toBeNull();
    expect(parseRouteCapabilityId("route-docx")).toBeNull();
    expect(parseRouteCapabilityId("route-docx-")).toBeNull();
    expect(parseRouteCapabilityId("route--epub")).toBeNull();
  });
});

describe("toConversionRouteSummary", () => {
  const route: ConversionRoute = {
    source: "docx",
    destination: "epub",
    steps: [
      {
        source: "docx",
        target: "html",
        operationId: "doc:convert",
        engineId: "pandoc",
        lossProfile: "structural-risk",
        resourceProfile: "low",
      },
      {
        source: "html",
        target: "epub",
        operationId: "ebook:convert",
        engineId: "calibre",
        lossProfile: "lossy",
        resourceProfile: "medium",
      },
    ],
    intermediateFormats: ["html"],
    score: 0.45,
    classification: "lossy",
    risk: "high",
  };

  it("exposes only client-safe fields (no engine/operation ids)", () => {
    const summary = toConversionRouteSummary(route, true);

    expect(summary.steps).toEqual([
      { source: "docx", target: "html" },
      { source: "html", target: "epub" },
    ]);
    expect(summary.classification).toBe("lossy");
    expect(summary.risk).toBe("high");
    expect(summary.qualityBand).toBe("format-loss");
    expect(summary.recommended).toBe(true);
    expect(JSON.stringify(summary)).not.toContain("pandoc");
    expect(JSON.stringify(summary)).not.toContain("doc:convert");
  });
});
