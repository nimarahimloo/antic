#!/usr/bin/env node
/**
 * End-to-end smoke test against a running antic-backend.
 * Usage:
 *   cd backend && npx tsx scripts/smoke-test.ts
 *   BASE=http://localhost:3001 npx tsx scripts/smoke-test.ts
 */

import "dotenv/config";

const BASE = (process.env.BASE || "http://localhost:3001").replace(/\/$/, "");

let passed = 0;
let failed = 0;
const logs: string[] = [];

function ok(name: string, detail = "") {
  passed++;
  logs.push(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail = "") {
  failed++;
  logs.push(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

interface ApiResponse {
  status: number;
  data: unknown;
}

async function req(
  path: string,
  { method = "GET", body, token }: { method?: string; body?: unknown; token?: string } = {},
): Promise<ApiResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown;
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
    r.status === 200 && (r.data as { ok?: boolean })?.ok
      ? ok("health")
      : fail("health", `${r.status}`);
  }

  // 2. Public settings
  {
    const r = await req("/api/app/public-settings");
    r.status === 200 && (r.data as { public_settings?: unknown })?.public_settings
      ? ok("public-settings")
      : fail("public-settings", `${r.status}`);
  }

  // 3. Login admin
  let token: string | null = null;
  {
    const r = await req("/api/auth/login", {
      method: "POST",
      body: {
        email: process.env.ADMIN_EMAIL || "admin@antic.local",
        password: process.env.ADMIN_PASSWORD || "admin123",
      },
    });
    if (r.status === 200 && (r.data as { token?: string })?.token) {
      token = (r.data as { token: string }).token;
      ok("admin login", (r.data as { user?: { email?: string } }).user?.email ?? "");
    } else {
      fail("admin login", `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  // 4. me
  if (token) {
    const r = await req("/api/auth/me", { token });
    r.status === 200 && (r.data as { email?: string })?.email
      ? ok("auth me")
      : fail("auth me", `${r.status}`);
  }

  // 5. me without token → 401
  {
    const r = await req("/api/auth/me");
    r.status === 401
      ? ok("auth me requires token")
      : fail("auth me requires token", `${r.status}`);
  }

  // 6. Public entities
  {
    const r = await req("/api/entities/CurtainCategory?limit=10");
    Array.isArray(r.data)
      ? ok("list CurtainCategory", `${(r.data as unknown[]).length} rows`)
      : fail("list CurtainCategory", `${r.status}`);
  }
  {
    const r = await req("/api/entities/CurtainModel?limit=5");
    Array.isArray(r.data) ? ok("list CurtainModel") : fail("list CurtainModel", `${r.status}`);
  }

  // 7. Consultation create (public)
  let consultationId: string | null = null;
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
    if (r.status === 201 && (r.data as { id?: string })?.id) {
      consultationId = (r.data as { id: string }).id;
      ok("create ConsultationRequest", consultationId.slice(-6));
      // snake_case field mapping
      const data = r.data as Record<string, unknown>;
      data.space_type === "پذیرایی" || data.spaceType === "پذیرایی"
        ? ok("space_type mapped")
        : fail("space_type mapped", JSON.stringify(r.data));
    } else {
      fail("create ConsultationRequest", `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  // 8. Consultation list requires admin
  {
    const r = await req("/api/entities/ConsultationRequest");
    r.status === 403
      ? ok("consultation list forbidden for anon")
      : fail("consultation list forbidden", `${r.status}`);
  }
  if (token) {
    const r = await req("/api/entities/ConsultationRequest", { token });
    Array.isArray(r.data)
      ? ok("consultation list as admin", `${(r.data as unknown[]).length}`)
      : fail("consultation list as admin", `${r.status}`);
  }

  // 9. Catalog products
  {
    const r = await req("/api/catalog/products?limit=10");
    r.status === 200 && Array.isArray((r.data as { products?: unknown[] })?.products)
      ? ok("catalog products", `${(r.data as { products: unknown[] }).products.length}`)
      : fail("catalog products", `${r.status}`);
  }
  {
    const r = await req("/api/catalog/categories");
    r.status === 200 && Array.isArray((r.data as { categories?: unknown[] })?.categories)
      ? ok("catalog categories")
      : fail("catalog categories", `${r.status}`);
  }

  // 11. Admin orders list
  if (token) {
    const r = await req("/api/orders", { token });
    Array.isArray(r.data)
      ? ok("admin orders list", `${(r.data as unknown[]).length}`)
      : fail("admin orders list", `${r.status}`);
  }

  // 12. Admin product create
  if (token) {
    const slug = "smoke-test-product";
    const r = await req("/api/catalog/admin/products", {
      method: "POST",
      token,
      body: { name: "Smoke Product", slug, price: 120000, visible: true, inStock: true },
    });
    if (r.status === 201 && (r.data as { id?: string })?.id) {
      ok("admin create product", (r.data as { slug?: string }).slug ?? slug);
      await req(`/api/catalog/admin/products/${(r.data as { id: string }).id}`, {
        method: "DELETE",
        token,
      });
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
