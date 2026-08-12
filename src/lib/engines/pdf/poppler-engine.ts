import fs from "fs";
import path from "path";
import JSZip from "jszip";
import type {
  ArtifactValidation,
  ConversionCapability,
  ConversionEngine,
  ConversionPlan,
  EngineId,
  EngineProbeResult,
  ExecutionResult,
} from "../../domain/engines";
import type { UniversalFileDescriptor } from "../../domain/descriptors";
import { CONFIG } from "../../config";
import { ProcessRunner } from "../../infrastructure/processes/process-runner";
import { ensurePathSafety } from "../../security/path-safety";
import { resolvePopplerBinary as resolveDiagnosticPopplerBinary } from "../../diagnostics/toolchain-probe";
import { isAncloraWindowsRuntime } from "../../runtime-platform";
import { findPandocBinary } from "../document/pandoc-engine";

const ENGINE_ID: EngineId = "poppler";
const OUTPUTS = ["png", "jpg", "tiff"] as const;
type RasterOutputFormat = (typeof OUTPUTS)[number];
type PopplerTool = "pdftotext" | "pdftohtml";

const SCANNED_PDF_ERROR =
  "Este PDF parece contener páginas escaneadas o sin texto extraíble. Para extraer texto, usa Conversión con OCR.";

export function resolvePopplerRuntimeBinary(): string {
  const configured = CONFIG.media.binaries.poppler;
  const isWindows = isAncloraWindowsRuntime();
  const executable = isWindows ? "pdftoppm.exe" : "pdftoppm";

  if (configured) {
    if (fs.existsSync(configured) && fs.statSync(configured).isFile()) return configured;
    return resolveDiagnosticPopplerBinary(configured, isWindows);
  }

  const portableRoot = path.resolve(process.cwd(), "tools", "poppler");
  if (fs.existsSync(portableRoot)) return resolveDiagnosticPopplerBinary(portableRoot, isWindows);

  return executable;
}

// Same Poppler runtime, sibling tools. pdftotext/pdftohtml ship in the same
// Poppler distribution as pdftoppm, so resolution reuses the unified resolver
// and falls back to PATH exactly like pdftoppm does.
export function resolvePopplerTool(tool: PopplerTool): string {
  const executable = isAncloraWindowsRuntime() ? `${tool}.exe` : tool;
  const pdftoppm = resolvePopplerRuntimeBinary();
  if (pdftoppm.includes("/") || pdftoppm.includes("\\")) {
    const sibling = path.join(path.dirname(pdftoppm), executable);
    if (fs.existsSync(sibling)) return sibling;
  }
  return executable;
}

export class PopplerEngine implements ConversionEngine {
  readonly id: EngineId = ENGINE_ID;
  readonly supportedCategories = ["pdf"] as const;

  private _probeResult: EngineProbeResult | null = null;
  private _runner: ProcessRunner | null = null;
  private _txtRunner: ProcessRunner | null = null;
  private _htmlRunner: ProcessRunner | null = null;
  private _pandocRunner: ProcessRunner | null = null;

  private getRunner(): ProcessRunner {
    if (!this._runner) this._runner = new ProcessRunner(resolvePopplerRuntimeBinary(), 120_000);
    return this._runner;
  }

  private getTxtRunner(): ProcessRunner {
    if (!this._txtRunner) this._txtRunner = new ProcessRunner(resolvePopplerTool("pdftotext"), 120_000);
    return this._txtRunner;
  }

  private getHtmlRunner(): ProcessRunner {
    if (!this._htmlRunner) this._htmlRunner = new ProcessRunner(resolvePopplerTool("pdftohtml"), 120_000);
    return this._htmlRunner;
  }

  private getPandocRunner(): ProcessRunner {
    if (!this._pandocRunner) this._pandocRunner = new ProcessRunner(findPandocBinary(), 120_000);
    return this._pandocRunner;
  }

