/**
 * دستیار ادمین — آزاد، هر لحن و هر جمله.
 * CRUD همچنان فقط بعد از پیش‌نمایش + تایید.
 */
import { prisma } from "./prisma.js";
import { executeAdminCommand } from "./adminActions.js";
import type { AssistantContext, AssistantResult, ChatMessage, RichBlock } from "./consultant.js";

function normalize(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[یي]/g, "ی")
    .replace(/[کك]/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pack(text: string, blocks?: RichBlock[], meta?: Record<string, unknown>): AssistantResult {
  return { text, blocks, meta };
}

function lastTargetFromHistory(history: ChatMessage[]): string | null {
  const blob = history
    .slice(-10)
    .map((m) => m.content)
    .join(" ");
  const code = blob.match(/\b([A-Za-z]{1,10}-?\d{1,8})\b/);
  if (code) return code[1];
  const cuid = blob.match(/\b(c[a-z0-9]{20,})\b/i);
  if (cuid) return cuid[1];
  const quoted = blob.match(/[«"]([^»"]{2,40})[»"]/);
  if (quoted) return quoted[1];
  return null;
}

/** موجودیت پیش‌فرض از مسیر صفحه ادمین */
function entityFromPath(path: string): string | null {
  if (path.includes("/models")) return "مدل";
  if (path.includes("/categories") && !path.includes("portfolio")) return "دسته کاتالوگ";
  if (path.includes("/portfolio")) return "دسته نمونه";
  if (path.includes("/projects")) return "نمونه اجرا";
  if (path.includes("/products")) return "محصول";
  if (path.includes("/orders")) return "سفارش";
  if (path.includes("/requests")) return "درخواست";
  if (path.includes("/window")) return "قالب";
  if (path.includes("/settings")) return null;
  return null;
}

function listPhraseForPath(path: string): string {
  if (path.includes("/models")) return "لیست مدل‌ها";
  if (path.includes("/orders")) return "لیست سفارش‌ها";
  if (path.includes("/requests")) return "لیست درخواست‌ها";
  if (path.includes("/products")) return "لیست محصول";
  if (path.includes("/categories")) return "لیست دسته کاتالوگ";
  if (path.includes("/projects")) return "لیست نمونه اجرا";
  if (path.includes("/window")) return "لیست قالب‌ها";
  return "لیست مدل‌ها";
}

/**
 * جملات آزاد ادمین را به چند واریانت قابل‌اجرا تبدیل می‌کند
 * (خودمونی، رسمی، کوتاه، با غلط املایی رایج)
 */
function expandVariants(userText: string, history: ChatMessage[], path: string): string[] {
  const t = userText.trim();
  const n = normalize(t);
  const variants = new Set<string>([t]);
  const histTarget = lastTargetFromHistory(history);
  const pathEnt = entityFromPath(path);

  // ضمیر / اشاره به مورد قبلی
  if (histTarget) {
    if (/پاک|حذف|دیلیت|بکش|ببر\s*دور|نداشته/.test(n)) variants.add(`حذف ${histTarget}`);
    if (/عوض|ویرایش|آپدیت|تغییر|درستش/.test(n)) variants.add(`ویرایش ${histTarget}`);
    if (/این(و|رو)|همی(نو|ن)|همون/.test(n) && /پاک|حذف|عوض|ویرایش/.test(n)) {
      if (/پاک|حذف/.test(n)) variants.add(`حذف ${histTarget}`);
      else variants.add(`ویرایش ${histTarget}`);
    }
  }

  // کد مدل تنها
  const aloneCode = t.match(/^\s*([A-Za-z]{1,10}-?\d{1,8})\s*$/);
  if (aloneCode) {
    variants.add(`جستجو مدل ${aloneCode[1]}`);
    variants.add(`لیست مدل ${aloneCode[1]}`);
  }

  // لیست / نشون بده — هر لحن
  const wantsList =
    /لیست|فهرست|نشون|نشان|بیار|ببینم|چی\s*داریم|چیا|همه|نمایش|show|list|بده\s*ببینم|چی\s*هست/.test(n);
  if (wantsList || (/مدل.?ها|سفارش.?ها|دسته.?ها|محصول.?ها|درخواست.?ها/.test(n) && !/حذف|ویرایش|افزودن|بساز/.test(n))) {
    if (/سفارش/.test(n)) variants.add("لیست سفارش‌ها");
    else if (/درخواست|مشاوره/.test(n)) variants.add("لیست درخواست‌ها");
    else if (/محصول/.test(n)) variants.add("لیست محصول");
    else if (/دسته/.test(n)) variants.add("لیست دسته کاتالوگ");
    else if (/نمونه|پروژه/.test(n)) variants.add("لیست نمونه اجرا");
    else if (/قالب|پنجره/.test(n)) variants.add("لیست قالب‌ها");
    else if (/مدل/.test(n) || wantsList) variants.add("لیست مدل‌ها");
    if (pathEnt && wantsList) variants.add(listPhraseForPath(path));
  }

  // روی صفحه مربوطه بدون ذکر موجودیت
  if (pathEnt && (wantsList || /چی|چطور|وضعیت|ببین/.test(n)) && n.length < 40) {
    variants.add(listPhraseForPath(path));
  }

  // تعداد
  if (/چند\s*تا|تعداد|count|چندتا/.test(n)) {
    if (/مدل/.test(n)) variants.add("تعداد مدل");
    else if (/سفارش/.test(n)) variants.add("تعداد سفارش");
    else if (/درخواست/.test(n)) variants.add("تعداد درخواست");
    else if (/محصول/.test(n)) variants.add("تعداد محصول");
    else if (/دسته/.test(n)) variants.add("تعداد دسته");
    else variants.add("تعداد");
  }

  // ساخت آزاد
  if (/بساز|اضافه|افزودن|ثبت\s*کن|ایجاد|بذار\s*تو/.test(n)) {
    if (/مدل/.test(n) || path.includes("/models")) variants.add(t);
    if (/دسته/.test(n)) variants.add(t);
  }

  // حذف آزاد
  if (/حذف|پاک/.test(n)) {
    variants.add(t);
    const code = t.match(/\b([A-Za-z]{1,10}-?\d{1,8})\b/);
    if (code) variants.add(`حذف مدل ${code[1]}`);
  }

  return [...variants];
}

async function statusSnapshot(): Promise<{ text: string; blocks: RichBlock[] }> {
  const [modelCount, catCount, reqCount, orderCount, productCount, projectCount] = await Promise.all([
    prisma.curtainModel.count(),
    prisma.curtainCategory.count(),
    prisma.consultationRequest.count(),
    prisma.order.count(),
    prisma.product.count(),
    prisma.project.count(),
  ]);
  return {
    text:
      `وضعیت فعلی پنل:\n` +
      `• مدل: **${modelCount}** · دسته: **${catCount}** · نمونه اجرا: **${projectCount}**\n` +
      `• محصول: **${productCount}** · سفارش: **${orderCount}** · درخواست: **${reqCount}**\n\n` +
      `حذف / افزودن / ویرایش فقط بعد از **پیش‌نمایش و تایید** اجرا می‌شود.\n` +
      `هر جوری راحتید دستور بدهید — رسمی یا خودمونی.`,
    blocks: [
      {
        type: "quick_replies",
        items: [
          { label: "لیست مدل‌ها", message: "مدل‌ها رو نشون بده" },
          { label: "سفارش‌ها", message: "سفارش‌ها چی داریم" },
          { label: "درخواست‌ها", message: "لیست درخواست‌ها" },
          { label: "تعداد همه", message: "تعداد همه" },
        ],
      },
    ],
  };
}

export async function buildAdminAssistantReply(
  userText: string,
  history: ChatMessage[] = [],
  context: AssistantContext = {},
  options?: { imageUrl?: string; conversationId?: string }
): Promise<AssistantResult> {
  const t = normalize(userText);
  const path = context.path || "";
  const page = context.page || path || "پنل";
  const execOpts = {
    imageUrl: options?.imageUrl,
    path,
    conversationId: options?.conversationId,
  };

  // تایید / انصراف
  const bare = userText.trim();
  if (/^(تایید|تاید|تائید|انصراف|لغو|رد|confirm|cancel|آره|باشه|نه|yes|ok|اوکی)$/i.test(bare)) {
    const executed = await executeAdminCommand(bare, execOpts);
    if (executed) {
      return {
        text: executed.text,
        blocks: executed.blocks as RichBlock[] | undefined,
        meta: executed.meta,
      };
    }
  }

  // واریانت‌های آزاد جمله
  const variants = expandVariants(userText, history, path);
  for (const variant of variants) {
    const executed = await executeAdminCommand(variant, execOpts);
    if (executed) {
      return {
        text: executed.text,
        blocks: executed.blocks as RichBlock[] | undefined,
        meta: { ...(executed.meta || {}), variant },
      };
    }
  }

  // خود متن خام یک‌بار دیگر
  const direct = await executeAdminCommand(userText, execOpts);
  if (direct) {
    return {
      text: direct.text,
      blocks: direct.blocks as RichBlock[] | undefined,
      meta: direct.meta,
    };
  }

  // تصویر + اشاره به مدل قبلی → ویرایش
  if (options?.imageUrl) {
    const histTarget = lastTargetFromHistory(history);
    if (histTarget) {
      const executed = await executeAdminCommand(`ویرایش مدل ${histTarget}`, {
        ...execOpts,
        imageUrl: options.imageUrl,
      });
      if (executed) {
        return {
          text: executed.text,
          blocks: executed.blocks as RichBlock[] | undefined,
          meta: executed.meta,
        };
      }
    }
    return pack(
      `تصویر دریافت شد. بگو روی **کدام مدل/محصول** گذاشته شود (کد یا نام) — مثلاً «بذار روی مدل ZB-001».`,
      [
        {
          type: "quick_replies",
          items: [{ label: "لیست مدل‌ها", message: "لیست مدل‌ها" }],
        },
      ]
    );
  }

  // خلاصه / آمار
  if (/وضعیت|خلاصه|داشبورد|آمار|گزارش|چیکار|اوضاع/.test(t) || (path === "/admin" && t.length < 20)) {
    const snap = await statusSnapshot();
    return pack(snap.text, snap.blocks);
  }

  // سلام — آزاد
  if (/^(سلام|درود|hi|hello|hey|سلام علیکم|صبح بخیر|عصر بخیر|شب بخیر|خوبی|چطوری)[\s!.؟?]*$/i.test(t)) {
    const snap = await statusSnapshot();
    return pack(
      `سلام — الان روی **${page}** هستی.\n\nهر جور راحتید بنویسید؛ لازم نیست جمله رسمی باشد.\nمثال‌ها:\n• «مدل‌ها رو بده ببینم»\n• «ZB-001 رو پاک کن»\n• «یه مدل با کد TEST-1 بساز»\n• «چندتا سفارش داریم؟»\n\n${snap.text}`,
      snap.blocks
    );
  }

  if (/راهنما|دستورات|چطور\s*کار|کمک\s*کن|help/.test(t)) {
    return pack(
      `دستیار ادمین آزاد است — با هر لحنی دستور بدهید.\n\n**مشاهده:** «لیست مدل‌ها»، «سفارش‌ها چی داریم»، «تعداد»\n**حذف:** «مدل ZB-001 رو پاک کن» → پیش‌نمایش → تایید\n**افزودن:** «یه مدل با کد NEW-1 و نام تست و دسته shade بساز»\n**ویرایش:** «قیمت محصول قلاب بشه 200000»\n\nبدون **تایید اجرا** هیچ حذف/افزودن/ویرایشی اعمال نمی‌شود.`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "خلاصه وضعیت", message: "خلاصه وضعیت" },
            { label: "لیست مدل‌ها", message: "لیست مدل‌ها" },
          ],
        },
      ]
    );
  }

  // جستجوی آزاد کد/نام در مدل‌ها
  const token =
    userText.match(/\b([A-Za-z]{1,10}-?\d{1,8})\b/)?.[1] ||
    userText.match(/[«"]([^»"]{2,40})[»"]/)?.[1] ||
    null;
  if (token) {
    const found = await prisma.curtainModel.findFirst({
      where: {
        OR: [
          { code: { contains: token } },
          { name: { contains: token } },
          { id: { contains: token } },
        ],
      },
    });
    if (found) {
      return pack(
        `مدل پیدا شد: **${found.name}** (\`${found.code}\`) — دسته: ${found.categorySlug || "—"}\n\nمی‌توانید بگویید حذف / ویرایش یا لیست مشابه.`,
        [
          {
            type: "quick_replies",
            items: [
              { label: "حذف این مدل", message: `حذف مدل ${found.code || found.name}` },
              { label: "لیست مدل‌ها", message: "لیست مدل‌ها" },
            ],
          },
          { type: "link_buttons", items: [{ label: "صفحه مدل‌ها", href: "/admin/models" }] },
        ]
      );
    }
  }

  // fallback هوشمند: لیست همان صفحه، نه پیام بن‌بست
  const fallbackList = listPhraseForPath(path);
  const listed = await executeAdminCommand(fallbackList, execOpts);
  if (listed) {
    return pack(
      `متوجه دستور دقیق نشدم؛ روی **${page}** این لیست مرتبط را آوردم.\nاگر کار دیگری می‌خواهید آزاد بنویسید (حذف، افزودن، ویرایش، تعداد…).\n\n${listed.text}`,
      (listed.blocks as RichBlock[] | undefined) || [
        {
          type: "quick_replies",
          items: [
            { label: "خلاصه وضعیت", message: "خلاصه وضعیت" },
            { label: "راهنما", message: "راهنمای دستورات" },
          ],
        },
      ],
      { fallback: true, path }
    );
  }

  const snap = await statusSnapshot();
  return pack(
    `روی **${page}** هستم. دستور را آزاد بنویسید — مثال: «مدل‌ها رو نشون بده» یا «خلاصه وضعیت».\n\n${snap.text}`,
    snap.blocks
  );
}
