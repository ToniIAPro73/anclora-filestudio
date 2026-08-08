import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "@anclora/filestudio-core": path.resolve(import.meta.dirname, "../../packages/core/src/index.ts"),
    },
  },
});
