import { defineConfig } from "@playwright/test";

// Headless e2e of the synthetic ?demo=1 flow. Uses the system Chrome (no
// Playwright browser download) and a local `next dev` on port 4310.
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://localhost:4310",
    headless: true,
    launchOptions: { executablePath: "/usr/bin/google-chrome" },
  },
  webServer: {
    command: "pnpm exec next dev -p 4310 -H 127.0.0.1",
    url: "http://localhost:4310/meeting-room",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
