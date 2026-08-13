// Unit tests for PDF → DOCX via LibreOffice writer_pdf_import.
// PDFDOCX-UNIT-001..005 (phase spec §38). Real fidelity execution lives in
// tests/integration/pdf-docx-real.test.ts (PDFDOCX-001..010).

import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  LibreOfficeEngine,
  SCANNED_PDF_DOCX_ERROR,
} from "../../src/lib/engines/document/libreoffice-engine";
import { resolvePopplerTool } from "../../src/lib/engines/pdf/poppler-engine";
import { ProcessRunner } from "../../src/lib/infrastructure/processes/process-runner";
import { getCanonicalConversionEdges } from "../../src/lib/conversion-matrix/matrix";
import { OPERATION_CATALOG } from "../../src/lib/domain/operations";
import { CONFIG } from "../../src/lib/config";
import type { UniversalFileDescriptor } from "../../src/lib/domain/descriptors";
import type { ConversionPlan, EngineProbeResult } from "../../src/lib/domain/engines";

function makePdfDescriptor(name = "input.pdf"): UniversalFileDescriptor {
  return {
    id: crypto.randomUUID(),
    category: "pdf",
    originalName: name,
    extension: "pdf",
    detectedMimeType: "application/pdf",
    detectedFormat: "pdf",
    sizeBytes: 20_000,
    sha256: null,
    source: { kind: "local-upload", originalName: name, storedRelativePath: name },
    attributes: {
      kind: "pdf",
      pageCount: 2,
      hasTextLayer: true,
      hasEmbeddedFonts: true,
      isEncrypted: false,
      pdfVersion: "1.7",
    } as unknown as UniversalFileDescriptor["attributes"],
    warnings: [],
    analyzedBy: [],
    analyzedAt: new Date().toISOString(),
  };
}

const AVAILABLE_PROBE: EngineProbeResult = {
  available: true,
  version: "LibreOffice 7.6",
  binaryPath: "/usr/bin/libreoffice",
  capabilities: ["pdf-to-docx", "pdf-to-odt"],
};

const UNAVAILABLE_PROBE: EngineProbeResult = {
  available: false,
  version: null,
  binaryPath: null,
  capabilities: [],
  error: "libreoffice not found",
};

describe("PDFDOCX-UNIT-001 — single runtime resolution source", () => {
  it("pdftotext resolves through the shared Poppler resolver, same runtime as pdftohtml", () => {
    const txt = resolvePopplerTool("pdftotext");
    const html = resolvePopplerTool("pdftohtml");
    expect(txt).toBeTruthy();
    // Same distribution directory → diagnostics/execution cannot diverge (§39).
    expect(path.dirname(txt)).toBe(path.dirname(html));
  });

  it("canonical edge depends on libreoffice + pdftotext, not on a second resolver", () => {
    const edge = getCanonicalConversionEdges().find(
      (e) => e.source === "pdf" && e.target === "docx",
    );
    expect(edge).toBeDefined();
    expect(edge!.engineId).toBe("libreoffice");
    expect(edge!.dependencies).toContain("libreoffice");
    expect(edge!.dependencies).toContain("pdftotext");
  });
});

