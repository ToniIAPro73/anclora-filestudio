import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname } from "node:path";
import { stringify as yamlStringify, parse as yamlParse } from "yaml";
import type { AgentCapabilities, AgentConfig, AgentJob } from "./types.js";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"];
const IMAGE_FORMAT_BY_MIME: Record<string, ImageFormat> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/tiff": "tiff",
};
const IMAGE_MIME_BY_FORMAT: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  tiff: "image/tiff",
};
const IMAGE_EXTENSION_BY_FORMAT: Record<ImageFormat, string> = {
  jpeg: ".jpg",
  png: ".png",
  webp: ".webp",
  avif: ".avif",
  tiff: ".tiff",
};
const IMAGE_FITS = new Set(["cover", "contain", "fill", "inside", "outside"]);
type ImageFormat = "jpeg" | "png" | "webp" | "avif" | "tiff";
type ImageFit = "cover" | "contain" | "fill" | "inside" | "outside";

export interface LocalOperation {
  id: string;
  engineId: string;
  inputMimeTypes: string[];
  outputMimeType: string;
  execute(inputPath: string, outputPath: string, job: AgentJob, signal: AbortSignal): Promise<void>;
  probe(): Promise<{ available: boolean; version: string | null }>;
}

export interface ExecutionSummary {
  outputPath: string;
  outputSizeBytes: number;
  outputSha256: string;
  outputMimeType: string;
}

export class LocalOperationRegistry {
  constructor(private readonly operations = createDefaultOperations()) {}

  async capabilities(config: AgentConfig, deviceId: string, status: AgentCapabilities["status"]): Promise<AgentCapabilities> {
    const engineVersions: Record<string, string> = {};
    const available: string[] = [];
    for (const op of this.operations) {
      const probe = await op.probe();
      if (probe.available) {
        available.push(op.id);
        engineVersions[op.engineId] = probe.version ?? "available";
      }
    }
    return {
      deviceId,
      platform: config.platform,
      arch: config.arch,
      version: config.version,
      operations: available,
      engineVersions,
      limits: { maxFileSizeBytes: config.maxFileSizeBytes, maxConcurrent: config.maxConcurrent },
      load: 0,
      freeDiskBytes: 0,
      status,
      lastSeen: new Date().toISOString(),
    };
  }

  find(operationId: string): LocalOperation | null {
    return this.operations.find((op) => op.id === operationId) ?? null;
  }

  async execute(job: AgentJob, inputPath: string, outputPath: string, signal: AbortSignal): Promise<ExecutionSummary> {
    const operation = this.find(job.operation);
    if (!operation) throw new Error("OPERATION_UNAVAILABLE");
    if (!operation.inputMimeTypes.includes(job.inputMimeType)) {
      throw new Error("UPLOAD_MIME_REJECTED");
    }

    mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });
    await withTimeout(job.timeoutMs, signal, (childSignal) => operation.execute(inputPath, outputPath, job, childSignal));
    const bytes = readFileSync(outputPath);
    return {
      outputPath,
      outputSizeBytes: statSync(outputPath).size,
      outputSha256: createHash("sha256").update(bytes).digest("hex"),
      outputMimeType: job.outputMimeType ?? outputMimeTypeForJob(job, operation),
    };
  }
}

function createDefaultOperations(): LocalOperation[] {
  return [
    {
      id: "data.json-to-yaml",
      engineId: "data-ts",
      inputMimeTypes: ["application/json", "text/json"],
      outputMimeType: "application/yaml",
      async probe() {
        return { available: true, version: "yaml" };
      },
      async execute(inputPath, outputPath, _job, signal) {
        throwIfAborted(signal);
        const parsed = JSON.parse(readFileSync(inputPath, "utf8")) as unknown;
        writeFileSync(outputPath, yamlStringify(parsed), { mode: 0o600 });
      },
    },
    {
      id: "data.yaml-to-json",
      engineId: "data-ts",
      inputMimeTypes: ["application/yaml", "text/yaml", "application/x-yaml"],
      outputMimeType: "application/json",
      async probe() {
        return { available: true, version: "yaml" };
      },
      async execute(inputPath, outputPath, _job, signal) {
        throwIfAborted(signal);
        const parsed = yamlParse(readFileSync(inputPath, "utf8")) as unknown;
        writeFileSync(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
      },
    },
    {
      id: "image.png-to-webp",
      engineId: "sharp-image",
      inputMimeTypes: ["image/png"],
      outputMimeType: "image/webp",
      async probe() {
        try {
          const sharp = await import("sharp");
          return { available: true, version: sharp.default.versions.sharp ?? "sharp" };
        } catch {
          return { available: false, version: null };
        }
      },
      async execute(inputPath, outputPath, _job, signal) {
        throwIfAborted(signal);
        const sharp = await import("sharp");
        await sharp.default(inputPath, { failOn: "error" }).webp().toFile(outputPath);
      },
    },
    {
      id: "image:resize",
      engineId: "sharp-image",
      inputMimeTypes: IMAGE_MIME_TYPES,
      outputMimeType: "image/png",
      probe: probeSharp,
      async execute(inputPath, outputPath, job, signal) {
        throwIfAborted(signal);
        const sharp = await import("sharp");
        const options = parseImageResizeOptions(job);
        let pipeline = sharp.default(inputPath, { failOn: "error" }).resize({
          width: options.width,
          height: options.height,
          fit: options.fit,
        });
        pipeline = pipeline.toFormat(options.outputFormat, { quality: options.quality });
        throwIfAborted(signal);
        await pipeline.toFile(outputPath);
      },
    },
    {
      id: "image:convert",
      engineId: "sharp-image",
      inputMimeTypes: IMAGE_MIME_TYPES,
      outputMimeType: "image/png",
      probe: probeSharp,
      async execute(inputPath, outputPath, job, signal) {
        throwIfAborted(signal);
        const sharp = await import("sharp");
        const options = parseImageConvertOptions(job);
        let pipeline = sharp.default(inputPath, { failOn: "error" });
        pipeline = pipeline.toFormat(options.outputFormat, { quality: options.quality });
        throwIfAborted(signal);
        await pipeline.toFile(outputPath);
      },
    },
  ];
}

export function outputExtension(operationId: string): string {
  if (operationId === "image:resize" || operationId === "image:convert") return ".out";
  const ext = operationId.split("-to-")[1];
  return ext ? `.${ext}` : ".out";
}

export function validateSafeFilename(filename: string): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!sanitized || sanitized.includes("..") || sanitized !== filename.replace(/[\\/]/g, "_").replace(/[^a-zA-Z0-9._-]/g, "_")) {
    throw new Error("VALIDATION_FAILED");
  }
  return sanitized;
}

