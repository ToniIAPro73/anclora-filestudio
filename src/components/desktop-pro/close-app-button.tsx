"use client";

import { useEffect, useState } from "react";
import { Power, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  function handleConfirm() {
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
    <AlertDialog open={confirming} onOpenChange={(open) => { if (!closing) { setConfirming(open); if (!open) setError(null); } }}>
      <div className="fixed top-4 right-4 z-40 flex flex-col items-end gap-2">
        <AlertDialogTrigger
          className="ac-button ac-button--destructive ac-button--compact shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          onClick={() => { setError(null); setConfirming(true); }}
          aria-label="Cerrar Anclora FileStudio"
        >
          <Power className="h-3.5 w-3.5" aria-hidden="true" />
          Cerrar aplicación
        </AlertDialogTrigger>
      </div>
      <AlertDialogContent className="ac-modal ac-pattern-destructive-confirmation max-w-lg">
        <AlertDialogHeader className="ac-pattern-destructive-confirmation__header">
          <AlertDialogTitle>Cerrar Anclora FileStudio</AlertDialogTitle>
          <AlertDialogDescription className="ac-pattern-destructive-confirmation__consequence">
            Se detendrá la aplicación local y sus operaciones activas. Esta acción no elimina archivos ni cambia datos de producción.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {status?.requiresToken && (
          <div className="ac-form-field">
            <label className="ac-form-field__label" htmlFor="close-app-admin-token">Token de administrador</label>
            <input
              id="close-app-admin-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="field-input w-full"
              autoComplete="off"
            />
          </div>
        )}
        {error && <div className="ac-alert" data-tone="danger" role="alert"><div className="ac-alert__content"><p className="ac-alert__summary">{error}</p></div></div>}
        <AlertDialogFooter className="ac-pattern-destructive-confirmation__actions">
          <AlertDialogCancel className="ac-button ac-button--ghost" onClick={() => setError(null)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="ac-button ac-button--destructive" onClick={handleConfirm} disabled={closing}>Cerrar aplicación</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
