import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../../../src/lib/runtime-packs/install-service", () => ({
  cancelRuntimePackInstall: vi.fn(),
  getRuntimePackStatus: vi.fn(),
  startRuntimePackInstall: vi.fn(async () => ({ id: "chromium-runtime", install: { status: "downloading" } })),
}));

describe("runtime pack API consent contract", () => {
  it("rejects install without explicit consent before starting download", async () => {
    const service = await import("../../../src/lib/runtime-packs/install-service");
    const route = await import("../../../src/app/api/runtime-packs/[packId]/route");
    const request = new NextRequest("http://localhost/api/runtime-packs/chromium-runtime", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await route.POST(request, { params: Promise.resolve({ packId: "chromium-runtime" }) });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "RUNTIME_PACK_CONSENT_REQUIRED" });
    expect(service.startRuntimePackInstall).not.toHaveBeenCalled();
  });

  it("starts install only with consent true", async () => {
    const service = await import("../../../src/lib/runtime-packs/install-service");
    const route = await import("../../../src/app/api/runtime-packs/[packId]/route");
    const request = new NextRequest("http://localhost/api/runtime-packs/chromium-runtime", {
      method: "POST",
      body: JSON.stringify({ consent: true }),
    });

    const response = await route.POST(request, { params: Promise.resolve({ packId: "chromium-runtime" }) });

    expect(response.status).toBe(202);
    expect(service.startRuntimePackInstall).toHaveBeenCalledWith("chromium-runtime");
  });
});
