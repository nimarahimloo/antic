import { test, expect, type APIRequestContext } from "@playwright/test";

const ADMIN = {
  email: "admin@antic.local",
  password: "admin123",
};

/**
 * Admin role E2E tests — authenticated administrator.
 * Verifies admin dashboard, CRUD operations, and system management.
 */
test.describe("Admin (authenticated)", () => {
  test.setTimeout(120000);

  async function loginAsAdminRequest(request: APIRequestContext) {
    const loginRes = await request.post("http://localhost:3001/api/auth/login", {
      data: { email: ADMIN.email, password: ADMIN.password },
    });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    return body.token;
  }

  test("login as admin via UI", async ({ page }) => {
    await page.goto("http://localhost:3000/login", {
      waitUntil: "commit",
      timeout: 60000,
    });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /به حساب خود وارد شوید/i })).toBeVisible();
    await page.getByLabel(/ایمیل/i).fill(ADMIN.email);
    await page.getByLabel(/رمز عبور/i).fill(ADMIN.password);
    await page.getByRole("button", { name: /ورود/i }).click();

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin/i, { timeout: 10000 });
    const token = await page.evaluate(() => localStorage.getItem("antic_access_token"));
    expect(token).toBeTruthy();
  });

  test("view admin dashboard via URL token", async ({ page }) => {
    const loginRes = await page.request.post("http://localhost:3001/api/auth/login", {
      data: { email: ADMIN.email, password: ADMIN.password },
    });
    const token = (await loginRes.json()).token;

    await page.goto(`http://localhost:3000/admin?access_token=${token}`, {
      waitUntil: "commit",
      timeout: 60000,
    });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /داشبورد|dashboard|مدیریت/i })).toBeVisible();
  });

  test("manage curtain categories via API", async ({ request }) => {
    const token = await loginAsAdminRequest(request);
    const ts = Date.now();
    const slug = `e2e-test-category-${ts}`;

    // List categories
    const listRes = await request.get("http://localhost:3001/api/entities/CurtainCategory?limit=10", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const categories = await listRes.json();
    expect(Array.isArray(categories)).toBeTruthy();

    // Create category
    const createRes = await request.post("http://localhost:3001/api/entities/CurtainCategory", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "دسته تستی E2E",
        slug: slug,
        inCatalog: true,
        order: 99,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    expect(created.slug).toBe(slug);

    // Delete category
    const deleteRes = await request.delete(
      `http://localhost:3001/api/entities/CurtainCategory/${created.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(deleteRes.ok()).toBeTruthy();
  });

  test("manage shop products via API", async ({ request }) => {
    const token = await loginAsAdminRequest(request);
    const ts = Date.now();
    const slug = `e2e-test-product-${ts}`;

    // List products
    const listRes = await request.get("http://localhost:3001/api/catalog/products?limit=10", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();

    // Create product
    const createRes = await request.post("http://localhost:3001/api/catalog/admin/products", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "محصول تستی E2E",
        slug: slug,
        price: 100000,
        visible: true,
        inStock: true,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    expect(created.slug).toBe(slug);

    // Delete product
    const deleteRes = await request.delete(
      `http://localhost:3001/api/catalog/admin/products/${created.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(deleteRes.ok()).toBeTruthy();
  });

  test("view consultation requests via API", async ({ request }) => {
    const token = await loginAsAdminRequest(request);

    const res = await request.get("http://localhost:3001/api/entities/ConsultationRequest", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test("access admin settings via API", async ({ request }) => {
    const token = await loginAsAdminRequest(request);

    const res = await request.get("http://localhost:3001/api/entities/SiteSetting", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("admin logout clears session", async ({ page }) => {
    const loginRes = await page.request.post("http://localhost:3001/api/auth/login", {
      data: { email: ADMIN.email, password: ADMIN.password },
    });
    const token = (await loginRes.json()).token;

    await page.goto(`http://localhost:3000/admin?access_token=${token}`, {
      waitUntil: "commit",
      timeout: 60000,
    });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /داشبورد|dashboard|مدیریت/i })).toBeVisible();

    await page.getByRole("button", { name: /خروج|logout/i }).click();
    await expect(page).toHaveURL(/\/(|login)/i, { timeout: 10000 });
    const tokenAfter = await page.evaluate(() => localStorage.getItem("antic_access_token"));
    expect(tokenAfter).toBeNull();
  });
});
