import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';

const TOKEN = 'unit-test-mcp-secret';
const BASE_URL = 'https://worker.test';
const MAX_BODY_BYTES = 64 * 1024;

function makeRequest(path = '/mcp', { method = 'POST', body, headers = {}, stream = false } = {}) {
  const init = { method, headers: new Headers(headers) };
  if (body !== undefined && body !== null) {
    init.body = stream ? body : typeof body === 'string' ? body : JSON.stringify(body);
    if (stream) init.duplex = 'half';
  }
  return new Request(`${BASE_URL}${path}`, init);
}

async function invoke(message, options = {}) {
  const request = makeRequest('/mcp', {
    method: 'POST',
    body: message,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) }
  });
  const response = await worker.fetch(request, options.env ?? { MCP_WORKER_TOKEN: TOKEN });
  const payload = response.status === 204 || response.status === 202 || response.status === 405
    ? null
    : await response.json();
  return { response, payload };
}

async function withFetchMock(mock, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test('OPTIONS responds with CORS headers and no body', async () => {
  const response = await worker.fetch(makeRequest('/mcp', { method: 'OPTIONS' }), {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('access-control-allow-methods'), 'POST, GET, OPTIONS');
  assert.equal(await response.text(), '');
});

test('health endpoint reports read-only MCP service without inference', async () => {
  const response = await worker.fetch(makeRequest('/health', { method: 'GET' }), {});
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.status, 'ok');
  assert.equal(payload.transport, 'streamable-http');
  assert.equal(payload.inferenceEnabled, false);
  assert.deepEqual(payload.tools, ['list_categories', 'search_models', 'get_model', 'list_projects']);
});

test('unknown paths return 404', async () => {
  const response = await worker.fetch(makeRequest('/not-mcp', { method: 'GET' }), {});
  assert.equal(response.status, 404);
});

test('GET and DELETE on /mcp return 405 with Allow header', async () => {
  for (const method of ['GET', 'DELETE']) {
    const response = await worker.fetch(makeRequest('/mcp', { method }), { MCP_WORKER_TOKEN: TOKEN });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'POST, OPTIONS');
  }
});

test('POST fails closed when MCP_WORKER_TOKEN is missing', async () => {
  await withFetchMock(async () => { throw new Error('upstream must not be called'); }, async () => {
    const { response, payload } = await invoke({ jsonrpc: '2.0', id: 1, method: 'ping' }, { env: {} });
    assert.equal(response.status, 503);
    assert.equal(payload.error.code, -32603);
  });
});

test('invalid JSON returns HTTP 400 parse error', async () => {
  const { response, payload } = await invoke('{not-json');
  assert.equal(response.status, 400);
  assert.equal(payload.error.code, -32700);
});

test('JSON-RPC batches are rejected', async () => {
  const { response, payload } = await invoke([{ jsonrpc: '2.0', id: 1, method: 'ping' }]);
  assert.equal(response.status, 400);
  assert.equal(payload.error.code, -32600);
  assert.match(payload.error.message, /batch/);
});

test('malformed JSON-RPC envelopes return invalid-request errors', async () => {
  const { response, payload } = await invoke({ jsonrpc: '1.0', id: 1, method: 'ping' });
  assert.equal(response.status, 200);
  assert.equal(payload.error.code, -32600);
});

test('initialize negotiates a supported protocol version', async () => {
  const { response, payload } = await invoke({
    jsonrpc: '2.0', id: 'init-1', method: 'initialize',
    params: { protocolVersion: '2025-03-26' }
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('mcp-protocol-version'), '2025-03-26');
  assert.equal(payload.result.protocolVersion, '2025-03-26');
  assert.equal(payload.result.serverInfo.name, 'pardehantic-catalog-mcp');
  assert.deepEqual(payload.result.capabilities, { tools: { listChanged: false } });
});

test('initialize falls back to the supported default protocol version', async () => {
  const { response, payload } = await invoke({
    jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: 'unsupported' }
  });
  assert.equal(response.headers.get('mcp-protocol-version'), '2025-06-18');
  assert.equal(payload.result.protocolVersion, '2025-06-18');
});

