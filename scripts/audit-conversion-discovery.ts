import fs from "fs";
import path from "path";
import {
  getAllEffectiveSources,
  getAllEffectiveTargets,
  getBestRoute,
  type ConversionRoute,
} from "../src/lib/conversion-routing";
import {
  getDirectConversion,
  runtimeCapabilitiesFromEngineIds,
  type ConversionEnvironment,
} from "../src/lib/conversion-matrix";
import { FORMAT_CATALOG, normalizeFormatId } from "../src/lib/domain/format-catalog";

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

const WEB_ENGINES = new Set(["browser", "data-ts"]);

const PDF_TARGETS = ["docx", "txt", "md", "html", "odt", "epub", "png", "jpg", "tiff"];

function formatRoute(route: ConversionRoute): string {
  return [route.source, ...route.steps.map((step) => step.target)].join(" -> ");
}

function formatRouteList(routes: ConversionRoute[]): string[] {
  return routes.map((route) => `${route.destination}: ${formatRoute(route)}`);
}

function formatSourceRouteList(routes: ConversionRoute[]): string[] {
  return routes.map((route) => `${route.source}: ${formatRoute(route)}`);
}

function uniqueCanonicalFormats(): string[] {
  return Array.from(
    new Set(FORMAT_CATALOG.map((format) => normalizeFormatId(format.outputExtension)).filter((id): id is string => Boolean(id))),
  ).sort();
}

function enginesFor(environment: ConversionEnvironment): ReadonlySet<string> {
  return environment === "web" ? WEB_ENGINES : DESKTOP_ENGINES;
}

function auditEnvironment(environment: ConversionEnvironment) {
  const engines = enginesFor(environment);
  const formats = uniqueCanonicalFormats();
  const byFormat = formats.map((format) => {
    const targets = getAllEffectiveTargets(format, engines, { environment });
    const sources = getAllEffectiveSources(format, engines, { environment });
    return {
      format,
      asSource: {
        directTargets: targets.direct.map((route) => route.destination),
        oneIntermediateTargets: targets.oneIntermediate.map((route) => route.destination),
        twoIntermediateTargets: targets.twoIntermediates.map((route) => route.destination),
        allEffectiveTargets: targets.all.map((route) => route.destination),
        routeDetails: {
          direct: formatRouteList(targets.direct),
          oneIntermediate: formatRouteList(targets.oneIntermediate),
          twoIntermediates: formatRouteList(targets.twoIntermediates),
        },
      },
      asTarget: {
        directSources: sources.direct.map((route) => route.source),
        oneIntermediateSources: sources.oneIntermediate.map((route) => route.source),
        twoIntermediateSources: sources.twoIntermediates.map((route) => route.source),
        allEffectiveSources: sources.all.map((route) => route.source),
        routeDetails: {
          direct: formatSourceRouteList(sources.direct),
          oneIntermediate: formatSourceRouteList(sources.oneIntermediate),
          twoIntermediates: formatSourceRouteList(sources.twoIntermediates),
        },
      },
    };
  });

  const duplicates = byFormat.flatMap((entry) => {
    const targetSet = new Set(entry.asSource.allEffectiveTargets);
    const sourceSet = new Set(entry.asTarget.allEffectiveSources);
    return [
      ...(targetSet.size === entry.asSource.allEffectiveTargets.length ? [] : [`${entry.format}: duplicate targets`]),
      ...(sourceSet.size === entry.asTarget.allEffectiveSources.length ? [] : [`${entry.format}: duplicate sources`]),
    ];
  });

  return {
    environment,
    formatCount: formats.length,
    engines: Array.from(engines).sort(),
    byFormat,
    duplicateProblems: duplicates,
  };
}

function auditPdfWindows() {
  const environment: ConversionEnvironment = "windows";
  const engines = DESKTOP_ENGINES;
  const runtime = runtimeCapabilitiesFromEngineIds(engines, environment);
  const targets = getAllEffectiveTargets("pdf", engines, { environment });
  return {
    directTargets: targets.direct.map((route) => route.destination),
    multistepTargets: [...targets.oneIntermediate, ...targets.twoIntermediates].map((route) => route.destination),
    allEffectiveTargets: targets.all.map((route) => route.destination),
    checkedTargets: Object.fromEntries(PDF_TARGETS.map((target) => {
      const route = getBestRoute("pdf", target, engines, { environment });
      const direct = getDirectConversion("pdf", target, runtime);
      if (route) {
        return [target, {
          status: route.steps.length === 1 ? "AVAILABLE DIRECT" : "AVAILABLE MULTISTEP",
          route: formatRoute(route),
          directAvailability: direct?.availability.state ?? "not-direct",
        }];
      }
      return [target, {
        status: "UNAVAILABLE",
        reason: direct?.availability.reasons.join("; ") || "No effective route within two intermediates",
        directAvailability: direct?.availability.state ?? "not-direct",
      }];
    })),
  };
}

