import type { NextRequest } from "next/server";
import { loadDesktopRoute } from "@/app/api/_desktop-route-loader";
import { desktopRequiredResponse } from "@/app/api/_desktop-required";
import { isVercelWeb } from "@/lib/deployment-target";

type SettingsCookiesRoute = typeof import("@/server/desktop-routes/settings-cookies-route");

export async function GET() {
  if (isVercelWeb()) return desktopRequiredResponse();
  const route = await loadDesktopRoute<SettingsCookiesRoute>("settings-cookies-route");
  return route.GET();
}

export async function POST(req: NextRequest) {
  if (isVercelWeb()) return desktopRequiredResponse();
  const route = await loadDesktopRoute<SettingsCookiesRoute>("settings-cookies-route");
  return route.POST(req);
}

export async function DELETE(req: NextRequest) {
  if (isVercelWeb()) return desktopRequiredResponse();
  const route = await loadDesktopRoute<SettingsCookiesRoute>("settings-cookies-route");
  return route.DELETE(req);
}
