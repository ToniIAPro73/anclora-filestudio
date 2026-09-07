// Desktop-only scope enforcement (Fase 1 / GATE: DESKTOP_ONLY_SCOPE,
// WEB_UNCHANGED). The "video-audio" tool category must never appear when
// building the UX model for the Web engine set, and must appear on Desktop
// once ffmpeg-media/whisper-cli are available.

import { describe, expect, it } from "vitest";
import { buildToolCategories } from "../../src/lib/ux-v3/conversion-ux-model";
import { getRuntimeCapabilities } from "../../src/lib/capabilities/runtime-capabilities";

describe("Video/Audio tools — Desktop-only gating", () => {
  it("never appears in the Web tool categories, regardless of engine set", () => {
    const tools = buildToolCategories("web", new Set(["browser", "data-ts", "ffmpeg-media", "whisper-cli"]));
    expect(tools.some((t) => t.id === "video-audio")).toBe(false);
  });

  it("appears on Desktop and is visible even when whisper-cli is missing", () => {
    const tools = buildToolCategories("linux", new Set(["ffmpeg-media", "ffprobe"]));
    expect(tools.some((t) => t.id === "video-audio")).toBe(true);
  });

  it("appears on Desktop when only whisper-cli is available (ffmpeg missing)", () => {
    const tools = buildToolCategories("linux", new Set(["whisper-cli"]));
    expect(tools.some((t) => t.id === "video-audio")).toBe(true);
  });

  it("is always visible on Desktop even when both ffmpeg and whisper are missing (graceful degradation)", () => {
    const tools = buildToolCategories("linux", new Set(["sharp-image"]));
    expect(tools.some((t) => t.id === "video-audio")).toBe(true);
  });

  it("maintains the target UX order on Desktop: PDF, Imágenes, Vídeo y audio, Metadata, Compresión", () => {
    const tools = buildToolCategories("linux", new Set(["qpdf", "sharp-image", "ffmpeg-media", "data-ts"]));
    const ids = tools.map((t) => t.id);
    expect(ids.indexOf("pdf")).toBeLessThan(ids.indexOf("images"));
    expect(ids.indexOf("images")).toBeLessThan(ids.indexOf("video-audio"));
    expect(ids.indexOf("video-audio")).toBeLessThan(ids.indexOf("metadata"));
    expect(ids.indexOf("metadata")).toBeLessThan(ids.indexOf("compression"));
  });

  it("does not duplicate metadata and utilities (utilities card absent, metadata includes inspect)", () => {
    const tools = buildToolCategories("linux", new Set(["data-ts"]));
    expect(tools.some((t) => t.id === "utilities")).toBe(false);
    const metaTool = tools.find((t) => t.id === "metadata");
    expect(metaTool).toBeDefined();
    expect(metaTool?.operations.some((op) => op.id === "data:inspect")).toBe(true);
  });

  it("getRuntimeCapabilities('vercel-web') never includes the video-audio family", () => {
    const caps = getRuntimeCapabilities("vercel-web");
    expect(caps.desktopGroups.some((g) => g.id === "video-audio-tools")).toBe(false);
  });

  it("getRuntimeCapabilities('desktop-local') includes the video-audio family", () => {
    const caps = getRuntimeCapabilities("desktop-local");
    expect(caps.desktopGroups.some((g) => g.id === "video-audio-tools")).toBe(true);
  });
});
