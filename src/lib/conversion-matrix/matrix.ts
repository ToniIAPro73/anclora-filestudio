import { normalizeFormatId } from "../domain/format-catalog";
import { getEngineRuntimeCapability, runtimeCapabilitiesFromEngineIds } from "./engines";
import type { EdgeQualityInput } from "../conversion-routing/quality";
import type {
  CanonicalConversionEdge,
  ConversionEnvironment,
  DirectConversionResult,
  EffectiveAvailability,
  EffectiveAvailabilityState,
  RuntimeCapabilitySet,
} from "./types";

type EdgeInput = Omit<CanonicalConversionEdge, "id" | "source" | "target" | "declared" | "implemented" | "enabled" | "supportsOCR" | "mode" | "priority" | "dependencies" | "environments" | "costModel" | "outputCardinality" | "supportsAsIntermediate"> & {
  source: string;
  target: string;
  declared?: boolean;
  implemented?: boolean;
  enabled?: boolean;
  supportsOCR?: boolean;
  mode?: CanonicalConversionEdge["mode"];
  priority?: number;
  dependencies?: string[];
  environments?: ConversionEnvironment[];
  costModel?: CanonicalConversionEdge["costModel"];
  outputCardinality?: CanonicalConversionEdge["outputCardinality"];
  supportsAsIntermediate?: boolean;
};

const DESKTOP: ConversionEnvironment[] = ["windows", "linux"];
const ALL: ConversionEnvironment[] = ["windows", "linux", "web"];

/**
 * Per-pair quality refinements over the group-level annotation of cross().
 * Merged shallowly, with `preservation` merged per-dimension.
 * Certification levels: "benchmarked" only where a real E2E benchmark suite
 * validates the edge comparatively; "engine-inferred" for evidence-based
 * annotations; un-annotated edges fall back to conservative "unknown" (§82).
 */
