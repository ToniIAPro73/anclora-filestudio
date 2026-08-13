"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftRight, Download, HelpCircle, History, Home, Stethoscope, Wrench } from "lucide-react";
import { ExternalActionLink } from "@/components/web/external-action-link";
import { FILESTUDIO_BRAND } from "@/lib/filestudio-brand";
import { ImageTool } from "./images/image-tool";
import { PdfTool } from "./pdf/pdf-tool";
import { StructuredDataTool } from "./structured/structured-data-tool";
import { PrivacyNotice } from "./privacy-notice";
import { ConversionHub } from "@/components/ux-v3/conversion-hub";
import { FileStudioHome } from "@/components/ux-v3/file-studio-home";
import { ToolHub } from "@/components/ux-v3/tool-hub";
import { buildConversionUxModel, type UxConversionCategoryId } from "@/lib/ux-v3/conversion-ux-model";

const windowsUrl = process.env.NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL || "";
const linuxUrl = process.env.NEXT_PUBLIC_LINUX_DOWNLOAD_URL || "";
const supportUrl = process.env.NEXT_PUBLIC_SUPPORT_URL || "";

export type WebTab = "home" | "convert" | "tools" | "history" | "diagnostics";
type ToolTab = "images" | "pdf" | "structured" | null;
const WEB_UX_MODEL = buildConversionUxModel("web", new Set(["browser", "data-ts"]));
const TAB_ROUTES: Record<WebTab, string> = {
  home: "/",
  convert: "/convert",
  tools: "/tools",
  history: "/history",
  diagnostics: "/diagnostics",
};

