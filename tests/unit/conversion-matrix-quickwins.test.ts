/**
 * Tier 1 quick-win matrix tests — canonical edges enabled without new dependencies.
 * Asserts availability with the full desktop toolchain and honest
 * dependency-unavailable states when Poppler text tools are missing.
 */

import { describe, expect, it } from "vitest";
import {
  CANONICAL_CONVERSION_EDGES,
  getDirectConversion,
  runtimeCapabilitiesFromEngineIds,
} from "../../src/lib/conversion-matrix";
import {
  getAllEffectiveSources,
  getAllEffectiveTargets,
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
  "tesseract",
  "html-renderer",
  "chromium",
  "playwright-core",
  "poppler",
  "pdftoppm",
  "pdftotext",
  "pdftohtml",
]);

const NO_POPPLER_TEXT_TOOLS = new Set(
  [...ALL_DESKTOP].filter((id) => id !== "pdftotext" && id !== "pdftohtml"),
);

function directAvailable(source: string, target: string, engines: ReadonlySet<string> = ALL_DESKTOP) {
  const runtime = runtimeCapabilitiesFromEngineIds(engines, "linux");
  return getDirectConversion(source, target, runtime, { includeUnavailable: true });
}

describe("Tier 1 quick wins — PDF extraction edges", () => {
  it("pdf→txt available via poppler pdftotext", () => {
    const result = directAvailable("pdf", "txt");
    expect(result?.availability.available).toBe(true);
    expect(result?.edge.implementationId).toBe("poppler-pdftotext-extract-text");
  });

  it("pdf→html available via poppler pdftohtml", () => {
    const result = directAvailable("pdf", "html");
    expect(result?.availability.available).toBe(true);
    expect(result?.edge.implementationId).toBe("poppler-pdftohtml-extract-html");
  });

  it("pdf→md available via pdftohtml + pandoc", () => {
    const result = directAvailable("pdf", "md");
    expect(result?.availability.available).toBe(true);
    expect(result?.edge.dependencies).toContain("pandoc");
  });

  it("pdf→txt is dependency-unavailable without pdftotext", () => {
    const result = directAvailable("pdf", "txt", NO_POPPLER_TEXT_TOOLS);
    expect(result?.availability.available).toBe(false);
  });

  it("pdf→html is dependency-unavailable without pdftohtml", () => {
    const result = directAvailable("pdf", "html", NO_POPPLER_TEXT_TOOLS);
    expect(result?.availability.available).toBe(false);
  });

  it("pdf→png rasterize remains non-intermediate (multi-output)", () => {
    const edge = CANONICAL_CONVERSION_EDGES.find(
      (e) => e.source === "pdf" && e.target === "png" && e.engineId === "poppler",
    );
    expect(edge?.outputCardinality).toBe("multiple");
    expect(edge?.supportsAsIntermediate).toBe(false);
  });
});

describe("Tier 1 quick wins — media edges", () => {
  const audioPairs: Array<[string, string]> = [
    ["aac", "mp3"], ["aac", "wav"], ["aac", "flac"], ["aac", "m4a"], ["aac", "ogg"],
    ["mp3", "aac"], ["wav", "aac"], ["flac", "aac"], ["m4a", "aac"], ["ogg", "aac"],
  ];

  for (const [source, target] of audioPairs) {
    it(`${source}→${target} available via ffmpeg`, () => {
      const result = directAvailable(source, target);
      expect(result?.availability.available).toBe(true);
      expect(result?.edge.engineId).toBe("ffmpeg-media");
    });
  }

  const videoPairs: Array<[string, string]> = [
    ["wmv", "mp4"], ["wmv", "webm"], ["wmv", "mkv"],
    ["ts", "mp4"], ["ts", "webm"], ["ts", "mkv"],
  ];

  for (const [source, target] of videoPairs) {
    it(`${source}→${target} available via ffmpeg`, () => {
      const result = directAvailable(source, target);
      expect(result?.availability.available).toBe(true);
      expect(result?.edge.engineId).toBe("ffmpeg-media");
    });
  }
});