  async probe(): Promise<EngineProbeResult> {
    if (this._probeResult) return this._probeResult;
    const [result, txtResult, htmlResult, pandocResult] = await Promise.all([
      this.getRunner().probe(["-v"]),
      this.getTxtRunner().probe(["-v"]),
      this.getHtmlRunner().probe(["-v"]),
      this.getPandocRunner().probe(["--version"]),
    ]);
    const capabilities: string[] = [];
    if (result.available) capabilities.push("pdftoppm", "pdf-to-png", "pdf-to-jpg", "pdf-to-tiff");
    if (txtResult.available) capabilities.push("pdftotext", "pdf-to-txt");
    if (htmlResult.available) capabilities.push("pdftohtml", "pdf-to-html");
    if (htmlResult.available && pandocResult.available) capabilities.push("pandoc", "pdf-to-md");
    this._probeResult = {
      available: result.available,
      version: result.version,
      binaryPath: result.binaryPath,
      capabilities,
      error: result.available
        ? undefined
        : "pdftoppm no encontrado en PATH ni en tools/poppler",
    };
    return this._probeResult;
  }

  getCapabilities(
    descriptor: UniversalFileDescriptor,
    probeResult: EngineProbeResult,
  ): ConversionCapability[] {
    if (descriptor.category !== "pdf") return [];
    const has = (tool: string) => probeResult.capabilities.includes(tool);
    const rasterCaps: ConversionCapability[] = OUTPUTS.map((format) => ({
      id: `poppler-${descriptor.id}-to-${format}`,
      operation: "rasterize",
      outputFormat: format,
      outputMime: mimeFor(format),
      label: `Convertir PDF a ${format.toUpperCase()}`,
      description: "Convierte cada página del PDF en una imagen",
      lossProfile: "lossy",
      state: probeResult.available ? "available" : "unavailable-tool",
      recommended: format === "png",
      presets: [
        {
          id: "screen",
          label: "Pantalla",
          quality: "150dpi",
          description: "Resolución equilibrada para uso general",
          isRecommended: true,
        },
        {
          id: "print",
          label: "Alta calidad",
          quality: "300dpi",
          description: "Más detalle y archivos más pesados",
        },
      ],
      warnings: ["Los PDF de varias páginas generan varias imágenes agrupadas en ZIP"],
      engineId: ENGINE_ID,
      mobilePortability: "desktop-only",
    }));

    const textCaps: ConversionCapability[] = [
      {
        id: `poppler-${descriptor.id}-to-txt`,
        operation: "extract-text",
        outputFormat: "txt",
        outputMime: "text/plain",
        label: "Extraer texto (TXT)",
        description: "Extrae el texto del PDF en UTF-8, sin conservar el layout",
        lossProfile: "layout-risk",
        state: has("pdftotext") ? "available" : "unavailable-tool",
        unavailableReason: "pdftotext no encontrado en PATH ni en tools/poppler",
        recommended: false,
        presets: [
          {
            id: "txt-utf8",
            label: "Texto plano",
            quality: "0",
            description: "Texto extraído en UTF-8",
            isRecommended: true,
          },
        ],
        warnings: [
          "No conserva el layout ni las imágenes del PDF",
          "Los PDF escaneados sin capa de texto requieren OCR",
        ],
        engineId: ENGINE_ID,
        mobilePortability: "desktop-only",
      },
      {
        id: `poppler-${descriptor.id}-to-html`,
        operation: "extract-html",
        outputFormat: "html",
        outputMime: "text/html",
        label: "Convertir PDF a HTML",
        description: "Genera un HTML único; las imágenes se entregan junto al documento",
        lossProfile: "structure-risk",
        state: has("pdftohtml") ? "available" : "unavailable-tool",
        unavailableReason: "pdftohtml no encontrado en PATH ni en tools/poppler",
        recommended: false,
        presets: [
          {
            id: "html-single",
            label: "HTML único",
            quality: "0",
            description: "Un solo documento HTML; ZIP cuando hay assets",
            isRecommended: true,
          },
        ],
        warnings: [
          "La fidelidad de layout es limitada frente al PDF original",
          "Cuando el PDF contiene imágenes, HTML y assets se entregan en ZIP",
        ],
        engineId: ENGINE_ID,
        mobilePortability: "desktop-only",
      },
      {
        id: `poppler-${descriptor.id}-to-md`,
        operation: "extract-markdown",
        outputFormat: "md",
        outputMime: "text/markdown",
        label: "Convertir PDF a Markdown",
        description: "Extrae el contenido vía HTML y lo normaliza a Markdown",
        lossProfile: "structure-risk",
        state: has("pdftohtml") && has("pandoc") ? "available" : "unavailable-tool",
        unavailableReason: "Requiere pdftohtml y Pandoc disponibles en el runtime",
        recommended: false,
        presets: [
          {
            id: "md-gfm",
            label: "Markdown (GFM)",
            quality: "0",
            description: "Markdown GitHub-Flavored generado con Pandoc",
            isRecommended: true,
          },
        ],
        warnings: [
          "No conserva el layout visual del PDF",
          "Los PDF escaneados sin capa de texto requieren OCR",
        ],
        engineId: ENGINE_ID,
        mobilePortability: "desktop-only",
      },
    ];

    return [...rasterCaps, ...textCaps];
  }