describe("PDFDOCX-UNIT-002 — adapter args", () => {
  afterEach(() => vi.restoreAllMocks());

  function makePlan(tmpDir: string): ConversionPlan {
    return {
      jobId: `pdfdocx-unit-${Date.now()}`,
      engineId: "libreoffice",
      operation: "convert-pdf-to-docx",
      inputPath: path.join(tmpDir, "dir with spaces", "input file.pdf"),
      outputPath: path.join(tmpDir, "dir with spaces", "output file.docx"),
      outputFormat: "docx",
      options: { inputFormat: "pdf" },
      args: [],
      env: {},
      timeoutMs: 60_000,
      estimatedSizeBytes: 1_000_000,
    };
  }

  it("adds --infilter=writer_pdf_import and passes spaced paths as single args", async () => {
    const tmpDir = path.join(CONFIG.media.tempDir, "pdfdocx-unit");
    fs.mkdirSync(path.join(tmpDir, "dir with spaces"), { recursive: true });
    const plan = makePlan(tmpDir);
    fs.writeFileSync(plan.inputPath, "%PDF-1.7 fake\n");

    const captured: string[][] = [];
    vi.spyOn(ProcessRunner.prototype, "run").mockImplementation(async function (this: ProcessRunner, opts: { args: string[] }) {
      captured.push(opts.args);
      if (opts.args.includes("--convert-to")) {
        // Simulate LibreOffice writing the converted file into --outdir.
        const outDir = opts.args[opts.args.indexOf("--outdir") + 1]!;
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, "input file.docx"), "PK fake docx");
        return { exitCode: 0, stdout: "", stderr: "", timedOut: false, durationMs: 1 };
      }
      // pdftotext guard: report a text layer so execution proceeds.
      return { exitCode: 0, stdout: "text layer present", stderr: "", timedOut: false, durationMs: 1 };
    });

    const engine = new LibreOfficeEngine();
    const result = await engine.execute(plan);

    expect(result.success).toBe(true);
    const loArgs = captured.find((a) => a.includes("--convert-to"))!;
    expect(loArgs).toContain("--infilter=writer_pdf_import");
    expect(loArgs).toContain(plan.inputPath); // single argv token, no shell concat
    expect(loArgs.some((a) => a.includes(" ") && a !== plan.inputPath && !a.startsWith("-env:"))).toBe(false);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("rejects scanned PDFs before conversion with the controlled OCR message", async () => {
    const tmpDir = path.join(CONFIG.media.tempDir, "pdfdocx-unit-scanned");
    fs.mkdirSync(path.join(tmpDir, "dir with spaces"), { recursive: true });
    const plan = makePlan(tmpDir);
    fs.writeFileSync(plan.inputPath, "%PDF-1.7 fake\n");

    vi.spyOn(ProcessRunner.prototype, "run").mockResolvedValue({
      exitCode: 0, stdout: "   \n", stderr: "", timedOut: false, durationMs: 1,
    });

    const engine = new LibreOfficeEngine();
    const result = await engine.execute(plan);

    expect(result.success).toBe(false);
    expect(result.error).toBe(SCANNED_PDF_DOCX_ERROR);
    expect(fs.existsSync(plan.outputPath)).toBe(false); // no fake success output (§37)
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe("PDFDOCX-UNIT-003 — source contract and matrix declaration", () => {
  it("pdf→docx edge is enabled, declared and implemented", () => {
    const edge = getCanonicalConversionEdges().find(
      (e) => e.source === "pdf" && e.target === "docx",
    );
    expect(edge!.enabled).toBe(true);
    expect(edge!.implemented).toBe(true);
    expect(edge!.declared).toBe(true);
  });

  it("pdf→docx is NOT an intermediate (§32)", () => {
    const edge = getCanonicalConversionEdges().find(
      (e) => e.source === "pdf" && e.target === "docx",
    );
    expect(edge!.supportsAsIntermediate).toBe(false);
  });

  it("operation office:pdf-to-docx exists in the catalog with pdf-only input", () => {
    const op = OPERATION_CATALOG.find((o) => o.id === "office:pdf-to-docx");
    expect(op).toBeDefined();
    expect(op!.inputFormats).toEqual(["pdf"]);
    expect(op!.outputFormats).toEqual(["docx"]);
    expect(op!.engineId).toBe("libreoffice");
  });
});

describe("PDFDOCX-UNIT-004 — unavailable runtime", () => {
  it("capability is unavailable-tool with explanatory reason when LibreOffice is missing", () => {
    const engine = new LibreOfficeEngine();
    const caps = engine.getCapabilities(makePdfDescriptor(), UNAVAILABLE_PROBE);
    const docx = caps.find((cap) => cap.outputFormat === "docx");
    expect(docx).toBeDefined();
    expect(docx!.state).toBe("unavailable-tool");
    expect(docx!.unavailableReason).toMatch(/LibreOffice/);
  });
});

describe("PDFDOCX-UNIT-005 — scanned PDF handling", () => {
  it("scanned OCR message matches the §36 UX contract", () => {
    expect(SCANNED_PDF_DOCX_ERROR).toContain("OCR");
    expect(SCANNED_PDF_DOCX_ERROR).toContain("escaneadas");
  });

  it("capability warnings disclose scanned/table/heading degradation", () => {
    const engine = new LibreOfficeEngine();
    const caps = engine.getCapabilities(makePdfDescriptor(), AVAILABLE_PROBE);
    const cap = caps.find((item) => item.outputFormat === "docx");
    expect(cap).toBeDefined();
    const warnings = cap!.warnings.join(" ");
    expect(warnings).toContain("OCR");
    expect(warnings).toContain("tablas");
    expect(cap!.operation).toBe("convert-pdf-to-docx");
  });

  it("non-pdf descriptors in pdf category get no PDF→DOCX capability", () => {
    const engine = new LibreOfficeEngine();
    const desc = { ...makePdfDescriptor(), extension: "txt" };
    expect(engine.getCapabilities(desc, AVAILABLE_PROBE)).toHaveLength(0);
  });
});
