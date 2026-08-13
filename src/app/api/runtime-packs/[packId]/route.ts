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

export async function POST(_request: NextRequest, context: RouteContext) {
  const { packId } = await context.params;
  return NextResponse.json(await startRuntimePackInstall(packId), { status: 202 });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { packId } = await context.params;
  return NextResponse.json(await cancelRuntimePackInstall(packId));
}