const QUALITY_OVERRIDES: Record<string, EdgeQualityInput> = {
  // ── Images: lossy targets re-encode; jpg destroys alpha (§17) ──
  "png->jpg": { preservation: { mediaQuality: 0.8, alpha: 0 }, irreversibleLosses: ["alpha"], reencodeRequired: true },
  "webp->jpg": { preservation: { mediaQuality: 0.8, alpha: 0 }, irreversibleLosses: ["alpha"], reencodeRequired: true },
  "avif->jpg": { preservation: { mediaQuality: 0.8, alpha: 0 }, irreversibleLosses: ["alpha"], reencodeRequired: true },
  "tiff->jpg": { preservation: { mediaQuality: 0.8, alpha: 0 }, irreversibleLosses: ["alpha"], reencodeRequired: true },
  "gif->jpg": { preservation: { mediaQuality: 0.75 }, reencodeRequired: true },
  "png->webp": { preservation: { mediaQuality: 0.85 }, reencodeRequired: true },
  // .85 across all →webp/→avif: same single lossy generation as png->webp, so
  // a lossless detour (x->png->webp) must not beat the direct edge (§17)
  "jpg->webp": { preservation: { mediaQuality: 0.85 }, reencodeRequired: true },
  "avif->webp": { preservation: { mediaQuality: 0.85 }, reencodeRequired: true },
  "gif->webp": { preservation: { mediaQuality: 0.85 }, reencodeRequired: true },
  "tiff->webp": { preservation: { mediaQuality: 0.85 }, reencodeRequired: true },
  "png->avif": { preservation: { mediaQuality: 0.85 }, reencodeRequired: true },
  "jpg->avif": { preservation: { mediaQuality: 0.85 }, reencodeRequired: true },
  "webp->avif": { preservation: { mediaQuality: 0.85 }, reencodeRequired: true },
  "tiff->avif": { preservation: { mediaQuality: 0.85 }, reencodeRequired: true },
  "gif->avif": { preservation: { mediaQuality: 0.85 }, reencodeRequired: true },
  "png->png": { reencodeRequired: false },
  "jpg->png": { preservation: { mediaQuality: 0.95 }, reencodeRequired: false },
  "webp->png": { preservation: { mediaQuality: 0.95 }, reencodeRequired: false },
  "avif->png": { preservation: { mediaQuality: 0.95 }, reencodeRequired: false },
  "gif->png": { preservation: { mediaQuality: 0.95 }, reencodeRequired: false },
  "tiff->png": { preservation: { mediaQuality: 0.95 }, reencodeRequired: false },
  "png->tiff": { preservation: { mediaQuality: 0.98 }, reencodeRequired: false },
  "jpg->tiff": { preservation: { mediaQuality: 0.98 }, reencodeRequired: false },
  "webp->tiff": { preservation: { mediaQuality: 0.98 }, reencodeRequired: false },
  "avif->tiff": { preservation: { mediaQuality: 0.98 }, reencodeRequired: false },
  "gif->tiff": { preservation: { mediaQuality: 0.98 }, reencodeRequired: false },
  "png->gif": { preservation: { mediaQuality: 0.55 }, irreversibleLosses: ["mediaQuality"], reencodeRequired: true },
  "jpg->gif": { preservation: { mediaQuality: 0.55 }, irreversibleLosses: ["mediaQuality"], reencodeRequired: true },
  "webp->gif": { preservation: { mediaQuality: 0.55 }, irreversibleLosses: ["mediaQuality"], reencodeRequired: true },
  "tiff->gif": { preservation: { mediaQuality: 0.55 }, irreversibleLosses: ["mediaQuality"], reencodeRequired: true },
  "avif->gif": { preservation: { mediaQuality: 0.55 }, irreversibleLosses: ["mediaQuality"], reencodeRequired: true },
  // ── Audio: lossless targets add NO extra codec loss (§15) ──
  "mp3->wav": { preservation: { mediaQuality: 1.0 }, reencodeRequired: false },
  "m4a->wav": { preservation: { mediaQuality: 1.0 }, reencodeRequired: false },
  "aac->wav": { preservation: { mediaQuality: 1.0 }, reencodeRequired: false },
  "ogg->wav": { preservation: { mediaQuality: 1.0 }, reencodeRequired: false },
  "flac->wav": { preservation: { mediaQuality: 1.0 }, reencodeRequired: false },
  "mp3->flac": { preservation: { mediaQuality: 1.0 }, reencodeRequired: false },
  "m4a->flac": { preservation: { mediaQuality: 1.0 }, reencodeRequired: false },
  "aac->flac": { preservation: { mediaQuality: 1.0 }, reencodeRequired: false },
  "ogg->flac": { preservation: { mediaQuality: 1.0 }, reencodeRequired: false },
  "wav->flac": { preservation: { mediaQuality: 1.0 }, reencodeRequired: false },
  "flac->mp3": { preservation: { mediaQuality: 0.88 }, reencodeRequired: true },
  "wav->mp3": { preservation: { mediaQuality: 0.88 }, reencodeRequired: true },
  "aac->mp3": { preservation: { mediaQuality: 0.88 }, reencodeRequired: true },
  "m4a->mp3": { preservation: { mediaQuality: 0.88 }, reencodeRequired: true },
  "ogg->mp3": { preservation: { mediaQuality: 0.88 }, reencodeRequired: true },
  // ── Video: remux-capable container swaps (payload untouched, §16) ──
  // Engine reality (ffmpeg-engine.ts:195): ONLY →mkv uses stream copy;
  // →mp4 is always "transcode-video". Annotations must match the adapter.
  "ts->mp4": { pipelineMode: "transcode", reencodeRequired: true, preservation: { mediaQuality: 0.9, resolution: 1.0 } },
  "mkv->mp4": { pipelineMode: "transcode", reencodeRequired: true, preservation: { mediaQuality: 0.9, resolution: 1.0 } },
  "mov->mp4": { pipelineMode: "transcode", reencodeRequired: true, preservation: { mediaQuality: 0.9, resolution: 1.0 } },
  // Same single lossy generation as any →mp4 detour via mkv remux, so the
  // direct edge must tie and win on steps — not lose to calibration noise
  "avi->mp4": { pipelineMode: "transcode", reencodeRequired: true, preservation: { mediaQuality: 0.9, resolution: 1.0 } },
  "wmv->mp4": { pipelineMode: "transcode", reencodeRequired: true, preservation: { mediaQuality: 0.9, resolution: 1.0 } },
  "webm->mp4": { pipelineMode: "transcode", reencodeRequired: true, preservation: { mediaQuality: 0.9, resolution: 1.0 } },
  "ts->mkv": { pipelineMode: "remux", reencodeRequired: false, preservation: { mediaQuality: 1.0, resolution: 1.0, structure: 0.95 } },
  "mp4->mkv": { pipelineMode: "remux", reencodeRequired: false, preservation: { mediaQuality: 1.0, resolution: 1.0, structure: 0.95 } },
  "webm->mkv": { pipelineMode: "remux", reencodeRequired: false, preservation: { mediaQuality: 1.0, resolution: 1.0, structure: 0.95 } },
  "wmv->mkv": { pipelineMode: "remux", reencodeRequired: false, preservation: { mediaQuality: 1.0, resolution: 1.0, structure: 0.95 } },
  "mov->mkv": { pipelineMode: "remux", reencodeRequired: false, preservation: { mediaQuality: 1.0, resolution: 1.0, structure: 0.95 } },
  "avi->mkv": { pipelineMode: "remux", reencodeRequired: false, preservation: { mediaQuality: 1.0, resolution: 1.0, structure: 0.95 } },
  // webm outputs always require a transcode (VP8/VP9/AV1 payloads)
  "mp4->webm": { reencodeRequired: true, preservation: { mediaQuality: 0.82 } },
  "mkv->webm": { reencodeRequired: true, preservation: { mediaQuality: 0.82 } },
  "wmv->webm": { reencodeRequired: true, preservation: { mediaQuality: 0.82 } },
  "ts->webm": { reencodeRequired: true, preservation: { mediaQuality: 0.82 } },
  "avi->webm": { reencodeRequired: true, preservation: { mediaQuality: 0.82 } },
  "mov->webm": { reencodeRequired: true, preservation: { mediaQuality: 0.82 } },
  // ── PDF rasterize: png/tiff keep fidelity, jpg re-compresses ──
  "pdf->png": { preservation: { mediaQuality: 0.95, alpha: 0.95 }, reencodeRequired: false, certification: "benchmarked" },
  "pdf->tiff": { preservation: { mediaQuality: 0.95 }, reencodeRequired: false },
  "pdf->jpg": { preservation: { mediaQuality: 0.8, alpha: 0 }, irreversibleLosses: ["alpha"], reencodeRequired: true },
  // ── Data: tabular targets flatten types and nesting ──
  "json->csv": { preservation: { structure: 0.65 }, irreversibleLosses: ["structure"] },
  "yaml->csv": { preservation: { structure: 0.65 }, irreversibleLosses: ["structure"] },
  "toml->csv": { preservation: { structure: 0.65 }, irreversibleLosses: ["structure"] },
  "xml->csv": { preservation: { structure: 0.65 }, irreversibleLosses: ["structure"] },
  "json->tsv": { preservation: { structure: 0.65 }, irreversibleLosses: ["structure"] },
  "yaml->tsv": { preservation: { structure: 0.65 }, irreversibleLosses: ["structure"] },
  "toml->tsv": { preservation: { structure: 0.65 }, irreversibleLosses: ["structure"] },
  "xml->tsv": { preservation: { structure: 0.65 }, irreversibleLosses: ["structure"] },
  "csv->json": { preservation: { structure: 0.85 } },
  "tsv->json": { preservation: { structure: 0.85 } },
  // ── Pandoc →txt: plain-text output flattens everything (§18) ──
  // Group base overestimates structure/tables for a txt target
  "md->txt": { preservation: { text: 0.92, structure: 0.15, layout: 0.05, tables: 0.15, images: 0, metadata: 0.4 }, irreversibleLosses: ["structure", "layout", "tables", "images"] },
  "html->txt": { preservation: { text: 0.9, structure: 0.15, layout: 0.05, tables: 0.15, images: 0, metadata: 0.4 }, irreversibleLosses: ["structure", "layout", "tables", "images"] },
  "rst->txt": { preservation: { text: 0.92, structure: 0.15, layout: 0.05, tables: 0.15, images: 0, metadata: 0.4 }, irreversibleLosses: ["structure", "layout", "tables", "images"] },
  "docx->txt": { preservation: { text: 0.9, structure: 0.15, layout: 0.05, tables: 0.15, images: 0, metadata: 0.4 }, irreversibleLosses: ["structure", "layout", "tables", "images"] },
  // Markup → HTML is the natural structure-preserving path. It may normalize
  // authoring syntax, but it should beat detours through DOCX/PDF for raster
  // rendering pipelines.
  "md->html": { preservation: { text: 0.96, structure: 0.9, layout: 0.86, tables: 0.86, images: 0.82, metadata: 0.6 }, irreversibleLosses: ["metadata"], reencodeRequired: false, certification: "benchmarked" },
  "rst->html": { preservation: { text: 0.96, structure: 0.9, layout: 0.84, tables: 0.84, images: 0.8, metadata: 0.6 }, irreversibleLosses: ["metadata"], reencodeRequired: false, certification: "benchmarked" },
};

