import { test, expect, type APIRequestContext } from "@playwright/test";

const TEST_USER = {
  email: "user@antic.local",
  password: "user123",
  fullName: "کاربر تست",
};

/**
 * User role E2E tests — authenticated regular user.
 * Verifies user-specific functionality after registration and login.
 * Uses a pre-seeded test user to avoid rate-limiter issues during repeated test runs.
 */
test.describe("User (authenticated)", () => {
  test.setTimeout(120000);

  async function loginAsTestUser(request: APIRequestContext) {
    const loginRes = await request.post("http://localhost:3001/api/auth/login", {
      data: { email: TEST_USER.email, password: TEST_USER.password },
    });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    return body.token;
  }

  test("login with test user credentials via API", async ({ request }) => {
    const token = await loginAsTestUser(request);
    expect(token).toBeTruthy();
  });

  test("view user profile page after login", async ({ page, request }) => {
    const token = await loginAsTestUser(request);

    await page.goto("http://localhost:3000/", { waitUntil: "commit", timeout: 60000 });
    await page.evaluate((t) => localStorage.setItem("antic_access_token", t), token);
    await page.reload();
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });

    await page.goto("http://localhost:3000/account/profile", {
      waitUntil: "commit",
      timeout: 60000,
    });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /پروفایل|profile/i })).toBeVisible();
    await expect(page.getByText(TEST_USER.fullName).first()).toBeVisible();
    await expect(page.getByText(TEST_USER.email)).toBeVisible();
  });

  test("update user profile", async ({ page, request }) => {
    const token = await loginAsTestUser(request);

    await page.goto("http://localhost:3000/", { waitUntil: "commit", timeout: 60000 });
    await page.evaluate((t) => localStorage.setItem("antic_access_token", t), token);
    await page.reload();
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });

    await page.goto("http://localhost:3000/account/profile", {
      waitUntil: "commit",
      timeout: 60000,
    });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    // Profile form full-name input has no placeholder/label association; target first required input
    await page.locator('input[required]').first().fill("کاربر تست به‌روزرسانی شده");
    await page.getByRole("button", { name: /ذخیر|save/i }).click();
    // Confirm the save dialog (exact match to avoid matching the form submit button)
    await page.getByRole("button", { name: "ذخیره", exact: true }).click();
    await expect(page.getByText(/پروفایل با موفقیت به‌روزرسانی شد/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("submit consultation request as logged-in user", async ({ page, request }) => {
    const token = await loginAsTestUser(request);

    await page.goto("http://localhost:3000/", { waitUntil: "commit", timeout: 60000 });
    await page.evaluate((t) => localStorage.setItem("antic_access_token", t), token);
    await page.reload();
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });

    await page.goto("http://localhost:3000/contact", {
      waitUntil: "commit",
      timeout: 60000,
    });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    // ContactForm requires name and phone
    await page.getByPlaceholder(/مثال: سارا محمدی/i).fill("تست کاربر");
    await page.getByPlaceholder(/۰۹۱۲…/i).fill("09120000001");
    await page.getByLabel(/پیام/i).fill("پیام تستی از کاربر لاگین شده");
    await page.getByRole("button", { name: /ارسال|send/i }).click();
    await expect(
      page.getByText(/ارسال شد|موفق|success|ثبت شد|درخواست شما ثبت شد/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("user cannot access admin dashboard", async ({ page, request }) => {
    const token = await loginAsTestUser(request);

    await page.goto("http://localhost:3000/", { waitUntil: "commit", timeout: 60000 });
    await page.evaluate((t) => localStorage.setItem("antic_access_token", t), token);
    await page.reload();
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });

    await page.goto("http://localhost:3000/admin", {
      waitUntil: "commit",
      timeout: 60000,
    });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: /به حساب خود وارد شوید/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("logout clears session", async ({ page, request }) => {
    const token = await loginAsTestUser(request);

    await page.goto("http://localhost:3000/", { waitUntil: "commit", timeout: 60000 });
    await page.evaluate((t) => localStorage.setItem("antic_access_token", t), token);
    await page.reload();
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    // Wait for auth to initialize after reload
    await page.waitForTimeout(2000);

    await page.goto("http://localhost:3000/account/profile", {
      waitUntil: "commit",
      timeout: 60000,
    });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /پروفایل|profile/i })).toBeVisible();

    await page.getByRole("button", { name: /خروج|logout/i }).click();
    await expect(page).toHaveURL(/\/(|login)/i, { timeout: 10000 });
    const tokenAfter = await page.evaluate(() => localStorage.getItem("antic_access_token"));
    expect(tokenAfter).toBeNull();
  });
});
