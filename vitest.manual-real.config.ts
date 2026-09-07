// Manual/real-network smoke tests — NEVER run by `pnpm test` (default
// vitest.config.mts only includes tests/**). These hit real yt-dlp/network
// and are intentionally excluded from CI. Run explicitly:
//   npx vitest run --config vitest.manual-real.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["scripts/**/*.real-smoke.test.ts"],
    environment: "node",
    testTimeout: 300_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
