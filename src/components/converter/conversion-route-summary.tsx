"use client";

// Conversion route summary — shows the selected destination's route
// (DOCX → HTML → EPUB), classification, quality band and the local-processing
// note before the user starts the conversion.

import { ArrowRight, ShieldCheck } from "lucide-react";
import type { CapabilityInfo } from "@/lib/domain/unified-analysis";
import { t, type MessageKey } from "@/i18n";

const CLASSIFICATION_KEYS: Record<string, MessageKey> = {
  direct: "route.direct",
  multistep: "route.multistep",
  lossy: "route.lossy",
};

const QUALITY_BAND_KEYS: Record<string, MessageKey> = {
  excellent: "route.quality.excellent",
  good: "route.quality.good",
  "format-loss": "route.quality.formatLoss",
  "not-recommended": "route.quality.notRecommended",
};

interface ConversionRouteSummaryProps {
  cap: CapabilityInfo;
  inputName?: string | null;
  inputFormat?: string | null;
}

export function ConversionRouteSummary({ cap, inputName, inputFormat }: ConversionRouteSummaryProps) {
  const route = cap.route;

  const segments: string[] = route
    ? [route.steps[0]?.source ?? inputFormat ?? "?", ...route.steps.map((step) => step.target)]
    : [inputFormat ?? "?", cap.outputFormat];

  const classificationKey = route ? CLASSIFICATION_KEYS[route.classification] : undefined;
  const bandKey = route ? QUALITY_BAND_KEYS[route.qualityBand] : undefined;
  const notRecommended = route?.qualityBand === "not-recommended";

  return (
    <div
      className={`space-y-2.5 rounded-xl border p-4 ${
        notRecommended
          ? "border-amber-400/25 bg-amber-400/6"
          : "border-white/10 bg-[#1a1e25]"
      }`}
    >
      {inputName && (
        <p className="truncate text-xs text-stone-500">
          {inputName}
          {inputFormat ? ` · ${inputFormat.toUpperCase()}` : ""}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5" aria-label="Ruta de conversión">
        {segments.map((segment, index) => (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && <ArrowRight className="h-3.5 w-3.5 text-stone-500" aria-hidden="true" />}
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                index === segments.length - 1
                  ? "bg-teal-300/15 text-teal-200"
                  : "bg-white/6 text-stone-300"
              }`}
            >
              {segment.toUpperCase()}
            </span>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {classificationKey && (
          <span className="font-semibold text-stone-200">{t(classificationKey)}</span>
        )}
        {bandKey && (
          <span
            className={
              notRecommended
                ? "font-semibold text-amber-200"
                : "text-stone-400"
            }
          >
            {t(bandKey)}
          </span>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-emerald-200/80">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t("route.local")}
      </p>
    </div>
  );
}
