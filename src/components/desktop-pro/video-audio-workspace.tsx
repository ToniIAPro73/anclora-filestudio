"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Download, FileAudio, FileVideo, Scissors, Image as ImageIcon, Captions, Info } from "lucide-react";
import { SourceSelector, type UniversalAnalysisResult } from "@/components/converter/source-selector";
import { downloadBlob } from "@/lib/browser-tools/common/download";
import type { CapabilityInfo } from "@/lib/domain/unified-analysis";

type OutputFormat = "txt" | "md" | "srt" | "vtt";
const OUTPUT_FORMATS: OutputFormat[] = ["txt", "md", "srt", "vtt"];

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function capabilitiesByPrefix(caps: CapabilityInfo[], prefix: string): CapabilityInfo[] {
  return caps.filter((c) => c.id.startsWith(prefix));
}

async function pollJob(jobId: string, onProgress: (stage: string, progress: number) => void): Promise<{ ok: true } | { ok: false; error: string }> {
  for (;;) {
    const res = await fetch(`/api/jobs/${jobId}`);
    const data = await res.json();
    onProgress(data.stage ?? "", data.progress ?? 0);
    if (data.status === "completed") return { ok: true };
    if (data.status === "failed" || data.status === "cancelled") {
      return { ok: false, error: data.error ?? "El proceso ha fallado." };
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function downloadJobResult(jobId: string, fileName: string): Promise<void> {
  const res = await fetch(`/api/jobs/${jobId}/token`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No se pudo obtener el archivo.");
  const a = document.createElement("a");
  a.href = data.downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-400">
      {icon}
      {children}
    </h3>
  );
}

export function VideoAudioWorkspace() {
  const [tab, setTab] = useState<"file" | "url">("file");
  const [analysis, setAnalysis] = useState<UniversalAnalysisResult | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilityInfo[]>([]);
  const [loadingCaps, setLoadingCaps] = useState(false);
  const [language, setLanguage] = useState("auto");
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  useEffect(() => {
    if (!analysis) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoadingCaps(true);
      fetch("/api/capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universalDescriptor: analysis.universalDescriptor }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setCapabilities(Array.isArray(data.capabilities) ? data.capabilities : []);
        })
        .catch(() => {
          if (!cancelled) setCapabilities([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingCaps(false);
        });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [analysis]);

  const runCapability = useCallback(async (
    capability: CapabilityInfo,
    options: Record<string, unknown>,
    outputFileName: string
  ) => {
    if (!analysis) return;
    setBusy(true);
    setErrorMsg(null);
    setStatus("Enviando trabajo...");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputId: analysis.inputId,
          capabilityId: capability.id,
          presetId: null,
          options,
          rightsConfirmed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar el trabajo.");
      const jobId = data.jobId as string;
      const result = await pollJob(jobId, (stage, progress) => {
        if (isMounted.current) setStatus(`${stage || "Procesando"} (${progress}%)`);
      });
      if (!result.ok) throw new Error(result.error);
      await downloadJobResult(jobId, outputFileName);
      if (isMounted.current) setStatus("Completado.");
    } catch (err) {
      if (isMounted.current) setErrorMsg(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      if (isMounted.current) setBusy(false);
    }
  }, [analysis]);

  const transcribeCaps = capabilitiesByPrefix(capabilities, "whisper-transcribe-");
  const extractAudioCaps = capabilitiesByPrefix(capabilities, "ffmpeg-extract-audio-");
  const framesCaps = capabilitiesByPrefix(capabilities, "ffmpeg-frames-");
  const subtitleCaps = capabilitiesByPrefix(capabilities, "ffmpeg-subtitles-");
  const thumbnailCaps = capabilitiesByPrefix(capabilities, "ffmpeg-thumbnail-");
  const trimCaps = capabilitiesByPrefix(capabilities, "ffmpeg-trim-");
  const meta = analysis?.descriptor;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-stone-100">Vídeo y audio</h2>
        <p className="text-sm text-stone-400">
          Extrae audio, fotogramas y subtítulos, transcribe contenido localmente y realiza operaciones básicas sobre vídeo y audio.
        </p>
        <p className="mt-1 text-xs font-semibold text-teal-300">
          Transcripción local — el audio no sale de tu dispositivo.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("file")}
          className={`rounded-md px-3 py-1.5 text-sm font-bold ${tab === "file" ? "bg-teal-500/20 text-teal-200" : "text-stone-400 hover:text-stone-200"}`}
        >
          Desde archivo
        </button>
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`rounded-md px-3 py-1.5 text-sm font-bold ${tab === "url" ? "bg-teal-500/20 text-teal-200" : "text-stone-400 hover:text-stone-200"}`}
        >
          Desde URL
        </button>
      </div>

      {tab === "file" && (
        <div className="space-y-5">
          {!analysis && (
            <SourceSelector
              acquisitionModes={["local-file"]}
              isLoading={loadingCaps}
              setLoading={setLoadingCaps}
              onUrlAnalyzed={() => undefined}
              onFileAnalyzed={(result) => {
                if (result.kind === "universal-file") setAnalysis(result);
              }}
              requiredSourceLabel="vídeo o audio"
            />
          )}

          {analysis && (
            <>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/3 p-3">
                <div>
                  <p className="text-sm font-bold text-stone-100">{analysis.originalName}</p>
                  <p className="text-xs text-stone-400">{analysis.category} · {analysis.detectedFormat?.toUpperCase()}</p>
                </div>
                <button type="button" className="text-xs font-bold text-teal-300 hover:underline" onClick={() => { setAnalysis(null); setCapabilities([]); setStatus(null); setErrorMsg(null); }}>
                  Cambiar archivo
                </button>
              </div>

              {loadingCaps && (
                <p className="flex items-center gap-2 text-sm text-stone-400"><Loader2 className="h-4 w-4 animate-spin" /> Analizando capacidades disponibles…</p>
              )}

              {meta && (
                <div className="rounded-lg border border-white/10 bg-white/3 p-4">
                  <SectionTitle icon={<Info className="h-4 w-4" />}>Información</SectionTitle>
                  <dl className="grid grid-cols-2 gap-2 text-sm text-stone-300 sm:grid-cols-3">
                    <div><dt className="text-stone-500">Contenedor</dt><dd>{meta.container ?? "—"}</dd></div>
                    <div><dt className="text-stone-500">Duración</dt><dd>{formatDuration(meta.durationSeconds)}</dd></div>
                    <div><dt className="text-stone-500">Audio</dt><dd>{meta.hasAudio ? `Sí (${meta.audioStreams.length})` : "No"}</dd></div>
                    <div><dt className="text-stone-500">Vídeo</dt><dd>{meta.hasVideo ? `Sí (${meta.videoStreams.length})` : "No"}</dd></div>
                    <div><dt className="text-stone-500">Subtítulos</dt><dd>{meta.hasSubtitles ? `Sí (${meta.subtitleStreams.length})` : "No"}</dd></div>
                  </dl>
                </div>
              )}

              {transcribeCaps.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/3 p-4">
                  <SectionTitle icon={<FileAudio className="h-4 w-4" />}>Transcripción</SectionTitle>
                  {transcribeCaps[0].state !== "available" && (
                    <p className="mb-2 text-xs text-amber-300">{transcribeCaps[0].warnings[0] ?? "Whisper no está disponible."}</p>
                  )}
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                    <label className="flex items-center gap-2 text-stone-300">
                      Idioma
                      <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded bg-black/30 px-2 py-1 text-stone-100">
                        <option value="auto">Auto</option>
                        <option value="es">Español</option>
                        <option value="en">English</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-stone-300">
                      <input type="checkbox" checked={includeTimestamps} onChange={(e) => setIncludeTimestamps(e.target.checked)} />
                      Incluir timestamps
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {OUTPUT_FORMATS.map((fmt) => {
                      const cap = transcribeCaps.find((c) => c.id.endsWith(`-${fmt}`));
                      if (!cap) return null;
                      return (
                        <button
                          key={fmt}
                          type="button"
                          disabled={busy || cap.state !== "available"}
                          onClick={() => runCapability(cap, { language, timestamps: includeTimestamps }, `${analysis.originalName}.${fmt}`)}
                          className="flex items-center gap-1 rounded-md border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-sm font-bold text-teal-200 disabled:opacity-40"
                        >
                          <Download className="h-3.5 w-3.5" /> {fmt.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(extractAudioCaps.length > 0 || framesCaps.length > 0 || subtitleCaps.length > 0 || thumbnailCaps.length > 0) && (
                <div className="rounded-lg border border-white/10 bg-white/3 p-4">
                  <SectionTitle icon={<ImageIcon className="h-4 w-4" />}>Extracción</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {extractAudioCaps.map((cap) => (
                      <ActionButton key={cap.id} label="Extraer audio (MP3)" disabled={busy || cap.state !== "available"} onClick={() => runCapability(cap, {}, `${analysis.originalName}.mp3`)} />
                    ))}
                    {framesCaps.map((cap) => (
                      <ActionButton key={cap.id} label="Extraer frames (ZIP)" disabled={busy || cap.state !== "available"} onClick={() => runCapability(cap, {}, `${analysis.originalName}-frames.zip`)} />
                    ))}
                    {thumbnailCaps.map((cap) => (
                      <ActionButton key={cap.id} label="Generar miniatura" disabled={busy || cap.state !== "available"} onClick={() => runCapability(cap, {}, `${analysis.originalName}.jpg`)} />
                    ))}
                    {subtitleCaps.map((cap) => (
                      <ActionButton
                        key={cap.id}
                        icon={<Captions className="h-3.5 w-3.5" />}
                        label={`Extraer subtítulos (${cap.outputFormat.toUpperCase()})`}
                        disabled={busy || cap.state !== "available"}
                        onClick={() => runCapability(cap, {}, `${analysis.originalName}.${cap.outputFormat}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {trimCaps.length > 0 && (
                <TrimSection cap={trimCaps[0]} busy={busy} fileName={analysis.originalName} onRun={runCapability} />
              )}
            </>
          )}
        </div>
      )}

      {tab === "url" && <UrlTranscriptionPanel />}

      {status && !errorMsg && <p className="text-sm text-teal-300">{status}</p>}
      {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
    </div>
  );
}

function ActionButton({ label, icon, disabled, onClick }: { label: string; icon?: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-bold text-stone-200 hover:bg-white/10 disabled:opacity-40"
    >
      {icon ?? <FileVideo className="h-3.5 w-3.5" />} {label}
    </button>
  );
}

function TrimSection({
  cap, busy, fileName, onRun,
}: {
  cap: CapabilityInfo;
  busy: boolean;
  fileName: string;
  onRun: (cap: CapabilityInfo, options: Record<string, unknown>, outputFileName: string) => void;
}) {
  const [start, setStart] = useState("00:00:00");
  const [end, setEnd] = useState("00:00:10");
  return (
    <div className="rounded-lg border border-white/10 bg-white/3 p-4">
      <SectionTitle icon={<Scissors className="h-4 w-4" />}>Edición básica</SectionTitle>
      <div className="flex flex-wrap items-center gap-3 text-sm text-stone-300">
        <label className="flex items-center gap-2">Inicio <input value={start} onChange={(e) => setStart(e.target.value)} className="w-24 rounded bg-black/30 px-2 py-1 text-stone-100" /></label>
        <label className="flex items-center gap-2">Fin <input value={end} onChange={(e) => setEnd(e.target.value)} className="w-24 rounded bg-black/30 px-2 py-1 text-stone-100" /></label>
        <ActionButton
          label="Recortar"
          disabled={busy || cap.state !== "available"}
          onClick={() => onRun(cap, { trimStart: start, trimEnd: end }, `${fileName}-recorte.${cap.outputFormat}`)}
        />
      </div>
    </div>
  );
}

// ── URL tab (Fase 6/7) — synchronous by design, see url-transcript-route.ts ──

interface CaptionTrack { lang: string; formats: string[]; }
interface CaptionInfo { title: string; durationSeconds: number | null; manual: CaptionTrack[]; automatic: CaptionTrack[]; }

function UrlTranscriptionPanel() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<CaptionInfo | null>(null);
  const [language, setLanguage] = useState("auto");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("txt");
  const [includeTimestamps, setIncludeTimestamps] = useState(true);

  const probe = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/media/url-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "probe", url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo analizar la URL.");
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAndDownload = async (body: Record<string, unknown>, fileNameBase: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/media/url-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo generar el archivo.");
      downloadBlob(new Blob([data.content], { type: data.mimeType }), `${fileNameBase}.${data.outputFormat}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const hasCaptions = (info?.manual.length ?? 0) > 0 || (info?.automatic.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="flex-1 rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-stone-100"
        />
        <ActionButton label="Buscar subtítulos" disabled={loading || !url.trim()} onClick={probe} />
      </div>

      {loading && <p className="flex items-center gap-2 text-sm text-stone-400"><Loader2 className="h-4 w-4 animate-spin" /> Procesando…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {info && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-white/3 p-4">
          <p className="text-sm font-bold text-stone-100">{info.title}</p>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-stone-300">
              Formato
              <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as OutputFormat)} className="rounded bg-black/30 px-2 py-1 text-stone-100">
                {OUTPUT_FORMATS.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-stone-300">
              <input type="checkbox" checked={includeTimestamps} onChange={(e) => setIncludeTimestamps(e.target.checked)} />
              Incluir timestamps
            </label>
          </div>

          {hasCaptions ? (
            <div className="space-y-2">
              {info.manual.length > 0 && <CaptionTrackList label="Subtítulos manuales" tracks={info.manual} kind="manual" outputFormat={outputFormat} includeTimestamps={includeTimestamps} onDownload={fetchAndDownload} title={info.title} url={url.trim()} />}
              {info.automatic.length > 0 && <CaptionTrackList label="Subtítulos automáticos" tracks={info.automatic} kind="automatic" outputFormat={outputFormat} includeTimestamps={includeTimestamps} onDownload={fetchAndDownload} title={info.title} url={url.trim()} />}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-stone-400">Este vídeo no tiene subtítulos disponibles. Puedes transcribirlo localmente con Whisper (solo se descarga el audio).</p>
              <label className="flex items-center gap-2 text-sm text-stone-300">
                Idioma
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded bg-black/30 px-2 py-1 text-stone-100">
                  <option value="auto">Auto</option>
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </label>
              <ActionButton
                icon={<FileAudio className="h-3.5 w-3.5" />}
                label="Transcribir con Whisper"
                disabled={loading}
                onClick={() => fetchAndDownload({ action: "transcribe", url: url.trim(), language, outputFormat, timestamps: includeTimestamps }, info.title)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CaptionTrackList({
  label, tracks, kind, outputFormat, includeTimestamps, onDownload, title, url,
}: {
  label: string;
  tracks: CaptionTrack[];
  kind: "manual" | "automatic";
  outputFormat: OutputFormat;
  includeTimestamps: boolean;
  title: string;
  url: string;
  onDownload: (body: Record<string, unknown>, fileNameBase: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-stone-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {tracks.map((t) => (
          <ActionButton
            key={t.lang}
            label={t.lang}
            disabled={false}
            onClick={() => onDownload({ action: "subtitle", url, source: kind, lang: t.lang, outputFormat, timestamps: includeTimestamps }, `${title}-${t.lang}`)}
          />
        ))}
      </div>
    </div>
  );
}
