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

const ENGINE_ID: EngineId = "poppler";
const OUTPUTS = ["png", "jpg", "tiff"] as const;
type RasterOutputFormat = (typeof OUTPUTS)[number];

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

export class PopplerEngine implements ConversionEngine {
  readonly id: EngineId = ENGINE_ID;
  readonly supportedCategories = ["pdf"] as const;

  private _probeResult: EngineProbeResult | null = null;
  private _runner: ProcessRunner | null = null;

  private getRunner(): ProcessRunner {
    if (!this._runner) this._runner = new ProcessRunner(resolvePopplerRuntimeBinary(), 120_000);
    return this._runner;
  }

  async probe(): Promise<EngineProbeResult> {
    if (this._probeResult) return this._probeResult;
    const result = await this.getRunner().probe(["-v"]);
    this._probeResult = {
      available: result.available,
      version: result.version,
      binaryPath: result.binaryPath,
      capabilities: result.available ? ["pdf-to-png", "pdf-to-jpg", "pdf-to-tiff"] : [],
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
    return OUTPUTS.map((format) => ({
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
  }

  async execute(
    plan: ConversionPlan,
    onProgress?: (progress: number, stage: string) => void,
  ): Promise<ExecutionResult> {
    const start = Date.now();
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
