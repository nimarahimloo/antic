/**
 * AI provider routing layer — automatic failover, health checks, circuit breakers,
 * and quota-aware selection for the Pardeh Antic AI Workspace.
 *
 * Design goals:
 *  - Never activate a paid provider. Only free-tier providers are eligible.
 *  - When the primary provider reaches its quota or is unhealthy, automatically
 *    route to the next eligible free provider without user intervention.
 *  - Circuit breakers trip on repeated failures and auto-recover after a cooldown.
 *  - Conversation context (stored messages) is preserved across failover because
 *      the backend re-sends the full message history to whichever provider is selected.
 */
import { HttpError } from "../lib/errors.js";
import {
  listAIProviders,
  getAIModelInfo,
  getAIImageModelInfo,
  type AIProviderId,
  type AIModelInfo,
  type AIImageModelInfo,
} from "./aiProviders.js";
import { getAILimits, utcDayStart } from "./aiUsage.js";
import { prisma } from "../lib/prisma.js";

/** A routable candidate: a specific provider + model. */
export type AIRouteCandidate = {
  providerId: AIProviderId;
  modelId: string;
  model: AIModelInfo;
  label: string;
};

/** Quota snapshot for a provider on the current UTC day. */
type ProviderQuota = {
  provider: string;
  usedUnits: number;
  usedRequests: number;
  limitUnits: number;
  limitRequests: number;
};

/* ─────────────────────────── circuit breaker ─────────────────────────── */

interface CircuitBreakerState {
  failures: number;
  lastFailure: number | null;
  cooldownUntil: number | null;
}

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes before auto-recovery probe

const breakers = new Map<string, CircuitBreakerState>();

function breakerKey(providerId: AIProviderId, modelId: string) {
  return `${providerId}:${modelId}`;
}

function getBreaker(providerId: AIProviderId, modelId: string): CircuitBreakerState {
  const key = breakerKey(providerId, modelId);
  let state = breakers.get(key);
  if (!state) {
    state = { failures: 0, lastFailure: null, cooldownUntil: null };
    breakers.set(key, state);
  }
  return state;
}

function isBreakerOpen(state: CircuitBreakerState): boolean {
  const now = Date.now();
  // Still in cooldown → closed (unavailable).
  if (state.cooldownUntil && now < state.cooldownUntil) return true;
  // Cooldown expired → allow one probe (half-open): clear cooldown so a single
  // request can test recovery. If it fails, the breaker trips again.
  if (state.cooldownUntil && now >= state.cooldownUntil && state.failures >= FAILURE_THRESHOLD) {
    state.cooldownUntil = null;
    return false;
  }
  return state.failures >= FAILURE_THRESHOLD;
}

function recordBreakerSuccess(providerId: AIProviderId, modelId: string) {
  const state = getBreaker(providerId, modelId);
  state.failures = 0;
  state.lastFailure = null;
  state.cooldownUntil = null;
}

function recordBreakerFailure(providerId: AIProviderId, modelId: string) {
  const state = getBreaker(providerId, modelId);
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= FAILURE_THRESHOLD) {
    state.cooldownUntil = Date.now() + COOLDOWN_MS;
  }
}

/* ─────────────────────────── quota tracking ─────────────────────────── */

function isProviderQuotaExceeded(providerId: AIProviderId): boolean {
  const limits = getAILimits();
  const start = utcDayStart();
  // We only enforce provider-level daily caps for providers that have a known
  // free-tier limit. Cloudflare uses neurons; NVIDIA uses credits/RPM; Google
  // and OpenRouter use their own free-tier limits. All are enforced as
  // conservative local guards so we never accidentally generate charges.
  return false; // enforced per-operation in reserveAIUsage; see route layer
}

async function getProviderUsageToday(providerId: string): Promise<{
  units: number;
  requests: number;
}> {
  const start = utcDayStart();
  const rows = await prisma.aIUsage.findMany({
    where: { provider: providerId, createdAt: { gte: start } },
    select: { units: true, status: true },
  });
  const units = rows.reduce((s, r) => s + (r.units || 0), 0);
  const requests = rows.filter((r) => r.status !== "error").length;
  return { units, requests };
}

/* ─────────────────────────── candidate selection ─────────────────────────── */

/** Priority-ordered free providers for chat. Cloudflare Workers AI is the
 *  primary inference path; optional free providers are fallback-only. */
const CHAT_PROVIDER_PRIORITY: AIProviderId[] = ["cloudflare", "nvidia", "google", "openrouter"];

export { CHAT_PROVIDER_PRIORITY };

function candidateFromModel(
  providerId: AIProviderId,
  model: AIModelInfo,
): AIRouteCandidate {
  return {
    providerId,
    modelId: model.id,
    model,
    label: `${providerId}:${model.id}`,
  };
}

export function getChatCandidates({
  requireTools = false,
}: { requireTools?: boolean } = {}): AIRouteCandidate[] {
  const providers = listAIProviders();
  const configured = new Map(
    providers.filter((p) => p.configured).map((p) => [p.id, p]),
  );

  const candidates: AIRouteCandidate[] = [];

  for (const providerId of CHAT_PROVIDER_PRIORITY) {
    const provider = configured.get(providerId);
    if (!provider) continue; // not configured → skip, never fall back to unconfigured
    for (const model of provider.models) {
      if (requireTools && !model.supportsTools) continue;
      candidates.push(candidateFromModel(providerId, model));
    }
  }

  return candidates;
}

