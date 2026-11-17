#!/usr/bin/env node
/**
 * Functional API tests against a running antic-backend.
 *
 * Usage:
 *   node scripts/functional-test.mjs
 *   BASE=http://localhost:3001 node scripts/functional-test.mjs
 *
 * Requires seeded admin: admin@antic.local / admin123 (or env overrides)
 */

const BASE = (process.env.BASE || "http://localhost:3001").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@antic.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

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
  console.log(`\nantic functional-test → ${BASE}\n`);

  // —— health ——
  {
    const r = await req("/api/health");
    r.status === 200 && r.data?.ok ? ok("health") : fail("health", String(r.status));
  }

  // —— admin login ——
  let token = null;
  {
    const r = await req("/api/auth/login", {
      method: "POST",
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    if (r.status === 200 && r.data?.token) {
      token = r.data.token;
      ok("admin login");
    } else {
      fail("admin login", `${r.status} ${JSON.stringify(r.data)}`);
      console.log(logs.join("\n"));
      process.exit(1);
    }
  }

  // —— list categories (public) ——
  let categories = [];
  {
    const r = await req("/api/entities/CurtainCategory?limit=200");
    if (Array.isArray(r.data)) {
      categories = r.data;
      ok("list CurtainCategory", `${categories.length}`);
    } else {
      fail("list CurtainCategory", String(r.status));
    }
  }

  // —— hierarchy: roots should not include known sub-slugs if present as children ——
  {
    const subSlugs = new Set();
    for (const c of categories) {
      let subs = c.subcategories;
      if (typeof subs === "string") {
        try {
          subs = JSON.parse(subs);
        } catch {
          subs = [];
        }
      }
      if (Array.isArray(subs)) {
        for (const s of subs) {
          const slug = typeof s === "string" ? s : s?.slug;
          if (slug) subSlugs.add(String(slug).toLowerCase());
        }
      }
    }
    const collisions = categories.filter((c) => subSlugs.has(String(c.slug).toLowerCase()));
    if (collisions.length === 0) {
      ok("no category row is also a subcategory slug");
    } else {
      // soft fail — data quality warning, not API bug
      fail(
        "category rows that are also sub-slugs (cleanup recommended)",
        collisions.map((c) => c.slug).join(", ")
      );
    }
  }

  // —— create parent category + subs ——
  const stamp = Date.now();
  let catId = null;
  const parentSlug = `ft-parent-${stamp}`;
  {
    const r = await req("/api/entities/CurtainCategory", {
      method: "POST",
      token,
      body: {
        name: `FT Parent ${stamp}`,
        slug: parentSlug,
        mechanism: "shade",
        order: 9000,
        subcategories: [
          { name: "زیر۱", slug: `ft-sub-a-${stamp}` },
          { name: "زیر۲", slug: `ft-sub-b-${stamp}` },
        ],
      },
    });
    if ((r.status === 201 || r.status === 200) && r.data?.id) {
      catId = r.data.id;
      ok("create parent category with subs", parentSlug);
      const subs = r.data.subcategories;
      const arr = typeof subs === "string" ? JSON.parse(subs) : subs;
      Array.isArray(arr) && arr.length === 2
        ? ok("subcategories persisted", `${arr.length}`)
        : fail("subcategories persisted", JSON.stringify(subs));
    } else {
      fail("create parent category", `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  // —— create model under parent + sub ——
  let modelId = null;
  {
    const r = await req("/api/entities/CurtainModel", {
      method: "POST",
      token,
      body: {
        code: `FT-${stamp}`,
        name: `FT-${stamp}`,
        category_slug: parentSlug,
        subcategory: `ft-sub-a-${stamp}`,
        image: "https://via.placeholder.com/200",
      },
    });
    if ((r.status === 201 || r.status === 200) && r.data?.id) {
      modelId = r.data.id;
      ok("create model under parent+sub");
      const cat =
        r.data.category_slug || r.data.categorySlug || r.data.category_slug;
      const sub = r.data.subcategory;
      cat === parentSlug || r.data.categorySlug === parentSlug
        ? ok("model category_slug stored")
        : fail("model category_slug stored", JSON.stringify(r.data));
      sub === `ft-sub-a-${stamp}`
        ? ok("model subcategory stored")
        : fail("model subcategory stored", String(sub));
    } else {
      fail("create model", `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  // —— create project sample ——
  let projectId = null;
  {
    const r = await req("/api/entities/Project", {
      method: "POST",
      token,
      body: {
        title: `FT Project ${stamp}`,
        category_slug: parentSlug,
        subcategory: `ft-sub-b-${stamp}`,
        cover_image: "https://via.placeholder.com/400",
        description: "functional test sample",
      },
    });
    if ((r.status === 201 || r.status === 200) && r.data?.id) {
      projectId = r.data.id;
      ok("create project sample");
    } else {
      fail("create project sample", `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  // —— public list models filters ——
  {
    const r = await req(`/api/entities/CurtainModel?limit=50`);
    Array.isArray(r.data)
      ? ok("public list models", `${r.data.length}`)
      : fail("public list models", String(r.status));
  }

  // —— update category ——
  if (catId) {
    const r = await req(`/api/entities/CurtainCategory/${catId}`, {
      method: "PUT",
      token,
      body: { description: "updated by functional test" },
    });
    r.status === 200 || r.status === 204
      ? ok("update category")
      : fail("update category", String(r.status));
  }

  // —— shop catalog still works ——
  {
    const r = await req("/api/catalog/categories");
    r.status === 200 && Array.isArray(r.data?.categories)
      ? ok("shop catalog categories")
      : fail("shop catalog categories", String(r.status));
  }

  // —— anon cannot write ——
  {
    const r = await req("/api/entities/CurtainCategory", {
      method: "POST",
      body: { name: "hack", slug: `hack-${stamp}` },
    });
    r.status === 401 || r.status === 403
      ? ok("anon cannot create category")
      : fail("anon cannot create category", String(r.status));
  }

  // —— cleanup ——
  if (token) {
    if (modelId) {
      await req(`/api/entities/CurtainModel/${modelId}`, { method: "DELETE", token });
      ok("cleanup model");
    }
    if (projectId) {
      await req(`/api/entities/Project/${projectId}`, { method: "DELETE", token });
      ok("cleanup project");
    }
    if (catId) {
      await req(`/api/entities/CurtainCategory/${catId}`, { method: "DELETE", token });
      ok("cleanup category");
    }
  }

  console.log(logs.join("\n"));
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
