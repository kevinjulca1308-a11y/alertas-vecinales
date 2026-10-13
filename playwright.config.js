import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: "list",
  outputDir: "test-results/artifacts",
  use: {
    baseURL: "http://localhost:5175",
    headless: true,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: "node scripts/dev.mjs --port 5175 --strictPort",
    url: "http://localhost:5175/api/health",
    reuseExistingServer: false,
    timeout: 30000,
    env: { DB_PATH: ":memory:", API_PORT: "3005", NODE_ENV: "development" },
  },
});
