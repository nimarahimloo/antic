# AI Workspace Provider Setup Guide

This document describes explicit, fail-closed setup for AI providers in the
Pardeh Antic AI Workspace. Provider credentials and free-tier eligibility are
account-specific and can change. No paid inference is authorized. All providers
default to disabled and must be explicitly enabled only after current quotas
and billing terms have been checked.

## Provider Priority Order

The routing layer (`backend/src/services/aiRouting.ts`) currently selects
configured providers in this code-defined order for automatic mode:

1. **Cloudflare Workers AI**
2. **NVIDIA NIM**
3. **Google Gemini** (explicit opt-in)
4. **OpenRouter** (free-model allowlist, explicit opt-in)

The live Cloudflare Gateway `nvidia-m` has multiprovider enabled and its
dedicated Secrets Store attached. Provider-key configurations are still empty. The live Gateway reports
`workers_ai_billing_mode=postpaid`, which bills Workers AI directly to the
Cloudflare account. Keep Cloudflare inference disabled unless the account's
plan and spend exposure have been explicitly reviewed. BYOK-only does not
change Workers AI billing. Until each adapter is migrated to Gateway transport
and its BYOK key is configured, Google/NVIDIA/OpenRouter requests continue to
use their existing direct backend adapters; do not describe those requests as
Gateway-routed.

When the primary provider reaches quota, is unhealthy, or times out, the
system automatically fails over to the next configured provider without
user intervention. Circuit breakers trip after 3 consecutive failures and
auto-recover after a 5-minute cooldown.

---

## 1. NVIDIA NIM (Priority #1)

**Dashboard:** https://build.nvidia.com/settings/api-keys

**Steps:**
1. Sign in to the NVIDIA Developer Program (free, no credit card)
2. Navigate to https://build.nvidia.com/settings/api-keys
3. Click "Generate Key" to create a new API key (starts with `nvapi-`)
4. Copy the key (shown only once)

**Environment variables** (`backend/.env`):
```env
NVIDIA_API_KEY=your-nvidia-api-key
AI_ENABLE_NVIDIA=true
```

**Free tier and model availability:** quotas and available models can change
by account and date. The Workspace exposes only the NVIDIA model IDs currently
listed in `backend/src/services/aiProviders.ts`; verify the live NVIDIA
dashboard and current quota before relying on a model or quota figure.

**Current API endpoint:** `https://integrate.api.nvidia.com/v1` (OpenAI-compatible).
This is the existing direct adapter endpoint; migration to Cloudflare Gateway
is a separate pending integration step.

---

## 2. Cloudflare Workers AI

**Dashboard:** https://dash.cloudflare.com/ (Workers AI section)

**Steps:**
1. Log in to Cloudflare dashboard
2. Navigate to Workers AI
3. Create an API token with "Workers AI - Edit" and "Workers AI - Read" permissions
4. Copy Account ID and API Token

**Environment variables** (`backend/.env`):
```env
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
AI_ENABLE_CLOUDFLARE=true
AI_CLOUDFLARE_DAILY_QUOTA_UNITS=10000
```

**Billing safety:** the connected Gateway is configured as `postpaid`.
Cloudflare documents 10,000 neurons/day in the Workers AI Free allocation;
Workers Paid charges for usage above that allocation. Because the connected
account's Workers plan and effective postpaid exposure have not been confirmed
here, leave `AI_ENABLE_CLOUDFLARE=false` until reviewed. The local quota
guard is approximate and is not a billing cap. See the
[official pricing page](https://developers.cloudflare.com/workers-ai/platform/pricing/).

**API endpoint:** `https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1`.

The existing Gateway `nvidia-m` is configured with
`multiprovider_enabled=true`, `byok_only=true`, and the dedicated
Secrets Store `ai-gateway-provider-keys`. No provider keys are stored yet.
The Gateway remains fail-closed for third-party requests without customer
credentials.

---

## 3. Google Gemini (Free Tier)

**Dashboard:** https://aistudio.google.com/app/apikey

**Steps:**
1. Sign in to Google AI Studio
2. Navigate to https://aistudio.google.com/app/apikey
3. Click "Create API key"
4. Copy the key

**Environment variables** (`backend/.env`):
```env
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key
AI_ENABLE_GOOGLE=true
```

**Free tier:** Rate-limited free tier. No credit card required for
free tier access. Only models explicitly listed in
`backend/src/services/aiProviders.ts` (`GOOGLE_MODELS`) are allowed —
no paid models can be selected.

---

## 4. OpenRouter (Free Models Only)

**Dashboard:** https://openrouter.ai/settings/keys

**Steps:**
1. Sign in to OpenRouter
2. Navigate to https://openrouter.ai/settings/keys
3. Click "Create Key"
4. Copy the key

**Environment variables** (`backend/.env`):
```env
OPENROUTER_API_KEY=your-api-key
AI_ENABLE_OPENROUTER=true
```

**Free tier:** Rate-limited free tier. Only models explicitly listed in
`backend/src/services/aiProviders.ts` (`OPENROUTER_MODELS`, all with
`:free` suffix) are allowed — no paid models can be selected.

---

## No Paid Fallback

Cloudflare Workers AI is not treated as cost-free merely because it has a
daily free allocation: the connected Gateway is set to `postpaid`. Keep it
disabled until its billing mode and account plan are verified. NVIDIA, Gemini,
and OpenRouter also remain disabled by default; an allowlisted model name does
not guarantee that a particular account has free quota.

The routing configuration (`CHAT_PROVIDER_PRIORITY` in
`backend/src/services/aiRouting.ts`) explicitly lists only free-tier
providers: `["nvidia", "cloudflare", "google", "openrouter"]`. No paid
providers (Anthropic, Cohere, etc.) are registered. When no explicitly enabled and configured provider is available, the system
returns HTTP 503 and fails safely —
it never silently activates a paid service.

---

## Verifying Actual Free-Tier Eligibility

Before enabling a provider:
1. Verify the provider's current quota, model availability, and billing terms.
2. Keep its API key in the runtime secret manager, not in Git or a committed env file.
3. For Cloudflare BYOK, store the key under the Gateway's Provider Keys using the
   `default` alias; do not send provider authorization headers from the app.
4. Complete the provider-specific Gateway transport and verify an actual request
   before claiming that provider is Gateway-routed.
5. Set `AI_ENABLE_<PROVIDER>=true` only after the runtime secret is present,
   the current free quota is confirmed, and billing exposure is acceptable.
6. Verify `/api/ai/providers` and run a real, low-risk smoke test.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Provider shows "not configured" | Missing API key or `AI_ENABLE_*` not set | Add key and env flag to `backend/.env` |
| HTTP 429 from provider | Daily quota exhausted | Wait for UTC day reset or use another provider |
| HTTP 402 from provider | Credits exhausted (NVIDIA) | Request more credits via NVIDIA developer forum |
| Circuit breaker open | 3 consecutive failures | Wait 5-minute cooldown for auto-recovery |
| No providers available | All providers unconfigured or exhausted | Add at least one provider key |