function mergeQuality(
  base: EdgeQualityInput | undefined,
  override: EdgeQualityInput | undefined
): EdgeQualityInput | undefined {
  if (!base) return override;
  if (!override) return base;
  return {
    ...base,
    ...override,
    preservation: { ...base.preservation, ...override.preservation },
  };
}

function edge(input: EdgeInput): CanonicalConversionEdge {
  const source = normalizeFormatId(input.source);
  const target = normalizeFormatId(input.target);
  if (!source || !target) {
    throw new Error(`Invalid conversion edge format: ${input.source} -> ${input.target}`);
  }
  return {
    id: `${source}->${target}:${input.implementationId}`,
    source,
    target,
    operationId: input.operationId,
    implementationId: input.implementationId,
    engineId: input.engineId,
    dependencies: input.dependencies ?? [input.engineId],
    environments: input.environments ?? DESKTOP,
    lossProfile: input.lossProfile,
    supportsOCR: input.supportsOCR ?? false,
    mode: input.mode ?? "conversion",
    enabled: input.enabled ?? true,
    declared: input.declared ?? true,
    implemented: input.implemented ?? true,
    priority: input.priority ?? 100,
    costModel: input.costModel ?? "included",
    outputCardinality: input.outputCardinality ?? "single",
    supportsAsIntermediate: input.supportsAsIntermediate ?? input.outputCardinality !== "multiple",
    quality: mergeQuality(input.quality, QUALITY_OVERRIDES[`${source}->${target}`]),
    contentRequirements: input.contentRequirements,
    notes: input.notes,
  };
}

function cross(
  sources: readonly string[],
  targets: readonly string[],
  base: Omit<EdgeInput, "source" | "target">
): CanonicalConversionEdge[] {
  const edges: CanonicalConversionEdge[] = [];
  for (const source of sources) {
    for (const target of targets) {
      const canonicalSource = normalizeFormatId(source);
      const canonicalTarget = normalizeFormatId(target);
      if (!canonicalSource || !canonicalTarget || canonicalSource === canonicalTarget) continue;
      edges.push(edge({ ...base, source, target }));
    }
  }
  return edges;
}

const IMAGE_FORMATS = ["jpg", "png", "webp", "avif", "tiff", "gif"] as const;
const BROWSER_IMAGE_FORMATS = ["jpg", "png", "webp"] as const;
const DATA_FORMATS = ["json", "yaml", "toml", "xml", "csv", "tsv"] as const;
const AUDIO_FORMATS = ["mp3", "m4a", "wav", "flac", "ogg", "aac"] as const;
const VIDEO_INPUTS = ["mp4", "webm", "mkv", "avi", "mov", "wmv", "ts"] as const;
const VIDEO_OUTPUTS = ["mp4", "webm", "mkv"] as const;
const ARCHIVE_INPUTS = ["zip", "7z", "tar", "gz", "bz2", "xz"] as const;
const ARCHIVE_OUTPUTS = ["zip", "7z", "tar"] as const;

