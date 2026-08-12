"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, Search } from "lucide-react";
import type {
  UxConversionCategoryId,
  UxConversionModel,
  UxFormatSummary,
  UxRouteSummary,
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
  const [quickSource, setQuickSource] = useState<string>("auto");
  const [quickTarget, setQuickTarget] = useState<string>(selectedTarget ?? "");

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

  const quickTargetOptions = useMemo(() => {
    if (quickSource === "auto") return model.formats.filter((format) => format.sourcesCount > 0);
    const targets = new Set(model.routes.filter((route) => route.source === quickSource).map((route) => route.target));
    return model.formats.filter((format) => targets.has(format.id));
  }, [model.formats, model.routes, quickSource]);

  const quickSourceOptions = useMemo(() => {
    if (!quickTarget) return model.formats.filter((format) => format.targetsCount > 0);
    const sources = new Set(model.routes.filter((route) => route.target === quickTarget).map((route) => route.source));
    return model.formats.filter((format) => sources.has(format.id));
  }, [model.formats, model.routes, quickTarget]);

  const quickRoute = useMemo(() => {
    if (!quickTarget || quickSource === "auto") return null;
    return model.routes.find((route) => route.source === quickSource && route.target === quickTarget) ?? null;
  }, [model.routes, quickSource, quickTarget]);

  const handleQuickTarget = (target: string) => {
    setQuickTarget(target);
    if (target) onSelectTarget(target);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/10 bg-[#13161b]/82 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-stone-100">Selecciona qué quieres obtener</h2>
            <p className="mt-1 text-sm text-stone-400">Los destinos salen de la matriz canónica disponible en {model.environment}.</p>
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

      <section className="rounded-lg border border-white/10 bg-[#13161b]/82 p-4">
        <h2 className="text-lg font-black text-stone-100">Conversor rápido</h2>
        <p className="mt-1 text-sm text-stone-400">Convertir origen a destino usando la misma matriz.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <FormatSelect
            label="Origen"
            value={quickSource}
            onChange={(value) => {
              setQuickSource(value || "auto");
              if (quickTarget && value !== "auto" && !model.routes.some((route) => route.source === value && route.target === quickTarget)) {
                setQuickTarget("");
              }
            }}
            options={quickSourceOptions}
            includeAuto
          />
          <div className="flex justify-center pb-1 text-stone-500">
            <ArrowRight className="hidden h-5 w-5 sm:block" aria-hidden="true" />
            <ArrowDown className="h-5 w-5 sm:hidden" aria-hidden="true" />
          </div>
          <FormatSelect
            label="Destino"
            value={quickTarget}
            onChange={handleQuickTarget}
            options={quickTargetOptions}
          />
        </div>
        {quickTarget && (
          <div className="mt-3 rounded-md border border-white/10 bg-white/3 p-3 text-sm text-stone-300" aria-live="polite">
            {quickSource === "auto"
              ? "Ahora selecciona el archivo de origen."
              : quickRoute
                ? <RouteInline route={quickRoute} />
                : "Este par no está disponible con las capacidades actuales."}
          </div>
        )}
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

function FormatSelect(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: UxFormatSummary[];
  includeAuto?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-stone-400">{props.label}</span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="min-h-11 w-full rounded-md border border-white/10 bg-[#0b0d10] px-3 text-sm font-semibold text-stone-100 outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60"
      >
        {props.includeAuto && <option value="auto">Detectar automáticamente</option>}
        {!props.includeAuto && <option value="">Selecciona destino</option>}
        {props.options.map((format) => (
          <option key={format.id} value={format.id}>{format.displayName}</option>
        ))}
      </select>
    </label>
  );
}

function RouteInline({ route }: { route: UxRouteSummary }) {
  const segments = [route.source, ...route.route.steps.map((step) => step.target)];
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {segments.map((segment, index) => (
        <span key={`${segment}-${index}`} className="flex items-center gap-1.5">
          {index > 0 && <ArrowRight className="h-3.5 w-3.5 text-stone-500" aria-hidden="true" />}
          <span className="font-mono text-xs font-bold uppercase text-stone-100">{segment}</span>
        </span>
      ))}
      <span className="ml-2 rounded bg-teal-300/15 px-1.5 py-0.5 text-[11px] font-bold text-teal-200">
        {route.direct ? "Directa" : "Varios pasos"}
      </span>
      {route.lossy && <span className="text-xs text-amber-200">Puede perder parte del formato</span>}
    </span>
  );
}
