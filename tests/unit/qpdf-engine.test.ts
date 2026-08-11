import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PDFDocument } from "pdf-lib";
import { QpdfEngine } from "../../src/lib/engines/pdf/qpdf-engine";
import { CONFIG } from "../../src/lib/config";
import type { ConversionPlan } from "../../src/lib/domain/engines";

const testDir = path.join(
  CONFIG.media.tempDir,
  "tests",
  `qpdf-${crypto.randomUUID()}`,
);

beforeAll(() => {
  fs.mkdirSync(testDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

async function writePdf(filePath: string): Promise<void> {
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 100]);
  fs.writeFileSync(filePath, await pdf.save());
}

async function readFirstPageRotation(filePath: string): Promise<number> {
  const pdf = await PDFDocument.load(fs.readFileSync(filePath));
  return pdf.getPage(0).getRotation().angle;
}

describe("QpdfEngine — rotate", () => {
  it("applies real page rotation and validates the changed output", async () => {
    const engine = new QpdfEngine();
    const probe = await engine.probe();
    if (!probe.available) {
      console.warn("SKIP: qpdf not available");
      return;
    }

    const inputPath = path.join(testDir, "rotate-input.pdf");
    const outputPath = path.join(testDir, "rotate-output.pdf");
    await writePdf(inputPath);

    const plan: ConversionPlan = {
      jobId: "qpdf-rotate-test",
      engineId: "qpdf",
      operation: "rotate",
      inputPath,
      outputPath,
      outputFormat: "pdf",
      options: { rotation: 90 },
      args: [],
      env: {},
      timeoutMs: 30_000,
      estimatedSizeBytes: 10_000,
    };

    expect(await readFirstPageRotation(inputPath)).toBe(0);
    const result = await engine.execute(plan);
    expect(result.success).toBe(true);
    expect(await readFirstPageRotation(outputPath)).toBe(90);

    const validation = await engine.validate(outputPath, plan);
    expect(validation.valid).toBe(true);
    expect(validation.checks.find((check) => check.name === "pdf-pages-rotated")?.passed).toBe(true);
  });

  it("supports 180 and 270 degree rotations", async () => {
    const engine = new QpdfEngine();
    const probe = await engine.probe();
    if (!probe.available) {
      console.warn("SKIP: qpdf not available");
      return;
    }

    for (const rotation of [180, 270] as const) {
      const inputPath = path.join(testDir, `rotate-${rotation}-input.pdf`);
      const outputPath = path.join(testDir, `rotate-${rotation}-output.pdf`);
      await writePdf(inputPath);

      const plan: ConversionPlan = {
        jobId: `qpdf-rotate-${rotation}-test`,
        engineId: "qpdf",
        operation: "rotate",
        inputPath,
        outputPath,
        outputFormat: "pdf",
        options: { rotation },
        args: [],
        env: {},
        timeoutMs: 30_000,
        estimatedSizeBytes: 10_000,
      };

      const result = await engine.execute(plan);
      expect(result.success).toBe(true);
      expect(await readFirstPageRotation(outputPath)).toBe(rotation);
      expect((await engine.validate(outputPath, plan)).valid).toBe(true);
    }
  });
});
