"use client";

import { Loader2, X, CheckCircle2, AlertTriangle } from "lucide-react";

interface JobProgressCardProps {
  jobId: string;
  status: string;
  stage: string;
  progress: number;
  error?: string;
  onCancel?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  queued: "En cola",
  downloading: "Descargando",
  processing: "Procesando",
  verifying: "Verificando",
  completed: "Completado",
  failed: "Error",
  cancelled: "Cancelado",
  interrupted: "Interrumpido",
};

export function JobProgressCard({ status, stage, progress, error, onCancel }: JobProgressCardProps) {
  const isActive = ["queued", "downloading", "processing", "verifying"].includes(status);
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const hasMeasuredProgress = isActive && Number.isFinite(progress) && progress > 0;

  return (
    <div className="ac-processing-state rounded-2xl border border-white/10 bg-[#1a1e25] p-5 space-y-4" role="status" aria-live="polite">
      <div className="ac-processing-state__header flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isActive && <Loader2 className="h-4 w-4 text-cyan-400 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />}
          {isFailed && <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />}
          <div>
            <p className="ac-processing-state__title text-sm font-semibold text-white">{STATUS_LABELS[status] ?? status}</p>
            <p className="ac-processing-state__summary text-xs text-white/40">{stage}</p>
          </div>
        </div>
        {isActive && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancelar conversión"
            className="rounded-lg px-3 py-1.5 min-h-[44px] text-xs text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-colors flex items-center gap-1 motion-reduce:transition-none"
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>
        )}
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="ac-progress" data-indeterminate={!hasMeasuredProgress} role="progressbar" {...(hasMeasuredProgress ? { "aria-valuenow": Math.round(progress) } : {})} aria-valuemin={0} aria-valuemax={100} aria-label={hasMeasuredProgress ? `Progreso: ${Math.round(progress)}%` : "Procesando"}>
          <div className="ac-progress__label flex justify-between text-[11px] text-white/30 mb-1.5">
            <span>Progreso</span>
            <span>{hasMeasuredProgress ? `${Math.round(progress)}%` : "En curso"}</span>
          </div>
          <div className="ac-progress__track h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="ac-progress__bar h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500 motion-reduce:transition-none" style={hasMeasuredProgress ? { width: `${Math.min(100, Math.max(0, progress))}%` } : undefined} />
          </div>
        </div>
      )}

      {/* Error */}
      {isFailed && error && (
        <div
          role="alert"
          aria-live="assertive"
          className="ac-alert"
          data-tone="danger"
        >
          <div className="ac-alert__content"><p className="ac-alert__summary">{error}</p></div>
        </div>
      )}
    </div>
  );
}
