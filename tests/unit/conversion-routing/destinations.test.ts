// Unit tests for destination helpers — route capability id parsing and
// client-safe route summaries.

import { describe, it, expect } from "vitest";
import {
  getAllEffectiveSources,
  getAllEffectiveTargets,
  getSourcesForTarget,
  getTargetsForSource,
  parseRouteCapabilityId,
  toConversionRouteSummary,
} from "../../../src/lib/conversion-routing/destinations";
import { FORMAT_CATALOG, normalizeFormatId } from "../../../src/lib/domain/format-catalog";
import type { ConversionRoute } from "../../../src/lib/conversion-routing/types";
import { buildConversionUxModel, getFormatTargetsForUx } from "../../../src/lib/ux-v3/conversion-ux-model";

const desktopEngines = new Set([
  "libreoffice",
  "pandoc",
  "sharp-image",
  "sharp",
  "ffmpeg-media",
  "ffmpeg",
  "ffprobe",
  "qpdf",
  "poppler",
  "tesseract",
  "pdftoppm",
  "calibre",
  "ebook-convert",
  "sevenzip",
  "7z",
  "data-ts",
  "background-removal",
]);

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

describe("global effective conversion discovery", () => {
  it("DISCOVERY-001 audits every canonical format through global discovery", () => {
    const canonicalFormats = new Set(FORMAT_CATALOG.map((format) => normalizeFormatId(format.outputExtension)).filter(Boolean));

    for (const format of canonicalFormats) {
      const targets = getAllEffectiveTargets(format!, desktopEngines, { environment: "linux" });
      const sources = getAllEffectiveSources(format!, desktopEngines, { environment: "linux" });
      expect(Array.isArray(targets.all)).toBe(true);
      expect(Array.isArray(sources.all)).toBe(true);
    }
  });

  it("DISCOVERY-002 includes direct targets", () => {
    const targets = getAllEffectiveTargets("pdf", desktopEngines, { environment: "windows" });
    expect(targets.direct.map((route) => route.destination)).toContain("png");
    expect(targets.direct.map((route) => route.destination)).toContain("jpg");
  });

  it("DISCOVERY-003 includes one-intermediate targets", () => {
    const targets = getAllEffectiveTargets("docx", desktopEngines, { environment: "linux" });
    const png = targets.oneIntermediate.find((route) => route.destination === "png");
    expect(png?.steps.map((step) => `${step.source}->${step.target}`)).toEqual(["docx->pdf", "pdf->png"]);
  });

  it("DISCOVERY-004 includes two-intermediate targets", () => {
    const targets = getAllEffectiveTargets("doc", desktopEngines, { environment: "linux" });
    expect(targets.twoIntermediates.length).toBeGreaterThan(0);
    expect(targets.twoIntermediates.every((route) => route.intermediateFormats.length === 2)).toBe(true);
  });

  it("DISCOVERY-005 excludes unsafe intermediate cardinality routes", () => {
    const targets = getAllEffectiveTargets("pdf", desktopEngines, { environment: "linux" }).all;
    for (const route of targets) {
      for (const step of route.steps.slice(0, -1)) {
        expect(step.target).not.toBe("png");
        expect(step.target).not.toBe("jpg");
        expect(step.target).not.toBe("tiff");
      }
    }
  });

  it("DISCOVERY-006 excludes runtime-unavailable routes", () => {
    const withoutPoppler = new Set([...desktopEngines].filter((id) => id !== "poppler" && id !== "pdftoppm"));
    const targets = getAllEffectiveTargets("pdf", withoutPoppler, { environment: "windows" });
    expect(targets.all.map((route) => route.destination)).not.toContain("png");
  });

  it("DISCOVERY-007 normalizes aliases", () => {
    const jpgTargets = getTargetsForSource("jpeg", desktopEngines, { environment: "linux" }).map((route) => route.destination);
    const canonicalTargets = getTargetsForSource("jpg", desktopEngines, { environment: "linux" }).map((route) => route.destination);
    expect(jpgTargets).toEqual(canonicalTargets);
  });

  it("DISCOVERY-008 keeps forward and reverse discovery coherent", () => {
    const pdfTargets = getTargetsForSource("pdf", desktopEngines, { environment: "linux" });
    for (const route of pdfTargets) {
      const reverse = getSourcesForTarget(route.destination, desktopEngines, { environment: "linux" });
      expect(reverse.some((candidate) => candidate.source === "pdf")).toBe(true);
    }
  });

  it("DISCOVERY-011 returns unique destinations only", () => {
    const targets = getTargetsForSource("docx", desktopEngines, { environment: "linux" });
    const unique = new Set(targets.map((route) => route.destination));
    expect(unique.size).toBe(targets.length);
  });

  it("DISCOVERY-012 applies environment filtering", () => {
    const webTargets = getTargetsForSource("docx", new Set(["browser", "data-ts"]), { environment: "web" });
    const desktopTargets = getTargetsForSource("docx", desktopEngines, { environment: "linux" });
    expect(webTargets).toHaveLength(0);
    expect(desktopTargets.length).toBeGreaterThan(0);
  });

  it("DISCOVERY-013 makes PDF→PNG effective on Windows when bundled Poppler is healthy", () => {
    const targets = getAllEffectiveTargets("pdf", new Set(["poppler", "pdftoppm"]), { environment: "windows" });
    const png = targets.direct.find((route) => route.destination === "png");
    expect(png?.steps).toHaveLength(1);
    expect(png?.steps[0].engineId).toBe("poppler");
  });

  it("DISCOVERY-014 keeps DOCX→PNG multistep discoverable", () => {
    const targets = getAllEffectiveTargets("docx", desktopEngines, { environment: "linux" });
    const png = targets.oneIntermediate.find((route) => route.destination === "png");
    expect(png?.steps.map((step) => step.target)).toEqual(["pdf", "png"]);
  });

  it("DISCOVERY-015 keeps UX chips and dropdown targets on the canonical target set", () => {
    const model = buildConversionUxModel("linux", desktopEngines);
    const canonicalFormats = Array.from(new Set(FORMAT_CATALOG.map((format) => normalizeFormatId(format.outputExtension)).filter(Boolean))).slice(0, 50);

    for (const source of canonicalFormats) {
      const fromSelector = getFormatTargetsForUx(source!, "linux", desktopEngines).map((route) => route.target).sort();
      const fromModel = model.routes.filter((route) => route.source === source).map((route) => route.target).sort();
      const fromRouting = getTargetsForSource(source!, desktopEngines, { environment: "linux" }).map((route) => route.destination).sort();
      expect(fromModel, `${source} model routes`).toEqual(fromRouting);
      expect(fromSelector, `${source} selector routes`).toEqual(fromRouting);
    }
  });
});
