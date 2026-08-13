import fs from "fs";
import path from "path";
import {
  getAllEffectiveSources,
  getAllEffectiveTargets,
  getBestRoute,
} from "../src/lib/conversion-routing";
import { FORMAT_CATALOG, normalizeFormatId } from "../src/lib/domain/format-catalog";

type Tier = "TIER 1" | "TIER 2" | "TIER 3";
type Platform = "windows" | "linux" | "web";
type Decision = "ADOPT" | "REJECT" | "INVESTIGATE";

interface TierRequirement {
  source: string;
  target: string;
  tier: Tier;
  userValue: "high" | "medium" | "specialist";
  qualityExpectation: "high" | "medium" | "low";
  notes: string;
}

const OUT_DIR = path.resolve("artifacts/conversion-coverage");
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
const WEB_ENGINES = new Set(["browser", "data-ts"]);

const canonicalFormats = [...new Set(FORMAT_CATALOG.map((f) => f.outputExtension))]
  .map((format) => normalizeFormatId(format) ?? format)
  .sort();
const categoryByFormat = new Map(FORMAT_CATALOG.map((f) => [f.outputExtension, f.category]));

function req(
  source: string,
  target: string,
  tier: Tier,
  userValue: TierRequirement["userValue"],
  qualityExpectation: TierRequirement["qualityExpectation"],
  notes: string,
): TierRequirement {
  return { source, target, tier, userValue, qualityExpectation, notes };
}

function crossReq(
  sources: readonly string[],
  targets: readonly string[],
  tier: Tier,
  userValue: TierRequirement["userValue"],
  qualityExpectation: TierRequirement["qualityExpectation"],
  notes: string,
): TierRequirement[] {
  const out: TierRequirement[] = [];
  for (const source of sources) {
    for (const target of targets) {
      const s = normalizeFormatId(source) ?? source;
      const t = normalizeFormatId(target) ?? target;
      if (s !== t && canonicalFormats.includes(s) && canonicalFormats.includes(t)) {
        out.push(req(s, t, tier, userValue, qualityExpectation, notes));
      }
    }
  }
  return out;
}

const tierRequirements: TierRequirement[] = [
  // Documents / plain text.
  ...crossReq(["pdf"], ["docx", "txt", "md", "html"], "TIER 1", "high", "medium", "Expected from a competitive document converter; PDF input quality depends on text/scanned/mixed analysis."),
  ...crossReq(["docx"], ["pdf", "txt", "md", "html", "epub"], "TIER 1", "high", "high", "Core Office/document export workflow."),
  ...crossReq(["md"], ["docx", "pdf", "html", "epub"], "TIER 1", "high", "high", "Common writing/publishing workflow."),
  ...crossReq(["html"], ["pdf", "docx", "md", "epub"], "TIER 1", "high", "medium", "Common web/document publishing workflow."),
  ...crossReq(["odt"], ["docx", "pdf"], "TIER 1", "high", "high", "Office interoperability."),
  ...crossReq(["docx"], ["odt"], "TIER 1", "high", "high", "Office interoperability."),
  ...crossReq(["rtf"], ["docx", "pdf"], "TIER 1", "high", "medium", "Legacy document compatibility."),
  ...crossReq(["docx"], ["rtf"], "TIER 1", "high", "medium", "Legacy document compatibility."),
  ...crossReq(["txt"], ["docx", "pdf", "md", "html"], "TIER 1", "high", "medium", "Plain-text publishing and office handoff."),
  ...crossReq(["xlsx", "xls", "ods"], ["pdf", "xlsx", "ods"], "TIER 1", "high", "high", "Spreadsheet export/interoperability."),
  ...crossReq(["pptx", "ppt", "odp"], ["pdf", "pptx"], "TIER 1", "high", "high", "Presentation export/interoperability."),

  // Images.
  ...crossReq(["png", "jpg", "webp"], ["png", "jpg", "webp"], "TIER 1", "high", "high", "Main image conversion set."),
  ...crossReq(["png", "jpg", "webp", "tiff"], ["pdf"], "TIER 1", "high", "medium", "Image to PDF is expected in a general converter."),
  ...crossReq(["tiff", "gif", "avif"], ["png", "jpg", "webp"], "TIER 2", "medium", "medium", "Useful image interoperability beyond the core set."),
  ...crossReq(["png", "jpg", "webp"], ["avif", "tiff"], "TIER 2", "medium", "medium", "Extended image export formats."),

  // Audio / video.
  ...crossReq(["mp3", "wav", "flac", "m4a", "ogg", "aac"], ["mp3", "wav", "flac", "m4a", "ogg", "aac"], "TIER 1", "high", "high", "Core audio transcoding set."),
  ...crossReq(["mp4", "webm", "mkv", "mov", "avi"], ["mp4", "webm", "mkv"], "TIER 1", "high", "high", "Core video transcoding/remux set."),
  ...crossReq(["mp4", "webm", "mkv", "mov", "avi"], ["mp3", "wav", "flac", "m4a", "ogg"], "TIER 1", "high", "high", "Extract audio from video."),
  ...crossReq(["wmv", "ts"], ["mp4", "webm", "mkv"], "TIER 2", "medium", "medium", "Legacy/broadcast video interoperability."),
  ...crossReq(["mp4", "webm", "mkv", "mov", "avi"], ["gif"], "TIER 2", "medium", "medium", "Video clip to animated GIF."),

  // Ebooks.
  ...crossReq(["epub", "mobi", "azw3"], ["epub", "mobi", "azw3", "pdf"], "TIER 1", "high", "medium", "Common ebook interoperability."),
  ...crossReq(["docx", "html", "txt", "md"], ["epub"], "TIER 1", "high", "medium", "Authoring to ebook."),
  ...crossReq(["epub"], ["docx", "txt", "html", "md"], "TIER 2", "medium", "medium", "Ebook extraction/editing workflow."),

  // Data.
  ...crossReq(["json", "yaml", "xml", "csv", "tsv"], ["json", "yaml", "xml", "csv", "tsv"], "TIER 1", "high", "medium", "Core structured-data interchange."),
  ...crossReq(["toml"], ["json", "yaml"], "TIER 2", "medium", "medium", "Config data interoperability."),
  ...crossReq(["json", "yaml"], ["toml"], "TIER 2", "medium", "medium", "Config data interoperability."),

  // Archives.
  ...crossReq(["zip", "7z", "tar"], ["zip", "7z", "tar"], "TIER 1", "high", "high", "Core archive repackaging."),
  ...crossReq(["gz", "bz2", "xz"], ["zip", "tar"], "TIER 2", "medium", "medium", "Compressed tar/member repackaging."),

  // Specialist paths.
  ...crossReq(["pdf"], ["epub", "odt"], "TIER 3", "specialist", "low", "PDF reflow to editable/ebook formats is high-risk without layout extraction."),
  ...crossReq(["png", "jpg", "tiff", "webp"], ["txt"], "TIER 3", "specialist", "low", "OCR is useful but quality depends heavily on image source and language."),
];

