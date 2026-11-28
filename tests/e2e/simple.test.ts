import { test, expect } from "@playwright/test";

test("simple navigation", async ({ page }) => {
  await page.goto("http://localhost:3000/", { waitUntil: "commit", timeout: 60000 });
  console.log("Title:", await page.title());
  console.log("URL:", page.url());
  await page.waitForTimeout(5000);
  await expect(page).toHaveTitle(/پرده آنتیک/);
});
