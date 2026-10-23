/** Dual assistant: design_consultant + admin_assistant. Local Prisma only. */
import { prisma } from "./prisma.js";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls?: unknown[];
};

export type AssistantContext = {
  path?: string;
  page?: string;
  role?: string;
};

type Intent =
  | "greeting"
  | "thanks"
  | "help"
  | "list_styles"
  | "list_models"
  | "search_models"
  | "recommend"
  | "about_install"
  | "about_price"
  | "about_contact"
  | "taste"
  | "unknown";

const GREETING_RE =
  /^(سلام|درود|hi|hello|hey|سلام علیکم|صبح بخیر|عصر بخیر|شب بخیر|خوبی|چطوری)[\s!.؟?]*$/i;
const THANKS_RE = /^(ممنون|مرسی|تشکر|thanks|thank you|خداحافظ|bye)[\s!.؟?]*$/i;

const STYLE_HINTS: { keys: string[]; styles: string[]; note: string }[] = [
  { keys: ["بلک", "blackout", "تاریک", "خواب", "نور نده", "اتاق خواب"], styles: ["shade", "zebra", "roman"], note: "برای کنترل نور و اتاق خواب، شید بلک‌اوت، زبرا یا رومن مناسب‌اند." },
  { keys: ["شفاف", "تور", "نورگیر", "روشن", "sheer"], styles: ["drape", "wave", "pleated-sheer"], note: "برای فضای پرنور، پرده شفاف/تور حس سبکی می‌دهد." },
  { keys: ["کلاسیک", "لوکس", "مجلل", "مجلسی"], styles: ["drape", "roman"], note: "برای کلاسیک، چین‌دار یا رومن شیک‌تر می‌نشیند." },
  { keys: ["مدرن", "ساده", "مینیمال"], styles: ["panel", "turk-panel", "shade", "zebra", "roller"], note: "برای مدرن، ترک‌پنل، شید یا زبرا خطوط تمیزتری دارند." },
  { keys: ["اداری", "دفتر", "تجاری", "شرکت"], styles: ["zebra", "shade", "roller", "double"], note: "برای اداری زبرا یا شید کاربردی‌ترند." },
  { keys: ["آشپزخانه", "kitchen"], styles: ["roman", "shade", "roller"], note: "برای آشپزخانه رومن یا شید جمع‌وجور است." },
  { keys: ["نشیمن", "پذیرایی", "سالن", "living"], styles: ["drape", "roman", "zebra"], note: "برای نشیمن بسته به نور: چین‌دار، رومن یا زبرا." },
  { keys: ["زبرا", "zebra"], styles: ["zebra"], note: "زبرا نور و حریم را با هم می‌دهد." },
  { keys: ["رومن", "roman"], styles: ["roman"], note: "رومن تاهای افقی مرتب دارد." },
  { keys: ["شید", "shade"], styles: ["shade", "double"], note: "شید برای کنترل نور عالی است." },
  { keys: ["ترک", "پنل", "turk", "panel"], styles: ["panel", "turk-panel"], note: "ترک‌پنل ظاهر مدرن دارد." },
  { keys: ["پلیسه", "pleated"], styles: ["pleated", "pleated-manual"], note: "پلیسه برای پنجره متوسط مناسب است." },
];

function normalize(s: string) {
  return s.toLowerCase().replace(/[یي]/g, "ی").replace(/[کك]/g, "ک").trim();
}

