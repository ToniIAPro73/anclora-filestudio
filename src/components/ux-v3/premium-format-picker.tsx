"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Archive,
  BookOpen,
  Database,
  FileText,
  Film,
  ImageIcon,
  Music,
  Search,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UxConversionCategoryId, UxFormatSummary } from "@/lib/ux-v3/conversion-ux-model";
import { normalizeFormatId } from "@/lib/domain/format-catalog";

export type PremiumFormatPickerMode = "source" | "target";

export const FORMAT_PICKER_CATEGORY_ORDER: UxConversionCategoryId[] = [
  "documents",
  "images",
  "ebooks",
  "audio",
  "video",
  "data",
  "archives",
  "other",
];

const CATEGORY_META: Record<UxConversionCategoryId, { label: string; icon: LucideIcon }> = {
  documents: { label: "Documentos", icon: FileText },
  images: { label: "Imágenes", icon: ImageIcon },
  ebooks: { label: "Ebooks", icon: BookOpen },
  audio: { label: "Audio", icon: Music },
  video: { label: "Vídeo", icon: Film },
  data: { label: "Datos", icon: Database },
  archives: { label: "Archivos", icon: Archive },
  other: { label: "Otros", icon: Sparkles },
};

interface PremiumFormatPickerProps {
  formats: readonly UxFormatSummary[];
  allowedFormats: readonly UxFormatSummary[];
  selectedFormat: string;
  onSelect: (formatId: string) => void;
  mode: PremiumFormatPickerMode;
  label: string;
  placeholder: string;
  emptyMessage?: string;
  searchEnabled?: boolean;
  testId?: string;
}

interface FormatGroup {
  id: UxConversionCategoryId;
  label: string;
  icon: LucideIcon;
  formats: UxFormatSummary[];
}

