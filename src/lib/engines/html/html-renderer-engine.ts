// Safe HTML/markup raster renderer.
// HTML is rendered in an isolated Chromium profile with JavaScript and network
// disabled by default. TIFF is produced from the rendered PNG through Sharp.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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
import { ensurePathSafety } from "../../security/path-safety";
import { fileUrlForDir, rendererTempDir, resolveHtmlRendererRuntime } from "./html-renderer-runtime";

const ENGINE_ID: EngineId = "html-renderer";
const OUTPUT_FORMATS = ["png", "tiff"] as const;
const DEFAULT_WIDTH = 1280;
const MIN_HEIGHT = 720;
const MAX_HEIGHT = 16_000;
const MAX_PIXELS = 24_000_000;

type OutputFormat = typeof OUTPUT_FORMATS[number];

function outputMime(format: OutputFormat): string {
  return format === "png" ? "image/png" : "image/tiff";
}

function isHtmlInput(descriptor: UniversalFileDescriptor): boolean {
  const ext = descriptor.extension?.toLowerCase();
  const fmt = descriptor.detectedFormat?.toLowerCase();
  return ext === "html" || ext === "htm" || fmt === "html";
}

function normalizeHtml(raw: string, baseDir: string): string {
  const hasHtml = /<html[\s>]/i.test(raw);
  const body = hasHtml ? raw : `<!doctype html><html><head></head><body>${raw}</body></html>`;
  const baseHref = fileUrlForDir(baseDir);
  const baseCss = `
    <style>
      :root { color-scheme: light; }
      html { background: #ffffff; }
      body {
        margin: 40px auto;
        max-width: 980px;
        color: #1f2933;
        background: #ffffff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 16px;
        line-height: 1.55;
      }
      img, svg, video, canvas { max-width: 100%; height: auto; }
      table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      th, td { border: 1px solid #cbd5e1; padding: 0.45em 0.6em; text-align: left; }
      pre, code { font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; }
      pre { overflow-x: auto; padding: 0.9em; background: #f3f4f6; border: 1px solid #d1d5db; }
      blockquote { margin-left: 0; padding-left: 1em; border-left: 4px solid #cbd5e1; color: #4b5563; }
    </style>`;

  if (/<head[\s>]/i.test(body)) {
    return body.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">${baseCss}`);
  }
  return body.replace(/<html([^>]*)>/i, `<html$1><head><base href="${baseHref}">${baseCss}</head>`);
}

function requestAllowed(url: string, baseDir: string): boolean {
  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("about:")) return true;
  if (url.startsWith("http:") || url.startsWith("https:")) return false;
  if (!url.startsWith("file:")) return false;
  try {
    const resolved = path.resolve(fileURLToPath(url));
    const root = path.resolve(baseDir);
    const relative = path.relative(root, resolved);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  } catch {
    return false;
  }
}

async function chromiumVersion(binaryPath: string): Promise<string | null> {
  const { spawn } = await import("child_process");
  return new Promise((resolve) => {
    const child = spawn(binaryPath, ["--version"], { shell: false, windowsHide: true });
    let output = "";
    child.stdout?.on("data", (chunk: Buffer) => { output += chunk.toString("utf8"); });
    child.stderr?.on("data", (chunk: Buffer) => { output += chunk.toString("utf8"); });
    child.on("close", () => resolve(output.trim() || null));
    child.on("error", () => resolve(null));
    setTimeout(() => {
      child.kill("SIGKILL");
      resolve(null);
    }, 5_000).unref();
  });
}

export class HtmlRendererEngine implements ConversionEngine {
  readonly id: EngineId = ENGINE_ID;
  readonly supportedCategories = ["plain-text", "document"] as const;

  private _probeResult: EngineProbeResult | null = null;