export function expectedOutputPath(workDir: string, job: AgentJob): string {
  const originalExt = extname(job.inputFilename);
  const base = validateSafeFilename(job.inputFilename).slice(0, originalExt ? -originalExt.length : undefined) || "output";
  const suffix = job.operation === "image:resize" ? "-resized" : job.operation === "image:convert" ? "-converted" : "";
  return `${workDir}/${base}${suffix}${outputExtensionForJob(job)}`;
}

function outputExtensionForJob(job: AgentJob): string {
  if (job.operation === "image:resize" || job.operation === "image:convert") {
    return IMAGE_EXTENSION_BY_FORMAT[imageOutputFormat(job)];
  }
  return outputExtension(job.operation);
}

function outputMimeTypeForJob(job: AgentJob, operation: LocalOperation): string {
  if (job.operation === "image:resize" || job.operation === "image:convert") {
    return IMAGE_MIME_BY_FORMAT[imageOutputFormat(job)];
  }
  return operation.outputMimeType;
}

async function probeSharp(): Promise<{ available: boolean; version: string | null }> {
  try {
    const sharp = await import("sharp");
    return { available: true, version: sharp.default.versions.sharp ?? "sharp" };
  } catch {
    return { available: false, version: null };
  }
}

function parseImageResizeOptions(job: AgentJob): {
  width: number;
  height?: number;
  fit: ImageFit;
  quality: number;
  outputFormat: ImageFormat;
} {
  const width = readIntegerOption(job.options.width, "width");
  const height = job.options.height === undefined ? undefined : readIntegerOption(job.options.height, "height");
  if (width < 1 || width > 16_384 || height !== undefined && (height < 1 || height > 16_384)) {
    throw new Error("VALIDATION_FAILED");
  }
  return {
    width,
    height,
    fit: readFitOption(job.options.fit),
    quality: readQualityOption(job.options.quality),
    outputFormat: imageOutputFormat(job),
  };
}

function parseImageConvertOptions(job: AgentJob): {
  quality: number;
  outputFormat: ImageFormat;
} {
  return {
    quality: readQualityOption(job.options.quality),
    outputFormat: readImageFormat(job.options.outputFormat),
  };
}

function imageOutputFormat(job: AgentJob): ImageFormat {
  if (job.options.outputFormat !== undefined) return readImageFormat(job.options.outputFormat);
  return IMAGE_FORMAT_BY_MIME[job.inputMimeType] ?? "png";
}

function readIntegerOption(value: unknown, name: string): number {
  if (!Number.isInteger(value)) throw new Error(`VALIDATION_FAILED:${name}`);
  return value as number;
}

function readQualityOption(value: unknown): number {
  if (value === undefined) return 85;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error("VALIDATION_FAILED:quality");
  }
  return value;
}

function readFitOption(value: unknown): ImageFit {
  if (value === undefined) return "inside";
  if (typeof value !== "string" || !IMAGE_FITS.has(value)) throw new Error("VALIDATION_FAILED:fit");
  return value as ImageFit;
}

function readImageFormat(value: unknown): ImageFormat {
  if (typeof value !== "string") throw new Error("VALIDATION_FAILED:outputFormat");
  if (value === "jpg") return "jpeg";
  if (!Object.hasOwn(IMAGE_MIME_BY_FORMAT, value)) throw new Error("VALIDATION_FAILED:outputFormat");
  return value as ImageFormat;
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new Error("JOB_CANCELLED");
}

async function withTimeout<T>(timeoutMs: number, parent: AbortSignal, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const onAbort = () => controller.abort(parent.reason);
  parent.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("JOB_TIMEOUT")), timeoutMs);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
    parent.removeEventListener("abort", onAbort);
  }
}
