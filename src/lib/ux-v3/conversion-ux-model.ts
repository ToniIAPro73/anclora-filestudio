import {
  FORMAT_ALIAS_DEFINITIONS,
  FORMAT_CATALOG,
  getFormatByCanonicalId,
  normalizeFormatId,
} from "@/lib/domain/format-catalog";
import type { FileCategory } from "@/lib/domain/descriptors";
import {
  getAvailableEdges,
  getEffectiveAvailability,
  runtimeCapabilitiesFromEngineIds,
  type ConversionEnvironment,
} from "@/lib/conversion-matrix";
import {
  getBestRoute,
  getSourcesForTarget,
  getTargetsForSource,
  type ConversionRoute,
} from "@/lib/conversion-routing";
import { WEB_TOOL_CAPABILITIES } from "@/lib/browser-tools/capabilities";

export type UxConversionCategoryId =
  | "documents"
  | "images"
  | "audio"
  | "video"
  | "ebooks"
  | "archives"
  | "data"
  | "other";

export interface UxFormatSummary {
  id: string;
  displayName: string;
  extension: string;
  category: UxConversionCategoryId;
  aliases: string[];
  sourcesCount: number;
  targetsCount: number;
}

export interface UxConversionCategory {
  id: UxConversionCategoryId;
  label: string;
  description: string;
  formats: UxFormatSummary[];
}

export interface UxToolOperation {
  id: string;
  label: string;
}

export interface UxToolCategory {
  id: "pdf" | "images" | "ocr" | "metadata" | "compression" | "utilities";
  label: string;
  description: string;
  operations: UxToolOperation[];
}

export interface UxRouteSummary {
  source: string;
  target: string;
  direct: boolean;
  multistep: boolean;
  lossy: boolean;
  ocr: boolean;
  route: ConversionRoute;
}

export interface UxConversionModel {
  environment: ConversionEnvironment;
  categories: UxConversionCategory[];
  formats: UxFormatSummary[];
  tools: UxToolCategory[];
  routes: UxRouteSummary[];
  availableDirectEdges: number;
  availableMultistepRoutes: number;
}

const CATEGORY_META: Record<UxConversionCategoryId, { label: string; description: string }> = {
  documents: { label: "Documentos", description: "PDF, Office, texto y formatos editables." },
  images: { label: "Imágenes", description: "Formatos de imagen disponibles en este entorno." },
  audio: { label: "Audio", description: "Contenedores y formatos de audio." },
  video: { label: "Vídeo", description: "Contenedores de vídeo y salidas derivadas." },
  ebooks: { label: "Ebooks", description: "Libros electrónicos compatibles." },
  archives: { label: "Archivos comprimidos", description: "Cambios de contenedor comprimido." },
  data: { label: "Datos", description: "Formatos estructurados y tabulares." },
  other: { label: "Otros", description: "Formatos canónicos sin grupo principal." },
};

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

function toUxCategory(category: FileCategory): UxConversionCategoryId {
  if (category === "document" || category === "pdf" || category === "presentation" || category === "spreadsheet" || category === "plain-text") {
    return "documents";
  }
  if (category === "image") return "images";
  if (category === "audio") return "audio";
  if (category === "video") return "video";
  if (category === "ebook") return "ebooks";
  if (category === "archive") return "archives";
  if (category === "structured-data") return "data";
  return "other";
}

function displayName(formatId: string): string {
  const format = getFormatByCanonicalId(formatId);
  if (!format) return formatId.toUpperCase();
  if (format.outputExtension === "jpg") return "JPEG";
  if (format.outputExtension === "md") return "Markdown";
  if (format.outputExtension === "tex") return "LaTeX";
  return format.outputExtension.toUpperCase();
}

export function getAliasesForFormat(formatId: string): string[] {
  const canonical = normalizeFormatId(formatId);
  if (!canonical) return [];
  const fromAliasCatalog = FORMAT_ALIAS_DEFINITIONS
    .filter((alias) => alias.canonicalId === canonical && alias.id !== canonical)
    .map((alias) => alias.id);
  const format = getFormatByCanonicalId(canonical);
  const fromExtensions = format?.inputExtensions.filter((ext) => normalizeFormatId(ext) === canonical && ext !== canonical) ?? [];
  return Array.from(new Set([...fromAliasCatalog, ...fromExtensions])).sort();
}

export function summarizeRoute(route: ConversionRoute): UxRouteSummary {
  return {
    source: route.source,
    target: route.destination,
    direct: route.steps.length === 1,
    multistep: route.steps.length > 1,
    lossy: route.classification === "lossy" || route.steps.some((step) => step.lossProfile === "lossy" || step.lossProfile === "lossy-controlled"),
    ocr: route.steps.some((step) => step.operationId.includes("ocr") || step.engineId === "tesseract"),
    route,
  };
}

