import { describe, expect, it } from "vitest";
import { OPERATION_CATALOG } from "../../src/lib/domain/operations";
import {
  CANONICAL_CONVERSION_EDGES,
  CANONICAL_ENGINES,
  getDirectConversion,
  getDisabledInvalidEdges,
  getEffectiveAvailability,
  getEngineRuntimeCapability,
  getImplementedButNotCanonicalDeclaration,
  runtimeCapabilitiesFromEngineIds,
} from "../../src/lib/conversion-matrix";
import { normalizeFormatId } from "../../src/lib/domain/format-catalog";
import {
  buildConversionGraph,
  findConversionRoutes,
  getBestRoute,
  getSourcesForTarget,
  getTargetsForSource,
  MAX_INTERMEDIATES,
} from "../../src/lib/conversion-routing";

const ALL_DESKTOP = new Set([
  "sharp-image",
  "sharp",
  "ffmpeg-media",
  "ffmpeg",
  "ffprobe",
  "pandoc",
  "libreoffice",
  "calibre",
  "ebook-convert",
  "sevenzip",
  "7z",
  "data-ts",
  "html-renderer",
  "chromium",
  "playwright-core",
  "yaml",
  "smol-toml",
  "fast-xml-parser",
  "csv-parse",
  "csv-stringify",
  "tesseract",
  "poppler",
  "pdftoppm",
]);

describe("Canonical conversion matrix", () => {
  it("every enabled implemented edge has canonical formats and executable binding metadata", () => {
    const engineIds = new Set(CANONICAL_ENGINES.map((engine) => engine.id));
    const knownOperationIds = new Set(OPERATION_CATALOG.map((operation) => operation.id));
    const seen = new Set<string>();

    for (const edge of CANONICAL_CONVERSION_EDGES) {
      expect(normalizeFormatId(edge.source), edge.id).toBe(edge.source);
      expect(normalizeFormatId(edge.target), edge.id).toBe(edge.target);
      expect(engineIds.has(edge.engineId), edge.id).toBe(true);
      expect(edge.operationId, edge.id).toBeTruthy();
      expect(edge.implementationId, edge.id).toBeTruthy();
      expect(edge.environments.length, edge.id).toBeGreaterThan(0);
      if (edge.enabled && edge.implemented) {
        expect(knownOperationIds.has(edge.operationId), edge.operationId).toBe(true);
      }
      const duplicateKey = `${edge.source}->${edge.target}:${edge.engineId}:${edge.implementationId}`;
      expect(seen.has(duplicateKey), duplicateKey).toBe(false);
      seen.add(duplicateKey);
    }
  });

  it("models declared, implemented and runtime availability separately", () => {
    const runtime = runtimeCapabilitiesFromEngineIds(ALL_DESKTOP, "linux");
    const docxPdf = getDirectConversion("docx", "pdf", runtime);
    expect(docxPdf?.edge.declared).toBe(true);
    expect(docxPdf?.edge.implemented).toBe(true);
    expect(docxPdf?.availability.available).toBe(true);

    const disabled = getDisabledInvalidEdges().find((edge) => edge.source === "pdf" && edge.target === "png");
    expect(disabled).toBeDefined();
    expect(disabled?.declared).toBe(true);
    expect(disabled?.implemented).toBe(false);
    expect(getEffectiveAvailability(disabled!, runtime).available).toBe(false);
  });

  it("never returns PDF to PNG via QPDF", () => {
    const runtime = runtimeCapabilitiesFromEngineIds(new Set(["qpdf", "pdftoppm"]), "linux");
    const direct = getDirectConversion("pdf", "png", runtime, { includeUnavailable: true });
    expect(direct?.edge.engineId).toBe("poppler");
    expect(direct?.availability.available).toBe(true);

    const qpdfRaster = CANONICAL_CONVERSION_EDGES.find((edge) =>
      edge.source === "pdf" &&
      edge.target === "png" &&
      edge.engineId === "qpdf"
    );
    expect(qpdfRaster).toBeDefined();
    expect(getEffectiveAvailability(qpdfRaster!, runtime).available).toBe(false);
    expect(getEffectiveAvailability(qpdfRaster!, runtime).state).toBe("disabled");

    const graph = buildConversionGraph(new Set(["qpdf", "pdftoppm"]));
    const routes = findConversionRoutes(graph, "pdf", "png");
    expect(routes).toHaveLength(1);
    expect(routes[0].steps[0].engineId).toBe("poppler");
  });

  it("reports implementation-only edges for migration diagnostics", () => {
    const implementationOnly = getImplementedButNotCanonicalDeclaration();
    expect(implementationOnly.some((edge) => edge.engineId === "data-ts")).toBe(true);
    expect(implementationOnly.some((edge) => edge.engineId === "calibre")).toBe(true);
    expect(implementationOnly.every((edge) => edge.implemented)).toBe(true);
  });

  it("runtime capabilities distinguish available, unavailable and unknown", () => {
    const runtime = runtimeCapabilitiesFromEngineIds(new Set(["sharp-image"]), "linux");
    expect(getEngineRuntimeCapability("sharp-image", runtime).state).toBe("available");
    expect(getEngineRuntimeCapability("libreoffice", runtime).state).toBe("unavailable");
    expect(getEngineRuntimeCapability("browser", runtime).state).toBe("unavailable");

    const withPoppler = runtimeCapabilitiesFromEngineIds(new Set(["pdftoppm"]), "linux");
    expect(getEngineRuntimeCapability("poppler", withPoppler).state).toBe("available");
  });
});