const PANDOC_EDGES: CanonicalConversionEdge[] = [
  ...cross(["md"], ["html", "docx", "odt", "rst", "tex", "txt"], { operationId: "doc:convert", implementationId: "pandoc-document-convert", engineId: "pandoc", dependencies: ["pandoc"], lossProfile: "structural-risk", priority: 70, quality: { preservation: { text: 0.92, structure: 0.8, layout: 0.4, tables: 0.75, images: 0.6, metadata: 0.7 }, irreversibleLosses: ["layout"], runtimeCost: "low", stability: 0.9, certification: "engine-inferred" } }),
  ...cross(["html"], ["md", "docx", "odt", "rst", "txt"], { operationId: "doc:convert", implementationId: "pandoc-document-convert", engineId: "pandoc", dependencies: ["pandoc"], lossProfile: "structural-risk", priority: 70, quality: { preservation: { text: 0.9, structure: 0.8, layout: 0.45, tables: 0.7, images: 0.6, metadata: 0.6 }, irreversibleLosses: ["layout"], runtimeCost: "low", stability: 0.9, certification: "engine-inferred" } }),
  ...cross(["rst"], ["md", "html", "docx", "odt", "tex", "txt"], { operationId: "doc:convert", implementationId: "pandoc-document-convert", engineId: "pandoc", dependencies: ["pandoc"], lossProfile: "structural-risk", priority: 70, quality: { preservation: { text: 0.92, structure: 0.8, layout: 0.4, tables: 0.7, images: 0.6, metadata: 0.6 }, irreversibleLosses: ["layout"], runtimeCost: "low", stability: 0.9, certification: "engine-inferred" } }),
  ...cross(["docx"], ["md", "html", "odt", "rst", "txt"], { operationId: "doc:convert", implementationId: "pandoc-document-convert", engineId: "pandoc", dependencies: ["pandoc"], lossProfile: "structural-risk", priority: 60, quality: { preservation: { text: 0.9, structure: 0.75, layout: 0.35, tables: 0.7, images: 0.65, metadata: 0.6 }, irreversibleLosses: ["layout"], runtimeCost: "low", stability: 0.9, certification: "engine-inferred" } }),
  ...cross(["tex"], ["md", "html"], { operationId: "doc:convert", implementationId: "pandoc-document-convert", engineId: "pandoc", dependencies: ["pandoc"], lossProfile: "structural-risk", priority: 70, quality: { preservation: { text: 0.9, structure: 0.75, layout: 0.35, tables: 0.7, images: 0.6, metadata: 0.6 }, irreversibleLosses: ["layout"], runtimeCost: "low", stability: 0.9, certification: "engine-inferred" } }),
  ...cross(["txt"], ["md", "html"], { operationId: "doc:convert", implementationId: "pandoc-document-convert", engineId: "pandoc", dependencies: ["pandoc"], lossProfile: "structural-risk", priority: 60, quality: { preservation: { text: 0.95, structure: 0.5, layout: 0.1, metadata: 0.5 }, runtimeCost: "low", stability: 0.9, certification: "engine-inferred" } }),
];

const LIBREOFFICE_EDGES: CanonicalConversionEdge[] = [
  ...cross(["docx", "doc", "odt", "rtf"], ["pdf", "odt", "docx"], { operationId: "office:to-pdf", implementationId: "libreoffice-office-convert", engineId: "libreoffice", dependencies: ["libreoffice"], lossProfile: "lossy-controlled", priority: 95, quality: { preservation: { text: 0.95, structure: 0.9, layout: 0.9, tables: 0.9, images: 0.9, metadata: 0.7 }, reencodeRequired: false, runtimeCost: "medium", stability: 0.9, certification: "engine-inferred" } }),
  ...cross(["docx", "doc", "odt"], ["rtf"], { operationId: "office:convert", implementationId: "libreoffice-office-convert", engineId: "libreoffice", dependencies: ["libreoffice"], lossProfile: "lossy-controlled", priority: 85, quality: { preservation: { text: 0.95, structure: 0.85, layout: 0.8, tables: 0.8, images: 0.8, metadata: 0.65 }, reencodeRequired: false, runtimeCost: "medium", stability: 0.9, certification: "engine-inferred" } }),
  ...cross(["xlsx", "xls", "ods"], ["pdf", "ods", "xlsx"], { operationId: "office:to-pdf", implementationId: "libreoffice-office-convert", engineId: "libreoffice", dependencies: ["libreoffice"], lossProfile: "lossy-controlled", priority: 95, quality: { preservation: { text: 0.95, structure: 0.9, layout: 0.9, tables: 0.92, images: 0.9, metadata: 0.7 }, reencodeRequired: false, runtimeCost: "medium", stability: 0.9, certification: "engine-inferred" } }),
  ...cross(["pptx", "ppt", "odp"], ["pdf"], { operationId: "office:to-pdf", implementationId: "libreoffice-office-convert", engineId: "libreoffice", dependencies: ["libreoffice"], lossProfile: "lossy-controlled", priority: 95, quality: { preservation: { text: 0.95, structure: 0.9, layout: 0.9, tables: 0.9, images: 0.9, metadata: 0.7 }, reencodeRequired: false, runtimeCost: "medium", stability: 0.9, certification: "engine-inferred" } }),
  ...cross(["pptx", "ppt", "odp"], ["pptx"], { operationId: "office:convert", implementationId: "libreoffice-office-convert", engineId: "libreoffice", dependencies: ["libreoffice"], lossProfile: "lossy-controlled", priority: 85, quality: { preservation: { text: 0.9, structure: 0.8, layout: 0.75, tables: 0.7, images: 0.85, metadata: 0.6 }, reencodeRequired: false, runtimeCost: "medium", stability: 0.9, certification: "engine-inferred" } }),
];

