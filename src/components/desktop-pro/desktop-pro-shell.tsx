"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";
import {
  ArrowLeftRight,
  CheckCircle2,
  History,
  Home,
  ScanText,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { SourceSelector, type AnalysisResult, type UniversalAnalysisResult, type RemoteAnalysisResult } from "@/components/converter/source-selector";
import { RuntimePackRequirementCard } from "@/components/converter/runtime-pack-requirement-card";
import { InputAnalysisCard } from "@/components/converter/input-analysis-card";
import { ConversionRouteSummary } from "@/components/converter/conversion-route-summary";
import { TechnicalDetails } from "@/components/converter/technical-details";
import { QualitySelector } from "@/components/converter/quality-selector";
import { JobProgressCard } from "@/components/converter/job-progress-card";
import { ArtifactResultCard } from "@/components/converter/artifact-result-card";
import { JobHistory } from "@/components/history/job-history";
import { ToolStatusPanel } from "@/components/diagnostics/tool-status-panel";
import { SystemResourceGauge } from "@/components/diagnostics/system-resource-gauge";
import { PresetSelector, type ConversionPreset } from "@/components/presets/preset-manager";
import { BatchActionToolbar } from "@/components/converter/batch-action-toolbar";
import { ImageTool } from "@/components/web-tools/images/image-tool";
import { PdfTool } from "@/components/web-tools/pdf/pdf-tool";
import { StructuredDataTool } from "@/components/web-tools/structured/structured-data-tool";
import { ConversionHub } from "@/components/ux-v3/conversion-hub";
import { FileStudioHome } from "@/components/ux-v3/file-studio-home";
import { ToolHub } from "@/components/ux-v3/tool-hub";
import type { CapabilityInfo } from "@/lib/domain/unified-analysis";
import type { VideoFormat } from "@/lib/media/metadata";
import { VideoQualitySelectionSchema, type QualityProfile } from "@/lib/quality/quality-contract";
import { DESKTOP_PRO_GROUPS, type DesktopProGroupId } from "@/lib/capabilities/desktop-capabilities";
import { FILESTUDIO_BRAND } from "@/lib/filestudio-brand";
import { getFormatByCanonicalId, normalizeFormatId } from "@/lib/domain/format-catalog";
import { buildConversionUxModel, type UxConversionCategoryId, type UxConversionModel } from "@/lib/ux-v3/conversion-ux-model";
import { t } from "@/i18n";

export type DesktopTab = "home" | "convert" | "tools" | "history" | "diagnostics";
type ToolWorkspaceId = "pdf" | "images" | "structured" | "ocr" | null;
type FlowStep = "source" | "analysis" | "format" | "progress" | "result";

const UX_CATEGORY_TO_LEGACY_GROUP: Partial<Record<UxConversionCategoryId, DesktopProGroupId>> = {
  documents: "documents",
  images: "images",
  audio: "media",
  video: "media",
  ebooks: "ebooks",
  archives: "archives",
  data: "structured",
};

const mediaUrlTargets = new Set(["mp4", "webm", "mkv", "mp3", "m4a", "wav", "ogg"]);

function getFormatLabel(formatId: string): string {
  const canonical = normalizeFormatId(formatId) ?? formatId;
  const format = getFormatByCanonicalId(canonical);
  if (!format) return canonical.toUpperCase();
  if (format.outputExtension === "jpg") return "JPEG";
  if (format.outputExtension === "md") return "Markdown";
  if (format.outputExtension === "tex") return "LaTeX";
  return format.outputExtension.toUpperCase();
}

function getDetectedSourceFormat(result: AnalysisResult): string | null {
  if (result.kind === "universal-file") {
    const descriptor = (result as UniversalAnalysisResult).universalDescriptor as {
      extension?: string | null;
      detectedFormat?: string | null;
    } | null;
    return normalizeFormatId(result.detectedFormat)
      ?? normalizeFormatId(descriptor?.detectedFormat)
      ?? normalizeFormatId(descriptor?.extension);
  }

  if (result.kind === "local-media") {
    return normalizeFormatId(result.originalName.split(".").pop());
  }

  return normalizeFormatId(result.descriptor.container);
}

interface JobStatusData {
  jobId: string;
  status: string;
  stage: string;
  progress: number;
  error?: string;
  outputFormat?: string;
  file?: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    quality: string;
    format: string;
  };
  downloadAvailable?: boolean;
}

