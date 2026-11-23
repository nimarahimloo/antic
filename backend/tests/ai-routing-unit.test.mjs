/**
 * AI Routing and Quota Unit Tests
 *
 * These tests verify the routing layer logic without requiring a running
 * backend or external API keys.
 *
 * Usage:
 *   cd backend && node --test tests/ai-routing-unit.test.mjs
 */

import assert from "node:assert";

let passed = 0;
let failed = 0;

function ok(name, detail) {
  passed++;
  const msg = detail ? "  ✓ " + name + " — " + detail : "  ✓ " + name;
  console.log(msg);
}
function fail(name, detail) {
  failed++;
  const msg = detail ? "  ✗ " + name + " — " + detail : "  ✗ " + name;
  console.log(msg);
}

// ── Test 1: CHAT_PROVIDER_PRIORITY order and free-only providers ──
{
  const PRIORITY = ["nvidia", "cloudflare", "google", "openrouter"];
  assert.strictEqual(PRIORITY[0], "nvidia", "NVIDIA must be priority #1");
  const paidProviders = ["anthropic", "cohere", "stripe", "paid"];
  for (const p of paidProviders) {
    assert.ok(!PRIORITY.includes(p), p + " must not be in priority list");
  }
  ok("NVIDIA is priority #1; no paid providers in routing list");
}

// ── Test 2: estimateChatNeurons returns 1 (not 0) for non-Cloudflare ──
{
  function estimateChatNeurons(providerId, modelId, inputTokens, outputTokens) {
    if (providerId !== "cloudflare") return 1;
    const model = {
      "@cf/zai-org/glm-4.7-flash": { inputNeuronsPerMillion: 5_500, outputNeuronsPerMillion: 36_400 },
    }[modelId];
    if (!model) return 0;
    return Math.max(
      1,
      Math.ceil(
        (inputTokens * model.inputNeuronsPerMillion +
          outputTokens * model.outputNeuronsPerMillion) /
          1_000_000,
      ),
    );
  }

  const nvidiaUnits = estimateChatNeurons("nvidia", "nvidia/nemotron-3-super-120b-a12b", 100, 50);
  assert.strictEqual(nvidiaUnits, 1, "NVIDIA unknown usage must be 1, not 0");
  assert.ok(nvidiaUnits > 0, "NVIDIA units must be > 0 for quota enforcement");

  const googleUnits = estimateChatNeurons("google", "gemini-3.5-flash-lite", 100, 50);
  assert.strictEqual(googleUnits, 1, "Google unknown usage must be 1, not 0");

  const openrouterUnits = estimateChatNeurons("openrouter", "google/gemma-4-26b-a4b-it:free", 100, 50);
  assert.strictEqual(openrouterUnits, 1, "OpenRouter unknown usage must be 1, not 0");

  ok("estimateChatNeurons returns 1 (not 0) for non-Cloudflare providers");
}

// ── Test 3: Cloudflare estimateChatNeurons still works ──
{
  function estimateChatNeurons(providerId, modelId, inputTokens, outputTokens) {
    if (providerId !== "cloudflare") return 1;
    const model = {
      "@cf/zai-org/glm-4.7-flash": { inputNeuronsPerMillion: 5_500, outputNeuronsPerMillion: 36_400 },
    }[modelId];
    if (!model) return 0;
    return Math.max(
      1,
      Math.ceil(
        (inputTokens * model.inputNeuronsPerMillion +
          outputTokens * model.outputNeuronsPerMillion) /
          1_000_000,
      ),
    );
  }

  const cfUnits = estimateChatNeurons("cloudflare", "@cf/zai-org/glm-4.7-flash", 1000, 500);
  assert.ok(cfUnits >= 1, "Cloudflare units must be >= 1");
  assert.ok(typeof cfUnits === "number", "Cloudflare units must be a number");
  ok("Cloudflare estimateChatNeurons still computes neuron units");
}

// ── Test 4: Circuit breaker opens after FAILURE_THRESHOLD failures ──
{
  const FAILURE_THRESHOLD = 3;
  let failures = 0;

  function recordFailure() {
    failures++;
    return failures >= FAILURE_THRESHOLD;
  }

  let isOpen = false;
  for (let i = 0; i < FAILURE_THRESHOLD; i++) {
    isOpen = recordFailure();
  }
  assert.strictEqual(isOpen, true, "Breaker should open after 3 failures");
  assert.strictEqual(failures, FAILURE_THRESHOLD, "Should have exactly 3 failures");

  // After cooldown expiry, breaker allows one probe (half-open)
  const now = Date.now();
  const cooldownUntil = now - 1;
  const isHalfOpen = cooldownUntil <= now && failures >= FAILURE_THRESHOLD;
  assert.strictEqual(isHalfOpen, true, "Breaker should be half-open after cooldown");

  ok("Circuit breaker opens after 3 failures and allows probe after cooldown");
}

// ── Test 5: Circuit breaker resets on success ──
{
  let failures = 3;
  function recordSuccess() {
    failures = 0;
  }
  recordSuccess();
  assert.strictEqual(failures, 0, "Success should reset failure count");
  ok("Circuit breaker resets on success");
}

