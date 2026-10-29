import { defineConfig } from "@playwright/test";

// Headless e2e of the synthetic ?demo=1 flow. Uses the system Chrome (no
// Playwright browser download; PLAYWRIGHT_CHROME_PATH overrides the path) and a local `next dev` on port 4310.
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://localhost:4310",
    headless: true,
    // Override with PLAYWRIGHT_CHROME_PATH; defaults to the system Chrome.
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROME_PATH || "/usr/bin/google-chrome",
    },
  },
  webServer: {
    command: "pnpm exec next dev -p 4310 -H 127.0.0.1",
    url: "http://localhost:4310/meeting-room",
    reuseExistingServer: false,
    // Opt in to the fake send transport; the page also requires a loopback host.
    env: { SECOND_SEAT_TEST_MODE: "1" },
    timeout: 180_000,
  },
});