interface CapabilitiesData {
  capabilities: CapabilityInfo[];
  recommended: CapabilityInfo | null;
  inputFormat: string;
  inputCategory: string;
}

const TAB_ICONS: Record<DesktopTab, React.ReactNode> = {
  home: <Home className="h-4 w-4" />,
  convert: <ArrowLeftRight className="h-4 w-4" />,
  tools: <Wrench className="h-4 w-4" />,
  history: <History className="h-4 w-4" />,
  diagnostics: <Stethoscope className="h-4 w-4" />,
};

const TAB_ROUTES: Partial<Record<DesktopTab, string>> = {
  home: "/",
  convert: "/convert",
  tools: "/tools",
  history: "/history",
  diagnostics: "/diagnostics",
};

function tabFromPathname(pathname: string | null): DesktopTab | null {
  if (pathname === "/") return "home";
  if (pathname === "/convert") return "convert";
  if (pathname === "/tools") return "tools";
  if (pathname === "/history") return "history";
  if (pathname === "/diagnostics") return "diagnostics";
  return null;
}

export function DesktopProShell({ initialTab = "home" }: { initialTab?: DesktopTab }) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DesktopTab>(tabFromPathname(pathname) ?? initialTab);
  const [activeTool, setActiveTool] = useState<ToolWorkspaceId>(null);
  const [uxModel, setUxModel] = useState<UxConversionModel | null>(null);
  const [uxModelError, setUxModelError] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [initialConversionCategory, setInitialConversionCategory] = useState<UxConversionCategoryId | undefined>(undefined);
  const [routeValidationMessage, setRouteValidationMessage] = useState<string | null>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>("source");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<CapabilitiesData | null>(null);
  const [selectedCap, setSelectedCap] = useState<CapabilityInfo | null>(null);
  const [capabilityRefreshNonce, setCapabilityRefreshNonce] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusData | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [qualityProfile, setQualityProfile] = useState<QualityProfile>("source-max");
  const [quality, setQuality] = useState<string>("max");
  const [videoFormats, setVideoFormats] = useState<VideoFormat[]>([]);
  const [batchJobs, setBatchJobs] = useState<Array<{
    id: string;
    fileName: string;
    status: "queued" | "downloading" | "processing" | "completed" | "failed" | "cancelled";
    downloadUrl?: string;
    sizeBytes?: number;
    format?: string;
  }>>([]);

  const selectedTargetGroup = useMemo(() => {
    const targetCategory = uxModel?.formats.find((format) => format.id === selectedTarget)?.category;
    const legacyGroupId = targetCategory ? UX_CATEGORY_TO_LEGACY_GROUP[targetCategory] : undefined;
    return DESKTOP_PRO_GROUPS.find((group) => group.id === legacyGroupId);
  }, [selectedTarget, uxModel]);
  const steps = useMemo(
    () => [
      { key: "source" as FlowStep, label: "Archivo", num: 1 },
      { key: "analysis" as FlowStep, label: "Análisis", num: 2 },
      { key: "format" as FlowStep, label: "Ruta", num: 3 },
      { key: "progress" as FlowStep, label: "Progreso", num: 4 },
      { key: "result" as FlowStep, label: "Resultado", num: 5 },
    ],
    []
  );

  const currentStepIndex = steps.findIndex((step) => step.key === flowStep);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/capabilities?ux=v3")
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar la matriz de UX.");
        return response.json();
      })
      .then((data: UxConversionModel) => {
        if (!cancelled) setUxModel(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setUxModel(buildConversionUxModel("web", new Set(["browser", "data-ts"])));
          setUxModelError(error instanceof Error ? error.message : "No se pudo cargar la matriz de UX.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!analysisResult) return;
    const loadCaps = async () => {
      try {
        const body: Record<string, unknown> = analysisResult.kind === "universal-file"
          ? { universalDescriptor: (analysisResult as UniversalAnalysisResult).universalDescriptor }
          : { descriptor: analysisResult.descriptor };

        const response = await fetch("/api/capabilities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        const capData = data as CapabilitiesData;
        setCapabilities(capData);
        const canonicalTarget = normalizeFormatId(selectedTarget);
        if (canonicalTarget) {
          const matchingTargetCapabilities = capData.capabilities.filter(
            (cap) => normalizeFormatId(cap.outputFormat) === canonicalTarget
          );
          const targetCapability = matchingTargetCapabilities.find(
            (cap) => normalizeFormatId(cap.outputFormat) === canonicalTarget && cap.state === "available"
          ) ?? matchingTargetCapabilities.find(
            (cap) => normalizeFormatId(cap.outputFormat) === canonicalTarget && cap.state === "installable"
          ) ?? null;
          setSelectedCap(targetCapability);
          if (targetCapability && ["mp3", "m4a", "wav", "flac", "ogg"].includes(targetCapability.outputFormat)) {
            setQuality("best");
          }
          setRouteValidationMessage(targetCapability ? null : `Este archivo no puede convertirse a ${canonicalTarget.toUpperCase()} con las capacidades disponibles.`);
        } else {
          setSelectedCap(null);
          setRouteValidationMessage("Elige el formato que quieres obtener.");
        }
        setFlowStep("analysis");
      } catch {
        toast.error("No se pudieron calcular las capacidades.");
      }
    };
    void loadCaps();
  }, [analysisResult, selectedTarget, capabilityRefreshNonce]);

  useEffect(() => {
    if (flowStep === "analysis" && capabilities) {
      const timer = setTimeout(() => setFlowStep("format"), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [flowStep, capabilities]);

  useEffect(() => {
    if (!jobId || !isConverting) return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json() as JobStatusData;
        setJobStatus(data);
        if (["completed", "failed", "cancelled"].includes(data.status)) {
          setIsConverting(false);
          if (data.status === "failed") toast.error(data.error ?? "La conversión ha fallado");
          if (data.status === "completed") {
            setFlowStep("result");
            if (data.downloadAvailable) {
              fetch(`/api/jobs/${data.jobId}/token`)
                .then((r) => r.json())
                .then((tok) => {
                  if (tok.downloadUrl) {
                    setBatchJobs((prev) => {
                      if (prev.some((j) => j.id === data.jobId)) return prev;
                      return [
                        ...prev,
                        {
                          id: data.jobId,
                          fileName: data.file?.name || "archivo_convertido",
                          status: "completed",
                          downloadUrl: tok.downloadUrl,
                          sizeBytes: data.file?.sizeBytes,
                          format: data.file?.format || data.outputFormat,
                        },
                      ];
                    });
                  }
                })
                .catch(() => {});
            }
          }
        }
      } catch {
        // transient polling failure
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [jobId, isConverting]);

  const resetFlow = useCallback(() => {
    setAnalysisResult(null);
    setCapabilities(null);
    setSelectedCap(null);
    setJobId(null);
    setJobStatus(null);
    setIsConverting(false);
    setFlowStep("source");
    setQualityProfile("source-max");
    setQuality("max");
    setVideoFormats([]);
    setRouteValidationMessage(null);
  }, []);

  const handleTabChange = useCallback((tab: DesktopTab) => {
    setActiveTab(tab);
    setActiveTool(null);
    resetFlow();
  }, [resetFlow]);

  useEffect(() => {
    const routeTab = tabFromPathname(pathname);
    if (!routeTab || routeTab === activeTab) return;
    const timer = window.setTimeout(() => handleTabChange(routeTab), 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, handleTabChange, pathname]);

  const handleOpenConvert = useCallback((_categoryId?: UxConversionCategoryId) => {
    if (pathname !== "/convert") router.push("/convert");
    setActiveTab("convert");
    setActiveTool(null);
    setInitialConversionCategory(_categoryId);
    setSelectedTarget(null);
    setSelectedSource(null);
    resetFlow();
  }, [pathname, resetFlow, router]);

  const handleSelectTarget = useCallback((target: string, source?: string) => {
    if (pathname !== "/convert") router.push("/convert");
    setSelectedTarget(target);
    setSelectedSource(source ? normalizeFormatId(source) : null);
    setActiveTab("convert");
    setActiveTool(null);
    resetFlow();
  }, [pathname, resetFlow, router]);

  const handleOpenTool = useCallback((toolId: string) => {
    if (pathname !== "/tools") router.push("/tools");
    setActiveTab("tools");
    setActiveTool(toolId === "pdf" || toolId === "images" || toolId === "ocr" ? toolId : "structured");
    resetFlow();
  }, [pathname, resetFlow, router]);

  const handleAnalysisResult = useCallback((result: AnalysisResult) => {
    if (selectedSource) {
      const detectedSource = getDetectedSourceFormat(result);
      if (detectedSource !== selectedSource) {
        const expectedLabel = getFormatLabel(selectedSource);
        const detectedLabel = detectedSource ? getFormatLabel(detectedSource) : "un formato distinto";
        setRouteValidationMessage(`Has seleccionado un archivo ${detectedLabel}, pero esta conversión requiere ${expectedLabel}.`);
        setAnalysisResult(null);
        setCapabilities(null);
        setSelectedCap(null);
        setFlowStep("source");
        return;
      }
    }
    setAnalysisResult(result);
    if (result.kind === "remote-url") {
      const formats = (result as RemoteAnalysisResult).videoFormats;
      setVideoFormats(Array.isArray(formats) ? formats : []);
    } else {
      setVideoFormats([]);
    }
  }, [selectedSource]);

  const handleStartConversion = async () => {
    if (!analysisResult || !selectedCap) return;

    setIsConverting(true);
    setFlowStep("progress");
    setJobStatus({ jobId: "pending", status: "queued", stage: t("progress.queued"), progress: 0 });

    const isVideoFormat = selectedCap.outputFormat === "mp4" || selectedCap.outputFormat === "mkv" || selectedCap.outputFormat === "webm";
    const isAudioFormat = selectedCap.outputFormat === "mp3" || selectedCap.outputFormat === "m4a" || selectedCap.outputFormat === "wav" || selectedCap.outputFormat === "flac" || selectedCap.outputFormat === "ogg";
    const qualitySelection = isVideoFormat
      ? VideoQualitySelectionSchema.parse({
          profile: qualityProfile,
          resolutionLimit: quality === "max" ? "max" : Number(quality),
          fallbackPolicy: "reject",
        })
      : undefined;

    try {
      const body: Record<string, unknown> = { rightsConfirmed: true };
      if (analysisResult.kind === "universal-file") {
        body.capabilityId = selectedCap.id;
        body.inputId = (analysisResult as UniversalAnalysisResult).inputId;
        body.format = selectedCap.outputFormat;
      } else if (analysisResult.kind === "remote-url") {
        body.url = analysisResult.normalizedUrl;
        body.format = selectedCap.outputFormat;
        if (qualitySelection) body.qualitySelection = qualitySelection;
        if (isAudioFormat) body.quality = quality;
      } else {
        body.localFilePath = analysisResult.storedRelativePath;
        body.format = selectedCap.outputFormat;
        if (qualitySelection) body.qualitySelection = qualitySelection;
        if (isAudioFormat) body.quality = quality;
      }

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Error al iniciar");
      setJobId(data.jobId as string);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al iniciar la conversión");
      setIsConverting(false);
      setJobStatus(null);
      setFlowStep("format");
    }
  };

  const handleConvertAnotherFormat = useCallback(() => {
    // Reset to the format step keeping the same analyzed file
    setJobId(null);
    setJobStatus(null);
    setIsConverting(false);
    setFlowStep("format");
  }, []);

  const handleCancel = async () => {
    if (!jobId) return;
    try {
      await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      toast.info("Cancelando...");
    } catch {
      // no-op
    }
  };

  return (
    <div lang="es" className="min-h-screen overflow-hidden bg-[#0d0f12] text-[#f4f1ea]">
      <Toaster position="top-center" richColors />
      <Background />

      <div className="relative mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <header className="pt-6 pb-5 text-center">
          <div className="mb-4 flex justify-center">
            <Image
              src="/brand/anclora-filestudio.png"
              alt={FILESTUDIO_BRAND.name}
              width={80}
              height={80}
              priority
              className="drop-shadow-[0_0_24px_rgba(20,184,166,0.35)]"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <h1 className="text-[2.25rem] font-black leading-tight tracking-tight sm:text-5xl">
              Anclora <span className="bg-linear-to-r from-teal-300 to-teal-400 bg-clip-text text-transparent">FileStudio</span>
            </h1>
            <span className="rounded-full bg-amber-300/15 px-2.5 py-0.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/25">
              Desktop PRO
            </span>
            <span className="rounded-full bg-emerald-300/12 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-300/20">
              100% local
            </span>
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-6 text-stone-400">
            Todo lo de la Web, más motores nativos, lotes pesados, historial local,
            diagnóstico y portables Windows/Linux.
          </p>
        </header>

        <nav className="mb-5 grid grid-cols-2 gap-2 rounded-lg border border-white/8 bg-[#13161b]/90 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.36)] sm:grid-cols-5" aria-label="Navegación principal FileStudio">
          <DesktopTabButton id="home" href={TAB_ROUTES.home} active={activeTab === "home"} onClick={() => handleTabChange("home")} label="Inicio" />
          <DesktopTabButton id="convert" href={TAB_ROUTES.convert} active={activeTab === "convert"} onClick={() => handleTabChange("convert")} label={t("nav.convert")} />
          <DesktopTabButton id="tools" href={TAB_ROUTES.tools} active={activeTab === "tools"} onClick={() => handleTabChange("tools")} label="Herramientas" />
          <DesktopTabButton id="history" href={TAB_ROUTES.history} active={activeTab === "history"} onClick={() => handleTabChange("history")} label="Historial" />
          <DesktopTabButton id="diagnostics" href={TAB_ROUTES.diagnostics} active={activeTab === "diagnostics"} onClick={() => handleTabChange("diagnostics")} label="Diagnóstico" />
        </nav>

        {uxModelError && (
          <div role="alert" className="mb-4 rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {uxModelError}
          </div>
        )}

        {activeTab === "home" && (
          <FileStudioHome
            model={uxModel}
            onOpenConvert={handleOpenConvert}
            onSelectTarget={handleSelectTarget}
            onOpenTool={handleOpenTool}
          />
        )}

        {activeTab === "convert" && uxModel && !selectedTarget && !analysisResult && (
          <ConversionHub
            model={uxModel}
            selectedTarget={selectedTarget}
            initialCategoryId={initialConversionCategory}
            onSelectTarget={handleSelectTarget}
          />
        )}

        {activeTab === "convert" && uxModel && selectedTarget && (
          <NativeConversionWorkspace
            activeGroup={selectedTargetGroup}
            selectedTarget={selectedTarget}
            selectedSource={selectedSource}
            flowStep={flowStep}
            steps={steps}
            currentStepIndex={currentStepIndex}
            analysisResult={analysisResult}
            capabilities={capabilities}
            qualityProfile={qualityProfile}
            quality={quality}
            videoFormats={videoFormats}
            batchJobs={batchJobs}
            onClearBatchJobs={() => setBatchJobs([])}
            onProfileChange={setQualityProfile}
            onQualityChange={setQuality}
            selectedCap={selectedCap}
            routeValidationMessage={routeValidationMessage}
            isLoading={isLoading}
            isConverting={isConverting}
            jobStatus={jobStatus}
            onFileAnalyzed={handleAnalysisResult}
            onUrlAnalyzed={handleAnalysisResult}
            setLoading={setIsLoading}
            onReset={resetFlow}
            onCapSelect={setSelectedCap}
            onStartConversion={handleStartConversion}
            onCancel={handleCancel}
            onConvertAnother={handleConvertAnotherFormat}
            onViewHistory={() => handleTabChange("history")}
            onRuntimePackInstalled={() => setCapabilityRefreshNonce((value) => value + 1)}
            onBackToHub={() => {
              setSelectedTarget(null);
              setSelectedSource(null);
              resetFlow();
            }}
          />
        )}
        {activeTab === "tools" && uxModel && !activeTool && <ToolHub model={uxModel} onOpenTool={handleOpenTool} />}
        {activeTab === "tools" && activeTool === "images" && <Panel><ImageTool /></Panel>}
        {activeTab === "tools" && activeTool === "pdf" && <Panel><PdfTool /></Panel>}
        {activeTab === "tools" && activeTool === "structured" && <Panel><StructuredDataTool /></Panel>}
        {activeTab === "tools" && activeTool === "ocr" && (
          <Panel>
            <div className="space-y-3">
              <h2 className="text-xl font-black text-stone-100">Conversión con OCR</h2>
              <p className="text-sm text-stone-400">Solo se muestran capacidades OCR efectivas de la matriz.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {uxModel?.tools.find((tool) => tool.id === "ocr")?.operations.map((operation) => (
                  <div key={operation.id} className="rounded-lg border border-white/10 bg-white/3 p-4">
                    <ScanText className="mb-2 h-5 w-5 text-teal-200" aria-hidden="true" />
                    <p className="text-sm font-bold text-stone-100">{operation.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}
        {activeTab === "history" && <Panel><JobHistory /></Panel>}
        {activeTab === "diagnostics" && <Panel><ToolStatusPanel /></Panel>}
      </div>
    </div>
  );
}

function DesktopTabButton({ id, label, active, href, onClick }: { id: DesktopTab; label: string; active: boolean; href?: string; onClick: () => void }) {
  const className = `flex min-h-11 items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70 motion-reduce:transition-none ${
    active ? "bg-teal-300 text-[#071112]" : "border border-white/8 text-stone-300 hover:bg-white/6"
  }`;
  const contents = (
    <>
      {TAB_ICONS[id]}
      <span>{label}</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} role="tab" aria-selected={active} onClick={onClick} className={className}>
        {contents}
      </Link>
    );
  }
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={className}>
      {contents}
    </button>
  );
}

function NativeConversionWorkspace(props: {
  activeGroup: typeof DESKTOP_PRO_GROUPS[number] | undefined;
  selectedTarget: string;
  selectedSource: string | null;
  flowStep: FlowStep;
  steps: Array<{ key: FlowStep; label: string; num: number }>;
  currentStepIndex: number;
  analysisResult: AnalysisResult | null;
  capabilities: CapabilitiesData | null;
  selectedCap: CapabilityInfo | null;
  routeValidationMessage: string | null;
  isLoading: boolean;
  isConverting: boolean;
  jobStatus: JobStatusData | null;
  qualityProfile: QualityProfile;
  quality: string;
  videoFormats: VideoFormat[];
  batchJobs: Array<{
    id: string;
    fileName: string;
    status: "queued" | "downloading" | "processing" | "completed" | "failed" | "cancelled";
    downloadUrl?: string;
    sizeBytes?: number;
    format?: string;
  }>;
  onClearBatchJobs: () => void;
  onProfileChange: (profile: QualityProfile) => void;
  onQualityChange: (quality: string) => void;
  onFileAnalyzed: (result: AnalysisResult) => void;
  onUrlAnalyzed: (result: AnalysisResult) => void;
  setLoading: (loading: boolean) => void;
  onReset: () => void;
  onCapSelect: (capability: CapabilityInfo) => void;
  onStartConversion: () => void;
  onCancel: () => void;
  onConvertAnother: () => void;
  onViewHistory: () => void;
  onRuntimePackInstalled: () => void;
  onBackToHub: () => void;
}) {
  const {
    activeGroup,
    selectedTarget,
    selectedSource,
    flowStep,
    steps,
    currentStepIndex,
    analysisResult,
    capabilities,
    selectedCap,
    routeValidationMessage,
    isLoading,
    isConverting,
    jobStatus,
    qualityProfile,
    quality,
    videoFormats,
    batchJobs,
    onClearBatchJobs,
    onProfileChange,
    onQualityChange,
    onFileAnalyzed,
    onUrlAnalyzed,
    setLoading,
    onReset,
    onCapSelect,
    onStartConversion,
    onCancel,
    onConvertAnother,
    onViewHistory,
    onRuntimePackInstalled,
    onBackToHub,
  } = props;
  const requiresRuntimeInstall = Boolean(
    selectedCap?.state === "installable" ||
    selectedCap?.runtimeState === "installable"
  ) && Boolean(selectedCap?.requiredRuntimePacks?.length);

  return (
    <Panel>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              type="button"
              onClick={onBackToHub}
              className="mb-2 text-xs font-semibold text-stone-400 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60"
            >
              Volver a Convertir
            </button>
            <h2 className="text-xl font-black text-stone-100">Convertir a {selectedTarget.toUpperCase()}</h2>
            <p className="mt-1 text-sm text-stone-400">Selecciona el archivo que quieres convertir.</p>
          </div>
          <SystemResourceGauge compact />
        </div>
        {flowStep !== "source" && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Pasos de conversión">
            {steps.map((step, index) => {
              const completed = index < currentStepIndex;
              const current = index === currentStepIndex;
              return (
                <div key={step.key} className={`rounded-md px-2 py-1 text-[11px] font-semibold ${current ? "bg-teal-400/15 text-teal-200" : completed ? "bg-emerald-400/10 text-emerald-200" : "text-stone-500"}`}>
                  {completed ? <CheckCircle2 className="mr-1 inline h-3 w-3" /> : `${step.num}. `}
                  {step.label}
                </div>
              );
            })}
          </div>
        )}

        {flowStep === "source" && (
          <div className="space-y-4">
            <BatchActionToolbar jobs={batchJobs} onClearCompleted={onClearBatchJobs} />
            <SourceSelector
              onUrlAnalyzed={onUrlAnalyzed}
              onFileAnalyzed={onFileAnalyzed}
              isLoading={isLoading}
              setLoading={setLoading}
              requiredSourceFormat={selectedSource}
              requiredSourceLabel={selectedSource ? getFormatLabel(selectedSource) : null}
              acquisitionModes={mediaUrlTargets.has(selectedTarget) ? ["local-file", "video-url"] : ["local-file"]}
            />
          </div>
        )}

        {(flowStep === "analysis" || flowStep === "format") && analysisResult && (
          <div className="space-y-5">
            <InputAnalysisCard result={analysisResult} onReset={onReset} />
            {flowStep === "format" && selectedCap && (
              <ConversionRouteSummary
                cap={selectedCap}
                inputName={
                  analysisResult.kind === "universal-file" || analysisResult.kind === "local-media"
                    ? (analysisResult as UniversalAnalysisResult).originalName
                    : (analysisResult as RemoteAnalysisResult)?.title
                }
                inputFormat={capabilities?.inputFormat}
              />
            )}
            {flowStep === "format" && routeValidationMessage && !selectedCap && (
              <div role="status" aria-live="polite" className="rounded-lg border border-amber-300/20 bg-amber-300/8 p-4 text-sm font-semibold text-amber-100">
                {routeValidationMessage}
              </div>
            )}
            {flowStep === "format" && selectedCap && requiresRuntimeInstall && (
              <RuntimePackRequirementCard
                packIds={selectedCap.requiredRuntimePacks ?? []}
                onInstalled={onRuntimePackInstalled}
                onCancel={onBackToHub}
              />
            )}
            {flowStep === "format" && selectedCap && (
              <TechnicalDetails cap={selectedCap} />
            )}
            {flowStep === "format" && selectedCap && (
              <details className="group rounded-xl border border-white/10 bg-[#1a1e25] px-4 py-2.5">
                <summary className="min-h-8 cursor-pointer list-none text-xs font-semibold text-stone-400 transition-colors hover:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 [&::-webkit-details-marker]:hidden">
                  {t("convert.advancedConfig")}
                  <span className="ml-2 text-stone-600 group-open:hidden">+</span>
                  <span className="ml-2 hidden text-stone-600 group-open:inline">−</span>
                </summary>
                <div className="pt-3">
                  <PresetSelector
                    category={activeGroup?.id}
                    onSelectPreset={(preset: ConversionPreset) => {
                      if (capabilities?.capabilities) {
                        const match = capabilities.capabilities.find(
                          (c) => c.outputFormat.toLowerCase() === preset.targetFormat.toLowerCase()
                        );
                        if (match) {
                          onCapSelect(match);
                          if (preset.qualityProfile) {
                            const profile: QualityProfile = preset.qualityProfile === "source-max" ? "source-max" : "mp4-compatible";
                            onProfileChange(profile);
                          }
                        }
                      }
                    }}
                  />
                </div>
              </details>
            )}
            {flowStep === "format" && selectedCap && (selectedCap.outputFormat === "mp4" || selectedCap.outputFormat === "mkv" || selectedCap.outputFormat === "webm") && (
              <QualitySelector
                format="mp4"
                quality={quality}
                onQualityChange={onQualityChange}
                availableHeights={analysisResult?.descriptor?.videoStreams?.map((s) => s.height).filter((h): h is number => h !== null) ?? []}
                qualityProfile={qualityProfile}
                onProfileChange={onProfileChange}
                videoFormats={videoFormats.length > 0 ? videoFormats : undefined}
              />
            )}
            {flowStep === "format" && selectedCap && (selectedCap.outputFormat === "mp3" || selectedCap.outputFormat === "m4a" || selectedCap.outputFormat === "wav" || selectedCap.outputFormat === "flac" || selectedCap.outputFormat === "ogg") && (
              <QualitySelector
                format="mp3"
                quality={quality}
                onQualityChange={onQualityChange}
                availableHeights={[]}
              />
            )}
            {flowStep === "format" && selectedCap && !requiresRuntimeInstall && (
              <button
                type="button"
                onClick={() => void onStartConversion()}
                disabled={isConverting}
                className="min-h-11 w-full rounded-md bg-teal-300 px-4 text-sm font-black text-[#071112] disabled:opacity-40"
              >
                {isConverting ? "Procesando..." : t("convert.startTo", { format: selectedTarget.toUpperCase() })}
              </button>
            )}
          </div>
        )}

        {flowStep === "progress" && jobStatus && (
          <JobProgressCard
            jobId={jobStatus.jobId}
            status={jobStatus.status}
            stage={jobStatus.stage}
            progress={jobStatus.progress}
            error={jobStatus.error}
            onCancel={onCancel}
          />
        )}

        {flowStep === "result" && jobStatus?.file && (
          <ArtifactResultCard
            jobId={jobStatus.jobId}
            fileName={jobStatus.file.name ?? "download"}
            format={jobStatus.file.format ?? jobStatus.outputFormat ?? ""}
            mimeType={jobStatus.file.mimeType}
            sizeBytes={jobStatus.file.sizeBytes}
            downloadTokenHash={Boolean(jobStatus.downloadAvailable)}
            onReset={onReset}
            onConvertAnother={onConvertAnother}
            onViewHistory={onViewHistory}
            originalFileName={
              analysisResult?.kind === "universal-file" || analysisResult?.kind === "local-media"
                ? (analysisResult as UniversalAnalysisResult).originalName
                : (analysisResult as RemoteAnalysisResult)?.title
            }
            originalSize={
              analysisResult?.kind === "universal-file" || analysisResult?.kind === "local-media"
                ? (analysisResult as UniversalAnalysisResult).sizeBytes
                : analysisResult?.descriptor?.sizeBytes || undefined
            }
          />
        )}
      </div>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#13161b]/82 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.30)] sm:p-5">
      {children}
    </section>
  );
}

function Background() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 opacity-95"
        style={{
          background:
            "radial-gradient(circle at 18% 4%, rgba(13,148,136,0.20) 0%, transparent 34%), radial-gradient(circle at 82% 0%, rgba(198,132,38,0.14) 0%, transparent 28%), linear-gradient(180deg, #12161b 0%, #08090b 72%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
        aria-hidden="true"
      />
    </>
  );
}
