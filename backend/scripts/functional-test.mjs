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

async function req(path, { method = "GET", body, token, headers: extraHeaders = {} } = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
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

async function reqForm(path, { method = "POST", token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: form });
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

  // —— AI workspace is admin-only and persists conversations without a provider call ——
  {
    const anonymous = await req("/api/ai/providers");
    anonymous.status === 401
      ? ok("AI workspace requires authentication")
      : fail("AI workspace requires authentication", String(anonymous.status));

    const providers = await req("/api/ai/providers", { token });
    providers.status === 200 && Array.isArray(providers.data?.providers)
      ? ok("AI provider registry", `${providers.data.providers.length} providers`)
      : fail("AI provider registry", `${providers.status} ${JSON.stringify(providers.data)}`);

    const created = await req("/api/ai/conversations", {
      method: "POST",
      token,
      body: { title: `AI test ${Date.now()}` },
    });
    const conversationId = created.data?.conversation?.id;
    created.status === 201 && conversationId
      ? ok("create AI conversation", conversationId)
      : fail("create AI conversation", `${created.status} ${JSON.stringify(created.data)}`);

    if (conversationId) {
      const detail = await req(`/api/ai/conversations/${conversationId}`, { token });
      detail.status === 200 && Array.isArray(detail.data?.messages)
        ? ok("load empty AI conversation")
        : fail("load empty AI conversation", String(detail.status));

      const removed = await req(`/api/ai/conversations/${conversationId}`, {
        method: "DELETE",
        token,
      });
      removed.status === 204
        ? ok("delete AI conversation")
        : fail("delete AI conversation", String(removed.status));
    }
  }

  // —— private AI file upload/download ——
  {
    const form = new FormData();
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    form.append("file", new Blob([pixel], { type: "image/png" }), "pixel.png");
    const uploaded = await reqForm("/api/ai/files", { token, form });
    const fileId = uploaded.data?.file?.id;
    uploaded.status === 201 && fileId
      ? ok("upload private AI file", fileId)
      : fail("upload private AI file", `${uploaded.status} ${JSON.stringify(uploaded.data)}`);

    if (fileId) {
      const downloaded = await fetch(`${BASE}/api/ai/files/${fileId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const bytes = Buffer.from(await downloaded.arrayBuffer());
      downloaded.status === 200 && bytes.length === pixel.length
        ? ok("download private AI file", `${bytes.length} bytes`)
        : fail("download private AI file", `${downloaded.status} ${bytes.length}`);

      const removed = await req(`/api/ai/files/${fileId}`, {
        method: "DELETE",
        token,
      });
      removed.status === 204
        ? ok("delete private AI file")
        : fail("delete private AI file", String(removed.status));
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

  // —— MCP catalog bridge authentication and tool tests ——
  {
    const r = await req("/api/mcp");
    r.status === 200 && r.data?.tools && Array.isArray(r.data.tools)
      ? ok("MCP bridge advertises read-only tools")
      : fail("MCP bridge advertises read-only tools", String(r.status));
  }

  const mcpHeaders = {
    "x-mcp-worker-token": process.env.MCP_WORKER_TOKEN || "",
  };

  {
    const r = await req("/api/mcp/tools/list_categories", { method: "POST" });
    r.status === 401
      ? ok("MCP bridge rejects unauthenticated calls")
      : fail("MCP bridge rejects unauthenticated calls", String(r.status));
  }

  {
    const r = await req("/api/mcp/tools/list_categories", {
      method: "POST",
      headers: mcpHeaders,
    });
    r.status === 200 && Array.isArray(r.data?.content)
      ? ok("MCP list_categories tool (authenticated)", String(r.data.content.length))
      : fail("MCP list_categories tool (authenticated)", `${r.status} ${JSON.stringify(r.data)}`);
  }

  {
    const r = await req("/api/mcp/tools/search_models", {
      method: "POST",
      headers: mcpHeaders,
      body: { query: "теست" },
    });
    r.status === 200 && Array.isArray(r.data?.content)
      ? ok("MCP search_models tool (authenticated)")
      : fail("MCP search_models tool (authenticated)", `${r.status} ${JSON.stringify(r.data)}`);
  }

  {
    // Use the model created by this test, not a category ID.
    if (modelId) {
      const r = await req("/api/mcp/tools/get_model", {
        method: "POST",
        headers: mcpHeaders,
        body: { id: modelId },
      });
      r.status === 200 && r.data?.content?.id === modelId
        ? ok("MCP get_model tool (found)")
        : fail("MCP get_model tool (found)", `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  {
    const r = await req("/api/mcp/tools/get_model", {
      method: "POST",
      headers: mcpHeaders,
      body: { id: "nonexistent-model-xyz-12345" },
    });
    r.status === 404 && r.data?.content?.found === false
      ? ok("MCP get_model returns 404 for missing model", `status=${r.status}`)
      : fail("MCP get_model returns 404 for missing model", `status=${r.status}`);
  }

  {
    const r = await req("/api/mcp/tools/list_projects", {
      method: "POST",
      headers: mcpHeaders,
    });
    r.status === 200 && Array.isArray(r.data?.content)
      ? ok("MCP list_projects tool (authenticated)")
      : fail("MCP list_projects tool (authenticated)", `${r.status} ${JSON.stringify(r.data)}`);
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