const CALIBRE_EDGES: CanonicalConversionEdge[] = [
  ...cross(["epub"], ["mobi", "azw3", "pdf"], { operationId: "ebook:convert", implementationId: "calibre-ebook-convert", engineId: "calibre", dependencies: ["ebook-convert"], lossProfile: "structural-risk", priority: 80, declared: false, quality: { preservation: { text: 0.85, structure: 0.6, layout: 0.5, images: 0.7, metadata: 0.8 }, irreversibleLosses: ["structure"], runtimeCost: "medium", stability: 0.8, certification: "engine-inferred" } }),
  ...cross(["mobi"], ["epub"], { operationId: "ebook:convert", implementationId: "calibre-ebook-convert", engineId: "calibre", dependencies: ["ebook-convert"], lossProfile: "structural-risk", priority: 80, declared: false, quality: { preservation: { text: 0.85, structure: 0.6, images: 0.7, metadata: 0.8 }, irreversibleLosses: ["structure"], runtimeCost: "medium", stability: 0.8, certification: "engine-inferred" } }),
  ...cross(["azw3"], ["epub"], { operationId: "ebook:convert", implementationId: "calibre-ebook-convert", engineId: "calibre", dependencies: ["ebook-convert"], lossProfile: "structural-risk", priority: 80, declared: false, quality: { preservation: { text: 0.85, structure: 0.6, images: 0.7, metadata: 0.8 }, irreversibleLosses: ["structure"], runtimeCost: "medium", stability: 0.8, certification: "engine-inferred" } }),
  ...cross(["html"], ["epub"], { operationId: "ebook:convert", implementationId: "calibre-ebook-convert", engineId: "calibre", dependencies: ["ebook-convert"], lossProfile: "structural-risk", priority: 80, declared: false, quality: { preservation: { text: 0.85, structure: 0.6, images: 0.65, metadata: 0.75 }, irreversibleLosses: ["structure"], runtimeCost: "medium", stability: 0.8, certification: "engine-inferred" } }),
  ...cross(["docx"], ["epub"], { operationId: "ebook:convert", implementationId: "calibre-ebook-convert", engineId: "calibre", dependencies: ["ebook-convert"], lossProfile: "structural-risk", priority: 80, declared: false, quality: { preservation: { text: 0.88, structure: 0.65, images: 0.7, metadata: 0.75 }, irreversibleLosses: ["structure"], runtimeCost: "medium", stability: 0.8, certification: "engine-inferred" } }),
];

