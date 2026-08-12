import { NextResponse } from "next/server";
import type { MetadataRoute } from "next";
import { FILESTUDIO_BRAND } from "@/lib/filestudio-brand";
import { versionedPublicAsset } from "@/lib/branding/icon-metadata";

export function buildFileStudioWebManifest(): MetadataRoute.Manifest {
  return {
    name: FILESTUDIO_BRAND.name,
    short_name: FILESTUDIO_BRAND.shortName,
    description: FILESTUDIO_BRAND.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: FILESTUDIO_BRAND.themeColor,
    theme_color: FILESTUDIO_BRAND.themeColor,
    icons: [
      {
        src: versionedPublicAsset("/favicon-32.png"),
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
      {
        src: versionedPublicAsset("/icon.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: versionedPublicAsset("/apple-touch-icon.png"),
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

export function GET() {
  return NextResponse.json(buildFileStudioWebManifest(), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