test('tools/list exposes all four read-only catalog tools', async () => {
  const { response, payload } = await invoke({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
  assert.equal(response.status, 200);
  assert.deepEqual(payload.result.tools.map((tool) => tool.name), [
    'list_categories', 'search_models', 'get_model', 'list_projects'
  ]);
  for (const tool of payload.result.tools) assert.equal(tool.inputSchema.additionalProperties, false);
});

test('ping returns an empty JSON-RPC result', async () => {
  const { payload } = await invoke({ jsonrpc: '2.0', id: 4, method: 'ping' });
  assert.deepEqual(payload, { jsonrpc: '2.0', id: 4, result: {} });
});

test('initialized notification returns 202 with no response body', async () => {
  const response = await worker.fetch(makeRequest('/mcp', {
    method: 'POST', body: { jsonrpc: '2.0', method: 'notifications/initialized' }
  }), { MCP_WORKER_TOKEN: TOKEN });
  assert.equal(response.status, 202);
  assert.equal(await response.text(), '');
});

test('unknown JSON-RPC methods return method-not-found', async () => {
  const { payload } = await invoke({ jsonrpc: '2.0', id: 5, method: 'resources/list' });
  assert.equal(payload.error.code, -32601);
});

test('unknown tool names and non-object arguments are rejected without upstream calls', async () => {
  await withFetchMock(async () => { throw new Error('upstream must not be called'); }, async () => {
    const unknown = await invoke({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'delete_everything' } });
    assert.equal(unknown.payload.error.code, -32602);
    const invalidArgs = await invoke({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'list_categories', arguments: ['not', 'an', 'object'] } });
    assert.equal(invalidArgs.payload.error.code, -32602);
  });
});

test('tools/call forwards tool arguments and Worker credential to backend', async () => {
  await withFetchMock(async (url, init) => {
    assert.equal(url, 'https://pardehantic.ir/api/mcp/tools/search_models');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['x-mcp-worker-token'], TOKEN);
    assert.deepEqual(JSON.parse(init.body), { query: 'linen', limit: 8 });
    return Response.json({ content: { items: [{ id: 'model-1' }] } });
  }, async () => {
    const { response, payload } = await invoke({
      jsonrpc: '2.0', id: 8, method: 'tools/call',
      params: { name: 'search_models', arguments: { query: 'linen', limit: 8 } }
    });
    assert.equal(response.status, 200);
    assert.equal(payload.result.isError, false);
    assert.deepEqual(JSON.parse(payload.result.content[0].text), { items: [{ id: 'model-1' }] });
  });
});

test('public catalog list tools use KV cache with a short TTL', async () => {
  const values = new Map();
  const kvOptions = [];
  const kv = {
    async get(key, type, options) {
      assert.equal(type, 'json');
      assert.equal(options.cacheTtl, 30);
      const value = values.get(key);
      return value === undefined ? null : JSON.parse(value);
    },
    async put(key, value, options) {
      kvOptions.push(options);
      values.set(key, value);
    }
  };
  let upstreamCalls = 0;

  await withFetchMock(async () => {
    upstreamCalls += 1;
    return Response.json({ content: [{ id: 'category-1', slug: 'curtains' }] });
  }, async () => {
    const message = {
      jsonrpc: '2.0', id: 40, method: 'tools/call',
      params: { name: 'list_categories', arguments: {} }
    };
    const first = await invoke(message, { env: { MCP_WORKER_TOKEN: TOKEN, MCP_CATALOG_CACHE: kv } });
    const second = await invoke({ ...message, id: 41 }, {
      env: { MCP_WORKER_TOKEN: TOKEN, MCP_CATALOG_CACHE: kv }
    });

    assert.equal(first.response.status, 200);
    assert.equal(second.response.status, 200);
    assert.equal(first.payload.result.isError, false);
    assert.equal(second.payload.result.isError, false);
    assert.deepEqual(
      JSON.parse(second.payload.result.content[0].text),
      [{ id: 'category-1', slug: 'curtains' }]
    );
  });

  assert.equal(upstreamCalls, 1, 'the second list call should be served from KV');
  assert.equal(kvOptions.length, 1);
  assert.equal(kvOptions[0].expirationTtl, 60);
});

test('KV read and write failures fail open to the Backend', async () => {
  let upstreamCalls = 0;
  const brokenKv = {
    async get() { throw new Error('KV read unavailable'); },
    async put() { throw new Error('KV write unavailable'); }
  };

  await withFetchMock(async () => {
    upstreamCalls += 1;
    return Response.json({ content: [{ id: 'project-1' }] });
  }, async () => {
    const { response, payload } = await invoke({
      jsonrpc: '2.0', id: 42, method: 'tools/call',
      params: { name: 'list_projects', arguments: { limit: 10 } }
    }, {
      env: { MCP_WORKER_TOKEN: TOKEN, MCP_CATALOG_CACHE: brokenKv }
    });

    assert.equal(response.status, 200);
    assert.equal(payload.result.isError, false);
    assert.deepEqual(JSON.parse(payload.result.content[0].text), [{ id: 'project-1' }]);
  });

  assert.equal(upstreamCalls, 1);
});

