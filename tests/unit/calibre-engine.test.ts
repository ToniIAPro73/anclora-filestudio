// Unit tests for the Calibre ebook conversion engine.
// Focuses on capability matrix, loss profiles, availability, and probe.
// No execution tests (calibre not installed in dev environment).

import { describe, it, expect } from "vitest";
import { CalibreEngine } from "../../src/lib/engines/ebook/calibre-engine";
import type { UniversalFileDescriptor } from "../../src/lib/domain/descriptors";
import type { EngineProbeResult } from "../../src/lib/domain/engines";
import crypto from "crypto";

function makeDescriptor(ext: string, category: string = "ebook", sizeBytes = 5_000): UniversalFileDescriptor {
  return {
    id: crypto.randomUUID(),
    category: category as UniversalFileDescriptor["category"],
    originalName: `test.${ext}`,
    extension: ext,
    detectedMimeType: null,
    detectedFormat: ext,
    sizeBytes,
    sha256: null,
    source: { kind: "local-upload", originalName: `test.${ext}`, storedRelativePath: `test.${ext}` },
    attributes: { kind: "ebook", hasDrm: false, pageCount: null, title: null, author: null, language: null, publisher: null, ebookFormat: ext },
    warnings: [],
    analyzedBy: [],
    analyzedAt: new Date().toISOString(),
  };
}

const AVAILABLE_PROBE: EngineProbeResult = {
  available: true,
  version: "calibre 6.0",
  binaryPath: "/usr/bin/ebook-convert",
  capabilities: ["epub", "mobi", "azw3", "html", "docx"],
};

const UNAVAILABLE_PROBE: EngineProbeResult = {
  available: false,
  version: null,
  binaryPath: null,
  capabilities: [],
  error: "ebook-convert not found",
};

describe("CalibreEngine — capability matrix", () => {
  const engine = new CalibreEngine();

  it("returns no capabilities for image category", () => {
    const desc = makeDescriptor("epub", "image");
    expect(engine.getCapabilities(desc, AVAILABLE_PROBE)).toHaveLength(0);
  });

  it("returns no capabilities for video category", () => {
    const desc = makeDescriptor("epub", "video");
    expect(engine.getCapabilities(desc, AVAILABLE_PROBE)).toHaveLength(0);
  });

  it("returns no capabilities for unknown extension", () => {
    const desc = makeDescriptor("xyz", "ebook");
    expect(engine.getCapabilities(desc, AVAILABLE_PROBE)).toHaveLength(0);
  });

  it("EPUB input offers MOBI, AZW3, PDF outputs", () => {
    const caps = engine.getCapabilities(makeDescriptor("epub"), AVAILABLE_PROBE);
    const outFmts = caps.map((c) => c.outputFormat);
    expect(outFmts).toContain("mobi");
    expect(outFmts).toContain("azw3");
    expect(outFmts).toContain("pdf");
    expect(caps.length).toBe(3);
  });

  it("MOBI input offers EPUB output", () => {
    const caps = engine.getCapabilities(makeDescriptor("mobi"), AVAILABLE_PROBE);
    const outFmts = caps.map((c) => c.outputFormat);
    expect(outFmts).toContain("epub");
    expect(caps.length).toBe(1);
  });

  it("AZW3 input offers EPUB output", () => {
    const caps = engine.getCapabilities(makeDescriptor("azw3"), AVAILABLE_PROBE);
    const outFmts = caps.map((c) => c.outputFormat);
    expect(outFmts).toContain("epub");
    expect(caps.length).toBe(1);
  });

  it("HTML input offers EPUB output", () => {
    const caps = engine.getCapabilities(makeDescriptor("html"), AVAILABLE_PROBE);
    const outFmts = caps.map((c) => c.outputFormat);
    expect(outFmts).toContain("epub");
    expect(caps.length).toBe(1);
  });

  it("DOCX input offers EPUB output", () => {
    const caps = engine.getCapabilities(makeDescriptor("docx"), AVAILABLE_PROBE);
    const outFmts = caps.map((c) => c.outputFormat);
    expect(outFmts).toContain("epub");
    expect(caps.length).toBe(1);
  });

  it("rejects files exceeding 50MB", () => {
    const bigFile = makeDescriptor("epub", "ebook", 51 * 1024 * 1024);
    expect(engine.getCapabilities(bigFile, AVAILABLE_PROBE)).toHaveLength(0);
  });

  it("accepts files at exactly 50MB", () => {
    const exactLimit = makeDescriptor("epub", "ebook", 50 * 1024 * 1024);
    expect(engine.getCapabilities(exactLimit, AVAILABLE_PROBE)).toHaveLength(3);
  });
});