  async probe(): Promise<EngineProbeResult> {
    if (this._probeResult) return this._probeResult;
    const runtime = resolveHtmlRendererRuntime();
    if (!runtime.available || !runtime.binaryPath) {
      this._probeResult = {
        available: false,
        version: null,
        binaryPath: null,
        capabilities: [],
        error: runtime.error,
        requiredRuntimePacks: ["chromium-runtime"],
        runtimeState: runtime.runtimePackState === "NOT_INSTALLED" ? "installable" : "unavailable",
      };
      return this._probeResult;
    }

    const version = await chromiumVersion(runtime.binaryPath);
    this._probeResult = {
      available: true,
      version,
      binaryPath: `${runtime.binaryPath} (${runtime.source})`,
      capabilities: ["html-to-png", "html-to-tiff", "network-blocked", "javascript-disabled"],
      requiredRuntimePacks: runtime.source === "runtime-pack" ? ["chromium-runtime"] : undefined,
      runtimeState: "available",
    };
    return this._probeResult;
  }

  getCapabilities(
    descriptor: UniversalFileDescriptor,
    probeResult: EngineProbeResult,
  ): ConversionCapability[] {
    if (!isHtmlInput(descriptor)) return [];
    return OUTPUT_FORMATS.map((format) => ({
      id: `html-renderer-${descriptor.id}-${format}`,
      operation: "render-html-image",
      outputFormat: format,
      outputMime: outputMime(format),
      label: `Renderizar a ${format.toUpperCase()}`,
      description:
        format === "png"
          ? "HTML estático → imagen PNG de página completa"
          : "HTML estático → PNG renderizado → TIFF LZW",
      lossProfile: "lossy",
      state: probeResult.available ? "available" :
        probeResult.runtimeState === "installable" ? "runtime-installable" : "unavailable-tool",
      unavailableReason: probeResult.available ? undefined : probeResult.error,
      requiredRuntimePacks: ["chromium-runtime"],
      runtimeState: probeResult.available ? "available" : (probeResult.runtimeState ?? "unavailable"),
      recommended: true,
      presets: [
        {
          id: `html-renderer-${format}-full-page`,
          label: "Página completa",
          quality: "0",
          description: "Captura de altura completa con red bloqueada y JavaScript deshabilitado",
          isRecommended: true,
        },
      ],
      warnings: [
        "El texto editable y la estructura semántica se aplanan a raster.",
        "Los recursos remotos se bloquean por defecto.",
      ],
      engineId: ENGINE_ID,
      mobilePortability: "desktop-only",
    }));
  }