  async execute(
    plan: ConversionPlan,
    onProgress?: (progress: number, stage: string) => void,
  ): Promise<ExecutionResult> {
    const start = Date.now();
    if (plan.operation === "extract-text") return this.executeExtractText(plan, start, onProgress);
    if (plan.operation === "extract-html") return this.executeExtractHtml(plan, start, onProgress);
    if (plan.operation === "extract-markdown") return this.executeExtractMarkdown(plan, start, onProgress);

    const outputFormat = normalizeRasterFormat(plan.outputFormat);
    if (!outputFormat) {
      return failure(plan, start, `Formato de salida no soportado: ${plan.outputFormat}`);
    }

    try {
      ensurePathSafety(plan.inputPath);
      ensurePathSafety(plan.outputPath);
    } catch (err) {
      return failure(plan, start, String(err));
    }

    const outputDir = path.dirname(plan.outputPath);
    const workDir = path.join(outputDir, `.poppler-${plan.jobId}`);
    const inputBase = path.basename(plan.inputPath, path.extname(plan.inputPath));
    const prefix = path.join(workDir, inputBase);
    fs.mkdirSync(workDir, { recursive: true });

    const dpi = clampDpi(plan.options.dpi);
    const args = ["-r", String(dpi), flagFor(outputFormat), plan.inputPath, prefix];

    onProgress?.(20, "Rasterizando PDF");
    const result = await this.getRunner().run({ args, timeoutMs: plan.timeoutMs });
    if (result.exitCode !== 0) {
      fs.rmSync(workDir, { recursive: true, force: true });
      return failure(plan, start, `pdftoppm exit ${result.exitCode}: ${result.stderr.slice(0, 300)}`, [
        result.stdout,
        result.stderr,
      ]);
    }

    const generated = listGeneratedPages(workDir, inputBase, outputFormat);
    if (generated.length === 0) {
      fs.rmSync(workDir, { recursive: true, force: true });
      return failure(plan, start, "pdftoppm no generó imágenes", [result.stdout, result.stderr]);
    }

    onProgress?.(80, generated.length === 1 ? "Preparando imagen" : "Empaquetando páginas");
    const finalOutputPath = generated.length === 1 && path.extname(plan.outputPath).toLowerCase() !== ".zip"
      ? plan.outputPath
      : zipOutputPath(plan.outputPath, inputBase, outputFormat);

    if (generated.length === 1 && path.extname(plan.outputPath).toLowerCase() !== ".zip") {
      fs.renameSync(generated[0], finalOutputPath);
    } else {
      await writePagesZip(finalOutputPath, generated, inputBase, outputFormat);
    }

    fs.rmSync(workDir, { recursive: true, force: true });
    const stat = fs.statSync(finalOutputPath);
    onProgress?.(100, "Completado");

    return {
      success: true,
      outputPath: finalOutputPath,
      outputSizeBytes: stat.size,
      durationMs: Date.now() - start,
      logs: [result.stdout, result.stderr].filter(Boolean),
      warnings: generated.length > 1 ? [`${generated.length} páginas exportadas en ZIP`] : [],
    };
  }

  private checkPaths(plan: ConversionPlan, start: number): ExecutionResult | null {
    try {
      ensurePathSafety(plan.inputPath);
      ensurePathSafety(plan.outputPath);
      return null;
    } catch (err) {
      return failure(plan, start, String(err));
    }
  }

