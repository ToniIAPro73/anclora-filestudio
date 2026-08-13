/**
 * PDF → DOCX E2E — real LibreOffice writer_pdf_import execution.
 * Corpus PDFDOCX-001..010 (phase spec §15). FAILS if LibreOffice or
 * pdftotext are missing — no silent skips.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import JSZip from "jszip";

import { libreOfficeEngine, SCANNED_PDF_DOCX_ERROR } from "../../src/lib/engines/document/libreoffice-engine";
import { CONFIG } from "../../src/lib/config";
import type { ConversionPlan } from "../../src/lib/domain/engines";

const LO_TIMEOUT = 120_000;

let tmpDir: string;
const F: Record<string, string> = {};

function run(bin: string, args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let out = "";
    let err = "";
    const child = spawn(bin, args, { shell: false, windowsHide: true });
    child.stdout?.on("data", (d: Buffer) => { out += d.toString(); });
    child.stderr?.on("data", (d: Buffer) => { err += d.toString(); });
    child.on("close", (code) => resolve({ code, stdout: out, stderr: err }));
    child.on("error", () => resolve({ code: null, stdout: "", stderr: "spawn-error" }));
  });
}

function requireBin(name: string): void {
  try {
    if (fs.existsSync(name)) return;
    execSync(`which ${name}`, { stdio: "ignore" });
  } catch {
    throw new Error(`Binary not available: ${name}. Required for PDF→DOCX E2E.`);
  }
}

function makePlan(inputPath: string, outputPath: string): ConversionPlan {
  return {
    jobId: `pdfdocx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    engineId: "libreoffice",
    operation: "convert-pdf-to-docx",
    inputPath,
    outputPath,
    outputFormat: "docx",
    options: { inputFormat: "pdf" },
    args: [],
    env: {},
    timeoutMs: LO_TIMEOUT,
    estimatedSizeBytes: 1_000_000,
  };
}

// ── Validation helpers (§16) ────────────────────────────────────────────────

async function inspectDocx(file: string) {
  const buf = fs.readFileSync(file);
  expect(buf[0]).toBe(0x50); // P
  expect(buf[1]).toBe(0x4b); // K
  const zip = await JSZip.loadAsync(buf);
  const documentXml = zip.file("word/document.xml");
  expect(documentXml).not.toBeNull();
  const xml = await documentXml!.async("string");
  const texts = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1] ?? "");
  const media = Object.keys(zip.files).filter((n) => n.startsWith("word/media/"));
  return { xml, text: texts.join(""), media };
}

async function convert(input: string, output: string) {
  const result = await libreOfficeEngine.execute(makePlan(input, output));
  return result;
}

// ── Fixture generation ────────────────────────────────────────────────────────

async function makePdf(file: string, pages: string[][]): Promise<void> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) {
    const page = doc.addPage([612, 792]);
    lines.forEach((line, i) => {
      page.drawText(line, { x: 50, y: 720 - i * 24, size: 14, font, color: rgb(0, 0, 0) });
    });
  }
  fs.writeFileSync(file, await doc.save());
}

async function makePdfWithImage(file: string, lines: string[], pngPath: string): Promise<void> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const img = await doc.embedPng(fs.readFileSync(pngPath));
  const page = doc.addPage([612, 792]);
  lines.forEach((line, i) => {
    page.drawText(line, { x: 50, y: 740 - i * 22, size: 12, font });
  });
  page.drawImage(img, { x: 50, y: 500, width: 64, height: 48 });
  fs.writeFileSync(file, await doc.save());
}

/** md → docx via pandoc → pdf via LibreOffice (keeps headings/tables/unicode glyphs). */
async function makePdfViaOffice(file: string, markdown: string, tag: string): Promise<void> {
  const md = path.join(tmpDir, `${tag}.md`);
  const docx = path.join(tmpDir, `${tag}.docx`);
  const profile = path.join(tmpDir, `${tag}-lo-profile`);
  fs.writeFileSync(md, markdown);
  expect((await run("pandoc", ["-f", "markdown", "-t", "docx", "-o", docx, md])).code).toBe(0);
  const res = await run("libreoffice", [
    `-env:UserInstallation=file://${profile}`,
    "--headless", "--norestore", "--convert-to", "pdf", "--outdir", tmpDir, docx,
  ]);
  expect(res.code).toBe(0);
  const produced = path.join(tmpDir, `${tag}.pdf`);
  expect(fs.existsSync(produced)).toBe(true);
  fs.renameSync(produced, file);
}

