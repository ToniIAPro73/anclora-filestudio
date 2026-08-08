// Unit tests for the Tesseract OCR engine.
// Focuses on capabilities, language detection, availability, and PDF OCR routing.
// No execution tests (tesseract not installed in dev environment).

import { describe, it, expect } from "vitest";
import { TesseractEngine } from "../../src/lib/engines/ocr/tesseract-engine";
import type { UniversalFileDescriptor } from "../../src/lib/domain/descriptors";
import type { EngineProbeResult } from "../../src/lib/domain/engines";
import crypto from "crypto";

function makeImageDescriptor(ext: string, sizeBytes = 100_000): UniversalFileDescriptor {
  return {
    id: crypto.randomUUID(),
    category: "image",
    originalName: `test.${ext}`,
    extension: ext,
    detectedMimeType: null,
    detectedFormat: ext,
    sizeBytes,
    sha256: null,
    source: { kind: "local-upload", originalName: `test.${ext}`, storedRelativePath: `test.${ext}` },
    attributes: { kind: "image", width: 1024, height: 768, channels: 3, hasAlpha: false, format: ext, colorSpace: null, animated: false, frames: 1, densityPpi: 72, iccProfile: null },
    warnings: [],
    analyzedBy: [],
    analyzedAt: new Date().toISOString(),
  };
}

function makePdfDescriptor(): UniversalFileDescriptor {
  return {
    id: crypto.randomUUID(),
    category: "pdf",
    originalName: "test.pdf",
    extension: "pdf",
    detectedMimeType: "application/pdf",
    detectedFormat: "pdf",
    sizeBytes: 500_000,
    sha256: null,
    source: { kind: "local-upload", originalName: "test.pdf", storedRelativePath: "test.pdf" },
    attributes: { kind: "pdf", pageCount: 5, isEncrypted: false, isLinearized: false, pdfVersion: "1.7", hasAnnotations: false, hasForms: false, hasEmbeddedFiles: false },
    warnings: [],
    analyzedBy: [],
    analyzedAt: new Date().toISOString(),
  };
}

const AVAILABLE_PROBE: EngineProbeResult = {
  available: true,
  version: "tesseract 5.3",
  binaryPath: "/usr/bin/tesseract",
  capabilities: ["spa", "eng", "pdftoppm"],
};

const AVAILABLE_PROBE_NO_POPPLER: EngineProbeResult = {
  available: true,
  version: "tesseract 5.3",
  binaryPath: "/usr/bin/tesseract",
  capabilities: ["spa", "eng"],
};

const UNAVAILABLE_PROBE: EngineProbeResult = {
  available: false,
  version: null,
  binaryPath: null,
  capabilities: [],
  error: "tesseract not found",
};

describe("TesseractEngine — capability matrix for images", () => {
  const engine = new TesseractEngine();

  it("PNG input offers TXT and PDF outputs", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("png"), AVAILABLE_PROBE);
    const outFmts = caps.map((c) => c.outputFormat);
    expect(outFmts).toContain("txt");
    expect(outFmts).toContain("pdf");
  });

  it("JPEG input offers TXT and PDF outputs", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("jpeg"), AVAILABLE_PROBE);
    const outFmts = caps.map((c) => c.outputFormat);
    expect(outFmts).toContain("txt");
    expect(outFmts).toContain("pdf");
  });

  it("JPG extension (normalized) offers TXT output", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("jpg"), AVAILABLE_PROBE);
    const outFmts = caps.map((c) => c.outputFormat);
    expect(outFmts).toContain("txt");
  });

  it("TIFF input offers TXT output", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("tiff"), AVAILABLE_PROBE);
    const outFmts = caps.map((c) => c.outputFormat);
    expect(outFmts).toContain("txt");
  });

  it("WebP input offers TXT output", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("webp"), AVAILABLE_PROBE);
    const outFmts = caps.map((c) => c.outputFormat);
    expect(outFmts).toContain("txt");
  });

  it("returns no capabilities for audio category", () => {
    const desc = { ...makeImageDescriptor("png"), category: "audio" as const };
    expect(engine.getCapabilities(desc, AVAILABLE_PROBE)).toHaveLength(0);
  });

  it("returns no capabilities for unknown image extension", () => {
    const desc = makeImageDescriptor("bmp");
    expect(engine.getCapabilities(desc, AVAILABLE_PROBE)).toHaveLength(0);
  });
});

