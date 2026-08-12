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

  it("returns direct route-discovered capabilities instead of engine-local ids", async () => {
    const res = await POST(makeRequest(jpegDescriptor()));
    expect(res.status).toBe(200);
    const body = await res.json();
    const caps = body.capabilities as CapabilityInfo[];

    const png = caps.find((c) => c.id === "route-jpg-png");
    expect(png).toBeDefined();
    expect(caps.some((c) => c.id === DIRECT_PNG_CAPABILITY.id)).toBe(false);
    expect(png?.route).toBeDefined();
    expect(png?.route?.classification).toBe("direct");
    expect(png?.route?.steps).toEqual([{ source: "jpg", target: "png" }]);
    expect(png?.route?.recommended).toBe(true);
    // The summary must not leak engine or operation ids
    expect(JSON.stringify(png?.route)).not.toContain("sharp");
    expect(JSON.stringify(png?.route)).not.toContain("image:convert");
  });

  it("does not synthesize invalid multistep-only destinations", async () => {
    const res = await POST(makeRequest(jpegDescriptor()));
    const body = await res.json();
    const caps = body.capabilities as CapabilityInfo[];

    const ico = caps.find((c) => c.outputFormat === "ico" || c.id.includes("ico"));
    expect(ico).toBeUndefined();
  });

  it("never offers not-recommended routes as normal options", async () => {
    const res = await POST(makeRequest(jpegDescriptor()));
    const body = await res.json();
    const caps = body.capabilities as CapabilityInfo[];

    for (const cap of caps) {
      expect(cap.route?.qualityBand).not.toBe("not-recommended");
    }
  });

  it("DISCOVERY-013 exposes PDF→PNG from route discovery even when engine-local caps are empty", async () => {
    vi.mocked(getCapabilities).mockResolvedValue([] as never);
    const descriptor: UniversalFileDescriptor = {
      ...jpegDescriptor(),
      id: "pdf-1",
      category: "pdf",
      originalName: "input.pdf",
      extension: "pdf",
      detectedMimeType: "application/pdf",
      detectedFormat: "pdf",
      source: { kind: "local-upload", originalName: "input.pdf", storedRelativePath: "input.pdf" },
      attributes: {
        kind: "pdf",
        pageCount: 1,
        isEncrypted: false,
        isLinearized: false,
        pdfVersion: "1.7",
        hasAnnotations: false,
        hasForms: false,
        hasEmbeddedFiles: false,
      },
    } as UniversalFileDescriptor;

    const res = await POST(makeRequest(descriptor));
    expect(res.status).toBe(200);
    const body = await res.json();
    const caps = body.capabilities as CapabilityInfo[];
    const png = caps.find((c) => c.id === "route-pdf-png");

    expect(png).toBeDefined();
    expect(png?.state).toBe("available");
    expect(png?.route?.classification).toBe("direct");
    expect(png?.route?.steps).toEqual([{ source: "pdf", target: "png" }]);
  });
});
