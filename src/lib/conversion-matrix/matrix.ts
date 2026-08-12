import { normalizeFormatId } from "../domain/format-catalog";
import { getEngineRuntimeCapability, runtimeCapabilitiesFromEngineIds } from "./engines";
import type {
  CanonicalConversionEdge,
  ConversionEnvironment,
  DirectConversionResult,
  EffectiveAvailability,
  EffectiveAvailabilityState,
  RuntimeCapabilitySet,
} from "./types";

type EdgeInput = Omit<CanonicalConversionEdge, "id" | "source" | "target" | "declared" | "implemented" | "enabled" | "supportsOCR" | "mode" | "priority" | "dependencies" | "environments" | "costModel"> & {
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
};

const DESKTOP: ConversionEnvironment[] = ["windows", "linux"];
const ALL: ConversionEnvironment[] = ["windows", "linux", "web"];

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
const AUDIO_FORMATS = ["mp3", "m4a", "wav", "flac", "ogg"] as const;
const VIDEO_INPUTS = ["mp4", "webm", "mkv", "avi", "mov"] as const;
const VIDEO_OUTPUTS = ["mp4", "webm", "mkv"] as const;
const ARCHIVE_INPUTS = ["zip", "7z", "tar", "gz", "bz2", "xz"] as const;
const ARCHIVE_OUTPUTS = ["zip", "7z", "tar"] as const;

const PANDOC_EDGES: CanonicalConversionEdge[] = [
  ...cross(["md"], ["html", "docx", "odt", "rst", "tex", "txt"], { operationId: "doc:convert", implementationId: "pandoc-document-convert", engineId: "pandoc", dependencies: ["pandoc"], lossProfile: "structural-risk", priority: 70 }),
  ...cross(["html"], ["md", "docx", "odt", "rst", "txt"], { operationId: "doc:convert", implementationId: "pandoc-document-convert", engineId: "pandoc", dependencies: ["pandoc"], lossProfile: "structural-risk", priority: 70 }),
  ...cross(["rst"], ["md", "html", "docx", "odt", "tex", "txt"], { operationId: "doc:convert", implementationId: "pandoc-document-convert", engineId: "pandoc", dependencies: ["pandoc"], lossProfile: "structural-risk", priority: 70 }),
  ...cross(["docx"], ["md", "html", "odt", "rst", "txt"], { operationId: "doc:convert", implementationId: "pandoc-document-convert", engineId: "pandoc", dependencies: ["pandoc"], lossProfile: "structural-risk", priority: 60 }),
  ...cross(["tex"], ["md", "html"], { operationId: "doc:convert", implementationId: "pandoc-document-convert", engineId: "pandoc", dependencies: ["pandoc"], lossProfile: "structural-risk", priority: 70 }),
  ...cross(["txt"], ["md", "html"], { operationId: "doc:convert", implementationId: "pandoc-document-convert", engineId: "pandoc", dependencies: ["pandoc"], lossProfile: "structural-risk", priority: 60 }),
];

const LIBREOFFICE_EDGES: CanonicalConversionEdge[] = [
  ...cross(["docx", "doc", "odt", "rtf"], ["pdf", "odt", "docx"], { operationId: "office:to-pdf", implementationId: "libreoffice-office-convert", engineId: "libreoffice", dependencies: ["libreoffice"], lossProfile: "lossy-controlled", priority: 95 }),
  ...cross(["xlsx", "xls", "ods"], ["pdf", "ods", "xlsx"], { operationId: "office:to-pdf", implementationId: "libreoffice-office-convert", engineId: "libreoffice", dependencies: ["libreoffice"], lossProfile: "lossy-controlled", priority: 95 }),
  ...cross(["pptx", "ppt"], ["pdf", "pptx"], { operationId: "office:to-pdf", implementationId: "libreoffice-office-convert", engineId: "libreoffice", dependencies: ["libreoffice"], lossProfile: "lossy-controlled", priority: 95 }),
];

const CALIBRE_EDGES: CanonicalConversionEdge[] = [
  ...cross(["epub"], ["mobi", "azw3", "pdf"], { operationId: "ebook:convert", implementationId: "calibre-ebook-convert", engineId: "calibre", dependencies: ["ebook-convert"], lossProfile: "structural-risk", priority: 80, declared: false }),
  ...cross(["mobi"], ["epub"], { operationId: "ebook:convert", implementationId: "calibre-ebook-convert", engineId: "calibre", dependencies: ["ebook-convert"], lossProfile: "structural-risk", priority: 80, declared: false }),
  ...cross(["azw3"], ["epub"], { operationId: "ebook:convert", implementationId: "calibre-ebook-convert", engineId: "calibre", dependencies: ["ebook-convert"], lossProfile: "structural-risk", priority: 80, declared: false }),
  ...cross(["html"], ["epub"], { operationId: "ebook:convert", implementationId: "calibre-ebook-convert", engineId: "calibre", dependencies: ["ebook-convert"], lossProfile: "structural-risk", priority: 80, declared: false }),
  ...cross(["docx"], ["epub"], { operationId: "ebook:convert", implementationId: "calibre-ebook-convert", engineId: "calibre", dependencies: ["ebook-convert"], lossProfile: "structural-risk", priority: 80, declared: false }),
];

