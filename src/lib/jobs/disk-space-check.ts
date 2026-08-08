// Disk Space Checker — verifies free disk space before starting large conversions.
// Uses statfs (Linux/macOS) via the ProcessRunner to check available space.

import { ProcessRunner } from "../infrastructure/processes/process-runner";

export interface DiskSpaceResult {
  sufficient: boolean;
  freeBytes: number;
  requiredBytes: number;
  message: string;
}

/**
 * Check if the target directory has enough free disk space for a given requirement.
 * Uses `df` command via ProcessRunner (no shell: true).
 */
export async function checkDiskSpace(
  requiredBytes: number,
  targetDir: string
): Promise<DiskSpaceResult> {
  // Try statfs-style approach via `df` command
  try {
    const df = new ProcessRunner("df", 5_000);
    // -P = POSIX output format (one line per filesystem, no wrapping)
    // Output columns: Filesystem 1K-blocks Used Available Use% Mounted-on
    const result = await df.run({ args: ["-Pk", targetDir] });

    if (result.exitCode !== 0) {
      return {
        sufficient: true, // Assume sufficient if we can't check; don't block jobs
        freeBytes: -1,
        requiredBytes,
        message: "Could not check disk space; proceeding optimistically.",
      };
    }

    // Parse the last line of output (first line is header)
    const lines = result.stdout.trim().split("\n");
    const dataLine = lines[lines.length - 1];
    if (!dataLine) {
      return {
        sufficient: true,
        freeBytes: -1,
        requiredBytes,
        message: "Could not parse disk space output; proceeding optimistically.",
      };
    }

    const columns = dataLine.split(/\s+/);
    // Available is column index 3 (0-based), in 1K blocks
    const availableKb = parseInt(columns[3], 10);
    if (isNaN(availableKb)) {
      return {
        sufficient: true,
        freeBytes: -1,
        requiredBytes,
        message: "Could not parse available disk space; proceeding optimistically.",
      };
    }

    const freeBytes = availableKb * 1024;
    const sufficient = freeBytes >= requiredBytes;

    return {
      sufficient,
      freeBytes,
      requiredBytes,
      message: sufficient
        ? `Sufficient disk space: ${(freeBytes / 1024 / 1024).toFixed(1)} MB available, ${(requiredBytes / 1024 / 1024).toFixed(1)} MB required.`
        : `Insufficient disk space: ${(freeBytes / 1024 / 1024).toFixed(1)} MB available, but ${(requiredBytes / 1024 / 1024).toFixed(1)} MB required.`,
    };
  } catch (err) {
    // If we can't check, don't block the job
    return {
      sufficient: true,
      freeBytes: -1,
      requiredBytes,
      message: `Disk space check failed: ${err instanceof Error ? err.message : String(err)}; proceeding optimistically.`,
    };
  }
}
