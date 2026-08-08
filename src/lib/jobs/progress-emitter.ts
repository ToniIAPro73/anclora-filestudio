// Typed progress event emitter for the job processing pipeline.
// Used by both the legacy media processor and the universal processor.
// Supports AbortSignal for cancellation.

import type { JobProgressEvent } from "./progress-types";

type ProgressCallback = (event: JobProgressEvent) => void;

export class ProgressEmitter {
  private callbacks: Set<ProgressCallback> = new Set();
  private signal: AbortSignal | null;
  private aborted = false;
  private lastEvent: JobProgressEvent | null = null;

  constructor(signal?: AbortSignal) {
    this.signal = signal ?? null;
    if (this.signal) {
      this.signal.addEventListener("abort", this.handleAbort, { once: true });
    }
  }

  private handleAbort = (): void => {
    this.aborted = true;
    // Emit a final event indicating cancellation
    const cancelEvent: JobProgressEvent = {
      phase: "queued",
      progress: -1,
      messageKey: "cancelled",
      details: { reason: "abort_signal" },
    };
    for (const cb of this.callbacks) {
      try { cb(cancelEvent); } catch { /* swallow callback errors */ }
    }
    this.callbacks.clear();
  };

  /** Emit a progress event to all subscribers. No-op if aborted. */
  emitProgress(event: JobProgressEvent): void {
    if (this.aborted) return;
    this.lastEvent = event;
    for (const cb of this.callbacks) {
      try { cb(event); } catch { /* swallow callback errors */ }
    }
  }

  /** Subscribe to progress events. Returns an unsubscribe function. */
  onProgress(callback: ProgressCallback): () => void {
    if (this.aborted) return () => {};
    this.callbacks.add(callback);
    // Replay last event to new subscriber
    if (this.lastEvent) {
      try { callback(this.lastEvent); } catch { /* swallow callback errors */ }
    }
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /** Check if the emitter has been aborted. */
  get isAborted(): boolean {
    return this.aborted;
  }

  /** Get the last emitted event. */
  get last(): JobProgressEvent | null {
    return this.lastEvent;
  }

  /** Number of active subscribers. */
  get subscriberCount(): number {
    return this.callbacks.size;
  }

  /** Clean up — removes all subscribers and signal listener. */
  dispose(): void {
    this.callbacks.clear();
    if (this.signal) {
      this.signal.removeEventListener("abort", this.handleAbort);
    }
    this.aborted = true;
  }
}
