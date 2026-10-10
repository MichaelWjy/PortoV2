import { defineConfig, devices } from "@playwright/test";

// E2E runs against its own database (porto_e2e) and a dev server on port 3100 with the dev-only admin login.
const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://porto:porto_dev_password@localhost:5433/porto_e2e?schema=public";
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      APP_URL: `http://localhost:${PORT}`,
      AUTH_URL: `http://localhost:${PORT}`,
      AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-123",
      AUTH_DEV_LOGIN: "true",
      AUTH_TRUST_HOST: "true",
      IP_HASH_SALT: "e2e-salt-123",
      STORAGE_DRIVER: "local",
      LOCAL_STORAGE_DIR: "./storage/e2e-uploads",
    },
  },
});