function uniqReqs(requirements: TierRequirement[]): TierRequirement[] {
  const seen = new Set<string>();
  const out: TierRequirement[] = [];
  for (const item of requirements) {
    const key = `${item.source}->${item.target}:${item.tier}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

const requirements = uniqReqs(tierRequirements);

function routeKind(source: string, target: string, platform: Platform) {
  const engines = platform === "web" ? WEB_ENGINES : DESKTOP_ENGINES;
  const route = getBestRoute(source, target, engines, { environment: platform });
  if (!route) return { status: "missing" as const, route: null, routeText: null };
  const kind = route.intermediateFormats.length === 0
    ? "direct"
    : route.intermediateFormats.length === 1
      ? "one-intermediate"
      : "two-intermediate";
  return {
    status: "supported" as const,
    kind,
    route,
    routeText: [route.source, ...route.steps.map((step) => step.target)].join(" -> "),
    enginePath: route.steps.map((step) => step.engineId).join(" + "),
    risk: route.risk,
    score: route.score,
  };
}

function blockerFor(source: string, target: string): string {
  if (source === "pdf" && ["docx", "md", "html", "odt", "epub"].includes(target)) return "No structured PDF extraction/reflow adapter is implemented.";
  if (source === "pdf" && target === "txt") return "Current PDF OCR edge exists only in OCR mode and is excluded from standard discovery; text-PDF extraction via pdftotext is not implemented.";
  if (target === "pdf" && ["html", "md", "txt"].includes(source)) return "Pandoc/LibreOffice path exists for some documents, but the needed direct edge is not certified for this source.";
  if (target === "epub" && ["md", "txt"].includes(source)) return "Could route through HTML/Calibre or Pandoc, but no certified edge exists yet.";
  if (["aac", "wmv", "ts"].includes(source) || ["aac", "wmv", "ts"].includes(target)) return "Format exists in catalog but current FFmpeg matrix omits it.";
  if (target === "pdf" && ["png", "jpg", "webp", "tiff"].includes(source)) return "Desktop image-to-PDF adapter is not implemented; web browser-only edge does not cover Desktop.";
  if (source === "docx" && target === "rtf") return "LibreOffice likely supports export, but the matrix/adapter has no certified DOCX->RTF edge.";
  if (source === "odp" && ["pdf", "pptx"].includes(target)) return "LibreOffice likely supports ODP export, but ODP edges are not declared/certified.";
  return "No effective canonical route within two intermediates.";
}

function engineGapFor(source: string, target: string) {
  const conversion = `${source}->${target}`;
  if (source === "pdf" && target === "docx") return {
    currentPipeline: "None",
    currentBlocker: "No PDF layout extraction to DOCX adapter.",
    existingEngineCanHandle: "PARTIAL",
    existingEngineCandidates: ["LibreOffice PDF import is not reliable for headless production", "Poppler can extract text/raster but not DOCX layout"],
    newRequired: true,
    candidates: ["pdf2docx", "PyMuPDF/MuPDF commercial", "Unstructured/Docling pipeline"],
    expectedQuality: "MEDIUM",
    complexity: "MEDIUM",
    portableImpact: "MEDIUM",
    recommendation: "INVESTIGATE pdf2docx for MVP; avoid AGPL MuPDF/PyMuPDF unless commercial licensing is accepted.",
  };
  if (source === "pdf" && ["txt", "html"].includes(target)) return {
    currentPipeline: "Poppler raster/OCR only; no text extraction route in standard conversion",
    currentBlocker: `No ${conversion} adapter bound to Poppler text/html tools.`,
    existingEngineCanHandle: "YES",
    existingEngineCandidates: ["Poppler pdftotext", "Poppler pdftohtml"],
    newRequired: false,
    candidates: [],
    expectedQuality: source === "pdf" && target === "txt" ? "HIGH for text PDFs, LOW for scanned PDFs without OCR" : "MEDIUM",
    complexity: "LOW",
    portableImpact: "LOW",
    recommendation: "ADOPT existing Poppler utilities after versioned Windows bundle confirms pdftotext/pdftohtml are included.",
  };
  if (source === "pdf" && target === "md") return {
    currentPipeline: "None",
    currentBlocker: "Needs PDF text/layout extraction followed by Markdown normalization.",
    existingEngineCanHandle: "PARTIAL",
    existingEngineCandidates: ["Poppler pdftotext + Markdown adapter", "Pandoc after HTML extraction"],
    newRequired: false,
    candidates: ["MarkItDown as optional future library"],
    expectedQuality: "MEDIUM",
    complexity: "MEDIUM",
    portableImpact: "LOW to MEDIUM",
    recommendation: "ADOPT Poppler text extraction first; INVESTIGATE MarkItDown for richer Markdown.",
  };
  if (target === "pdf" && ["html", "md", "txt"].includes(source)) return {
    currentPipeline: "Partial document toolchain",
    currentBlocker: "No certified direct edge for this source/target combination.",
    existingEngineCanHandle: "YES",
    existingEngineCandidates: ["Pandoc", "LibreOffice", "Chromium print pipeline for HTML"],
    newRequired: false,
    candidates: [],
    expectedQuality: "MEDIUM to HIGH",
    complexity: "LOW to MEDIUM",
    portableImpact: "LOW",
    recommendation: "QUICK WIN: add only after E2E probes with representative fixtures.",
  };
  if (target === "epub" && ["md", "txt"].includes(source)) return {
    currentPipeline: "Possible via Pandoc/HTML/Calibre but not certified",
    currentBlocker: "No canonical edge has been validated.",
    existingEngineCanHandle: "YES",
    existingEngineCandidates: ["Pandoc", "Calibre"],
    newRequired: false,
    candidates: [],
    expectedQuality: "MEDIUM",
    complexity: "LOW",
    portableImpact: "LOW",
    recommendation: "QUICK WIN candidate pending E2E probes.",
  };
  if (source === "docx" && target === "rtf") return {
    currentPipeline: "LibreOffice installed, but matrix omits DOCX->RTF.",
    currentBlocker: "No certified edge/probe for DOCX->RTF.",
    existingEngineCanHandle: "YES",
    existingEngineCandidates: ["LibreOffice"],
    newRequired: false,
    candidates: [],
    expectedQuality: "MEDIUM",
    complexity: "LOW",
    portableImpact: "LOW",
    recommendation: "QUICK WIN candidate pending real DOCX->RTF probe.",
  };
  if (source === "odp" && ["pdf", "pptx"].includes(target)) return {
    currentPipeline: "LibreOffice installed, but presentation matrix omits ODP source.",
    currentBlocker: `No certified edge/probe for ${source}->${target}.`,
    existingEngineCanHandle: "YES",
    existingEngineCandidates: ["LibreOffice"],
    newRequired: false,
    candidates: [],
    expectedQuality: "HIGH",
    complexity: "LOW",
    portableImpact: "LOW",
    recommendation: "QUICK WIN candidate pending real ODP probe.",
  };
  if (target === "pdf" && ["png", "jpg", "webp", "tiff"].includes(source)) return {
    currentPipeline: "pdf-lib is already installed; browser image-to-PDF exists only for Web.",
    currentBlocker: "No Desktop adapter for image embedding into PDF.",
    existingEngineCanHandle: "YES",
    existingEngineCandidates: ["pdf-lib", "Sharp for image normalization"],
    newRequired: false,
    candidates: [],
    expectedQuality: "MEDIUM",
    complexity: "LOW",
    portableImpact: "LOW",
    recommendation: "QUICK WIN candidate pending image->PDF adapter and E2E probes.",
  };
  if (["aac", "wmv", "ts"].includes(source) || ["aac", "wmv", "ts"].includes(target)) return {
    currentPipeline: "FFmpeg installed but matrix omits one side of the format.",
    currentBlocker: "Canonical edge not declared/certified.",
    existingEngineCanHandle: "YES",
    existingEngineCandidates: ["FFmpeg/FFprobe"],
    newRequired: false,
    candidates: [],
    expectedQuality: "HIGH",
    complexity: "LOW",
    portableImpact: "LOW",
    recommendation: "QUICK WIN candidate pending real media probes.",
  };
  return {
    currentPipeline: "None",
    currentBlocker: blockerFor(source, target),
    existingEngineCanHandle: "NO",
    existingEngineCandidates: [],
    newRequired: true,
    candidates: [],
    expectedQuality: "UNKNOWN",
    complexity: "MEDIUM",
    portableImpact: "UNKNOWN",
    recommendation: "INVESTIGATE after Tier 1 blockers with clearer user value.",
  };
}

const dependencyCandidates = [
  {
    name: "Poppler text/html utilities (pdftotext, pdftohtml)",
    classification: "ALREADY BUNDLED / SYSTEM OPTIONAL",
    decision: "ADOPT" as Decision,
    coverageGain: ["PDF->TXT", "PDF->HTML", "PDF->MD via text/html normalization"],
    qualityGain: "High for text PDFs; low for scanned PDFs unless OCR is selected.",
    license: "GPL family through Poppler distribution",
    source: "https://poppler.freedesktop.org/",
    portableImpact: "Low if utilities are already in the Windows Poppler bundle; otherwise low/medium to include additional Poppler executables.",
    security: "Untrusted PDF parser; run with timeouts, temp isolation and output validation.",
    rationale: "Same toolchain family as existing Poppler/pdftoppm; best immediate PDF text extraction path.",
  },
  {
    name: "pdf2docx",
    classification: "NEW PYTHON LIBRARY",
    decision: "INVESTIGATE" as Decision,
    coverageGain: ["PDF->DOCX"],
    qualityGain: "Medium for text/layout PDFs; weak for scanned PDFs without OCR.",
    license: "MIT per current upstream notice; project status says no longer actively maintained.",
    source: "https://github.com/artifexsoftware/pdf2docx",
    portableImpact: "Medium: Python runtime/library packaging, transitive dependencies and Windows smoke needed.",
    security: "PDF parser surface plus Python dependency supply chain; strict sandbox/temp cleanup required.",
    rationale: "Most direct permissive candidate for PDF->DOCX, but maintenance status blocks immediate adoption.",
  },
  {
    name: "OCRmyPDF",
    classification: "NEW PYTHON LIBRARY / SYSTEM OPTIONAL",
    decision: "INVESTIGATE" as Decision,
    coverageGain: ["Scanned PDF preprocessing", "searchable PDF", "better OCR route for PDF->TXT/DOCX pipelines"],
    qualityGain: "High for OCR preprocessing, not an editable DOCX converter by itself.",
    license: "MPL-2.0 for OCRmyPDF core.",
    source: "https://ocrmypdf.readthedocs.io/",
    portableImpact: "High: Python, Ghostscript/Tesseract dependencies and Windows packaging complexity.",
    security: "Untrusted PDF/image pipeline; high need for resource limits and temp isolation.",
    rationale: "Strong scanned-PDF foundation, but should follow text-PDF extraction work.",
  },
  {
    name: "MarkItDown",
    classification: "NEW PYTHON LIBRARY",
    decision: "INVESTIGATE" as Decision,
    coverageGain: ["PDF/DOCX/HTML/EPUB->MD"],
    qualityGain: "Medium; optimized for Markdown extraction/RAG rather than layout-preserving conversion.",
    license: "Open-source project; exact version/license must be locked before adoption.",
    source: "https://github.com/microsoft/markitdown",
    portableImpact: "Medium: Python packaging and optional plugin decisions.",
    security: "Avoid network/LLM plugins by default; local-only mode required.",
    rationale: "Promising Markdown coverage boost if kept local and dependency footprint is acceptable.",
  },
  {
    name: "MuPDF / PyMuPDF",
    classification: "NEW NATIVE BINARY / NEW PYTHON LIBRARY",
    decision: "REJECT" as Decision,
    coverageGain: ["PDF parsing/extraction/rendering"],
    qualityGain: "High potential.",
    license: "AGPL/commercial.",
    source: "https://mupdf.readthedocs.io/en/1.27.0/license.html",
    portableImpact: "Medium.",
    security: "Untrusted PDF parser; strong isolation required.",
    rationale: "Licensing risk is too high for default Desktop bundling unless Anclora chooses a commercial license.",
  },
  {
    name: "wkhtmltopdf / wkhtmltoimage",
    classification: "NEW NATIVE BINARY",
    decision: "REJECT" as Decision,
    coverageGain: ["HTML->PDF", "HTML->PNG"],
    qualityGain: "Medium for old WebKit rendering.",
    license: "LGPLv3, but project warns about stale WebKit/untrusted HTML risk.",
    source: "https://wkhtmltopdf.org/status.html",
    portableImpact: "Medium to high.",
    security: "Project warns not to use with untrusted HTML.",
    rationale: "Security/maintenance profile is a bad fit for user-supplied files.",
  },
];

function summarizeRequirement(requirement: TierRequirement) {
  const desktop = routeKind(requirement.source, requirement.target, "linux");
  return {
    ...requirement,
    windows: routeKind(requirement.source, requirement.target, "windows"),
    linux: desktop,
    web: routeKind(requirement.source, requirement.target, "web"),
    gap: desktop.status === "supported" ? null : engineGapFor(requirement.source, requirement.target),
  };
}

const requirementsAudit = requirements.map(summarizeRequirement);

function tierMetrics(tier: Tier) {
  const reqs = requirementsAudit.filter((item) => item.tier === tier);
  const supported = reqs.filter((item) => item.linux.status === "supported");
  return {
    required: reqs.length,
    supported: supported.length,
    coveragePercent: reqs.length === 0 ? 100 : Math.round((supported.length / reqs.length) * 1000) / 10,
  };
}

function formatAudit(format: string) {
  const targets = getAllEffectiveTargets(format, DESKTOP_ENGINES, { environment: "linux" });
  const sources = getAllEffectiveSources(format, DESKTOP_ENGINES, { environment: "linux" });
  const missing = requirementsAudit
    .filter((item) => item.source === format && item.linux.status !== "supported")
    .map((item) => ({
      target: item.target,
      tier: item.tier,
      blocker: item.gap?.currentBlocker ?? blockerFor(item.source, item.target),
      recommendation: item.gap?.recommendation ?? "INVESTIGATE",
    }));
  return {
    format,
    category: categoryByFormat.get(format) ?? "unknown",
    asSource: {
      directTargets: targets.direct.map((route) => route.destination),
      oneIntermediateTargets: targets.oneIntermediate.map((route) => route.destination),
      twoIntermediateTargets: targets.twoIntermediates.map((route) => route.destination),
      allEffectiveTargets: targets.all.map((route) => route.destination),
    },
    asTarget: {
      directSources: sources.direct.map((route) => route.source),
      oneIntermediateSources: sources.oneIntermediate.map((route) => route.source),
      twoIntermediateSources: sources.twoIntermediates.map((route) => route.source),
      allEffectiveSources: sources.all.map((route) => route.source),
    },
    highValueMissingConversions: missing,
    engineGap: missing.length > 0 ? "See highValueMissingConversions and engine gap analysis." : "No Tier gap identified by this audit.",
    adapterGap: missing.some((item) => item.blocker.includes("adapter")) ? "Adapter missing" : "No primary adapter gap identified",
    runtimeGap: "None assumed for Linux desktop audit; runtime-specific differences are recorded per requirement.",
    qualityRisk: missing.some((item) => item.tier === "TIER 1") ? "Tier 1 gaps may reduce competitive coverage." : "Low",
  };
}

const formatAudits = canonicalFormats.map(formatAudit);

const effectivePairs = new Set<string>();
const directPairs = new Set<string>();
const multistepPairs = new Set<string>();
for (const format of canonicalFormats) {
  const routes = getAllEffectiveTargets(format, DESKTOP_ENGINES, { environment: "linux" });
  for (const route of routes.all) {
    const key = `${route.source}->${route.destination}`;
    effectivePairs.add(key);
    if (route.intermediateFormats.length === 0) directPairs.add(key);
    else multistepPairs.add(key);
  }
}

const quickWins = requirementsAudit
  .filter((item) => item.linux.status !== "supported" && item.gap?.newRequired === false)
  .map((item) => ({
    conversion: `${item.source}->${item.target}`,
    tier: item.tier,
    existingEngineCandidates: item.gap?.existingEngineCandidates ?? [],
    expectedQuality: item.gap?.expectedQuality,
    implementationComplexity: item.gap?.complexity,
    recommendation: item.gap?.recommendation,
  }));

const tier1NewDeps = requirementsAudit
  .filter((item) => item.tier === "TIER 1" && item.linux.status !== "supported" && item.gap?.newRequired)
  .map((item) => ({
    conversion: `${item.source}->${item.target}`,
    blocker: item.gap?.currentBlocker,
    candidates: item.gap?.candidates,
    recommendation: item.gap?.recommendation,
  }));

const familyGroups: Record<string, string[]> = {
  DOCUMENTS: ["docx", "doc", "odt", "rtf", "txt", "md", "html", "rst", "tex", "pdf"],
  IMAGES: ["png", "jpg", "webp", "tiff", "gif", "avif"],
  AUDIO: ["mp3", "wav", "flac", "aac", "m4a", "ogg"],
  VIDEO: ["mp4", "mkv", "webm", "mov", "avi", "wmv", "ts"],
  EBOOKS: ["epub", "mobi", "azw3", "pdf", "html", "txt", "docx"],
  DATA: ["csv", "json", "xml", "yaml", "toml", "tsv"],
  ARCHIVES: ["zip", "7z", "tar", "gz", "bz2", "xz"],
};

function familyCoverage(formats: string[]) {
  const pairs = requirementsAudit.filter((item) => formats.includes(item.source) && formats.includes(item.target));
  const supported = pairs.filter((item) => item.linux.status === "supported");
  return {
    required: pairs.length,
    supported: supported.length,
    coveragePercent: pairs.length === 0 ? 100 : Math.round((supported.length / pairs.length) * 1000) / 10,
    biggestGaps: pairs.filter((item) => item.linux.status !== "supported").slice(0, 12).map((item) => `${item.source}->${item.target}`),
  };
}

const audit = {
  generatedAt: new Date().toISOString(),
  canonicalFormats: canonicalFormats.length,
  totalPossibleOrderedPairs: canonicalFormats.length * (canonicalFormats.length - 1),
  directSupportedPairs: directPairs.size,
  multistepSupportedPairs: multistepPairs.size,
  totalEffectivePairs: effectivePairs.size,
  tierMetrics: {
    tier1: tierMetrics("TIER 1"),
    tier2: tierMetrics("TIER 2"),
    tier3: tierMetrics("TIER 3"),
  },
  recommendedCompetitiveThreshold: {
    tier1CoveragePercent: 90,
    rationale: "Tier 1 is user-visible competitive coverage; Tier 2/3 should not block UX v4 but should guide roadmap sequencing.",
  },
  formatAudits,
  requirementsAudit,
  familyCoverage: Object.fromEntries(Object.entries(familyGroups).map(([family, formats]) => [family, familyCoverage(formats)])),
  quickWinsWithoutNewDependencies: quickWins,
  tier1RequiringNewDependencies: tier1NewDeps,
  dependencyCandidates,
  decisions: {
    adopt: dependencyCandidates.filter((dep) => dep.decision === "ADOPT"),
    reject: dependencyCandidates.filter((dep) => dep.decision === "REJECT"),
    investigate: dependencyCandidates.filter((dep) => dep.decision === "INVESTIGATE"),
  },
  sourceContract: {
    explicitSourceRule: "Explicit source route capability must match detected canonical input format before execution.",
    autoSourceRule: "Auto-source flows accept any analyzed source that can reach the chosen target through global discovery.",
  },
  executionAlignment: {
    rootCause: "Diagnostics and Poppler execution used separate binary resolver implementations.",
    fix: "PopplerEngine now delegates bundled/PATH resolution to the diagnostics Poppler resolver.",
    windowsCase: "When bundled Poppler is healthy, diagnostics and execution resolve the same tools/poppler/Library/bin/pdftoppm.exe layout.",
  },
};

function renderTable(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, "<br>")).join(" | ")} |`),
  ].join("\n");
}