describe("Tier 1 quick wins — office edges", () => {
  it("docx→rtf available via libreoffice", () => {
    const result = directAvailable("docx", "rtf");
    expect(result?.availability.available).toBe(true);
    expect(result?.edge.engineId).toBe("libreoffice");
  });

  it("odp→pdf available via libreoffice", () => {
    const result = directAvailable("odp", "pdf");
    expect(result?.availability.available).toBe(true);
    expect(result?.edge.engineId).toBe("libreoffice");
  });

  it("odp→pptx available via libreoffice", () => {
    const result = directAvailable("odp", "pptx");
    expect(result?.availability.available).toBe(true);
    expect(result?.edge.engineId).toBe("libreoffice");
  });

  it("pdf→docx available via libreoffice writer_pdf_import", () => {
    const result = directAvailable("pdf", "docx");
    expect(result?.availability.available).toBe(true);
    expect(result?.edge.engineId).toBe("libreoffice");
    expect(result?.edge.implementationId).toBe("libreoffice-pdf-import-docx");
    expect(result?.edge.supportsAsIntermediate).toBe(false);
  });

  it("pdf→docx unavailable without pdftotext (scanned guard dependency)", () => {
    const result = directAvailable("pdf", "docx", NO_POPPLER_TEXT_TOOLS);
    expect(result?.availability.available).toBe(false);
  });
});

describe("Tier 1 quick wins — image→pdf edges", () => {
  for (const source of ["png", "jpg", "webp", "tiff"]) {
    it(`${source}→pdf available via sharp-image + pdf-lib`, () => {
      const result = directAvailable(source, "pdf");
      expect(result?.availability.available).toBe(true);
      expect(result?.edge.implementationId).toBe("sharp-image-to-pdf");
    });
  }
});

describe("Tier 1 quick wins — global discovery updates automatically", () => {
  it("getAllEffectiveTargets(html) includes png and tiff as direct renderer targets", () => {
    const discovery = getAllEffectiveTargets("html", ALL_DESKTOP, { environment: "linux" });
    const directTargets = discovery.direct.map((route) => route.destination);
    expect(directTargets).toContain("png");
    expect(directTargets).toContain("tiff");
  });

  it("getAllEffectiveTargets(md/rst) derives png and tiff through html", () => {
    for (const source of ["md", "rst"]) {
      const discovery = getAllEffectiveTargets(source, ALL_DESKTOP, { environment: "linux" });
      const png = discovery.oneIntermediate.find((route) => route.destination === "png");
      const tiff = discovery.oneIntermediate.find((route) => route.destination === "tiff");
      expect(png?.steps.map((step) => `${step.source}->${step.target}`)).toEqual([`${source}->html`, "html->png"]);
      expect(tiff?.steps.map((step) => `${step.source}->${step.target}`)).toEqual([`${source}->html`, "html->tiff"]);
    }
  });

  it("getAllEffectiveTargets(pdf) includes txt, html and md as direct", () => {
    const discovery = getAllEffectiveTargets("pdf", ALL_DESKTOP, { environment: "linux" });
    const directTargets = discovery.direct.map((route) => route.destination);
    expect(directTargets).toContain("txt");
    expect(directTargets).toContain("html");
    expect(directTargets).toContain("md");
  });

  it("getAllEffectiveTargets(aac) includes mp3/wav/flac/m4a/ogg direct", () => {
    const discovery = getAllEffectiveTargets("aac", ALL_DESKTOP, { environment: "linux" });
    const directTargets = discovery.direct.map((route) => route.destination);
    for (const target of ["mp3", "wav", "flac", "m4a", "ogg"]) {
      expect(directTargets).toContain(target);
    }
  });

  it("getAllEffectiveSources(pdf) includes odp and images as direct sources", () => {
    const discovery = getAllEffectiveSources("pdf", ALL_DESKTOP, { environment: "linux" });
    const directSources = discovery.direct.map((route) => route.source);
    expect(directSources).toContain("odp");
    expect(directSources).toContain("png");
    expect(directSources).toContain("jpg");
    expect(directSources).toContain("webp");
    expect(directSources).toContain("tiff");
  });

  it("getAllEffectiveTargets(wmv) and (ts) include mp4/webm/mkv direct", () => {
    for (const source of ["wmv", "ts"]) {
      const discovery = getAllEffectiveTargets(source, ALL_DESKTOP, { environment: "linux" });
      const directTargets = discovery.direct.map((route) => route.destination);
      for (const target of ["mp4", "webm", "mkv"]) {
        expect(directTargets).toContain(target);
      }
    }
  });

  it("getAllEffectiveTargets(pdf) includes docx as direct (§33)", () => {
    const discovery = getAllEffectiveTargets("pdf", ALL_DESKTOP, { environment: "linux" });
    expect(discovery.direct.map((route) => route.destination)).toContain("docx");
  });

  it("getAllEffectiveSources(docx) includes pdf as direct (§33)", () => {
    const discovery = getAllEffectiveSources("docx", ALL_DESKTOP, { environment: "linux" });
    expect(discovery.direct.map((route) => route.source)).toContain("pdf");
  });
});
