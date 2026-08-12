// Unit tests for the multistep job processor.
// Mocks engines/registry/input-store at the module boundary; verifies
// sequential step chaining, controlled failure, final naming and progress.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

// ── Module-boundary mocks ─────────────────────────────────────────────────────

vi.mock("../../src/lib/jobs/job-manager", () => ({
  jobManager: {
    getJob: vi.fn(),
    updateJob: vi.fn(),
  },
}));

vi.mock("../../src/lib/engines/registry", () => ({
  getEngine: vi.fn(),
  getCapabilities: vi.fn(),
}));

vi.mock("../../src/lib/detection/file-detector", () => ({
  buildDescriptor: vi.fn(async (filePath: string) => ({
    id: "mock-descriptor",
    originalName: path.basename(filePath),
  })),
}));

vi.mock("../../src/lib/config", () => ({
  CONFIG: {
    media: {
      tempDir: "",
      limits: { conversionTimeoutSeconds: 120 },
    },
  },
}));

vi.mock("../../src/lib/security/path-safety", () => ({
  ensurePathSafety: vi.fn(),
}));

vi.mock("../../src/lib/jobs/disk-space-check", () => ({
  checkDiskSpace: vi.fn(async () => ({ sufficient: true, message: "" })),
}));

vi.mock("../../src/lib/jobs/coordinated-cleanup", () => ({
  coordinatedCleanup: vi.fn(async () => {}),
}));

import { jobManager } from "../../src/lib/jobs/job-manager";
import { getEngine, getCapabilities } from "../../src/lib/engines/registry";
import { CONFIG } from "../../src/lib/config";
import {
  processMultistepJob,
  extractMultistepRoute,
  type MultistepRouteSpec,
} from "../../src/lib/jobs/multistep-processor";
import type { ConversionPlan, ExecutionResult } from "../../src/lib/domain/engines";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ROUTE: MultistepRouteSpec = {
  destination: "epub",
  steps: [
    { source: "md", target: "html", operationId: "doc:convert", engineId: "engine-a", lossProfile: "structural-risk" },
    { source: "html", target: "epub", operationId: "ebook:convert", engineId: "engine-b", lossProfile: "lossy" },
  ],
};

let tempDir: string;
let inputPath: string;
let job: Record<string, unknown>;
let updateCalls: Array<Record<string, unknown>>;

function makeEngine(engineId: string, executeImpl?: (plan: ConversionPlan) => Promise<ExecutionResult>) {
  return {
    id: engineId,
    probe: vi.fn(async () => ({
      available: true,
      version: "1.0",
      binaryPath: `/bin/${engineId}`,
      capabilities: [],
    })),
    execute: vi.fn(
      executeImpl ??
        (async (plan: ConversionPlan, onProgress?: (p: number, s: string) => void) => {
          onProgress?.(50, "half");
          fs.writeFileSync(plan.outputPath, `converted by ${engineId}`);
          return {
            success: true,
            outputPath: plan.outputPath,
            outputSizeBytes: 20,
            durationMs: 10,
            logs: [],
            warnings: [],
          } as ExecutionResult;
        }),
    ),
    validate: vi.fn(async () => ({ valid: true, checks: [{ name: "ok", passed: true }] })),
  };
}

