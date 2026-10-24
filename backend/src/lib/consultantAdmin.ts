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

  const executed = await executeAdminCommand(userText, {
    imageUrl: options?.imageUrl,
    path,
  });
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

  if (/وضعیت|خلاصه|داشبورد|چیکار/.test(t) || (path === "/admin" && t.length < 20)) {
    return pack(
      `وضعیت DB:\n• مدل: **${modelCount}**\n• دسته: **${catCount}**\n• سفارش: **${orderCount}**\n• درخواست: **${reqCount}**\n\n` +
        `آزاد حرف بزن — مثلاً:\n` +
        `«مدل ZB رو پاک کن» · «قیمت قلاب رو بکن ۲۰۰» · «لیست سفارش‌ها» · «چند تا مدل داریم»`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "لیست مدل‌ها", message: "لیست مدل‌ها رو بیار" },
            { label: "لیست سفارش‌ها", message: "سفارش‌ها چی داریم" },
            { label: "تعداد همه", message: "تعداد" },
          ],
        },
      ]
    );
  }

  if (GREETING_RE.test(t)) {
    return pack(
      `سلام — روی **${page}** هستی.\nهر جور بگی متوجه می‌شوم: حذف، اضافه، ویرایش، لیست، تعداد.\nفقط بگو چی و روی کدوم مورد.`,
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

  return pack(
    `متوجه دستور نشدم یا اطلاعات کم بود.\nروی **${page}** هستم — واضح‌تر بگو چه کاری روی چه چیزی.\nمثال: «مدل TEST-1 را حذف کن» یا «محصول قلاب قیمتش بشه ۱۵۰ هزار».`,
    [
      {
        type: "quick_replies",
        items: [
          { label: "راهنما", message: "راهنمای دستورات" },
          { label: "لیست مدل‌ها", message: "لیست مدل‌ها" },
        ],
      },
    ]
  );
}
