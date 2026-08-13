import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

vi.mock("../../src/lib/jobs/job-manager", () => ({
  jobManager: {
    getJob: vi.fn(),
    updateJob: vi.fn(),
  },
}));

import { jobManager } from "../../src/lib/jobs/job-manager";
import { CONFIG } from "../../src/lib/config";
import { processMultistepJob, type MultistepRouteSpec } from "../../src/lib/jobs/multistep-processor";

const TEST_TIMEOUT = 240_000;
let tmpDir: string;
let inputPath: string;
let job: Record<string, unknown>;

function run(bin: string, args: string[], timeoutMs = TEST_TIMEOUT): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(bin, args, { shell: false, windowsHide: true });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: "spawn-error" });
    });
  });
}

const PRIMARY: MultistepRouteSpec = {
  destination: "txt",
  routeId: "docx>txt:doc:convert",
  routeScore: 0.686,
  qualityBand: "format-loss",
  routeReasons: ["ONLY_VIABLE_ROUTE"],
  steps: [
    { source: "docx", target: "txt", operationId: "doc:convert", engineId: "pandoc", lossProfile: "structural-risk" },
  ],
};

const FALLBACK: MultistepRouteSpec = {
  destination: "txt",
  routeId: "docx>pdf:office:to-pdf|pdf>txt:pdf:extract-text",
  routeScore: 0.56,
  qualityBand: "format-loss",
  routeReasons: [],
  steps: [
    { source: "docx", target: "pdf", operationId: "office:to-pdf", engineId: "libreoffice", lossProfile: "lossy-controlled" },
    { source: "pdf", target: "txt", operationId: "pdf:extract-text", engineId: "poppler", lossProfile: "structural-risk" },
  ],
};

async function createDocxFixture(): Promise<string> {
  const htmlPath = path.join(tmpDir, "controlled fallback source.md");
  const docxPath = path.join(tmpDir, "controlled fallback source.docx");
  fs.writeFileSync(htmlPath, "# Controlled fallback\n\nFallback route real output text.\n");
  const result = await run("pandoc", [htmlPath, "-o", docxPath]);
  expect(result.code, result.stderr || result.stdout).toBe(0);
  expect(fs.existsSync(docxPath), result.stderr || result.stdout).toBe(true);
  return docxPath;
}

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "controlled-fallback-real-"));
  (CONFIG.media as { tempDir: string }).tempDir = tmpDir;
  inputPath = await createDocxFixture();
}, TEST_TIMEOUT);

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe("controlled fallback real E2E", () => {
  it("REAL-FALLBACK-001 injects primary timeout and executes real fallback route", async () => {
    job = {
      id: "fallback-real-job",
      status: "queued",
      input_reference: path.relative(tmpDir, inputPath),
      input_kind: "universal-file",
      input_title: "controlled fallback source.docx",
      input_format: "docx",
      input_mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      operation: "multistep-convert",
      options_json: JSON.stringify({
        multistepRoute: PRIMARY,
        rankedRoutes: [PRIMARY, FALLBACK],
        executionTestOverrides: {
          failRoutes: {
            [PRIMARY.routeId!]: {
              code: "ENGINE_TIMEOUT",
              message: "Injected primary engine timeout",
              engineId: "pandoc",
            },
          },
        },
      }),
    };
    vi.mocked(jobManager.getJob).mockImplementation(() => job as never);
    vi.mocked(jobManager.updateJob).mockImplementation((_id: string, patch: Record<string, unknown>) => {
      Object.assign(job, patch);
    });

    await processMultistepJob("fallback-real-job");

    expect(job.status, JSON.stringify(job, null, 2)).toBe("completed");
    const outputPath = path.join(tmpDir, String(job.output_relative_path));
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.readFileSync(outputPath, "utf8")).toContain("Fallback route real output text");
    const execution = JSON.parse(String(job.toolchain_snapshot_json)).execution;
    expect(execution.fallbackUsed).toBe(true);
    expect(execution.attempts[0].failure.code).toBe("ENGINE_TIMEOUT");
    expect(execution.attempts[0].routeId).toBe(PRIMARY.routeId);
    expect(execution.attempts[1].routeId).toBe(FALLBACK.routeId);
    expect(execution.finalRouteId).toBe(FALLBACK.routeId);
  }, TEST_TIMEOUT);
});
