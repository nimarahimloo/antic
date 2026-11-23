import type { LanguageModel } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { HttpError } from "../lib/errors.js";

export type AIProviderId = "cloudflare" | "google" | "nvidia" | "openrouter";

export type AIModelInfo = {
  id: string;
  label: string;
  supportsTools: boolean;
  /** Workers AI neuron rates per one million tokens. */
  inputNeuronsPerMillion?: number;
  outputNeuronsPerMillion?: number;
};

export type AIImageModelInfo = {
  id: string;
  label: string;
  supportsReferences: boolean;
  maxReferences: number;
};

export type AIProviderInfo = {
  id: AIProviderId;
  label: string;
  configured: boolean;
  configurationMessage: string;
  models: AIModelInfo[];
  imageModels: AIImageModelInfo[];
};

const CLOUDFLARE_MODELS: AIModelInfo[] = [
  {
    id: "@cf/zai-org/glm-4.7-flash",
    label: "GLM 4.7 Flash",
    supportsTools: true,
    inputNeuronsPerMillion: 5_500,
    outputNeuronsPerMillion: 36_400,
  },
  {
    id: "@cf/openai/gpt-oss-20b",
    label: "GPT-OSS 20B",
    supportsTools: true,
    inputNeuronsPerMillion: 18_182,
    outputNeuronsPerMillion: 27_273,
  },
  {
    id: "@cf/openai/gpt-oss-120b",
    label: "GPT-OSS 120B",
    supportsTools: true,
    inputNeuronsPerMillion: 31_818,
    outputNeuronsPerMillion: 68_182,
  },
];

const GOOGLE_MODELS: AIModelInfo[] = [
  {
    id: "gemini-4-hydrogen",
    label: "Gemini 4 Hydrogen",
    supportsTools: true,
  },
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    supportsTools: true,
  },
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    supportsTools: true,
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash Lite",
    supportsTools: true,
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    supportsTools: true,
  },
];

// OpenRouter's free catalogue changes frequently. Keep an explicit allowlist so
// a paid model can never be selected by accident.
const OPENROUTER_MODELS: AIModelInfo[] = [
  {
    id: "google/gemma-4-26b-a4b-it:free",
    label: "Gemma 4 26B (Free)",
    supportsTools: true,
  },
  {
    id: "liquid/lfm-3-1.7b:free",
    label: "LFM 3 1.7B (Free)",
    supportsTools: true,
  },
  {
    id: "baidu/ernie-5.5-flash-preview:free",
    label: "ERNIE 5.5 Flash (Free)",
    supportsTools: true,
  },
];

// NVIDIA NIM — hosted, OpenAI-compatible inference on DGX Cloud.
// All models below are verified free endpoints on build.nvidia.com (as of
// 2026-11-23). Model IDs are taken from the live catalog at
// https://integrate.api.nvidia.com/v1/models and cross-checked against the
// free-endpoint list at https://build.nvidia.com/models.
//
// Verified working chat models:
//   nvidia/nemotron-3-super-120b-a12b  — tool-calling, reasoning (verified)
//   nvidia/nemotron-3.5-lightning-30b-a3b — fast MoE (verified)
//   nvidia/nemotron-3-ultra-550b-a55b  — largest Nemotron (verified)
//   nvidia/nemotron-3.5-bolt-e4b       — compact agentic (verified free)
//   openai/gpt-oss-20b                 — open-source GPT-OSS (verified free)
//
// NOT included (not confirmed as free/working on live /v1/models):
//   mistralai/mistral-nemotron         — dropped from free list 2026-09-28
//   meta/llama-3.1-8b-instruct         — not in live /v1/models list
const NVIDIA_MODELS: AIModelInfo[] = [
  {
    id: "nvidia/nemotron-3-super-120b-a12b",
    label: "Nemotron 3.5 Super 120B (NVIDIA Free)",
    supportsTools: true,
  },
  {
    id: "nvidia/nemotron-3.5-lightning-30b-a3b",
    label: "Nemotron 3.5 Lightning 30B (NVIDIA Free)",
    supportsTools: true,
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b",
    label: "Nemotron 3 Ultra 550B (NVIDIA Free)",
    supportsTools: true,
  },
  {
    id: "nvidia/nemotron-3.5-bolt-e4b",
    label: "Nemotron 3.5 Bolt E4B (NVIDIA Free)",
    supportsTools: true,
  },
  {
    id: "openai/gpt-oss-20b",
    label: "GPT-OSS 20B (NVIDIA Free)",
    supportsTools: true,
  },
];