  private async executeExtractText(
    plan: ConversionPlan,
    start: number,
    onProgress?: (progress: number, stage: string) => void,
  ): Promise<ExecutionResult> {
    const unsafe = this.checkPaths(plan, start);
    if (unsafe) return unsafe;

    onProgress?.(30, "Extrayendo texto del PDF");
    const args = ["-enc", "UTF-8", plan.inputPath, plan.outputPath];
    const result = await this.getTxtRunner().run({ args, timeoutMs: plan.timeoutMs });
    if (result.exitCode !== 0) {
      return failure(plan, start, `pdftotext exit ${result.exitCode}: ${result.stderr.slice(0, 300)}`, [
        result.stdout,
        result.stderr,
      ]);
    }

    const text = fs.existsSync(plan.outputPath) ? fs.readFileSync(plan.outputPath, "utf8") : "";
    if (!text.trim()) {
      fs.rmSync(plan.outputPath, { force: true });
      return failure(plan, start, SCANNED_PDF_ERROR, [result.stdout, result.stderr]);
    }

    const stat = fs.statSync(plan.outputPath);
    onProgress?.(100, "Completado");
    return {
      success: true,
      outputPath: plan.outputPath,
      outputSizeBytes: stat.size,
      durationMs: Date.now() - start,
      logs: [result.stdout, result.stderr].filter(Boolean),
      warnings: [],
    };
  }

  private async executeExtractHtml(
    plan: ConversionPlan,
    start: number,
    onProgress?: (progress: number, stage: string) => void,
  ): Promise<ExecutionResult> {
    const unsafe = this.checkPaths(plan, start);
    if (unsafe) return unsafe;

    const outputDir = path.dirname(plan.outputPath);
    const workDir = path.join(outputDir, `.pdftohtml-${plan.jobId}`);
    const inputBase = path.basename(plan.inputPath, path.extname(plan.inputPath));
    fs.mkdirSync(workDir, { recursive: true });

    onProgress?.(30, "Generando HTML");
    const requestedHtml = path.join(workDir, `${inputBase}.html`);
    const args = ["-s", "-noframes", plan.inputPath, requestedHtml];
    const result = await this.getHtmlRunner().run({ args, timeoutMs: plan.timeoutMs });
    if (result.exitCode !== 0) {
      fs.rmSync(workDir, { recursive: true, force: true });
      return failure(plan, start, `pdftohtml exit ${result.exitCode}: ${result.stderr.slice(0, 300)}`, [
        result.stdout,
        result.stderr,
      ]);
    }

    const htmlEntry = fs.readdirSync(workDir).find((entry) => entry.toLowerCase().endsWith(".html"));
    if (!htmlEntry) {
      fs.rmSync(workDir, { recursive: true, force: true });
      return failure(plan, start, "pdftohtml no generó el documento HTML", [result.stdout, result.stderr]);
    }
    const htmlPath = path.join(workDir, htmlEntry);
    const assets = fs.readdirSync(workDir)
      .filter((entry) => entry !== htmlEntry)
      .map((entry) => path.join(workDir, entry));

    // Scanned guard: no extractable text and no page images means empty result.
    const textContent = fs.readFileSync(htmlPath, "utf8").replace(/<[^>]*>/g, "").trim();
    if (!textContent && assets.length === 0) {
      fs.rmSync(workDir, { recursive: true, force: true });
      return failure(plan, start, SCANNED_PDF_ERROR, [result.stdout, result.stderr]);
    }

    onProgress?.(80, assets.length > 0 ? "Empaquetando HTML y assets" : "Preparando HTML");
    let finalOutputPath = plan.outputPath;
    if (assets.length === 0) {
      fs.renameSync(htmlPath, plan.outputPath);
    } else {
      finalOutputPath = zipOutputPath(plan.outputPath, inputBase, "html" as RasterOutputFormat);
      const zip = new JSZip();
      zip.file(htmlEntry, fs.readFileSync(htmlPath));
      for (const assetPath of assets) {
        zip.file(path.basename(assetPath), fs.readFileSync(assetPath));
      }
      fs.writeFileSync(finalOutputPath, await zip.generateAsync({ type: "nodebuffer" }));
    }

    fs.rmSync(workDir, { recursive: true, force: true });
    const stat = fs.statSync(finalOutputPath);
    onProgress?.(100, "Completado");
    return {
      success: true,
      outputPath: finalOutputPath,
      outputSizeBytes: stat.size,
      durationMs: Date.now() - start,
      logs: [result.stdout, result.stderr].filter(Boolean),
      warnings: assets.length > 0
        ? [`HTML y ${assets.length} assets empaquetados en ZIP`]
        : [],
    };
  }

