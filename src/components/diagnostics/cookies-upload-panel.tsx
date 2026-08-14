"use client";

import { useEffect, useRef, useState } from "react";
import { Cookie, Upload, Trash2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface CookiesStatus {
  present: boolean;
  requiresToken: boolean;
  tokenConfigured: boolean;
}

export function CookiesUploadPanel() {
  const [status, setStatus] = useState<CookiesStatus | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refreshStatus() {
    fetch("/api/settings/cookies")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStatus(data);
      })
      .catch(() => {
        // Non-fatal — panel just stays in loading state
      });
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setMessage({ kind: "error", text: "Selecciona primero un archivo cookies.txt." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/settings/cookies", {
        method: "POST",
        headers: status?.requiresToken ? { "x-anclora-admin-token": token } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? "No se pudo guardar el archivo." });
      } else {
        setMessage({ kind: "ok", text: `Cookies guardadas (${data.domainCount} sitio${data.domainCount === 1 ? "" : "s"}).` });
        if (fileInputRef.current) fileInputRef.current.value = "";
        refreshStatus();
      }
    } catch {
      setMessage({ kind: "error", text: "Error de red al subir el archivo." });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/cookies", {
        method: "DELETE",
        headers: status?.requiresToken ? { "x-anclora-admin-token": token } : undefined,
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage({ kind: "error", text: data.error ?? "No se pudo eliminar el archivo." });
      } else {
        setMessage({ kind: "ok", text: "Cookies eliminadas." });
        refreshStatus();
      }
    } catch {
      setMessage({ kind: "error", text: "Error de red al eliminar el archivo." });
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        <Cookie className="h-4 w-4 text-stone-300" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-stone-100">Cookies para vídeos que piden inicio de sesión</h3>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-stone-400">
        Opcional, bajo tu responsabilidad. Exporta cookies.txt (formato Netscape) solo del
        sitio necesario — YouTube, X o Instagram — desde una cuenta secundaria, nunca la
        personal. No exportes todas las cookies del navegador.
      </p>

      <div className="mt-3 flex items-center gap-2 text-xs">
        {status.present ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Cookies configuradas
          </span>
        ) : (
          <span className="text-stone-500">Sin cookies configuradas</span>
        )}
      </div>

      {status.requiresToken && !status.tokenConfigured && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Subida deshabilitada: falta configurar el token de administrador en este servidor.
        </p>
      )}

      {(!status.requiresToken || status.tokenConfigured) && (
        <div className="mt-3 space-y-2">
          {status.requiresToken && (
            <input
              type="password"
              placeholder="Token de administrador"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-stone-100 placeholder:text-stone-500"
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            className="w-full text-xs text-stone-300 file:mr-2 file:rounded-md file:border-0 file:bg-white/10 file:px-2.5 file:py-1.5 file:text-xs file:text-stone-100"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
              Guardar
            </button>
            {status.present && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-white/5 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Eliminar
              </button>
            )}
          </div>
        </div>
      )}

      {message && (
        <p className={`mt-2.5 text-xs ${message.kind === "ok" ? "text-emerald-400" : "text-rose-300"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