test('search_models bypasses KV so search results remain fresh', async () => {
  let kvCalls = 0;
  let upstreamCalls = 0;
  const kv = {
    async get() { kvCalls += 1; return null; },
    async put() { kvCalls += 1; }
  };

  await withFetchMock(async () => {
    upstreamCalls += 1;
    return Response.json({ content: [{ id: 'model-' + upstreamCalls }] });
  }, async () => {
    for (const id of [43, 44]) {
      const { response, payload } = await invoke({
        jsonrpc: '2.0', id, method: 'tools/call',
        params: { name: 'search_models', arguments: { query: 'linen' } }
      }, {
        env: { MCP_WORKER_TOKEN: TOKEN, MCP_CATALOG_CACHE: kv }
      });
      assert.equal(response.status, 200);
      assert.equal(payload.result.isError, false);
    }
  });

  assert.equal(upstreamCalls, 2);
  assert.equal(kvCalls, 0);
});

test('backend 404 is returned as an MCP tool error', async () => {
  await withFetchMock(async () => new Response(JSON.stringify({ error: 'not found' }), { status: 404 }), async () => {
    const { payload } = await invoke({
      jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'get_model', arguments: { id: 'missing' } }
    });
    assert.equal(payload.result.isError, true);
    const detail = JSON.parse(payload.result.content[0].text);
    assert.equal(detail.status, 404);
    assert.equal(detail.error, 'مورد در کاتالوگ پیدا نشد.');
  });
});

test('malformed backend payload becomes a safe MCP tool error', async () => {
  await withFetchMock(async () => new Response('not-json', { status: 200 }), async () => {
    const { payload } = await invoke({
      jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'list_categories' }
    });
    assert.equal(payload.result.isError, true);
    assert.match(JSON.parse(payload.result.content[0].text).error, /نامعتبر/);
  });
});

test('upstream network failures become safe MCP tool errors', async () => {
  await withFetchMock(async () => { throw new Error('private upstream details'); }, async () => {
    const { payload } = await invoke({
      jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'list_projects' }
    });
    assert.equal(payload.result.isError, true);
    const detail = JSON.parse(payload.result.content[0].text);
    assert.equal(detail.error, 'ارتباط با سرویس کاتالوگ برقرار نشد.');
    assert.equal(JSON.stringify(payload).includes('private upstream details'), false);
  });
});

test('declared bodies larger than 64 KiB are rejected before parsing', async () => {
  const request = makeRequest('/mcp', {
    method: 'POST', body: '{}',
    headers: { 'content-type': 'application/json', 'content-length': String(MAX_BODY_BYTES + 1) }
  });
  const response = await worker.fetch(request, { MCP_WORKER_TOKEN: TOKEN });
  const payload = await response.json();
  assert.equal(response.status, 413);
  assert.equal(payload.error.message, 'Request too large');
});

test('streamed bodies without Content-Length are stopped at 64 KiB', async () => {
  let pulls = 0;
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      if (pulls === 0) controller.enqueue(new Uint8Array(MAX_BODY_BYTES));
      else if (pulls === 1) controller.enqueue(new Uint8Array(1));
      else controller.close();
      pulls += 1;
    },
    cancel() { cancelled = true; }
  });
  const request = makeRequest('/mcp', {
    method: 'POST', stream: true, body,
    headers: { 'content-type': 'application/json' }
  });
  assert.equal(request.headers.has('content-length'), false);
  const response = await worker.fetch(request, { MCP_WORKER_TOKEN: TOKEN });
  const payload = await response.json();
  assert.equal(response.status, 413);
  assert.equal(payload.error.message, 'Request too large');
  assert.equal(cancelled, true);
});

test('body at exactly 64 KiB is accepted', async () => {
  const message = JSON.stringify({ jsonrpc: '2.0', id: 12, method: 'ping' });
  const body = message + ' '.repeat(MAX_BODY_BYTES - Buffer.byteLength(message));
  assert.equal(Buffer.byteLength(body), MAX_BODY_BYTES);
  const { response, payload } = await invoke(body);
  assert.equal(response.status, 200);
  assert.deepEqual(payload.result, {});
});