function renderCoverageMd(): string {
  const tier = audit.tierMetrics;
  const pdf = formatAudits.find((item) => item.format === "pdf")!;
  const missingRows = requirementsAudit
    .filter((item) => item.linux.status !== "supported")
    .slice(0, 80)
    .map((item) => [
      `${item.source}->${item.target}`,
      item.tier,
      item.gap?.currentBlocker ?? blockerFor(item.source, item.target),
      item.gap?.recommendation ?? "INVESTIGATE",
    ]);

  return `# FileStudio Conversion Coverage Audit

Generated: ${audit.generatedAt}

## Metrics

${renderTable(["Metric", "Value"], [
  ["Canonical formats", String(audit.canonicalFormats)],
  ["Total possible ordered pairs", String(audit.totalPossibleOrderedPairs)],
  ["Direct supported pairs", String(audit.directSupportedPairs)],
  ["Multistep supported pairs", String(audit.multistepSupportedPairs)],
  ["Total effective pairs", String(audit.totalEffectivePairs)],
  ["Tier 1 required", String(tier.tier1.required)],
  ["Tier 1 supported", String(tier.tier1.supported)],
  ["Tier 1 coverage", `${tier.tier1.coveragePercent}%`],
  ["Tier 2 required", String(tier.tier2.required)],
  ["Tier 2 supported", String(tier.tier2.supported)],
  ["Tier 3 required", String(tier.tier3.required)],
  ["Tier 3 supported", String(tier.tier3.supported)],
])}

Recommended competitive target: Tier 1 coverage >= ${audit.recommendedCompetitiveThreshold.tier1CoveragePercent}%.

## PDF Coverage

${renderTable(["PDF as source", "Targets"], [
  ["Direct", pdf.asSource.directTargets.join(", ") || "-"],
  ["One intermediate", pdf.asSource.oneIntermediateTargets.join(", ") || "-"],
  ["Two intermediates", pdf.asSource.twoIntermediateTargets.join(", ") || "-"],
  ["All effective", pdf.asSource.allEffectiveTargets.join(", ") || "-"],
])}

## Family Coverage

${renderTable(["Family", "Required", "Supported", "Coverage", "Biggest gaps"], Object.entries(audit.familyCoverage).map(([family, data]) => [
  family,
  String(data.required),
  String(data.supported),
  `${data.coveragePercent}%`,
  data.biggestGaps.join(", ") || "-",
]))}

## High-Value Missing Conversions

${renderTable(["Conversion", "Tier", "Blocker", "Recommendation"], missingRows)}

## Format Audit

${formatAudits.map((item) => `### ${item.format.toUpperCase()}

Category: ${item.category}

- Direct targets: ${item.asSource.directTargets.join(", ") || "-"}
- One-intermediate targets: ${item.asSource.oneIntermediateTargets.join(", ") || "-"}
- Two-intermediate targets: ${item.asSource.twoIntermediateTargets.join(", ") || "-"}
- All effective targets: ${item.asSource.allEffectiveTargets.join(", ") || "-"}
- Direct sources: ${item.asTarget.directSources.join(", ") || "-"}
- One-intermediate sources: ${item.asTarget.oneIntermediateSources.join(", ") || "-"}
- Two-intermediate sources: ${item.asTarget.twoIntermediateSources.join(", ") || "-"}
- All effective sources: ${item.asTarget.allEffectiveSources.join(", ") || "-"}
- High-value missing: ${item.highValueMissingConversions.map((gap) => `${item.format}->${gap.target} (${gap.tier})`).join(", ") || "-"}
- Engine gap: ${item.engineGap}
- Adapter gap: ${item.adapterGap}
- Runtime gap: ${item.runtimeGap}
- Quality risk: ${item.qualityRisk}
`).join("\n")}
`;
}

