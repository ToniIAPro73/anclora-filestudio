import { NextRequest, NextResponse } from "next/server";
import { loadDesktopModule } from "@/app/api/_desktop-route-loader";
import type { UniversalFileDescriptor } from "@/lib/domain/descriptors";
import type { CapabilityInfo, CapabilityLossProfile } from "@/lib/domain/unified-analysis";
import { normalizeCapabilityInfo } from "@/lib/domain/unified-analysis";
import type { ConversionCapability, EngineId } from "@/lib/domain/engines";
import type { LossProfile } from "@/lib/domain/operations";
import { normalizeFormatId } from "@/lib/domain/format-catalog";
import {
  EDGE_QUALITY_WEIGHTS,
  getAllEffectiveTargets,
  getRecommendedDestinations,
  qualityBand,
  toConversionRouteSummary,
  ROUTE_CAPABILITY_PREFIX,
} from "@/lib/conversion-routing";
import type { ConversionRoute } from "@/lib/conversion-routing";
import { getWebCapabilitiesForExtension } from "@/lib/browser-conversion";
import { WEB_TOOL_CAPABILITIES } from "@/lib/browser-tools/capabilities";
import { isVercelWeb } from "@/lib/deployment-target";
import { buildConversionUxModel } from "@/lib/ux-v3/conversion-ux-model";
import type { ConversionEnvironment } from "@/lib/conversion-matrix";
import { z } from "zod";

const BodySchema = z.union([
  // Legacy media descriptor (YouTube + local media files)
  z.object({
    descriptor: z.object({}).passthrough(),
  }),
  // Universal descriptor (images, PDF, archives, data)
  z.object({
    universalDescriptor: z.object({}).passthrough(),
  }),
]);

type LegacyConversionCapability = {
  outputFormat: string;
  operation: string;
  enabled: boolean;
  warning?: string;
  reason?: string;
};

async function checkToolAvailability() {
  const fsModule = "fs";
  const configModule = "@/lib/config";
  const [fs, { CONFIG }] = await Promise.all([
    loadDesktopModule<typeof import("fs")>(fsModule),
    loadDesktopModule<typeof import("@/lib/config")>(configModule),
  ]);
  function exists(bin: string) {
    if (!bin.includes("/") && !bin.includes("\\")) return true;
    return fs.existsSync(bin);
  }
  return {
    ffmpeg: exists(CONFIG.media.binaries.ffmpeg),
    ffprobe: exists(CONFIG.media.binaries.ffprobe),
    ytdlp: exists(CONFIG.media.binaries.ytdlp),
  };
}

export async function GET(req?: NextRequest) {
  const url = new URL(req?.url ?? "http://localhost/api/capabilities");
  if (url.searchParams.get("ux") === "v3") {
    if (isVercelWeb()) {
      const environment: ConversionEnvironment = "web";
      const availableEngineIds = new Set(["browser", "data-ts"]);
      return NextResponse.json({
        deploymentTarget: "vercel",
        effectivePlatform: "web",
        execution: "browser",
        uploads: false,
        serverConversions: false,
        ...buildConversionUxModel(environment, availableEngineIds),
      });
    }

    const serverModule = "@/lib/conversion-routing/server";
    const { getAvailableEngineIds } = await loadDesktopModule<
      typeof import("@/lib/conversion-routing/server")
    >(serverModule);
    const availableEngineIds = await getAvailableEngineIds();
    const environment: ConversionEnvironment = process.platform === "win32" ? "windows" : "linux";
    return NextResponse.json({
      deploymentTarget: "desktop",
      effectivePlatform: environment,
      execution: "local",
      uploads: false,
      serverConversions: true,
      ...buildConversionUxModel(environment, availableEngineIds),
    });
  }

  if (isVercelWeb()) {
    return NextResponse.json({
      deploymentTarget: "vercel",
      effectivePlatform: "vercel-web",
      execution: "browser",
      uploads: false,
      serverConversions: false,
      categories: {
        browser: ["jpeg", "jpg", "png", "webp", "pdf", "json", "yaml", "toml", "xml", "csv", "tsv"],
        "desktop-required": [
          "audio",
          "video",
          "document",
          "spreadsheet",
          "presentation",
          "ebook",
          "archive",
          "ocr",
        ],
        "future-service": [],
        unavailable: [],
      },
      tools: WEB_TOOL_CAPABILITIES,
      cloudUploads: false,
    });
  }

  return NextResponse.json({
    deploymentTarget: "desktop",
    message: "Use POST with an analyzed descriptor to compute Desktop capabilities.",
  });
}

/**
 * Convert a legacy media ConversionCapability to a normalized CapabilityInfo
 */
