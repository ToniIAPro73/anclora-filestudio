import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  postHandler: vi.fn(),
}));

vi.mock("@/lib/deployment-target", () => ({
  isVercelWeb: vi.fn(() => false),
}));

vi.mock("@/app/api/_desktop-route-loader", () => ({
  loadDesktopRoute: vi.fn(async () => ({
    POST: mocks.postHandler,
  })),
}));

describe("/api/metadata contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.postHandler.mockResolvedValue(
      NextResponse.json({
        title: "Metadata OK",
        durationSeconds: 12,
        availableHeights: [720],
      }),
    );
  });

  it("uses POST as the canonical metadata operation", async () => {
    const route = await import("@/app/api/metadata/route");
    const response = await route.POST(
      new Request("http://localhost/api/metadata", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/video" }),
      }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      title: "Metadata OK",
    });
    expect(mocks.postHandler).toHaveBeenCalledOnce();
  });

  it("returns explicit 405 and Allow: POST for GET", async () => {
    const route = await import("@/app/api/metadata/route");
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(body).toMatchObject({
      code: "METHOD_NOT_ALLOWED",
      allowedMethods: ["POST"],
    });
  });
});