function renderEngineGapMd(): string {
  const gapRows = requirementsAudit
    .filter((item) => item.linux.status !== "supported")
    .map((item) => {
      const gap = item.gap!;
      return [
        `${item.source}->${item.target}`,
        item.tier,
        gap.currentPipeline,
        gap.currentBlocker,
        gap.existingEngineCanHandle,
        gap.existingEngineCandidates.join(", ") || "-",
        gap.newRequired ? "YES" : "NO",
        gap.candidates.join(", ") || "-",
        gap.expectedQuality,
        gap.complexity,
        gap.portableImpact,
        gap.recommendation,
      ];
    });

  return `# FileStudio Engine Gap Analysis

Generated: ${audit.generatedAt}

## New Engine / Library Candidates

${renderTable(["Dependency", "Decision", "Classification", "Coverage gain", "Quality", "License", "Portable impact", "Security"], dependencyCandidates.map((dep) => [
  dep.name,
  dep.decision,
  dep.classification,
  dep.coverageGain.join(", "),
  dep.qualityGain,
  dep.license,
  dep.portableImpact,
  dep.security,
]))}

## Dependency Decisions

### Adopt

${audit.decisions.adopt.map((dep) => `- ${dep.name}: ${dep.rationale}`).join("\n") || "- None"}

### Reject

${audit.decisions.reject.map((dep) => `- ${dep.name}: ${dep.rationale}`).join("\n") || "- None"}

### Investigate

${audit.decisions.investigate.map((dep) => `- ${dep.name}: ${dep.rationale}`).join("\n") || "- None"}

## Gap Table

${renderTable(["Conversion", "Tier", "Current pipeline", "Current blocker", "Existing engine", "Existing candidates", "New dependency", "New candidates", "Expected quality", "Complexity", "Portable impact", "Recommendation"], gapRows)}

## Requirements For Future Native Dependencies

Every adopted native dependency must provide exact version, official source, asset URL, SHA256, license metadata, runtime probe, Windows/Linux integration, portable strategy, SBOM update and THIRD_PARTY_NOTICES update.
`;
}