  private async executeExtractMarkdown(
    plan: ConversionPlan,
    start: number,
    onProgress?: (progress: number, stage: string) => void,
  ): Promise<ExecutionResult> {
    const unsafe = this.checkPaths(plan, start);
    if (unsafe) return unsafe;

    // Ground-truth scanned check: pdftotext to stdout. If the PDF has no
    // extractable text layer, fail controlled instead of emitting empty MD.
    // Skipped gracefully when pdftotext itself is unavailable.
    const probeText = await this.getTxtRunner().run({
      args: ["-enc", "UTF-8", plan.inputPath, "-"],
      timeoutMs: plan.timeoutMs,
    });
    if (probeText.exitCode === 0 && !probeText.stdout.trim()) {
      return failure(plan, start, SCANNED_PDF_ERROR, [probeText.stderr]);
    }

    const outputDir = path.dirname(plan.outputPath);
    const workDir = path.join(outputDir, `.pdftomd-${plan.jobId}`);
    const inputBase = path.basename(plan.inputPath, path.extname(plan.inputPath));
    fs.mkdirSync(workDir, { recursive: true });

    onProgress?.(30, "Extrayendo contenido del PDF");
    const htmlPath = path.join(workDir, `${inputBase}.html`);
    const htmlResult = await this.getHtmlRunner().run({
      args: ["-s", "-noframes", "-i", plan.inputPath, htmlPath],
      timeoutMs: plan.timeoutMs,
    });
    if (htmlResult.exitCode !== 0) {
      fs.rmSync(workDir, { recursive: true, force: true });
      return failure(plan, start, `pdftohtml exit ${htmlResult.exitCode}: ${htmlResult.stderr.slice(0, 300)}`, [
        htmlResult.stdout,
        htmlResult.stderr,
      ]);
    }

    const generatedHtml = fs.existsSync(htmlPath)
      ? htmlPath
      : (() => {
          const entry = fs.readdirSync(workDir).find((e) => e.toLowerCase().endsWith(".html"));
          return entry ? path.join(workDir, entry) : null;
        })();
    const textContent = generatedHtml && fs.existsSync(generatedHtml)
      ? fs.readFileSync(generatedHtml, "utf8").replace(/<[^>]*>/g, "").trim()
      : "";
    if (!generatedHtml || !textContent) {
      fs.rmSync(workDir, { recursive: true, force: true });
      return failure(plan, start, SCANNED_PDF_ERROR, [htmlResult.stdout, htmlResult.stderr]);
    }

    onProgress?.(60, "Normalizando a Markdown");
    const mdResult = await this.getPandocRunner().run({
      args: ["-f", "html", "-t", "gfm", "--wrap=none", "-o", plan.outputPath, generatedHtml],
      timeoutMs: plan.timeoutMs,
    });
    fs.rmSync(workDir, { recursive: true, force: true });
    if (mdResult.exitCode !== 0) {
      return failure(plan, start, `pandoc exit ${mdResult.exitCode}: ${mdResult.stderr.slice(0, 300)}`, [
        mdResult.stdout,
        mdResult.stderr,
      ]);
    }

    const markdown = fs.existsSync(plan.outputPath) ? fs.readFileSync(plan.outputPath, "utf8") : "";
    if (!markdown.trim()) {
      fs.rmSync(plan.outputPath, { force: true });
      return failure(plan, start, SCANNED_PDF_ERROR, [mdResult.stdout, mdResult.stderr]);
    }

    const stat = fs.statSync(plan.outputPath);
    onProgress?.(100, "Completado");
    return {
      success: true,
      outputPath: plan.outputPath,
      outputSizeBytes: stat.size,
      durationMs: Date.now() - start,
      logs: [htmlResult.stderr, mdResult.stderr].filter(Boolean),
      warnings: [],
    };
  }

