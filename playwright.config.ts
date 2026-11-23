import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.HERO_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL,
    trace: "off",
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1280, height: 800 } } },
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        userAgent: devices["iPhone 13"].userAgent,
      },
    },
  ],
});