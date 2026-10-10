import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

// Integration tests use the isolated porto_test database (never the dev or production DB).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://porto:porto_dev_password@localhost:5433/porto_test?schema=public";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": root,
      "server-only": path.join(root, "tests/support/empty.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: "test-secret-test-secret-test-secret-123",
      IP_HASH_SALT: "test-salt-123",
      STORAGE_DRIVER: "local",
      LOCAL_STORAGE_DIR: "./storage/test-uploads",
    },
  },
});
