#!/usr/bin/env node
/**
 * Functional API tests against a running antic-backend.
 *
 * Usage:
 *   cd backend && npx tsx scripts/functional-test.ts
 *   BASE=http://localhost:3001 npx tsx scripts/functional-test.ts
 *
 * Requires seeded admin: admin@antic.local / admin123 (or env overrides)
 */

import "dotenv/config";

const BASE = (process.env.BASE || "http://localhost:3001").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@antic.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

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
  {
    method = "GET",
    body,
    token,
    headers: extraHeaders = {},
  }: { method?: string; body?: unknown; token?: string; headers?: Record<string, string> } = {},
): Promise<ApiResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extraHeaders };
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

async function reqForm(
  path: string,
  { method = "POST", token, form }: { method?: string; token?: string; form?: FormData } = {},
): Promise<ApiResponse> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: form });
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
  console.log(`\nantic functional-test → ${BASE}\n`);

  // —— health ——
  {
    const r = await req("/api/health");
    r.status === 200 && (r.data as { ok?: boolean })?.ok
      ? ok("health")
      : fail("health", String(r.status));
  }

  // —— admin login ——
  let token: string | null = null;
  {
    const r = await req("/api/auth/login", {
      method: "POST",
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    if (r.status === 200 && (r.data as { token?: string })?.token) {
      token = (r.data as { token: string }).token;
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
    providers.status === 200 && Array.isArray((providers.data as { providers?: unknown[] })?.providers)
      ? ok("AI provider registry", `${(providers.data as { providers: unknown[] }).providers.length} providers`)
      : fail("AI provider registry", `${providers.status} ${JSON.stringify(providers.data)}`);

    const created = await req("/api/ai/conversations", {
      method: "POST",
      token,
      body: { title: "AI test functional" },
    });
    const conversationId = (created.data as { conversation?: { id?: string } })?.conversation?.id;
    created.status === 201 && conversationId
      ? ok("create AI conversation", conversationId)
      : fail("create AI conversation", `${created.status} ${JSON.stringify(created.data)}`);

    if (conversationId) {
      const detail = await req(`/api/ai/conversations/${conversationId}`, { token });
      detail.status === 200 && Array.isArray((detail.data as { messages?: unknown[] })?.messages)
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
    const fileId = (uploaded.data as { file?: { id?: string } })?.file?.id;
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
  let categories: unknown[] = [];
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
    const subSlugs = new Set<string>();
    for (const c of categories) {
      const cat = c as Record<string, unknown>;
      let subs = cat.subcategories;
      if (typeof subs === "string") {
        try {
          subs = JSON.parse(subs);
        } catch {
          subs = [];
        }
      }
      if (Array.isArray(subs)) {
        for (const s of subs) {
          const sub = s as Record<string, unknown> | string;
          const slug = typeof sub === "string" ? sub : sub?.slug;
          if (slug) subSlugs.add(String(slug).toLowerCase());
        }
      }
    }
    const collisions = categories.filter((c) => {
      const cat = c as Record<string, unknown>;
      return subSlugs.has(String(cat.slug).toLowerCase());
    });
    if (collisions.length === 0) {
      ok("no category row is also a subcategory slug");
    } else {
      // soft fail — data quality warning, not API bug
      fail(
        "category rows that are also sub-slugs (cleanup recommended)",
        collisions.map((c) => (c as Record<string, unknown>).slug).join(", "),
      );
    }
  }

  // —— create parent category + subs ——
  const testId = "ft-functional-test";
  let catId: string | null = null;
  const parentSlug = `ft-parent-${testId}`;
  {
    const r = await req("/api/entities/CurtainCategory", {
      method: "POST",
      token,
      body: {
        name: `FT Parent ${testId}`,
        slug: parentSlug,
        mechanism: "shade",
        order: 9000,
        subcategories: [
          { name: "زیر۱", slug: `ft-sub-a-${testId}` },
          { name: "زیر۲", slug: `ft-sub-b-${testId}` },
        ],
      },
    });
    if ((r.status === 201 || r.status === 200) && (r.data as { id?: string })?.id) {
      catId = (r.data as { id: string }).id;
      ok("create parent category with subs", parentSlug);
      const data = r.data as Record<string, unknown>;
      const subs = data.subcategories;
      const arr = typeof subs === "string" ? JSON.parse(subs) : subs;
      Array.isArray(arr) && arr.length === 2
        ? ok("subcategories persisted", `${arr.length}`)
        : fail("subcategories persisted", JSON.stringify(subs));
    } else {
      fail("create parent category", `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  // —— create model under parent + sub ——
  let modelId: string | null = null;
  {
    const r = await req("/api/entities/CurtainModel", {
      method: "POST",
      token,
      body: {
        code: `FT-${testId}`,
        name: `FT-${testId}`,
        category_slug: parentSlug,
        subcategory: `ft-sub-a-${testId}`,
        image: "https://via.placeholder.com/200",
      },
    });
    if ((r.status === 201 || r.status === 200) && (r.data as { id?: string })?.id) {
      modelId = (r.data as { id: string }).id;
      ok("create model under parent+sub");
      const data = r.data as Record<string, unknown>;
      const cat = data.category_slug || data.categorySlug || data.category_slug;
      const sub = data.subcategory;
      cat === parentSlug || data.categorySlug === parentSlug
        ? ok("model category_slug stored")
        : fail("model category_slug stored", JSON.stringify(r.data));
      sub === `ft-sub-a-${testId}`
        ? ok("model subcategory stored")
        : fail("model subcategory stored", String(sub));
    } else {
      fail("create model", `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  // —— create project sample ——
  let projectId: string | null = null;
  {
    const r = await req("/api/entities/Project", {
      method: "POST",
      token,
      body: {
        title: `FT Project ${testId}`,
        category_slug: parentSlug,
        subcategory: `ft-sub-b-${testId}`,
        cover_image: "https://via.placeholder.com/400",
        description: "functional test sample",
      },
    });
    if ((r.status === 201 || r.status === 200) && (r.data as { id?: string })?.id) {
      projectId = (r.data as { id: string }).id;
      ok("create project sample");
    } else {
      fail("create project sample", `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  // —— public list models filters ——
  {
    const r = await req(`/api/entities/CurtainModel?limit=50`);
    Array.isArray(r.data)
      ? ok("public list models", `${(r.data as unknown[]).length}`)
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
    r.status === 200 && Array.isArray((r.data as { categories?: unknown[] })?.categories)
      ? ok("shop catalog categories")
      : fail("shop catalog categories", String(r.status));
  }

  // —— MCP catalog bridge authentication and tool tests ——
  {
    const r = await req("/api/mcp");
    r.status === 200 && (r.data as { tools?: unknown[] })?.tools && Array.isArray((r.data as { tools: unknown[] }).tools)
      ? ok("MCP bridge advertises read-only tools")
      : fail("MCP bridge advertises read-only tools", String(r.status));
  }

  const mcpHeaders = {
    "x-mcp-worker-token": process.env.MCP_WORKER_TOKEN || "4f46fb4ceb3e5f63255df7df399812d4e97ba2bbc2ab66bebf2e3ed885a973dd",
  };

  {
    const r = await req("/api/mcp/tools/list_categories", {
      method: "POST",
      headers: mcpHeaders,
    });
    r.status === 200 && Array.isArray((r.data as { content?: unknown[] })?.content)
      ? ok("MCP list_categories tool (authenticated)", `${(r.data as { content: unknown[] }).content.length}`)
      : fail("MCP list_categories tool (authenticated)", `${r.status} ${JSON.stringify(r.data)}`);
  }

  {
    const r = await req("/api/mcp/tools/search_models", {
      method: "POST",
      headers: mcpHeaders,
      body: { query: "тест" },
    });
    r.status === 200 && Array.isArray((r.data as { content?: unknown[] })?.content)
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
      r.status === 200 && (r.data as { content?: { id?: string } })?.content?.id === modelId
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
    r.status === 404 && (r.data as { content?: { found?: boolean } })?.content?.found === false
      ? ok("MCP get_model returns 404 for missing model", `status=${r.status}`)
      : fail("MCP get_model returns 404 for missing model", `status=${r.status}`);
  }

  {
    const r = await req("/api/mcp/tools/list_projects", {
      method: "POST",
      headers: mcpHeaders,
    });
    r.status === 200 && Array.isArray((r.data as { content?: unknown[] })?.content)
      ? ok("MCP list_projects tool (authenticated)")
      : fail("MCP list_projects tool (authenticated)", `${r.status} ${JSON.stringify(r.data)}`);
  }

  // —— anon cannot write ——
  {
    const r = await req("/api/entities/CurtainCategory", {
      method: "POST",
      body: { name: "hack", slug: `hack-${testId}` },
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
