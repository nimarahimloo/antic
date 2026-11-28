import { test, expect } from "@playwright/test";

/**
 * Guest role E2E tests — unauthenticated user.
 * Verifies public-facing functionality without any login.
 */
test.describe("Guest (unauthenticated)", () => {
  test.setTimeout(120000);

  test("homepage loads and shows curtain categories", async ({ page }) => {
    await page.goto("http://localhost:3000/", { waitUntil: "commit", timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    await expect(page).toHaveTitle(/پرده آنتیک/);
    // Wait for curtain categories to load via Suspense/API
    await page.waitForTimeout(3000);
    // Category carousel should show curtain category links
    await expect(
      page.getByRole("link", { name: /شید|رومن|پلیسه|زبرا|رول/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("browse curtain catalog categories", async ({ page }) => {
    await page.goto("http://localhost:3000/catalog", { waitUntil: "commit", timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    // Wait for curtain categories to load via Suspense/API
    await page.waitForTimeout(3000);
    // At least some curtain category links should render
    const categoryLinks = page.getByRole("link", {
      name: /شید|رومن|پلیسه|ترک پنل|كركره|زبرا|حریر|مخمل|کتان|تور/i,
    });
    await expect(categoryLinks.first()).toBeVisible({ timeout: 10000 });
  });

  test("view curtain product detail page", async ({ page }) => {
    await page.goto("http://localhost:3000/catalog", { waitUntil: "commit", timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    await page.waitForTimeout(3000);
    // Click first curtain category link
    const firstCategory = page
      .getByRole("link", { name: /شید|رومن|پلیسه|زبرا|رول/i })
      .first();
    await expect(firstCategory).toBeVisible({ timeout: 10000 });
    await firstCategory.click();
    // Should navigate to a curtain detail or category page
    await expect(page).toHaveURL(/\/curtain\/|\/catalog/);
  });

  test("browse shop accessories categories", async ({ page }) => {
    await page.goto("http://localhost:3000/shop", { waitUntil: "commit", timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    // PageHero renders h1 "محصولات"
    await expect(page.getByRole("heading", { name: /محصولات/i })).toBeVisible();
    // Shop categories are rendered as buttons (not links) in ShopPage
    const categoryButtons = page.getByRole("button", {
      name: /فینیال|حاشیه|میخ‌سر|منگوله|ریشه|بند نگهدارنده/i,
    });
    await expect(categoryButtons.first()).toBeVisible();
  });

  test("view shop product detail page", async ({ page }) => {
    await page.goto("http://localhost:3000/shop", { waitUntil: "commit", timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    // Click on the first product card link (links to /product/[slug])
    const firstProductLink = page.locator('a[href^="/product/"]').first();
    await expect(firstProductLink).toBeVisible({ timeout: 10000 });
    await firstProductLink.click();
    await expect(page).toHaveURL(/\/product\//);
  });

  test("contact page loads and form is present", async ({ page }) => {
    await page.goto("http://localhost:3000/contact", { waitUntil: "commit", timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    // PageHero renders h1 "مشاوره و سفارش"
    await expect(page.getByRole("heading", { name: /مشاوره|سفارش/i })).toBeVisible();
    // ContactForm labels: "نام و نام خانوادگی", "شماره تماس", "پیام"
    await expect(page.getByLabel(/نام و نام خانوادگی/i)).toBeVisible();
    await expect(page.getByLabel(/شماره تماس/i)).toBeVisible();
    await expect(page.getByLabel(/پیام/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /ارسال|send/i })).toBeVisible();
  });

  test("submit consultation request as guest", async ({ page }) => {
    await page.goto("http://localhost:3000/contact", { waitUntil: "commit", timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    await page.getByLabel(/نام و نام خانوادگی/i).fill("تست میهمان");
    await page.getByLabel(/شماره تماس/i).fill("09120000000");
    await page.getByLabel(/پیام/i).fill("این یک پیام تستی از طریق میهمان است.");
    await page.getByRole("button", { name: /ارسال|send/i }).click();
    // Should show success message
    await expect(
      page.getByText(/ثبت شد|درخواست شما ثبت شد/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("login page is accessible", async ({ page }) => {
    await page.goto("http://localhost:3000/login", { waitUntil: "commit", timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    // PageHero renders h1 "به حساب خود وارد شوید"
    await expect(page.getByRole("heading", { name: /به حساب خود وارد شوید/i })).toBeVisible();
    // Login form labels: "ایمیل", "رمز عبور"
    await expect(page.getByLabel(/ایمیل/i)).toBeVisible();
    await expect(page.getByLabel(/رمز عبور/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /ورود/i })).toBeVisible();
  });

  test("register page is accessible", async ({ page }) => {
    await page.goto("http://localhost:3000/register", { waitUntil: "commit", timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    // PageHero renders h1 "حساب کاربری بسازید"
    await expect(page.getByRole("heading", { name: /حساب کاربری بسازید/i })).toBeVisible();
    await expect(page.getByLabel(/نام و نام خانوادگی|full name/i)).toBeVisible();
    await expect(page.getByLabel(/ایمیل/i)).toBeVisible();
    await expect(page.getByLabel(/رمز عبور/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /ثبت‌نام/i })).toBeVisible();
  });

  test("guest cannot access admin dashboard", async ({ page }) => {
    await page.goto("http://localhost:3000/admin", { waitUntil: "commit", timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    // Should redirect to login page
    await expect(page.getByRole("heading", { name: /به حساب خود وارد شوید/i })).toBeVisible({ timeout: 10000 });
  });

  test("guest cannot access account pages", async ({ page }) => {
    await page.goto("http://localhost:3000/account/profile", {
      waitUntil: "commit",
      timeout: 60000,
    });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    // Should redirect to login page
    await expect(page.getByRole("heading", { name: /به حساب خود وارد شوید/i })).toBeVisible({ timeout: 10000 });
  });

  test("forgot password page is accessible", async ({ page }) => {
    await page.goto("http://localhost:3000/forgot-password", {
      waitUntil: "commit",
      timeout: 60000,
    });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    // AuthLayout renders h1 "بازیابی رمز عبور"
    await expect(page.getByRole("heading", { name: /بازیابی رمز عبور/i })).toBeVisible();
    // Forgot password email label: "آدرس ایمیل"
    await expect(page.getByLabel(/آدرس ایمیل/i)).toBeVisible();
  });
});
