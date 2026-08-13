import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { CONFIG } from "../../src/lib/config";
import { buildDescriptor } from "../../src/lib/detection/file-detector";
import { getEngine } from "../../src/lib/engines/registry";
import { resolveHtmlRendererRuntime, rendererTempDir } from "../../src/lib/engines/html/html-renderer-runtime";
import { buildConversionGraph } from "../../src/lib/conversion-routing/graph";
import { findConversionRoutes } from "../../src/lib/conversion-routing/router";
import { rankRoutes, type RankedRoute } from "../../src/lib/conversion-routing/ranking";
import { getAvailableEngineIds } from "../../src/lib/conversion-routing/server";
import type { ConversionPlan } from "../../src/lib/domain/engines";
import type { ConversionEdge } from "../../src/lib/conversion-routing/types";

const TEST_TIMEOUT = 180_000;
let tmpDir: string;
let graph: Map<string, ConversionEdge[]>;

function writeFixture(name: string, content: string | Buffer): string {
  const filePath = path.join(tmpDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

async function imageFacts(filePath: string): Promise<{ width: number; height: number; stdev: number; format: string | undefined }> {
  const img = sharp(filePath);
  const meta = await img.metadata();
  const stats = await img.stats();
  return {
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    stdev: stats.channels.reduce((sum, channel) => sum + channel.stdev, 0),
    format: meta.format,
  };
}

async function descriptorFor(filePath: string, id: string) {
  return buildDescriptor(
    filePath,
    {
      kind: "local-upload",
      originalName: path.basename(filePath),
      storedRelativePath: path.relative(CONFIG.media.tempDir, filePath),
    },
    id,
  );
}

async function executeEngine(inputPath: string, outputFormat: "png" | "tiff", tag: string) {
  const engine = getEngine("html-renderer");
  expect(engine).toBeTruthy();
  const probe = await engine!.probe();
  expect(probe.available, probe.error).toBe(true);
  const descriptor = await descriptorFor(inputPath, `${tag}-descriptor`);
  const cap = engine!.getCapabilities(descriptor, probe).find((item) => item.outputFormat === outputFormat);
  expect(cap).toBeTruthy();
  const outputPath = path.join(tmpDir, `${tag}.${outputFormat}`);
  const plan: ConversionPlan = {
    jobId: `html-renderer-${tag}`,
    engineId: "html-renderer",
    operation: cap!.operation,
    inputPath,
    outputPath,
    outputFormat,
    options: { inputFormat: "html" },
    args: [],
    env: {},
    timeoutMs: TEST_TIMEOUT,
    estimatedSizeBytes: null,
  };
  const result = await engine!.execute(plan);
  expect(result.success, result.error).toBe(true);
  const validation = await engine!.validate(outputPath, plan);
  expect(validation.valid, JSON.stringify(validation.checks)).toBe(true);
  return { outputPath, result };
}

async function executeRoute(route: RankedRoute, inputPath: string, tag: string): Promise<string> {
  let stepInput = inputPath;
  let outputPath = inputPath;

  for (let i = 0; i < route.steps.length; i++) {
    const step = route.steps[i];
    outputPath = path.join(tmpDir, `${tag}-step-${i + 1}.${step.target}`);
    const engine = getEngine(step.engineId);
    expect(engine).toBeTruthy();
    const probe = await engine!.probe();
    expect(probe.available, `${step.engineId}: ${probe.error ?? ""}`).toBe(true);
    const descriptor = await descriptorFor(stepInput, `${tag}-${i}`);
    const cap = engine!.getCapabilities(descriptor, probe).find((item) => item.outputFormat === step.target);
    expect(cap, `${step.engineId} -> ${step.target}`).toBeTruthy();
    const plan: ConversionPlan = {
      jobId: `${tag}-${i}`,
      engineId: engine!.id,
      operation: cap!.operation,
      inputPath: stepInput,
      outputPath,
      outputFormat: step.target,
      options: { inputFormat: step.source },
      args: [],
      env: {},
      timeoutMs: TEST_TIMEOUT,
      estimatedSizeBytes: null,
    };
    const result = await engine!.execute(plan);
    expect(result.success, result.error).toBe(true);
    const validation = await engine!.validate(outputPath, plan);
    expect(validation.valid, JSON.stringify(validation.checks)).toBe(true);
    stepInput = outputPath;
  }

  return outputPath;
}

function rankedWinner(source: string, target: string): RankedRoute {
  const ranked = rankRoutes(findConversionRoutes(graph, source, target));
  expect(ranked.length).toBeGreaterThan(0);
  const winner = ranked.find((route) => !route.rejected);
  expect(winner).toBeTruthy();
  return winner!;
}

beforeAll(async () => {
  fs.mkdirSync(CONFIG.media.tempDir, { recursive: true });
  tmpDir = fs.mkdtempSync(path.join(CONFIG.media.tempDir, "html-renderer-"));
  const available = await getAvailableEngineIds();
  graph = buildConversionGraph(available, { environment: "linux" });
}, TEST_TIMEOUT);

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("HTML_RENDERER runtime and safe raster rendering", () => {
  it("RENDER-001 detects a reproducible Chromium runtime", async () => {
    const runtime = resolveHtmlRendererRuntime();
    expect(runtime.available, runtime.error).toBe(true);
    expect(runtime.binaryPath).toBeTruthy();
    expect(runtime.source).not.toBeNull();
  });

  it("RENDER-002/003/004/006 renders simple HTML, CSS, tables and Unicode to PNG", async () => {
    const input = writeFixture("HTMLIMG-003 table unicode.html", `<!doctype html>
      <html><body>
      <h1>HTMLIMG-003 Café € 漢字</h1>
      <style>.box{display:grid;grid-template-columns:1fr 1fr;gap:12px}.a{background:#155e75;color:white;padding:20px}</style>
      <div class="box"><div class="a">Grid cell</div><div>Second cell</div></div>
      <table><tr><th>Name</th><th>Value</th></tr><tr><td>alpha</td><td>42</td></tr></table>
      </body></html>`);
    const { outputPath } = await executeEngine(input, "png", "render-css-table-unicode");
    const facts = await imageFacts(outputPath);
    expect(facts.format).toBe("png");
    expect(facts.width).toBeGreaterThan(500);
    expect(facts.height).toBeGreaterThan(300);
    expect(facts.stdev).toBeGreaterThan(5);
  }, TEST_TIMEOUT);

  it("RENDER-005/011 supports local images and paths with spaces", async () => {
    const assetDir = path.join(tmpDir, "dir with spaces");
    fs.mkdirSync(assetDir, { recursive: true });
    await sharp({ create: { width: 80, height: 50, channels: 3, background: "#dc2626" } })
      .png()
      .toFile(path.join(assetDir, "local asset.png"));
    const input = writeFixture("dir with spaces/local page.html", `<!doctype html><html><body>
      <h1>Local asset</h1><img src="./local asset.png" alt="local">
      </body></html>`);
    const { outputPath } = await executeEngine(input, "png", "render-path-spaces");
    const stats = await sharp(outputPath).stats();
    expect(stats.channels[0].max).toBeGreaterThan(180);
  }, TEST_TIMEOUT);

  it("RENDER-007 captures the full page instead of only the initial viewport", async () => {
    const rows = Array.from({ length: 90 }, (_, i) => `<p>Long row ${i + 1}</p>`).join("");
    const input = writeFixture("HTMLIMG-010 long.html", `<!doctype html><html><body>${rows}</body></html>`);
    const { outputPath } = await executeEngine(input, "png", "render-full-page");
    const facts = await imageFacts(outputPath);
    expect(facts.height).toBeGreaterThan(1800);
  }, TEST_TIMEOUT);

  it("RENDER-008/009 blocks remote resources and disables JavaScript", async () => {
    const input = writeFixture("HTMLIMG-013 security.html", `<!doctype html><html><body>
      <h1>Security fixture</h1>
      <img src="https://127.0.0.1:9/blocked.png">
      <script>document.body.innerHTML = '<div style="background:#ff0000;height:500px">bad</div>';</script>
      <div style="background:#1d4ed8;height:120px;width:260px"></div>
      </body></html>`);
    const { outputPath, result } = await executeEngine(input, "png", "render-security");
    expect(result.warnings.some((warning) => warning.includes("Blocked resource: https://127.0.0.1"))).toBe(true);
    const stats = await sharp(outputPath).stats();
    expect(stats.channels[2].max).toBeGreaterThan(180);
  }, TEST_TIMEOUT);

  it("RENDER-010 rejects oversized documents without silent truncation", async () => {
    const input = writeFixture("HTMLIMG-oversize.html", `<!doctype html><html><body>
      <div style="height:17000px;background:#fff">Too tall</div>
      </body></html>`);
    const engine = getEngine("html-renderer")!;
    const plan: ConversionPlan = {
      jobId: "html-renderer-oversize",
      engineId: "html-renderer",
      operation: "render-html-image",
      inputPath: input,
      outputPath: path.join(tmpDir, "oversize.png"),
      outputFormat: "png",
      options: { inputFormat: "html" },
      args: [],
      env: {},
      timeoutMs: TEST_TIMEOUT,
      estimatedSizeBytes: null,
    };
    const result = await engine.execute(plan);
    expect(result.success).toBe(false);
    expect(result.error).toContain("exceed limit");
  }, TEST_TIMEOUT);

  it("RENDER-012 removes the isolated browser profile after rendering", async () => {
    const input = writeFixture("cleanup.html", "<!doctype html><html><body><h1>cleanup</h1></body></html>");
    await executeEngine(input, "png", "render-cleanup");
    expect(fs.existsSync(rendererTempDir("html-renderer-render-cleanup"))).toBe(false);
  }, TEST_TIMEOUT);

  it("TIFF renders through PNG and validates with Sharp", async () => {
    const input = writeFixture("HTMLIMG-tiff.html", "<!doctype html><html><body><h1>TIFF</h1><p>Render</p></body></html>");
    const { outputPath } = await executeEngine(input, "tiff", "render-tiff");
    const facts = await imageFacts(outputPath);
    expect(facts.format).toBe("tiff");
    expect(facts.width).toBeGreaterThan(500);
    expect(facts.stdev).toBeGreaterThan(1);
  }, TEST_TIMEOUT);
});

describe("markup to image routes are derived through HTML", () => {
  it("MDPNG-001 ranks and executes MD → HTML → PNG", async () => {
    const input = writeFixture("MDIMG-001.md", "# Markdown image\n\n| A | B |\n| - | - |\n| café | € |\n");
    const winner = rankedWinner("md", "png");
    expect(winner.routeId).toContain("md>html");
    expect(winner.routeId).toContain("html>png");
    const output = await executeRoute(winner, input, "mdpng");
    const facts = await imageFacts(output);
    expect(facts.format).toBe("png");
    expect(facts.stdev).toBeGreaterThan(1);
  }, TEST_TIMEOUT);

  it("RSTPNG-001 ranks and executes RST → HTML → PNG", async () => {
    const input = writeFixture("RSTIMG-001.rst", "RST image\n=========\n\n- item one\n- item two\n\n+-----+-----+\n| A   | B   |\n+=====+=====+\n| 1   | 2   |\n+-----+-----+\n");
    const winner = rankedWinner("rst", "png");
    expect(winner.routeId).toContain("rst>html");
    expect(winner.routeId).toContain("html>png");
    const output = await executeRoute(winner, input, "rstpng");
    const facts = await imageFacts(output);
    expect(facts.format).toBe("png");
    expect(facts.stdev).toBeGreaterThan(1);
  }, TEST_TIMEOUT);

  it("MD/RST TIFF routes stay within MAX_INTERMEDIATES through HTML", () => {
    for (const source of ["md", "rst"]) {
      const winner = rankedWinner(source, "tiff");
      expect(winner.steps, winner.routeId).toHaveLength(2);
      expect(winner.intermediateFormats).toEqual(["html"]);
      expect(winner.routeId).toContain(`${source}>html`);
      expect(winner.routeId).toContain("html>tiff");
    }
  });
});
