const UPSTREAM = "https://pardehantic.ir/api/mcp/tools";
const PROTOCOL_VERSION = "2025-06-18";
const MAX_BODY_BYTES = 64 * 1024;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type, accept, mcp-protocol-version"
};

const TOOLS = [
  {
    name: "list_categories",
    description: "دسته‌بندی‌های واقعی کاتالوگ پرده آنتیک را برمی‌گرداند.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "search_models",
    description: "مدل‌های پرده را با عبارت، دسته‌بندی یا مشخصات جست‌وجو می‌کند.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 160 },
        category_slug: { type: "string", maxLength: 100 },
        limit: { type: "integer", minimum: 1, maximum: 50 }
      },
      additionalProperties: false
    }
  },
  {
    name: "get_model",
    description: "جزئیات یک مدل پرده را با شناسه آن دریافت می‌کند.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", minLength: 1, maxLength: 128 } },
      required: ["id"],
      additionalProperties: false
    }
  },
  {
    name: "list_projects",
    description: "نمونه‌کارها و پروژه‌های اجراشده پرده آنتیک را برمی‌گرداند.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 50 } },
      additionalProperties: false
    }
  }
];

const TOOL_NAMES = new Set(TOOLS.map((tool) => tool.name));

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validId(id) {
  return typeof id === "string" || (typeof id === "number" && Number.isFinite(id));
}

function textContent(value) {
  return [{ type: "text", text: JSON.stringify(value) }];
}

async function callCatalogTool(name, args, env) {
  const response = await fetch(`${UPSTREAM}/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: {\n      "content-type": "application/json",\n      accept: "application/json",\n      "x-mcp-worker-token": env.MCP_WORKER_TOKEN || ""\n    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(15000)
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = response.status === 404
      ? "مورد در کاتالوگ پیدا نشد."
      : "سرویس کاتالوگ موقتاً در دسترس نیست.";
    return { isError: true, content: textContent({ error: message, status: response.status }) };
  }

  if (!isRecord(payload) || !("content" in payload)) {
    return { isError: true, content: textContent({ error: "پاسخ نامعتبر از سرویس کاتالوگ دریافت شد." }) };
  }

  return { content: textContent(payload.content), isError: false };
}

async function handleRpc(message, currentEnv) {
  if (!isRecord(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return { response: rpcError(isRecord(message) ? message.id : null, -32600, "Invalid JSON-RPC request") };
  }

  const notification = !Object.prototype.hasOwnProperty.call(message, "id");
  if (!notification && !validId(message.id)) {
    return { response: rpcError(null, -32600, "Invalid JSON-RPC id") };
  }

  if (message.method === "notifications/initialized" || message.method === "notifications/cancelled") {
    return { notification: true };
  }

  if (message.method === "initialize") {
    const requested = isRecord(message.params) ? message.params.protocolVersion : null;
    const supported = ["2025-06-18", "2025-03-26", "2024-11-05"];
    const version = supported.includes(requested) ? requested : PROTOCOL_VERSION;
    return {
      response: rpcResult(message.id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "pardehantic-catalog-mcp", version: "1.3.0" },
        instructions: "این سرور فقط ابزارهای خواندنی کاتالوگ و نمونه‌کارهای عمومی پرده آنتیک را ارائه می‌کند."
      }),
      protocolVersion: version
    };
  }

  if (message.method === "ping") {
    return { response: rpcResult(message.id, {}) };
  }

  if (message.method === "tools/list") {
    return { response: rpcResult(message.id, { tools: TOOLS }) };
  }

  if (message.method === "tools/call") {
    const params = isRecord(message.params) ? message.params : {};
    const name = params.name;
    const args = params.arguments === undefined ? {} : params.arguments;
    if (typeof name !== "string" || !TOOL_NAMES.has(name)) {
      return { response: rpcError(message.id, -32602, "Unknown tool") };
    }
    if (!isRecord(args)) {
      return { response: rpcError(message.id, -32602, "Tool arguments must be an object") };
    }
    try {
      const result = await callCatalogTool(name, args, currentEnv);
      return { response: rpcResult(message.id, result) };
    } catch {
      return {
        response: rpcResult(message.id, {
          isError: true,
          content: textContent({ error: "ارتباط با سرویس کاتالوگ برقرار نشد." })
        })
      };
    }
  }

  return notification
    ? { notification: true }
    : { response: rpcError(message.id, -32601, "Method not found") };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        status: "ok",
        service: "pardehantic-ai-mcp",
        transport: "streamable-http",
        protocolVersion: PROTOCOL_VERSION,
        tools: TOOLS.map((tool) => tool.name),
        scope: "public-read-only-catalog",
        inferenceEnabled: false
      });
    }

    if (url.pathname !== "/mcp") {
      return new Response("Not Found", { status: 404, headers: { "cache-control": "no-store" } });
    }

    if (request.method === "GET" || request.method === "DELETE") {
      return new Response(null, { status: 405, headers: { ...JSON_HEADERS, allow: "POST, OPTIONS" } });
    }

    if (request.method !== "POST") {
      return new Response(null, { status: 405, headers: { ...JSON_HEADERS, allow: "POST, OPTIONS" } });
    }

    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return json(rpcError(null, -32600, "Request too large"), 413);
    }

    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return json(rpcError(null, -32600, "Request too large"), 413);
    }

    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return json(rpcError(null, -32700, "Parse error"), 400);
    }

    if (Array.isArray(message)) {
      return json(rpcError(null, -32600, "JSON-RPC batch requests are not supported"), 400);
    }

    if (!env?.MCP_WORKER_TOKEN) {\n      return json(rpcError(null, -32603, "MCP origin credential is not configured"), 503);\n    }\n\n    const handled = await handleRpc(message, env);
    if (handled.notification || !handled.response) {
      return new Response(null, { status: 202, headers: JSON_HEADERS });
    }

    const version = handled.protocolVersion || request.headers.get("mcp-protocol-version") || PROTOCOL_VERSION;
    return json(handled.response, 200, { "mcp-protocol-version": version });
  }
};