export const CANONICAL_CONVERSION_EDGES: readonly CanonicalConversionEdge[] = [
  ...cross(IMAGE_FORMATS, IMAGE_FORMATS, { operationId: "image:convert", implementationId: "sharp-image-convert", engineId: "sharp-image", dependencies: ["sharp-image", "sharp"], lossProfile: "lossy-controlled", priority: 90, quality: { preservation: { mediaQuality: 0.9, resolution: 0.97, alpha: 0.95, metadata: 0.8 }, reencodeRequired: true, runtimeCost: "low", stability: 0.95, certification: "engine-inferred" } }),
  ...cross(BROWSER_IMAGE_FORMATS, BROWSER_IMAGE_FORMATS, { operationId: "browser:image-convert", implementationId: "browser-canvas-image-convert", engineId: "browser", dependencies: ["browser"], environments: ["web"], lossProfile: "lossy-controlled", priority: 75, declared: false, quality: { preservation: { mediaQuality: 0.85, resolution: 0.95, alpha: 0.9, metadata: 0.5 }, reencodeRequired: true, runtimeCost: "low", stability: 0.85, certification: "engine-inferred" } }),
  ...cross(DATA_FORMATS, DATA_FORMATS, { operationId: "data:convert", implementationId: "data-ts-structured-convert", engineId: "data-ts", dependencies: ["data-ts", "yaml", "smol-toml", "fast-xml-parser", "csv-parse", "csv-stringify"], environments: ALL, lossProfile: "structural-risk", priority: 85, declared: false, quality: { preservation: { structure: 0.9, text: 0.95, metadata: 0.85 }, reencodeRequired: false, runtimeCost: "low", stability: 0.9, certification: "engine-inferred" } }),
  ...cross(AUDIO_FORMATS, AUDIO_FORMATS, { operationId: "media:convert-audio", implementationId: "ffmpeg-audio-transcode", engineId: "ffmpeg-media", dependencies: ["ffmpeg-media", "ffmpeg", "ffprobe"], lossProfile: "lossy-controlled", priority: 85, quality: { preservation: { mediaQuality: 0.85, structure: 0.9, metadata: 0.75 }, reencodeRequired: true, runtimeCost: "low", stability: 0.95, certification: "engine-inferred" } }),
  ...cross(VIDEO_INPUTS, VIDEO_OUTPUTS, { operationId: "media:convert-video", implementationId: "ffmpeg-video-transcode", engineId: "ffmpeg-media", dependencies: ["ffmpeg-media", "ffmpeg", "ffprobe"], lossProfile: "lossy-controlled", priority: 85, quality: { preservation: { mediaQuality: 0.88, resolution: 0.95, structure: 0.9, metadata: 0.75 }, reencodeRequired: true, runtimeCost: "high", stability: 0.9, certification: "engine-inferred" } }),
  ...cross(VIDEO_INPUTS, AUDIO_FORMATS, { operationId: "media:extract-audio", implementationId: "ffmpeg-extract-audio", engineId: "ffmpeg-media", dependencies: ["ffmpeg-media", "ffmpeg", "ffprobe"], lossProfile: "lossy-controlled", priority: 80, quality: { preservation: { mediaQuality: 0.9, structure: 0.6, metadata: 0.6 }, irreversibleLosses: ["structure"], reencodeRequired: true, runtimeCost: "medium", stability: 0.9, certification: "engine-inferred" } }),
  ...cross(VIDEO_INPUTS, ["gif"], { operationId: "media:create-gif", implementationId: "ffmpeg-create-gif", engineId: "ffmpeg-media", dependencies: ["ffmpeg-media", "ffmpeg", "ffprobe"], lossProfile: "lossy", priority: 65, declared: false, quality: { preservation: { mediaQuality: 0.5, resolution: 0.7, structure: 0.4, metadata: 0.3 }, irreversibleLosses: ["mediaQuality", "structure"], reencodeRequired: true, runtimeCost: "high", stability: 0.85, certification: "engine-inferred" } }),
  ...PANDOC_EDGES,
  ...LIBREOFFICE_EDGES,
  ...CALIBRE_EDGES,
  ...cross(ARCHIVE_INPUTS, ARCHIVE_OUTPUTS, { operationId: "archive:repack", implementationId: "sevenzip-repack", engineId: "sevenzip", dependencies: ["sevenzip", "7z"], lossProfile: "lossless", priority: 80, declared: false, quality: { preservation: { structure: 0.98, metadata: 0.9 }, reencodeRequired: false, runtimeCost: "medium", stability: 0.95, certification: "engine-inferred" } }),
  ...cross(["png", "jpg", "tiff", "webp"], ["txt"], { operationId: "ocr:image-to-text", implementationId: "tesseract-image-ocr-text", engineId: "tesseract", dependencies: ["tesseract"], lossProfile: "lossy", supportsOCR: true, mode: "ocr", priority: 55, declared: false, quality: { preservation: { text: 0.7, structure: 0.2, metadata: 0.3 }, irreversibleLosses: ["structure"], runtimeCost: "high", stability: 0.8, certification: "engine-inferred" } }),
  ...cross(["png", "jpg", "tiff", "webp"], ["pdf"], { operationId: "ocr:image-to-pdf", implementationId: "tesseract-image-ocr-pdf", engineId: "tesseract", dependencies: ["tesseract"], lossProfile: "lossy", supportsOCR: true, mode: "ocr", priority: 55, declared: false, quality: { preservation: { text: 0.7, structure: 0.4, layout: 0.85, images: 0.95, metadata: 0.4 }, irreversibleLosses: ["structure"], runtimeCost: "high", stability: 0.8, certification: "engine-inferred" } }),
  ...cross(["pdf"], ["txt"], { operationId: "pdf:ocr", implementationId: "tesseract-pdf-ocr-text", engineId: "tesseract", dependencies: ["tesseract", "pdftoppm"], lossProfile: "lossy", supportsOCR: true, mode: "ocr", priority: 55, quality: { preservation: { text: 0.7, structure: 0.2, metadata: 0.3 }, irreversibleLosses: ["structure"], runtimeCost: "high", stability: 0.8, certification: "engine-inferred" } }),
  ...cross(["png", "jpg", "webp"], ["pdf"], { operationId: "browser:images-to-pdf", implementationId: "browser-pdf-images-to-pdf", engineId: "browser", dependencies: ["browser"], environments: ["web"], lossProfile: "lossy-controlled", priority: 75, declared: false, quality: { preservation: { images: 0.9, layout: 0.85, structure: 0.85, metadata: 0.5 }, runtimeCost: "low", stability: 0.85, certification: "engine-inferred" } }),
  edge({
    source: "html",
    target: "png",
    operationId: "render:html-to-image",
    implementationId: "playwright-chromium-html-render-png",
    engineId: "html-renderer",
    dependencies: ["html-renderer", "chromium", "playwright-core", "sharp"],
    environments: DESKTOP,
    lossProfile: "lossy-controlled",
    priority: 92,
    supportsAsIntermediate: false,
    quality: {
      preservation: {
        text: 0.95,
        structure: 0.05,
        layout: 0.94,
        images: 0.92,
        tables: 0.92,
        metadata: 0.1,
        mediaQuality: 0.92,
        resolution: 0.9,
        alpha: 0.95,
      },
      irreversibleLosses: ["structure", "metadata"],
      reencodeRequired: false,
      pipelineMode: "na",
      runtimeCost: "medium",
      stability: 0.9,
      certification: "benchmarked",
    },
    notes: "Static HTML rendered to a full-page PNG through isolated Chromium. JavaScript disabled; network blocked; local file assets limited to the input directory.",
  }),
  edge({
    source: "html",
    target: "tiff",
    operationId: "render:html-to-image",
    implementationId: "playwright-chromium-html-render-tiff",
    engineId: "html-renderer",
    dependencies: ["html-renderer", "chromium", "playwright-core", "sharp"],
    environments: DESKTOP,
    lossProfile: "lossy-controlled",
    priority: 90,
    supportsAsIntermediate: false,
    quality: {
      preservation: {
        text: 0.95,
        structure: 0.05,
        layout: 0.94,
        images: 0.92,
        tables: 0.92,
        metadata: 0.1,
        mediaQuality: 0.91,
        resolution: 0.9,
        alpha: 0.95,
      },
      irreversibleLosses: ["structure", "metadata"],
      reencodeRequired: true,
      pipelineMode: "transcode",
      runtimeCost: "medium",
      stability: 0.9,
      certification: "benchmarked",
    },
    notes: "Static HTML rendered to PNG first, then encoded to TIFF/LZW through Sharp. No direct TIFF renderer is assumed.",
  }),
  ...cross(["pdf"], ["png", "jpg", "tiff"], {
    operationId: "pdf:rasterize",
    implementationId: "poppler-pdftoppm-rasterize",
    engineId: "poppler",
    dependencies: ["pdftoppm"],
    lossProfile: "lossy-controlled",
    priority: 80,
    outputCardinality: "multiple",
    supportsAsIntermediate: false,
    quality: { preservation: { mediaQuality: 0.9, resolution: 0.85, alpha: 0.95, metadata: 0.5 }, reencodeRequired: false, runtimeCost: "medium", stability: 0.95, certification: "engine-inferred" },
  }),
  edge({
    source: "pdf",
    target: "txt",
    operationId: "pdf:extract-text",
    implementationId: "poppler-pdftotext-extract-text",
    engineId: "poppler",
    dependencies: ["poppler", "pdftotext"],
    lossProfile: "lossy-controlled",
    priority: 75,
    supportsAsIntermediate: false,
    quality: { preservation: { text: 0.9, structure: 0.1, metadata: 0.3 }, irreversibleLosses: ["structure"], reencodeRequired: false, runtimeCost: "low", stability: 0.95, certification: "benchmarked" },
    contentRequirements: { requiresTextLayer: true },
    notes: "Text extraction without layout. Scanned PDFs without a text layer fail with a controlled OCR hint. Not an intermediate: extraction chains must not fake layout reconstruction (e.g. PDF→DOCX).",
  }),
  edge({
    source: "pdf",
    target: "html",
    operationId: "pdf:extract-html",
    implementationId: "poppler-pdftohtml-extract-html",
    engineId: "poppler",
    dependencies: ["poppler", "pdftohtml"],
    lossProfile: "structural-risk",
    priority: 75,
    supportsAsIntermediate: false,
    quality: { preservation: { text: 0.9, structure: 0.5, layout: 0.7, tables: 0.4, images: 0.8, metadata: 0.4 }, irreversibleLosses: ["structure", "tables"], reencodeRequired: false, runtimeCost: "low", stability: 0.95, certification: "benchmarked" },
    contentRequirements: { requiresTextLayer: true },
    notes: "Single HTML via pdftohtml; image assets are delivered together (ZIP when present). Not an intermediate: lossy extraction must not feed reconstruction routes.",
  }),
  edge({
    source: "pdf",
    target: "md",
    operationId: "pdf:extract-markdown",
    implementationId: "poppler-pdftohtml-pandoc-markdown",
    engineId: "poppler",
    dependencies: ["poppler", "pdftohtml", "pandoc"],
    lossProfile: "structural-risk",
    priority: 75,
    supportsAsIntermediate: false,
    quality: { preservation: { text: 0.85, structure: 0.4, layout: 0.15, tables: 0.35, images: 0.5, metadata: 0.4 }, irreversibleLosses: ["layout", "tables"], reencodeRequired: false, runtimeCost: "low", stability: 0.9, certification: "benchmarked" },
    contentRequirements: { requiresTextLayer: true },
    notes: "pdftohtml extraction normalized to GFM Markdown via Pandoc. No invented structure. Not an intermediate: PDF→DOCX via Markdown stays UNAVAILABLE by policy.",
  }),
  edge({
    source: "pdf",
    target: "docx",
    operationId: "office:pdf-to-docx",
    implementationId: "libreoffice-pdf-import-docx",
    engineId: "libreoffice",
    dependencies: ["libreoffice", "pdftotext"],
    lossProfile: "structural-risk",
    priority: 90,
    supportsAsIntermediate: false,
    quality: { preservation: { text: 0.9, structure: 0.6, layout: 0.55, tables: 0.35, images: 0.85, metadata: 0.5 }, irreversibleLosses: ["tables"], reencodeRequired: false, runtimeCost: "high", stability: 0.9, certification: "benchmarked" },
    contentRequirements: { requiresTextLayer: true },
    notes: "LibreOffice writer_pdf_import rebuilds an editable DOCX. Certified: text, unicode, multipage, embedded images. Degraded: tables flatten to positioned text (no w:tbl), headings lose style. Scanned PDFs rejected with a controlled OCR hint (pdftotext guard). Not an intermediate (§32).",
  }),
  ...cross(["png", "jpg", "webp", "tiff"], ["pdf"], {
    operationId: "image:to-pdf",
    implementationId: "sharp-image-to-pdf",
    engineId: "sharp-image",
    dependencies: ["sharp-image", "sharp"],
    lossProfile: "lossy-controlled",
    priority: 70,
    quality: { preservation: { images: 0.95, layout: 0.9, structure: 0.9, metadata: 0.6, alpha: 0.95 }, reencodeRequired: false, runtimeCost: "low", stability: 0.95, certification: "benchmarked" },
    notes: "Single image → single-page PDF via Sharp normalization + pdf-lib embedding.",
  }),
  edge({
    source: "pdf",
    target: "png",
    operationId: "pdf:to-png",
    implementationId: "qpdf-pdf-to-png-invalid",
    engineId: "qpdf",
    dependencies: ["qpdf", "pdftoppm"],
    lossProfile: "lossy-controlled",
    enabled: false,
    implemented: false,
    priority: 0,
    notes: "Invalid legacy declaration retained for diagnostics only. QPDF cannot rasterize PDF pages.",
  }),
] as const;

