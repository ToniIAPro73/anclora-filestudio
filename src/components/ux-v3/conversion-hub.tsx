"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type {
  UxConversionCategoryId,
  UxConversionModel,
  UxFormatSummary,
} from "@/lib/ux-v3/conversion-ux-model";
import { normalizeFormatId } from "@/lib/domain/format-catalog";

interface ConversionHubProps {
  model: UxConversionModel;
  selectedTarget: string | null;
  initialCategoryId?: UxConversionCategoryId;
  onSelectTarget: (formatId: string) => void;
}

export function ConversionHub({ model, selectedTarget, initialCategoryId, onSelectTarget }: ConversionHubProps) {
  const [categoryId, setCategoryId] = useState<UxConversionCategoryId>(initialCategoryId ?? model.categories[0]?.id ?? "documents");
  const [query, setQuery] = useState("");

  const selectedCategory = model.categories.find((category) => category.id === categoryId) ?? model.categories[0] ?? null;
  const searchedDestinations = useMemo(() => {
    const formats = selectedCategory?.formats ?? [];
    const needle = query.trim().toLowerCase();
    const normalized = normalizeFormatId(query);
    if (!needle) return formats;
    return formats.filter((format) => (
      format.id === normalized ||
      format.displayName.toLowerCase().includes(needle) ||
      format.extension.includes(needle) ||
      format.aliases.some((alias) => alias.includes(needle) || normalizeFormatId(alias) === normalized)
    ));
  }, [query, selectedCategory]);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/10 bg-[#13161b]/82 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-stone-100">Convertir</h2>
            <p className="mt-1 text-sm text-stone-400">Explora conversiones por tipo de resultado.</p>
          </div>
          <label className="relative block sm:w-72">
            <span className="sr-only">Buscar formato</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar formato..."
              className="min-h-11 w-full rounded-md border border-white/10 bg-[#0b0d10] pl-9 pr-3 text-sm text-stone-100 outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1" role="tablist" aria-label="Categorías de destino">
            {model.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={category.id === categoryId}
                onClick={() => setCategoryId(category.id)}
                className={`rounded-md border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 ${
                  category.id === categoryId ? "border-teal-300/50 bg-teal-400/10" : "border-white/10 bg-white/3 hover:bg-white/6"
                }`}
              >
                <span className="block text-sm font-bold text-stone-100">{category.label}</span>
                <span className="mt-1 block text-xs text-stone-500">{category.formats.length} destinos</span>
              </button>
            ))}
          </div>

          <div aria-live="polite">
            {searchedDestinations.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-white/3 p-5 text-sm text-stone-400">
                Elige el formato que quieres obtener.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {searchedDestinations.map((format) => (
                  <DestinationCard
                    key={format.id}
                    format={format}
                    active={selectedTarget === format.id}
                    onClick={() => onSelectTarget(format.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function DestinationCard({ format, active, onClick }: { format: UxFormatSummary; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-28 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 ${
        active ? "border-teal-300/55 bg-teal-400/10" : "border-white/10 bg-white/3 hover:bg-white/6"
      }`}
    >
      <span className="block text-base font-black text-stone-100">Convertir a {format.displayName}</span>
      <span className="mt-2 block font-mono text-xs uppercase text-teal-200">.{format.extension}</span>
      <span className="mt-2 block text-xs text-stone-500">{format.sourcesCount} orígenes compatibles</span>
    </button>
  );
}