beforeAll(async () => {
  fs.mkdirSync(CONFIG.media.tempDir, { recursive: true });
  tmpDir = fs.mkdtempSync(path.join(CONFIG.media.tempDir, "pdfdocx-"));

  requireBin("libreoffice");
  requireBin("pdftotext");
  requireBin("pandoc");

  // PDFDOCX-001 simple text
  await makePdf(F.simple = path.join(tmpDir, "simple.pdf"), [["FileStudio PDFDOCX simple text fixture", "Second paragraph line"]]);
  // PDFDOCX-002 headings + paragraphs
  await makePdfViaOffice(F.headings = path.join(tmpDir, "headings.pdf"),
    "# Main Heading Fixture\n\nParagraph body text under the heading.\n\n## Sub Heading\n\nMore body copy here.\n", "headings-src");
  // PDFDOCX-003 multipage
  await makePdf(F.multipage = path.join(tmpDir, "multipage.pdf"), [["Page one unique marker"], ["Page two unique marker"], ["Page three unique marker"]]);
  // PDFDOCX-004 unicode
  await makePdfViaOffice(F.unicode = path.join(tmpDir, "unicode.pdf"),
    "Unicode fixture: áéíóú ñ € αβγ ΔΩ — texto multilingüe.\n", "unicode-src");
  // PDFDOCX-005 table
  await makePdfViaOffice(F.table = path.join(tmpDir, "table.pdf"),
    "| Name | Value |\n|------|-------|\n| Alpha | 111 |\n| Beta | 222 |\n", "table-src");
  // shared PNG for image fixtures
  const sharp = (await import("sharp")).default;
  F.png = path.join(tmpDir, "fixture.png");
  await sharp({ create: { width: 64, height: 48, channels: 3, background: "#3a7bd5" } }).png().toFile(F.png);
  // PDFDOCX-006 image
  await makePdfWithImage(F.image = path.join(tmpDir, "image.pdf"), ["Image fixture caption line"], F.png);
  // PDFDOCX-007 mixed table + image
  await makePdfWithImage(F.mixed = path.join(tmpDir, "mixed.pdf"), ["Mixed fixture table row Alpha 111", "Mixed fixture table row Beta 222"], F.png);
  // PDFDOCX-008 two-column layout
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([612, 792]);
    page.drawText("Left column marker text", { x: 50, y: 720, size: 12, font });
    page.drawText("Right column marker text", { x: 330, y: 720, size: 12, font });
    fs.writeFileSync(F.columns = path.join(tmpDir, "columns.pdf"), await doc.save());
  }
  // PDFDOCX-009 scanned (image-only, no text layer)
  {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    page.drawRectangle({ x: 50, y: 50, width: 200, height: 200, color: rgb(0.4, 0.4, 0.4) });
    fs.writeFileSync(F.scanned = path.join(tmpDir, "scanned.pdf"), await doc.save());
  }
  // PDFDOCX-010 path with spaces
  const spacedDir = path.join(tmpDir, "dir with spaces");
  fs.mkdirSync(spacedDir, { recursive: true });
  fs.copyFileSync(F.simple, F.spaced = path.join(spacedDir, "input file.pdf"));
}, 300_000);

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── E2E cases ────────────────────────────────────────────────────────────────

