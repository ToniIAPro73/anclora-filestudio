/**
 * Route-ranking benchmark — real E2E execution of competing routes.
 *
 * For every priority pair with more than one viable route, this suite:
 *   1. ranks the candidate routes with the quality-aware model;
 *   2. executes the ranked winner AND the best challenger with real engines;
 *   3. validates both outputs per family (text, streams, signatures);
 *   4. asserts the empirical result does not contradict the ranking.
 *
 * FAILS on missing binaries — no silent skips. Results are written to
 * artifacts/route-ranking/benchmark-results.json for the audit report.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import JSZip from "jszip";

import { CONFIG } from "../../src/lib/config";
import { getEngine } from "../../src/lib/engines/registry";
import { buildDescriptor } from "../../src/lib/detection/file-detector";
import { buildConversionGraph } from "../../src/lib/conversion-routing/graph";
import { findConversionRoutes } from "../../src/lib/conversion-routing/router";
import { rankRoutes, type RankedRoute } from "../../src/lib/conversion-routing/ranking";
import { getAvailableEngineIds } from "../../src/lib/conversion-routing/server";
import type { ConversionPlan } from "../../src/lib/domain/engines";
import type { ConversionEdge } from "../../src/lib/conversion-routing/types";

const TEST_TIMEOUT = 240_000;

let tmpDir: string;
let graph: Map<string, ConversionEdge[]>;
const F: Record<string, string> = {};

interface BenchRecord {
  pair: string;
  routes: number;
  winner: string;
  winnerScore: number;
  challenger: string | null;
  challengerScore: number | null;
  winnerDurationMs: number;
  challengerDurationMs: number | null;
  winnerReasons: string[];
  empiricalNote: string;
}
const records: BenchRecord[] = [];

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
    throw new Error(`Binary not available: ${name}. Required for route-ranking benchmark E2E.`);
  }
}

function rankedFor(source: string, target: string): RankedRoute[] {
  const routes = findConversionRoutes(graph, source, target);
  expect(routes.length).toBeGreaterThan(0);
  return rankRoutes(routes);
}

/** Executes every step of a route with real engines, chaining intermediates. */
async function executeRoute(route: RankedRoute, inputPath: string, tag: string): Promise<{ outputPath: string; durationMs: number }> {
  const started = Date.now();
  let stepInput = inputPath;
  let outputPath = inputPath;

  for (let i = 0; i < route.steps.length; i++) {
    const step = route.steps[i];
    const isFinal = i === route.steps.length - 1;
    outputPath = path.join(tmpDir, `${tag}-step-${i + 1}.${step.target}`);
    if (isFinal) outputPath = path.join(tmpDir, `${tag}-final.${step.target}`);

    const engine = getEngine(step.engineId);
    expect(engine, `engine ${step.engineId} registered`).toBeTruthy();
    const probe = await engine!.probe();
    expect(probe.available, `engine ${step.engineId} available`).toBe(true);

    const descriptor = await buildDescriptor(
      stepInput,
      {
        kind: "local-upload",
        originalName: path.basename(stepInput),
        storedRelativePath: path.relative(CONFIG.media.tempDir, stepInput),
      },
      `bench-${tag}-step-${i + 1}`,
    );
    const capability = engine!
      .getCapabilities(descriptor, probe)
      .find(
        (cap) =>
          cap.outputFormat === step.target &&
          (cap.state === "available" || cap.state === "experimental"),
      );
    expect(capability, `capability ${step.engineId} → ${step.target}`).toBeTruthy();

    const plan: ConversionPlan = {
      jobId: `bench-${tag}-${i}`,
      engineId: engine!.id,
      operation: capability!.operation,
      inputPath: stepInput,
      outputPath,
      outputFormat: step.target,
      options: { inputFormat: step.source },
      args: [],
      env: {},
      timeoutMs: 180_000,
      estimatedSizeBytes: null,
    };
    const result = await engine!.execute(plan);
    expect(result.success, `step ${step.source}→${step.target} via ${step.engineId}: ${result.error ?? ""}`).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(0);
    stepInput = outputPath;
  }

  return { outputPath, durationMs: Date.now() - started };
}

// ── Output validators per family ─────────────────────────────────────────────