export const CANONICAL_CONVERSION_EDGES: readonly CanonicalConversionEdge[] = [
  ...cross(IMAGE_FORMATS, IMAGE_FORMATS, { operationId: "image:convert", implementationId: "sharp-image-convert", engineId: "sharp-image", dependencies: ["sharp-image", "sharp"], lossProfile: "lossy-controlled", priority: 90 }),
  ...cross(BROWSER_IMAGE_FORMATS, BROWSER_IMAGE_FORMATS, { operationId: "browser:image-convert", implementationId: "browser-canvas-image-convert", engineId: "browser", dependencies: ["browser"], environments: ["web"], lossProfile: "lossy-controlled", priority: 75, declared: false }),
  ...cross(DATA_FORMATS, DATA_FORMATS, { operationId: "data:convert", implementationId: "data-ts-structured-convert", engineId: "data-ts", dependencies: ["data-ts", "yaml", "smol-toml", "fast-xml-parser", "csv-parse", "csv-stringify"], environments: ALL, lossProfile: "structural-risk", priority: 85, declared: false }),
  ...cross(AUDIO_FORMATS, AUDIO_FORMATS, { operationId: "media:convert-audio", implementationId: "ffmpeg-audio-transcode", engineId: "ffmpeg-media", dependencies: ["ffmpeg-media", "ffmpeg", "ffprobe"], lossProfile: "lossy-controlled", priority: 85 }),
  ...cross(VIDEO_INPUTS, VIDEO_OUTPUTS, { operationId: "media:convert-video", implementationId: "ffmpeg-video-transcode", engineId: "ffmpeg-media", dependencies: ["ffmpeg-media", "ffmpeg", "ffprobe"], lossProfile: "lossy-controlled", priority: 85 }),
  ...cross(VIDEO_INPUTS, AUDIO_FORMATS, { operationId: "media:extract-audio", implementationId: "ffmpeg-extract-audio", engineId: "ffmpeg-media", dependencies: ["ffmpeg-media", "ffmpeg", "ffprobe"], lossProfile: "lossy-controlled", priority: 80 }),
  ...cross(VIDEO_INPUTS, ["gif"], { operationId: "media:create-gif", implementationId: "ffmpeg-create-gif", engineId: "ffmpeg-media", dependencies: ["ffmpeg-media", "ffmpeg", "ffprobe"], lossProfile: "lossy", priority: 65, declared: false }),
  ...PANDOC_EDGES,
  ...LIBREOFFICE_EDGES,
  ...CALIBRE_EDGES,
  ...cross(ARCHIVE_INPUTS, ARCHIVE_OUTPUTS, { operationId: "archive:repack", implementationId: "sevenzip-repack", engineId: "sevenzip", dependencies: ["sevenzip", "7z"], lossProfile: "lossless", priority: 80, declared: false }),
  ...cross(["png", "jpg", "tiff", "webp"], ["txt"], { operationId: "ocr:image-to-text", implementationId: "tesseract-image-ocr-text", engineId: "tesseract", dependencies: ["tesseract"], lossProfile: "lossy", supportsOCR: true, mode: "ocr", priority: 55, declared: false }),
  ...cross(["png", "jpg", "tiff", "webp"], ["pdf"], { operationId: "ocr:image-to-pdf", implementationId: "tesseract-image-ocr-pdf", engineId: "tesseract", dependencies: ["tesseract"], lossProfile: "lossy", supportsOCR: true, mode: "ocr", priority: 55, declared: false }),
  ...cross(["pdf"], ["txt"], { operationId: "pdf:ocr", implementationId: "tesseract-pdf-ocr-text", engineId: "tesseract", dependencies: ["tesseract", "pdftoppm"], lossProfile: "lossy", supportsOCR: true, mode: "ocr", priority: 55 }),
  ...cross(["png", "jpg", "webp"], ["pdf"], { operationId: "browser:images-to-pdf", implementationId: "browser-pdf-images-to-pdf", engineId: "browser", dependencies: ["browser"], environments: ["web"], lossProfile: "lossy-controlled", priority: 75, declared: false }),
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
  if (dependency === "7z") return runtime.engines.get("sevenzip")?.state === "available";
  if (dependency === "ebook-convert") return runtime.engines.get("calibre")?.state === "available";
  if (["yaml", "smol-toml", "fast-xml-parser", "csv-parse", "csv-stringify"].includes(dependency)) {
    return runtime.engines.get("data-ts")?.state === "available";
  }
  if (dependency === "browser") return runtime.engines.get("browser")?.state === "available";
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
    available: state === "available",
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
