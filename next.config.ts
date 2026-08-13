import type { NextConfig } from "next";

const isVercelWebBuild =
  process.env.ANCLORA_FILESTUDIO_DEPLOYMENT_TARGET === "vercel" ||
  process.env.NEXT_PUBLIC_ANCLORA_FILESTUDIO_MODE === "vercel-web";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: process.env.NODE_ENV === "development"
    ? ["127.0.0.1", "filestudio.dev.anclora.com"]
    : undefined,
  images: {
    unoptimized: true,
  },
  serverExternalPackages: isVercelWebBuild ? [] : ["better-sqlite3"],
  // Dynamic filesystem operations (portable-configurable data/temp/log dirs,
  // engine binary probing) make Turbopack's output file tracer fall back to
  // tracing the whole pnpm workspace for every API route. None of these
  // sibling workspace paths are runtime dependencies of this app, so exclude
  // them explicitly to keep the standalone output free of unrelated build
  // artifacts (apps/*, packages/*) and runtime-only local state (data/*.sqlite,
  // previously built dist/* portable archives).
  outputFileTracingExcludes: {
    "**/*": [
      "./data/**",
      "./dist/**",
      "./apps/**",
      "./packages/**",
      "./docs/**",
      "./tests/**",
      "./artifacts/**",
      "./scripts/**",
      "./deploy/**",
      // Root-level project files are never runtime dependencies of the
      // standalone server: docs, branding assets, tooling configs, lockfiles
      // and test configs. Dynamic runtime fs paths (portable temp/data dirs,
      // engine binary probing) make Turbopack's tracer fall back to including
      // the whole project root; without these excludes the NFT list pulls in
      // junk like AGENTS.md and next.config.ts itself, which trips the
      // "unexpected file in NFT list" warning for every API route.
      // package.json stays: it is a legitimate runtime-adjacent manifest.
      "./next.config.ts",
      "./tsconfig.json",
      "./tsconfig.tsbuildinfo",
      "./vitest.config.mts",
      "./vitest.*.config.ts",
      "./playwright.config.ts",
      "./eslint.config.mjs",
      "./postcss.config.mjs",
      "./components.json",
      "./vercel.json",
      "./render.yaml",
      "./metadata.json",
      "./release-manifest.json",
      "./SBOM.cdx.json",
      "./THIRD_PARTY_NOTICES.txt",
      "./pnpm-lock.yaml",
      "./pnpm-workspace.yaml",
      "./*.md",
      "./*.png",
      "./*.bat",
      "./*.sh",
      "./public/**",
    ],
  },
};

export default nextConfig;
