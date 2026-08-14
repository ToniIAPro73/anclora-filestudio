"use client";

import { useEffect, useState } from "react";
import { Power, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AdminStatus {
  requiresToken: boolean;
  tokenConfigured: boolean;
}

export function CloseAppButton() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        // runtime.loopbackOnly is only present on desktop/service targets —
        // absent on the Vercel-web branch, which never ships this route.
        if (typeof data?.runtime?.loopbackOnly === "boolean") setVisible(true);
      })
      .catch(() => {
        // Non-fatal — button just stays hidden
      });
    // Reuses the cookies status endpoint — same admin token, same gate.
    fetch("/api/settings/cookies")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStatus({ requiresToken: data.requiresToken, tokenConfigured: data.tokenConfigured });
      })
      .catch(() => {});
  }, []);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      setError(null);
      return;
    }
    setClosing(true);
    setError(null);
    fetch("/api/shutdown", {
      headers: status?.requiresToken ? { "x-anclora-admin-token": token } : undefined,
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "No se pudo cerrar la aplicación.");
        }
      })
      .then(() => {
        toast.success("Anclora FileStudio se ha cerrado. Ya puedes cerrar esta pestaña.");
      })
      .catch((err: Error) => {
        setError(err.message);
        setClosing(false);
      });
  }

  if (!visible) return null;

  if (closing && !error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08090b]/95 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-teal-300" aria-hidden="true" />
          <p className="text-sm font-medium text-stone-200">Anclora FileStudio se ha cerrado.</p>
          <p className="text-xs text-stone-500">Ya puedes cerrar esta pestaña.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-40 flex flex-col items-end gap-2">
      {confirming && status?.requiresToken && (
        <input
          type="password"
          placeholder="Token de administrador"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-48 rounded-md border border-white/10 bg-[#13161b]/95 px-2.5 py-1.5 text-xs text-stone-100 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur placeholder:text-stone-500"
        />
      )}
      <button
        type="button"
        onClick={handleClick}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) setConfirming(false);
        }}
        title={confirming ? "Confirmar cierre de la aplicación" : "Cerrar Anclora FileStudio"}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur transition-all duration-200 ${
          confirming
            ? "border-red-400/40 bg-red-500/15 text-red-200 hover:bg-red-500/25"
            : "border-white/10 bg-[#13161b]/90 text-stone-400 hover:border-red-400/30 hover:text-red-300"
        }`}
      >
        <Power className="h-3.5 w-3.5" aria-hidden="true" />
        {confirming ? "¿Seguro? Pulsa de nuevo" : "Cerrar aplicación"}
      </button>
      {error && <p className="max-w-48 text-right text-[11px] text-red-300">{error}</p>}
    </div>
  );
}
