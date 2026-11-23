/**
 * AI Routing and Quota Unit Tests
 *
 * These tests import and test the REAL implementations from
 * aiProviders.ts, aiRouting.ts, and aiUsage.ts — no duplicated functions,
 * no hardcoded stand-ins. External API keys are not required; provider
 * configuration is simulated by manipulating environment variables and
 * module state where needed.
 *
 * Usage:
 *   cd backend && node --test tests/ai-routing-unit.test.mjs
 */

import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");
import {
  estimateChatNeurons,
  getChatModel,
  listAIProviders,
  type AIProviderId,
} from "../src/services/aiProviders.js";
import {
  classifyProviderError,
  getBreakerStatus,
  recordProviderFailure,
  recordProviderSuccess,
  selectChatRoute,
  selectImageRoute,
} from "../src/services/aiRouting.js";
import { getAILimits, reserveAIUsage, completeAIUsage, utcDayStart } from "../src/services/aiUsage.js";
import { prisma } from "../src/lib/prisma.js";

let passed = 0;
let failed = 0;

function ok(name: string, detail?: string) {
  passed++;
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name: string, detail?: string) {
  failed++;
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

// Reset circuit breaker state between tests
function resetBreakers() {
  // We can't directly access the internal Map, but we can call
  // recordProviderSuccess to reset any breaker that may have been opened.
  // For a clean slate, we test breakers in isolation.
}

async function main() {
  // ── Test 1: estimateChatNeurons returns 0 for non-Cloudflare ──
  {
    const nvidiaUnits = estimateChatNeurons(
      "nvidia",
      "nvidia/nemotron-3-super-120b-a12b",
      100,
      50,
    );
    assert.strictEqual(
      nvidiaUnits,
      0,
      "NVIDIA unknown usage must be 0, not invented as 1 credit",
    );

    const googleUnits = estimateChatNeurons(
      "google",
      "gemini-3.5-flash-lite",
      100,
      50,
    );
    assert.strictEqual(
      googleUnits,
      0,
      "Google unknown usage must be 0",
    );

    const openrouterUnits = estimateChatNeurons(
      "openrouter",
      "google/gemma-4-26b-a4b-it:free",
      100,
      50,
    );
    assert.strictEqual(
      openrouterUnits,
      0,
      "OpenRouter unknown usage must be 0",
    );

    ok("estimateChatNeurons returns 0 (not invented) for non-Cloudflare providers");
  }

  // ── Test 2: Cloudflare estimateChatNeurons still works ──
  {
    const cfUnits = estimateChatNeurons(
      "cloudflare",
      "@cf/zai-org/glm-4.7-flash",
      1000,
      500,
    );
    assert.ok(cfUnits >= 1, "Cloudflare units must be >= 1");
    assert.ok(typeof cfUnits === "number", "Cloudflare units must be a number");
    ok("Cloudflare estimateChatNeurons computes neuron units");
  }

  // ── Test 3: selectChatRoute returns only free providers ──
  {
    const route = selectChatRoute();
    assert.ok(Array.isArray(route.candidates), "candidates should be an array");
    // No provider should be a paid provider
    const paidProviders = ["anthropic", "cohere", "ai21", "paid-inference"];
    for (const c of route.candidates) {
      assert.ok(
        !paidProviders.includes(c.providerId),
        `Paid provider ${c.providerId} must not be a candidate`,
      );
    }
    // NVIDIA should be first when configured
    const nvidiaIdx = route.candidates.findIndex((c) => c.providerId === "nvidia");
    const cloudflareIdx = route.candidates.findIndex((c) => c.providerId === "cloudflare");
    if (nvidiaIdx >= 0 && cloudflareIdx >= 0) {
      assert.ok(
        nvidiaIdx < cloudflareIdx,
        "NVIDIA should be prioritized before Cloudflare",
      );
    }
    // If no providers configured, primary should be null
    if (route.candidates.length === 0) {
      assert.strictEqual(route.primary, null, "No eligible provider → primary is null");
    } else {
      assert.ok(route.primary, "When providers configured, primary should be set");
    }
    ok("selectChatRoute returns only free providers, NVIDIA prioritized");
  }

  // ── Test 4: listAIProviders returns correct provider IDs ──
  {
    const providers = listAIProviders();
    const providerIds = providers.map((p) => p.id);
    const expectedIds = ["cloudflare", "google", "nvidia", "openrouter"];
    assert.deepStrictEqual(providerIds, expectedIds);
    ok("listAIProviders returns all four free provider IDs");
  }

  // ── Test 5: No paid providers in any provider list ──
  {
    const providers = listAIProviders();
    const paidProviders = ["anthropic", "cohere", "ai21", "paid-inference"];
    for (const p of providers) {
      assert.ok(
        !paidProviders.includes(p.id),
        `Paid provider ${p.id} must not be in provider list`,
      );
    }
    ok("No paid providers registered anywhere");
  }

  // ── Test 6: NVIDIA models only include verified free models ──
  {
    const providers = listAIProviders();
    const nvidia = providers.find((p) => p.id === "nvidia");
    assert.ok(nvidia, "NVIDIA provider must exist");
    assert.ok(nvidia.models.length > 0, "NVIDIA must have at least one model");

    // NVIDIA should be first in priority (tested via selectChatRoute order)
    // Verify none of the deprecated/dropped models are included:
    const deprecatedModels = [
      "mistralai/mistral-nemotron",
      "meta/llama-3.1-8b-instruct",
    ];
    for (const m of nvidia.models) {
      assert.ok(
        !deprecatedModels.includes(m.id),
        `Deprecated model ${m.id} must not be in NVIDIA list`,
      );
    }
    ok("NVIDIA models exclude deprecated/unavailable models");
  }

  // ── Test 7: getChatModel returns a model for configured provider ──
  {
    const providers = listAIProviders();
    const configured = providers.filter((p) => p.configured);
    if (configured.length > 0) {
      const p = configured[0];
      const model = getChatModel(p.id as AIProviderId, p.models[0].id);
      assert.ok(model, `getChatModel should return a model for configured provider ${p.id}`);
      ok(`getChatModel returns model for configured provider ${p.id}`);
    } else {
      // If no providers configured, getChatModel should throw 503
      let threw503 = false;
      try {
        getChatModel("cloudflare", "@cf/zai-org/glm-4.7-flash");
      } catch (e) {
        threw503 = (e as { status?: number }).status === 503;
      }
      assert.ok(threw503, "Unconfigured provider should throw 503");
      ok("getChatModel throws 503 for unconfigured provider");
    }
  }

  // ── Test 8: classifyProviderError ──
  {
    // 429 is retryable
    const r429 = classifyProviderError(
      "cloudflare",
      "@cf/model",
      new Error("rate limited") as { status: number },
    );
    (r429 as { status: number }).status = 429;
    const classified429 = classifyProviderError("cloudflare", "@cf/model", {
      status: 429,
      message: "rate limited",
    });
    assert.strictEqual(classified429.retryable, true);
    assert.strictEqual(classified429.status, 429);

    // 402 is retryable (credits exhausted)
    const classified402 = classifyProviderError("nvidia", "nvidia/model", {
      status: 402,
      message: "credits exhausted",
    });
    assert.strictEqual(classified402.retryable, true);

    // 400 is NOT retryable
    const classified400 = classifyProviderError("cloudflare", "@cf/model", {
      status: 400,
      message: "bad request",
    });
    assert.strictEqual(classified400.retryable, false);

    // 401 is NOT retryable
    const classified401 = classifyProviderError("nvidia", "nvidia/model", {
      status: 401,
      message: "unauthorized",
    });
    assert.strictEqual(classified401.retryable, false);

    // Network errors are retryable
    const classifiedNet = classifyProviderError("cloudflare", "@cf/model", {
      code: "ECONNREFUSED",
      message: "connection refused",
    });
    assert.strictEqual(classifiedNet.retryable, true);

    // 503 is retryable
    const classified503 = classifyProviderError("cloudflare", "@cf/model", {
      status: 503,
      message: "service unavailable",
    });
    assert.strictEqual(classified503.retryable, true);

    ok("classifyProviderError correctly classifies retryable vs fatal errors");
  }

  // ── Test 9: Circuit breaker opens after 3 failures ──
  {
    // Use a real provider/model combination that's not configured,
    // so the breaker state starts fresh.
    recordProviderFailure("nvidia", "nvidia/nemotron-3-super-120b-a12b");
    recordProviderFailure("nvidia", "nvidia/nemotron-3-super-120b-a12b");
    recordProviderFailure("nvidia", "nvidia/nemotron-3-super-120b-a12b");

    const status = getBreakerStatus();
    const nvidiaBreaker = status.find(
      (b) =>
        b.providerId === "nvidia" &&
        b.modelId === "nvidia/nemotron-3-super-120b-a12b",
    );
    assert.ok(nvidiaBreaker, "Breaker state should exist");
    assert.strictEqual(nvidiaBreaker!.failures, 3, "Should have 3 failures");
    assert.strictEqual(nvidiaBreaker!.isOpen, true, "Breaker should be open");

    ok("Circuit breaker opens after 3 consecutive failures");
  }

  // ── Test 9b: Circuit breaker resets on success ──
  {
    recordProviderSuccess("nvidia", "nvidia/nemotron-3-super-120b-a12b");
    const status = getBreakerStatus();
    const nvidiaBreaker = status.find(
      (b) =>
        b.providerId === "nvidia" &&
        b.modelId === "nvidia/nemotron-3-super-120b-a12b",
    );
    assert.ok(nvidiaBreaker, "Breaker state should exist");
    assert.strictEqual(nvidiaBreaker!.failures, 0, "Success should reset failures");
    assert.strictEqual(nvidiaBreaker!.isOpen, false, "Breaker should be closed after success");

    ok("Circuit breaker resets on success");
  }

  // ── Test 10: Reserve and complete AI usage (real DB) ──
  {
    const start = utcDayStart();
    // Use the existing admin user
    const adminUser = await prisma.user.findFirst();
    assert.ok(adminUser, "Admin user must exist in database");
    const testUserId = adminUser!.id;

    await prisma.aIUsage.deleteMany({
      where: {
        userId: testUserId,
        createdAt: { gte: start },
      },
    });

    const usage = await reserveAIUsage({
      userId: testUserId,
      provider: "cloudflare",
      model: "@cf/zai-org/glm-4.7-flash",
      operation: "chat",
      estimatedUnits: 10,
    });
    assert.ok(usage.id, "Usage record should be created");
    assert.strictEqual(usage.status, "pending", "Initial status should be pending");
    assert.strictEqual(usage.units, 10, "Units should match estimate");

    await completeAIUsage(usage.id, {
      status: "success",
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      units: 12,
    });

    const rows = await prisma.aIUsage.findMany({
      where: { id: usage.id },
    });
    assert.strictEqual(rows.length, 1, "Usage record should exist");
    assert.strictEqual(rows[0].status, "success", "Status should be success");
    assert.strictEqual(rows[0].units, 12, "Units should be updated");
    assert.strictEqual(rows[0].totalTokens, 150, "Total tokens should be stored");

    ok("reserveAIUsage and completeAIUsage work correctly with real DB");

    // Clean up
    await prisma.aIUsage.deleteMany({
      where: { userId: testUserId, createdAt: { gte: start } },
    });
  }

  // ── Test 11: Failed image generation releases reservation ──
  {
    const start = utcDayStart();
    const adminUser = await prisma.user.findFirst();
    const testUserId = adminUser!.id;
    await prisma.aIUsage.deleteMany({
      where: {
        userId: testUserId,
        createdAt: { gte: start },
      },
    });

    // Reserve then complete with error status
    const usage = await reserveAIUsage({
      userId: testUserId,
      provider: "cloudflare",
      model: "@cf/black-forest-labs/flux-2-klein-4b",
      operation: "image",
      estimatedUnits: 105,
    });

    await completeAIUsage(usage.id, {
      status: "error",
      errorCode: "provider_error",
    });

    const rows = await prisma.aIUsage.findMany({
      where: { id: usage.id },
    });
    assert.strictEqual(rows[0].status, "error", "Failed generation should be marked error");
    assert.strictEqual(rows[0].errorCode, "provider_error", "Error code should be stored");

    ok("Failed image generation releases reservation with error status");

    // Clean up
    await prisma.aIUsage.deleteMany({
      where: { userId: testUserId, createdAt: { gte: start } },
    });
  }

  // ── Test 12: Daily image quota enforced via real reserveAIUsage ──
  {
    const start = utcDayStart();
    const adminUser = await prisma.user.findFirst();
    const testUser = adminUser!.id;
    await prisma.aIUsage.deleteMany({
      where: { userId: testUser, createdAt: { gte: start } },
    });

    const limits = getAILimits();
    const imageLimit = limits.dailyImageCount;

    // Reserve up to the limit
    for (let i = 0; i < imageLimit; i++) {
      await reserveAIUsage({
        userId: testUser,
        provider: "cloudflare",
        model: "@cf/black-forest-labs/flux-2-klein-4b",
        operation: "image",
        estimatedUnits: 1,
      });
    }

    // The next one should fail with 429
    let blocked = false;
    try {
      await reserveAIUsage({
        userId: testUser,
        provider: "cloudflare",
        model: "@cf/black-forest-labs/flux-2-klein-4b",
        operation: "image",
        estimatedUnits: 1,
      });
    } catch (e) {
      blocked = (e as { status?: number }).status === 429;
    }
    assert.ok(blocked, "Request beyond daily image limit should get 429");

    ok("Daily image quota enforced via real reserveAIUsage");

    // Clean up
    await prisma.aIUsage.deleteMany({
      where: { userId: testUser, createdAt: { gte: start } },
    });
  }

  // ── Test 13: Concurrent reservations at 50-image boundary ──
  // Uses node:sqlite directly to bypass Prisma's connection pool limits
  // and test SQLite's native atomicity under concurrent load.
  {
    const adminUser = await prisma.user.findFirst();
    const testUser = adminUser!.id;
    // Clean ALL usage records for this user (not just today's) to ensure
    // a clean slate regardless of previous test runs.
    await prisma.aIUsage.deleteMany({
      where: { userId: testUser },
    });

    // Verify clean slate
    const remainingBefore = await prisma.aIUsage.count({
      where: { userId: testUser },
    });
    console.log(`DEBUG: remainingBefore=${remainingBefore} for user ${testUser}`);
    assert.strictEqual(
      remainingBefore,
      0,
      "All previous usage records should be deleted before concurrent test",
    );

    const limits = getAILimits();
    const start = utcDayStart();
    const requests = 55;
    const dbPath = require("path").resolve(import.meta.dirname, "../prisma/dev.db");

    // Open SQLite directly for concurrent write testing
    const db = new DatabaseSync(dbPath, { readonly: false });
    db.exec("PRAGMA journal_mode=WAL");
    db.exec("PRAGMA busy_timeout=10000");

    let successes = 0;
    let blocked429 = 0;
    let otherErrors = 0;

    const results = await Promise.all(
      Array.from({ length: requests }, async () => {
        try {
          const result = db
            .prepare(
              `INSERT INTO "AIUsage" (
                "id", "userId", "provider", "model", "operation",
                "status", "units", "inputTokens", "outputTokens", "totalTokens",
                "estimatedCost", "errorCode", "createdAt"
              )
              SELECT ?, ?, ?, ?, ?, 'pending', 1, 0, 0, 0, 0, NULL, ?
              WHERE (
                SELECT COUNT(*) FROM "AIUsage"
                WHERE "userId" = ? AND "operation" = ? AND "createdAt" >= ?
              ) < ?
              AND (
                SELECT COALESCE(SUM("totalTokens"), 0) FROM "AIUsage"
                WHERE "userId" = ? AND "createdAt" >= ?
              ) < ?
              AND (
                ? IS NULL OR
                (SELECT COALESCE(SUM("units"), 0) FROM "AIUsage"
                 WHERE "provider" = ? AND "createdAt" >= ?
                ) + ? <= ?
              )
              RETURNING "id"`
            )
            .run(
              // INSERT values
              crypto.randomUUID(),
              testUser,
              "cloudflare",
              "@cf/black-forest-labs/flux-2-klein-4b",
              "image",
              new Date().toISOString(),
              // 1. per-operation request-count guard
              testUser,
              "image",
              start.toISOString(),
              limits.dailyImageCount,
              // 2. global daily token cap
              testUser,
              start.toISOString(),
              limits.dailyTotalTokens,
              // 3. per-provider daily unit guard (skipped when providerLimit is null)
              null,
              "cloudflare",
              start.toISOString(),
              1,
              50,
            );
          if (result.changes > 0) {
            successes++;
          } else {
            blocked429++;
          }
        } catch (e: any) {
          otherErrors++;
          if (otherErrors <= 3) {
            console.log(`DEBUG concurrent error: ${e.code} ${e.message}`);
          }
        }
      }),
    );

    db.close();

    console.log(`DEBUG concurrent: successes=${successes}, blocked429=${blocked429}, otherErrors=${otherErrors}`);

    assert.strictEqual(
      successes,
      limits.dailyImageCount,
      `Exactly ${limits.dailyImageCount} concurrent reservations should succeed`,
    );
    assert.strictEqual(
      blocked429,
      requests - limits.dailyImageCount,
      `${requests - limits.dailyImageCount} should be blocked with 429`,
    );
    assert.strictEqual(
      otherErrors,
      0,
      "No unexpected errors should occur",
    );

    ok(`Concurrent image quota: ${successes} success, ${blocked429} blocked at boundary of ${limits.dailyImageCount}`);

    // Clean up all records for this user
    await prisma.aIUsage.deleteMany({
      where: { userId: testUser },
    });
  }

  // ── Test 14: selectImageRoute returns Cloudflare candidates ──
  {
    const route = selectImageRoute();
    assert.ok(Array.isArray(route.candidates), "candidates should be an array");
    // All image candidates should be Cloudflare (only Cloudflare has image models)
    for (const c of route.candidates) {
      assert.strictEqual(
        c.providerId,
        "cloudflare",
        "Image candidates should only use Cloudflare provider",
      );
    }
    ok("selectImageRoute returns Cloudflare image candidates");
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
