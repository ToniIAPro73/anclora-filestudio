"use client";

import { useState } from "react";
import { Bookmark, Download, Plus, Trash2, Upload, Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface ConversionPreset {
  id: string;
  name: string;
  category: "images" | "pdf" | "media" | "documents" | "structured" | "all";
  targetFormat: string;
  qualityProfile: "source-max" | "web-balanced" | "ultra-compressed" | "custom";
  description: string;
  isBuiltIn?: boolean;
}

export const BUILT_IN_PRESETS: ConversionPreset[] = [
  {
    id: "builtin-webp-opt",
    name: "WebP Web-Optimized",
    category: "images",
    targetFormat: "webp",
    qualityProfile: "web-balanced",
    description: "Equilibrio perfecto entre tamaño reducido y alta calidad de imagen.",
    isBuiltIn: true,
  },
  {
    id: "builtin-mp3-master",
    name: "Podcast Audio Master (MP3)",
    category: "media",
    targetFormat: "mp3",
    qualityProfile: "source-max",
    description: "Audio MP3 en bitrate 192kbps con voz clara para difusión web.",
    isBuiltIn: true,
  },
  {
    id: "builtin-pdf-compressed",
    name: "PDF Archivo Ligero",
    category: "pdf",
    targetFormat: "pdf",
    qualityProfile: "ultra-compressed",
    description: "Optimiza documentos PDF reduciendo el peso de fuentes e imágenes.",
    isBuiltIn: true,
  },
  {
    id: "builtin-webm-social",
    name: "Video WebM H.264/VP9",
    category: "media",
    targetFormat: "webm",
    qualityProfile: "web-balanced",
    description: "Formato de video abierto ultra eficiente para reproducción en navegador.",
    isBuiltIn: true,
  },
  {
    id: "builtin-json-structured",
    name: "Exportación Limpia JSON",
    category: "structured",
    targetFormat: "json",
    qualityProfile: "source-max",
    description: "Estructura normalizada y formateada sin caracteres redundantes.",
    isBuiltIn: true,
  },
];

const STORAGE_KEY = "anclora_conversion_presets_v1";

export function usePresets() {
  const [presets, setPresets] = useState<ConversionPreset[]>(() => {
    if (typeof window === "undefined") return BUILT_IN_PRESETS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ConversionPreset[] = JSON.parse(stored);
        return [...BUILT_IN_PRESETS, ...parsed.filter((p) => !p.isBuiltIn)];
      }
    } catch {
      // Fallback
    }
    return BUILT_IN_PRESETS;
  });
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const saveCustomPreset = (preset: Omit<ConversionPreset, "id" | "isBuiltIn">) => {
    const newPreset: ConversionPreset = {
      ...preset,
      id: `custom-${Date.now()}`,
      isBuiltIn: false,
    };

    const updated = [...presets, newPreset];
    setPresets(updated);

    try {
      const customOnly = updated.filter((p) => !p.isBuiltIn);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
      toast.success(`Preset "${newPreset.name}" guardado con éxito`);
    } catch {
      toast.error("Error al guardar preset en almacenamiento local");
    }

    return newPreset;
  };

  const deleteCustomPreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    try {
      const customOnly = updated.filter((p) => !p.isBuiltIn);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
      toast.info("Preset eliminado");
    } catch {
      // Ignore
    }
  };

  const exportPresetsJson = () => {
    const customOnly = presets.filter((p) => !p.isBuiltIn);
    const blob = new Blob([JSON.stringify(customOnly, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anclora-presets-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Presets exportados como JSON");
  };

  const importPresetsJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported: ConversionPreset[] = JSON.parse(e.target?.result as string);
        if (!Array.isArray(imported)) throw new Error("Formato inválido");
        const sanitized = imported.map((p) => ({
          ...p,
          id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          isBuiltIn: false,
        }));
        const combined = [...presets, ...sanitized];
        setPresets(combined);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(combined.filter((p) => !p.isBuiltIn)));
        toast.success(`${sanitized.length} presets importados correctamente`);
      } catch {
        toast.error("El archivo JSON de presets no es válido");
      }
    };
    reader.readAsText(file);
  };

  return {
    presets,
    activePresetId,
    setActivePresetId,
    saveCustomPreset,
    deleteCustomPreset,
    exportPresetsJson,
    importPresetsJson,
  };
}

interface PresetSelectorProps {
  category?: string;
  onSelectPreset: (preset: ConversionPreset) => void;
}

