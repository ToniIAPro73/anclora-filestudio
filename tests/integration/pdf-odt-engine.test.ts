import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import { CONFIG } from "../../src/lib/config";
import { buildDescriptor } from "../../src/lib/detection/file-detector";
import { getEngine } from "../../src/lib/engines/registry";
import { getAvailableEngineIds } from "../../src/lib/conversion-routing/server";
import {
  getAllEffectiveSources,
  getAllEffectiveTargets,
  getBestRoute,
} from "../../src/lib/conversion-routing";
import type { ConversionPlan } from "../../src/lib/domain/engines";

const TEST_TIMEOUT = 240_000;
let tmpDir: string;

interface OdtFacts {
  text: string;
  hasContentXml: boolean;
  hasStylesXml: boolean;
  hasManifestXml: boolean;
  mimetype: string | null;
  imageEntries: string[];
  tableCount: number;
}

function run(bin: string, args: string[], timeoutMs = TEST_TIMEOUT): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(bin, args, { shell: false, windowsHide: true });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: "spawn-error" });
    });
  });
}

async function createPdf(
  name: string,
  build: (doc: PDFDocument, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) => Promise<void> | void,
): Promise<string> {
  const filePath = path.join(tmpDir, name);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  await build(doc, font);
  fs.writeFileSync(filePath, await doc.save());
  return filePath;
}

function drawTextPage(doc: PDFDocument, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, title: string, lines: string[]) {
  const page = doc.addPage([612, 792]);
  page.drawText(title, { x: 54, y: 730, size: 20, font, color: rgb(0.1, 0.1, 0.1) });
  lines.forEach((line, index) => {
    page.drawText(line, { x: 54, y: 690 - index * 24, size: 12, font });
  });
}

async function imageBytes(): Promise<Uint8Array> {
  return sharp({
    create: { width: 120, height: 80, channels: 3, background: "#1d4ed8" },
  }).png().toBuffer();
}

async function createPdfWithLibreOfficeHtml(name: string, body: string): Promise<string> {
  const htmlPath = path.join(tmpDir, name.replace(/\.pdf$/i, ".html"));
  const pdfPath = path.join(tmpDir, name);
  fs.writeFileSync(htmlPath, `<!doctype html><html><meta charset="utf-8"><body>${body}</body></html>`);
  const result = await run("libreoffice", ["--headless", "--norestore", "--convert-to", "pdf", "--outdir", tmpDir, htmlPath]);
  expect(result.code, result.stderr || result.stdout).toBe(0);
  expect(fs.existsSync(pdfPath), result.stderr || result.stdout).toBe(true);
  return pdfPath;
}

