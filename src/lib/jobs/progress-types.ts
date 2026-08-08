// Unified progress types for the job processing pipeline.
// Used by both the legacy media processor and the universal processor.

export type JobProgressPhase =
  | "queued"
  | "acquiring"
  | "analyzing"
  | "converting"
  | "validating"
  | "packaging";

export type JobProgressEvent = {
  phase: JobProgressPhase;
  progress: number; // 0-100, -1 for indeterminate
  messageKey: string;
  details?: Record<string, string | number>;
};