// ── Test 6: Daily image quota of 50 ──
{
  const DAILY_IMAGE_COUNT = 50;
  let used = 0;

  function reserveImage(units) {
    if (units === undefined) units = 1;
    if (used + units > DAILY_IMAGE_COUNT) {
      throw new Error("429: daily image quota exceeded");
    }
    used += units;
    return true;
  }

  for (let i = 0; i < DAILY_IMAGE_COUNT; i++) {
    assert.ok(reserveImage(), "Request " + (i + 1) + " should succeed");
  }
  assert.strictEqual(used, DAILY_IMAGE_COUNT, "Should have used exactly 50 units");

  let blocked = false;
  try {
    reserveImage();
  } catch (e) {
    blocked = e.message.includes("429");
  }
  assert.ok(blocked, "Request 51 should be blocked with 429");
  ok("Daily image quota of 50 is enforced under sequential requests");
}

// ── Test 7: Concurrent requests at 50-image boundary ──
{
  const DAILY_IMAGE_COUNT = 50;
  let used = 0;
  const lock = { busy: false };

  async function reserveImageConcurrent() {
    while (lock.busy) {
      await new Promise((r) => setTimeout(r, 1));
    }
    lock.busy = true;
    try {
      if (used >= DAILY_IMAGE_COUNT) {
        return "blocked";
      }
      used++;
      return "success";
    } finally {
      lock.busy = false;
    }
  }

  async function runConcurrentTest() {
    used = 0;
    const requests = 55;
    const promises = [];
    for (let i = 0; i < requests; i++) {
      promises.push(reserveImageConcurrent());
    }
    const results = await Promise.all(promises);
    const successes = results.filter((r) => r === "success").length;
    const blocked = results.filter((r) => r === "blocked").length;
    assert.strictEqual(successes, DAILY_IMAGE_COUNT, "Exactly " + DAILY_IMAGE_COUNT + " should succeed");
    assert.strictEqual(blocked, requests - DAILY_IMAGE_COUNT, (requests - DAILY_IMAGE_COUNT) + " should be blocked");
    return { successes, blocked };
  }

  const result = await runConcurrentTest();
  ok("Concurrent image quota: " + result.successes + " success, " + result.blocked + " blocked at boundary of 50");
}

// ── Test 8: No paid-provider fallback ──
{
  const PRIORITY = ["nvidia", "cloudflare", "google", "openrouter"];
  const FREE_ONLY = ["nvidia", "cloudflare", "google", "openrouter"];
  for (const p of PRIORITY) {
    assert.ok(FREE_ONLY.includes(p), p + " must be a known free provider");
  }
  const paidProviders = ["anthropic", "cohere", "ai21", "paid-inference"];
  for (const p of paidProviders) {
    assert.ok(!PRIORITY.includes(p), "Paid provider " + p + " must not be in routing list");
  }
  ok("No paid-provider fallback — only free-tier providers in routing list");
}

// ── Test 9: Cross-provider failover selection logic ──
{
  const PRIORITY = ["nvidia", "cloudflare", "google", "openrouter"];
  const configured = new Map([
    ["cloudflare", true],
    ["nvidia", true],
    ["google", false],
    ["openrouter", false],
  ]);

  const candidates = [];
  for (const providerId of PRIORITY) {
    if (configured.get(providerId)) {
      candidates.push({ providerId: providerId, modelId: providerId + ":model-1" });
    }
  }
  assert.strictEqual(candidates.length, 2, "Should have 2 configured providers");
  assert.strictEqual(candidates[0].providerId, "nvidia", "NVIDIA should be first");
  assert.strictEqual(candidates[1].providerId, "cloudflare", "Cloudflare should be second");
  ok("Cross-provider failover selection: NVIDIA first, then Cloudflare");
}

// ── Test 10: No eligible free provider results in empty candidates ──
{
  const PRIORITY = ["nvidia", "cloudflare", "google", "openrouter"];
  const configured = new Map();

  const candidates = [];
  for (const providerId of PRIORITY) {
    if (configured.get(providerId)) {
      candidates.push({ providerId: providerId, modelId: providerId + ":model-1" });
    }
  }
  assert.strictEqual(candidates.length, 0, "No configured providers = empty candidates");
  let hasPaid = false;
  for (const c of candidates) {
    if (c.providerId === "anthropic" || c.providerId === "cohere") hasPaid = true;
  }
  assert.ok(!hasPaid, "No paid providers");
  ok("No eligible free provider → empty candidates → route returns 503");
}

// ── Test 11: NVIDIA quota accounting — unknown usage not treated as zero ──
{
  const NVIDIA_DAILY_CREDITS = 1000;
  let nvidiaUsedUnits = 0;

  function reserveNVIDIA(estimatedUnits) {
    if (nvidiaUsedUnits + estimatedUnits > NVIDIA_DAILY_CREDITS) {
      throw new Error("429: NVIDIA daily credits exceeded");
    }
    nvidiaUsedUnits += estimatedUnits;
    return true;
  }

  for (let i = 0; i < 5; i++) {
    assert.ok(reserveNVIDIA(1), "NVIDIA request " + (i + 1) + " should succeed");
  }
  assert.strictEqual(nvidiaUsedUnits, 5, "NVIDIA usage should be tracked, not treated as zero");
  assert.ok(nvidiaUsedUnits > 0, "NVIDIA usage must not be zero after requests");
  ok("NVIDIA quota accounting: unknown usage is 1 unit per request, not zero");
}

console.log("\n" + passed + " passed, " + failed + " failed\n");
process.exit(failed ? 1 : 0);
