import { NextRequest, NextResponse } from "next/server";
import {
  cancelRuntimePackInstall,
  getRuntimePackStatus,
  startRuntimePackInstall,
} from "@/lib/runtime-packs/install-service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ packId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { packId } = await context.params;
  return NextResponse.json(await getRuntimePackStatus(packId));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { packId } = await context.params;
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!body || typeof body !== "object" || (body as { consent?: unknown }).consent !== true) {
    return NextResponse.json(
      { error: "Explicit consent is required to download and install this runtime pack.", code: "RUNTIME_PACK_CONSENT_REQUIRED" },
      { status: 403 }
    );
  }
  return NextResponse.json(await startRuntimePackInstall(packId), { status: 202 });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { packId } = await context.params;
  return NextResponse.json(await cancelRuntimePackInstall(packId));
}