function mediaCapToCapabilityInfo(
  cap: LegacyConversionCapability,
  engineId: import("@/lib/domain/engines").EngineId = "ffmpeg-media"
): CapabilityInfo {
  const isAudioFormat = ["mp3", "m4a", "wav", "flac", "ogg"].includes(cap.outputFormat as string);
  const mobilePortability: import("@/lib/domain/engines").MobilePortability =
    isAudioFormat ? "portable-domain" : "replace-adapter-on-mobile";

  let lossProfile: import("@/lib/domain/unified-analysis").CapabilityLossProfile = "lossy";
  if (cap.operation === "remux") lossProfile = "lossless";
  if (cap.operation === "extract-audio") lossProfile = "lossy";
  if (cap.operation === "normalize-audio") lossProfile = "metadata-risk";
  if (cap.operation === "extract-thumbnail") lossProfile = "lossy";
  if (cap.operation === "extract-subtitles") lossProfile = "lossless";
  if (cap.operation === "create-gif") lossProfile = "lossy";

  const state: import("@/lib/domain/unified-analysis").CapabilityState =
    cap.enabled ? "available" : "unavailable-tool";

  const warnings: string[] = [];
  if (cap.warning) warnings.push(cap.warning);
  if (cap.reason) warnings.push(cap.reason);

  return {
    id: `ffmpeg-${cap.operation}-${cap.outputFormat}`,
    outputFormat: cap.outputFormat as string,
    outputLabel: cap.outputFormat.toUpperCase(),
    state,
    lossProfile,
    engineId,
    mobilePortability,
    warnings,
  };
}

/**
 * Convert a universal engine ConversionCapability to a normalized CapabilityInfo
 */
function universalCapToCapabilityInfo(cap: ConversionCapability): CapabilityInfo {
  return normalizeCapabilityInfo({
    id: cap.id,
    outputFormat: cap.outputFormat,
    label: cap.label,
    outputLabel: cap.label,
    lossProfile: cap.lossProfile === "none" ? "lossless" :
      (cap.lossProfile as import("@/lib/domain/unified-analysis").CapabilityLossProfile),
    engineId: cap.engineId,
    mobilePortability: cap.mobilePortability,
    warnings: cap.warnings,
    unavailableReason: cap.unavailableReason,
    state: cap.state === "available" ? "available" :
      cap.state === "unsupported-input" ? "unsupported" :
      cap.state === "unsafe" ? "unsupported" :
      cap.state === "experimental" ? "available" :
      "unavailable-tool",
  });
}

// ── Conversion routing ────────────────────────────────────────────────────────

/** Map an operation LossProfile to the client-facing CapabilityLossProfile. */
const ROUTE_LOSS_TO_CAPABILITY: Record<LossProfile, CapabilityLossProfile> = {
  lossless: "lossless",
  "lossy-controlled": "lossy",
  lossy: "lossy",
  "structural-risk": "layout-risk",
};

function worstStepLossProfile(route: ConversionRoute): LossProfile {
  return route.steps.reduce<LossProfile>(
    (worst, step) =>
      EDGE_QUALITY_WEIGHTS[step.lossProfile] < EDGE_QUALITY_WEIGHTS[worst]
        ? step.lossProfile
        : worst,
    route.steps[0]?.lossProfile ?? "lossy"
  );
}

/**
 * Builds the Desktop conversion capabilities from the global route discovery
 * graph. Engine-local capabilities are used only as metadata hints; discovery
 * itself is FileStudio-level, not engine-level.
 */
