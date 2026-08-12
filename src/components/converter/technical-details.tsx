"use client";

// Technical details — collapsed <details> block with engine and privacy
// information for users who want it. Never expanded by default.

import type { CapabilityInfo } from "@/lib/domain/unified-analysis";
import { t } from "@/i18n";

/** Engine display names for technical details. */
export const ENGINE_DISPLAY_NAMES: Record<string, string> = {
  "ffmpeg-media": "FFmpeg",
  "sharp-image": "Sharp",
  "data-ts": "Data Engine",
  qpdf: "QPDF",
  sevenzip: "7-Zip",
  pandoc: "Pandoc",
  libreoffice: "LibreOffice",
  calibre: "Calibre",
  tesseract: "Tesseract",
  "background-removal": "Background Removal",
};

interface TechnicalDetailsProps {
  cap: CapabilityInfo;
}

export function TechnicalDetails({ cap }: TechnicalDetailsProps) {
  const engineName = ENGINE_DISPLAY_NAMES[cap.engineId] ?? cap.engineId;

  return (
    <details className="group rounded-xl border border-white/10 bg-[#1a1e25] px-4 py-2.5">
      <summary className="min-h-8 cursor-pointer list-none text-xs font-semibold text-stone-400 transition-colors hover:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 [&::-webkit-details-marker]:hidden">
        {t("route.technicalDetails")}
        <span className="ml-2 text-stone-600 group-open:hidden">+</span>
        <span className="ml-2 hidden text-stone-600 group-open:inline">−</span>
      </summary>
      <dl className="space-y-1.5 pb-2 pt-1.5 text-xs text-stone-400">
        <div className="flex justify-between gap-3">
          <dt className="text-stone-500">{t("route.engine")}</dt>
          <dd className="font-medium text-stone-300">{engineName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-stone-500">{t("destinations.title")}</dt>
          <dd className="font-mono uppercase text-stone-300">{cap.outputFormat}</dd>
        </div>
        {cap.route && cap.route.steps.length > 1 && (
          <div className="flex justify-between gap-3">
            <dt className="text-stone-500">{t("route.multistep")}</dt>
            <dd className="font-medium text-stone-300">
              {cap.route.steps
                .map((step) => `${step.source.toUpperCase()} → ${step.target.toUpperCase()}`)
                .join(" · ")}
            </dd>
          </div>
        )}
      </dl>
      <p className="border-t border-white/8 pb-1 pt-2 text-[11px] text-stone-500">
        {t("route.processingLocal")} {t("route.privacy")}
      </p>
    </details>
  );
}
