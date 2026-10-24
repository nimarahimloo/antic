import { prisma } from "./prisma.js";
import { executeAdminCommand } from "./adminActions.js";
import type { AssistantContext, AssistantResult, ChatMessage, RichBlock } from "./consultant.js";

const GREETING_RE =
  /^(سلام|درود|hi|hello|hey|سلام علیکم|صبح بخیر|عصر بخیر|شب بخیر|خوبی|چطوری)[\s!.؟?]*$/i;

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[یي]/g, "ی")
    .replace(/[کك]/g, "ک")
    .trim();
}

function pack(text: string, blocks?: RichBlock[]): AssistantResult {
  return { text, blocks };
}

export async function buildAdminAssistantReply(
  userText: string,
  _history: ChatMessage[] = [],
  context: AssistantContext = {},
  options?: { imageUrl?: string }
): Promise<AssistantResult> {
  const t = normalize(userText);
  const path = context.path || "";
  const page = context.page || path || "پنل";

  // اول تلاش برای اجرای دستور CRUD واقعی
  const executed = await executeAdminCommand(userText, { imageUrl: options?.imageUrl });
  if (executed) {
    return {
      text: executed.text,
      blocks: executed.blocks as RichBlock[] | undefined,
      meta: executed.meta,
    };
  }

  const [modelCount, catCount, reqCount, orderCount] = await Promise.all([
    prisma.curtainModel.count(),
    prisma.curtainCategory.count(),
    prisma.consultationRequest.count(),
    prisma.order.count(),
  ]);

  if (/وضعیت|خلاصه|داشبورد|چیکار/.test(t) || path === "/admin") {
    return pack(
      `وضعیت DB:\n• مدل: **${modelCount}**\n• دسته کاتالوگ: **${catCount}**\n• سفارش: **${orderCount}**\n• درخواست: **${reqCount}**\n\n` +
        `دستورات قابل اجرا:\n` +
        `• حذف مدل ZB-001\n` +
        `• افزودن مدل کد: X نام: Y دسته: zebra\n` +
        `• ویرایش مدل ZB-001 رنگ: کرم\n` +
        `• افزودن دسته کاتالوگ نام: … شناسه: …\n` +
        `• حذف محصول … / ویرایش محصول … قیمت: …\n` +
        `• لیست سفارش‌ها / ویرایش سفارش id وضعیت: paid\n` +
        `• لیست درخواست‌ها / ویرایش درخواست id وضعیت: done`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "لیست مدل‌ها", message: "لیست مدل‌ها" },
            { label: "لیست سفارش‌ها", message: "لیست سفارش‌ها" },
            { label: "لیست درخواست‌ها", message: "لیست درخواست‌ها" },
            { label: "تعداد همه", message: "تعداد" },
          ],
        },
      ]
    );
  }

  if (GREETING_RE.test(t)) {
    return pack(
      `سلام — روی **${page}** هستی.\nمی‌توانم **افزودن / ویرایش / حذف / لیست** برای مدل، دسته، نمونه اجرا، محصول، سفارش و درخواست را مستقیم روی دیتابیس انجام دهم.\nدستور را فارسی بگو.`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "خلاصه وضعیت", message: "خلاصه وضعیت" },
            { label: "لیست مدل‌ها", message: "لیست مدل‌ها" },
            { label: "راهنمای دستورات", message: "چطور مدل حذف کنم؟" },
          ],
        },
      ]
    );
  }

  if (/چطور|راهنما|دستور|کمک|help/.test(t)) {
    return pack(
      `نمونه دستورات واقعی:\n\n` +
        `**مدل**\n` +
        `• افزودن مدل کد: ZB-10 نام: زبرا طوسی دسته: zebra رنگ: طوسی\n` +
        `• ویرایش مدل ZB-10 رنگ: کرم\n` +
        `• حذف مدل ZB-10\n` +
        `• لیست مدل‌ها\n\n` +
        `**دسته کاتالوگ**\n` +
        `• افزودن دسته کاتالوگ نام: زبرا شناسه: zebra\n` +
        `• حذف دسته zebra\n\n` +
        `**نمونه اجرا**\n` +
        `• افزودن نمونه اجرا عنوان: ویلا شمال دسته: living\n` +
        `• حذف نمونه اجرا ویلا\n\n` +
        `**محصول**\n` +
        `• افزودن محصول نام: قلاب شناسه: hook-1 قیمت: 150000\n` +
        `• ویرایش محصول hook-1 قیمت: 180000\n\n` +
        `**سفارش / درخواست**\n` +
        `• لیست سفارش‌ها\n` +
        `• ویرایش سفارش abc123 وضعیت: paid\n` +
        `• ویرایش درخواست abc123 وضعیت: done\n\n` +
        `برای تصویر: عکس را پیوست کن و بگو «ویرایش مدل CODE تصویر از پیوست»`
    );
  }

  return pack(
    `روی **${page}** هستم و آماده‌ام دستور را اجرا کنم.\nمثال: «حذف مدل ZB-001» یا «افزودن محصول نام: … قیمت: …» یا «لیست درخواست‌ها».`,
    [
      {
        type: "quick_replies",
        items: [
          { label: "راهنمای دستورات", message: "راهنمای دستورات" },
          { label: "لیست مدل‌ها", message: "لیست مدل‌ها" },
          { label: "خلاصه وضعیت", message: "خلاصه وضعیت" },
        ],
      },
    ]
  );
}
