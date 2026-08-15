import fs from "node:fs";

export function removeWithRetry(target: string, attempts = 8): void {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (process.platform !== "win32" || !["EBUSY", "EPERM"].includes(code ?? "") || attempt === attempts - 1) {
        throw error;
      }
      // Exponential backoff: AV scanners and Sharp can hold the handle well
      // beyond a fixed 25ms on loaded Windows CI runners.
      const delayMs = Math.min(25 * 2 ** attempt, 400);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
    }
  }
}
