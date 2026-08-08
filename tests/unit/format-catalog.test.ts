// Unit tests for the format catalog — single source of truth for format definitions.

import { describe, it, expect } from "vitest";
import {
  FORMAT_CATALOG,
  ALL_ALLOWED_EXTENSIONS,
  INPUT_ACCEPT_ATTR,
  FORMATS_BY_CATEGORY,
  FORMAT_BY_EXTENSION,
  MIME_TO_FORMAT,
} from "../../src/lib/domain/format-catalog";
import type { FileCategory } from "../../src/lib/domain/descriptors";

// ── Extensions from the old lists in the analyze route ────────────────────────
const OLD_MEDIA_EXTENSIONS = ["mp3", "m4a", "wav", "flac", "ogg", "aac", "mp4", "webm", "mkv", "avi", "mov", "wmv", "ts"];
const OLD_UNIVERSAL_EXTENSIONS = [
  "jpg", "jpeg", "png", "webp", "avif", "tiff", "tif", "gif",
  "pdf",
  "zip", "7z", "tar", "gz", "bz2", "xz",
  "json", "yaml", "yml", "toml", "xml", "csv", "tsv",
  "md", "txt", "html", "htm",
];
const ALL_OLD_EXTENSIONS = [...OLD_MEDIA_EXTENSIONS, ...OLD_UNIVERSAL_EXTENSIONS];

// ── Required categories ───────────────────────────────────────────────────────
const REQUIRED_CATEGORIES: FileCategory[] = [
  "audio", "video", "image", "document", "spreadsheet", "presentation",
  "pdf", "ebook", "archive", "structured-data", "plain-text",
];

describe("Format Catalog — coverage", () => {
  it("all required categories have at least one format", () => {
    for (const cat of REQUIRED_CATEGORIES) {
      const formats = FORMATS_BY_CATEGORY.get(cat);
      expect(formats, `Category "${cat}" should have at least one format`).toBeDefined();
      expect(formats!.length, `Category "${cat}" should have at least one format`).toBeGreaterThan(0);
    }
  });

  it("every format has a valid category from the required set", () => {
    for (const fmt of FORMAT_CATALOG) {
      expect(REQUIRED_CATEGORIES, `Format "${fmt.id}" has category "${fmt.category}"`).toContain(fmt.category);
    }
  });

  it("every format has at least one input extension", () => {
    for (const fmt of FORMAT_CATALOG) {
      expect(fmt.inputExtensions.length, `Format "${fmt.id}" should have at least one input extension`).toBeGreaterThan(0);
    }
  });

  it("every format has at least one MIME type", () => {
    for (const fmt of FORMAT_CATALOG) {
      expect(fmt.mimeTypes.length, `Format "${fmt.id}" should have at least one MIME type`).toBeGreaterThan(0);
    }
  });

  it("every format has a non-empty output extension", () => {
    for (const fmt of FORMAT_CATALOG) {
      expect(fmt.outputExtension, `Format "${fmt.id}" should have an output extension`).toBeTruthy();
    }
  });

  it("every format has a preferred engine ID", () => {
    for (const fmt of FORMAT_CATALOG) {
      expect(fmt.preferredEngineId, `Format "${fmt.id}" should have a preferredEngineId`).toBeTruthy();
    }
  });

  it("every format has a valid mobilePortability value", () => {
    const validPortabilities = ["portable-domain", "replace-adapter-on-mobile", "desktop-only"];
    for (const fmt of FORMAT_CATALOG) {
      expect(validPortabilities, `Format "${fmt.id}" mobilePortability="${fmt.mobilePortability}"`).toContain(fmt.mobilePortability);
    }
  });
});

describe("Format Catalog — no duplicate extensions", () => {
  it("no extension appears in more than one format", () => {
    const seen = new Map<string, string>(); // extension → format id
    for (const fmt of FORMAT_CATALOG) {
      for (const ext of fmt.inputExtensions) {
        const existing = seen.get(ext);
        if (existing) {
          expect.fail(`Extension ".${ext}" is claimed by both "${existing}" and "${fmt.id}"`);
        }
        seen.set(ext, fmt.id);
      }
    }
  });
});

describe("Format Catalog — INPUT_ACCEPT_ATTR", () => {
  it("is a non-empty string", () => {
    expect(INPUT_ACCEPT_ATTR).toBeTruthy();
    expect(typeof INPUT_ACCEPT_ATTR).toBe("string");
  });

  it("starts with a dot", () => {
    expect(INPUT_ACCEPT_ATTR.startsWith(".")).toBe(true);
  });

  it("every entry starts with a dot and has no spaces", () => {
    const parts = INPUT_ACCEPT_ATTR.split(",");
    for (const part of parts) {
      expect(part.startsWith("."), `Part "${part}" should start with a dot`).toBe(true);
      expect(part.includes(" "), `Part "${part}" should not contain spaces`).toBe(false);
    }
  });

  it("covers all input extensions from the catalog", () => {
    for (const fmt of FORMAT_CATALOG) {
      for (const ext of fmt.inputExtensions) {
        expect(INPUT_ACCEPT_ATTR, `Should contain ".${ext}"`).toContain(`.${ext}`);
      }
    }
  });
});

