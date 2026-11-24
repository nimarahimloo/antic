import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const workerToken = randomUUID();
process.env.MCP_WORKER_TOKEN = workerToken;

const [{ default: app }, { prisma }, { default: worker }] = await Promise.all([
  import("../src/app.ts"),
  import("../src/lib/prisma.ts"),
  import("../../cloudflare/workers/nvidia-mcp-server/worker.js"),
]);

const marker = randomUUID().replaceAll("-", "").slice(0, 16);
const backendServer = app.listen(0, "127.0.0.1");
await new Promise((resolve, reject) => {
  backendServer.once("listening", resolve);
  backendServer.once("error", reject);
});

const address = backendServer.address();
assert.ok(address && typeof address === "object", "Backend must bind to an ephemeral TCP port");
const backendBase = \`http://127.0.0.1:\${address.port}\`;
const workerEnv = {
  MCP_WORKER_TOKEN: workerToken,
  MCP_BACKEND_URL: \`\${backendBase}/api/mcp/tools\`,
};

let category;
let model;
let project;

async function mcpRequest(message, overrides = {}) {
  const response = await worker.fetch(
    new Request("https://mcp.integration.test/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(message),
    }),
    { ...workerEnv, ...overrides },
  );
  const payload = response.status === 202 ? null : await response.json();
  return { response, payload };
}

async function callTool(id, name, args = {}, overrides = {}) {
  return mcpRequest(
    {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    },
    overrides,
  );
}

function decodeToolText(payload) {
  const text = payload?.result?.content?.[0]?.text;
  assert.equal(typeof text, "string", "MCP tool result must include a text content block");
  return JSON.parse(text);
}

test("MCP client → Cloudflare Worker → authenticated Express backend → Prisma catalog", async (t) => {
  try {
    await prisma.$connect();

    category = await prisma.curtainCategory.create({
      data: {
        name: \`MCP Integration Category \${marker}\`,
        slug: \`mcp-it-\${marker}\`,
        description: "Created by isolated MCP integration test",
        mechanism: "integration-test",
        subcategories: "[]",
        order: 9999,
      },
    });

    model = await prisma.curtainModel.create({
      data: {
        code: \`MCP-IT-\${marker}\`,
        name: \`MCP Integration Model \${marker}\`,
        categorySlug: category.slug,
        image: "https://example.invalid/mcp-integration-test.png",
        fabric: "integration-test-fabric",
        color: "integration-test-color",
      },
    });

    project = await prisma.project.create({
      data: {
        title: \`MCP Integration Project \${marker}\`,
        categorySlug: category.slug,
        description: "Created by isolated MCP integration test",
      },
    });

    await t.test("MCP initialize negotiates protocol through the Worker", async () => {
      const { response, payload } = await mcpRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-06-18" },
      });

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("mcp-protocol-version"), "2025-06-18");
      assert.equal(payload.result.protocolVersion, "2025-06-18");
      assert.equal(payload.result.serverInfo.name, "pardehantic-catalog-mcp");
    });

    await t.test("MCP tools/list returns the backend-backed tool contract", async () => {
      const { response, payload } = await mcpRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      });

      assert.equal(response.status, 200);
      assert.deepEqual(
        payload.result.tools.map((tool) => tool.name),
        ["list_categories", "search_models", "get_model", "list_projects"],
      );
    });

    await t.test("list_categories reaches the real Prisma database", async () => {
      const { response, payload } = await callTool(3, "list_categories");
      assert.equal(response.status, 200);
      assert.equal(payload.result.isError, false);

      const rows = decodeToolText(payload);
      assert.ok(Array.isArray(rows));
      assert.ok(rows.some((row) => row.id === category.id && row.slug === category.slug));
    });

    await t.test("search_models returns the seeded integration fixture", async () => {
      const { response, payload } = await callTool(4, "search_models", {
        query: marker,
        limit: 5,
      });
      assert.equal(response.status, 200);
      assert.equal(payload.result.isError, false);

      const rows = decodeToolText(payload);
      assert.ok(Array.isArray(rows));
      assert.ok(rows.some((row) => row.id === model.id && row.category_slug === category.slug));
    });

    await t.test("get_model returns details from the real database", async () => {
      const { response, payload } = await callTool(5, "get_model", { id: model.id });
      assert.equal(response.status, 200);
      assert.equal(payload.result.isError, false);

      const result = decodeToolText(payload);
      assert.equal(result.id, model.id);
      assert.equal(result.code, model.code);
      assert.equal(result.name, model.name);
    });

    await t.test("list_projects returns the persisted integration fixture", async () => {
      const { response, payload } = await callTool(6, "list_projects", { limit: 50 });
      assert.equal(response.status, 200);
      assert.equal(payload.result.isError, false);

      const rows = decodeToolText(payload);
      assert.ok(Array.isArray(rows));
      assert.ok(rows.some((row) => row.id === project.id && row.title === project.title));
    });

    await t.test("Backend rejects a direct unauthenticated bridge request", async () => {
      const response = await fetch(\`\${backendBase}/api/mcp/tools/list_categories\`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      assert.equal(response.status, 401);
    });

    await t.test("a Worker with the wrong origin credential cannot read the Backend", async () => {
      const { response, payload } = await callTool(
        7,
        "list_categories",
        {},
        { MCP_WORKER_TOKEN: "wrong-integration-credential" },
      );
      assert.equal(response.status, 200);
      assert.equal(payload.result.isError, true);

      const error = decodeToolText(payload);
      assert.equal(error.status, 401);
    });

    await t.test("Backend Zod validation rejects invalid tool arguments end to end", async () => {
      const { response, payload } = await callTool(8, "search_models", {
        query: "x".repeat(161),
      });
      assert.equal(response.status, 200);
      assert.equal(payload.result.isError, true);

      const error = decodeToolText(payload);
      assert.equal(error.status, 400);
    });

    await t.test("missing records are returned as MCP tool errors", async () => {
      const { response, payload } = await callTool(9, "get_model", {
        id: \`missing-\${marker}\`,
      });
      assert.equal(response.status, 200);
      assert.equal(payload.result.isError, true);

      const error = decodeToolText(payload);
      assert.equal(error.status, 404);
      assert.match(error.error, /پیدا نشد/);
    });
  } finally {
    if (project) await prisma.project.deleteMany({ where: { id: project.id } });
    if (model) await prisma.curtainModel.deleteMany({ where: { id: model.id } });
    if (category) await prisma.curtainCategory.deleteMany({ where: { id: category.id } });
    await prisma.$disconnect();
    await new Promise((resolve, reject) => {
      backendServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
