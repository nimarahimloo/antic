import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/errors.js";

export type MemoryType =
  | "preference"
  | "fact"
  | "project_context"
  | "communication_style"
  | "decision"
  | "correction";

export type AIMemoryRecord = {
  id: string;
  userId: string;
  conversationId: string | null;
  type: MemoryType;
  category: string | null;
  content: string;
  sourceMessageId: string | null;
  confidence: number;
  importance: number;
  expiresAt: Date | null;
  metadataJson: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateMemoryInput = {
  userId: string;
  conversationId?: string | null;
  type: MemoryType;
  category?: string | null;
  content: string;
  sourceMessageId?: string | null;
  confidence?: number;
  importance?: number;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown> | null;
};

export type UpdateMemoryInput = {
  content?: string;
  type?: MemoryType;
  category?: string | null;
  confidence?: number;
  importance?: number;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown> | null;
};

export type MemoryQueryOptions = {
  userId: string;
  type?: MemoryType;
  category?: string;
  conversationId?: string;
  minImportance?: number;
  minConfidence?: number;
  includeExpired?: boolean;
  limit?: number;
  offset?: number;
};

function parseMetadata(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function serializeMemory(memory: AIMemoryRecord) {
  return {
    id: memory.id,
    userId: memory.userId,
    conversationId: memory.conversationId,
    type: memory.type,
    category: memory.category,
    content: memory.content,
    sourceMessageId: memory.sourceMessageId,
    confidence: memory.confidence,
    importance: memory.importance,
    expiresAt: memory.expiresAt?.toISOString() || null,
    metadata: parseMetadata(memory.metadataJson),
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
  };
}

function toMemoryRecord(memory: {
  id: string;
  userId: string;
  conversationId: string | null;
  type: string;
  category: string | null;
  content: string;
  sourceMessageId: string | null;
  confidence: number;
  importance: number;
  expiresAt: Date | null;
  metadataJson: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AIMemoryRecord {
  return {
    ...memory,
    type: memory.type as MemoryType,
  };
}

export async function createMemory(input: CreateMemoryInput): Promise<AIMemoryRecord> {
  const now = new Date();
  if (input.expiresAt && input.expiresAt <= now) {
    throw new HttpError(400, "تاریخ انقضا باید در آینده باشد.");
  }
  if (input.confidence !== undefined && (input.confidence < 0 || input.confidence > 1)) {
    throw new HttpError(400, "اطمینان باید بین ۰ و ۱ باشد.");
  }
  if (input.importance !== undefined && (input.importance < 1 || input.importance > 5)) {
    throw new HttpError(400, "اهمیت باید بین ۱ و ۵ باشد.");
  }

  const created = await prisma.aIMemory.create({
    data: {
      userId: input.userId,
      conversationId: input.conversationId || null,
      type: input.type,
      category: input.category || null,
      content: input.content.trim(),
      sourceMessageId: input.sourceMessageId || null,
      confidence: input.confidence ?? 0.8,
      importance: input.importance ?? 1,
      expiresAt: input.expiresAt || null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
  return toMemoryRecord(created);
}

export async function getMemory(userId: string, id: string): Promise<AIMemoryRecord | null> {
  const memory = await prisma.aIMemory.findFirst({
    where: { id, userId },
  });
  return memory ? toMemoryRecord(memory) : null;
}

export async function updateMemory(userId: string, id: string, input: UpdateMemoryInput): Promise<AIMemoryRecord> {
  const memory = await getMemory(userId, id);
  if (!memory) throw new HttpError(404, " خاطره یافت نشد.");

  const data: Record<string, unknown> = {};
  if (input.content !== undefined) {
    const trimmed = input.content.trim();
    if (!trimmed) throw new HttpError(400, "محتوای خاطره نمی‌تواند خالی باشد.");
    data.content = trimmed;
  }
  if (input.type !== undefined) data.type = input.type;
  if (input.category !== undefined) data.category = input.category;
  if (input.confidence !== undefined) {
    if (input.confidence < 0 || input.confidence > 1) throw new HttpError(400, "اطمینان باید بین ۰ و ۱ باشد.");
    data.confidence = input.confidence;
  }
  if (input.importance !== undefined) {
    if (input.importance < 1 || input.importance > 5) throw new HttpError(400, "اهمیت باید بین ۱ و ۵ باشد.");
    data.importance = input.importance;
  }
  if (input.expiresAt !== undefined) {
    if (input.expiresAt && input.expiresAt <= new Date()) throw new HttpError(400, "تاریخ انقضا باید در آینده باشد.");
    data.expiresAt = input.expiresAt;
  }
  if (input.metadata !== undefined) {
    data.metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;
  }

  const updated = await prisma.aIMemory.update({
    where: { id },
    data,
  });
  return toMemoryRecord(updated);
}

export async function deleteMemory(userId: string, id: string): Promise<void> {
  const memory = await getMemory(userId, id);
  if (!memory) throw new HttpError(404, " خاطره یافت نشد.");
  await prisma.aIMemory.delete({ where: { id } });
}

export async function deleteAllMemories(userId: string): Promise<number> {
  const result = await prisma.aIMemory.deleteMany({ where: { userId } });
  return result.count;
}

export async function listMemories(options: MemoryQueryOptions): Promise<{ memories: ReturnType<typeof serializeMemory>[]; total: number }> {
  const {
    userId,
    type,
    category,
    conversationId,
    minImportance = 1,
    minConfidence = 0,
    includeExpired = false,
    limit = 50,
    offset = 0,
  } = options;

  const where: Record<string, unknown> = { userId };
  if (type) where.type = type;
  if (category) where.category = category;
  if (conversationId) where.conversationId = conversationId;
  where.importance = { gte: minImportance };
  where.confidence = { gte: minConfidence };
  if (!includeExpired) {
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
  }

  const [rows, total] = await Promise.all([
    prisma.aIMemory.findMany({
      where,
      orderBy: [{ importance: "desc" }, { confidence: "desc" }, { createdAt: "desc" }],
      take: Math.min(Math.max(limit, 1), 200),
      skip: Math.max(offset, 0),
    }),
    prisma.aIMemory.count({ where }),
  ]);

  return { memories: rows.map(toMemoryRecord).map(serializeMemory), total };
}

export async function searchMemoriesByContent(userId: string, query: string, options: Partial<MemoryQueryOptions> = {}): Promise<ReturnType<typeof serializeMemory>[]> {
  const searchTerm = query.trim().toLowerCase();
  if (!searchTerm) return [];

  const where: Record<string, unknown> = {
    userId,
    content: { contains: searchTerm },
  };
  if (options.type) where.type = options.type;
  if (options.category) where.category = options.category;
  if (options.conversationId) where.conversationId = options.conversationId;
  where.importance = { gte: options.minImportance ?? 1 };
  where.confidence = { gte: options.minConfidence ?? 0 };
  if (!options.includeExpired) {
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
  }

  const rows = await prisma.aIMemory.findMany({
    where,
    orderBy: [{ importance: "desc" }, { confidence: "desc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(options.limit ?? 20, 1), 100),
  });

  return rows.map(toMemoryRecord).map(serializeMemory);
}

export async function getMemoriesForContext(userId: string, conversationId?: string | null, maxMemories = 10): Promise<ReturnType<typeof serializeMemory>[]> {
  const now = new Date();
  const where: Record<string, unknown> = {
    userId,
    importance: { gte: 2 }, // Only retrieve memories with importance >= 2 for context
    confidence: { gte: 0.6 },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };

  if (conversationId) {
    // Prioritize memories from the current conversation or general memories
    where.OR = [
      { conversationId },
      { conversationId: null },
      ...(where.OR as Array<Record<string, unknown>>),
    ];
  }

  const rows = await prisma.aIMemory.findMany({
    where,
    orderBy: [{ importance: "desc" }, { confidence: "desc" }, { createdAt: "desc" }],
    take: maxMemories,
  });

  return rows.map(toMemoryRecord).map(serializeMemory);
}

export async function findSimilarMemory(userId: string, content: string, type?: MemoryType): Promise<AIMemoryRecord | null> {
  const searchTerm = content.trim().toLowerCase();
  if (!searchTerm) return null;

  const where: Record<string, unknown> = {
    userId,
    content: { contains: searchTerm },
  };
  if (type) where.type = type;

  const memory = await prisma.aIMemory.findFirst({
    where,
    orderBy: [{ confidence: "desc" }, { importance: "desc" }],
  });

  return memory ? toMemoryRecord(memory) : null;
}

export async function upsertMemory(input: CreateMemoryInput & { deduplicate?: boolean }): Promise<AIMemoryRecord> {
  if (input.deduplicate) {
    const existing = await findSimilarMemory(input.userId, input.content, input.type);
    if (existing) {
      // Update existing memory with potentially higher confidence/importance
      const updateData: UpdateMemoryInput = {
        confidence: Math.max(existing.confidence, input.confidence ?? 0.8),
        importance: Math.max(existing.importance, input.importance ?? 1),
      };
      if (input.expiresAt && (!existing.expiresAt || input.expiresAt > existing.expiresAt)) {
        updateData.expiresAt = input.expiresAt;
      }
      if (input.metadata) {
        updateData.metadata = { ...parseMetadata(existing.metadataJson), ...input.metadata };
      }
      return updateMemory(input.userId, existing.id, updateData);
    }
  }
  // Remove deduplicate flag before passing to createMemory
  const { deduplicate, ...createInput } = input;
  return createMemory(createInput);
}

export const MEMORY_TYPES: { value: MemoryType; label: string; description: string }[] = [
  { value: "preference", label: "ترجیحات", description: "تنظیمات و ترجیحات کاربر (مثلا: سبک پرده مورد علاقه، رنگ‌های دلخواه)" },
  { value: "fact", label: "اطلاعات واقعی", description: "حقایق تاییدشده که کاربر به اشتراک گذاشته (مثلا: ابعاد اتاق، بودجه تقریبی)" },
  { value: "project_context", label: "بازه پروژه", description: "اطلاعات مربوط به پروژه‌های در حال انجام یا برنامه‌ریزی شده" },
  { value: "communication_style", label: "سبک ارتباطی", description: "ترجیحات نحوه پاسخ‌دهی (مثلا: کوتاه و فنی، یا توضیحی و آموزشی)" },
  { value: "decision", label: "تصمیم‌ها", description: "تصمیم‌های مهم گرفته شده در گفتگوها" },
  { value: "correction", label: "تصحیحات", description: "اطلاعاتی که کاربر قبلاً اصلاح کرده است" },
];

export const MEMORY_CATEGORIES = [
  "curtain_catalog",
  "shop_accessories",
  "projects",
  "user_preferences",
  "installation",
  "pricing",
  "technical_specs",
  "general",
] as const;