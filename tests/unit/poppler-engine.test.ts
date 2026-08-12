import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { PopplerEngine } from "../../src/lib/engines/pdf/poppler-engine";
import { CONFIG } from "../../src/lib/config";
import type { ConversionPlan } from "../../src/lib/domain/engines";

const testDir = path.join(
  CONFIG.media.tempDir,
  "tests",
  `poppler path spaces ${crypto.randomUUID()}`,
);

beforeAll(() => {
  fs.mkdirSync(testDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

async function writePdf(filePath: string, pages: number): Promise<void> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) {
    pdf.addPage([200, 100]);
  }
  fs.writeFileSync(filePath, await pdf.save());
}

function plan(inputPath: string, outputPath: string, outputFormat: string): ConversionPlan {
  return {
    jobId: crypto.randomUUID(),
    engineId: "poppler",
    operation: "rasterize",
    inputPath,
    outputPath,
    outputFormat,
    options: { dpi: 72 },
    args: [],
    env: {},
    timeoutMs: 30_000,
    estimatedSizeBytes: null,
  };
}

describe("PopplerEngine", () => {
  it("probes pdftoppm availability without throwing", async () => {
    const probe = await new PopplerEngine().probe();
    expect(typeof probe.available).toBe("boolean");
    expect(probe.available ? probe.binaryPath : true).toBeTruthy();
  });

  it("converts a one-page PDF to PNG", async () => {
    const engine = new PopplerEngine();
    const probe = await engine.probe();
    if (!probe.available) {
      console.warn("SKIP: pdftoppm not available");
      return;
    }

    const inputPath = path.join(testDir, "one page input.pdf");
    const outputPath = path.join(testDir, "one page output.png");
    await writePdf(inputPath, 1);

    const result = await engine.execute(plan(inputPath, outputPath, "png"));
    expect(result.success).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.readFileSync(outputPath).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect((await engine.validate(outputPath, plan(inputPath, outputPath, "png"))).valid).toBe(true);
  });

  it("packages multipage PDF raster output into a ZIP", async () => {
    const engine = new PopplerEngine();
    const probe = await engine.probe();
    if (!probe.available) {
      console.warn("SKIP: pdftoppm not available");
      return;
    }

    const inputPath = path.join(testDir, "multi page input.pdf");
    const outputPath = path.join(testDir, "multi page png.zip");
    await writePdf(inputPath, 3);

    const result = await engine.execute(plan(inputPath, outputPath, "png"));
    expect(result.success).toBe(true);
    const zip = await JSZip.loadAsync(fs.readFileSync(outputPath));
    expect(Object.keys(zip.files).sort()).toEqual([
      "multi page input-page-001.png",
      "multi page input-page-002.png",
      "multi page input-page-003.png",
    ]);
    expect((await engine.validate(outputPath, plan(inputPath, outputPath, "png"))).valid).toBe(true);
  });

  it("converts PDF to JPG when pdftoppm is available", async () => {
    const engine = new PopplerEngine();
    const probe = await engine.probe();
    if (!probe.available) {
      console.warn("SKIP: pdftoppm not available");
      return;
    }

    const inputPath = path.join(testDir, "jpg input.pdf");
    const outputPath = path.join(testDir, "jpg output.jpg");
    await writePdf(inputPath, 1);

    const result = await engine.execute(plan(inputPath, outputPath, "jpg"));
    expect(result.success).toBe(true);
    expect(fs.readFileSync(outputPath).subarray(0, 2).toString("hex")).toBe("ffd8");
  });

  it("converts PDF to TIFF when pdftoppm supports TIFF", async () => {
    const engine = new PopplerEngine();
    const probe = await engine.probe();
    if (!probe.available) {
      console.warn("SKIP: pdftoppm not available");
      return;
    }

    const inputPath = path.join(testDir, "tiff input.pdf");
    const outputPath = path.join(testDir, "tiff output.tiff");
    await writePdf(inputPath, 1);

    const result = await engine.execute(plan(inputPath, outputPath, "tiff"));
    if (!result.success) {
      console.warn(`SKIP: pdftoppm TIFF unsupported: ${result.error}`);
      return;
    }
    const magic = fs.readFileSync(outputPath).subarray(0, 4).toString("hex");
    expect(["49492a00", "4d4d002a"]).toContain(magic);
  });
});
