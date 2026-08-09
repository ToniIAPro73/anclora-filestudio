import { afterAll, describe, expect, it } from "vitest";
import JSZip from "jszip";
import fs from "fs";
import os from "os";
import path from "path";
import { detectFile } from "../../src/lib/detection/file-detector";
import { CalibreEngine } from "../../src/lib/engines/ebook/calibre-engine";
import type { EngineProbeResult } from "../../src/lib/domain/engines";
import crypto from "crypto";

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "filestudio-epub-detector-"));

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

async function writeZip(name: string, entries: Record<string, string>): Promise<string> {
  const zip = new JSZip();
  for (const [entryName, content] of Object.entries(entries)) zip.file(entryName, content);
  const filePath = path.join(testDir, name);
  fs.writeFileSync(filePath, await zip.generateAsync({ type: "nodebuffer" }));
  return filePath;
}

async function writeValidEpub(name = "book.epub"): Promise<string> {
  return writeZip(name, {
    mimetype: "application/epub+zip",
    "META-INF/container.xml": `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
    "OEBPS/content.opf": `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata/></package>`,
    "OEBPS/chapter.xhtml": "<html xmlns=\"http://www.w3.org/1999/xhtml\"><body>Test</body></html>",
  });
}

describe("file-detector — EPUB versus ZIP", () => {
  it("detects a structurally valid EPUB as ebook/epub", async () => {
    const result = await detectFile(await writeValidEpub());
    expect(result.category).toBe("ebook");
    expect(result.detectedFormat).toBe("epub");
    expect(result.detectedMimeType).toBe("application/epub+zip");
  });

  it("keeps an ordinary ZIP classified as archive/zip", async () => {
    const result = await detectFile(await writeZip("ordinary.zip", { "notes.txt": "not an ebook" }));
    expect(result.category).toBe("archive");
    expect(result.detectedFormat).toBe("zip");
  });

  it("does not promote an ordinary ZIP solely because it is named .epub", async () => {
    const result = await detectFile(await writeZip("fake.epub", { "notes.txt": "not an ebook" }));
    expect(result.category).toBe("archive");
    expect(result.detectedFormat).toBe("zip");
  });
});

describe("Calibre capability routing after EPUB detection", () => {
  it("resolves ebook capabilities when ebook-convert is available", () => {
    const engine = new CalibreEngine();
    const probe: EngineProbeResult = {
      available: true,
      version: "calibre test probe",
      binaryPath: "/usr/bin/ebook-convert",
      capabilities: ["epub", "pdf", "mobi", "azw3"],
    };
    const capabilities = engine.getCapabilities(
      {
        id: crypto.randomUUID(),
        category: "ebook",
        originalName: "book.epub",
        extension: "epub",
        detectedMimeType: "application/epub+zip",
        detectedFormat: "epub",
        sizeBytes: 1024,
        sha256: null,
        source: { kind: "local-upload", originalName: "book.epub", storedRelativePath: "book.epub" },
        attributes: {
          kind: "ebook",
          hasDrm: false,
          pageCount: null,
          title: null,
          author: null,
          language: null,
          publisher: null,
          ebookFormat: "epub",
        },
        warnings: [],
        analyzedBy: [],
        analyzedAt: new Date().toISOString(),
      },
      probe,
    );
    expect(capabilities.map((capability) => capability.outputFormat)).toEqual(["mobi", "azw3", "pdf"]);
    expect(capabilities.every((capability) => capability.state === "available")).toBe(true);
  });
});
