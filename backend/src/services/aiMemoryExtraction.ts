import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { prisma } from "../lib/prisma.js";
import { getChatModel } from "./aiProviders.js";
import {
  createMemory,
  findSimilarMemory,
  type CreateMemoryInput,
  type MemoryType,
} from "./aiMemory.js";

const MEMORY_EXTRACTION_PROMPT = `شما یک سیستم استخراج حافظه برای دستیار هوش مصنوعی پرده آنتیک هستید.
دuty: از مکالمه اخیر، اطلاعات مفید برای ذخیره‌سازی بلندمدت استخراج کنید.

انواع حافظه:
- preference: ترجیحات کاربر (سبک پرده، رنگ، مکانیزم، بودجه، برند)
- fact: حقایق تاییدشده (ابعاد اتاق، تعداد پنجره، مواد موجود، قیمت‌ها)
- project_context: اطلاعات پروژه (نام پروژه، مرحله، مکان، زمان‌بندی)
- communication_style: سبک ارتباطی دلخواه (مختصر/فنی، مفصل/آموزشی، رسمی/دوستانه)
- decision: تصمیم‌های مهم (انتخاب مدل پرده، تأیید سفارش، تغییر طراحی)
- correction: تصحیحات کاربر به اطلاعات قبلی

قوانین استخراج:
1. فقط اطلاعات صریحاً بیان‌شده توسط کاربر را استخراج کنید - حدس نزنید
2. اطلاعات موقت یا مربوط به لحظه (مثل «الان چیptime است؟»)، ذخیره نکنید
3. اطلاعات حساس (رمز، توکن، کلید API، آدرس دقیق) ذخیره نکنید
4. اطلاعات تکراری را به‌روزرسانی کنید، نگه‌دارید
5. هر حافظه باید आत्मनिرب (خودکفا) و قابل فهم بدون زمینه باشد
6. confidence: 0.6-0.9 (چقدر مطمئن هستید که این اطلاعات دقیق و مفید است)
7. importance: 1-5 (چقدر این اطلاعات برای مکالمات آینده حیاتی است)

خروجی: آرایه JSON از اشیاء حافظه. اگر حافظه‌ای قابل استخراج نباشد، آرایه خالی برگردانید.

مثال خروجی:
[
  {
    "type": "preference",
    "category": "curtain_catalog",
    "content": "کاربر ترجیح می‌دهد پرده‌های شید مشکی با مکانیزم رومیزی برای اتاق‌های خواب استفاده شوند",
    "confidence": 0.85,
    "importance": 4
  },
  {
    "type": "fact",
    "category": "projects",
    "content": "پروژه ویلا شمال در مرحله انتخاب پارچه است، ابعاد پنجره‌ها: ۲۴۰x۱۵۰ سانتی‌متر، دو عدد",
    "confidence": 0.9,
    "importance": 5
  }
]`;

interface ExtractedMemory {
  type: MemoryType;
  category?: string;
  content: string;
  confidence: number;
  importance: number;
}

async function extractMemoriesFromMessages(
  userId: string,
  conversationId: string,
  newMessages: Array<{ role: string; content: string; id: string }>,
  lastExtractionMessageId: string | null
): Promise<ExtractedMemory[]> {
  // Find messages after last extraction
  const relevantMessages = lastExtractionMessageId
    ? newMessages.filter((m) => {
        const idx = newMessages.findIndex((nm) => nm.id === lastExtractionMessageId);
        return newMessages.indexOf(m) > idx;
      })
    : newMessages;

  if (relevantMessages.length === 0) return [];

  // Only process user messages for memory extraction
  const userMessages = relevantMessages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return [];

  const conversationText = userMessages
    .map((m) => `User: ${m.content}`)
    .join("\n\n");

  if (conversationText.length < 50) return []; // Too little content

  try {
    const model = getChatModel("cloudflare", "@cf/zai-org/glm-4.7-flash");
    const result = await generateText({
      model,
      system: MEMORY_EXTRACTION_PROMPT,
      prompt: `مکالمه اخیر:\n${conversationText}\n\nحافظه‌های قابل استخراج:`,
      temperature: 0.1,
      maxOutputTokens: 1500,
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const extracted = JSON.parse(jsonMatch[0]) as ExtractedMemory[];
    return extracted.filter(
      (m) =>
        m.content &&
        m.content.length > 10 &&
        m.content.length < 500 &&
        m.confidence >= 0.5 &&
        m.confidence <= 1 &&
        m.importance >= 1 &&
        m.importance <= 5 &&
        ["preference", "fact", "project_context", "communication_style", "decision", "correction"].includes(m.type)
    );
  } catch (error) {
    console.error("Memory extraction failed:", error);
    return [];
  }
}

export async function runMemoryExtraction(
  userId: string,
  conversationId: string
): Promise<{ created: number; updated: number; errors: string[] }> {
  const conversation = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, partsJson: true },
      },
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Get last extraction marker from conversation metadata or use a simple approach
  // For now, we'll extract from the last 10 user messages
  const newMessages = conversation.messages.map((m) => {
    let content = "";
    try {
      const parts = JSON.parse(m.partsJson);
      content = parts
        .filter((p: { type?: string; text?: string }) => p.type === "text" && p.text)
        .map((p: { text: string }) => p.text)
        .join(" ");
    } catch {}
    return { id: m.id, role: m.role, content };
  });

  // Simple heuristic: only extract from messages after the last 10 messages or if conversation is short
  const recentMessages = newMessages.slice(-20);
  const extracted = await extractMemoriesFromMessages(userId, conversationId, recentMessages, null);

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const mem of extracted) {
    try {
      const input: CreateMemoryInput = {
        userId,
        conversationId,
        type: mem.type,
        category: mem.category,
        content: mem.content,
        confidence: mem.confidence,
        importance: mem.importance,
      };

      const existing = await findSimilarMemory(userId, mem.content, mem.type);
      if (existing) {
        await prisma.aIMemory.update({
          where: { id: existing.id },
          data: {
            confidence: Math.max(existing.confidence, mem.confidence),
            importance: Math.max(existing.importance, mem.importance),
            updatedAt: new Date(),
          },
        });
        updated++;
      } else {
        await createMemory(input);
        created++;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown error");
    }
  }

  return { created, updated, errors };
}

export async function extractMemoriesFromConversation(
  userId: string,
  conversationId: string,
  messageId: string
): Promise<void> {
  // This can be called after each assistant response to incrementally extract memories
  // For now, we'll run a more comprehensive extraction periodically
  try {
    await runMemoryExtraction(userId, conversationId);
  } catch (error) {
    console.error("Incremental memory extraction failed:", error);
  }
}