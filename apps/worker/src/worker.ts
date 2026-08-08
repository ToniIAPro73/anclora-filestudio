// Anclora FileStudio — Service Worker
// Consumes conversion jobs from BullMQ queues and processes them.
import { Worker, type Job as BullJob } from "bullmq";
import { Redis } from "ioredis";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdtemp, rm } from "node:fs/promises";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { z } from "zod";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
import type { QueueJobPayload } from "@anclora/filestudio-core";
import { QUEUE_NAMES } from "@anclora/filestudio-core";

type WorkerExecutor = (input: WorkerConversionInput) => Promise<void>;
type WorkerExecutorRegistry = Map<string, WorkerExecutor>;

interface WorkerConversionInput {
  operation: string;
  inputPath: string;
  outputPath: string;
  options: Record<string, unknown>;
}

const IMAGE_FORMATS = new Set(["jpeg", "jpg", "png", "webp", "avif", "tiff"]);
const IMAGE_FITS = new Set(["cover", "contain", "fill", "inside", "outside"]);
let executorRegistryPromise: Promise<WorkerExecutorRegistry> | null = null;

// ── Config ────────────────────────────────────────────────────────────────────

const ConfigSchema = z.object({
  ANCLORA_WORKER_REDIS_URL: z.string().min(1),
  ANCLORA_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(4),
  ANCLORA_WORKER_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().min(5000).default(30_000),
});

function loadConfig() {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    console.error("[worker] Invalid configuration:", result.error.flatten());
    process.exit(1);
  }
  return result.data;
}

// ── Processor ─────────────────────────────────────────────────────────────────

async function processJob(job: BullJob<QueueJobPayload>): Promise<void> {
  const { jobId, operation, engineId, inputPath, outputPath, options, timeoutMs } = job.data;

  console.log(`[worker] Processing job=${jobId} op=${operation} engine=${engineId}`);

  await job.updateProgress(0);

  await runWithTimeout(
    async () => {
      await job.updateProgress(50);
      await executeWorkerConversion({ operation, inputPath, outputPath, options });
      await job.updateProgress(100);
    },
    timeoutMs
  );

  console.log(`[worker] Completed job=${jobId}`);
}

export async function executeWorkerConversion(input: WorkerConversionInput): Promise<void> {
  await mkdir(dirname(input.outputPath), { recursive: true });
  const registry = await getWorkerExecutors();
  const executor = registry.get(input.operation);
  if (executor) return executor(input);
  throw new Error(`OPERATION_UNAVAILABLE: ${input.operation}`);
}

async function getWorkerExecutors(): Promise<WorkerExecutorRegistry> {
  executorRegistryPromise ??= createWorkerExecutors();
  return executorRegistryPromise;
}

async function createWorkerExecutors(): Promise<WorkerExecutorRegistry> {
  const registry: WorkerExecutorRegistry = new Map([
    ["data.json-to-yaml", executeJsonToYaml],
    ["data.yaml-to-json", executeYamlToJson],
  ]);

  if (await hasSharp()) {
    registry.set("image:resize", executeImageResize);
    registry.set("image:convert", executeImageConvert);
  }
  if (await binaryAvailable("ebook-convert")) registry.set("convert-ebook", executeEbookConvert);
  if (await binaryAvailable("tesseract") && await binaryAvailable("pdftoppm")) {
    registry.set("pdf:ocr", executePdfOcr);
  }
  return registry;
}

async function executeJsonToYaml(input: WorkerConversionInput): Promise<void> {
  const parsed = JSON.parse(await readFile(input.inputPath, "utf8")) as unknown;
  await writeFile(input.outputPath, yamlStringify(parsed), { mode: 0o600 });
}

