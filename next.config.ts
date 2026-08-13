import type { NextConfig } from "next";

const isVercelWebBuild =
  process.env.ANCLORA_FILESTUDIO_DEPLOYMENT_TARGET === "vercel" ||
  process.env.NEXT_PUBLIC_ANCLORA_FILESTUDIO_MODE === "vercel-web";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsHmrCache: false,
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
    ],
  },
};

export default nextConfig;
