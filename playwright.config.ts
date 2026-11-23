import { defineConfig, devices } from "@playwright/test";
const preview = process.env.PREVIEW_URL;
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, timeout: 45000,
  expect: { timeout: 10000 }, reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: preview ?? "http://127.0.0.1:3000", channel: process.env.CI ? undefined : "chrome", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: preview ? undefined : [
    { command: "npm run dev -w @lyor/api", url: "http://127.0.0.1:4000/api/v1/health", reuseExistingServer: !process.env.CI, timeout: 60000, env: { NODE_ENV: "development", DEMO_MODE: "true" } },
    { command: "npm run dev -w @lyor/web", url: "http://127.0.0.1:3000", reuseExistingServer: !process.env.CI, timeout: 60000, env: { NODE_ENV: "development", DEMO_MODE: "true" } },
  ],
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } }],
});