const audit = {
  generatedAt: new Date().toISOString(),
  canonicalFormatCount: uniqueCanonicalFormats().length,
  environments: {
    windows: auditEnvironment("windows"),
    linux: auditEnvironment("linux"),
    web: auditEnvironment("web"),
  },
  pdfWindows: auditPdfWindows(),
};

const outDir = path.resolve("artifacts/conversion-discovery");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "FILESTUDIO_GLOBAL_DISCOVERY_AUDIT.json"), JSON.stringify(audit, null, 2));

type PdfTargetAuditResult =
  | { status: string; route: string; directAvailability: string }
  | { status: string; reason: string; directAvailability: string };

const lines: string[] = [];
lines.push("# FileStudio Global Conversion Discovery Audit");
lines.push("");
lines.push(`Generated: ${audit.generatedAt}`);
lines.push(`Canonical formats audited: ${audit.canonicalFormatCount}`);
lines.push("");
for (const env of ["windows", "linux", "web"] as const) {
  const envAudit = audit.environments[env];
  lines.push(`## ${env.toUpperCase()}`);
  lines.push("");
  lines.push(`Formats: ${envAudit.formatCount}`);
  lines.push(`Duplicate problems: ${envAudit.duplicateProblems.length === 0 ? "PASS" : envAudit.duplicateProblems.join(", ")}`);
  lines.push("");
  for (const entry of envAudit.byFormat) {
    lines.push(`### ${entry.format.toUpperCase()}`);
    lines.push("");
    lines.push("AS SOURCE:");
    lines.push(`DIRECT TARGETS: ${entry.asSource.directTargets.join(", ") || "-"}`);
    lines.push(`ONE-INTERMEDIATE TARGETS: ${entry.asSource.oneIntermediateTargets.join(", ") || "-"}`);
    lines.push(`TWO-INTERMEDIATE TARGETS: ${entry.asSource.twoIntermediateTargets.join(", ") || "-"}`);
    lines.push(`ALL EFFECTIVE TARGETS: ${entry.asSource.allEffectiveTargets.join(", ") || "-"}`);
    lines.push("");
    lines.push("AS TARGET:");
    lines.push(`DIRECT SOURCES: ${entry.asTarget.directSources.join(", ") || "-"}`);
    lines.push(`ONE-INTERMEDIATE SOURCES: ${entry.asTarget.oneIntermediateSources.join(", ") || "-"}`);
    lines.push(`TWO-INTERMEDIATE SOURCES: ${entry.asTarget.twoIntermediateSources.join(", ") || "-"}`);
    lines.push(`ALL EFFECTIVE SOURCES: ${entry.asTarget.allEffectiveSources.join(", ") || "-"}`);
    lines.push("");
  }
}
lines.push("## PDF Windows Regression");
lines.push("");
lines.push(`PDF DIRECT TARGETS: ${audit.pdfWindows.directTargets.join(", ") || "-"}`);
lines.push(`PDF MULTISTEP TARGETS: ${audit.pdfWindows.multistepTargets.join(", ") || "-"}`);
lines.push(`PDF ALL EFFECTIVE TARGETS: ${audit.pdfWindows.allEffectiveTargets.join(", ") || "-"}`);
lines.push("");
for (const [target, result] of Object.entries(audit.pdfWindows.checkedTargets) as Array<[string, PdfTargetAuditResult]>) {
  lines.push(`PDF -> ${target.toUpperCase()}: ${result.status}${"route" in result ? ` — ${result.route}` : ` — ${result.reason}`}`);
}
lines.push("");
fs.writeFileSync(path.join(outDir, "FILESTUDIO_GLOBAL_DISCOVERY_AUDIT.md"), `${lines.join("\n")}\n`);

console.log(JSON.stringify({
  outDir,
  canonicalFormatCount: audit.canonicalFormatCount,
  windowsDuplicateProblems: audit.environments.windows.duplicateProblems.length,
  pdfWindows: audit.pdfWindows,
}, null, 2));
