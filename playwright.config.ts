import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  outputDir: "artifacts/playwright/test-results",
  webServer: skipWebServer
    ? undefined
    : {
        command: "corepack pnpm@10.33.2 dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ANCLORA_FILESTUDIO_DEPLOYMENT_TARGET: process.env.ANCLORA_FILESTUDIO_DEPLOYMENT_TARGET ?? "local",
          NEXT_PUBLIC_ANCLORA_FILESTUDIO_MODE: process.env.NEXT_PUBLIC_ANCLORA_FILESTUDIO_MODE ?? "desktop-local",
        },
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