let engineA: ReturnType<typeof makeEngine>;
let engineB: ReturnType<typeof makeEngine>;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "multistep-test-"));
  (CONFIG.media as { tempDir: string }).tempDir = tempDir;

  inputPath = path.join(tempDir, "uploads", "input-1", "documento.docx");
  fs.mkdirSync(path.dirname(inputPath), { recursive: true });
  fs.writeFileSync(inputPath, "fake input content");

  job = {
    id: "job-1",
    status: "queued",
    input_reference: path.relative(tempDir, inputPath),
    input_kind: "universal-file",
    input_title: "documento.docx",
    input_format: "md",
    input_mime_type: "text/markdown",
    operation: "multistep-convert",
    options_json: JSON.stringify({ multistepRoute: ROUTE }),
  };
  updateCalls = [];

  vi.mocked(jobManager.getJob).mockImplementation(() => job as never);
  vi.mocked(jobManager.updateJob).mockImplementation((_id: string, patch: Record<string, unknown>) => {
    updateCalls.push(patch);
    Object.assign(job, patch);
    return job as never;
  });

  engineA = makeEngine("engine-a");
  engineB = makeEngine("engine-b");
  vi.mocked(getEngine).mockImplementation((id: string) => {
    if (id === "engine-a") return engineA as never;
    if (id === "engine-b") return engineB as never;
    return null;
  });
  vi.mocked(getCapabilities).mockImplementation(async () => [
    {
      id: "engine-a-cap",
      operation: "convert",
      outputFormat: "html",
      engineId: "engine-a",
      state: "available",
    },
    {
      id: "engine-b-cap",
      operation: "convert",
      outputFormat: "epub",
      engineId: "engine-b",
      state: "available",
    },
  ] as never);
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("processMultistepJob", () => {
  it("executes steps sequentially, chaining each step's output as the next input", async () => {
    await processMultistepJob("job-1");

    expect(engineA.execute).toHaveBeenCalledTimes(1);
    expect(engineB.execute).toHaveBeenCalledTimes(1);

    const planA = vi.mocked(engineA.execute).mock.calls[0][0];
    const planB = vi.mocked(engineB.execute).mock.calls[0][0];

    expect(planA.inputPath).toBe(inputPath);
    expect(planA.outputPath).toBe(path.join(tempDir, "job-1", "step-1.html"));
    expect(planB.inputPath).toBe(path.join(tempDir, "job-1", "step-1.html"));
    expect(planB.outputPath).toBe(path.join(tempDir, "job-1", "output.epub"));
    expect(job.status).toBe("completed");
    expect(job.progress).toBe(100);
  });

  it("an intermediate failure stops the chain and fails the job with a controlled error", async () => {
    engineA.execute = vi.fn(async () => ({
      success: false,
      error: "boom",
      outputSizeBytes: 0,
      durationMs: 1,
      logs: ["some log"],
      warnings: [],
    })) as never;

    await processMultistepJob("job-1");

    expect(engineB.execute).not.toHaveBeenCalled();
    expect(job.status).toBe("failed");
    expect(job.error_code).toBe("ENGINE_EXECUTE_FAILED");
    expect(String(job.stage)).toContain("Error en paso 1 de 2");
    expect(String(job.stage)).toContain("md → html");
  });

  it("names the final artifact with the destination extension only (AC-FN-009)", async () => {
    await processMultistepJob("job-1");

    expect(job.output_file_name).toBe("documento.epub");
    expect(String(job.output_file_name)).not.toContain("docx.html");
    expect(String(job.output_relative_path)).toBe(path.join("job-1", "output.epub"));
  });

  it("reports per-step progress stages with format names", async () => {
    await processMultistepJob("job-1");

    const stages = updateCalls.map((c) => c.stage).filter(Boolean);
    expect(stages).toContain("Paso 1 de 2 · MD → HTML");
    expect(stages).toContain("Paso 2 de 2 · HTML → EPUB");
    // Progress stays inside the 5–90 execution band until completion
    const progressValues = updateCalls
      .map((c) => c.progress)
      .filter((p): p is number => typeof p === "number" && p < 100);
    for (const p of progressValues) {
      expect(p).toBeGreaterThanOrEqual(5);
      expect(p).toBeLessThanOrEqual(95);
    }
  });

  it("fails with a controlled error when the route spec is missing", async () => {
    job.options_json = null;

    await processMultistepJob("job-1");

    expect(job.status).toBe("failed");
    expect(job.error_code).toBe("MISSING_CONVERSION_ID");
    expect(engineA.execute).not.toHaveBeenCalled();
  });
});

describe("extractMultistepRoute", () => {
  it("round-trips a route spec stored in options_json", () => {
    const parsed = extractMultistepRoute(JSON.stringify({ multistepRoute: ROUTE }));
    expect(parsed).toEqual(ROUTE);
  });

  it("returns null for missing or malformed specs", () => {
    expect(extractMultistepRoute(null)).toBeNull();
    expect(extractMultistepRoute("not json")).toBeNull();
    expect(extractMultistepRoute("{}")).toBeNull();
    expect(extractMultistepRoute(JSON.stringify({ multistepRoute: { destination: "epub", steps: [] } }))).toBeNull();
    expect(
      extractMultistepRoute(
        JSON.stringify({ multistepRoute: { destination: "epub", steps: [{ source: "md" }] } }),
      ),
    ).toBeNull();
  });
});
