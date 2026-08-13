import { describe, expect, it } from "vitest";
import {
  resolveInputFormatForJob,
  validateExplicitRouteSource,
} from "../../src/lib/jobs/source-format-contract";
import { getAllEffectiveTargets } from "../../src/lib/conversion-routing";

const desktopEngines = new Set([
  "libreoffice",
  "pandoc",
  "sharp-image",
  "sharp",
  "ffmpeg-media",
  "ffmpeg",
  "ffprobe",
  "qpdf",
  "poppler",
  "tesseract",
  "pdftoppm",
  "pdftotext",
  "pdftohtml",
  "calibre",
  "ebook-convert",
  "sevenzip",
  "7z",
  "data-ts",
]);

describe("explicit source format contract", () => {
  it("SOURCE-001 DOCX→PNG accepts DOCX", () => {
    expect(validateExplicitRouteSource("docx", "docx")).toEqual({
      valid: true,
      expected: "docx",
      actual: "docx",
    });
  });

  it("SOURCE-002 DOCX→PNG rejects MD", () => {
    expect(validateExplicitRouteSource("docx", "md")).toEqual({
      valid: false,
      expected: "docx",
      actual: "md",
    });
  });

  it("SOURCE-003 explicit PDF→PNG rejects DOCX", () => {
    expect(validateExplicitRouteSource("pdf", "docx")).toEqual({
      valid: false,
      expected: "pdf",
      actual: "docx",
    });
  });

  it("SOURCE-004 AUTO→PNG accepts valid reachable source", () => {
    const docxTargets = getAllEffectiveTargets("docx", desktopEngines, { environment: "linux" });
    expect(docxTargets.all.some((route) => route.destination === "png")).toBe(true);
  });

  it("SOURCE-005 AUTO→PNG rejects unreachable source", () => {
    const zipTargets = getAllEffectiveTargets("zip", desktopEngines, { environment: "linux" });
    expect(zipTargets.all.some((route) => route.destination === "png")).toBe(false);
  });

  it("SOURCE-006 backend cannot be bypassed when route source and detected source differ", () => {
    const detected = resolveInputFormatForJob({ detectedFormat: "yaml", extension: "md" });
    expect(detected).toBe("md");
    expect(validateExplicitRouteSource("docx", detected).valid).toBe(false);
  });

  it("SOURCE-007 explicit PDF→DOCX accepts PDF only", () => {
    expect(validateExplicitRouteSource("pdf", "pdf").valid).toBe(true);
    expect(validateExplicitRouteSource("pdf", "docx").valid).toBe(false);
    expect(validateExplicitRouteSource("pdf", "md").valid).toBe(false);
  });

  it("SOURCE-008 AUTO→DOCX accepts PDF as reachable source", () => {
    const pdfTargets = getAllEffectiveTargets("pdf", desktopEngines, { environment: "linux" });
    expect(pdfTargets.all.some((route) => route.destination === "docx")).toBe(true);
  });
});
