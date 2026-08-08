// Coordinated Cleanup — single function that:
// 1. Finds expired jobs in DB and deletes their artifacts from filesystem
// 2. Marks those jobs as expired in DB
// 3. Finds orphaned temp files not referenced by any active job
// 4. Deletes orphaned files older than the TTL
// 5. Returns metrics
//
// Idempotent: safe to run multiple times.
// No concurrent cleanup: uses a simple lock flag.

import fs from "fs";
import path from "path";
import { getDb } from "../infrastructure/db/database";
import { CONFIG } from "../config";
import type { JobRow } from "../infrastructure/db/job-repository";

// ── Lock ───────────────────────────────────────────────────────────────────────

let cleanupRunning = false;

// ── Log redaction ──────────────────────────────────────────────────────────────

function redact(filePath: string): string {
  const parts = filePath.split("/");
  return parts.length > 3 ? `/.../${parts.slice(-2).join("/")}` : filePath;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CleanupMetrics {
  jobsExpired: number;
  artifactsDeleted: number;
  orphanedFilesDeleted: number;
  failures: number;
}

// ── Main function ──────────────────────────────────────────────────────────────

export async function coordinatedCleanup(): Promise<CleanupMetrics> {
  // Prevent concurrent cleanup
  if (cleanupRunning) {
    console.log("[coordinated-cleanup] Already running, skipping.");
    return { jobsExpired: 0, artifactsDeleted: 0, orphanedFilesDeleted: 0, failures: 0 };
  }
  cleanupRunning = true;

  const metrics: CleanupMetrics = {
    jobsExpired: 0,
    artifactsDeleted: 0,
    orphanedFilesDeleted: 0,
    failures: 0,
  };

  try {
    const tempDir = CONFIG.media.tempDir;
    const db = getDb();

    // ── Phase 1: Expire completed jobs past their TTL ────────────────────────
    const expiredJobs = db.prepare(`
      SELECT id, output_relative_path, category
      FROM jobs
      WHERE status = 'completed' AND expires_at < datetime('now')
    `).all() as Array<Pick<JobRow, "id" | "output_relative_path" | "category">>;

    for (const job of expiredJobs) {
      try {
        // Delete artifact from filesystem
        if (job.output_relative_path) {
          const artifactPath = path.resolve(tempDir, job.output_relative_path);
          // Verify it's inside the temp dir (security)
          const normalizedTemp = path.resolve(tempDir);
          if (artifactPath.startsWith(normalizedTemp + path.sep) || artifactPath.startsWith(normalizedTemp + "/")) {
            if (fs.existsSync(artifactPath)) {
              fs.unlinkSync(artifactPath);
              metrics.artifactsDeleted++;
              console.log(`[coordinated-cleanup] Deleted artifact: ${redact(artifactPath)}`);
            }
          }
        }

        // Delete the job directory (jobId-based directory)
        const jobDir = path.join(tempDir, job.id);
        if (fs.existsSync(jobDir)) {
          fs.rmSync(jobDir, { recursive: true, force: true });
          console.log(`[coordinated-cleanup] Deleted job dir: ${redact(jobDir)}`);
        }

        // Mark job as expired in DB
        db.prepare(`
          UPDATE jobs SET status = 'expired', updated_at = datetime('now') WHERE id = ?
        `).run(job.id);
        metrics.jobsExpired++;
      } catch (err) {
        metrics.failures++;
        console.error(`[coordinated-cleanup] Failed to cleanup job ${job.id}:`, err);
      }
    }

    // ── Phase 2: Clean orphaned temp files ───────────────────────────────────
    // Find files in temp dir that are not referenced by any active job.
    // Active = not expired and not in a terminal state that was already cleaned.
    const activeOutputPaths = new Set(
      (db.prepare(`
        SELECT DISTINCT output_relative_path
        FROM jobs
        WHERE status IN ('queued', 'downloading', 'processing', 'verifying', 'completed')
          AND output_relative_path IS NOT NULL
      `).all() as Array<{ output_relative_path: string }>).map((r) =>
        path.resolve(tempDir, r.output_relative_path)
      )
    );

    // Also collect active job directories
    const activeJobDirs = new Set(
      (db.prepare(`
        SELECT DISTINCT id
        FROM jobs
        WHERE status IN ('queued', 'downloading', 'processing', 'verifying', 'completed')
      `).all() as Array<{ id: string }>).map((r) => path.join(tempDir, r.id))
    );

    const ttlMs = CONFIG.media.limits.jobTtlMinutes * 60 * 1000;
    const now = Date.now();

    if (fs.existsSync(tempDir)) {
      const items = fs.readdirSync(tempDir);
      for (const item of items) {
        const itemPath = path.join(tempDir, item);
        try {
          const stats = fs.statSync(itemPath);

          // Only consider items older than TTL
          if (now - stats.mtimeMs <= ttlMs) continue;

          // Skip if it's an active output path or active job directory
          if (activeOutputPaths.has(itemPath)) continue;
          if (activeJobDirs.has(itemPath)) continue;

          // Skip the uploads directory — it's managed separately
          if (item === "uploads") continue;

          if (stats.isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
            metrics.orphanedFilesDeleted++;
            console.log(`[coordinated-cleanup] Deleted orphaned dir: ${redact(itemPath)}`);
          } else {
            // Only delete if not an active output
            if (!activeOutputPaths.has(itemPath)) {
              fs.unlinkSync(itemPath);
              metrics.orphanedFilesDeleted++;
              console.log(`[coordinated-cleanup] Deleted orphaned file: ${redact(itemPath)}`);
            }
          }
        } catch (err) {
          metrics.failures++;
          console.error(`[coordinated-cleanup] Failed to cleanup orphaned item ${redact(itemPath)}:`, err);
        }
      }
    }

    console.log(
      `[coordinated-cleanup] Done: ${metrics.jobsExpired} jobs expired, ` +
      `${metrics.artifactsDeleted} artifacts deleted, ` +
      `${metrics.orphanedFilesDeleted} orphaned files deleted, ` +
      `${metrics.failures} failures`
    );

    return metrics;
  } finally {
    cleanupRunning = false;
  }
}