describe("CalibreEngine — loss profiles", () => {
  const engine = new CalibreEngine();

  it("EPUB → MOBI is layout-risk", () => {
    const caps = engine.getCapabilities(makeDescriptor("epub"), AVAILABLE_PROBE);
    const mobi = caps.find((c) => c.outputFormat === "mobi");
    expect(mobi?.lossProfile).toBe("layout-risk");
  });

  it("EPUB → AZW3 is layout-risk", () => {
    const caps = engine.getCapabilities(makeDescriptor("epub"), AVAILABLE_PROBE);
    const azw3 = caps.find((c) => c.outputFormat === "azw3");
    expect(azw3?.lossProfile).toBe("layout-risk");
  });

  it("EPUB → PDF is lossy", () => {
    const caps = engine.getCapabilities(makeDescriptor("epub"), AVAILABLE_PROBE);
    const pdf = caps.find((c) => c.outputFormat === "pdf");
    expect(pdf?.lossProfile).toBe("lossy");
  });

  it("HTML → EPUB is metadata-risk", () => {
    const caps = engine.getCapabilities(makeDescriptor("html"), AVAILABLE_PROBE);
    const epub = caps.find((c) => c.outputFormat === "epub");
    expect(epub?.lossProfile).toBe("metadata-risk");
  });

  it("DOCX → EPUB is metadata-risk", () => {
    const caps = engine.getCapabilities(makeDescriptor("docx"), AVAILABLE_PROBE);
    const epub = caps.find((c) => c.outputFormat === "epub");
    expect(epub?.lossProfile).toBe("metadata-risk");
  });

  it("MOBI → EPUB is metadata-risk", () => {
    const caps = engine.getCapabilities(makeDescriptor("mobi"), AVAILABLE_PROBE);
    const epub = caps.find((c) => c.outputFormat === "epub");
    expect(epub?.lossProfile).toBe("metadata-risk");
  });

  it("EPUB → MOBI has a warning about layout loss", () => {
    const caps = engine.getCapabilities(makeDescriptor("epub"), AVAILABLE_PROBE);
    const mobi = caps.find((c) => c.outputFormat === "mobi");
    expect(mobi?.warnings.length).toBeGreaterThan(0);
    expect(mobi?.warnings[0]).toMatch(/diseño|layout/i);
  });

  it("EPUB → PDF has a warning about fixed layout", () => {
    const caps = engine.getCapabilities(makeDescriptor("epub"), AVAILABLE_PROBE);
    const pdf = caps.find((c) => c.outputFormat === "pdf");
    expect(pdf?.warnings.length).toBeGreaterThan(0);
    expect(pdf?.warnings[0]).toMatch(/reflow|fijo/i);
  });
});

describe("CalibreEngine — availability states", () => {
  const engine = new CalibreEngine();

  it("marks all capabilities as available when probe succeeds", () => {
    const caps = engine.getCapabilities(makeDescriptor("epub"), AVAILABLE_PROBE);
    expect(caps.every((c) => c.state === "available")).toBe(true);
  });

  it("marks all capabilities as unavailable-tool when probe fails", () => {
    const caps = engine.getCapabilities(makeDescriptor("epub"), UNAVAILABLE_PROBE);
    expect(caps.every((c) => c.state === "unavailable-tool")).toBe(true);
  });

  it("unavailable-tool capabilities include Calibre in reason", () => {
    const caps = engine.getCapabilities(makeDescriptor("epub"), UNAVAILABLE_PROBE);
    expect(caps[0]?.unavailableReason).toMatch(/[Cc]alibre/);
  });
});

describe("CalibreEngine — engine metadata", () => {
  const engine = new CalibreEngine();

  it("has id 'calibre'", () => {
    expect(engine.id).toBe("calibre");
  });

  it("supports ebook category", () => {
    expect(engine.supportedCategories).toContain("ebook");
  });

  it("capabilities have correct engineId", () => {
    const caps = engine.getCapabilities(makeDescriptor("epub"), AVAILABLE_PROBE);
    expect(caps.every((c) => c.engineId === "calibre")).toBe(true);
  });

  it("capabilities have desktop-only mobile portability", () => {
    const caps = engine.getCapabilities(makeDescriptor("epub"), AVAILABLE_PROBE);
    expect(caps.every((c) => c.mobilePortability === "desktop-only")).toBe(true);
  });

  it("capabilities have correct operation", () => {
    const caps = engine.getCapabilities(makeDescriptor("epub"), AVAILABLE_PROBE);
    expect(caps.every((c) => c.operation === "convert-ebook")).toBe(true);
  });

  it("capabilities include presets", () => {
    const caps = engine.getCapabilities(makeDescriptor("epub"), AVAILABLE_PROBE);
    expect(caps.every((c) => c.presets.length > 0)).toBe(true);
  });
});
