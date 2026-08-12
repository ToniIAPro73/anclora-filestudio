/**
 * Tier 1 quick-win E2E — real engine execution with real binaries.
 * Every enabled edge gets at least one real execution here.
 * These tests FAIL if a required binary is missing — no silent skips.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import JSZip from "jszip";

import { popplerEngine } from "../../src/lib/engines/pdf/poppler-engine";
import { ffmpegEngine } from "../../src/lib/engines/media/ffmpeg-engine";
import { libreOfficeEngine } from "../../src/lib/engines/document/libreoffice-engine";
import { sharpEngine } from "../../src/lib/engines/image/sharp-engine";
import { CONFIG } from "../../src/lib/config";
import type { ConversionPlan } from "../../src/lib/domain/engines";
import type { EngineId } from "../../src/lib/domain/engines";

const LO_TIMEOUT = 120_000;
const STD_TIMEOUT = 60_000;

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

function binAvailable(name: string): boolean {
  try {
    if (fs.existsSync(name)) return true;
    execSync(`which ${name}`, { stdio: "ignore" });
    return true;
  } catch { return false; }
}

function requireBin(name: string): void {
  if (!binAvailable(name)) {
    throw new Error(`Binary not available: ${name}. Required for Tier 1 quick-win E2E.`);
  }
}

function makePlan(
  engineId: EngineId,
  operation: string,
  inputPath: string,
  outputPath: string,
  outputFormat: string,
  options: Record<string, unknown> = {},
): ConversionPlan {
  return {
    jobId: `qw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    engineId,
    operation,
    inputPath,
    outputPath,
    outputFormat,
    options: { ...options, inputFormat: path.extname(inputPath).slice(1).toLowerCase() },
    args: [],
    env: {},
    timeoutMs: 120_000,
    estimatedSizeBytes: 1_000_000,
  };
}

async function ffprobeStreams(file: string): Promise<Array<{ codec_type: string }>> {
  const { code, stdout } = await run("ffprobe", [
    "-v", "error", "-show_streams", "-print_format", "json", file,
  ]);
  expect(code).toBe(0);
  return JSON.parse(stdout).streams ?? [];
}

// ── Fixture generation ────────────────────────────────────────────────────────

async function makeTextPdf(file: string, pages: string[][], unicode = false): Promise<void> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) {
    const page = doc.addPage([612, 792]);
    lines.forEach((line, index) => {
      page.drawText(line, { x: 50, y: 720 - index * 24, size: 14, font, color: rgb(0, 0, 0) });
    });
  }
  fs.writeFileSync(file, await doc.save());
  if (unicode) {
    // marker so fixture intent is visible in test logs
  }
}

async function makeOdp(file: string, slideText: string): Promise<void> {
  const zip = new JSZip();
  zip.file("mimetype", "application/vnd.oasis.opendocument.presentation", { compression: "STORE" });
  zip.file("META-INF/manifest.xml", `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
 <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.presentation"/>
 <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`);
  zip.file("content.xml", `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
 xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 office:version="1.2">
 <office:body>
  <office:presentation>
   <draw:page draw:name="page1">
    <draw:frame draw:name="title" svg:x="1cm" svg:y="1cm" svg:width="20cm" svg:height="3cm">
     <draw:text-box><text:p>${slideText}</text:p></draw:text-box>
    </draw:frame>
   </draw:page>
  </office:presentation>
 </office:body>
</office:document-content>`);
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer" }));
}

beforeAll(async () => {
  // Engine execution enforces path safety under CONFIG.media.tempDir.
  fs.mkdirSync(CONFIG.media.tempDir, { recursive: true });
  tmpDir = fs.mkdtempSync(path.join(CONFIG.media.tempDir, "quickwins-"));

  // PDF fixtures: text, multipage, unicode, scanned/no-text (§44)
  await makeTextPdf(F.text = path.join(tmpDir, "sample-text.pdf"), [["FileStudio PDF text fixture", "Second line of content"]]);
  await makeTextPdf(F.multipage = path.join(tmpDir, "sample-multipage.pdf"), [["Page one marker"], ["Page two marker"]]);
  await makeTextPdf(F.unicode = path.join(tmpDir, "sample-unicode.pdf"), [["Unicode: áéíóú ñ €"]], true);
  const scannedDoc = await PDFDocument.create();
  const scannedPage = scannedDoc.addPage([612, 792]);
  scannedPage.drawRectangle({ x: 50, y: 50, width: 200, height: 200, color: rgb(0.5, 0.5, 0.5) });
  fs.writeFileSync(F.scanned = path.join(tmpDir, "sample-scanned.pdf"), await scannedDoc.save());

  // Media fixtures (§46): local, reproducible
  requireBin("ffmpeg");
  requireBin("ffprobe");
  F.wav = path.join(tmpDir, "sample.wav");
  expect((await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", F.wav])).code).toBe(0);
  F.aac = path.join(tmpDir, "sample.aac");
  expect((await run("ffmpeg", ["-y", "-i", F.wav, "-c:a", "aac", "-b:a", "128k", F.aac])).code).toBe(0);
  F.mp3 = path.join(tmpDir, "sample.mp3");
  expect((await run("ffmpeg", ["-y", "-i", F.wav, "-c:a", "libmp3lame", F.mp3])).code).toBe(0);
  F.flac = path.join(tmpDir, "sample.flac");
  expect((await run("ffmpeg", ["-y", "-i", F.wav, "-c:a", "flac", F.flac])).code).toBe(0);
  F.m4a = path.join(tmpDir, "sample.m4a");
  expect((await run("ffmpeg", ["-y", "-i", F.wav, "-c:a", "aac", "-b:a", "128k", F.m4a])).code).toBe(0);
  F.ogg = path.join(tmpDir, "sample.ogg");
  expect((await run("ffmpeg", ["-y", "-i", F.wav, "-c:a", "libvorbis", F.ogg])).code).toBe(0);
  F.mp4 = path.join(tmpDir, "sample.mp4");
  expect((await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc=duration=1:size=64x64:rate=10", "-c:v", "libx264", "-pix_fmt", "yuv420p", F.mp4])).code).toBe(0);
  F.wmv = path.join(tmpDir, "sample.wmv");
  expect((await run("ffmpeg", ["-y", "-i", F.mp4, "-c:v", "wmv2", "-c:a", "wmav2", F.wmv])).code).toBe(0);
  F.ts = path.join(tmpDir, "sample.ts");
  expect((await run("ffmpeg", ["-y", "-i", F.mp4, "-c:v", "mpeg2video", "-c:a", "mp2", "-f", "mpegts", F.ts])).code).toBe(0);

  // Office fixtures (§45)
  requireBin("pandoc");
  F.docx = path.join(tmpDir, "sample.docx");
  const mdPath = path.join(tmpDir, "fixture.md");
  fs.writeFileSync(mdPath, "# Título fixture\n\nTexto del documento DOCX de prueba.\n");
  expect((await run("pandoc", ["-f", "markdown", "-t", "docx", "-o", F.docx, mdPath])).code).toBe(0);
  await makeOdp(F.odp = path.join(tmpDir, "sample.odp"), "ODP fixture slide text");

  // Image fixtures (§47)
  const sharp = (await import("sharp")).default;
  F.png = path.join(tmpDir, "sample.png");
  await sharp({ create: { width: 64, height: 48, channels: 4, background: { r: 58, g: 123, b: 213, alpha: 0.8 } } }).png().toFile(F.png);
  F.jpg = path.join(tmpDir, "sample.jpg");
  await sharp({ create: { width: 64, height: 48, channels: 3, background: "#3a7bd5" } }).jpeg().toFile(F.jpg);
  F.webp = path.join(tmpDir, "sample.webp");
  await sharp({ create: { width: 64, height: 48, channels: 3, background: "#22aa66" } }).webp().toFile(F.webp);
  F.tiff = path.join(tmpDir, "sample.tiff");
  await sharp({ create: { width: 64, height: 48, channels: 3, background: "#aa2266" } }).tiff().toFile(F.tiff);
}, 180_000);

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── PDF → TXT (Poppler pdftotext) ─────────────────────────────────────────────

describe("PDF→TXT — Poppler pdftotext", () => {
  it("PDFTXT-001 extracts expected text from a text PDF", async () => {
    requireBin("pdftotext");
    const output = path.join(tmpDir, "out-text.txt");
    const result = await popplerEngine.execute(makePlan("poppler", "extract-text", F.text, output, "txt"));
    expect(result.success).toBe(true);
    const content = fs.readFileSync(output, "utf8");
    expect(content).toContain("FileStudio PDF text fixture");
    expect(content).toContain("Second line of content");
    const validation = await popplerEngine.validate(output, makePlan("poppler", "extract-text", F.text, output, "txt"));
    expect(validation.valid).toBe(true);
  }, STD_TIMEOUT);

  it("PDFTXT-002 extracts text from all pages of a multipage PDF", async () => {
    requireBin("pdftotext");
    const output = path.join(tmpDir, "out-multipage.txt");
    const result = await popplerEngine.execute(makePlan("poppler", "extract-text", F.multipage, output, "txt"));
    expect(result.success).toBe(true);
    const content = fs.readFileSync(output, "utf8");
    expect(content).toContain("Page one marker");
    expect(content).toContain("Page two marker");
  }, STD_TIMEOUT);

  it("PDFTXT-003 preserves Unicode text", async () => {
    requireBin("pdftotext");
    const output = path.join(tmpDir, "out-unicode.txt");
    const result = await popplerEngine.execute(makePlan("poppler", "extract-text", F.unicode, output, "txt"));
    expect(result.success).toBe(true);
    const content = fs.readFileSync(output, "utf8");
    expect(content).toContain("áéíóú");
    expect(content).toContain("ñ");
  }, STD_TIMEOUT);

  it("PDFTXT-004 scanned PDF returns controlled failure, not empty success", async () => {
    requireBin("pdftotext");
    const output = path.join(tmpDir, "out-scanned.txt");
    const result = await popplerEngine.execute(makePlan("poppler", "extract-text", F.scanned, output, "txt"));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/escaneadas|OCR/);
    expect(fs.existsSync(output)).toBe(false);
  }, STD_TIMEOUT);

  it("PDFTXT-005 handles paths with spaces", async () => {
    requireBin("pdftotext");
    const spacedDir = path.join(tmpDir, "dir with spaces");
    fs.mkdirSync(spacedDir, { recursive: true });
    const spacedInput = path.join(spacedDir, "input file.pdf");
    fs.copyFileSync(F.text, spacedInput);
    const output = path.join(spacedDir, "output file.txt");
    const result = await popplerEngine.execute(makePlan("poppler", "extract-text", spacedInput, output, "txt"));
    expect(result.success).toBe(true);
    expect(fs.readFileSync(output, "utf8")).toContain("FileStudio PDF text fixture");
  }, STD_TIMEOUT);
});

// ── PDF → HTML (Poppler pdftohtml) ────────────────────────────────────────────

describe("PDF→HTML — Poppler pdftohtml", () => {
  it("PDFHTML-001 produces valid HTML with expected text", async () => {
    requireBin("pdftohtml");
    const output = path.join(tmpDir, "out-html.html");
    const result = await popplerEngine.execute(makePlan("poppler", "extract-html", F.text, output, "html"));
    expect(result.success).toBe(true);
    const content = fs.readFileSync(result.outputPath, "utf8");
    expect(content).toMatch(/<html[\s>]/i);
    expect(content).toContain("FileStudio");
    const validation = await popplerEngine.validate(result.outputPath, makePlan("poppler", "extract-html", F.text, result.outputPath, "html"));
    expect(validation.valid).toBe(true);
  }, STD_TIMEOUT);

  it("PDFHTML-002 multipage PDF produces single coherent HTML", async () => {
    requireBin("pdftohtml");
    const output = path.join(tmpDir, "out-html-multi.html");
    const result = await popplerEngine.execute(makePlan("poppler", "extract-html", F.multipage, output, "html"));
    expect(result.success).toBe(true);
    const content = fs.readFileSync(result.outputPath, "utf8");
    expect(content).toContain("Page one marker");
    expect(content).toContain("Page two marker");
  }, STD_TIMEOUT);
});

// ── PDF → MD (pdftohtml + Pandoc) ─────────────────────────────────────────────

describe("PDF→MD — pdftohtml + Pandoc normalization", () => {
  it("PDFMD-001 produces Markdown with expected content", async () => {
    requireBin("pdftohtml");
    requireBin("pandoc");
    const output = path.join(tmpDir, "out-md.md");
    const result = await popplerEngine.execute(makePlan("poppler", "extract-markdown", F.text, output, "md"));
    expect(result.success).toBe(true);
    const content = fs.readFileSync(output, "utf8");
    expect(content.trim().length).toBeGreaterThan(0);
    expect(content).toContain("FileStudio");
    const validation = await popplerEngine.validate(output, makePlan("poppler", "extract-markdown", F.text, output, "md"));
    expect(validation.valid).toBe(true);
  }, STD_TIMEOUT);

  it("PDFMD-002 scanned PDF returns controlled failure", async () => {
    requireBin("pdftohtml");
    requireBin("pandoc");
    const output = path.join(tmpDir, "out-md-scanned.md");
    const result = await popplerEngine.execute(makePlan("poppler", "extract-markdown", F.scanned, output, "md"));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/escaneadas|OCR/);
    expect(fs.existsSync(output)).toBe(false);
  }, STD_TIMEOUT);
});

// ── AAC coverage (FFmpeg) ─────────────────────────────────────────────────────

describe("AAC coverage — FFmpeg", () => {
  it("AAC-001 wav→aac produces valid AAC audio", async () => {
    const output = path.join(tmpDir, "out-wav-aac.aac");
    const plan = makePlan("ffmpeg-media", "transcode-audio", F.wav, output, "aac", { quality: "128" });
    const result = await ffmpegEngine.execute(plan);
    expect(result.success).toBe(true);
    const streams = await ffprobeStreams(output);
    expect(streams.some((s) => s.codec_type === "audio")).toBe(true);
    const validation = await ffmpegEngine.validate(output, plan);
    expect(validation.valid).toBe(true);
  }, STD_TIMEOUT);

  it("AAC-002 aac→mp3 produces valid MP3 audio", async () => {
    const output = path.join(tmpDir, "out-aac-mp3.mp3");
    const plan = makePlan("ffmpeg-media", "transcode-audio", F.aac, output, "mp3", { quality: "192" });
    const result = await ffmpegEngine.execute(plan);
    expect(result.success).toBe(true);
    const streams = await ffprobeStreams(output);
    expect(streams.some((s) => s.codec_type === "audio")).toBe(true);
  }, STD_TIMEOUT);

  it("AAC-003 aac→wav produces valid WAV audio", async () => {
    const output = path.join(tmpDir, "out-aac-wav.wav");
    const plan = makePlan("ffmpeg-media", "transcode-audio", F.aac, output, "wav", { quality: "0" });
    const result = await ffmpegEngine.execute(plan);
    expect(result.success).toBe(true);
    const streams = await ffprobeStreams(output);
    expect(streams.some((s) => s.codec_type === "audio")).toBe(true);
  }, STD_TIMEOUT);

  // Every remaining audited Tier 1 AAC pair gets a real execution (§43).
  const aacPairs: Array<[string, string, string]> = [
    // [sourceFixtureKey, targetFormat, quality]
    ["mp3", "aac", "128"],
    ["flac", "aac", "128"],
    ["m4a", "aac", "128"],
    ["ogg", "aac", "128"],
    ["aac", "flac", "0"],
    ["aac", "m4a", "128"],
    ["aac", "ogg", "4"],
  ];
  for (const [sourceKey, target, quality] of aacPairs) {
    it(`AAC-MATRIX ${sourceKey}→${target} real transcode`, async () => {
      const output = path.join(tmpDir, `out-${sourceKey}-${target}.${target}`);
      const plan = makePlan("ffmpeg-media", "transcode-audio", F[sourceKey], output, target, { quality });
      const result = await ffmpegEngine.execute(plan);
      expect(result.success).toBe(true);
      const streams = await ffprobeStreams(output);
      expect(streams.some((s) => s.codec_type === "audio")).toBe(true);
      const validation = await ffmpegEngine.validate(output, plan);
      expect(validation.valid).toBe(true);
    }, STD_TIMEOUT);
  }
});

// ── WMV / TS coverage (FFmpeg) ────────────────────────────────────────────────

describe("WMV coverage — FFmpeg", () => {
  it("WMV-001 wmv→mp4 transcode produces valid MP4", async () => {
    const output = path.join(tmpDir, "out-wmv-mp4.mp4");
    const plan = makePlan("ffmpeg-media", "transcode-video", F.wmv, output, "mp4", { quality: "480" });
    const result = await ffmpegEngine.execute(plan);
    expect(result.success).toBe(true);
    const streams = await ffprobeStreams(output);
    expect(streams.some((s) => s.codec_type === "video")).toBe(true);
    const validation = await ffmpegEngine.validate(output, plan);
    expect(validation.valid).toBe(true);
  }, STD_TIMEOUT);

  it("WMV-002 wmv→mkv remux produces valid MKV without re-encode", async () => {
    const output = path.join(tmpDir, "out-wmv-mkv.mkv");
    const plan = makePlan("ffmpeg-media", "remux", F.wmv, output, "mkv", { quality: "0" });
    const result = await ffmpegEngine.execute(plan);
    expect(result.success).toBe(true);
    const streams = await ffprobeStreams(output);
    expect(streams.some((s) => s.codec_type === "video")).toBe(true);
  }, STD_TIMEOUT);

  it("WMV-003 wmv→webm transcode produces valid WebM", async () => {
    const output = path.join(tmpDir, "out-wmv-webm.webm");
    const plan = makePlan("ffmpeg-media", "transcode-video", F.wmv, output, "webm", { quality: "720" });
    const result = await ffmpegEngine.execute(plan);
    expect(result.success).toBe(true);
    const streams = await ffprobeStreams(output);
    expect(streams.some((s) => s.codec_type === "video")).toBe(true);
    const validation = await ffmpegEngine.validate(output, plan);
    expect(validation.valid).toBe(true);
  }, STD_TIMEOUT);
});

describe("TS coverage — FFmpeg", () => {
  it("TS-001 ts→mp4 transcode produces valid MP4", async () => {
    const output = path.join(tmpDir, "out-ts-mp4.mp4");
    const plan = makePlan("ffmpeg-media", "transcode-video", F.ts, output, "mp4", { quality: "480" });
    const result = await ffmpegEngine.execute(plan);
    expect(result.success).toBe(true);
    const streams = await ffprobeStreams(output);
    expect(streams.some((s) => s.codec_type === "video")).toBe(true);
  }, STD_TIMEOUT);

  it("TS-002 ts→mkv remux produces valid MKV", async () => {
    const output = path.join(tmpDir, "out-ts-mkv.mkv");
    const plan = makePlan("ffmpeg-media", "remux", F.ts, output, "mkv", { quality: "0" });
    const result = await ffmpegEngine.execute(plan);
    expect(result.success).toBe(true);
    const streams = await ffprobeStreams(output);
    expect(streams.some((s) => s.codec_type === "video")).toBe(true);
  }, STD_TIMEOUT);

  it("TS-003 ts→webm transcode produces valid WebM", async () => {
    const output = path.join(tmpDir, "out-ts-webm.webm");
    const plan = makePlan("ffmpeg-media", "transcode-video", F.ts, output, "webm", { quality: "720" });
    const result = await ffmpegEngine.execute(plan);
    expect(result.success).toBe(true);
    const streams = await ffprobeStreams(output);
    expect(streams.some((s) => s.codec_type === "video")).toBe(true);
    const validation = await ffmpegEngine.validate(output, plan);
    expect(validation.valid).toBe(true);
  }, STD_TIMEOUT);
});

// ── Office quick wins (LibreOffice) ───────────────────────────────────────────

describe("Office quick wins — LibreOffice headless", () => {
  it("DOCXRTF-001 docx→rtf produces valid RTF with expected text", async () => {
    requireBin("libreoffice");
    const output = path.join(tmpDir, "out-docx.rtf");
    const plan = makePlan("libreoffice", "convert-office", F.docx, output, "rtf");
    const result = await libreOfficeEngine.execute(plan);
    expect(result.success).toBe(true);
    const content = fs.readFileSync(output, "utf8");
    expect(content.startsWith("{\\rtf")).toBe(true);
    expect(content).toContain("Texto del documento DOCX de prueba");
    const validation = await libreOfficeEngine.validate(output, plan);
    expect(validation.valid).toBe(true);
  }, LO_TIMEOUT);

  it("ODPPDF-001 odp→pdf produces a valid PDF", async () => {
    requireBin("libreoffice");
    const output = path.join(tmpDir, "out-odp.pdf");
    const plan = makePlan("libreoffice", "convert-office", F.odp, output, "pdf");
    const result = await libreOfficeEngine.execute(plan);
    expect(result.success).toBe(true);
    expect(fs.readFileSync(output).subarray(0, 5).toString("ascii")).toBe("%PDF-");
    const validation = await libreOfficeEngine.validate(output, plan);
    expect(validation.valid).toBe(true);
  }, LO_TIMEOUT);

  it("ODPPPTX-001 odp→pptx produces a valid PPTX package", async () => {
    requireBin("libreoffice");
    const output = path.join(tmpDir, "out-odp.pptx");
    const plan = makePlan("libreoffice", "convert-office", F.odp, output, "pptx");
    const result = await libreOfficeEngine.execute(plan);
    expect(result.success).toBe(true);
    const zip = await JSZip.loadAsync(fs.readFileSync(output));
    expect(zip.file("ppt/presentation.xml")).toBeTruthy();
  }, LO_TIMEOUT);
});

// ── Regression: PDF → PNG raster + DOCX → PDF → PNG multistep ────────────────

describe("Regression — PDF raster and multistep chain", () => {
  it("PDFRAST-001 pdf→png keeps passing via pdftoppm", async () => {
    requireBin("pdftoppm");
    const output = path.join(tmpDir, "out-raster.png");
    const plan = makePlan("poppler", "rasterize", F.text, output, "png");
    const result = await popplerEngine.execute(plan);
    expect(result.success).toBe(true);
    expect(fs.existsSync(result.outputPath)).toBe(true);
    const validation = await popplerEngine.validate(result.outputPath, plan);
    expect(validation.valid).toBe(true);
  }, STD_TIMEOUT);

  it("MULTISTEP-REG-001 docx→pdf→png chain keeps passing on Linux", async () => {
    requireBin("libreoffice");
    requireBin("pdftoppm");
    const stepPdf = path.join(tmpDir, "out-chain.pdf");
    const step1 = await libreOfficeEngine.execute(
      makePlan("libreoffice", "convert-office", F.docx, stepPdf, "pdf"),
    );
    expect(step1.success).toBe(true);
    expect(fs.readFileSync(stepPdf).subarray(0, 5).toString("ascii")).toBe("%PDF-");

    const stepPng = path.join(tmpDir, "out-chain.png");
    const step2 = await popplerEngine.execute(
      makePlan("poppler", "rasterize", stepPdf, stepPng, "png"),
    );
    expect(step2.success).toBe(true);
    expect(fs.existsSync(step2.outputPath)).toBe(true);
  }, LO_TIMEOUT);
});


// ── Image → PDF (Sharp + pdf-lib) ─────────────────────────────────────────────

describe("Image→PDF — Sharp + pdf-lib", () => {
  for (const format of ["png", "jpg", "webp", "tiff"] as const) {
    it(`IMG2PDF ${format}→pdf produces single-page PDF with embedded image`, async () => {
      const output = path.join(tmpDir, `out-${format}.pdf`);
      const plan = makePlan("sharp-image", "image-to-pdf", F[format], output, "pdf");
      const result = await sharpEngine.execute(plan);
      expect(result.success).toBe(true);
      expect(fs.readFileSync(output).subarray(0, 5).toString("ascii")).toBe("%PDF-");

      const doc = await PDFDocument.load(fs.readFileSync(output));
      expect(doc.getPageCount()).toBe(1);
      const page = doc.getPage(0);
      const size = page.getSize();
      expect(size.width).toBe(64);
      expect(size.height).toBe(48);

      const validation = await sharpEngine.validate(output, plan);
      expect(validation.valid).toBe(true);
    }, STD_TIMEOUT);
  }
});
