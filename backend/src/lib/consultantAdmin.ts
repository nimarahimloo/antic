import { prisma } from "./prisma.js";
import { executeAdminCommand } from "./adminActions.js";
import type { AssistantContext, AssistantResult, ChatMessage, RichBlock } from "./consultant.js";

const GREETING_RE =
  /^(سلام|درود|hi|hello|hey|سلام علیکم|صبح بخیر|عصر بخیر|شب بخیر|خوبی|چطوری)[\s!.؟?]*$/i;

function normalize(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[یي]/g, "ی")
    .replace(/[کك]/g, "ک")
    .replace(/\u200c/g, " ")
    .trim();
}

function pack(text: string, blocks?: RichBlock[]): AssistantResult {
  return { text, blocks };
}

function lastTargetFromHistory(history: ChatMessage[]): string | null {
  const blob = history
    .slice(-8)
    .map((m) => m.content)
    .join(" ");
  const code = blob.match(/\b([A-Za-z]{1,8}-?\d{2,6})\b/);
  if (code) return code[1];
  const cuid = blob.match(/\b(c[a-z0-9]{20,})\b/i);
  if (cuid) return cuid[1];
  return null;
}

function expandVariants(userText: string, history: ChatMessage[], path: string): string[] {
  const t = userText.trim();
  const n = normalize(t);
  const variants = new Set<string>([t]);
  const histTarget = lastTargetFromHistory(history);

  if (histTarget && /^(پاکش|حذفش|دیلیت|عوضش|ویرایشش|پاک\s*کن|حذف\s*کن)/.test(n)) {
    if (/پاک|حذف|دیلیت/.test(n)) variants.add(`حذف ${histTarget}`);
    if (/عوض|ویرایش|آپدیت/.test(n)) variants.add(`ویرایش ${histTarget}`);
  }
  if (histTarget && /این(و|رو)|همی(نو|ن)/.test(n) && /پاک|حذف/.test(n)) {
    variants.add(`حذف ${histTarget}`);
  }
  if (/نداشته\s*باش|نمیخوامش|بکش\s*کن|ببر\s*دور/.test(n) && histTarget) {
    variants.add(`حذف ${histTarget}`);
  }
  if (path.includes("/models") && /لیست|همه|چی\s*داریم/.test(n)) variants.add("لیست مدل‌ها");
  if (path.includes("/orders") && /لیست|همه|چی\s*داریم/.test(n)) variants.add("لیست سفارش‌ها");
  if (path.includes("/requests") && /لیست|همه|چی\s*داریم/.test(n)) variants.add("لیست درخواست‌ها");
  if (path.includes("/products") && /لیست|همه|چی\s*داریم/.test(n)) variants.add("لیست محصول");
  if (path.includes("/categories") && /لیست|همه|چی\s*داریم/.test(n)) variants.add("لیست دسته کاتالوگ");
  if (path.includes("/projects") && /لیست|همه|چی\s*داریم/.test(n)) variants.add("لیست نمونه اجرا");
  if (/چند\s*تا|تعداد/.test(n) && !/مدل|دسته|محصول|سفارش/.test(n)) {
    if (path.includes("/models")) variants.add("تعداد مدل");
    else variants.add("تعداد");
  }
  return [...variants];
}

export async function buildAdminAssistantReply(
  userText: string,
  history: ChatMessage[] = [],
  context: AssistantContext = {},
  options?: { imageUrl?: string }
): Promise<AssistantResult> {
  const t = normalize(userText);
  const path = context.path || "";
  const page = context.page || path || "پنل";
  const variants = expandVariants(userText, history, path);

  for (const variant of variants) {
    const executed = await executeAdminCommand(variant, {
      imageUrl: options?.imageUrl,
      path,
    });
    if (executed) {
      return {
        text: executed.text,
        blocks: executed.blocks as RichBlock[] | undefined,
        meta: { ...(executed.meta || {}), variant },
      };
    }
  }

  if (options?.imageUrl && /بگذار|بذار|عکس|تصویر|کاور/.test(t)) {
    const histTarget = lastTargetFromHistory(history);
    if (histTarget) {
      const executed = await executeAdminCommand(`ویرایش مدل ${histTarget}`, {
        imageUrl: options.imageUrl,
        path,
      });
      if (executed) {
        return {
          text: executed.text,
          blocks: executed.blocks as RichBlock[] | undefined,
          meta: executed.meta,
        };
      }
    }
  }

  const [modelCount, catCount, reqCount, orderCount, productCount] = await Promise.all([
    prisma.curtainModel.count(),
    prisma.curtainCategory.count(),
    prisma.consultationRequest.count(),
    prisma.order.count(),
    prisma.product.count(),
  ]);

  if (/وضعیت|خلاصه|داشبورد|چیکار|آمار/.test(t) || (path === "/admin" && t.length < 24)) {
    return pack(
      `وضعیت فعلی:\n• مدل: **${modelCount}** · دسته: **${catCount}**\n• محصول: **${productCount}** · سفارش: **${orderCount}** · درخواست: **${reqCount}**\n\nهر جور راحت هستی دستور بده.\nمثال: «ZB-001 رو پاک کن» · «قیمت قلاب بشه ۲۰۰۰۰۰» · «مدل‌ها چی داریم»`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "لیست مدل‌ها", message: "مدل‌ها رو نشون بده" },
            { label: "سفارش‌ها", message: "سفارش‌ها چی داریم" },
            { label: "تعداد", message: "تعداد همه" },
          ],
        },
      ]
    );
  }

  if (GREETING_RE.test(t)) {
    return pack(
      `سلام — الان روی **${page}** هستی.\nحذف، اضافه، ویرایش، لیست و تعداد را با هر لحنی بگو.`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "خلاصه وضعیت", message: "خلاصه وضعیت" },
            { label: "لیست مدل‌ها", message: "مدل‌ها رو نشون بده" },
          ],
        },
      ]
    );
  }

  if (/راهنما|دستورات|چطور|کمک/.test(t)) {
    return pack(
      `می‌توانی بگویی:\n• «مدل ZB-001 را حذف کن»\n• «یه مدل با کد NEW-1 بساز دسته shade»\n• «قیمت محصول قلاب بشه ۱۵۰۰۰۰»\n• «سفارش‌ها را لیست کن»\n• «اینو پاک کن» (اگر قبلش مدل را گفته باشی)`
    );
  }

  return pack(
    `دستور را کامل متوجه نشدم.\nروی **${page}** هستم — بگو چه کاری روی کدام مورد (کد یا نام).\nمثال: «مدل TEST-1 را حذف کن».`,
    [
      {
        type: "quick_replies",
        items: [
          { label: "راهنما", message: "راهنمای دستورات" },
          { label: "خلاصه", message: "خلاصه وضعیت" },
        ],
      },
    ]
  );
}