function renderRoadmapMd(): string {
  const priorityRows = [
    ...quickWins.slice(0, 30).map((item) => [
      item.conversion,
      item.tier,
      "High",
      "Missing but existing engine can likely handle",
      item.existingEngineCandidates.join(", ") || "-",
      "None",
      item.expectedQuality ?? "UNKNOWN",
      item.implementationComplexity ?? "UNKNOWN",
      "P0 quick win after E2E probe",
    ]),
    ...tier1NewDeps.slice(0, 30).map((item) => [
      item.conversion,
      "TIER 1",
      "High",
      item.blocker ?? "-",
      "-",
      item.candidates?.join(", ") || "TBD",
      "MEDIUM",
      "MEDIUM/HIGH",
      "P1 dependency investigation",
    ]),
  ];

  return `# FileStudio Tier 1 Coverage Roadmap

Generated: ${audit.generatedAt}

## Coverage Target

Recommended target before calling FileStudio competitive: Tier 1 coverage >= ${audit.recommendedCompetitiveThreshold.tier1CoveragePercent}% with E2E probes for every newly declared edge.

Current Tier 1 coverage: ${audit.tierMetrics.tier1.supported}/${audit.tierMetrics.tier1.required} (${audit.tierMetrics.tier1.coveragePercent}%).

## Quick Wins Without New Dependencies

${renderTable(["Conversion", "Tier", "Engines", "Expected quality", "Cost", "Recommendation"], quickWins.slice(0, 40).map((item) => [
  item.conversion,
  item.tier,
  item.existingEngineCandidates.join(", ") || "-",
  item.expectedQuality ?? "UNKNOWN",
  item.implementationComplexity ?? "UNKNOWN",
  item.recommendation ?? "INVESTIGATE",
]))}

## Tier 1 Requiring New Dependencies

${renderTable(["Conversion", "Blocker", "Candidates", "Recommendation"], tier1NewDeps.map((item) => [
  item.conversion,
  item.blocker ?? "-",
  item.candidates?.join(", ") || "TBD",
  item.recommendation ?? "INVESTIGATE",
]))}

## Priority Matrix

${renderTable(["Conversion", "Tier", "User value", "Current status", "Engine", "New dependency", "Expected quality", "Implementation cost", "Priority"], priorityRows)}
`;
}