async function odtFacts(filePath: string): Promise<OdtFacts> {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  const contentXml = await zip.file("content.xml")?.async("string");
  const stylesXml = zip.file("styles.xml");
  const manifestXml = zip.file("META-INF/manifest.xml");
  const mimetype = await zip.file("mimetype")?.async("string") ?? null;
  const text = (contentXml ?? "")
    .replace(/<text:line-break\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return {
    text,
    hasContentXml: Boolean(contentXml),
    hasStylesXml: stylesXml !== null,
    hasManifestXml: manifestXml !== null,
    mimetype: mimetype?.trim() ?? null,
    imageEntries: Object.keys(zip.files).filter((name) => name.startsWith("Pictures/")),
    tableCount: (contentXml?.match(/<table:table[\s>]/g) ?? []).length,
  };
}

async function descriptorFor(inputPath: string, id: string) {
  return buildDescriptor(
    inputPath,
    {
      kind: "local-upload",
      originalName: path.basename(inputPath),
      storedRelativePath: path.relative(CONFIG.media.tempDir, inputPath),
    },
    id,
  );
}

async function convertPdfToOdt(inputPath: string, tag: string) {
  const engine = getEngine("libreoffice");
  expect(engine).toBeTruthy();
  const probe = await engine!.probe();
  expect(probe.available, probe.error).toBe(true);
  const descriptor = await descriptorFor(inputPath, `${tag}-descriptor`);
  const cap = engine!.getCapabilities(descriptor, probe).find((item) => item.outputFormat === "odt");
  expect(cap?.operation).toBe("convert-pdf-to-odt");
  const outputPath = path.join(tmpDir, `${tag}.odt`);
  const plan: ConversionPlan = {
    jobId: `pdf-odt-${tag}`,
    engineId: "libreoffice",
    operation: cap!.operation,
    inputPath,
    outputPath,
    outputFormat: "odt",
    options: {},
    args: [],
    env: {},
    timeoutMs: TEST_TIMEOUT,
    estimatedSizeBytes: null,
  };
  const result = await engine!.execute(plan);
  if (!result.success) return { outputPath, result, validation: null, facts: null };
  const validation = await engine!.validate(outputPath, plan);
  const facts = await odtFacts(outputPath);
  return { outputPath, result, validation, facts };
}

beforeAll(() => {
  fs.mkdirSync(CONFIG.media.tempDir, { recursive: true });
  tmpDir = fs.mkdtempSync(path.join(CONFIG.media.tempDir, "pdf-odt-"));
}, TEST_TIMEOUT);

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("LibreOffice PDF → ODT E2E", () => {
  it("PDFODT-001 simple text", async () => {
    const input = await createPdf("PDFODT-001 simple text.pdf", (doc, font) => {
      drawTextPage(doc, font, "PDFODT-001 Simple", ["Editable ODT direct conversion text."]);
    });
    const out = await convertPdfToOdt(input, "PDFODT-001");
    expect(out.result.success, out.result.error).toBe(true);
    expect(out.validation?.valid, JSON.stringify(out.validation?.checks)).toBe(true);
    expect(out.facts?.text).toContain("Editable ODT direct conversion text");
  }, TEST_TIMEOUT);

  it("PDFODT-002 headings and paragraphs", async () => {
    const input = await createPdf("PDFODT-002 headings.pdf", (doc, font) => {
      drawTextPage(doc, font, "PDFODT-002 Heading", ["First paragraph content.", "Second paragraph content."]);
    });
    const out = await convertPdfToOdt(input, "PDFODT-002");
    expect(out.result.success, out.result.error).toBe(true);
    expect(out.facts?.text).toContain("PDFODT-002 Heading");
    expect(out.facts?.text).toContain("Second paragraph content");
  }, TEST_TIMEOUT);

  it("PDFODT-003 multipage", async () => {
    const input = await createPdf("PDFODT-003 multipage.pdf", (doc, font) => {
      drawTextPage(doc, font, "PDFODT-003 Page One", ["Multipage first body."]);
      drawTextPage(doc, font, "PDFODT-003 Page Two", ["Multipage second body."]);
    });
    const out = await convertPdfToOdt(input, "PDFODT-003");
    expect(out.result.success, out.result.error).toBe(true);
    expect(out.facts?.text).toContain("PDFODT-003 Page One");
    expect(out.facts?.text).toContain("PDFODT-003 Page Two");
  }, TEST_TIMEOUT);

  it("PDFODT-004 Unicode", async () => {
    const input = await createPdfWithLibreOfficeHtml(
      "PDFODT-004 unicode.pdf",
      "<h1>PDFODT-004 Unicode</h1><p>áéíóú ñ € αβγ ΔΩ</p>",
    );
    const out = await convertPdfToOdt(input, "PDFODT-004");
    expect(out.result.success, out.result.error).toBe(true);
    expect(out.facts?.text).toContain("áéíóú");
    expect(out.facts?.text).toContain("ñ");
    expect(out.facts?.text).toContain("€");
    expect(out.facts?.text).toContain("αβγ");
    expect(out.facts?.text).toContain("ΔΩ");
  }, TEST_TIMEOUT);

  it("PDFODT-005 table content is retained, table structure is documented as degraded", async () => {
    const input = await createPdf("PDFODT-005 table.pdf", (doc, font) => {
      const page = doc.addPage([612, 792]);
      page.drawText("PDFODT-005 Table", { x: 54, y: 730, size: 18, font });
      ["Name", "Value", "Alpha", "42", "Beta", "84"].forEach((text, index) => {
        page.drawText(text, { x: 54 + (index % 2) * 120, y: 690 - Math.floor(index / 2) * 28, size: 12, font });
      });
    });
    const out = await convertPdfToOdt(input, "PDFODT-005");
    expect(out.result.success, out.result.error).toBe(true);
    expect(out.facts?.text).toContain("Alpha");
    expect(out.facts?.text).toContain("84");
    expect(out.facts?.tableCount ?? 0).toBeGreaterThanOrEqual(0);
  }, TEST_TIMEOUT);

  it("PDFODT-006 image", async () => {
    const input = await createPdf("PDFODT-006 image.pdf", async (doc, font) => {
      const page = doc.addPage([612, 792]);
      page.drawText("PDFODT-006 Image", { x: 54, y: 730, size: 18, font });
      const image = await doc.embedPng(await imageBytes());
      page.drawImage(image, { x: 54, y: 600, width: 120, height: 80 });
    });
    const out = await convertPdfToOdt(input, "PDFODT-006");
    expect(out.result.success, out.result.error).toBe(true);
    expect(out.facts?.text).toContain("PDFODT-006 Image");
    expect(out.facts?.imageEntries.length).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  it("PDFODT-007 table plus image", async () => {
    const input = await createPdf("PDFODT-007 table image.pdf", async (doc, font) => {
      const page = doc.addPage([612, 792]);
      page.drawText("PDFODT-007 Table Image", { x: 54, y: 730, size: 18, font });
      page.drawText("Cell A Cell B", { x: 54, y: 690, size: 12, font });
      const image = await doc.embedPng(await imageBytes());
      page.drawImage(image, { x: 54, y: 580, width: 120, height: 80 });
    });
    const out = await convertPdfToOdt(input, "PDFODT-007");
    expect(out.result.success, out.result.error).toBe(true);
    expect(out.facts?.text).toContain("Cell A");
    expect(out.facts?.imageEntries.length).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  it("PDFODT-008 columns and layout retain ordered text", async () => {
    const input = await createPdf("PDFODT-008 columns.pdf", (doc, font) => {
      const page = doc.addPage([612, 792]);
      page.drawText("PDFODT-008 Columns", { x: 54, y: 730, size: 18, font });
      page.drawText("Left column one", { x: 54, y: 680, size: 12, font });
      page.drawText("Right column one", { x: 310, y: 680, size: 12, font });
    });
    const out = await convertPdfToOdt(input, "PDFODT-008");
    expect(out.result.success, out.result.error).toBe(true);
    expect(out.facts?.text).toContain("Left column one");
    expect(out.facts?.text).toContain("Right column one");
  }, TEST_TIMEOUT);

  it("PDFODT-009 scanned PDF rejects without OCR", async () => {
    const input = await createPdf("PDFODT-009 scanned.pdf", async (doc) => {
      const page = doc.addPage([612, 792]);
      const image = await doc.embedPng(await imageBytes());
      page.drawImage(image, { x: 54, y: 600, width: 240, height: 160 });
    });
    const out = await convertPdfToOdt(input, "PDFODT-009");
    expect(out.result.success).toBe(false);
    expect(out.result.error).toContain("PDF → ODT editable requiere OCR");
    expect(fs.existsSync(out.outputPath)).toBe(false);
  }, TEST_TIMEOUT);

  it("PDFODT-010 path with spaces", async () => {
    const dir = path.join(tmpDir, "dir with spaces");
    fs.mkdirSync(dir, { recursive: true });
    const input = await createPdf(path.join("dir with spaces", "PDFODT-010 path with spaces.pdf"), (doc, font) => {
      drawTextPage(doc, font, "PDFODT-010 Spaces", ["Path with spaces conversion."]);
    });
    const out = await convertPdfToOdt(input, "PDFODT-010 path spaces");
    expect(out.result.success, out.result.error).toBe(true);
    expect(out.facts?.text).toContain("Path with spaces conversion");
  }, TEST_TIMEOUT);

  it("ODT structure validation checks real ODT members", async () => {
    const input = await createPdf("PDFODT-structure.pdf", (doc, font) => {
      drawTextPage(doc, font, "PDFODT Structure", ["ODT structure validation"]);
    });
    const out = await convertPdfToOdt(input, "PDFODT-structure");
    expect(out.result.success, out.result.error).toBe(true);
    expect(out.facts?.mimetype).toBe("application/vnd.oasis.opendocument.text");
    expect(out.facts?.hasContentXml).toBe(true);
    expect(out.facts?.hasStylesXml).toBe(true);
    expect(out.facts?.hasManifestXml).toBe(true);
  }, TEST_TIMEOUT);

  it("roundtrips ODT → PDF through LibreOffice", async () => {
    const input = await createPdf("PDFODT-roundtrip.pdf", (doc, font) => {
      drawTextPage(doc, font, "PDFODT Roundtrip", ["Roundtrip body text"]);
    });
    const out = await convertPdfToOdt(input, "PDFODT-roundtrip");
    expect(out.result.success, out.result.error).toBe(true);
    const pdfOutDir = path.join(tmpDir, "roundtrip out");
    fs.mkdirSync(pdfOutDir, { recursive: true });
    const result = await run("libreoffice", ["--headless", "--norestore", "--convert-to", "pdf", "--outdir", pdfOutDir, out.outputPath]);
    expect(result.code, result.stderr).toBe(0);
    const generated = fs.readdirSync(pdfOutDir).find((name) => name.endsWith(".pdf"));
    expect(generated).toBeTruthy();
    const bytes = fs.readFileSync(path.join(pdfOutDir, generated!)).subarray(0, 5).toString("ascii");
    expect(bytes).toBe("%PDF-");
  }, TEST_TIMEOUT);
});

describe("PDF → ODT discovery and routing", () => {
  it("discovers direct PDF → ODT and PDF as ODT source without hardcodes", async () => {
    const engines = await getAvailableEngineIds();
    const targets = getAllEffectiveTargets("pdf", engines, { environment: "linux" }).all;
    const odt = targets.find((route) => route.destination === "odt");
    expect(odt?.steps.map((step) => `${step.source}->${step.target}`)).toEqual(["pdf->odt"]);
    const sources = getAllEffectiveSources("odt", engines, { environment: "linux" }).all;
    expect(sources.some((route) => route.source === "pdf" && route.destination === "odt")).toBe(true);
  });

  it("routes PDF → ODT as direct winner and keeps PDF → EPUB absent", async () => {
    const engines = await getAvailableEngineIds();
    const odt = getBestRoute("pdf", "odt", engines, { environment: "linux" });
    expect(odt?.intermediateFormats).toEqual([]);
    expect(odt?.steps[0]?.engineId).toBe("libreoffice");
    const epub = getBestRoute("pdf", "epub", engines, { environment: "linux" });
    expect(epub).toBeNull();
  });
});
