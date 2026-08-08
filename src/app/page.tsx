"use client";

import { DesktopProShell } from "@/components/desktop-pro/desktop-pro-shell";
import { WebModeConverter } from "@/components/converter/web-mode-converter";

export default function Home() {
  const isWebMode = process.env.NEXT_PUBLIC_ANCLORA_FILESTUDIO_MODE === "vercel-web";

  if (isWebMode) {
    return (
      <div lang="es" className="min-h-screen bg-[#0d0f12] text-[#f4f1ea]">
        <WebModeConverter />
      </div>
    );
  }

  return <DesktopProShell />;
}