describe("Canonical conversion routing APIs", () => {
  it("getTargetsForSource returns only effective targets", () => {
    const targets = getTargetsForSource("jpeg", ALL_DESKTOP);
    expect(targets.some((route) => route.destination === "png")).toBe(true);
    expect(targets.some((route) => route.destination === "ico")).toBe(false);
  });

  it("getSourcesForTarget is the inverse query over the same matrix", () => {
    const sources = getSourcesForTarget("pdf", ALL_DESKTOP);
    expect(sources.some((route) => route.source === "docx")).toBe(true);
    expect(sources.some((route) => route.source === "xlsx")).toBe(true);
  });

  it("getDirectConversion returns engine, implementation and availability", () => {
    const runtime = runtimeCapabilitiesFromEngineIds(ALL_DESKTOP, "linux");
    const direct = getDirectConversion("docx", "pdf", runtime);
    expect(direct?.edge.engineId).toBe("libreoffice");
    expect(direct?.edge.implementationId).toBe("libreoffice-office-convert");
    expect(direct?.availability.available).toBe(true);
  });

  it("getBestRoute returns direct and one-intermediate routes only when executable", () => {
    const direct = getBestRoute("png", "webp", ALL_DESKTOP);
    expect(direct?.steps).toHaveLength(1);

    const oneIntermediate = getBestRoute("doc", "epub", ALL_DESKTOP);
    expect(oneIntermediate?.steps.map((step) => `${step.source}->${step.target}`)).toEqual([
      "doc->docx",
      "docx->epub",
    ]);
  });

  it("excludes unavailable edges, invalid engines, long routes, cycles and stays deterministic", () => {
    const withoutSharp = getBestRoute("png", "webp", new Set<string>());
    expect(withoutSharp).toBeNull();

    const pdfPng = getBestRoute("pdf", "png", ALL_DESKTOP);
    expect(pdfPng?.steps[0].engineId).toBe("poppler");

    const first = getBestRoute("doc", "epub", ALL_DESKTOP);
    const second = getBestRoute("doc", "epub", ALL_DESKTOP);
    expect(first).toEqual(second);
    expect(first?.intermediateFormats.length ?? 0).toBeLessThanOrEqual(MAX_INTERMEDIATES);
  });
});
