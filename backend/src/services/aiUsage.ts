import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/errors.js";

function envInt(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

/**
 * Daily limits for the AI Workspace. All limits are conservative local guards
 * so that no provider can ever generate unexpected charges. Every provider is
 * free-only; limits are enforced per-provider and globally.
 */
export function getAILimits() {
  return {
    dailyChatRequests: envInt("AI_DAILY_CHAT_REQUESTS", 50),
    /** Max generated images per day (requirement: up to 50). */
    dailyImageCount: envInt("AI_DAILY_IMAGE_COUNT", 50),
    dailyTotalTokens: envInt("AI_DAILY_TOTAL_TOKENS", 200_000),
    /** Per-provider daily unit (neuron/credit) guards. */
    dailyCloudflareQuotaUnits: envInt("AI_CLOUDFLARE_DAILY_QUOTA_UNITS", 9_000),
    dailyNVIDIACredits: envInt("AI_NVIDIA_DAILY_CREDITS", 1_000),
  };
}

export function utcDayStart(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export type ReserveAIUsageInput = {
  userId: string;
  provider: string;
  model: string;
  operation: "chat" | "image";
  estimatedUnits?: number;
};

export async function reserveAIUsage(input: ReserveAIUsageInput) {
  const limits = getAILimits();
  const start = utcDayStart();
  const estimatedUnits = Math.max(0, Math.floor(input.estimatedUnits || 0));

  return prisma.$transaction(async (tx) => {
    // Global daily request count for this operation type.
    const operationAggregate = await tx.aIUsage.aggregate({
      where: {
        userId: input.userId,
        operation: input.operation,
        createdAt: { gte: start },
      },
      _count: { _all: true },
    });

    const requestLimit =
      input.operation === "chat"
        ? limits.dailyChatRequests
        : limits.dailyImageCount;
    if (operationAggregate._count._all >= requestLimit) {
      throw new HttpError(
        429,
        input.operation === "chat"
          ? "سقف درخواست‌های گفتگوی امروز تکمیل شده است."
          : "سقف تولید تصاویر روزانه تکمیل شده است.",
        { limit: requestLimit, window: "utc-day" },
      );
    }

    // Global daily token cap.
    const tokenAggregate = await tx.aIUsage.aggregate({
      where: { userId: input.userId, createdAt: { gte: start } },
      _sum: { totalTokens: true },
    });
    const usedTokens = tokenAggregate._sum.totalTokens || 0;
    if (usedTokens >= limits.dailyTotalTokens) {
      throw new HttpError(
        429,
        "سقف توکن روزانهٔ فضای کاری هوش مصنوعی تکمیل شده است.",
        { limit: limits.dailyTotalTokens, used: usedTokens, window: "utc-day" },
      );
    }

    // Per-provider daily unit guard (quota-aware: skip provider at its limit).
    const providerAggregate = await tx.aIUsage.aggregate({
      where: {
        provider: input.provider,
        createdAt: { gte: start },
      },
      _sum: { units: true },
    });
    const usedUnits = providerAggregate._sum.units || 0;
    const providerLimit =
      input.provider === "cloudflare"
        ? limits.dailyCloudflareQuotaUnits
        : input.provider === "nvidia"
          ? limits.dailyNVIDIACredits
          : Infinity;
    if (
      providerLimit !== Infinity &&
      usedUnits + estimatedUnits > providerLimit
    ) {
      throw new HttpError(
        429,
        input.provider === "cloudflare"
          ? "بودجهٔ محافظه‌کارانهٔ روزانهٔ Cloudflare تکمیل شده است."
          : input.provider === "nvidia"
            ? "سقف اعتبار روزانهٔ NVIDIA NIM تکمیل شده است."
            : "سقف اعتبار روزانهٔ ارائه‌دهنده تکمیل شده است.",
        {
          provider: input.provider,
          limit: providerLimit,
          used: usedUnits,
          reserved: estimatedUnits,
          window: "utc-day",
        },
      );
    }

    return tx.aIUsage.create({
      data: {
        userId: input.userId,
        provider: input.provider,
        model: input.model,
        operation: input.operation,
        status: "pending",
        units: estimatedUnits,
      },
    });
  });
}

export async function completeAIUsage(
  id: string,
  input: {
    status: "success" | "error" | "aborted";
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    units?: number;
    errorCode?: string;
  },
) {
  await prisma.aIUsage.updateMany({
    where: { id },
    data: {
      status: input.status,
      inputTokens: Math.max(0, Math.floor(input.inputTokens || 0)),
      outputTokens: Math.max(0, Math.floor(input.outputTokens || 0)),
      totalTokens: Math.max(0, Math.floor(input.totalTokens || 0)),
      units: Math.max(0, Math.floor(input.units || 0)),
      errorCode: input.errorCode || null,
    },
  });
}

export async function getAIUsageSummary(userId: string) {
  const start = utcDayStart();
  const limits = getAILimits();
  const rows = await prisma.aIUsage.findMany({
    where: { userId, createdAt: { gte: start } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const chatRequests = rows.filter(
    (row) => row.operation === "chat" && row.status !== "error",
  ).length;
  const imageRequests = rows.filter(
    (row) => row.operation === "image" && row.status !== "error",
  ).length;
  const totalTokens = rows.reduce((sum, row) => sum + row.totalTokens, 0);
  const providerUnits: Record<string, number> = {};
  for (const row of rows) {
    providerUnits[row.provider] = (providerUnits[row.provider] || 0) + (row.units || 0);
  }

  return {
    window: {
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      timezone: "UTC",
    },
    limits: {
      chatRequests: limits.dailyChatRequests,
      imageCount: limits.dailyImageCount,
      totalTokens: limits.dailyTotalTokens,
      cloudflareQuotaUnits: limits.dailyCloudflareQuotaUnits,
      nvidiaCredits: limits.dailyNVIDIACredits,
    },
    used: {
      chatRequests,
      imageRequests,
      totalTokens,
      providerUnits,
    },
    recent: rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      model: row.model,
      operation: row.operation,
      status: row.status,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      totalTokens: row.totalTokens,
      quotaUnits: row.units,
      errorCode: row.errorCode,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

/**
 * Per-provider usage for the current UTC day — used by the routing layer to
 * skip providers that have exhausted their free-tier quota.
 */
export async function getProviderUsageToday() {
  const start = utcDayStart();
  const rows = await prisma.aIUsage.groupBy({
    by: ["provider"],
    where: { createdAt: { gte: start } },
    _sum: { units: true },
    _count: { _all: true },
  });
  const limits = getAILimits();
  const providerLimit = (provider: string) =>
    provider === "cloudflare"
      ? limits.dailyCloudflareQuotaUnits
      : provider === "nvidia"
        ? limits.dailyNVIDIACredits
        : Infinity;
  return rows.map((row) => ({
    provider: row.provider,
    units: row._sum.units || 0,
    requests: row._count._all,
    limit: providerLimit(row.provider),
    exceeded:
      providerLimit(row.provider) !== Infinity &&
      (row._sum.units || 0) >= providerLimit(row.provider),
  }));
}