const CLOUDFLARE_IMAGE_MODELS: AIImageModelInfo[] = [
  {
    id: "@cf/black-forest-labs/flux-2-klein-4b",
    label: "FLUX.2 Klein 4B",
    supportsReferences: true,
    maxReferences: 4,
  },
  {
    id: "@cf/black-forest-labs/flux-2-klein-9b",
    label: "FLUX.2 Klein 9B",
    supportsReferences: true,
    maxReferences: 4,
  },
  {
    id: "@cf/black-forest-labs/flux-2-dev",
    label: "FLUX.2 Dev",
    supportsReferences: true,
    maxReferences: 4,
  },
];

function enabled(name: string, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value.trim().toLowerCase() === "true" || value === "1";
}

function cloudflareCredentials() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  return { accountId, apiToken };
}

function googleApiKey() {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
}

function openRouterApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim();
}

function nvidiaApiKey() {
  return process.env.NVIDIA_API_KEY?.trim();
}

export function isCloudflareConfigured() {
  const { accountId, apiToken } = cloudflareCredentials();
  return enabled("AI_ENABLE_CLOUDFLARE", true) && Boolean(accountId && apiToken);
}

export function isGoogleConfigured() {
  return enabled("AI_ENABLE_GOOGLE") && Boolean(googleApiKey());
}

export function isNVIDIAConfigured() {
  return enabled("AI_ENABLE_NVIDIA", true) && Boolean(nvidiaApiKey());
}

export function isOpenRouterConfigured() {
  return enabled("AI_ENABLE_OPENROUTER") && Boolean(openRouterApiKey());
}

export function listAIProviders(): AIProviderInfo[] {
  const { accountId, apiToken } = cloudflareCredentials();
  const cloudflareReady = isCloudflareConfigured();
  const googleReady = isGoogleConfigured();
  const nvidiaReady = isNVIDIAConfigured();
  const openRouterReady = isOpenRouterConfigured();

  return [
    {
      id: "cloudflare",
      label: "Cloudflare Workers AI",
      configured: cloudflareReady,
      configurationMessage: cloudflareReady
        ? "متصل — سهمیهٔ روزانهٔ Workers AI فعال است."
        : !accountId || !apiToken
          ? "برای فعال‌سازی CLOUDFLARE_ACCOUNT_ID و CLOUDFLARE_API_TOKEN را در backend تنظیم کنید."
          : "Cloudflare با AI_ENABLE_CLOUDFLARE=false غیرفعال شده است.",
      models: CLOUDFLARE_MODELS,
      imageModels: cloudflareReady ? CLOUDFLARE_IMAGE_MODELS : [],
    },
    {
      id: "google",
      label: "Google Gemini (Free)",
      configured: googleReady,
      configurationMessage: googleReady
        ? "متصل — فقط مدل‌های Free مجاز هستند."
        : !googleApiKey()
          ? "GOOGLE_GENERATIVE_AI_API_KEY تنظیم نشده است."
          : "برای فعال‌سازی AI_ENABLE_GOOGLE=true را تنظیم کنید.",
      models: GOOGLE_MODELS,
      imageModels: [],
    },
    {
      id: "nvidia",
      label: "NVIDIA NIM (Free)",
      configured: nvidiaReady,
      configurationMessage: nvidiaReady
        ? "متصل — سهمیهٔ رایگان NVIDIA NIM فعال است (بدون کارت بانکی)."
        : !nvidiaApiKey()
          ? "NVIDIA_API_KEY تنظیم نشده است. کلید را از build.nvidia.com/settings دریافت کنید."
          : "NVIDIA با AI_ENABLE_NVIDIA=false غیرفعال شده است.",
      models: NVIDIA_MODELS,
      imageModels: [],
    },
    {
      id: "openrouter",
      label: "OpenRouter (Free)",
      configured: openRouterReady,
      configurationMessage: openRouterReady
        ? "متصل — فقط مدل‌های :free مجاز هستند."
        : !openRouterApiKey()
          ? "OPENROUTER_API_KEY تنظیم نشده است."
          : "برای فعال‌سازی AI_ENABLE_OPENROUTER=true را تنظیم کنید.",
      models: OPENROUTER_MODELS,
      imageModels: [],
    },
  ];
}

