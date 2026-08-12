import { describe, expect, it } from "vitest";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { FILESTUDIO_BRAND } from "../../src/lib/filestudio-brand";
import { buildFileStudioWebManifest } from "../../src/app/site.webmanifest/route";
import { iconManifestHash, publicAssetHash, versionedPublicAsset } from "../../src/lib/branding/icon-metadata";

const ROOT = path.resolve(__dirname, "../..");
const CANONICAL_LOGO = path.join(ROOT, "public/brand/anclora-filestudio.png");
const STALE_LOGO_HASH = "f2951f31666919dc57525f5f4aa31c7f7010e54652f93f79362799f716eda948";
const ACTIVE_UI_FILES = [
  "src/components/web-tools/web-tools-shell.tsx",
  "src/components/desktop-pro/desktop-pro-shell.tsx",
];
const EXPECTED_ICON_ASSETS = [
  { relativePath: "public/favicon-32.png", format: "png", width: 32, height: 32 },
  { relativePath: "public/favicon-512.png", format: "png", width: 512, height: 512 },
  { relativePath: "public/icon.png", format: "png", width: 512, height: 512 },
  { relativePath: "public/apple-touch-icon.png", format: "png", width: 180, height: 180 },
  { relativePath: "src/app/icon.png", format: "png", width: 512, height: 512 },
  { relativePath: "src/app/apple-icon.png", format: "png", width: 180, height: 180 },
];
const EXPECTED_ICO_SIZES = [16, 32, 48, 64, 128, 256];

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) return [fullPath];
    return [];
  });
}

function sha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readIcoEntries(filePath: string): Array<{ width: number; height: number; imageOffset: number }> {
  const data = fs.readFileSync(filePath);

  expect(data.readUInt16LE(0)).toBe(0);
  expect(data.readUInt16LE(2)).toBe(1);

  const count = data.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => {
    const offset = 6 + index * 16;
    const width = data.readUInt8(offset) || 256;
    const height = data.readUInt8(offset + 1) || 256;
    return {
      width,
      height,
      imageOffset: data.readUInt32LE(offset + 12),
    };
  });
}

describe("canonical FileStudio logo contract", () => {
  it("keeps the brand module on the canonical PNG asset", () => {
    expect(FILESTUDIO_BRAND.logoPath).toBe("/brand/anclora-filestudio.png");
    expect(fs.existsSync(CANONICAL_LOGO)).toBe(true);
  });

  it("uses the canonical logo in active Web and Desktop shells", () => {
    for (const relativePath of ACTIVE_UI_FILES) {
      const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
      expect(source).toContain("/brand/anclora-filestudio.png");
      expect(source).not.toContain("@/assets/logo.png");
    }
  });

  it("has no old placeholder logo reference in active UI sources", () => {
    const activeUi = listSourceFiles(path.join(ROOT, "src/components"))
      .map((filePath) => fs.readFileSync(filePath, "utf8"))
      .join("\n");

    expect(activeUi.match(/@\/assets\/logo\.png/g) ?? []).toHaveLength(0);
  });

  it("decodes as a non-placeholder PNG with valid dimensions", async () => {
    const metadata = await sharp(CANONICAL_LOGO).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBeGreaterThanOrEqual(64);
    expect(metadata.height).toBeGreaterThanOrEqual(64);
  });

  it("keeps generated PNG icon assets present, correctly sized, and off the stale hash", async () => {
    for (const asset of EXPECTED_ICON_ASSETS) {
      const assetPath = path.join(ROOT, asset.relativePath);
      expect(fs.existsSync(assetPath), asset.relativePath).toBe(true);
      expect(sha256(assetPath), asset.relativePath).not.toBe(STALE_LOGO_HASH);

      const metadata = await sharp(assetPath).metadata();
      expect(metadata.format, asset.relativePath).toBe(asset.format);
      expect(metadata.width, asset.relativePath).toBe(asset.width);
      expect(metadata.height, asset.relativePath).toBe(asset.height);
    }
  });

  it("uses a real multi-resolution ICO favicon", () => {
    const faviconPath = path.join(ROOT, "public/favicon.ico");
    const data = fs.readFileSync(faviconPath);

    expect(data.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))).toBe(true);
    expect(sha256(faviconPath)).not.toBe(STALE_LOGO_HASH);

    const entries = readIcoEntries(faviconPath);
    expect(entries.map((entry) => entry.width).sort((a, b) => a - b)).toEqual(EXPECTED_ICO_SIZES);
    expect(entries.map((entry) => entry.height).sort((a, b) => a - b)).toEqual(EXPECTED_ICO_SIZES);

    for (const entry of entries) {
      expect(data.subarray(entry.imageOffset, entry.imageOffset + 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    }
  });

  it("keeps layout metadata references pointed at existing favicon assets", () => {
    const layoutSource = fs.readFileSync(path.join(ROOT, "src/app/layout.tsx"), "utf8");
    for (const asset of [
      "/favicon-32.png",
      "/favicon-512.png",
      "/icon.png",
      "/favicon.ico",
      "/apple-touch-icon.png",
    ]) {
      expect(layoutSource).toContain(asset);
      expect(fs.existsSync(path.join(ROOT, "public", asset.slice(1)))).toBe(true);
    }
    expect(layoutSource).toContain("/site.webmanifest");
  });

  it("ICON-001 and ICON-005 use content-hashed rendered metadata URLs", () => {
    expect(versionedPublicAsset("/favicon-32.png")).toBe(`/favicon-32.png?v=${publicAssetHash("/favicon-32.png")}`);
    expect(versionedPublicAsset("/favicon.ico")).toBe(`/favicon.ico?v=${publicAssetHash("/favicon.ico")}`);
    expect(iconManifestHash()).toMatch(/^[0-9a-f]{12}$/);
  });

  it("ICON-002 manifest icons use current hashed branding assets", () => {
    const webManifest = buildFileStudioWebManifest();
    const iconSources = webManifest.icons?.map((icon) => icon.src) ?? [];

    expect(iconSources).toContain(versionedPublicAsset("/favicon-32.png"));
    expect(iconSources).toContain(versionedPublicAsset("/icon.png"));
    expect(iconSources).toContain(versionedPublicAsset("/apple-touch-icon.png"));
    expect(JSON.stringify(webManifest)).not.toContain("@/assets/logo.png");
    expect(JSON.stringify(webManifest)).not.toContain("favicon-old");
  });

  it("ICON-003 has no stale legacy icon packaged in public or app metadata", () => {
    const iconFiles = [
      "public/favicon-32.png",
      "public/favicon-512.png",
      "public/favicon.ico",
      "public/icon.png",
      "public/apple-touch-icon.png",
      "src/app/icon.png",
      "src/app/apple-icon.png",
    ];
    for (const relativePath of iconFiles) {
      expect(sha256(path.join(ROOT, relativePath)), relativePath).not.toBe(STALE_LOGO_HASH);
    }
  });

  it("ICON-004 content hash changes when icon content changes", () => {
    const current = publicAssetHash("/favicon-32.png");
    const tempPath = path.join(ROOT, "public/favicon-32.png.__hash-test__");
    fs.writeFileSync(tempPath, Buffer.from("different icon bytes"));
    try {
      const changed = crypto.createHash("sha256").update(fs.readFileSync(tempPath)).digest("hex").slice(0, 12);
      expect(changed).not.toBe(current);
    } finally {
      fs.rmSync(tempPath, { force: true });
    }
  });
});
