// Integration tests for route enrichment in POST /api/capabilities.
// Mocks the engine registry and engine-availability probing at the module
// boundary so route computation is fully deterministic.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/engines/registry", () => ({
  getCapabilities: vi.fn(),
  diagnoseAllEngines: vi.fn(),
  getEngine: vi.fn(),
  probeEngine: vi.fn(),
  invalidateProbeCache: vi.fn(),
}));

vi.mock("@/lib/conversion-routing/server", () => ({
  getAvailableEngineIds: vi.fn(),
}));

import { POST } from "../../src/app/api/capabilities/route";
import { getCapabilities } from "@/lib/engines/registry";
import { getAvailableEngineIds } from "@/lib/conversion-routing/server";
import { OPERATION_CATALOG } from "../../src/lib/domain/operations";
import type { CapabilityInfo } from "../../src/lib/domain/unified-analysis";
import type { UniversalFileDescriptor } from "../../src/lib/domain/descriptors";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const ALL_ENGINES = new Set(
  OPERATION_CATALOG.flatMap((op) => [op.engineId, ...op.dependencies]),
);

const DIRECT_PNG_CAPABILITY = {
  id: "sharp-convert-desc-1-png",
  operation: "convert-image",
  outputFormat: "png",
  outputMime: "image/png",
  label: "PNG",
  description: "Convertir a PNG",
  lossProfile: "lossy",
  state: "available",
  recommended: true,
  presets: [],
  warnings: [],
  engineId: "sharp-image",
  mobilePortability: "portable-domain",
};

function jpegDescriptor(): UniversalFileDescriptor {
  return {
    id: "desc-1",
    category: "image",
    originalName: "foto.jpeg",
    extension: "jpeg",
    detectedMimeType: "image/jpeg",
    detectedFormat: "jpeg",
    sizeBytes: 50_000,
    sha256: null,
    source: { kind: "local-upload", originalName: "foto.jpeg", storedRelativePath: "foto.jpeg" },
    attributes: {
      kind: "image",
      width: 800,
      height: 600,
      channels: 3,
      hasAlpha: false,
      format: "jpeg",
      colorSpace: "srgb",
      animated: false,
      frames: 1,
      densityPpi: 72,
      iccProfile: null,
    },
    warnings: [],
    analyzedBy: ["file-detector"],
    analyzedAt: new Date().toISOString(),
  };
}

function makeRequest(descriptor: UniversalFileDescriptor) {
  return new NextRequest("http://localhost/api/capabilities", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ universalDescriptor: descriptor }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/capabilities — route enrichment", () => {
  beforeEach(() => {
    vi.mocked(getCapabilities).mockResolvedValue([DIRECT_PNG_CAPABILITY] as never);
    vi.mocked(getAvailableEngineIds).mockResolvedValue(ALL_ENGINES);
  });

  it("attaches a direct route summary to an existing direct capability", async () => {
    const res = await POST(makeRequest(jpegDescriptor()));
    expect(res.status).toBe(200);
    const body = await res.json();
    const caps = body.capabilities as CapabilityInfo[];

    const png = caps.find((c) => c.id === DIRECT_PNG_CAPABILITY.id);
    expect(png).toBeDefined();
    expect(png?.route).toBeDefined();
    expect(png?.route?.classification).toBe("direct");
    expect(png?.route?.steps).toEqual([{ source: "jpeg", target: "png" }]);
    expect(png?.route?.recommended).toBe(true);
    // The summary must not leak engine or operation ids
    expect(JSON.stringify(png?.route)).not.toContain("sharp");
    expect(JSON.stringify(png?.route)).not.toContain("image:convert");
  });

  it("synthesizes a multistep-only destination as a route capability", async () => {
    const res = await POST(makeRequest(jpegDescriptor()));
    const body = await res.json();
    const caps = body.capabilities as CapabilityInfo[];

    // jpeg → png → ico has no direct edge in the operation catalog
    const ico = caps.find((c) => c.id === "route-jpeg-ico");
    expect(ico).toBeDefined();
    expect(ico?.outputFormat).toBe("ico");
    expect(ico?.state).toBe("available");
    expect(ico?.route?.classification).toBe("multistep");
    expect(ico?.route?.steps).toHaveLength(2);
    expect(ico?.route?.qualityBand).toBe("good");
  });

  it("never offers not-recommended routes as normal options", async () => {
    const res = await POST(makeRequest(jpegDescriptor()));
    const body = await res.json();
    const caps = body.capabilities as CapabilityInfo[];

    for (const cap of caps) {
      expect(cap.route?.qualityBand).not.toBe("not-recommended");
    }
  });
});