function providerInfo(id: AIProviderId) {
  const info = listAIProviders().find((item) => item.id === id);
  if (!info) throw new HttpError(400, "ارائه‌دهندهٔ هوش مصنوعی نامعتبر است.");
  return info;
}

export function getAIModelInfo(providerId: AIProviderId, modelId?: string): AIModelInfo {
  const provider = providerInfo(providerId);
  if (!provider.configured) {
    throw new HttpError(503, provider.configurationMessage);
  }
  const model = provider.models.find((item) => item.id === modelId);
  if (!model) {
    throw new HttpError(400, "مدل انتخاب‌شده برای این ارائه‌دهنده معتبر نیست.");
  }
  return model;
}

export function getAIImageModelInfo(modelId?: string): AIImageModelInfo {
  const provider = providerInfo("cloudflare");
  if (!provider.configured) {
    throw new HttpError(503, provider.configurationMessage);
  }
  const model = provider.imageModels.find((item) => item.id === modelId);
  if (!model) {
    throw new HttpError(400, "مدل تولید تصویر انتخاب‌شده معتبر نیست.");
  }
  return model;
}

export function getChatModel(providerId: AIProviderId, modelId: string): LanguageModel {
  getAIModelInfo(providerId, modelId);

  if (providerId === "cloudflare") {
    const { accountId, apiToken } = cloudflareCredentials();
    if (!accountId || !apiToken) {
      throw new HttpError(503, "تنظیمات Cloudflare Workers AI کامل نیست.");
    }
    const baseURL =
      process.env.CLOUDFLARE_AI_BASE_URL?.replace(/\/$/, "") ||
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
    const provider = createOpenAICompatible({
      name: "cloudflare-workers-ai",
      baseURL,
      apiKey: apiToken,
      includeUsage: true,
    });
    return provider(modelId);
  }

  if (providerId === "google") {
    const apiKey = googleApiKey();
    if (!apiKey) throw new HttpError(503, "کلید Google Gemini تنظیم نشده است.");
    const provider = createGoogle({ apiKey });
    return provider(modelId);
  }

  if (providerId === "nvidia") {
    const apiKey = nvidiaApiKey();
    if (!apiKey) throw new HttpError(503, "کلید NVIDIA API تنظیم نشده است.");
    const provider = createOpenAICompatible({
      name: "nvidia-nim",
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey,
      includeUsage: true,
    });
    return provider(modelId);
  }

  const apiKey = openRouterApiKey();
  if (!apiKey) throw new HttpError(503, "کلید OpenRouter تنظیم نشده است.");
  const provider = createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    includeUsage: true,
    headers: {
      "X-Title": "Pardeh Antic AI Workspace",
      ...(process.env.PUBLIC_BASE_URL
        ? { "HTTP-Referer": process.env.PUBLIC_BASE_URL }
        : {}),
    },
  });
  return provider(modelId);
}

export function getDefaultChatModel(providerId: AIProviderId = "cloudflare") {
  const provider = providerInfo(providerId);
  // GLM-4.7-Flash has been verified against Workers AI's OpenAI-compatible
  // endpoint: it returns function tool_calls and uses the lower neuron budget.
  // Keep the larger GPT-OSS models available as explicit user selections.
  return provider.models.find((m) => m.id === "@cf/zai-org/glm-4.7-flash")?.id ?? provider.models[0]?.id ?? "";
}

export function getDefaultImageModel() {
  return CLOUDFLARE_IMAGE_MODELS[0].id;
}

export function estimateChatNeurons(
  providerId: AIProviderId,
  modelId: string,
  inputTokens: number,
  outputTokens: number,
) {
  if (providerId !== "cloudflare") {
    // Non-Cloudflare providers (NVIDIA, Google, OpenRouter) do not report
    // neuron usage through this SDK. Return 0 units: their usage is tracked
    // purely by request count (dailyChatRequests / dailyImageCount), never by
    // invented credit amounts. Unknown consumption must never be treated as
    // measured usage.
    return 0;
  }
  const model = CLOUDFLARE_MODELS.find((item) => item.id === modelId);
  if (!model?.inputNeuronsPerMillion || !model.outputNeuronsPerMillion) return 0;
  return Math.max(
    1,
    Math.ceil(
      (inputTokens * model.inputNeuronsPerMillion +
        outputTokens * model.outputNeuronsPerMillion) /
        1_000_000,
    ),
  );
}