export function getCanonicalConversionEdges(): readonly CanonicalConversionEdge[] {
  return CANONICAL_CONVERSION_EDGES;
}

export function getDeclaredWithoutImplementation(): CanonicalConversionEdge[] {
  return CANONICAL_CONVERSION_EDGES.filter((edge) => edge.declared && !edge.implemented);
}

export function getImplementedButNotCanonicalDeclaration(): CanonicalConversionEdge[] {
  return CANONICAL_CONVERSION_EDGES.filter((edge) => edge.implemented && !edge.declared);
}

export function getDisabledInvalidEdges(): CanonicalConversionEdge[] {
  return CANONICAL_CONVERSION_EDGES.filter((edge) => !edge.enabled || !edge.implemented);
}

function dependencyAvailable(dependency: string, runtime: RuntimeCapabilitySet): boolean {
  if (dependency === "sharp") return runtime.engines.get("sharp-image")?.state === "available";
  if (dependency === "ffmpeg" || dependency === "ffprobe") return runtime.engines.get("ffmpeg-media")?.state === "available";
  if (dependency === "pdftoppm") {
    return runtime.engines.get("poppler")?.state === "available" ||
      runtime.engines.get("tesseract")?.capabilities.includes("pdftoppm") === true;
  }
  if (dependency === "pdftotext" || dependency === "pdftohtml") {
    return runtime.engines.get("poppler")?.capabilities.includes(dependency) === true;
  }
  if (dependency === "7z") return runtime.engines.get("sevenzip")?.state === "available";
  if (dependency === "ebook-convert") return runtime.engines.get("calibre")?.state === "available";
  if (["yaml", "smol-toml", "fast-xml-parser", "csv-parse", "csv-stringify"].includes(dependency)) {
    return runtime.engines.get("data-ts")?.state === "available";
  }
  if (dependency === "browser") return runtime.engines.get("browser")?.state === "available";
  if (dependency === "chromium" || dependency === "playwright-core") {
    const state = runtime.engines.get("html-renderer")?.state;
    return state === "available" || state === "installable";
  }
  return runtime.engines.get(dependency)?.state === "available";
}