describe("Format Catalog — old extensions coverage", () => {
  it("all old MEDIA_EXTENSIONS are in ALL_ALLOWED_EXTENSIONS", () => {
    for (const ext of OLD_MEDIA_EXTENSIONS) {
      expect(ALL_ALLOWED_EXTENSIONS.has(ext), `Old media extension ".${ext}" should be allowed`).toBe(true);
    }
  });

  it("all old UNIVERSAL_EXTENSIONS are in ALL_ALLOWED_EXTENSIONS", () => {
    for (const ext of OLD_UNIVERSAL_EXTENSIONS) {
      expect(ALL_ALLOWED_EXTENSIONS.has(ext), `Old universal extension ".${ext}" should be allowed`).toBe(true);
    }
  });

  it("all old extensions combined are in ALL_ALLOWED_EXTENSIONS", () => {
    for (const ext of ALL_OLD_EXTENSIONS) {
      expect(ALL_ALLOWED_EXTENSIONS.has(ext), `Old extension ".${ext}" should be allowed`).toBe(true);
    }
  });
});

describe("Format Catalog — FORMAT_BY_EXTENSION lookup", () => {
  it("every input extension from the catalog can be looked up", () => {
    for (const fmt of FORMAT_CATALOG) {
      for (const ext of fmt.inputExtensions) {
        const found = FORMAT_BY_EXTENSION.get(ext);
        expect(found, `Extension ".${ext}" should resolve to a format`).toBeDefined();
        expect(found!.id, `Extension ".${ext}" should resolve to format "${fmt.id}"`).toBe(fmt.id);
      }
    }
  });

  it("all old extensions resolve to the correct category", () => {
    const extCategory: Record<string, string> = {
      mp3: "audio", m4a: "audio", wav: "audio", flac: "audio", ogg: "audio", aac: "audio",
      mp4: "video", webm: "video", mkv: "video", avi: "video", mov: "video", wmv: "video", ts: "video",
      jpg: "image", jpeg: "image", png: "image", webp: "image", avif: "image", tiff: "image", tif: "image", gif: "image",
      docx: "document", doc: "document", odt: "document", rtf: "document",
      xlsx: "spreadsheet", xls: "spreadsheet", ods: "spreadsheet",
      pptx: "presentation", ppt: "presentation", odp: "presentation",
      pdf: "pdf",
      epub: "ebook", mobi: "ebook", azw3: "ebook",
      zip: "archive", "7z": "archive", tar: "archive", gz: "archive", bz2: "archive", xz: "archive",
      json: "structured-data", yaml: "structured-data", yml: "structured-data", toml: "structured-data",
      xml: "structured-data", csv: "structured-data", tsv: "structured-data",
      md: "plain-text", markdown: "plain-text", txt: "plain-text", html: "plain-text", htm: "plain-text",
    };

    for (const [ext, expectedCat] of Object.entries(extCategory)) {
      const found = FORMAT_BY_EXTENSION.get(ext);
      expect(found, `Extension ".${ext}" should resolve to a format`).toBeDefined();
      expect(found!.category, `Extension ".${ext}" should be category "${expectedCat}"`).toBe(expectedCat);
    }
  });

  it("non-existent extension returns undefined", () => {
    expect(FORMAT_BY_EXTENSION.get("xyz123")).toBeUndefined();
  });
});

describe("Format Catalog — MIME_TO_FORMAT lookup", () => {
  it("key MIME types resolve correctly", () => {
    const mimeExpectations: Record<string, string> = {
      "audio/mpeg": "mp3",
      "audio/flac": "flac",
      "video/mp4": "mp4",
      "video/webm": "webm",
      "image/jpeg": "jpeg",
      "image/png": "png",
      "application/pdf": "pdf",
      "application/zip": "zip",
      "application/json": "json",
      "text/html": "html",
      "text/plain": "txt",
      "text/markdown": "markdown",
      "text/csv": "csv",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
      "application/epub+zip": "epub",
    };

    for (const [mime, expectedId] of Object.entries(mimeExpectations)) {
      const found = MIME_TO_FORMAT.get(mime);
      expect(found, `MIME "${mime}" should resolve to a format`).toBeDefined();
      expect(found!.id, `MIME "${mime}" should resolve to format "${expectedId}"`).toBe(expectedId);
    }
  });

  it("non-existent MIME type returns undefined", () => {
    expect(MIME_TO_FORMAT.get("application/x-nonexistent")).toBeUndefined();
  });
});

describe("Format Catalog — new formats not in old lists", () => {
  it("covers additional formats beyond the old lists (rst, tex, latex, etc.)", () => {
    const newExtensions = ["rst", "tex", "latex", "azw3", "mobi", "epub", "pptx", "ppt", "odp",
      "xlsx", "xls", "ods", "doc", "odt", "rtf", "markdown"];
    for (const ext of newExtensions) {
      expect(ALL_ALLOWED_EXTENSIONS.has(ext), `New extension ".${ext}" should be in ALL_ALLOWED_EXTENSIONS`).toBe(true);
    }
  });
});