  async validate(outputPath: string, plan: ConversionPlan): Promise<ArtifactValidation> {
    const checks: ArtifactValidation["checks"] = [];
    const exists = fs.existsSync(outputPath);
    checks.push({ name: "file-exists", passed: exists });
    if (!exists) return { valid: false, checks };

    const stat = fs.statSync(outputPath);
    checks.push({ name: "size-nonzero", passed: stat.size > 0, detail: `${stat.size} bytes` });

    const ext = path.extname(outputPath).toLowerCase();
    if (ext === ".zip") {
      const isZip = fs.readFileSync(outputPath).subarray(0, 2).toString("ascii") === "PK";
      checks.push({ name: "zip-magic-bytes", passed: isZip });
    } else if (ext === ".txt" || ext === ".md") {
      try {
        const content = fs.readFileSync(outputPath, "utf8");
        checks.push({ name: "utf8-readable", passed: true });
        checks.push({ name: "text-non-empty", passed: content.trim().length > 0 });
      } catch {
        checks.push({ name: "utf8-readable", passed: false });
      }
    } else if (ext === ".html") {
      const head = fs.readFileSync(outputPath, "utf8").slice(0, 65536);
      checks.push({
        name: "html-document",
        passed: /<!doctype html|<html[\s>]/i.test(head),
      });
      checks.push({
        name: "text-non-empty",
        passed: head.replace(/<[^>]*>/g, "").trim().length > 0,
      });
    } else {
      checks.push({
        name: "image-extension",
        passed: ext === `.${normalizeRasterFormat(plan.outputFormat)}`,
        detail: ext,
      });
    }

    return { valid: checks.every((check) => check.passed), checks };
  }
}

function normalizeRasterFormat(format: string): RasterOutputFormat | null {
  const normalized = format.toLowerCase() === "jpeg" ? "jpg" : format.toLowerCase();
  return OUTPUTS.includes(normalized as RasterOutputFormat)
    ? (normalized as RasterOutputFormat)
    : null;
}

function flagFor(format: RasterOutputFormat): string {
  if (format === "jpg") return "-jpeg";
  if (format === "tiff") return "-tiff";
  return "-png";
}

function mimeFor(format: RasterOutputFormat): string {
  if (format === "jpg") return "image/jpeg";
  if (format === "tiff") return "image/tiff";
  return "image/png";
}

function clampDpi(value: unknown): number {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : 150;
  return Math.min(600, Math.max(72, Math.round(parsed)));
}

function listGeneratedPages(
  workDir: string,
  inputBase: string,
  outputFormat: RasterOutputFormat,
): string[] {
  const ext = outputFormat === "jpg" ? "jpg" : outputFormat;
  return fs.readdirSync(workDir)
    .filter((entry) => {
      if (!entry.startsWith(`${inputBase}-`)) return false;
      if (outputFormat === "tiff") return entry.endsWith(".tiff") || entry.endsWith(".tif");
      return entry.endsWith(`.${ext}`);
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((entry) => path.join(workDir, entry));
}

function zipOutputPath(outputPath: string, inputBase: string, outputFormat: RasterOutputFormat): string {
  if (path.extname(outputPath).toLowerCase() === ".zip") return outputPath;
  return path.join(path.dirname(outputPath), `${inputBase}-${outputFormat}.zip`);
}

async function writePagesZip(
  outputPath: string,
  pages: string[],
  inputBase: string,
  outputFormat: RasterOutputFormat,
): Promise<void> {
  const zip = new JSZip();
  const ext = outputFormat === "jpg" ? "jpg" : outputFormat;
  pages.forEach((pagePath, index) => {
    zip.file(`${inputBase}-page-${String(index + 1).padStart(3, "0")}.${ext}`, fs.readFileSync(pagePath));
  });
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(outputPath, buffer);
}

function failure(
  plan: ConversionPlan,
  start: number,
  error: string,
  logs: string[] = [],
): ExecutionResult {
  return {
    success: false,
    outputPath: plan.outputPath,
    outputSizeBytes: 0,
    durationMs: Date.now() - start,
    logs: logs.filter(Boolean),
    warnings: [],
    error,
  };
}

export const popplerEngine = new PopplerEngine();
