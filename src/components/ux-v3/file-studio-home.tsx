"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, Wrench } from "lucide-react";
import type {
  UxConversionCategoryId,
  UxConversionModel,
  UxFormatSummary,
  UxRouteSummary,
} from "@/lib/ux-v3/conversion-ux-model";
import { normalizeFormatId } from "@/lib/domain/format-catalog";
import { PremiumFormatPicker } from "./premium-format-picker";

interface FileStudioHomeProps {
  model: UxConversionModel | null;
  onOpenConvert: (categoryId?: UxConversionCategoryId) => void;
  onSelectTarget?: (formatId: string, sourceFormatId?: string) => void;
  onOpenTool?: (toolId: string) => void;
  onOpenTools?: () => void;
}

const CATEGORY_ORDER: UxConversionCategoryId[] = [
  "documents",
  "images",
  "audio",
  "video",
  "ebooks",
  "archives",
  "data",
  "other",
];

const EMPTY_FORMATS: UxFormatSummary[] = [];
const EMPTY_ROUTES: UxRouteSummary[] = [];

export function FileStudioHome({ model, onOpenConvert, onSelectTarget, onOpenTool, onOpenTools }: FileStudioHomeProps) {
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");

  const formats = model?.formats ?? EMPTY_FORMATS;
  const routes = model?.routes ?? EMPTY_ROUTES;

  const sourceOptions = useMemo(() => {
    return formats.filter((format) => format.targetsCount > 0);
  }, [formats]);

  const targetRoutes = useMemo(() => source ? getVisibleTargetRoutes(source, routes) : EMPTY_ROUTES, [routes, source]);

  const targetOptions = useMemo(() => {
    if (!source) return EMPTY_FORMATS;
    const validTargets = new Set(targetRoutes.map((route) => route.target));
    return formats.filter((format) => validTargets.has(format.id));
  }, [formats, source, targetRoutes]);

  const quickRoute = useMemo(() => {
    if (!source || !target) return null;
    return targetRoutes.find((route) => route.source === source && route.target === target) ?? null;
  }, [source, target, targetRoutes]);

  const suggestedTargets = source
    ? targetRoutes
    : [];
  const suggestedSources = target && !source
    ? routes.filter((route) => route.target === target).slice(0, 8)
    : [];

  const continueDisabled = Boolean(source && target && !quickRoute) || (!source && !target);

  const handleContinue = () => {
    if (target) {
      onSelectTarget?.(target, source || undefined);
      return;
    }
    if (source) {
      onOpenConvert();
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/10 bg-[#13161b]/82 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:p-5">
        <h2 className="text-2xl font-black text-stone-100">¿Qué quieres convertir?</h2>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
          <FormatCombobox
            label="De"
            value={source}
            onChange={(value) => {
              setSource(value);
              if (!value || (target && !getVisibleTargetRoutes(value, routes).some((route) => route.target === target))) {
                setTarget("");
              }
            }}
            options={sourceOptions}
            placeholder="Seleccionar formato"
            mode="source"
            testId="home-source-select"
          />
          <div className="flex justify-center pb-3 text-stone-500">
            <ArrowRight className="hidden h-5 w-5 md:block" aria-hidden="true" />
            <ArrowDown className="h-5 w-5 md:hidden" aria-hidden="true" />
          </div>
          <FormatCombobox
            label="A"
            value={target}
            onChange={(value) => {
              setTarget(value);
              if (source && value && !routes.some((route) => route.source === source && route.target === value)) {
                setSource("");
              }
            }}
            options={targetOptions}
            placeholder="Seleccionar formato"
            mode="target"
            emptyMessage="Selecciona primero un formato de origen"
            testId="home-target-select"
          />
          <button
            type="button"
            onClick={handleContinue}
            disabled={continueDisabled}
            className="min-h-11 rounded-md bg-teal-300 px-5 text-sm font-black text-[#071112] transition-colors hover:bg-teal-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70"
          >
            Continuar
          </button>
        </div>

        <div className="mt-4 min-h-10" aria-live="polite">
          {quickRoute && <RouteNotice route={quickRoute} />}
          {source && !target && (
            <SuggestionRow
              title="Destinos disponibles"
              routes={suggestedTargets}
              direction="target"
              onPick={(format) => {
                setTarget(format);
              }}
              selectedFormat={target}
            />
          )}
          {target && !source && (
            <SuggestionRow
              title="Orígenes disponibles"
              routes={suggestedSources}
              direction="source"
              onPick={setSource}
            />
          )}
          {source && target && !quickRoute && (
            <div className="rounded-md border border-amber-300/20 bg-amber-300/8 p-3 text-sm font-semibold text-amber-100">
              Este par no está disponible con las capacidades actuales.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#13161b]/82 p-4 sm:p-5">
        <h2 className="text-xl font-black text-stone-100">Convertir</h2>
        <p className="mt-1 text-sm text-stone-400">Explora conversiones por tipo de resultado.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_ORDER.map((id) => model?.categories.find((category) => category.id === id))
            .filter(Boolean)
            .map((category) => (
              <button
                key={category!.id}
                type="button"
                onClick={() => onOpenConvert(category!.id)}
                className="min-h-24 rounded-lg border border-white/10 bg-white/3 p-4 text-left transition-colors hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60"
              >
                <span className="block text-base font-black text-stone-100">{category!.label}</span>
                <span className="mt-2 block text-xs text-stone-500">{category!.formats.length} destinos</span>
              </button>
            ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#13161b]/82 p-4 sm:p-5">
        <h2 className="text-xl font-black text-stone-100">Herramientas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(model?.tools ?? []).map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onOpenTool ? onOpenTool(tool.id) : onOpenTools?.()}
              className="min-h-24 rounded-lg border border-white/10 bg-white/3 p-4 text-left transition-colors hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60"
            >
              <Wrench className="mb-3 h-5 w-5 text-amber-200" aria-hidden="true" />
              <span className="block text-base font-black text-stone-100">{tool.label}</span>
              <span className="mt-1 block text-xs text-stone-500">{tool.operations.length} operaciones</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function getVisibleTargetRoutes(source: string, routes: readonly UxRouteSummary[]): UxRouteSummary[] {
  const canonicalSource = normalizeFormatId(source) ?? source;
  return routes.filter((route) => route.source === canonicalSource).slice(0, 8);
}

function FormatCombobox(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: UxFormatSummary[];
  placeholder: string;
  mode: "source" | "target";
  emptyMessage?: string;
  testId: string;
}) {
  return (
    <PremiumFormatPicker
      formats={props.options}
      allowedFormats={props.options}
      selectedFormat={props.value}
      onSelect={props.onChange}
      mode={props.mode}
      label={props.label}
      placeholder={props.placeholder}
      emptyMessage={props.emptyMessage}
      testId={props.testId}
    />
  );
}

function RouteNotice({ route }: { route: UxRouteSummary }) {
  const segments = [route.source, ...route.route.steps.map((step) => step.target)];
  const label = route.direct
    ? "Directa"
    : route.route.steps.length === 2
      ? "2 pasos"
      : "3 pasos · Conversión avanzada";

  return (
    <div className="rounded-md border border-white/10 bg-white/3 p-3 text-sm text-stone-300">
      <div className="flex flex-wrap items-center gap-1.5">
        {segments.map((segment, index) => (
          <span key={`${segment}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <ArrowRight className="h-3.5 w-3.5 text-stone-500" aria-hidden="true" />}
            <span className="font-mono text-xs font-bold uppercase text-stone-100">{segment}</span>
          </span>
        ))}
        <span className="ml-2 rounded bg-teal-300/15 px-1.5 py-0.5 text-[11px] font-bold text-teal-200">
          {label}
        </span>
      </div>
    </div>
  );
}

function SuggestionRow(props: {
  title: string;
  routes: UxRouteSummary[];
  direction: "source" | "target";
  onPick: (format: string) => void;
  selectedFormat?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" data-testid={`suggestion-row-${props.direction}`}>
      <p className="text-xs font-semibold text-stone-400">{props.title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {props.routes.map((route) => {
          const format = props.direction === "source" ? route.source : route.target;
          const selected = props.selectedFormat === format;
          return (
            <button
              key={`${route.source}-${route.target}`}
              type="button"
              onClick={() => props.onPick(format)}
              data-format={format}
              aria-pressed={selected}
              className={`min-h-9 rounded-lg border px-3 text-xs font-bold uppercase transition-[border-color,background,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 ${
                selected
                  ? "border-teal-200/45 bg-teal-300/12 text-teal-100"
                  : "border-white/10 bg-[#0b0d10] text-stone-100 hover:border-teal-200/30 hover:bg-white/6"
              }`}
            >
              {format}
            </button>
          );
        })}
      </div>
    </div>
  );
}
