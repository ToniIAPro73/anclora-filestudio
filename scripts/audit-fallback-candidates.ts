import fs from "fs";
import path from "path";
import { buildConversionGraph, findConversionRoutes, rankRoutes } from "../src/lib/conversion-routing";
import { FORMAT_CATALOG, normalizeFormatId } from "../src/lib/domain/format-catalog";
import { selectFallbackRoute } from "../src/lib/jobs/fallback-policy";
import { serializeExecutionError } from "../src/lib/jobs/execution-observability";

const OUT_DIR = path.resolve("artifacts/execution-observability");
const DESKTOP_ENGINES = new Set([
  "libreoffice",
  "pandoc",
  "sharp-image",
  "sharp",
  "ffmpeg-media",
  "ffmpeg",
  "ffprobe",
  "qpdf",
  "poppler",
  "tesseract",
  "pdftoppm",
  "pdftotext",
  "pdftohtml",
  "calibre",
  "ebook-convert",
  "sevenzip",
  "7z",
  "data-ts",
  "background-removal",
  "html-renderer",
  "chromium",
  "playwright-core",
]);

const formats = [...new Set(FORMAT_CATALOG.map((format) => normalizeFormatId(format.outputExtension) ?? format.outputExtension))].sort();
const graph = buildConversionGraph(DESKTOP_ENGINES, { environment: "linux" });

const rows = [];
for (const source of formats) {
  for (const target of formats) {
    if (source === target) continue;
    const ranked = rankRoutes(findConversionRoutes(graph, source, target)).filter((route) => !route.rejected);
    if (ranked.length < 2) continue;
    const primary = ranked[0]!;
    const failure = serializeExecutionError({
      code: "ENGINE_TIMEOUT",
      message: "audit timeout",
      engineId: primary.steps[0]?.engineId,
    });
    const decision = selectFallbackRoute({
      rankedRoutes: ranked.map((route) => ({
        routeId: route.routeId,
        routeScore: route.score,
        qualityBand: route.quality.score >= 0.78 ? "good" : "format-loss",
        steps: route.steps.map((step) => ({ engineId: step.engineId })),
      })),
      failedRoute: {
        routeId: primary.routeId,
        routeScore: primary.score,
        qualityBand: primary.quality.score >= 0.78 ? "good" : "format-loss",
        steps: primary.steps.map((step) => ({ engineId: step.engineId })),
      },
      failedAttemptIndex: 1,
      failure,
      attemptedRouteIds: new Set([primary.routeId]),
    });
    rows.push({
      conversion: `${source}->${target}`,
      rankedRoutes: ranked.length,
      primaryRouteId: primary.routeId,
      primaryScore: primary.score,
      primaryEngines: [...new Set(primary.steps.map((step) => step.engineId))],
      fallbackPossible: decision.allowed,
      fallbackRouteId: decision.route?.routeId ?? null,
      classification: decision.allowed ? "FALLBACK POSSIBLE" : decision.rejectedReason === "NO_SAFE_FALLBACK_ROUTE" ? "NO SAFE FALLBACK" : "SAME FAILURE DOMAIN",
      rejectedReason: decision.rejectedReason ?? null,
    });
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "fallback-candidate-audit.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  environment: "linux",
  pairsWithMultipleRankedRoutes: rows.length,
  fallbackPossible: rows.filter((row) => row.fallbackPossible).length,
  noSafeFallback: rows.filter((row) => !row.fallbackPossible).length,
  rows,
}, null, 2));

console.log(JSON.stringify({
  pairsWithMultipleRankedRoutes: rows.length,
  fallbackPossible: rows.filter((row) => row.fallbackPossible).length,
  noSafeFallback: rows.filter((row) => !row.fallbackPossible).length,
}, null, 2));