export function buildConversionUxModel(
  environment: ConversionEnvironment,
  availableEngineIds: ReadonlySet<string>
): UxConversionModel {
  const formatsById = new Map<string, UxFormatSummary>();

  for (const format of FORMAT_CATALOG) {
    const id = normalizeFormatId(format.outputExtension);
    if (!id || formatsById.has(id)) continue;
    const sourceRoutes = getTargetsForSource(id, availableEngineIds, { environment });
    const targetRoutes = getSourcesForTarget(id, availableEngineIds, { environment });
    if (sourceRoutes.length === 0 && targetRoutes.length === 0) continue;
    formatsById.set(id, {
      id,
      displayName: displayName(id),
      extension: id,
      category: toUxCategory(format.category),
      aliases: getAliasesForFormat(id),
      sourcesCount: targetRoutes.length,
      targetsCount: sourceRoutes.length,
    });
  }

  const formats = Array.from(formatsById.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  const categories = CATEGORY_ORDER.map((id) => ({
    id,
    ...CATEGORY_META[id],
    formats: formats.filter((format) => format.category === id && format.sourcesCount > 0),
  })).filter((category) => category.formats.length > 0);

  const routes = formats.flatMap((source) => getTargetsForSource(source.id, availableEngineIds, { environment }).map(summarizeRoute));
  const runtime = runtimeCapabilitiesFromEngineIds(availableEngineIds, environment);
  const directEdges = getAvailableEdges(runtime, { includeOcr: false });
  const multistepCount = routes.filter((route) => route.multistep).length;

  return {
    environment,
    categories,
    formats,
    tools: buildToolCategories(environment, availableEngineIds),
    routes,
    availableDirectEdges: directEdges.length,
    availableMultistepRoutes: multistepCount,
  };
}

export function getDestinationFormatsByCategory(
  categoryId: UxConversionCategoryId,
  environment: ConversionEnvironment,
  availableEngineIds: ReadonlySet<string>
): UxFormatSummary[] {
  return buildConversionUxModel(environment, availableEngineIds)
    .categories.find((category) => category.id === categoryId)?.formats ?? [];
}

export function getFormatTargetsForUx(
  source: string,
  environment: ConversionEnvironment,
  availableEngineIds: ReadonlySet<string>
): UxRouteSummary[] {
  return getTargetsForSource(source, availableEngineIds, { environment }).map(summarizeRoute);
}

export function getFormatSourcesForUx(
  target: string,
  environment: ConversionEnvironment,
  availableEngineIds: ReadonlySet<string>
): UxRouteSummary[] {
  return getSourcesForTarget(target, availableEngineIds, { environment }).map(summarizeRoute);
}

export function getBestRouteForUx(
  source: string,
  target: string,
  environment: ConversionEnvironment,
  availableEngineIds: ReadonlySet<string>
): UxRouteSummary | null {
  const route = getBestRoute(source, target, availableEngineIds, { environment });
  return route ? summarizeRoute(route) : null;
}

export function getDirectAvailabilityForUx(
  source: string,
  target: string,
  environment: ConversionEnvironment,
  availableEngineIds: ReadonlySet<string>
) {
  const runtime = runtimeCapabilitiesFromEngineIds(availableEngineIds, environment);
  return getAvailableEdges(runtime, { includeOcr: true })
    .filter((edge) => edge.source === normalizeFormatId(source) && edge.target === normalizeFormatId(target))
    .map((edge) => getEffectiveAvailability(edge, runtime))[0] ?? null;
}

export function searchFormatsForUx(query: string, formats: readonly UxFormatSummary[]): UxFormatSummary[] {
  const normalized = normalizeFormatId(query);
  const needle = query.trim().toLowerCase();
  if (!needle) return formats.slice();
  return formats.filter((format) => (
    format.id === normalized ||
    format.extension.includes(needle) ||
    format.displayName.toLowerCase().includes(needle) ||
    format.aliases.some((alias) => alias.includes(needle) || normalizeFormatId(alias) === normalized)
  ));
}

export function buildToolCategories(
  environment: ConversionEnvironment,
  availableEngineIds: ReadonlySet<string>
): UxToolCategory[] {
  const runtime = runtimeCapabilitiesFromEngineIds(availableEngineIds, environment);
  const ocrEdges = getAvailableEdges(runtime, { includeOcr: true }).filter((edge) => edge.mode === "ocr");
  const tools: UxToolCategory[] = [];

  if (environment === "web" || availableEngineIds.has("qpdf") || availableEngineIds.has("browser")) {
    tools.push({
      id: "pdf",
      label: "PDF",
      description: "Une, divide, gira, reordena y optimiza PDF.",
      operations: WEB_TOOL_CAPABILITIES.pdf.operations
        .filter((operation) => operation !== "images-to-pdf")
        .map((operation) => ({ id: `pdf:${operation}`, label: labelOperation(operation) })),
    });
  }

  if (environment === "web" || availableEngineIds.has("sharp-image") || availableEngineIds.has("browser") || availableEngineIds.has("background-removal")) {
    tools.push({
      id: "images",
      label: "Imágenes",
      description: "Redimensiona, comprime, recorta, optimiza o limpia metadatos.",
      operations: [
        ...WEB_TOOL_CAPABILITIES.images.operations
          .filter((operation) => operation !== "convert")
          .map((operation) => ({ id: `image:${operation}`, label: labelOperation(operation) })),
        ...(availableEngineIds.has("background-removal") ? [{ id: "image:background-removal", label: "Eliminar fondo" }] : []),
      ],
    });
  }

  if (ocrEdges.length > 0) {
    tools.push({
      id: "ocr",
      label: "Conversión con OCR",
      description: "Extrae texto o genera PDF buscable solo cuando OCR real está disponible.",
      operations: ocrEdges
        .map((edge) => ({ id: edge.id, label: `${displayName(edge.source)} → ${displayName(edge.target)}` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    });
  }

  if (environment === "web" || availableEngineIds.has("data-ts")) {
    tools.push({
      id: "utilities",
      label: "Utilidades",
      description: "Validación y transformaciones auxiliares que no son navegación principal.",
      operations: [{ id: "data:inspect", label: "Inspeccionar datos" }],
    });
  }

  return tools;
}

function labelOperation(operation: string): string {
  const labels: Record<string, string> = {
    merge: "Unir",
    split: "Dividir",
    reorder: "Reordenar",
    rotate: "Girar",
    compress: "Comprimir",
    resize: "Redimensionar",
    "read-exif": "Leer metadata",
    "strip-exif": "Eliminar metadata",
    batch: "Lote",
  };
  return labels[operation] ?? operation;
}
