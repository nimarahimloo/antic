# AI Workspace Provider Setup Guide

This document describes how to configure each free AI provider for the
Pardeh Antic AI Workspace. All providers are free-tier only — no credit
card, billing upgrade, or paid infrastructure is required or authorized.

## Provider Priority Order

The routing layer (`backend/src/services/aiRouting.ts`) selects providers
in this priority order for automatic mode:

1. **NVIDIA NIM** (priority #1 — first-class provider)
2. **Cloudflare Workers AI** (operational primary)
3. **Google Gemini** (free tier, explicit opt-in)
4. **OpenRouter** (free models only, explicit opt-in)

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
NVIDIA_API_KEY=nvapi-your-key-here
AI_ENABLE_NVIDIA=true
AI_NVIDIA_DAILY_CREDITS=1000
```

**Free tier:** ~1,000 credits/month, ~40 RPM rate limit. No credit card
required. Models include `nemotron-3-super-120b-a12b` (tool-calling),
`nemotron-3.5-lightning-30b-a3b`, `mistral-nemotron` (function calling),
`llama-3.1-8b-instruct`.

**API endpoint:** `https://integrate.api.nvidia.com/v1` (OpenAI-compatible)

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

**Free tier:** 10,000 neurons/day (shared across all Cloudflare users on
the free tier). The local guard is set to 10,000 to prevent exceeding
the actual free-tier budget.

**API endpoint:** `https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1`

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

The routing configuration (`CHAT_PROVIDER_PRIORITY` in
`backend/src/services/aiRouting.ts`) explicitly lists only free-tier
providers: `["nvidia", "cloudflare", "google", "openrouter"]`. No paid
providers (Anthropic, Cohere, etc.) are registered. When no free
provider is available, the system returns HTTP 503 and fails safely —
it never silently activates a paid service.

---

## Verifying Actual Free-Tier Eligibility

Before adding a provider key to `backend/.env`:
1. Confirm the provider's free tier does not require a credit card
2. Confirm the provider's API endpoint is publicly documented
3. Add the key to `backend/.env` (never commit it)
4. Set `AI_ENABLE_<PROVIDER>=true`
5. Restart the backend: `cd backend && npm run start`
6. Verify the provider appears as "configured" in `/api/ai/providers`

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Provider shows "not configured" | Missing API key or `AI_ENABLE_*` not set | Add key and env flag to `backend/.env` |
| HTTP 429 from provider | Daily quota exhausted | Wait for UTC day reset or use another provider |
| HTTP 402 from provider | Credits exhausted (NVIDIA) | Request more credits via NVIDIA developer forum |
| Circuit breaker open | 3 consecutive failures | Wait 5-minute cooldown for auto-recovery |
| No providers available | All providers unconfigured or exhausted | Add at least one provider key |
