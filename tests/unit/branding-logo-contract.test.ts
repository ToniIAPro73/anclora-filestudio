import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { FILESTUDIO_BRAND } from "../../src/lib/filestudio-brand";

const ROOT = path.resolve(__dirname, "../..");
const CANONICAL_LOGO = path.join(ROOT, "public/brand/anclora-filestudio.png");
const ACTIVE_UI_FILES = [
  "src/components/web-tools/web-tools-shell.tsx",
  "src/components/desktop-pro/desktop-pro-shell.tsx",
];

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) return [fullPath];
    return [];
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
});
