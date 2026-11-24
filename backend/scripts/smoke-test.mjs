#!/usr/bin/env node
/**
 * End-to-end smoke test against a running antic-backend.
 * Usage:
 *   node scripts/smoke-test.mjs
 *   BASE=http://localhost:3001 node scripts/smoke-test.mjs
 */

const BASE = (process.env.BASE || "http://localhost:3001").replace(/\/$/, "");

let passed = 0;
let failed = 0;
const logs = [];

function ok(name, detail = "") {
  passed++;
  logs.push(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  failed++;
  logs.push(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function req(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function main() {
  console.log(`\nantic smoke-test → ${BASE}\n`);

  // 1. Health
  {
    const r = await req("/api/health");
    r.status === 200 && r.data?.ok ? ok("health") : fail("health", `${r.status}`);
  }

  // 2. Public settings
  {
    const r = await req("/api/app/public-settings");
    r.status === 200 && r.data?.public_settings ? ok("public-settings") : fail("public-settings", `${r.status}`);
  }

  // 3. Login admin
  let token = null;
  {
    const r = await req("/api/auth/login", {
      method: "POST",
      body: {
        email: process.env.ADMIN_EMAIL || "admin@antic.local",
        password: process.env.ADMIN_PASSWORD || "admin123",
      },
    });
    if (r.status === 200 && r.data?.token && r.data?.user?.role === "admin") {
      token = r.data.token;
      ok("admin login", r.data.user.email);
    } else {
      fail("admin login", `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  // 4. me
  if (token) {
    const r = await req("/api/auth/me", { token });
    r.status === 200 && r.data?.email ? ok("auth me") : fail("auth me", `${r.status}`);
  }

  // 5. me without token → 401
  {
    const r = await req("/api/auth/me");
    r.status === 401 ? ok("auth me requires token") : fail("auth me requires token", `${r.status}`);
  }

  // 6. Public entities
  {
    const r = await req("/api/entities/CurtainCategory?limit=10");
    Array.isArray(r.data) ? ok("list CurtainCategory", `${r.data.length} rows`) : fail("list CurtainCategory", `${r.status}`);
  }
  {
    const r = await req("/api/entities/CurtainModel?limit=5");
    Array.isArray(r.data) ? ok("list CurtainModel") : fail("list CurtainModel", `${r.status}`);
  }

  // 7. Consultation create (public)
  let consultationId = null;
  {
    const r = await req("/api/entities/ConsultationRequest", {
      method: "POST",
      body: {
        name: "Smoke Test",
        phone: "09120000000",
        space_type: "پذیرایی",
        message: "automated smoke",
        reference: "smoke-test",
      },
    });
    if (r.status === 201 && r.data?.id) {
      consultationId = r.data.id;
      ok("create ConsultationRequest", consultationId.slice(-6));
      // snake_case field mapping
      r.data.space_type === "پذیرایی" || r.data.spaceType === "پذیرایی"
        ? ok("space_type mapped")
        : fail("space_type mapped", JSON.stringify(r.data));
    } else {
      fail("create ConsultationRequest", `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  // 8. Consultation list requires admin
  {
    const r = await req("/api/entities/ConsultationRequest");
    r.status === 403 ? ok("consultation list forbidden for anon") : fail("consultation list forbidden", `${r.status}`);
  }
  if (token) {
    const r = await req("/api/entities/ConsultationRequest", { token });
    Array.isArray(r.data) ? ok("consultation list as admin", `${r.data.length}`) : fail("consultation list as admin", `${r.status}`);
  }

  // 9. Catalog products
  {
    const r = await req("/api/catalog/products?limit=10");
    r.status === 200 && Array.isArray(r.data?.products)
      ? ok("catalog products", `${r.data.products.length}`)
      : fail("catalog products", `${r.status}`);
  }
  {
    const r = await req("/api/catalog/categories");
    r.status === 200 && Array.isArray(r.data?.categories)
      ? ok("catalog categories")
      : fail("catalog categories", `${r.status}`);
  }

  // 10. Checkout never trusts client price/name/image fields.
  {
    const unknown = await req("/api/orders/checkout", {
      method: "POST",
      body: {
        customerName: "Smoke Buyer",
        customerPhone: "09121112233",
        items: [{
          productId: "missing-product-smoke",
          quantity: 1,
          name: "Fake",
          unitPrice: 1000,
          image: "https://attacker.invalid/fake.webp",
        }],
      },
    });
    unknown.status === 404
      ? ok("checkout rejects products not present in catalog")
      : fail("checkout rejects products not present in catalog", `${unknown.status} ${JSON.stringify(unknown.data)}`);
  }

  // Use a real seeded product; with no merchant configured the safe response is 503,
  // after the server has resolved the product and canonical price from the database.
  if (!process.env.ZARINPAL_MERCHANT_ID) {
    const catalog = await req("/api/catalog/products?limit=100&inStockOnly=true");
    const product = Array.isArray(catalog.data?.products)
      ? catalog.data.products.find((item) =>
          Number(item.actualPriceRange?.minValue?.amount) > 0 &&
          item.inventory?.availabilityStatus === "IN_STOCK"
        )
      : null;
    if (!product) {
      fail("checkout pricing fixture", "no priced in-stock product available in seeded catalog");
    } else {
      const r = await req("/api/orders/checkout", {
        method: "POST",
        body: {
          customerName: "Smoke Buyer",
          customerPhone: "09121112233",
          items: [{
            productId: product.id,
            quantity: 1,
            name: "Tampered name",
            unitPrice: 1,
            image: "https://attacker.invalid/fake.webp",
          }],
        },
      });
      r.status === 503
        ? ok("checkout resolves trusted catalog item before payment gateway guard")
        : fail("checkout pricing/payment guard", `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  // 11. Admin orders list
  if (token) {
    const r = await req("/api/orders", { token });
    Array.isArray(r.data) ? ok("admin orders list", `${r.data.length}`) : fail("admin orders list", `${r.status}`);
  }

  // 12. Admin product create
  if (token) {
    const slug = `smoke-${Date.now()}`;
    const r = await req("/api/catalog/admin/products", {
      method: "POST",
      token,
      body: { name: "Smoke Product", slug, price: 120000, visible: true, inStock: true },
    });
    if (r.status === 201 && r.data?.id) {
      ok("admin create product", r.data.slug);
      await req(`/api/catalog/admin/products/${r.data.id}`, { method: "DELETE", token });
      ok("admin delete product");
    } else {
      fail("admin create product", `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  // 13. Unknown entity
  {
    const r = await req("/api/entities/DoesNotExist");
    r.status === 404 ? ok("unknown entity 404") : fail("unknown entity 404", `${r.status}`);
  }

  // cleanup consultation
  if (token && consultationId) {
    await req(`/api/entities/ConsultationRequest/${consultationId}`, { method: "DELETE", token });
  }

  console.log(logs.join("\n"));
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
