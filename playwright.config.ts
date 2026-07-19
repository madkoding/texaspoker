import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    headless: true,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  webServer: [
    {
      command: "npm --prefix server run dev",
      port: 3001,
      reuseExistingServer: true,
      timeout: 30_000,
      env: { PORT: "3001" },
    },
    {
      command: "npm --prefix client run dev",
      port: 5173,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
