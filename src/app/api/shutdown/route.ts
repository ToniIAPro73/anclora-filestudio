import type { NextRequest } from "next/server";
import { loadDesktopRoute } from "@/app/api/_desktop-route-loader";
import { desktopRequiredResponse } from "@/app/api/_desktop-required";
import { isVercelWeb } from "@/lib/deployment-target";

type SystemShutdownRoute = typeof import("@/server/desktop-routes/system-shutdown-route");

export async function GET(req: NextRequest) {
  if (isVercelWeb()) return desktopRequiredResponse();
  const route = await loadDesktopRoute<SystemShutdownRoute>("system-shutdown-route");
  return route.GET(req);
}
