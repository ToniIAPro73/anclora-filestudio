"use client";

import { useState } from "react";
import { Download, RotateCcw, History, Loader2, Eye, ArrowLeftRight } from "lucide-react";
import { CompareInspectorModal } from "@/components/inspector/compare-inspector-modal";
import { t } from "@/i18n";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface Props {
  jobId: string;
  fileName: string;
  format: string;
  mimeType: string;
  sizeBytes: number;
  downloadTokenHash: boolean;
  onReset: () => void;
  onViewHistory: () => void;
  onConvertAnother?: () => void;
  originalFileName?: string;
  originalSize?: number;
}

export function ArtifactResultCard({ jobId, fileName, format, sizeBytes, downloadTokenHash, onReset, onViewHistory, onConvertAnother, originalFileName, originalSize }: Props) {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const fetchUrl = async () => {
    if (downloadUrl) return downloadUrl;
    const res = await fetch(`/api/jobs/${jobId}/token`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al obtener token");
    setDownloadUrl(data.downloadUrl);
    return data.downloadUrl as string;
  };

  const handleDownload = async () => {
    if (fetching) return;
    setFetching(true);
    setError(null);
    try {
      const url = await fetchUrl();
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al descargar");
    } finally {
      setFetching(false);
    }
  };

  const handleOpenInspector = async () => {
    try {
      await fetchUrl();
      setInspectorOpen(true);
    } catch {
      setError("No se pudo cargar la vista previa para el inspector");
    }
  };

  return (
    <div className="ac-pattern-processing-result rounded-2xl border border-emerald-500/30 bg-[#1a1e25] p-5 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-400 motion-reduce:animate-none">
      <div className="ac-pattern-processing-result__header"><h2 className="text-xl font-black text-stone-100">Conversión completada</h2><p className="text-sm text-stone-400">El archivo está listo para la siguiente acción.</p></div>
      <div className="ac-pattern-processing-result__file flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-emerald-400" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="ac-pattern-processing-result__file-name text-sm font-semibold text-white">{fileName}</p>
          <p className="text-xs text-white/40 mt-0.5">
            {format.toUpperCase()} · {formatSize(sizeBytes)}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">{error}</p>
      )}

      <div className="ac-pattern-processing-result__body space-y-2">
        {downloadTokenHash ? (
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={fetching}
            className="ac-button ac-button--primary w-full"
          >
            {fetching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                Preparando descarga...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Descargar archivo
              </>
            )}
          </button>
        ) : (
          <p className="text-sm text-white/40 text-center">Archivo no disponible.</p>
        )}

        <div className="ac-pattern-processing-result__actions flex gap-2">
          {downloadTokenHash && downloadUrl && (
            <button
              type="button"
              onClick={() => void handleOpenInspector()}
              className="ac-button ac-button--secondary ac-button--compact flex-1"
            >
              <Eye className="h-3.5 w-3.5" />
              Inspeccionar
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="ac-button ac-button--ghost ac-button--compact flex-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("result.processAnother")}
          </button>
          {onConvertAnother && (
            <button
              type="button"
              onClick={onConvertAnother}
              className="ac-button ac-button--secondary ac-button--compact flex-1"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              {t("result.convertAnother")}
            </button>
          )}
          <button
            type="button"
            onClick={onViewHistory}
            className="ac-button ac-button--ghost ac-button--compact flex-1"
          >
            <History className="h-3.5 w-3.5" />
            Historial
          </button>
        </div>
      </div>

      {downloadUrl && (
        <CompareInspectorModal
          isOpen={inspectorOpen}
          onClose={() => setInspectorOpen(false)}
          originalFileName={originalFileName || "Archivo Origen"}
          originalSize={originalSize}
          convertedFileName={fileName}
          convertedSize={sizeBytes}
          convertedUrl={downloadUrl}
          format={format}
        />
      )}
    </div>
  );
}
