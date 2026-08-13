import type { EngineId } from "../domain/engines";
import type {
  ConversionEnvironment,
  EngineRuntimeCapability,
  RuntimeAvailabilityState,
  RuntimeCapabilitySet,
} from "./types";

export interface CanonicalEngineDefinition {
  id: EngineId;
  label: string;
  platforms: ConversionEnvironment[];
  dependencies: string[];
  purpose: string;
}

export const CANONICAL_ENGINES: readonly CanonicalEngineDefinition[] = [
  { id: "libreoffice", label: "LibreOffice", platforms: ["windows", "linux"], dependencies: ["libreoffice"], purpose: "Office and ODF document conversion" },
  { id: "pandoc", label: "Pandoc", platforms: ["windows", "linux"], dependencies: ["pandoc"], purpose: "Plain-text and document conversion" },
  { id: "sharp-image", label: "Sharp", platforms: ["windows", "linux"], dependencies: ["sharp"], purpose: "Image conversion" },
  { id: "ffmpeg-media", label: "FFmpeg", platforms: ["windows", "linux"], dependencies: ["ffmpeg", "ffprobe"], purpose: "Audio and video conversion" },
  { id: "ffprobe", label: "FFprobe", platforms: ["windows", "linux"], dependencies: ["ffprobe"], purpose: "Media probing dependency" },
  { id: "qpdf", label: "QPDF", platforms: ["windows", "linux"], dependencies: ["qpdf"], purpose: "PDF structural tools" },
  { id: "poppler", label: "Poppler", platforms: ["windows", "linux"], dependencies: ["pdftoppm", "pdftotext", "pdftohtml"], purpose: "PDF rasterization and text/HTML extraction helper" },
  { id: "tesseract", label: "Tesseract", platforms: ["windows", "linux"], dependencies: ["tesseract"], purpose: "OCR" },
  { id: "calibre", label: "Calibre", platforms: ["windows", "linux"], dependencies: ["ebook-convert"], purpose: "Ebook conversion" },
  { id: "sevenzip", label: "7-Zip", platforms: ["windows", "linux"], dependencies: ["7z"], purpose: "Archive repacking" },
  { id: "browser", label: "Browser", platforms: ["web"], dependencies: [], purpose: "Browser-local conversions" },
  { id: "html-renderer", label: "HTML Renderer", platforms: ["windows", "linux"], dependencies: ["chromium", "playwright-core", "sharp"], purpose: "Safe static HTML and markup raster rendering" },
  { id: "data-ts", label: "Data Engine", platforms: ["windows", "linux", "web"], dependencies: ["yaml", "smol-toml", "fast-xml-parser", "csv-parse", "csv-stringify"], purpose: "Structured data conversion" },
  { id: "background-removal", label: "Background Removal", platforms: ["windows", "linux"], dependencies: ["sharp"], purpose: "Image background removal tool" },
] as const;

export function getCanonicalEngineDefinition(engineId: string): CanonicalEngineDefinition | null {
  return CANONICAL_ENGINES.find((engine) => engine.id === engineId) ?? null;
}

function stateForEngineId(engineId: string, availableIds: ReadonlySet<string>): RuntimeAvailabilityState {
  if (availableIds.has(engineId)) return "available";
  if (engineId === "poppler" && availableIds.has("pdftoppm")) return "available";
  if (engineId === "browser" && availableIds.has("browser")) return "available";
  if (engineId === "html-renderer" && availableIds.has("html-renderer")) return "available";
  if (engineId === "html-renderer" && availableIds.has("html-renderer-installable")) return "installable";
  return "unavailable";
}

export function runtimeCapabilitiesFromEngineIds(
  availableEngineIds: ReadonlySet<string>,
  environment: ConversionEnvironment = "linux"
): RuntimeCapabilitySet {
  const engines = new Map<string, EngineRuntimeCapability>();
  for (const engine of CANONICAL_ENGINES) {
    const platformCompatible = engine.platforms.includes(environment);
    const state = platformCompatible ? stateForEngineId(engine.id, availableEngineIds) : "unavailable";
    engines.set(engine.id, {
      engineId: engine.id,
      environment,
      state,
      version: null,
      capabilities: [...availableEngineIds].filter((id) =>
        id === engine.id ||
        engine.dependencies.includes(id) ||
        (engine.id === "tesseract" && id === "pdftoppm") ||
        (engine.id === "poppler" && id === "pdftoppm")
      ),
      health: state,
      reason: platformCompatible ? undefined : `Engine ${engine.id} is not compatible with ${environment}`,
    });
  }

  return { environment, engines };
}

export function getEngineRuntimeCapability(
  engineId: EngineId,
  runtime: RuntimeCapabilitySet
): EngineRuntimeCapability {
  return runtime.engines.get(engineId) ?? {
    engineId,
    environment: runtime.environment,
    state: "unknown",
    version: null,
    capabilities: [],
    health: "unknown",
    reason: `Engine ${engineId} is not registered in runtime capabilities`,
  };
}
