import { Buffer } from "node:buffer";

import { test, expect } from "@playwright/test";

const shouldRun = process.env.RUN_ATTACHMENT_E2E === "true";

(shouldRun ? test : test.skip)("attachments reach ready state", async ({ page }) => {
  await page.route("**/api/upload", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "https://blob.local/resume.pdf",
        name: "resume.pdf",
        size: 2048,
        type: "application/pdf",
      }),
    });
  });

  const chatPath = process.env.E2E_CHAT_PATH ?? "/chat";
  await page.goto(chatPath);
  await page.waitForSelector("textarea");

  await page.setInputFiles("[data-testid=chat-attachment-input]", {
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4"),
  });

  await expect(page.getByText("Uploading…")).toBeVisible();
  await expect(page.getByText("Ready")).toBeVisible();
});