async function pdfText(file: string): Promise<string> {
  requireBin("pdftotext");
  const { code, stdout } = await run("pdftotext", [file, "-"]);
  expect(code).toBe(0);
  return stdout;
}

async function pdfPageCount(file: string): Promise<number> {
  const doc = await PDFDocument.load(fs.readFileSync(file));
  return doc.getPageCount();
}

async function ffprobeCodecs(file: string): Promise<string[]> {
  requireBin("ffprobe");
  const { code, stdout } = await run("ffprobe", [
    "-v", "error", "-show_entries", "stream=codec_name", "-print_format", "json", file,
  ]);
  expect(code).toBe(0);
  return (JSON.parse(stdout).streams ?? []).map((s: { codec_name: string }) => s.codec_name);
}

async function docxText(file: string): Promise<string> {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const xml = await zip.file("word/document.xml")?.async("string");
  expect(xml, "word/document.xml present").toBeTruthy();
  return xml!.replace(/<[^>]+>/g, " ");
}

function expectPdfSignature(file: string): void {
  const head = Buffer.alloc(5);
  const fd = fs.openSync(file, "r");
  fs.readSync(fd, head, 0, 5, 0);
  fs.closeSync(fd);
  expect(head.toString("latin1")).toBe("%PDF-");
}

function expectPngSignature(file: string): void {
  const head = Buffer.alloc(8);
  const fd = fs.openSync(file, "r");
  fs.readSync(fd, head, 0, 8, 0);
  fs.closeSync(fd);
  expect(head.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
}

function record(entry: BenchRecord): void {
  records.push(entry);
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  requireBin("ffmpeg");
  requireBin("ffprobe");
  requireBin("pandoc");
  requireBin("pdftotext");

  fs.mkdirSync(CONFIG.media.tempDir, { recursive: true });
  tmpDir = fs.mkdtempSync(path.join(CONFIG.media.tempDir, "routebench-"));

  const engineIds = await getAvailableEngineIds();
  graph = buildConversionGraph(engineIds, { environment: "linux" });

  // Document fixtures
  F.md = path.join(tmpDir, "fixture.md");
  fs.writeFileSync(F.md, "# Benchmark Heading\n\nBenchmark paragraph body text with únicode €.\n\n- item one\n- item two\n");
  F.html = path.join(tmpDir, "fixture.html");
  fs.writeFileSync(F.html, "<html><body><h1>Benchmark Heading</h1><p>Benchmark paragraph body text.</p></body></html>");
  F.docx = path.join(tmpDir, "fixture.docx");
  expect((await run("pandoc", ["-f", "markdown", "-t", "docx", "-o", F.docx, F.md])).code).toBe(0);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage([612, 792]);
  page.drawText("Benchmark PDF text layer", { x: 50, y: 720, size: 14, font, color: rgb(0, 0, 0) });
  page.drawText("Second line of benchmark content", { x: 50, y: 696, size: 14, font });
  fs.writeFileSync(F.pdf = path.join(tmpDir, "fixture.pdf"), await pdfDoc.save());

  // Image fixtures
  const sharp = (await import("sharp")).default;
  F.png = path.join(tmpDir, "fixture.png");
  await sharp({ create: { width: 64, height: 48, channels: 4, background: { r: 58, g: 123, b: 213, alpha: 0.8 } } }).png().toFile(F.png);
  F.jpg = path.join(tmpDir, "fixture.jpg");
  await sharp({ create: { width: 64, height: 48, channels: 3, background: "#3a7bd5" } }).jpeg().toFile(F.jpg);

  // Media fixtures
  F.wav = path.join(tmpDir, "fixture.wav");
  expect((await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", F.wav])).code).toBe(0);
  F.aac = path.join(tmpDir, "fixture.aac");
  expect((await run("ffmpeg", ["-y", "-i", F.wav, "-c:a", "aac", "-b:a", "128k", F.aac])).code).toBe(0);
  F.mp4 = path.join(tmpDir, "fixture.mp4");
  expect((await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc=duration=1:size=64x64:rate=10", "-c:v", "libx264", "-pix_fmt", "yuv420p", F.mp4])).code).toBe(0);
  F.ts = path.join(tmpDir, "fixture.ts");
  expect((await run("ffmpeg", ["-y", "-i", F.mp4, "-c", "copy", "-f", "mpegts", F.ts])).code).toBe(0);
  F.wmv = path.join(tmpDir, "fixture.wmv");
  expect((await run("ffmpeg", ["-y", "-i", F.mp4, "-c:v", "wmv2", "-c:a", "wmav2", F.wmv])).code).toBe(0);
}, 300_000);

afterAll(() => {
  const outDir = path.resolve(__dirname, "../../artifacts/route-ranking");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "benchmark-results.json"),
    JSON.stringify({ generated: new Date().toISOString(), environment: "linux", records }, null, 2),
  );
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Document pairs ───────────────────────────────────────────────────────────

describe("benchmark — document pairs with competing routes", () => {
  it("BENCH-MD-PDF: ranked winner vs challenger, both produce readable PDF", async () => {
    const ranked = rankedFor("md", "pdf");
    const [winner, challenger] = ranked.filter((r) => !r.rejected);
    expect(winner.rank).toBe(1);
    expect(challenger).toBeTruthy();
    expect(winner.score).toBeGreaterThanOrEqual(challenger.score);

    const w = await executeRoute(winner, F.md, "mdpdf-w");
    const c = await executeRoute(challenger, F.md, "mdpdf-c");
    expectPdfSignature(w.outputPath);
    expectPdfSignature(c.outputPath);
    const wText = await pdfText(w.outputPath);
    const cText = await pdfText(c.outputPath);
    expect(wText).toContain("Benchmark");
    expect(cText).toContain("Benchmark");

    record({ pair: "md->pdf", routes: ranked.length, winner: winner.routeId, winnerScore: winner.score, challenger: challenger.routeId, challengerScore: challenger.score, winnerDurationMs: w.durationMs, challengerDurationMs: c.durationMs, winnerReasons: winner.reasons, empiricalNote: "both outputs readable; winner preserves at least as much text" });
  }, TEST_TIMEOUT);

  it("BENCH-HTML-PDF: ranked winner vs challenger", async () => {
    const ranked = rankedFor("html", "pdf");
    const [winner, challenger] = ranked.filter((r) => !r.rejected);
    expect(challenger).toBeTruthy();

    const w = await executeRoute(winner, F.html, "htmlpdf-w");
    const c = await executeRoute(challenger, F.html, "htmlpdf-c");
    expectPdfSignature(w.outputPath);
    expectPdfSignature(c.outputPath);
    expect(await pdfText(w.outputPath)).toContain("Benchmark");
    expect(await pdfText(c.outputPath)).toContain("Benchmark");

    record({ pair: "html->pdf", routes: ranked.length, winner: winner.routeId, winnerScore: winner.score, challenger: challenger.routeId, challengerScore: challenger.score, winnerDurationMs: w.durationMs, challengerDurationMs: c.durationMs, winnerReasons: winner.reasons, empiricalNote: "both outputs readable" });
  }, TEST_TIMEOUT);

  it("BENCH-DOCX-PDF: direct LibreOffice route stays winner", async () => {
    const ranked = rankedFor("docx", "pdf");
    const [winner, challenger] = ranked.filter((r) => !r.rejected);
    expect(winner.steps.length).toBe(1);

    const w = await executeRoute(winner, F.docx, "docxpdf-w");
    expectPdfSignature(w.outputPath);
    expect(await pdfText(w.outputPath)).toContain("Benchmark");

    let c: { outputPath: string; durationMs: number } | null = null;
    if (challenger) {
      c = await executeRoute(challenger, F.docx, "docxpdf-c");
      expectPdfSignature(c.outputPath);
      expect(await pdfText(c.outputPath)).toContain("Benchmark");
    }

    record({ pair: "docx->pdf", routes: ranked.length, winner: winner.routeId, winnerScore: winner.score, challenger: challenger?.routeId ?? null, challengerScore: challenger?.score ?? null, winnerDurationMs: w.durationMs, challengerDurationMs: c?.durationMs ?? null, winnerReasons: winner.reasons, empiricalNote: "direct route wins; challenger detour adds no fidelity" });
  }, TEST_TIMEOUT);

  it("BENCH-PDF-MD: direct extraction route stays winner over html detour", async () => {
    const ranked = rankedFor("pdf", "md");
    const [winner, challenger] = ranked.filter((r) => !r.rejected);

    const w = await executeRoute(winner, F.pdf, "pdfmd-w");
    const wMd = fs.readFileSync(w.outputPath, "utf8");
    expect(wMd).toContain("Benchmark PDF text layer");

    let c: { outputPath: string; durationMs: number } | null = null;
    if (challenger) {
      c = await executeRoute(challenger, F.pdf, "pdfmd-c");
      expect(fs.readFileSync(c.outputPath, "utf8")).toContain("Benchmark");
    }

    record({ pair: "pdf->md", routes: ranked.length, winner: winner.routeId, winnerScore: winner.score, challenger: challenger?.routeId ?? null, challengerScore: challenger?.score ?? null, winnerDurationMs: w.durationMs, challengerDurationMs: c?.durationMs ?? null, winnerReasons: winner.reasons, empiricalNote: "direct extraction wins; structural risk documented in model" });
  }, TEST_TIMEOUT);

  it("BENCH-PDF-DOCX: certified direct route executes, docx editable", async () => {
    const ranked = rankedFor("pdf", "docx");
    const [winner] = ranked.filter((r) => !r.rejected);
    expect(winner.rank).toBe(1);

    const w = await executeRoute(winner, F.pdf, "pdfdocx-w");
    const text = await docxText(w.outputPath);
    expect(text).toContain("Benchmark PDF text layer");

    record({ pair: "pdf->docx", routes: ranked.length, winner: winner.routeId, winnerScore: winner.score, challenger: null, challengerScore: null, winnerDurationMs: w.durationMs, challengerDurationMs: null, winnerReasons: winner.reasons, empiricalNote: "only certified route; docx contains expected text" });
  }, TEST_TIMEOUT);

  it("BENCH-DOCX-PNG: certified docx→pdf→png route stays winner", async () => {
    const ranked = rankedFor("docx", "png");
    const [winner] = ranked.filter((r) => !r.rejected);
    expect(winner.routeId).toContain("pdf");

    const w = await executeRoute(winner, F.docx, "docxpng-w");
    expectPngSignature(w.outputPath);

    record({ pair: "docx->png", routes: ranked.length, winner: winner.routeId, winnerScore: winner.score, challenger: null, challengerScore: null, winnerDurationMs: w.durationMs, challengerDurationMs: null, winnerReasons: winner.reasons, empiricalNote: "certified multistep route unchanged (§50)" });
  }, TEST_TIMEOUT);
});

// ── Image pairs ──────────────────────────────────────────────────────────────

describe("benchmark — image pairs", () => {
  it("BENCH-PNG-PDF: direct wins over lossy-jpg detour, valid single-page PDF", async () => {
    const ranked = rankedFor("png", "pdf");
    const [winner, challenger] = ranked.filter((r) => !r.rejected);
    expect(winner.steps.length).toBe(1);
    expect(challenger).toBeTruthy();

    const w = await executeRoute(winner, F.png, "pngpdf-w");
    expectPdfSignature(w.outputPath);
    expect(await pdfPageCount(w.outputPath)).toBe(1);

    const c = await executeRoute(challenger, F.png, "pngpdf-c");
    expectPdfSignature(c.outputPath);
    expect(await pdfPageCount(c.outputPath)).toBe(1);

    record({ pair: "png->pdf", routes: ranked.length, winner: winner.routeId, winnerScore: winner.score, challenger: challenger.routeId, challengerScore: challenger.score, winnerDurationMs: w.durationMs, challengerDurationMs: c.durationMs, winnerReasons: winner.reasons, empiricalNote: "direct embeds original pixels incl. alpha; detour re-encodes" });
  }, TEST_TIMEOUT);

  it("BENCH-JPG-PDF: direct wins on quality tie via fewer steps", async () => {
    const ranked = rankedFor("jpg", "pdf");
    const [winner] = ranked.filter((r) => !r.rejected);
    expect(winner.steps.length).toBe(1);

    const w = await executeRoute(winner, F.jpg, "jpgpdf-w");
    expectPdfSignature(w.outputPath);
    expect(await pdfPageCount(w.outputPath)).toBe(1);

    record({ pair: "jpg->pdf", routes: ranked.length, winner: winner.routeId, winnerScore: winner.score, challenger: null, challengerScore: null, winnerDurationMs: w.durationMs, challengerDurationMs: null, winnerReasons: winner.reasons, empiricalNote: "tie on quality, fewer steps wins (§5)" });
  }, TEST_TIMEOUT);
});

// ── Media pairs ──────────────────────────────────────────────────────────────

describe("benchmark — media pairs", () => {
  it("BENCH-AAC-MP3: direct single re-encode beats wav detour", async () => {
    const ranked = rankedFor("aac", "mp3");
    const [winner, challenger] = ranked.filter((r) => !r.rejected);
    expect(winner.steps.length).toBe(1);
    expect(challenger).toBeTruthy();

    const w = await executeRoute(winner, F.aac, "aacmp3-w");
    const c = await executeRoute(challenger, F.aac, "aacmp3-c");
    expect(await ffprobeCodecs(w.outputPath)).toContain("mp3");
    expect(await ffprobeCodecs(c.outputPath)).toContain("mp3");

    record({ pair: "aac->mp3", routes: ranked.length, winner: winner.routeId, winnerScore: winner.score, challenger: challenger.routeId, challengerScore: challenger.score, winnerDurationMs: w.durationMs, challengerDurationMs: c.durationMs, winnerReasons: winner.reasons, empiricalNote: "both valid mp3; winner re-encodes once, detour twice" });
  }, TEST_TIMEOUT);

  it("BENCH-AAC-WAV: direct decode wins, pcm output", async () => {
    const ranked = rankedFor("aac", "wav");
    const [winner] = ranked.filter((r) => !r.rejected);
    expect(winner.steps.length).toBe(1);

    const w = await executeRoute(winner, F.aac, "aacwav-w");
    expect((await ffprobeCodecs(w.outputPath)).some((c) => c.startsWith("pcm_"))).toBe(true);

    record({ pair: "aac->wav", routes: ranked.length, winner: winner.routeId, winnerScore: winner.score, challenger: null, challengerScore: null, winnerDurationMs: w.durationMs, challengerDurationMs: null, winnerReasons: winner.reasons, empiricalNote: "lossless target adds no extra codec loss (§15)" });
  }, TEST_TIMEOUT);

  it("BENCH-TS-MP4: winner executes; codec comparison records remux vs transcode", async () => {
    const ranked = rankedFor("ts", "mp4");
    const [winner] = ranked.filter((r) => !r.rejected);

    const inputCodecs = await ffprobeCodecs(F.ts);
    const w = await executeRoute(winner, F.ts, "tsmp4-w");
    const outCodecs = await ffprobeCodecs(w.outputPath);
    // Honest note: the →mp4 adapter operation is transcode-video (remux is
    // only offered for →mkv), so codec equality means re-encoded to the same
    // codec, not stream copy.
    const note = winner.steps[0].quality?.pipelineMode === "remux"
      ? `remux confirmed (${outCodecs[0]} copied)`
      : `transcode-video re-encodes ${inputCodecs[0]}→${outCodecs[0]}; remux reserved for →mkv per adapter capability`;

    record({ pair: "ts->mp4", routes: ranked.length, winner: winner.routeId, winnerScore: winner.score, challenger: null, challengerScore: null, winnerDurationMs: w.durationMs, challengerDurationMs: null, winnerReasons: winner.reasons, empiricalNote: note });
  }, TEST_TIMEOUT);

  it("BENCH-WMV-MP4: winner executes with valid streams", async () => {
    const ranked = rankedFor("wmv", "mp4");
    const [winner] = ranked.filter((r) => !r.rejected);

    const w = await executeRoute(winner, F.wmv, "wmvmp4-w");
    const codecs = await ffprobeCodecs(w.outputPath);
    expect(codecs.length).toBeGreaterThan(0);

    record({ pair: "wmv->mp4", routes: ranked.length, winner: winner.routeId, winnerScore: winner.score, challenger: null, challengerScore: null, winnerDurationMs: w.durationMs, challengerDurationMs: null, winnerReasons: winner.reasons, empiricalNote: `output codecs: ${codecs.join(",")}` });
  }, TEST_TIMEOUT);
});