async function buildRouteDiscoveredCapabilities(
  normalizedCaps: CapabilityInfo[],
  inputFormat: string
): Promise<CapabilityInfo[]> {
  try {
    const serverModule = "@/lib/conversion-routing/server";
    const { getAvailableEngineIds } = await loadDesktopModule<
      typeof import("@/lib/conversion-routing/server")
    >(serverModule);
    const availableEngineIds = await getAvailableEngineIds();

    const canonicalInput = normalizeFormatId(inputFormat) ?? inputFormat;
    const environment: ConversionEnvironment = process.platform === "win32" ? "windows" : "linux";
    const routes = getAllEffectiveTargets(canonicalInput, availableEngineIds, { environment }).all;
    if (routes.length === 0) return normalizedCaps;

    const recommendedSet = getRecommendedDestinations(inputFormat, routes);
    const metadataByDestination = new Map(
      normalizedCaps.map((cap) => [normalizeFormatId(cap.outputFormat) ?? cap.outputFormat, cap])
    );

    return routes
      .filter((route) => qualityBand(route.score) !== "not-recommended")
      .map((route) => {
        const metadata = metadataByDestination.get(route.destination);
        const warnings = [
          ...(metadata?.warnings ?? []),
          ...(route.steps.length > 1 ? [`Conversión en ${route.steps.length} pasos.`] : []),
        ];
      return {
        id: `${ROUTE_CAPABILITY_PREFIX}${canonicalInput}-${route.destination}`,
        outputFormat: route.destination,
        outputLabel: metadata?.outputLabel ?? route.destination.toUpperCase(),
        state: "available",
        lossProfile: ROUTE_LOSS_TO_CAPABILITY[worstStepLossProfile(route)],
        engineId: (route.steps[0]?.engineId ?? metadata?.engineId ?? "data-ts") as EngineId,
        mobilePortability: metadata?.mobilePortability ?? "desktop-only",
        warnings,
        route: toConversionRouteSummary(route, recommendedSet.has(route.destination)),
      };
    });
  } catch (error) {
    console.error("[capabilities] Route discovery failed, returning base capabilities:", error);
    return normalizedCaps;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Falta el descriptor. Envía 'descriptor' (media) o 'universalDescriptor' (universal).", code: "INVALID_INPUT" }, { status: 400 });
    }

    // Universal path — new engines (Sharp, data, qpdf, 7-Zip, pandoc, LibreOffice)
    if ("universalDescriptor" in parsed.data) {
      const descriptor = parsed.data.universalDescriptor as unknown as UniversalFileDescriptor;
      if (isVercelWeb()) {
        const input = (descriptor.detectedFormat ?? descriptor.extension ?? "").toLowerCase();
        if (["jpg", "jpeg", "png", "webp"].includes(input)) {
          const capabilities: CapabilityInfo[] = WEB_TOOL_CAPABILITIES.images.operations.map((operation) => ({
            id: `browser-image-${operation}`,
            outputFormat: operation === "read-exif" ? input : "jpeg,png,webp",
            outputLabel: operation,
            state: "available",
            lossProfile: operation === "read-exif" ? "lossless" : "metadata-risk",
            engineId: "data-ts",
            mobilePortability: "portable-domain",
            warnings: ["Se ejecuta localmente en el navegador; no hay subida de archivos."],
          }));
          return NextResponse.json({
            capabilities,
            recommended: capabilities[0] ?? null,
            inputFormat: input,
            inputCategory: "image",
            deploymentTarget: "vercel",
            execution: "browser",
            uploads: false,
            serverConversions: false,
          });
        }
        if (input === "pdf") {
          const capabilities: CapabilityInfo[] = WEB_TOOL_CAPABILITIES.pdf.operations.map((operation) => ({
            id: `browser-pdf-${operation}`,
            outputFormat: operation === "split" ? "pdf,zip" : "pdf",
            outputLabel: operation,
            state: "available",
            lossProfile: "metadata-risk",
            engineId: "data-ts",
            mobilePortability: "portable-domain",
            warnings: ["Se ejecuta localmente en el navegador; no hay subida de archivos."],
          }));
          return NextResponse.json({
            capabilities,
            recommended: capabilities[0] ?? null,
            inputFormat: input,
            inputCategory: "pdf",
            deploymentTarget: "vercel",
            execution: "browser",
            uploads: false,
            serverConversions: false,
          });
        }
        const normalizedCaps = getWebCapabilitiesForExtension(
          input
        );
        const recommended = normalizedCaps.find((cap) => cap.state === "available") ?? null;
        return NextResponse.json({
          capabilities: normalizedCaps,
          recommended,
          inputFormat: input || "unknown",
          inputCategory: descriptor.category,
          deploymentTarget: "vercel",
          execution: "browser",
          uploads: false,
          serverConversions: false,
        });
      }

      const registryModule = "@/lib/engines/registry";
      const { getCapabilities } = await loadDesktopModule<typeof import("@/lib/engines/registry")>(registryModule);
      const capabilities = await getCapabilities(descriptor);

      // Normalize to CapabilityInfo
      const normalizedCaps: CapabilityInfo[] = capabilities.map(universalCapToCapabilityInfo);

      // Route discovery is global: direct + 1/2 intermediate destinations.
      const inputFormat = descriptor.detectedFormat ?? descriptor.extension ?? "unknown";
      const enrichedCaps = await buildRouteDiscoveredCapabilities(normalizedCaps, inputFormat);

      const recommended = enrichedCaps.find((c) => c.state === "available" && c.route?.recommended) ??
        enrichedCaps.find((c) => c.state === "available") ??
        null;

      return NextResponse.json({
        capabilities: enrichedCaps,
        recommended,
        inputFormat,
        inputCategory: descriptor.category,
      });
    }

    // Legacy media path — FFmpeg engine
    if (isVercelWeb()) {
      return NextResponse.json({
        capabilities: [],
        recommended: null,
        inputFormat: "unknown",
        inputCategory: "desktop-required",
        deploymentTarget: "vercel",
      });
    }

    const mediaModule = "@/lib/media/supported-conversions";
    const { getSupportedConversions, getRecommendedConversion } =
      await loadDesktopModule<typeof import("@/lib/media/supported-conversions")>(mediaModule);
    type MediaDescriptor = import("@/lib/media/probe").MediaDescriptor;
    const descriptor = parsed.data.descriptor as unknown as MediaDescriptor;
    const tools = await checkToolAvailability();
    const capabilities = getSupportedConversions(descriptor, tools);
    const recommended = getRecommendedConversion(descriptor, capabilities);

    // Normalize to CapabilityInfo
    const normalizedCaps: CapabilityInfo[] = capabilities.map((cap) => mediaCapToCapabilityInfo(cap));

    const recommendedCapInfo = recommended
      ? mediaCapToCapabilityInfo(recommended)
      : null;

    return NextResponse.json({
      capabilities: normalizedCaps,
      recommended: recommendedCapInfo,
      inputFormat: descriptor.container ?? "unknown",
      inputCategory: (descriptor.hasVideo ? "video" : "audio") as string,
    });
  } catch (error: unknown) {
    console.error("Capabilities API error:", error);
    return NextResponse.json({ error: "Error calculando capacidades.", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