  async execute(
    plan: ConversionPlan,
    onProgress?: (progress: number, stage: string) => void,
  ): Promise<ExecutionResult> {
    const start = Date.now();
    const warnings = ["JavaScript deshabilitado", "Recursos remotos bloqueados"];
    let context: import("playwright-core").BrowserContext | null = null;
    const profileDir = rendererTempDir(plan.jobId);

    try {
      ensurePathSafety(plan.inputPath, path.dirname(plan.inputPath));
      ensurePathSafety(plan.outputPath);
      const runtime = resolveHtmlRendererRuntime();
      if (!runtime.available || !runtime.binaryPath) {
        throw new Error(runtime.error ?? "Chromium runtime unavailable");
      }

      const baseDir = path.dirname(path.resolve(plan.inputPath));
      fs.rmSync(profileDir, { recursive: true, force: true });
      fs.mkdirSync(profileDir, { recursive: true });

      onProgress?.(15, "Leyendo HTML");
      const html = normalizeHtml(fs.readFileSync(plan.inputPath, "utf8"), baseDir);

      onProgress?.(30, "Iniciando renderer");
      const { chromium } = await import("playwright-core");
      context = await chromium.launchPersistentContext(profileDir, {
        executablePath: runtime.binaryPath,
        headless: true,
        timeout: Math.min(plan.timeoutMs, 30_000),
        args: [
          "--disable-dev-shm-usage",
          "--disable-extensions",
          "--disable-sync",
          "--disable-background-networking",
          "--no-first-run",
          "--no-default-browser-check",
        ],
        javaScriptEnabled: false,
        viewport: { width: DEFAULT_WIDTH, height: MIN_HEIGHT },
        deviceScaleFactor: 1,
        colorScheme: "light",
      });
      await context.route("**/*", async (route) => {
        if (requestAllowed(route.request().url(), baseDir)) {
          await route.continue();
        } else {
          warnings.push(`Blocked resource: ${route.request().url().slice(0, 120)}`);
          await route.abort("blockedbyclient");
        }
      });

      const page = await context.newPage();
      page.setDefaultTimeout(Math.min(plan.timeoutMs, 30_000));
      onProgress?.(50, "Renderizando");
      await page.setContent(html, { waitUntil: "load", timeout: Math.min(plan.timeoutMs, 30_000) });
      const dimensions = await page.evaluate(() => ({
        width: Math.ceil(Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)),
        height: Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)),
      }));
      const width = Math.max(DEFAULT_WIDTH, Math.min(dimensions.width || DEFAULT_WIDTH, 4096));
      const height = Math.max(MIN_HEIGHT, dimensions.height || MIN_HEIGHT);
      if (height > MAX_HEIGHT || width * height > MAX_PIXELS) {
        throw new Error(`HTML render dimensions exceed limit: ${width}x${height}`);
      }
      await page.setViewportSize({ width, height: Math.min(height, MAX_HEIGHT) });

      onProgress?.(75, "Capturando página completa");
      const pngBuffer = await page.screenshot({
        type: "png",
        fullPage: true,
        animations: "disabled",
        caret: "hide",
        timeout: Math.min(plan.timeoutMs, 60_000),
      });

      if (plan.outputFormat === "png") {
        fs.writeFileSync(plan.outputPath, pngBuffer);
      } else if (plan.outputFormat === "tiff") {
        const sharp = (await import("sharp")).default;
        await sharp(pngBuffer).tiff({ compression: "lzw" }).toFile(plan.outputPath);
      } else {
        throw new Error(`Unsupported HTML renderer output format: ${plan.outputFormat}`);
      }

      const stat = fs.statSync(plan.outputPath);
      onProgress?.(100, "Completado");
      return {
        success: true,
        outputPath: plan.outputPath,
        outputSizeBytes: stat.size,
        durationMs: Date.now() - start,
        logs: [`rendered ${width}x${height}`],
        warnings,
      };
    } catch (err) {
      return {
        success: false,
        outputPath: plan.outputPath,
        outputSizeBytes: 0,
        durationMs: Date.now() - start,
        logs: [],
        warnings,
        error: String(err),
      };
    } finally {
      await context?.close().catch(() => undefined);
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
  }

  async validate(outputPath: string, plan: ConversionPlan): Promise<ArtifactValidation> {
    const checks: ArtifactValidation["checks"] = [];
    const exists = fs.existsSync(outputPath);
    checks.push({ name: "file-exists", passed: exists });
    if (!exists) return { valid: false, checks };
    const stat = fs.statSync(outputPath);
    checks.push({ name: "size-nonzero", passed: stat.size > 0, detail: `${stat.size} bytes` });

    try {
      const sharp = (await import("sharp")).default;
      const meta = await sharp(outputPath).metadata();
      checks.push({ name: "sharp-readable", passed: true, detail: `${meta.width}x${meta.height} ${meta.format}` });
      checks.push({ name: "dimensions-positive", passed: Boolean(meta.width && meta.height && meta.width > 0 && meta.height > 0) });
      checks.push({ name: "format-matches", passed: meta.format === plan.outputFormat, detail: String(meta.format) });
      const stats = await sharp(outputPath).stats();
      const variance = stats.channels.reduce((sum, channel) => sum + channel.stdev, 0);
      checks.push({ name: "not-blank", passed: variance > 1, detail: `variance=${variance.toFixed(2)}` });
    } catch (err) {
      checks.push({ name: "sharp-readable", passed: false, detail: String(err) });
    }

    return { valid: checks.every((check) => check.passed), checks };
  }
}

export const htmlRendererEngine = new HtmlRendererEngine();
