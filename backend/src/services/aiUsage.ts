import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/errors.js";

function envInt(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

export function getAILimits() {
  return {
    dailyChatRequests: envInt("AI_DAILY_CHAT_REQUESTS", 50),
    dailyImageRequests: envInt("AI_DAILY_IMAGE_REQUESTS", 10),
    dailyTotalTokens: envInt("AI_DAILY_TOTAL_TOKENS", 200_000),
    dailyCloudflareQuotaUnits: envInt("AI_CLOUDFLARE_DAILY_QUOTA_UNITS", 9_000),
  };
}

export function utcDayStart(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export async function reserveAIUsage(input: {
  userId: string;
  provider: string;
  model: string;
  operation: "chat" | "image";
  estimatedUnits?: number;
}) {
  const limits = getAILimits();
  const start = utcDayStart();
  const estimatedUnits = Math.max(0, Math.floor(input.estimatedUnits || 0));

  return prisma.$transaction(async (tx) => {
    const operationAggregate = await tx.aIUsage.aggregate({
      where: {
        userId: input.userId,
        operation: input.operation,
        createdAt: { gte: start },
      },
      _count: { _all: true },
    });
    const tokenAggregate = await tx.aIUsage.aggregate({
      where: { userId: input.userId, createdAt: { gte: start } },
      _sum: { totalTokens: true },
    });
    const providerAggregate = await tx.aIUsage.aggregate({
      where: { provider: "cloudflare", createdAt: { gte: start } },
      _sum: { units: true },
    });

    const requestLimit =
      input.operation === "chat"
        ? limits.dailyChatRequests
        : limits.dailyImageRequests;
    if (operationAggregate._count._all >= requestLimit) {
      throw new HttpError(
        429,
        input.operation === "chat"
          ? "سقف درخواست‌های گفتگوی امروز تکمیل شده است."
          : "سقف درخواست‌های تصویر امروز تکمیل شده است.",
        { limit: requestLimit, window: "utc-day" },
      );
    }

    const usedTokens = tokenAggregate._sum.totalTokens || 0;
    if (usedTokens >= limits.dailyTotalTokens) {
      throw new HttpError(
        429,
        "سقف توکن روزانهٔ فضای کاری هوش مصنوعی تکمیل شده است.",
        { limit: limits.dailyTotalTokens, used: usedTokens, window: "utc-day" },
      );
    }

    const usedQuotaUnits = providerAggregate._sum.units || 0;
    if (
      input.provider === "cloudflare" &&
      usedQuotaUnits + estimatedUnits > limits.dailyCloudflareQuotaUnits
    ) {
      throw new HttpError(
        429,
        "بودجهٔ محافظه‌کارانهٔ روزانهٔ Cloudflare تکمیل شده است.",
        {
          limit: limits.dailyCloudflareQuotaUnits,
          used: usedQuotaUnits,
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
  const providerUnits = rows
    .filter((row) => row.provider === "cloudflare")
    .reduce((sum, row) => sum + row.units, 0);

  return {
    window: {
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      timezone: "UTC",
    },
    limits: {
      chatRequests: limits.dailyChatRequests,
      imageRequests: limits.dailyImageRequests,
      totalTokens: limits.dailyTotalTokens,
      cloudflareQuotaUnits: limits.dailyCloudflareQuotaUnits,
    },
    used: {
      chatRequests,
      imageRequests,
      totalTokens,
      cloudflareQuotaUnits: providerUnits,
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