function renderExecutionAlignmentMd(): string {
  return `# FileStudio Execution Alignment Report

Generated: ${audit.generatedAt}

## Root Cause

Diagnostics and execution had separate Poppler resolver implementations. Diagnostics resolved the Windows bundled Poppler layout through the toolchain probe helper, while \`PopplerEngine\` had a private resolver.

## Fix

\`PopplerEngine\` now delegates Poppler directory resolution to the diagnostics resolver. This aligns:

- diagnostics availability;
- discovery/routing engine ids;
- execution adapter resolution;
- bundled priority;
- PATH fallback when no bundled path exists.

## Windows Poppler Case

Expected bundled executable:

\`\`\`text
tools/poppler/Library/bin/pdftoppm.exe
\`\`\`

If diagnostics reports bundled Poppler available, execution now resolves the same bundled layout.

## Source File Contract

Explicit-source route capabilities are validated before route lookup:

\`\`\`text
route-docx-png + detected md -> SOURCE_FORMAT_MISMATCH
route-pdf-png + detected docx -> SOURCE_FORMAT_MISMATCH
\`\`\`

Auto-source flows remain capability driven: after analysis, any source that can reach the target may proceed.
`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "FILESTUDIO_CONVERSION_COVERAGE_AUDIT.json"), JSON.stringify(audit, null, 2) + "\n");
fs.writeFileSync(path.join(OUT_DIR, "FILESTUDIO_CONVERSION_COVERAGE_AUDIT.md"), renderCoverageMd());
fs.writeFileSync(path.join(OUT_DIR, "FILESTUDIO_ENGINE_GAP_ANALYSIS.json"), JSON.stringify({
  generatedAt: audit.generatedAt,
  dependencyCandidates,
  requirementsAudit: requirementsAudit.filter((item) => item.linux.status !== "supported"),
}, null, 2) + "\n");
fs.writeFileSync(path.join(OUT_DIR, "FILESTUDIO_ENGINE_GAP_ANALYSIS.md"), renderEngineGapMd());
fs.writeFileSync(path.join(OUT_DIR, "FILESTUDIO_TIER1_ROADMAP.md"), renderRoadmapMd());
fs.writeFileSync(path.join(OUT_DIR, "FILESTUDIO_EXECUTION_ALIGNMENT_REPORT.md"), renderExecutionAlignmentMd());

console.log(JSON.stringify({
  canonicalFormats: audit.canonicalFormats,
  directSupportedPairs: audit.directSupportedPairs,
  multistepSupportedPairs: audit.multistepSupportedPairs,
  totalEffectivePairs: audit.totalEffectivePairs,
  tierMetrics: audit.tierMetrics,
  quickWins: quickWins.length,
  tier1RequiringNewDependencies: tier1NewDeps.length,
}, null, 2));