export function WebToolsShell({ initialTab = "home" }: { initialTab?: WebTab }) {
  const pathname = usePathname();
  const router = useRouter();
  const [tab, setTab] = useState<WebTab>(initialTab);
  const [toolTab, setToolTab] = useState<ToolTab>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [initialCategory, setInitialCategory] = useState<UxConversionCategoryId | undefined>(undefined);

  const openConvert = (categoryId?: UxConversionCategoryId) => {
    if (pathname !== "/convert") router.push("/convert");
    setInitialCategory(categoryId);
    setTarget(null);
    setToolTab(null);
    setTab("convert");
  };

  const openTools = () => {
    if (pathname !== "/tools") router.push("/tools");
    setTab("tools");
    setToolTab(null);
  };

  return (
    <div className="min-h-screen bg-[#0d0f12] text-[#f4f1ea]">
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 12% 6%, rgba(13,148,136,0.16) 0%, transparent 32%), radial-gradient(circle at 88% 4%, rgba(198,132,38,0.10) 0%, transparent 26%), linear-gradient(180deg, #12161b 0%, #08090b 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <header className="pt-8 pb-6 text-center">
          <div className="mb-4 flex justify-center">
            <Image src="/brand/anclora-filestudio.png" alt={FILESTUDIO_BRAND.name} width={80} height={80} priority className="drop-shadow-[0_0_24px_rgba(20,184,166,0.35)]" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <h1 className="text-[2rem] font-black leading-tight tracking-tight sm:text-4xl">
              Anclora <span className="bg-linear-to-r from-teal-300 to-teal-400 bg-clip-text text-transparent">FileStudio</span>
            </h1>
            <span className="rounded-full bg-teal-400/15 px-2.5 py-0.5 text-xs font-semibold text-teal-300 ring-1 ring-teal-300/25">
              Versión Web
            </span>
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-6 text-stone-400">
            Prepara imágenes y organiza PDF directamente en tu navegador. Para motores nativos y conversiones avanzadas, usa la versión Desktop.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <ExternalActionLink url={windowsUrl} label="Windows" icon={<Download className="h-4 w-4" aria-hidden="true" />} disabledTooltip="Descarga próximamente" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-stone-100 px-4 text-sm font-bold text-[#101316]" />
            <ExternalActionLink url={linuxUrl} label="Linux" icon={<Download className="h-4 w-4" aria-hidden="true" />} disabledTooltip="Descarga próximamente" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/14 px-4 text-sm font-bold text-stone-100" />
            <ExternalActionLink url={supportUrl} label="Ayuda" icon={<HelpCircle className="h-4 w-4" aria-hidden="true" />} disabledTooltip="Soporte aún no configurado" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/10 px-4 text-sm font-medium text-stone-400" />
          </div>
        </header>

        <main className="space-y-5">
          <nav className="grid grid-cols-2 gap-2 rounded-lg border border-white/8 bg-[#13161b]/90 p-2 sm:grid-cols-5" aria-label="Navegación principal FileStudio Web">
            <TopButton href={TAB_ROUTES.home} active={tab === "home"} onClick={() => setTab("home")} icon={<Home className="h-4 w-4" />}>Inicio</TopButton>
            <TopButton href={TAB_ROUTES.convert} active={tab === "convert"} onClick={() => openConvert()} icon={<ArrowLeftRight className="h-4 w-4" />}>Convertir</TopButton>
            <TopButton href={TAB_ROUTES.tools} active={tab === "tools"} onClick={() => { setTab("tools"); setToolTab(null); }} icon={<Wrench className="h-4 w-4" />}>Herramientas</TopButton>
            <TopButton href={TAB_ROUTES.history} active={tab === "history"} onClick={() => setTab("history")} icon={<History className="h-4 w-4" />}>Historial</TopButton>
            <TopButton href={TAB_ROUTES.diagnostics} active={tab === "diagnostics"} onClick={() => setTab("diagnostics")} icon={<Stethoscope className="h-4 w-4" />}>Diagnóstico</TopButton>
          </nav>

          {tab === "home" && <FileStudioHome model={WEB_UX_MODEL} onOpenConvert={openConvert} onOpenTools={openTools} />}
          {tab === "convert" && !target && <ConversionHub model={WEB_UX_MODEL} selectedTarget={target} initialCategoryId={initialCategory} onSelectTarget={setTarget} />}
          {tab === "convert" && target && (
            <section className="rounded-lg border border-white/10 bg-[#13161b]/80 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-5">
              <h2 className="text-xl font-black text-stone-100">Convertir a {target.toUpperCase()}</h2>
              <p className="mt-1 text-sm text-stone-400">Ahora selecciona el archivo de origen.</p>
              <div className="mt-4 rounded-md border border-white/10 bg-white/3 p-4 text-sm text-stone-300">
                Las conversiones Web se muestran solo si existen en la matriz browser efectiva. Usa Herramientas para ejecutar operaciones browser actuales.
              </div>
            </section>
          )}
          {tab === "tools" && !toolTab && (
            <ToolHub
              model={WEB_UX_MODEL}
              onOpenTool={(toolId) => setToolTab(toolId === "pdf" || toolId === "images" ? toolId : "structured")}
            />
          )}
          {tab === "tools" && toolTab && (
            <section className="rounded-lg border border-white/10 bg-[#13161b]/80 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-5">
              {toolTab === "images" && <ImageTool />}
              {toolTab === "pdf" && <PdfTool />}
              {toolTab === "structured" && <StructuredDataTool />}
            </section>
          )}
          {tab === "history" && <section className="rounded-lg border border-white/10 bg-[#13161b]/80 p-4 text-sm text-stone-400">El historial local está disponible en Desktop PRO.</section>}
          {tab === "diagnostics" && <section className="rounded-lg border border-white/10 bg-[#13161b]/80 p-4 text-sm text-stone-400">La versión Web usa capacidades browser y no motores nativos.</section>}

          <PrivacyNotice />
        </main>
      </div>
    </div>
  );
}

function TopButton({ href, active, onClick, icon, children }: { href: string; active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  const className = `flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 ${active ? "bg-teal-300 text-[#071112]" : "border border-white/12 text-stone-300 hover:bg-white/6"}`;
  return (
    <Link href={href} role="tab" aria-selected={active} onClick={onClick} className={className}>
      {icon}
      {children}
    </Link>
  );
}