async function executeYamlToJson(input: WorkerConversionInput): Promise<void> {
  const parsed = yamlParse(await readFile(input.inputPath, "utf8")) as unknown;
  await writeFile(input.outputPath, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
}

async function executeImageResize(input: WorkerConversionInput): Promise<void> {
  const sharp = await import("sharp");
  const width = readIntegerOption(input.options.width, "width");
  const height = input.options.height === undefined ? undefined : readIntegerOption(input.options.height, "height");
  if (width < 1 || width > 16_384 || height !== undefined && (height < 1 || height > 16_384)) {
    throw new Error("VALIDATION_FAILED");
  }
  let pipeline = sharp.default(input.inputPath, { failOn: "error" }).resize({
    width,
    height,
    fit: readFitOption(input.options.fit),
  });
  pipeline = pipeline.toFormat(readImageFormat(input.options.outputFormat, "png"), {
    quality: readQualityOption(input.options.quality),
  });
  await pipeline.toFile(input.outputPath);
}

async function executeImageConvert(input: WorkerConversionInput): Promise<void> {
  const sharp = await import("sharp");
  let pipeline = sharp.default(input.inputPath, { failOn: "error" });
  pipeline = pipeline.toFormat(readImageFormat(input.options.outputFormat, "png"), {
    quality: readQualityOption(input.options.quality),
  });
  await pipeline.toFile(input.outputPath);
}

async function executeEbookConvert(input: WorkerConversionInput): Promise<void> {
  await execFileWithTimeout("ebook-convert", [input.inputPath, input.outputPath], readTimeout(input.options.timeoutMs));
}

async function executePdfOcr(input: WorkerConversionInput): Promise<void> {
  const maxPages = Math.min(readIntegerOption(input.options.maxPages ?? 50, "maxPages"), 50);
  const dir = await mkdtemp(join(tmpdir(), "filestudio-ocr-"));
  try {
    const prefix = join(dir, "page");
    await execFileWithTimeout("pdftoppm", ["-f", "1", "-l", String(maxPages), "-png", input.inputPath, prefix], readTimeout(input.options.timeoutMs));
    await execFileWithTimeout("tesseract", [`${prefix}-1.png`, input.outputPath.replace(/\.pdf$/i, ""), "pdf"], readTimeout(input.options.timeoutMs));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function hasSharp(): Promise<boolean> {
  try {
    await import("sharp");
    return true;
  } catch {
    return false;
  }
}

async function binaryAvailable(command: string): Promise<boolean> {
  try {
    await access(command);
    return true;
  } catch {
    return new Promise((resolve) => {
      execFile(command, ["--version"], { timeout: 2_000 }, (error) => resolve(!error));
    });
  }
}

function execFileWithTimeout(command: string, args: string[], timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`${command.toUpperCase().replace(/-/g, "_")}_FAILED: ${stderr || error.message}`));
        return;
      }
      resolve();
    });
  });
}

function readIntegerOption(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(`VALIDATION_FAILED:${name}`);
  return value;
}

function readQualityOption(value: unknown): number {
  if (value === undefined) return 85;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error("VALIDATION_FAILED:quality");
  }
  return value;
}

function readFitOption(value: unknown): "cover" | "contain" | "fill" | "inside" | "outside" {
  if (value === undefined) return "inside";
  if (typeof value !== "string" || !IMAGE_FITS.has(value)) throw new Error("VALIDATION_FAILED:fit");
  return value as "cover" | "contain" | "fill" | "inside" | "outside";
}

function readImageFormat(value: unknown, fallback: string): "jpeg" | "png" | "webp" | "avif" | "tiff" {
  const candidate = value === undefined ? fallback : value;
  if (typeof candidate !== "string") throw new Error("VALIDATION_FAILED:outputFormat");
  const normalized = candidate === "jpg" ? "jpeg" : candidate;
  if (!IMAGE_FORMATS.has(normalized)) throw new Error("VALIDATION_FAILED:outputFormat");
  return normalized as "jpeg" | "png" | "webp" | "avif" | "tiff";
}

function readTimeout(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 120_000;
}

async function runWithTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Job timed out after ${ms}ms`)), ms);
    fn()
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

// ── Heartbeat ─────────────────────────────────────────────────────────────────

function startHeartbeat(
  workerId: string,
  intervalMs: number,
  queueNames: string[]
): NodeJS.Timeout {
  return setInterval(async () => {
    // Emit to stdout so the orchestrator can pick it up; real implementation
    // writes to the worker_heartbeats PG table via a separate DB connection.
    console.log(JSON.stringify({
      type: "heartbeat",
      workerId,
      queueNames,
      ts: new Date().toISOString(),
    }));
  }, intervalMs);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function main() {
  const config = loadConfig();
  const workerId = `worker-${randomUUID()}`;

  console.log(`[worker] Starting workerId=${workerId}`);

  const connection = new Redis(config.ANCLORA_WORKER_REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  });

  const allQueues = Object.values(QUEUE_NAMES).filter((q) => q !== QUEUE_NAMES.MAINTENANCE);

  const workers = allQueues.map(
    (queueName) =>
      new Worker<QueueJobPayload>(queueName, processJob, {
        connection: connection as never,
        concurrency: config.ANCLORA_WORKER_CONCURRENCY,
        stalledInterval: 30_000,
        lockDuration: 60_000,
        lockRenewTime: 15_000,
      })
  );

  for (const w of workers) {
    w.on("error", (err) => console.error(`[worker] BullMQ error:`, err.message));
    w.on("failed", (job, err) =>
      console.error(`[worker] Job ${job?.data.jobId} failed:`, err.message)
    );
  }

  const heartbeatTimer = startHeartbeat(
    workerId,
    config.ANCLORA_WORKER_HEARTBEAT_INTERVAL_MS,
    allQueues
  );

  // Graceful shutdown
  async function shutdown(signal: string) {
    console.log(`[worker] Received ${signal}, draining...`);
    clearInterval(heartbeatTimer);
    await Promise.all(workers.map((w) => w.close()));
    await connection.quit();
    console.log(`[worker] Shutdown complete.`);
    process.exit(0);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  console.log(
    `[worker] Listening on ${allQueues.length} queues with concurrency=${config.ANCLORA_WORKER_CONCURRENCY}`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("[worker] Fatal:", err);
    process.exit(1);
  });
}
