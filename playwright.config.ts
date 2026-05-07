import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8081",
    headless: true,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
    },
  ],
});
