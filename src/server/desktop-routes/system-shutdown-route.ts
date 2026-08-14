import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/security/admin-token";

/**
 * Graceful shutdown. stop-anclora-filestudio.ps1 already calls this (as an
 * unauthenticated loopback request) as its preferred path before force-
 * killing the process by PID — that keeps working since loopback requests
 * are always authorized. On a non-loopback deployment (VPS/service) this
 * also kills the shared dev server for whoever else is using it, so it
 * requires the same admin token as the cookies upload.
 */
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json(
      { error: "No autorizado. Token de administrador requerido o incorrecto.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // Respond before exiting so the caller (browser fetch or the .ps1 script)
  // actually receives the confirmation before the process disappears.
  setTimeout(() => process.exit(0), 150);
  return NextResponse.json({ ok: true, message: "Cerrando Anclora FileStudio…" });
}