export function PresetSelector({ category, onSelectPreset }: PresetSelectorProps) {
  const { presets, activePresetId, setActivePresetId, saveCustomPreset, deleteCustomPreset, exportPresetsJson, importPresetsJson } =
    usePresets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetFormat, setNewPresetFormat] = useState("webp");
  const [newPresetDesc, setNewPresetDesc] = useState("");

  const filtered = category
    ? presets.filter((p) => p.category === category || p.category === "all" || p.isBuiltIn)
    : presets;

  const handleCreatePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const created = saveCustomPreset({
      name: newPresetName,
      category: (category as ConversionPreset["category"]) || "all",
      targetFormat: newPresetFormat.toLowerCase(),
      qualityProfile: "web-balanced",
      description: newPresetDesc || `Preset personalizado para ${newPresetFormat.toUpperCase()}`,
    });

    setNewPresetName("");
    setNewPresetDesc("");
    setDialogOpen(false);
    onSelectPreset(created);
    setActivePresetId(created.id);
  };

  return (
    <Card className="border border-teal-500/20 bg-[#12161f]/80 backdrop-blur-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
              Presets Rápidos de Conversión
            </h4>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={exportPresetsJson}
              className="h-7 text-[11px] px-2 text-stone-400 hover:text-white"
              title="Exportar Presets a JSON"
            >
              <Download className="h-3 w-3 mr-1" />
              JSON
            </Button>
            <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-[11px] font-medium h-7 px-2 text-stone-400 hover:text-white hover:bg-white/5 transition-colors">
              <Upload className="h-3 w-3 mr-1" />
              Importar
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && importPresetsJson(e.target.files[0])}
              />
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(true)}
              className="h-7 text-[11px] px-2.5 border-teal-500/30 text-teal-300 hover:bg-teal-500/10"
            >
              <Plus className="h-3 w-3 mr-1" />
              Nuevo
            </Button>
          </div>
        </div>

        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#1a1e25] border border-stone-800 text-white p-5 rounded-2xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-teal-400">
                  <Bookmark className="h-4 w-4" />
                  Guardar Nuevo Preset
                </h3>
                <button
                  onClick={() => setDialogOpen(false)}
                  className="text-stone-400 hover:text-white p-1 rounded hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePreset} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="preset-name" className="text-xs text-stone-300">
                    Nombre del Preset
                  </Label>
                  <Input
                    id="preset-name"
                    placeholder="Ej: WebP Compresión Extrema"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="bg-black/40 border-stone-700 text-white text-xs h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="preset-format" className="text-xs text-stone-300">
                    Formato Destino
                  </Label>
                  <Input
                    id="preset-format"
                    placeholder="webp, mp3, pdf, docx, json..."
                    value={newPresetFormat}
                    onChange={(e) => setNewPresetFormat(e.target.value)}
                    className="bg-black/40 border-stone-700 text-white text-xs h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="preset-desc" className="text-xs text-stone-300">
                    Descripción Opcional
                  </Label>
                  <Input
                    id="preset-desc"
                    placeholder="Breve nota de uso o calidad"
                    value={newPresetDesc}
                    onChange={(e) => setNewPresetDesc(e.target.value)}
                    className="bg-black/40 border-stone-700 text-white text-xs h-9"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-stone-400 text-xs h-8">
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-teal-600 hover:bg-teal-500 text-stone-950 font-semibold text-xs h-8">
                    Guardar Preset
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => {
                  setActivePresetId(preset.id);
                  onSelectPreset(preset);
                  toast.info(`Preset aplicado: ${preset.name}`);
                }}
                className={`group relative cursor-pointer rounded-lg border p-2.5 transition-all ${
                  isSelected
                    ? "border-teal-400 bg-teal-500/15 shadow-[0_0_12px_rgba(20,184,166,0.2)]"
                    : "border-white/10 bg-black/30 hover:border-teal-500/40 hover:bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-white truncate">{preset.name}</span>
                      <span className="shrink-0 rounded bg-teal-500/20 px-1.5 py-0.5 text-[10px] font-mono text-teal-300 uppercase">
                        {preset.targetFormat}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">{preset.description}</p>
                  </div>
                  {isSelected ? (
                    <Check className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                  ) : (
                    !preset.isBuiltIn && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomPreset(preset.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-red-400 transition-opacity p-0.5"
                        title="Eliminar preset"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
