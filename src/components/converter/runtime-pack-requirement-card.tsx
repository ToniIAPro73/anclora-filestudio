"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Loader2, XCircle } from "lucide-react";

type RuntimePackInstallStatus =
  | "idle"
  | "downloading"
  | "verifying"
  | "installing"
  | "completed"
  | "failed"
  | "cancelled";

interface RuntimePackStatus {
  id: string;
  productName: string;
  description: string;
  state: "NOT_REQUIRED" | "NOT_INSTALLED" | "DOWNLOADING" | "VERIFYING" | "INSTALLING" | "AVAILABLE" | "UPDATE_AVAILABLE" | "BROKEN" | "INCOMPATIBLE";
  definition: {
    compressedSize: number | null;
    installedSize: number | null;
  };
  install: {
    status: RuntimePackInstallStatus;
    progress: {
      percent: number | null;
    } | null;
    error: string | null;
    errorCode: string | null;
  };
}

export function formatApproxBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "tamaño no disponible";
  const mb = bytes / 1_000_000;
  return `~${Math.round(mb)} MB`;
}

function progressLabel(status: RuntimePackInstallStatus, percent: number | null | undefined): string {
  if (status === "downloading") {
    return percent === null || percent === undefined ? "Descargando..." : `Descargando... ${Math.round(percent)}%`;
  }
  if (status === "verifying") return "Verificando...";
  if (status === "installing") return "Instalando...";
  if (status === "completed") return "Componente instalado.";
  if (status === "cancelled") return "Instalación cancelada.";
  return "";
}

function isRunning(status: RuntimePackInstallStatus): boolean {
  return status === "downloading" || status === "verifying" || status === "installing";
}

export function RuntimePackRequirementCard({
  packIds,
  onInstalled,
  onCancel,
}: {
  packIds: string[];
  onInstalled: () => void;
  onCancel: () => void;
}) {
  const packId = packIds[0];
  const [status, setStatus] = useState<RuntimePackStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const installStatus = status?.install.status ?? "idle";
  const running = isRunning(installStatus);

  const loadStatus = useCallback(async () => {
    if (!packId) return;
    const response = await fetch(`/api/runtime-packs/${packId}`);
    if (!response.ok) throw new Error("No se pudo consultar el componente.");
    const data = await response.json() as RuntimePackStatus;
    setStatus(data);
    if (data.state === "AVAILABLE" || data.state === "UPDATE_AVAILABLE" || data.install.status === "completed") {
      onInstalled();
    }
  }, [onInstalled, packId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStatus().catch(() => setLocalError("No se pudo consultar el componente."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadStatus]);

  useEffect(() => {
    if (!running) return undefined;
    const interval = setInterval(() => {
      void loadStatus().catch(() => setLocalError("No se pudo consultar el progreso."));
    }, 1000);
    return () => clearInterval(interval);
  }, [loadStatus, running]);

  const handleInstall = async () => {
    if (!packId) return;
    setLoading(true);
    setLocalError(null);
    try {
      const response = await fetch(`/api/runtime-packs/${packId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true }),
      });
      if (!response.ok) throw new Error("No se pudo iniciar la instalación.");
      setStatus(await response.json() as RuntimePackStatus);
    } catch {
      setLocalError("No se pudo iniciar la instalación.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!packId || !running) {
      onCancel();
      return;
    }
    try {
      const response = await fetch(`/api/runtime-packs/${packId}`, { method: "DELETE" });
      if (response.ok) setStatus(await response.json() as RuntimePackStatus);
    } catch {
      setLocalError("No se pudo cancelar la instalación.");
    }
  };

  const productName = status?.productName ?? "Componente de renderizado web";
  const description = status?.description ?? "Esta conversión necesita el componente de renderizado web.";
  const downloadSize = useMemo(() => formatApproxBytes(status?.definition.compressedSize), [status]);
  const error = localError ?? status?.install.error ?? null;
  const isBroken = status?.state === "BROKEN";
  const actionLabel = error || isBroken ? "Reintentar" : "Instalar";
  const phase = progressLabel(installStatus, status?.install.progress?.percent);

  return (
    <div role="status" aria-live="polite" className="rounded-lg border border-amber-300/25 bg-amber-300/8 p-4 text-sm text-amber-50">
      <div className="flex items-start gap-3">
        {error ? (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-200" aria-hidden="true" />
        ) : installStatus === "completed" ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" aria-hidden="true" />
        ) : running ? (
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-teal-200" aria-hidden="true" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black text-stone-50">Se necesita un componente adicional</h3>
          <p className="mt-1 text-stone-200">{description}</p>
          <dl className="mt-3 grid gap-2 text-xs text-stone-300 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-stone-100">Componente</dt>
              <dd>{productName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-100">Descarga</dt>
              <dd>{downloadSize}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs font-semibold text-stone-300">Solo se instala una vez.</p>
          {isBroken && !error && (
            <p className="mt-2 text-xs font-semibold text-amber-100">El componente instalado debe reinstalarse.</p>
          )}
          {phase && <p className="mt-3 text-sm font-bold text-teal-100">{phase}</p>}
          {running && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div
                className="h-full rounded-full bg-teal-300 transition-all"
                style={{ width: `${Math.max(4, Math.min(100, status?.install.progress?.percent ?? 10))}%` }}
              />
            </div>
          )}
          {error && <p className="mt-3 text-sm font-bold text-red-100">{error}</p>}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleInstall()}
              disabled={loading || running}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-300 px-4 text-sm font-black text-[#071112] disabled:opacity-45"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {loading || running ? "Instalando..." : actionLabel}
            </button>
            <button
              type="button"
              onClick={() => void handleCancel()}
              className="min-h-10 rounded-md border border-white/12 px-4 text-sm font-bold text-stone-100 hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
