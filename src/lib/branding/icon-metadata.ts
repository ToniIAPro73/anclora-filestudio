import crypto from "crypto";
import fs from "fs";
import path from "path";

export function publicAssetHash(publicPath: string): string {
  try {
    const filePath = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").slice(0, 12);
  } catch {
    return "missing";
  }
}

export function versionedPublicAsset(publicPath: string): string {
  return `${publicPath}?v=${publicAssetHash(publicPath)}`;
}

export function iconManifestHash(): string {
  const iconInputs = [
    "/favicon.ico",
    "/favicon-32.png",
    "/favicon-512.png",
    "/icon.png",
    "/apple-touch-icon.png",
  ];
  const hash = crypto.createHash("sha256");
  for (const asset of iconInputs) {
    hash.update(asset);
    hash.update(publicAssetHash(asset));
  }
  return hash.digest("hex").slice(0, 12);
}