export function PremiumFormatPicker({
  allowedFormats,
  selectedFormat,
  onSelect,
  mode,
  label,
  placeholder,
  emptyMessage,
  searchEnabled = true,
  testId,
}: PremiumFormatPickerProps) {
  const pickerId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<UxConversionCategoryId | null>(null);

  const groups = useMemo(() => groupAllowedFormats(allowedFormats), [allowedFormats]);
  const firstCategory = groups[0]?.id ?? null;
  const selected = allowedFormats.find((format) => format.id === selectedFormat) ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const effectiveActiveCategory = activeCategory && groups.some((group) => group.id === activeCategory)
    ? activeCategory
    : firstCategory;
  const searchGroups = useMemo(() => {
    if (!normalizedQuery) return [];
    return groups
      .map((group) => ({
        ...group,
        formats: group.formats.filter((format) => matchesFormat(format, normalizedQuery)),
      }))
      .filter((group) => group.formats.length > 0);
  }, [groups, normalizedQuery]);
  const activeGroup = groups.find((group) => group.id === effectiveActiveCategory) ?? null;
  const visibleGroups = normalizedQuery ? searchGroups : activeGroup ? [activeGroup] : [];
  const resultCount = normalizedQuery
    ? searchGroups.reduce((count, group) => count + group.formats.length, 0)
    : activeGroup?.formats.length ?? 0;
  const panelId = `${pickerId}-panel`;

  const openPicker = () => {
    if (groups.length === 0) return;
    setActiveCategory(firstCategory);
    setQuery("");
    setOpen(true);
  };

  const closePicker = () => {
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closePicker();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePicker();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <span className="mb-1 block text-xs font-semibold text-stone-400">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        data-testid={testId}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={groups.length === 0}
        onClick={() => open ? closePicker() : openPicker()}
        className="group flex min-h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-[#0a0d10] px-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,background,box-shadow] duration-150 hover:border-teal-200/35 hover:bg-[#0f1418] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70"
      >
        <span>
          <span className="block text-sm font-black text-stone-100">
            {selected ? selected.displayName : placeholder}
          </span>
          <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-normal text-stone-500">
            {selected ? selected.id : mode === "target" && groups.length === 0 ? emptyMessage ?? "Selecciona primero un formato de origen" : "Formato"}
          </span>
        </span>
        <Search className="h-4 w-4 text-stone-500 transition-colors duration-150 group-hover:text-teal-200" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={`${label}: selector de formato`}
          data-testid={`${testId}-panel`}
          className="absolute left-0 right-0 z-50 mt-2 max-h-[min(72vh,620px)] overflow-hidden rounded-2xl border border-white/12 bg-[#101419] shadow-[0_28px_90px_rgba(0,0,0,0.48),0_0_0_1px_rgba(45,212,191,0.06)] transition-opacity duration-150 md:min-w-[620px]"
        >
          <div className="border-b border-white/10 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-200/75" aria-hidden="true" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                disabled={!searchEnabled}
                placeholder="Buscar formato, extensión o alias..."
                className="min-h-11 w-full rounded-xl border border-white/10 bg-[#080b0e] px-3 pl-9 text-sm font-semibold text-stone-100 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-stone-600 focus-visible:border-teal-200/45 focus-visible:ring-2 focus-visible:ring-teal-300/45 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid max-h-[calc(min(72vh,620px)-116px)] grid-rows-[auto_1fr] md:grid-cols-[180px_1fr] md:grid-rows-1">
            <div className="border-b border-white/10 p-2 md:border-b-0 md:border-r">
              <div className="flex gap-1.5 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible md:pb-0">
                {groups.map((group) => {
                  const Icon = group.icon;
                  const selectedCategory = activeGroup?.id === group.id && !normalizedQuery;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      role="tab"
                      aria-selected={selectedCategory}
                      data-testid={`${testId}-category`}
                      data-category={group.id}
                      onClick={() => {
                        setActiveCategory(group.id);
                        setQuery("");
                      }}
                      className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-left text-xs font-bold transition-[border-color,background,color] duration-150 md:w-full md:justify-between ${
                        selectedCategory
                          ? "border-teal-200/30 bg-teal-300/10 text-teal-100"
                          : "border-transparent text-stone-400 hover:border-white/10 hover:bg-white/5 hover:text-stone-100"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {group.label}
                      </span>
                      <span className="rounded-md bg-white/6 px-1.5 py-0.5 text-[11px] text-stone-300">{group.formats.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-52 overflow-y-auto p-3">
              {visibleGroups.length > 0 ? (
                <div className="space-y-4">
                  {visibleGroups.map((group) => (
                    <section key={group.id} data-testid={`${testId}-format-group`} data-category={group.id}>
                      {normalizedQuery && <h3 className="mb-2 text-xs font-black uppercase text-stone-500">{group.label}</h3>}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {group.formats.map((format) => (
                          <button
                            key={format.id}
                            type="button"
                            data-testid={`${testId}-option`}
                            data-format={format.id}
                            data-category={format.category}
                            aria-label={`Seleccionar ${format.displayName}`}
                            aria-pressed={selectedFormat === format.id}
                            onClick={() => {
                              onSelect(format.id);
                              setOpen(false);
                              setQuery("");
                              triggerRef.current?.focus();
                            }}
                            className={`min-h-16 rounded-xl border p-3 text-left transition-[border-color,background,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 ${
                              selectedFormat === format.id
                                ? "border-teal-200/55 bg-teal-300/12"
                                : "border-white/10 bg-white/[0.035] hover:border-teal-200/30 hover:bg-white/[0.065]"
                            }`}
                          >
                            <span className="block font-mono text-sm font-black uppercase text-stone-100">{format.id}</span>
                            <span className="mt-1 block truncate text-xs font-medium text-stone-500">{format.displayName}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-4 text-center text-sm font-semibold text-stone-500">
                  {normalizedQuery ? "No encontramos ningún formato" : emptyMessage ?? "No hay formatos disponibles"}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-3 py-2 text-[11px] font-semibold text-stone-500">
            <span>{resultCount} formatos</span>
            <span>Esc para cerrar</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function groupAllowedFormats(formats: readonly UxFormatSummary[]): FormatGroup[] {
  return FORMAT_PICKER_CATEGORY_ORDER
    .map((category) => {
      const meta = CATEGORY_META[category];
      return {
        id: category,
        label: meta.label,
        icon: meta.icon,
        formats: formats.filter((format) => format.category === category),
      };
    })
    .filter((group) => group.formats.length > 0);
}

function matchesFormat(format: UxFormatSummary, query: string): boolean {
  const normalized = normalizeFormatId(query);
  return (
    format.id === normalized ||
    format.displayName.toLowerCase().includes(query) ||
    format.extension.toLowerCase().includes(query) ||
    format.aliases.some((alias) => alias.toLowerCase().includes(query) || normalizeFormatId(alias) === normalized)
  );
}
