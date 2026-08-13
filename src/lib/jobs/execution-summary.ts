import type { JobRow } from "../infrastructure/db/job-repository";

export interface PublicExecutionSummary {
  selectedRouteId?: string;
  finalRouteId?: string;
  fallbackUsed: boolean;
  attemptCount?: number;
  durationMs?: number;
  finalStatus?: string;
}

export function publicExecutionSummary(job: Pick<JobRow, "toolchain_snapshot_json">): PublicExecutionSummary | null {
  if (!job.toolchain_snapshot_json) return null;
  try {
    const parsed = JSON.parse(job.toolchain_snapshot_json) as {
      execution?: {
        selectedRouteId?: string;
        finalRouteId?: string;
        fallbackUsed?: boolean;
        attemptCount?: number;
        durationMs?: number;
        finalStatus?: string;
      };
    };
    if (!parsed.execution) return null;
    return {
      selectedRouteId: parsed.execution.selectedRouteId,
      finalRouteId: parsed.execution.finalRouteId,
      fallbackUsed: parsed.execution.fallbackUsed === true,
      attemptCount: parsed.execution.attemptCount,
      durationMs: parsed.execution.durationMs,
      finalStatus: parsed.execution.finalStatus,
    };
  } catch {
    return null;
  }
}
