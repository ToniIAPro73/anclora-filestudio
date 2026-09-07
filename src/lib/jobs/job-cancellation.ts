// Shared in-memory cancellation registry for ALL job processors
// (universal-job-processor.ts, url-transcript-processor.ts, ...). Never
// persisted — the `jobs` DB table only tracks the "cancelled" status flip
// (see job-repository.ts); this module is what actually lets a DELETE
// /api/jobs/:id reach and SIGKILL the running child process (ffmpeg,
// yt-dlp, whisper-cli), regardless of which processor started it.
//
// One registry for every job kind — not one per processor — so job-route.ts
// only ever needs a single cancelJobProcess(jobId) call.

const activeAbortControllers = new Map<string, AbortController>();

export function registerAbortController(jobId: string, controller: AbortController): void {
  activeAbortControllers.set(jobId, controller);
}

export function clearAbortController(jobId: string): void {
  activeAbortControllers.delete(jobId);
}

/** Aborts the running process for a job, if any. Returns whether one was found. */
export function cancelJobProcess(jobId: string): boolean {
  const controller = activeAbortControllers.get(jobId);
  if (!controller) return false;
  controller.abort();
  return true;
}
