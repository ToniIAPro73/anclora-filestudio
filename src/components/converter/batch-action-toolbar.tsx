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

  return (
    <div className="rounded-xl border border-teal-500/20 bg-[#12161f] p-4 space-y-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Archive className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Acciones de Lote ({jobs.length} Archivos)
            </h4>
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
            {isZipping ? "Generando ZIP..." : `Descargar Todo (ZIP)`}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNamingOptions(!showNamingOptions)}
            className="h-8 text-xs border-stone-700 text-stone-300 hover:bg-white/5 gap-1.5"
          >
            <Edit3 className="h-3.5 w-3.5 text-teal-400" />
            Renombrar
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
        <div className="pt-2 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <div>
            <label className="text-[10px] text-stone-400">Prefijo de salida</label>
            <Input
              placeholder="Ej: web-"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="h-8 text-xs bg-black/40 border-stone-800 text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-stone-400">Sufijo de salida</label>
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
            Aplicar Regla
          </Button>
        </div>
      )}
    </div>
  );
}
