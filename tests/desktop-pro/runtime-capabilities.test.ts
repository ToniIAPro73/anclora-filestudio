import { describe, expect, it } from "vitest";
import { DESKTOP_PRO_GROUPS } from "../../src/lib/capabilities/desktop-capabilities";
import { getRuntimeCapabilities } from "../../src/lib/capabilities/runtime-capabilities";

describe("Desktop PRO runtime capabilities", () => {
  it("keeps the required task-oriented Desktop order", () => {
    expect(DESKTOP_PRO_GROUPS.map((group) => group.id)).toEqual([
      "images",
      "pdf",
      "media",
      "documents",
      "ocr",
      "archives",
      "ebooks",
      "structured",
    ]);
  });

  it("maps each Desktop group to the native tools it needs", () => {
    const byId = Object.fromEntries(DESKTOP_PRO_GROUPS.map((group) => [group.id, group]));
    expect(byId.images.requiredTools).toContain("Sharp");
    expect(byId.pdf.requiredTools).toEqual(expect.arrayContaining(["QPDF", "Poppler", "Tesseract"]));
    expect(byId.media.requiredTools).toEqual(expect.arrayContaining(["FFmpeg", "FFprobe", "yt-dlp"]));
    expect(byId.documents.requiredTools).toEqual(expect.arrayContaining(["LibreOffice", "Pandoc"]));
    expect(byId.ocr.requiredTools).toEqual(expect.arrayContaining(["Tesseract", "Poppler"]));
    expect(byId.archives.requiredTools).toContain("7-Zip");
    expect(byId.ebooks.requiredTools).toContain("Calibre");
    expect(byId.structured.requiredTools).toContain("Data Engine");
  });

  it("keeps Vercel Web limited to browser tools", () => {
    const capabilities = getRuntimeCapabilities("vercel-web");
    expect(capabilities.groups).toEqual(["images", "pdf", "structured"]);
    expect(capabilities.uploads).toBe(false);
    expect(capabilities.serverConversions).toBe(false);
    expect(capabilities.desktopGroups).toEqual([]);
  });

  it("exposes Desktop as the local superset", () => {
    const capabilities = getRuntimeCapabilities("desktop-local");
    expect(capabilities.groups).toContain("media");
    expect(capabilities.groups).toContain("documents");
    expect(capabilities.groups).toContain("ocr");
    expect(capabilities.webTools).not.toBeNull();
    expect(capabilities.desktopGroups).toHaveLength(DESKTOP_PRO_GROUPS.length);
    expect(capabilities.serverConversions).toBe(true);
  });
});