describe("PDF→DOCX — LibreOffice writer_pdf_import real execution", () => {
  it("PDFDOCX-001 simple text → exact text in valid DOCX", async () => {
    const out = path.join(tmpDir, "out-001.docx");
    const res = await convert(F.simple, out);
    expect(res.success, res.error).toBe(true);
    const { text } = await inspectDocx(out);
    expect(text).toContain("FileStudio PDFDOCX simple text fixture");
    expect(text).toContain("Second paragraph line");
    const validation = await libreOfficeEngine.validate(out, makePlan(F.simple, out));
    expect(validation.valid).toBe(true);
  }, LO_TIMEOUT);

  it("PDFDOCX-002 headings + paragraphs → content preserved (style loss documented)", async () => {
    const out = path.join(tmpDir, "out-002.docx");
    const res = await convert(F.headings, out);
    expect(res.success, res.error).toBe(true);
    const { text } = await inspectDocx(out);
    expect(text).toContain("Main Heading Fixture");
    expect(text).toContain("Paragraph body text under the heading");
    expect(text).toContain("Sub Heading");
  }, LO_TIMEOUT);

  it("PDFDOCX-003 multipage → all page markers present", async () => {
    const out = path.join(tmpDir, "out-003.docx");
    const res = await convert(F.multipage, out);
    expect(res.success, res.error).toBe(true);
    const { text } = await inspectDocx(out);
    expect(text).toContain("Page one unique marker");
    expect(text).toContain("Page two unique marker");
    expect(text).toContain("Page three unique marker");
  }, LO_TIMEOUT);

  it("PDFDOCX-004 unicode → áéíóú ñ € αβγ ΔΩ preserved", async () => {
    const out = path.join(tmpDir, "out-004.docx");
    const res = await convert(F.unicode, out);
    expect(res.success, res.error).toBe(true);
    const { text } = await inspectDocx(out);
    for (const token of ["áéíóú", "ñ", "€", "αβγ", "ΔΩ"]) {
      expect(text).toContain(token);
    }
  }, LO_TIMEOUT);

  it("PDFDOCX-005 table → cell content present as reading-order text (flattening documented)", async () => {
    const out = path.join(tmpDir, "out-005.docx");
    const res = await convert(F.table, out);
    expect(res.success, res.error).toBe(true);
    const { xml, text } = await inspectDocx(out);
    expect(text).toContain("Alpha");
    expect(text).toContain("111");
    expect(text).toContain("Beta");
    expect(text).toContain("222");
    // Documented degradation: writer_pdf_import does not rebuild w:tbl objects.
    expect(xml.includes("<w:tbl>")).toBe(false);
  }, LO_TIMEOUT);

  it("PDFDOCX-006 image → image embedded in word/media", async () => {
    const out = path.join(tmpDir, "out-006.docx");
    const res = await convert(F.image, out);
    expect(res.success, res.error).toBe(true);
    const { text, media } = await inspectDocx(out);
    expect(text).toContain("Image fixture caption line");
    expect(media.length).toBeGreaterThanOrEqual(1);
  }, LO_TIMEOUT);

  it("PDFDOCX-007 mixed table + image → text and image both preserved", async () => {
    const out = path.join(tmpDir, "out-007.docx");
    const res = await convert(F.mixed, out);
    expect(res.success, res.error).toBe(true);
    const { text, media } = await inspectDocx(out);
    expect(text).toContain("Mixed fixture table row Alpha 111");
    expect(text).toContain("Mixed fixture table row Beta 222");
    expect(media.length).toBeGreaterThanOrEqual(1);
  }, LO_TIMEOUT);

  it("PDFDOCX-008 two-column layout → both column texts recoverable", async () => {
    const out = path.join(tmpDir, "out-008.docx");
    const res = await convert(F.columns, out);
    expect(res.success, res.error).toBe(true);
    const { text } = await inspectDocx(out);
    expect(text).toContain("Left column marker text");
    expect(text).toContain("Right column marker text");
  }, LO_TIMEOUT);

  it("PDFDOCX-009 scanned PDF → controlled rejection with OCR hint, no fake DOCX", async () => {
    const out = path.join(tmpDir, "out-009.docx");
    const res = await convert(F.scanned, out);
    expect(res.success).toBe(false);
    expect(res.error).toBe(SCANNED_PDF_DOCX_ERROR);
    expect(fs.existsSync(out)).toBe(false);
  }, LO_TIMEOUT);

  it("PDFDOCX-010 path with spaces → converts cleanly", async () => {
    const spacedDir = path.join(tmpDir, "dir with spaces");
    const out = path.join(spacedDir, "output file.docx");
    const res = await convert(F.spaced, out);
    expect(res.success, res.error).toBe(true);
    const { text } = await inspectDocx(out);
    expect(text).toContain("FileStudio PDFDOCX simple text fixture");
  }, LO_TIMEOUT);

  it("PDFDOCX-SMOKE generated DOCX is not corrupt: LibreOffice roundtrip to PDF", async () => {
    const out = path.join(tmpDir, "out-smoke.docx");
    const res = await convert(F.simple, out);
    expect(res.success, res.error).toBe(true);
    const profile = path.join(tmpDir, "roundtrip-profile");
    const roundtripDir = path.join(tmpDir, "roundtrip");
    fs.mkdirSync(roundtripDir, { recursive: true });
    const rt = await run("libreoffice", [
      `-env:UserInstallation=file://${profile}`,
      "--headless", "--norestore", "--convert-to", "pdf", "--outdir", roundtripDir, out,
    ]);
    expect(rt.code).toBe(0);
    const pdf = path.join(roundtripDir, "out-smoke.pdf");
    expect(fs.existsSync(pdf)).toBe(true);
    expect(fs.readFileSync(pdf).subarray(0, 5).toString("ascii")).toBe("%PDF-");
  }, LO_TIMEOUT * 2);
});