function detectIntent(text: string): Intent {
  const t = normalize(text);
  if (GREETING_RE.test(t) || t.length < 3) return "greeting";
  if (THANKS_RE.test(t)) return "thanks";
  if (/کمک|چطور|چگونه|راهنما|help/.test(t)) return "help";
  if (/سلیقه|دوست دارم|ترجیح|رنگ مورد|طرح مورد/.test(t)) return "taste";
  if (/قیمت|هزینه|مبلغ|price/.test(t)) return "about_price";
  if (/نصب|اندازه|بازدید|اجرا/.test(t)) return "about_install";
  if (/تماس|مشاوره|شماره|فرم|contact/.test(t)) return "about_contact";
  if (/چه سبک|سبک‌ها|انواع پرده|دسته/.test(t)) return "list_styles";
  if (/چه مدل|لیست مدل|کاتالوگ|همه مدل/.test(t)) return "list_models";
  if (
    STYLE_HINTS.some((h) => h.keys.some((k) => t.includes(normalize(k)))) ||
    /پیشنهاد|میخوام|می‌خوام|نیاز|برای|فضا|اتاق|پنجره|دکور/.test(t)
  ) {
    return "recommend";
  }
  if (/جستجو|پیدا|دارید|موجود/.test(t)) return "search_models";
  return "unknown";
}

function detectStyleHints(text: string) {
  const t = normalize(text);
  return STYLE_HINTS.filter((h) => h.keys.some((k) => t.includes(normalize(k))));
}

function extractSearchTerms(text: string): string[] {
  const stop = new Set([
    "سلام", "برای", "یک", "یه", "از", "به", "با", "که", "می", "می‌خوام", "میخوام",
    "لطفا", "پیشنهاد", "بده", "کن", "مدل", "پرده", "قالب", "بساز",
  ]);
  return normalize(text)
    .split(/[\s,،.؟!]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !stop.has(w));
}

async function loadCatalog() {
  const [categories, models, projects, modelCount, orderCount, requestCount] = await Promise.all([
    prisma.curtainCategory.findMany({ orderBy: { order: "asc" }, take: 40 }),
    prisma.curtainModel.findMany({ orderBy: { updatedAt: "desc" }, take: 120 }),
    prisma.project.findMany({ orderBy: { updatedAt: "desc" }, take: 12 }).catch(() => []),
    prisma.curtainModel.count(),
    prisma.order.count().catch(() => 0),
    prisma.consultationRequest.count().catch(() => 0),
  ]);
  return { categories, models, projects, modelCount, orderCount, requestCount };
}

function formatModelLine(m: {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  categorySlug: string | null;
}) {
  const code = m.code || m.name;
  const color = m.color ? `، ${m.color}` : "";
  const cat = m.categorySlug ? ` — ${m.categorySlug}` : "";
  return `• **${m.name}** (${code}${color})${cat} → /curtain/${m.id}`;
}

function scoreModel(
  m: {
    name: string;
    code: string | null;
    fabric: string | null;
    color: string | null;
    description: string | null;
    categorySlug: string | null;
    subcategory: string | null;
    material: string | null;
  },
  preferred: string[],
  terms: string[]
) {
  const slug = (m.categorySlug || "").toLowerCase();
  const sub = (m.subcategory || "").toLowerCase();
  const blob = normalize(
    `${m.name} ${m.code || ""} ${m.fabric || ""} ${m.color || ""} ${m.description || ""} ${m.material || ""} ${slug} ${sub}`
  );
  let score = 0;
  for (const s of preferred) {
    const ns = normalize(s);
    if (slug.includes(ns) || sub.includes(ns) || blob.includes(ns)) score += 4;
  }
  for (const t of terms) if (blob.includes(t)) score += 2;
  return score;
}

