import fs from "fs";
import path from "path";
import { CONFIG } from "../config";

export function cleanupTempDir() {
  const tempDir = CONFIG.media.tempDir;
  if (!fs.existsSync(tempDir)) return;

  const now = Date.now();
  const ttlMs = CONFIG.media.limits.jobTtlMinutes * 60 * 1000;

  try {
    const items = fs.readdirSync(tempDir);
    for (const item of items) {
      const itemPath = path.join(tempDir, item);
      const stats = fs.statSync(itemPath);

      if (now - stats.mtimeMs > ttlMs) {
        if (stats.isDirectory()) {
          fs.rmSync(itemPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(itemPath);
        }
      }
    }
    console.log("Startup cleanup completed.");
  } catch (error) {
    console.error("Error during startup cleanup:", error);
  }
}