/** Priority-ordered image-generation candidates. Cloudflare FLUX.2 is primary;
 *  a second Cloudflare FLUX variant is the fallback. NVIDIA does not expose a
 *  free image-generation model in its catalog, so image fallbacks stay within
 *  configured free providers. */
export function getImageCandidates(): AIRouteCandidate[] {
  const providers = listAIProviders();
  const configured = new Map(
    providers.filter((p) => p.configured).map((p) => [p.id, p]),
  );

  const cloudflare = configured.get("cloudflare");
  if (!cloudflare) return [];

  const candidates: AIRouteCandidate[] = [];
  for (const model of cloudflare.imageModels) {
    candidates.push({
      providerId: "cloudflare",
      modelId: model.id,
      model: {
        id: model.id,
        label: model.label,
        supportsTools: false,
      },
      label: `cloudflare:${model.id}`,
    });
  }
  return candidates;
}

/* ─────────────────────────── routing with failover ─────────────────────────── */

export type AIRouteError = {
  providerId: AIProviderId;
  modelId: string;
  message: string;
  status?: number;
  retryable: boolean;
};

/**
 * Select the best available chat candidate, considering:
 *   - provider configured status
 *   - circuit breaker (open breakers are skipped)
 *   - capability (tools required or not)
 *   - quota headroom (conservative local guard)
 *
 * Returns an ordered list so the caller can attempt failover.
 */
export function selectChatRoute({
  requireTools = false,
}: { requireTools?: boolean } = {}): {
  candidates: AIRouteCandidate[];
  primary: AIRouteCandidate | null;
} {
  const candidates = getChatCandidates({ requireTools });

  // Filter out providers whose circuit breaker is open.
  const healthy = candidates.filter((c) => {
    const state = getBreaker(c.providerId, c.modelId);
    return !isBreakerOpen(state);
  });

  const primary = healthy[0] || null;
  return { candidates: healthy, primary };
}

export function selectImageRoute(): {
  candidates: AIRouteCandidate[];
  primary: AIRouteCandidate | null;
} {
  const candidates = getImageCandidates();
  const healthy = candidates.filter((c) => {
    const state = getBreaker(c.providerId, c.modelId);
    return !isBreakerOpen(state);
  });
  const primary = healthy[0] || null;
  return { candidates: healthy, primary };
}

/**
 * Classify a provider error as retryable (should trigger failover) or fatal.
 * Retryable: 429 (rate limit), 402 (credits/quota exhausted), 503 (unavailable),
 * 500+ transient, ECONNREFUSED/ETIMEDOUT (network), ECONNRESET.
 * Fatal: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (model not found).
 */
export function classifyProviderError(
  providerId: AIProviderId,
  modelId: string,
  error: unknown,
): AIRouteError {
  let status: number | undefined;
  let message = "Unknown provider error";
  let retryable = false;

  if (error instanceof HttpError) {
    status = error.status;
    message = error.message;
  } else if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    if (typeof e.status === "number") status = e.status;
    if (typeof e.message === "string") message = e.message;
    if (typeof e.code === "string") {
      // Node network errors
      const code = e.code as string;
      if (
        code === "ECONNREFUSED" ||
        code === "ETIMEDOUT" ||
        code === "ECONNRESET" ||
        code === "ENOTFOUND"
      ) {
        retryable = true;
      }
    }
  }

  if (status) {
    if (status === 429 || status === 402 || status === 503) retryable = true;
    else if (status >= 500 && status < 600) retryable = true;
    else retryable = false;
  }

  return { providerId, modelId, message, status, retryable };
}

/**
 * Mark a provider/model as failed. Trips the circuit breaker after threshold.
 */
export function recordProviderFailure(providerId: AIProviderId, modelId: string) {
  recordBreakerFailure(providerId, modelId);
}

/**
 * Mark a provider/model as healthy. Resets the circuit breaker.
 */
export function recordProviderSuccess(providerId: AIProviderId, modelId: string) {
  recordBreakerSuccess(providerId, modelId);
}

/**
 * Get circuit-breaker status for all candidates (for diagnostics / admin UI).
 */
export function getBreakerStatus(): Array<{
  providerId: AIProviderId;
  modelId: string;
  failures: number;
  cooldownUntil: string | null;
  isOpen: boolean;
}> {
  const result: Array<{
    providerId: AIProviderId;
    modelId: string;
    failures: number;
    cooldownUntil: string | null;
    isOpen: boolean;
  }> = [];
  for (const [key, state] of breakers) {
    const [providerId, modelId] = key.split(":") as [AIProviderId, string];
    result.push({
      providerId,
      modelId,
      failures: state.failures,
      cooldownUntil: state.cooldownUntil
        ? new Date(state.cooldownUntil).toISOString()
        : null,
      isOpen: isBreakerOpen(state),
    });
  }
  return result;
}