export async function buildConsultantReply(
  userText: string,
  history: ChatMessage[] = []
): Promise<{ text: string; meta: Record<string, unknown> }> {
  const intent = detectIntent(userText);
  const { categories, models, projects, modelCount } = await loadCatalog();
  const meta: Record<string, unknown> = {
    source: "local-catalog",
    agent: "design_consultant",
    intent,
    model_count: modelCount,
    category_count: categories.length,
  };

  if (intent === "greeting") {
    return {
      text:
        `سلام 👋 من دستیار طراحی **پرده آنتیک** هستم.\n` +
        `الان **${modelCount} مدل** و **${categories.length} سبک** در کاتالوگ زنده داریم.\n\n` +
        `برای اینکه دقیقاً سلیقه‌ت را بفهمم بگو:\n` +
        `۱) فضا؟ (نشیمن / خواب / آشپزخانه / اداری)\n` +
        `۲) نور؟ (تاریک می‌خوای یا روشن؟)\n` +
        `۳) حس دکوراسیون؟ (مدرن / کلاسیک / مینیمال)\n` +
        `۴) رنگ غالب اتاق چیه؟\n\n` +
        `با هم یک ترکیب شیک از پارچه و سبک نصب می‌چینیم.`,
      meta,
    };
  }

  if (intent === "thanks") {
    return { text: "قابل نداشت. هر وقت خواستی رنگ/طرح عوض کنیم همین‌جا بگو.", meta };
  }

  if (intent === "help" || intent === "taste") {
    return {
      text:
        `من کمکت می‌کنم سلیقه‌ت را به مدل واقعی وصل کنیم:\n` +
        `• فضا و نور را می‌پرسم\n` +
        `• از کاتالوگ واقعی مدل پیشنهاد می‌دهم\n` +
        `• برای نصب و قیمت به /contact هدایت می‌کنم\n\n` +
        `الان بگو: اتاق چیه و دوست داری تاریک باشه یا روشن؟`,
      meta,
    };
  }

  if (intent === "about_price") {
    return {
      text:
        `قیمت بر اساس **ابعاد + پارچه + سبک نصب** حساب می‌شود و در سایت ثابت نیست.\n` +
        `مدل را انتخاب کن، بعد از /contact درخواست مشاوره بده تا اندازه و قیمت دقیق بگیری.`,
      meta,
    };
  }

  if (intent === "about_install" || intent === "about_contact") {
    return {
      text:
        `مسیر استاندارد:\n۱) انتخاب مدل از کاتالوگ\n۲) فرم مشاوره در /contact\n۳) بازدید، اندازه‌گیری، نصب\n\nاگر مدل خاصی مد نظرته لینکش را بفرست.`,
      meta,
    };
  }

  if (intent === "list_styles") {
    const lines = categories.map((c) => `• **${c.name}** (\`${c.slug}\`)`);
    return {
      text: lines.length
        ? `سبک‌های فعال:\n${lines.join("\n")}\n\nکدام فضا را می‌خواهی دکور کنیم؟`
        : "هنوز دسته‌ای ثبت نشده.",
      meta,
    };
  }

  if (intent === "list_models") {
    const sample = models.slice(0, 8).map(formatModelLine);
    return {
      text:
        `**${modelCount} مدل** در دیتابیس:\n${sample.join("\n")}` +
        (modelCount > 8 ? `\n… و ${modelCount - 8} مورد دیگر.` : "") +
        `\n\nبگو رنگ یا سبک مورد علاقه‌ت چیست.`,
      meta,
    };
  }

  const hints = detectStyleHints(userText);
  const preferred = [...new Set(hints.flatMap((h) => h.styles))];
  const histText = history
    .filter((m) => m.role === "user")
    .slice(-5)
    .map((m) => m.content)
    .join(" ");
  for (const s of detectStyleHints(histText).flatMap((h) => h.styles)) {
    if (!preferred.includes(s)) preferred.push(s);
  }
  const terms = extractSearchTerms(userText);

  if (!models.length) {
    return {
      text: "کاتالوگ هنوز خالی است. به‌زودی مدل‌ها اضافه می‌شوند — از /contact هم می‌توانی مشاوره بگیری.",
      meta,
    };
  }

  const scored = models
    .map((m) => ({ m, score: scoreModel(m, preferred, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = (scored.length ? scored : models.map((m) => ({ m, score: 0 }))).slice(0, 5).map((x) => x.m);
  meta.matched_styles = preferred;
  meta.returned_model_ids = top.map((m) => m.id);

  if (intent === "recommend" || scored.length > 0) {
    const note =
      hints.map((h) => h.note).join(" ") ||
      "با توجه به حرف‌هات، این‌ها از کاتالوگ نزدیک‌ترند:";
    let follow = "\n\nاگر رنگ دیوار یا میزان نور را دقیق‌تر بگی، پیشنهاد را تنگ‌تر می‌کنم.";
    if (projects.length) {
      follow += `\nنمونه اجرا: ${projects
        .slice(0, 2)
        .map((p: { title: string }) => p.title)
        .join("، ")}.`;
    }
    return {
      text: `${note}\n\n${top.map(formatModelLine).join("\n")}${follow}`,
      meta,
    };
  }

  return {
    text:
      `متوجه شدم، ولی برای پیشنهاد دقیق‌تر بگو فضا و نور چطوره.\n` +
      `من به ${modelCount} مدل واقعی وصلم — مثلاً «نشیمن مدرن روشن» یا «خواب بلک‌اوت».`,
    meta,
  };
}

export async function buildAdminAssistantReply(
  userText: string,
  history: ChatMessage[] = [],
  context: AssistantContext = {}
): Promise<{ text: string; meta: Record<string, unknown> }> {
  const t = normalize(userText);
  const path = context.path || "";
  const page = context.page || path || "پنل";
  const { categories, models, modelCount, requestCount } = await loadCatalog();

  const meta: Record<string, unknown> = {
    source: "admin-local",
    agent: "admin_assistant",
    path,
    page,
    model_count: modelCount,
  };

  if (/وضعیت|خلاصه|داشبورد|چیکار/.test(t) || (path === "/admin" && GREETING_RE.test(t))) {
    return {
      text:
        `📊 وضعیت زنده:\n` +
        `• مدل پرده: **${modelCount}**\n` +
        `• دسته: **${categories.length}**\n` +
        `• درخواست مشاوره: **${requestCount}**\n\n` +
        `پیشنهاد مسیر:\n` +
        `۱) اگر مدل کم است → /admin/models (عکس تکه پارچه + کد)\n` +
        `۲) قالب سبز هر سبک → /admin/window → ساخت قالب\n` +
        `۳) درخواست‌های جدید → /admin/requests\n\n` +
        `بگو روی کدام بخش کار می‌کنی تا مرحله‌به‌مرحله راهنمایی کنم.`,
      meta,
    };
  }

  if (GREETING_RE.test(t)) {
    return {
      text:
        `سلام — من دستیار ادمین آنتیک‌ام و می‌بینم الان روی **${page}** هستی.\n` +
        `بگو چی لازم داری: ساخت قالب، افزودن مدل، متن محصول، دسته، یا پیگیری سفارش/مشاوره.`,
      meta,
    };
  }

  if (/قالب|chroma|کروم|سبز|رندر/.test(t)) {
    const styleMatch = t.match(/رومن|roman|زبرا|zebra|شید|shade|پنل|panel|پلیسه|roller|کرکره/);
    const styleHint = styleMatch ? styleMatch[0] : "همان سبک موردنظر";
    return {
      text:
        `ساخت قالب chroma برای «${styleHint}»:\n\n` +
        `۱) برو **پنجره مجازی** → /admin/window\n` +
        `۲) روی سبک موردنظر **ساخت قالب** بزن (سرور محلی قالب سبز می‌سازد)\n` +
        `۳) پیش‌نمایش سبز باید دیده شود\n` +
        `۴) بعد مدل‌ها با عکس پارچه روی همان سبک رندر می‌شوند\n\n` +
        `نکته: عکس پارچه بدون برچسب کد باشد تا روی پرده تکرار نشود.\n` +
        (path.includes("window")
          ? `الان روی همان صفحه هستی — دکمه ساخت قالب را بزن.`
          : `از منو «پنجره مجازی» را باز کن.`),
      meta: { ...meta, action: "generate_template_guide" },
    };
  }

  if (/مدل|پارچه|کاتالوگ|ورق|افزودن مدل/.test(t) || path.includes("models")) {
    return {
      text:
        `ثبت مدل از ورق کاتالوگ فیزیکی:\n\n` +
        `۱) /admin/models → افزودن\n` +
        `۲) **فقط تکه پارچه** (برچسب کد را از کادر خارج کن)\n` +
        `۳) کد محصول = همان روی ورق\n` +
        `۴) دسته = سبک نصب (رومن، زبرا، …)\n` +
        `۵) رنگ/کد رنگ اجباری نیست — هویت مدل همان عکس است\n\n` +
        `الان ${modelCount} مدل در DB است.` +
        (path.includes("models") ? `\nتو همین صفحه مدل‌ها هستی.` : ""),
      meta: { ...meta, action: "add_model_guide" },
    };
  }

  if (/متن|توضیح|کپی|محتوا|بنویس|کپشن|seo/.test(t)) {
    const sample = models[0];
    const code = sample?.code || "CODE";
    const name = sample?.name || "نام مدل";
    return {
      text:
        `نمونه متن آماده (قابل ویرایش):\n\n` +
        `**عنوان:** پرده ${name} — کد ${code}\n` +
        `**کوتاه:** پارچه منتخب از کاتالوگ شرکتی؛ مناسب فضای مدرن و کنترل نور.\n` +
        `**بلند:** این مدل با بافت واقعی پارچه در پیش‌نمایش نصب دیده می‌شود. برای انتخاب نهایی، نور فضا و سبک دکوراسیون را در نظر بگیرید؛ نصب پس از اندازه‌گیری انجام می‌شود.\n\n` +
        `اگر کد یا سبک خاصی بگی، متن را همان‌طور بازنویسی می‌کنم.`,
      meta: { ...meta, action: "content_draft" },
    };
  }

  if (/دسته|زیردسته|category/.test(t) || path.includes("categor")) {
    const lines = categories.slice(0, 10).map((c) => `• ${c.name} (\`${c.slug}\`)`);
    return {
      text:
        `دسته‌های فعلی:\n${lines.join("\n") || "—"}\n\n` +
        `برای سبک جدید: نام فارسی + slug انگلیسی یکتا + زیردسته‌ها با ویرگول.\n` +
        `مسیر: /admin/categories`,
      meta,
    };
  }

  if (/سفارش|order/.test(t) || path.includes("order")) {
    return {
      text: `سفارش‌ها در /admin/orders هستند. وضعیت را از لیست چک کن؛ برای پیگیری با مشتری از شماره ثبت‌شده در سفارش تماس بگیر.`,
      meta,
    };
  }
  if (/درخواست|مشاوره|inbox/.test(t) || path.includes("request")) {
    return {
      text: `درخواست‌های مشاوره: **${requestCount}** مورد در دیتابیس.\nمسیر: /admin/requests — جدیدها را اولویت بده و وضعیت را به‌روز کن.`,
      meta,
    };
  }

  return {
    text:
      `روی **${page}** هستی.\n` +
      `می‌توانم راهنمایی کنم برای:\n` +
      `• مدل و عکس پارچه\n• قالب chroma / رندر\n• متن و محتوای فروش\n• دسته، سفارش، درخواست مشاوره\n\n` +
      `دقیق بگو چه می‌خواهی انجام شود (مثلاً «برای شید قالب بساز» یا «متن مدل ZB-301»).`,
    meta,
  };
}

export async function buildAssistantReply(
  agentName: string,
  userText: string,
  history: ChatMessage[] = [],
  context: AssistantContext = {}
) {
  if (agentName === "admin_assistant") {
    return buildAdminAssistantReply(userText, history, context);
  }
  return buildConsultantReply(userText, history);
}
