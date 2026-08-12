"use client";

import { useState } from "react";
import JSZip from "jszip";
import { Download, Edit3, Trash2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface BatchJobItem {
  id: string;
  fileName: string;
  status: "queued" | "downloading" | "processing" | "completed" | "failed" | "cancelled";
  downloadUrl?: string;
  sizeBytes?: number;
  format?: string;
}

interface BatchActionToolbarProps {
  jobs: BatchJobItem[];
  onClearCompleted?: () => void;
  onApplyPrefixSuffix?: (prefix: string, suffix: string) => void;
}

export function BatchActionToolbar({ jobs, onClearCompleted, onApplyPrefixSuffix }: BatchActionToolbarProps) {
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("-convertido");
  const [isZipping, setIsZipping] = useState(false);
  const [showNamingOptions, setShowNamingOptions] = useState(false);

  const completedJobs = jobs.filter((j) => j.status === "completed" && j.downloadUrl);

  const handleDownloadAllZip = async () => {
    if (completedJobs.length === 0) {
      toast.error("No hay conversiones completadas para comprimir");
      return;
    }

    setIsZipping(true);
    toast.info(`Comprimiendo ${completedJobs.length} archivos en ZIP local...`);

    try {
      const zip = new JSZip();

      for (const job of completedJobs) {
        if (!job.downloadUrl) continue;
        try {
          const res = await fetch(job.downloadUrl);
          const blob = await res.blob();
          const ext = job.format ? `.${job.format}` : "";
          let finalName = job.fileName;
          if (ext && !finalName.endsWith(ext)) {
            finalName = `${finalName.replace(/\.[^/.]+$/, "")}${ext}`;
          }
          zip.file(finalName, blob);
        } catch {
          // Continue with next file
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Anclora_FileStudio_Lote_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("¡Paquete ZIP descargado con éxito!");
    } catch {
      toast.error("Error al generar el archivo ZIP de lote");
    } finally {
      setIsZipping(false);
    }
  };

  const handleApplyNaming = () => {
    if (onApplyPrefixSuffix) {
      onApplyPrefixSuffix(prefix, suffix);
      toast.success("Regla de renombrado en lote aplicada");
    }
    setShowNamingOptions(false);
  };

  if (jobs.length < 2) return null;

  const previewOriginal = jobs[0]?.fileName ?? "archivo.pdf";
  const previewResult = `${prefix}${previewOriginal.replace(/\.[^/.]+$/, "")}${suffix}${previewOriginal.match(/\.[^/.]+$/)?.[0] ?? ""}`;

  return (
    <details className="rounded-xl border border-white/10 bg-[#12161f] p-4 shadow-lg">
      <summary className="cursor-pointer list-none text-sm font-bold text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 [&::-webkit-details-marker]:hidden">
        Opciones de lote
      </summary>
      <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Archive className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">{jobs.length} archivos preparados</h4>
            <p className="text-[11px] text-stone-400">
              {completedJobs.length} de {jobs.length} conversiones completadas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={handleDownloadAllZip}
            disabled={isZipping || completedJobs.length === 0}
            className="h-8 text-xs bg-teal-600 hover:bg-teal-500 text-stone-950 font-bold gap-1.5 shadow-md"
          >
            <Download className="h-3.5 w-3.5" />
            {isZipping ? "Generando ZIP..." : "Descargar todo (.zip)"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNamingOptions(!showNamingOptions)}
            className="h-8 text-xs border-stone-700 text-stone-300 hover:bg-white/5 gap-1.5"
          >
            <Edit3 className="h-3.5 w-3.5 text-teal-400" />
            Cambiar nombres
          </Button>

          {onClearCompleted && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearCompleted}
              className="h-8 text-xs text-stone-400 hover:text-red-400 hover:bg-red-500/10 gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {showNamingOptions && (
        <div className="pt-2 border-t border-stone-800 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
          <div>
            <label className="text-[10px] text-stone-300">Añadir al principio</label>
            <Input
              placeholder="Ej: web-"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="h-8 text-xs bg-black/40 border-stone-800 text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-stone-300">Añadir al final</label>
            <Input
              placeholder="Ej: -convertido"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              className="h-8 text-xs bg-black/40 border-stone-800 text-white"
            />
          </div>
          <Button
            size="sm"
            onClick={handleApplyNaming}
            className="h-8 text-xs bg-stone-800 hover:bg-stone-700 text-teal-300 font-semibold"
          >
            Aplicar a {jobs.length} archivos
          </Button>
          <div className="rounded-md border border-white/10 bg-black/20 p-3 text-xs text-stone-300 sm:col-span-3">
            <p><span className="text-stone-500">Original:</span> {previewOriginal}</p>
            <p className="mt-1"><span className="text-stone-500">Resultado:</span> {previewResult}</p>
          </div>
        </div>
      )}
      </div>
    </details>
  );
}