describe("TesseractEngine — capability matrix for PDF", () => {
  const engine = new TesseractEngine();

  it("PDF input offers TXT output when Poppler is available", () => {
    const caps = engine.getCapabilities(makePdfDescriptor(), AVAILABLE_PROBE);
    const outFmts = caps.map((c) => c.outputFormat);
    expect(outFmts).toContain("txt");
  });

  it("PDF input offers no OCR output when Poppler is unavailable", () => {
    const caps = engine.getCapabilities(makePdfDescriptor(), AVAILABLE_PROBE_NO_POPPLER);
    expect(caps).toHaveLength(0);
  });

  it("PDF → TXT is marked as experimental", () => {
    const caps = engine.getCapabilities(makePdfDescriptor(), AVAILABLE_PROBE);
    const txt = caps.find((c) => c.outputFormat === "txt");
    expect(txt?.state).toBe("experimental");
  });
});

describe("TesseractEngine — loss profiles", () => {
  const engine = new TesseractEngine();

  it("Image → TXT is lossy", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("png"), AVAILABLE_PROBE);
    const txt = caps.find((c) => c.outputFormat === "txt");
    expect(txt?.lossProfile).toBe("lossy");
  });

  it("Image → PDF is lossy", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("png"), AVAILABLE_PROBE);
    const pdf = caps.find((c) => c.outputFormat === "pdf");
    expect(pdf?.lossProfile).toBe("lossy");
  });

  it("PDF → TXT is lossy", () => {
    const caps = engine.getCapabilities(makePdfDescriptor(), AVAILABLE_PROBE);
    const txt = caps.find((c) => c.outputFormat === "txt");
    expect(txt?.lossProfile).toBe("lossy");
  });
});

describe("TesseractEngine — language detection", () => {
  const engine = new TesseractEngine();

  it("capabilities have correct engineId", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("png"), AVAILABLE_PROBE);
    expect(caps.every((c) => c.engineId === "tesseract")).toBe(true);
  });

  it("TXT output is recommended", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("png"), AVAILABLE_PROBE);
    const txt = caps.find((c) => c.outputFormat === "txt");
    expect(txt?.recommended).toBe(true);
  });

  it("capabilities have presets", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("png"), AVAILABLE_PROBE);
    expect(caps.every((c) => c.presets.length > 0)).toBe(true);
  });

  it("preset label references spa+eng", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("png"), AVAILABLE_PROBE);
    const txt = caps.find((c) => c.outputFormat === "txt");
    expect(txt?.presets[0]?.label).toMatch(/spa.*eng/);
  });
});

describe("TesseractEngine — availability states", () => {
  const engine = new TesseractEngine();

  it("marks capabilities as available when probe succeeds", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("png"), AVAILABLE_PROBE);
    const imageCaps = caps.filter((c) => c.operation === "ocr-image-to-text");
    expect(imageCaps.every((c) => c.state === "available")).toBe(true);
  });

  it("marks all capabilities as unavailable-tool when probe fails", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("png"), UNAVAILABLE_PROBE);
    expect(caps.every((c) => c.state === "unavailable-tool")).toBe(true);
  });

  it("unavailable-tool capabilities include Tesseract in reason", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("png"), UNAVAILABLE_PROBE);
    expect(caps[0]?.unavailableReason).toMatch(/[Tt]esseract/);
  });
});

describe("TesseractEngine — engine metadata", () => {
  const engine = new TesseractEngine();

  it("has id 'tesseract'", () => {
    expect(engine.id).toBe("tesseract");
  });

  it("supports image and pdf categories", () => {
    expect(engine.supportedCategories).toContain("image");
    expect(engine.supportedCategories).toContain("pdf");
  });

  it("capabilities have desktop-only mobile portability", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("png"), AVAILABLE_PROBE);
    expect(caps.every((c) => c.mobilePortability === "desktop-only")).toBe(true);
  });
});

describe("TesseractEngine — PDF OCR routing", () => {
  const engine = new TesseractEngine();

  it("PDF OCR capability has page limit warning", () => {
    const caps = engine.getCapabilities(makePdfDescriptor(), AVAILABLE_PROBE);
    const txt = caps.find((c) => c.outputFormat === "txt");
    expect(txt?.warnings.some((w) => w.includes("50"))).toBe(true);
  });

  it("PDF OCR operation is ocr-pdf-to-text", () => {
    const caps = engine.getCapabilities(makePdfDescriptor(), AVAILABLE_PROBE);
    const txt = caps.find((c) => c.outputFormat === "txt");
    expect(txt?.operation).toBe("ocr-pdf-to-text");
  });

  it("Image OCR to TXT operation is ocr-image-to-text", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("png"), AVAILABLE_PROBE);
    const txt = caps.find((c) => c.outputFormat === "txt");
    expect(txt?.operation).toBe("ocr-image-to-text");
  });

  it("Image OCR to PDF operation is ocr-image-to-pdf", () => {
    const caps = engine.getCapabilities(makeImageDescriptor("png"), AVAILABLE_PROBE);
    const pdf = caps.find((c) => c.outputFormat === "pdf");
    expect(pdf?.operation).toBe("ocr-image-to-pdf");
  });
});
