// Integration test: real job pipeline for extract-frames — engine execution,
// job persistence, and the download route. Guards against the output_format
// staleness bug where the DB kept the pre-execution format (e.g. "jpg") even
// after an engine switched the actual artifact to a ZIP, causing the download
// route to serve the wrong Content-Type for a correctly-packaged ZIP file.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { CONFIG } from "../../src/lib/config";
import { getDb } from "../../src/lib/infrastructure/db/database";
import { processUniversalJob } from "../../src/lib/jobs/universal-job-processor";
import { jobManager } from "../../src/lib/jobs/job-manager";
import { ProcessRunner } from "../../src/lib/infrastructure/processes/process-runner";
import { GET as downloadGET } from "../../src/server/desktop-routes/download-route";

const testDir = path.join(CONFIG.media.tempDir, "tests", `extract-frames-pipeline-${crypto.randomUUID()}`);

beforeAll(() => {
  fs.mkdirSync(testDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

async function writeSyntheticVideo(filePath: string, durationSeconds: number): Promise<void> {
  const runner = new ProcessRunner("ffmpeg", 30_000);
  const result = await runner.run({
    args: [
      "-y", "-f", "lavfi", "-i", `testsrc=duration=${durationSeconds}:size=64x64:rate=10`,
      "-pix_fmt", "yuv420p", filePath,
    ],
    timeoutMs: 30_000,
  });
  if (result.exitCode !== 0) throw new Error(`ffmpeg synth video failed: ${result.stderr.slice(0, 300)}`);
}

// Mirrors createUniversalJob() in src/server/desktop-routes/jobs-route.ts exactly
// (same INSERT shape) — this is what the real POST /api/jobs handler produces.
function createRealUniversalJob(params: {
  inputReference: string;
  inputTitle: string;
  capabilityId: string;
  engineId: string;
}) {
  const db = getDb();
  const id = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO jobs (
      id, input_kind, input_reference, input_title,
      operation, output_format, quality, options_json,
      status, stage, progress,
      client_ip, expires_at,
      category, engine_id, conversion_id, input_mime_type, input_format
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', 'En cola', 0, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, "local-file", params.inputReference, params.inputTitle,
    "extract-frames", "jpg", "1", JSON.stringify({ quality: "1", durationSeconds: 2 }),
    "test-client", expiresAt,
    "video", params.engineId, params.capabilityId, "video/mp4", "mp4",
  );
  return id;
}

describe("extract-frames real job -> download route pipeline", () => {
  it("engine -> job result -> persistence -> download route all agree the output is a ZIP", async () => {
    const probe = await (await import("../../src/lib/engines/media/ffmpeg-engine")).ffmpegEngine.probe();
    if (!probe.available) {
      console.warn("SKIP: ffmpeg not available");
      return;
    }

    const relInputDir = path.relative(CONFIG.media.tempDir, testDir);
    const relInputPath = path.join(relInputDir, "video with spaces.mp4");
    await writeSyntheticVideo(path.join(CONFIG.media.tempDir, relInputPath), 2);

    const jobId = createRealUniversalJob({
      inputReference: relInputPath,
      inputTitle: "video with spaces.mp4",
      capabilityId: "ffmpeg-frames-pipeline-test",
      engineId: "ffmpeg-media",
    });

    await processUniversalJob(jobId);

    const job = jobManager.getJob(jobId);
    expect(job?.status).toBe("completed");
    expect(job?.output_file_name).toMatch(/\.zip$/);
    expect(job?.mime_type).toBe("application/zip");

    // Real download route, real token flow.
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    getDb().prepare("UPDATE jobs SET download_token_hash = ? WHERE id = ?").run(tokenHash, jobId);

    const req = new NextRequest(`http://localhost/api/download/${jobId}?token=${token}`);
    const res = await downloadGET(req, { params: Promise.resolve({ jobId }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    const disposition = res.headers.get("Content-Disposition") ?? "";
    expect(disposition).toMatch(/attachment; filename="[^"]+\.zip"/);

    // Read the actual bytes served and validate ZIP contents.
    const buf = Buffer.from(await res.arrayBuffer());
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buf);
    const entries = Object.keys(zip.files);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry).toMatch(/^frame-\d{4}\.jpg$/);
    }
  }, 60_000);
});
