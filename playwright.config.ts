import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const shouldRun = process.env.RUN_ATTACHMENT_E2E === "true";

export default defineConfig({
  testDir: "tests",
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  reporter: [["list"]],
  workers: 1,
  fullyParallel: false,
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  grepInvert: shouldRun ? undefined : /attachments/i,
});
