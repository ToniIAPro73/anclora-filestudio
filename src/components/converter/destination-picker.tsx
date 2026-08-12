"use client";

// Destination picker — destination-first format selection.
// Renders conversion destinations as an accessible radiogroup: no engine
// names, no scores; badges derived from the route summary only.

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Search } from "lucide-react";
import type { CapabilityInfo } from "@/lib/domain/unified-analysis";
import { FORMAT_BY_EXTENSION } from "@/lib/domain/format-catalog";
import { t, type MessageKey } from "@/i18n";

const COLLAPSED_COUNT = 5;
const SEARCH_THRESHOLD = 12;

interface DestinationPickerProps {
  capabilities: CapabilityInfo[];
  recommended: CapabilityInfo | null;
  onSelect: (cap: CapabilityInfo) => void;
  selectedKey: string | null;
}

interface Badge {
  key: MessageKey;
  cls: string;
}

function badgesFor(cap: CapabilityInfo, isRecommended: boolean): Badge[] {
  const badges: Badge[] = [];
  const recommended = cap.route?.recommended ?? isRecommended;
  const hasLoss =
    cap.route?.classification === "lossy" ||
    cap.route?.qualityBand === "format-loss" ||
    cap.route?.qualityBand === "not-recommended";

  if (recommended) {
    badges.push({
      key: "destinations.badge.recommended",
      cls: "bg-teal-300 text-[#071112]",
    });
  }
  if (hasLoss) {
    badges.push({
      key: "destinations.badge.lossy",
      cls: "bg-amber-400/12 text-amber-200 ring-1 ring-amber-300/18",
    });
  }
  if (cap.route?.classification === "direct") {
    badges.push({
      key: "destinations.badge.direct",
      cls: "bg-emerald-400/12 text-emerald-200 ring-1 ring-emerald-300/18",
    });
  } else if (cap.route?.classification === "multistep") {
    badges.push({
      key: "destinations.badge.multistep",
      cls: "bg-sky-400/12 text-sky-200 ring-1 ring-sky-300/18",
    });
  }
  return badges.slice(0, 2);
}

function utilityPhrase(cap: CapabilityInfo): string {
  const category = FORMAT_BY_EXTENSION.get(cap.outputFormat)?.category;
  if (category) {
    const key = `analysis.category.${category}` as MessageKey;
    const label = t(key);
    if (label !== key) return label;
  }
  return cap.outputFormat.toUpperCase();
}

export function DestinationPicker({ capabilities, recommended, onSelect, selectedKey }: DestinationPickerProps) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  const available = useMemo(
    () => capabilities.filter((cap) => cap.state === "available"),
    [capabilities]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (cap) =>
        cap.outputFormat.toLowerCase().includes(q) ||
        cap.outputLabel.toLowerCase().includes(q)
    );
  }, [available, query]);

  const recommendedCaps = filtered.filter((cap) => cap.route?.recommended === true);
  const restCaps = filtered.filter((cap) => cap.route?.recommended !== true);
  const hasRecommendedSection = recommendedCaps.length > 0;

  const visibleRecommended = recommendedCaps.slice(0, 6);
  const visibleRest = showAll ? restCaps : restCaps.slice(0, COLLAPSED_COUNT);
  const hiddenCount = restCaps.length - visibleRest.length;

  // Flat list of rendered cards, for roving-tabindex keyboard navigation
  const renderedCaps = [...visibleRecommended, ...visibleRest];

  const focusCard = (index: number) => {
    const clamped = Math.max(0, Math.min(index, renderedCaps.length - 1));
    cardRefs.current[clamped]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number, cap: CapabilityInfo) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      focusCard(index + 1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      focusCard(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusCard(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusCard(renderedCaps.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(cap);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-stone-200">{t("destinations.title")}</h2>

      {available.length > SEARCH_THRESHOLD && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("destinations.search")}
            aria-label={t("destinations.search")}
            className="min-h-11 w-full rounded-md border border-white/10 bg-white/4 pl-9 pr-3 text-sm text-stone-200 placeholder:text-stone-500 focus:border-teal-300/40 focus:outline-none focus:ring-2 focus:ring-teal-300/40"
          />
        </div>
      )}

      {available.length === 0 && (
        <div
          aria-live="polite"
          className="flex gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/8 p-4 text-sm text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("destinations.empty")}</span>
        </div>
      )}

      <div role="radiogroup" aria-label={t("destinations.title")} className="space-y-4">
        {hasRecommendedSection && (
          <section aria-label={t("destinations.recommended")} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-300/80">
              {t("destinations.recommended")}
            </h3>
            {visibleRecommended.map((cap, index) => (
              <DestinationCard
                key={cap.id}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                cap={cap}
                isSelected={selectedKey === cap.id}
                isRecommended={recommended?.id === cap.id}
                tabIndex={index === 0 ? 0 : -1}
                onSelect={() => onSelect(cap)}
                onKeyDown={(event) => handleKeyDown(event, index, cap)}
              />
            ))}
          </section>
        )}

        {restCaps.length > 0 && (
          <section
            aria-label={hasRecommendedSection ? t("destinations.all") : undefined}
            className="space-y-2"
          >
            {hasRecommendedSection && (
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {t("destinations.all")}
              </h3>
            )}
            {visibleRest.map((cap, restIndex) => {
              const index = visibleRecommended.length + restIndex;
              return (
                <DestinationCard
                  key={cap.id}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  cap={cap}
                  isSelected={selectedKey === cap.id}
                  isRecommended={recommended?.id === cap.id}
                  tabIndex={index === 0 ? 0 : -1}
                  onSelect={() => onSelect(cap)}
                  onKeyDown={(event) => handleKeyDown(event, index, cap)}
                />
              );
            })}
            {restCaps.length > COLLAPSED_COUNT && (
              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
                className="mx-auto flex min-h-11 items-center gap-1.5 text-xs font-semibold text-stone-500 transition-colors hover:text-stone-200"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
                {showAll
                  ? t("destinations.showLess")
                  : t("destinations.showMore", { count: hiddenCount })}
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

interface DestinationCardProps {
  cap: CapabilityInfo;
  isSelected: boolean;
  isRecommended: boolean;
  tabIndex: number;
  onSelect: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  ref: (node: HTMLDivElement | null) => void;
}

export function DestinationCard({
  cap,
  isSelected,
  isRecommended,
  tabIndex,
  onSelect,
  onKeyDown,
  ref,
}: DestinationCardProps) {
  const badges = badgesFor(cap, isRecommended);

  return (
    <div
      ref={ref}
      role="radio"
      aria-checked={isSelected}
      tabIndex={tabIndex}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={`min-h-11 w-full cursor-pointer rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70 motion-reduce:transition-none sm:p-4 ${
        isSelected
          ? "border-teal-300/55 bg-[#1a1e25] shadow-[0_18px_50px_rgba(20,184,166,0.10)]"
          : "border-white/10 bg-[#1a1e25] hover:border-teal-200/28 hover:bg-[#1f242c]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-stone-100">{cap.outputLabel}</span>
            <span className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-[10px] uppercase text-stone-400">
              {cap.outputFormat}
            </span>
            {badges.map((badge) => (
              <span
                key={badge.key}
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${badge.cls}`}
              >
                {t(badge.key)}
              </span>
            ))}
          </div>
          <p className="mt-0.5 text-xs text-stone-500">{utilityPhrase(cap)}</p>
        </div>
        {isSelected && <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-200" />}
      </div>
    </div>
  );
}
