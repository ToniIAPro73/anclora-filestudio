import { describe, expect, it } from "vitest";
import {
  buildConversionUxModel,
  getBestRouteForUx,
  getDestinationFormatsByCategory,
  getFormatSourcesForUx,
  getFormatTargetsForUx,
  searchFormatsForUx,
} from "../../src/lib/ux-v3/conversion-ux-model";
import { FORMAT_CATALOG } from "../../src/lib/domain/format-catalog";

const desktopEngines = new Set([
  "libreoffice",
  "pandoc",
  "sharp-image",
  "sharp",
  "ffmpeg-media",
  "ffmpeg",
  "ffprobe",
  "qpdf",
  "tesseract",
  "pdftoppm",
  "calibre",
  "ebook-convert",
  "sevenzip",
  "7z",
  "data-ts",
  "background-removal",
]);

describe("UX V3 canonical conversion model", () => {
  it("CONV-001 derives categories from catalog-backed formats", () => {
    const model = buildConversionUxModel("linux", desktopEngines);
    const catalogOutputIds = new Set(FORMAT_CATALOG.map((format) => format.outputExtension));

    expect(model.categories.map((category) => category.label)).toContain("Documentos");
    expect(model.categories.map((category) => category.label)).toContain("Imágenes");
    expect(model.categories.map((category) => category.label)).toContain("Archivos comprimidos");
    expect(model.formats.every((format) => catalogOutputIds.has(format.id))).toBe(true);
  });

  it("CONV-002 and CONVERT TO show only destinations with effective sources", () => {
    const documents = getDestinationFormatsByCategory("documents", "linux", desktopEngines);

    expect(documents.some((format) => format.id === "pdf")).toBe(true);
    expect(documents.every((format) => format.sourcesCount > 0)).toBe(true);
  });

  it("CONVERT FROM queries targets from the same matrix", () => {
    const targets = getFormatTargetsForUx("docx", "linux", desktopEngines);

    expect(targets.some((route) => route.target === "pdf")).toBe(true);
    expect(targets.every((route) => route.source === "docx")).toBe(true);
  });

  it("CONVERT TO queries sources by reversing the same matrix", () => {
    const sources = getFormatSourcesForUx("pdf", "linux", desktopEngines);

    expect(sources.some((route) => route.source === "docx")).toBe(true);
    expect(sources.every((route) => route.target === "pdf")).toBe(true);
  });

  it("QUICK-001 and QUICK-002 support source-first and target-first filtering", () => {
    const model = buildConversionUxModel("linux", desktopEngines);
    const docxTargets = new Set(model.routes.filter((route) => route.source === "docx").map((route) => route.target));
    const pdfSources = new Set(model.routes.filter((route) => route.target === "pdf").map((route) => route.source));

    expect(docxTargets.has("pdf")).toBe(true);
    expect(pdfSources.has("docx")).toBe(true);
    expect(docxTargets.has("png")).toBe(false);
  });

  it("QUICK-003 normalizes aliases in search", () => {
    const model = buildConversionUxModel("linux", desktopEngines);

    expect(searchFormatsForUx("jpeg", model.formats).map((format) => format.id)).toContain("jpg");
    expect(searchFormatsForUx("markdown", model.formats).map((format) => format.id)).toContain("md");
  });

  it("QUICK-006 respects Web/Desktop differences", () => {
    const web = buildConversionUxModel("web", new Set(["browser", "data-ts"]));
    const desktop = buildConversionUxModel("linux", desktopEngines);

    expect(web.availableDirectEdges).toBeLessThan(desktop.availableDirectEdges);
    expect(getBestRouteForUx("docx", "pdf", "web", new Set(["browser", "data-ts"]))).toBeNull();
    expect(getBestRouteForUx("docx", "pdf", "linux", desktopEngines)).not.toBeNull();
  });

  it("OCR-001..004 exposes only real OCR capabilities as tools", () => {
    const model = buildConversionUxModel("linux", desktopEngines);
    const ocr = model.tools.find((tool) => tool.id === "ocr");

    expect(ocr?.operations.map((operation) => operation.label)).toContain("JPEG → TXT");
    expect(ocr?.operations.map((operation) => operation.label)).toContain("PNG → PDF");
    expect(ocr?.operations.map((operation) => operation.label)).toContain("PDF → TXT");
    expect(ocr?.operations.map((operation) => operation.label)).not.toContain("PDF → DOCX");
  });

  it("TOOLS-003 keeps archive repack as conversion instead of a tool", () => {
    const model = buildConversionUxModel("linux", desktopEngines);

    expect(model.categories.find((category) => category.id === "archives")?.formats.length).toBeGreaterThan(0);
    expect(model.tools.flatMap((tool) => tool.operations).some((operation) => operation.label.includes("ZIP → 7Z"))).toBe(false);
  });
});