export function getEffectiveAvailability(
  edge: CanonicalConversionEdge,
  runtime: RuntimeCapabilitySet
): EffectiveAvailability {
  const reasons: string[] = [];
  let state: EffectiveAvailabilityState = "available";
  const source = normalizeFormatId(edge.source);
  const target = normalizeFormatId(edge.target);

  if (!source || !target) {
    state = "format-unknown";
    reasons.push("source or target format is not canonical");
  } else if (!edge.enabled) {
    state = "disabled";
    reasons.push("edge is disabled");
  } else if (!edge.declared) {
    // Implementation-only edges are valid canonical edges; declaration state is
    // reported diagnostically but does not block availability.
  } else if (!edge.implemented) {
    state = "missing-implementation";
    reasons.push("edge has no executable implementation binding");
  }

  if (state === "available" && !edge.environments.includes(runtime.environment)) {
    state = "wrong-platform";
    reasons.push(`edge is not compatible with ${runtime.environment}`);
  }

  const engineRuntime = getEngineRuntimeCapability(edge.engineId, runtime);
  if (state === "available") {
    if (engineRuntime.state === "unavailable") {
      state = "engine-unavailable";
      reasons.push(`engine ${edge.engineId} is unavailable`);
    } else if (engineRuntime.state === "installable") {
      state = "runtime-installable";
      reasons.push(`engine ${edge.engineId} requires an optional runtime pack`);
    } else if (engineRuntime.state === "degraded") {
      state = "engine-degraded";
      reasons.push(`engine ${edge.engineId} is degraded`);
    } else if (engineRuntime.state === "unknown") {
      state = "engine-unknown";
      reasons.push(`engine ${edge.engineId} availability is unknown`);
    }
  }

  if (state === "available") {
    const missing = edge.dependencies.filter((dependency) => !dependencyAvailable(dependency, runtime));
    if (missing.length > 0) {
      state = "dependency-unavailable";
      reasons.push(`missing dependencies: ${missing.join(", ")}`);
    }
  }

  return {
    state,
    available: state === "available" || state === "runtime-installable",
    reasons,
    edge,
    runtime: engineRuntime,
  };
}

export function getAvailableEdges(
  runtime: RuntimeCapabilitySet,
  options: { includeOcr?: boolean } = {}
): CanonicalConversionEdge[] {
  return CANONICAL_CONVERSION_EDGES.filter((edge) => {
    if (!options.includeOcr && edge.mode === "ocr") return false;
    return getEffectiveAvailability(edge, runtime).available;
  });
}

export function getDirectConversion(
  sourceInput: string,
  targetInput: string,
  runtime: RuntimeCapabilitySet,
  options: { includeUnavailable?: boolean; includeOcr?: boolean } = {}
): DirectConversionResult | null {
  const source = normalizeFormatId(sourceInput);
  const target = normalizeFormatId(targetInput);
  if (!source || !target) return null;
  const candidates = CANONICAL_CONVERSION_EDGES
    .filter((edge) => edge.source === source && edge.target === target)
    .filter((edge) => options.includeOcr || edge.mode !== "ocr")
    .map((edge) => ({ edge, availability: getEffectiveAvailability(edge, runtime) }))
    .filter((result) => options.includeUnavailable || result.availability.available)
    .sort((a, b) => {
      if (a.availability.available !== b.availability.available) return a.availability.available ? -1 : 1;
      if (b.edge.priority !== a.edge.priority) return b.edge.priority - a.edge.priority;
      return a.edge.id.localeCompare(b.edge.id);
    });
  return candidates[0] ?? null;
}

export function isAvailable(
  source: string,
  target: string,
  environment: ConversionEnvironment,
  availableEngineIds: ReadonlySet<string>,
  options: { includeOcr?: boolean } = {}
): boolean {
  const runtime = runtimeCapabilitiesFromEngineIds(availableEngineIds, environment);
  return getDirectConversion(source, target, runtime, options)?.availability.available ?? false;
}
