/** Dual assistant: design_consultant + admin_assistant — rich blocks, local Prisma. */
import { prisma } from "./prisma.js";

export type RichBlock =
  | { type: "text"; markdown: string }
  | {
      type: "model_cards";
      items: Array<{
        id: string;
        title: string;
        subtitle?: string;
        image?: string | null;
        href: string;
      }>;
    }
  | { type: "link_buttons"; items: Array<{ label: string; href: string }> }
  | { type: "quick_replies"; items: Array<{ label: string; message: string }> };

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  blocks?: RichBlock[];
  attachments?: Array<{ type: "image"; url: string }>;
};

export type AssistantContext = {
  path?: string;
  page?: string;
  role?: string;
};

export type AssistantResult = {
  text: string;
  blocks?: RichBlock[];
  meta?: Record<string, unknown>;
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
  {
    keys: ["بلک", "blackout", "تاریک", "خواب", "نور نده", "اتاق خواب"],
    styles: ["shade", "zebra", "roman"],
    note: "برای کنترل نور و اتاق خواب، شید بلک‌اوت، زبرا یا رومن مناسب‌اند.",
  },
  {
    keys: ["شفاف", "تور", "نورگیر", "روشن", "sheer"],
    styles: ["drape", "wave", "pleated-sheer"],
    note: "برای فضای پرنور، پرده شفاف/تور حس سبکی می‌دهد.",
  },
  {
    keys: ["کلاسیک", "لوکس", "مجلل", "مجلسی"],
    styles: ["drape", "roman", "velvet"],
    note: "برای کلاسیک، چین‌دار یا رومن شیک‌تر می‌نشیند.",
  },
  {
    keys: ["مدرن", "ساده", "مینیمال"],
    styles: ["panel", "turk-panel", "shade", "zebra", "roller"],
    note: "برای مدرن، ترک‌پنل، شید یا زبرا خطوط تمیزتری دارند.",
  },
  {
    keys: ["اداری", "دفتر", "تجاری", "شرکت"],
    styles: ["zebra", "shade", "roller", "double"],
    note: "برای اداری زبرا یا شید کاربردی‌ترند.",
  },
  {
    keys: ["آشپزخانه", "kitchen"],
    styles: ["roman", "shade", "roller"],
    note: "برای آشپزخانه رومن یا شید جمع‌وجور است.",
  },
  {
    keys: ["نشیمن", "پذیرایی", "سالن", "living"],
    styles: ["drape", "roman", "zebra"],
    note: "برای نشیمن بسته به نور: چین‌دار، رومن یا زبرا.",
  },
  { keys: ["زبرا", "zebra"], styles: ["zebra"], note: "زبرا نور و حریم را با هم می‌دهد." },
  { keys: ["رومن", "roman"], styles: ["roman"], note: "رومن تاهای افقی مرتب دارد." },
  { keys: ["شید", "shade"], styles: ["shade", "double"], note: "شید برای کنترل نور عالی است." },
  {
    keys: ["ترک", "پنل", "turk", "panel"],
    styles: ["panel", "turk-panel"],
    note: "ترک‌پنل ظاهر مدرن دارد.",
  },
  {
    keys: ["پلیسه", "pleated"],
    styles: ["pleated", "pleated-manual"],
    note: "پلیسه برای پنجره متوسط مناسب است.",
  },
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[یي]/g, "ی")
    .replace(/[کك]/g, "ک")
    .trim();
}

function detectIntent(text: string): Intent {
  const t = normalize(text);
  if (GREETING_RE.test(t) || t.length < 3) return "greeting";
  if (THANKS_RE.test(t)) return "thanks";
  if (/کمک|چطور|چگونه|راهنما|help/.test(t)) return "help";
  if (/سلیقه|دوست دارم|ترجیح|رنگ مورد|طرح مورد|کلاسیک|مدرن/.test(t) && !/پیشنهاد|میخوام|اتاق/.test(t))
    return "taste";
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
    "سلام",
    "برای",
    "یک",
    "یه",
    "از",
    "به",
    "با",
    "که",
    "می",
    "می‌خوام",
    "میخوام",
    "لطفا",
    "پیشنهاد",
    "بده",
    "کن",
    "مدل",
    "پرده",
    "قالب",
    "بساز",
  ]);
  return normalize(text)
    .split(/[\s,،.؟!]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !stop.has(w));
}

async function loadCatalog() {
  const [categories, models, projects, modelCount, orderCount, requestCount, products] =
    await Promise.all([
      prisma.curtainCategory.findMany({ orderBy: { order: "asc" }, take: 40 }),
      prisma.curtainModel.findMany({ orderBy: { updatedAt: "desc" }, take: 120 }),
      prisma.project.findMany({ orderBy: { updatedAt: "desc" }, take: 12 }).catch(() => []),
      prisma.curtainModel.count(),
      prisma.order.count().catch(() => 0),
      prisma.consultationRequest.count().catch(() => 0),
      prisma.product.findMany({ orderBy: { updatedAt: "desc" }, take: 20 }).catch(() => []),
    ]);
  return { categories, models, projects, modelCount, orderCount, requestCount, products };
}

function modelCards(
  list: Array<{
    id: string;
    name: string;
    code: string | null;
    color: string | null;
    image: string | null;
    categorySlug: string | null;
  }>
): RichBlock {
  return {
    type: "model_cards",
    items: list.map((m) => ({
      id: m.id,
      title: m.name,
      subtitle: [m.code, m.color, m.categorySlug].filter(Boolean).join(" · "),
      image: m.image,
      href: `/curtain/${m.id}`,
    })),
  };
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

function pack(text: string, blocks?: RichBlock[], meta?: Record<string, unknown>): AssistantResult {
  return { text, blocks, meta };
}

export async function buildConsultantReply(
  userText: string,
  history: ChatMessage[] = []
): Promise<AssistantResult> {
  const intent = detectIntent(userText);
  const { categories, models, projects, modelCount } = await loadCatalog();
  const meta = { intent, agent: "design_consultant" };

  if (intent === "greeting") {
    return pack(
      `سلام 👋 من دستیار طراحی **پرده آنتیک** هستم.\n\n` +
        `برای پیشنهاد دقیق بگو:\n` +
        `• فضا کجاست؟ (نشیمن، خواب، آشپزخانه، اداری)\n` +
        `• نور را تاریک می‌خواهی یا روشن؟\n` +
        `• حس دکوراسیون؟ (مدرن، کلاسیک، مینیمال)`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن مدرن", message: "نشیمن مدرن می‌خوام" },
            { label: "اتاق خواب تاریک", message: "اتاق خواب بلک‌اوت می‌خوام" },
            { label: "کلاسیک لوکس", message: "سلیقه‌م کلاسیک و لوکسه" },
            { label: "مشاهده کاتالوگ", message: "سبک‌های پرده را نشان بده" },
          ],
        },
        {
          type: "link_buttons",
          items: [
            { label: "کاتالوگ کامل", href: "/catalog" },
            { label: "نمونه‌های اجرا", href: "/projects" },
            { label: "تماس و مشاوره", href: "/contact" },
          ],
        },
      ],
      meta
    );
  }

  if (intent === "thanks") {
    return pack("قابل نداشت. هر وقت خواستی رنگ یا طرح را عوض کنیم همین‌جا بگو.", undefined, meta);
  }

  if (intent === "help" || intent === "taste") {
    const top = models.slice(0, 4);
    return pack(
      intent === "taste"
        ? `سلیقه‌ات را گرفتم. برای اینکه مدل واقعی پیشنهاد بدهم بگو **فضا** کجاست و **نور** را تاریک می‌خواهی یا روشن؟`
        : `می‌توانم از کاتالوگ زنده مدل پیشنهاد بدهم. فضا و میزان نور را بگو تا دقیق‌تر انتخاب کنیم.`,
      [
        ...(top.length ? [modelCards(top)] : []),
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن روشن", message: "نشیمن روشن و مدرن" },
            { label: "خواب تاریک", message: "اتاق خواب تاریک بلک‌اوت" },
            { label: "اداری", message: "پرده اداری زبرا" },
          ],
        },
        {
          type: "link_buttons",
          items: [
            { label: "باز کردن کاتالوگ", href: "/catalog" },
            { label: "درخواست مشاوره", href: "/contact" },
          ],
        },
      ],
      meta
    );
  }

  if (intent === "about_price") {
    return pack(
      `قیمت بر اساس **ابعاد + پارچه + سبک نصب** حساب می‌شود و در سایت عدد ثابت ندارد.\nمدل را انتخاب کن، بعد از صفحه تماس درخواست بده تا اندازه و قیمت دقیق بگیری.`,
      [{ type: "link_buttons", items: [{ label: "فرم مشاوره و قیمت", href: "/contact" }] }],
      meta
    );
  }

  if (intent === "about_install" || intent === "about_contact") {
    return pack(
      `مسیر استاندارد:\n۱) انتخاب مدل از کاتالوگ\n۲) درخواست در صفحه تماس\n۳) بازدید، اندازه‌گیری و نصب`,
      [
        {
          type: "link_buttons",
          items: [
            { label: "کاتالوگ", href: "/catalog" },
            { label: "تماس / مشاوره", href: "/contact" },
            { label: "نمونه‌های اجرا", href: "/projects" },
          ],
        },
      ],
      meta
    );
  }

  if (intent === "list_styles") {
    const lines = categories.map((c) => `• **${c.name}**`).join("\n");
    return pack(
      lines ? `سبک‌های فعال کاتالوگ:\n${lines}\n\nکدام فضا را می‌خواهی دکور کنیم؟` : "هنوز دسته‌ای ثبت نشده.",
      [
        {
          type: "link_buttons",
          items: categories.slice(0, 8).map((c) => ({
            label: c.name,
            href: `/catalog?category=${c.slug}`,
          })),
        },
      ],
      meta
    );
  }

  if (intent === "list_models") {
    const sample = models.slice(0, 6);
    return pack(
      `**${modelCount} مدل** در کاتالوگ موجود است. چند مورد اخیر:`,
      [
        modelCards(sample),
        {
          type: "link_buttons",
          items: [{ label: "مشاهده همه در کاتالوگ", href: "/catalog" }],
        },
      ],
      meta
    );
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
    return pack(
      "کاتالوگ هنوز خالی است. از صفحه تماس می‌توانی مشاوره بگیری.",
      [{ type: "link_buttons", items: [{ label: "تماس", href: "/contact" }] }],
      meta
    );
  }

  const scored = models
    .map((m) => ({ m, score: scoreModel(m, preferred, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = (scored.length ? scored : models.map((m) => ({ m, score: 0 })))
    .slice(0, 6)
    .map((x) => x.m);

  if (intent === "recommend" || scored.length > 0) {
    const note =
      hints.map((h) => h.note).join(" ") ||
      "با توجه به حرف‌هات، این مدل‌ها از کاتالوگ نزدیک‌ترند:";
    const blocks: RichBlock[] = [
      modelCards(top),
      {
        type: "quick_replies",
        items: [
          { label: "گزینه تاریک‌تر", message: "نسخه تاریک‌تر یا بلک‌اوت می‌خوام" },
          { label: "گزینه روشن‌تر", message: "نسخه روشن‌تر و شفاف‌تر" },
          { label: "مشاوره نصب", message: "برای نصب و قیمت راهنمایی کن" },
        ],
      },
      {
        type: "link_buttons",
        items: [
          { label: "کاتالوگ کامل", href: "/catalog" },
          { label: "درخواست مشاوره", href: "/contact" },
        ],
      },
    ];
    if (projects.length) {
      blocks.push({
        type: "link_buttons",
        items: [{ label: "نمونه‌های اجرا شده", href: "/projects" }],
      });
    }
    return pack(`${note}\nروی هر کارت بزن تا جزئیات مدل را ببینی.`, blocks, meta);
  }

  return pack(
    `برای پیشنهاد دقیق‌تر بگو فضا و نور چطور است — مثلاً «نشیمن مدرن روشن» یا «خواب بلک‌اوت».`,
    [
      {
        type: "quick_replies",
        items: [
          { label: "نشیمن مدرن", message: "نشیمن مدرن" },
          { label: "خواب بلک‌اوت", message: "اتاق خواب بلک‌اوت" },
          { label: "زبرا اداری", message: "زبرا برای دفتر" },
        ],
      },
    ],
    meta
  );
}

/** اکشن‌های ادمین با دسترسی خواندن/نوشتن دیتابیس */
async function runAdminAction(
  userText: string,
  context: AssistantContext
): Promise<AssistantResult | null> {
  const t = normalize(userText);
  const path = context.path || "";

  // --- WRITE: وضعیت درخواست مشاوره ---
  const statusMatch = t.match(
    /(?:وضعیت|status)\s*(?:درخواست)?\s*([a-z0-9_-]{6,})\s*(?:را|=|به)?\s*(جدید|new|انجام|done|بسته|closed|درحال|processing)/i
  );
  if (statusMatch) {
    const idPart = statusMatch[1];
    const stRaw = statusMatch[2];
    const statusMap: Record<string, string> = {
      جدید: "new",
      new: "new",
      انجام: "done",
      done: "done",
      بسته: "closed",
      closed: "closed",
      درحال: "processing",
      processing: "processing",
    };
    const status = statusMap[stRaw] || stRaw;
    const found = await prisma.consultationRequest.findFirst({
      where: { id: { contains: idPart } },
    });
    if (!found) {
      return pack(`درخواستی با شناسه شبیه «${idPart}» پیدا نشد.`);
    }
    const updated = await prisma.consultationRequest.update({
      where: { id: found.id },
      data: { status },
    });
    return pack(
      `وضعیت درخواست **${updated.name}** به **${updated.status}** تغییر کرد.`,
      [{ type: "link_buttons", items: [{ label: "لیست درخواست‌ها", href: "/admin/requests" }] }],
      { action: "update_consultation_status", id: updated.id }
    );
  }

  // --- WRITE: دسته کاتالوگ جدید ---
  if (/دسته\s*جدید|افزودن\s*دسته|create\s*category/.test(t)) {
    const nameM = userText.match(/نام\s*[:：=]?\s*([^,\n]+)/i);
    const slugM = userText.match(/(?:slug|شناسه)\s*[:：=]?\s*([a-z0-9-]+)/i);
    if (nameM && slugM) {
      const name = nameM[1].trim();
      const slug = slugM[1].trim().toLowerCase();
      const row = await prisma.curtainCategory.upsert({
        where: { slug },
        create: { name, slug, order: 99 },
        update: { name },
      });
      return pack(
        `دسته **${row.name}** (\\`${row.slug}\\`) ذخیره شد.`,
        [{ type: "link_buttons", items: [{ label: "مدیریت دسته‌ها", href: "/admin/categories" }] }],
        { action: "upsert_category", slug }
      );
    }
    return pack(
      `برای ساخت دسته بنویس:\n` +
        `دسته جدید نام: رومن شناسه: roman`
    );
  }

  // --- READ: سفارش‌ها ---
  if (/سفارش|orders?/.test(t) || path.includes("order")) {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 });
    if (!orders.length) return pack("سفارشی ثبت نشده.");
    const lines = orders
      .map(
        (o) =>
          `• **${o.customerName}** — ${o.amountToman.toLocaleString("fa-IR")} تومان — ${o.status}`
      )
      .join("\n");
    return pack(`آخرین سفارش‌ها:\n${lines}`, [
      { type: "link_buttons", items: [{ label: "صفحه سفارش‌ها", href: "/admin/orders" }] },
    ]);
  }

  // --- READ: درخواست‌ها ---
  if (/درخواست|مشاوره|inbox|request/.test(t) || path.includes("request")) {
    const reqs = await prisma.consultationRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    if (!reqs.length) return pack("درخواستی نیست.");
    const lines = reqs
      .map(
        (r) =>
          `• **${r.name}** (${r.phone}) — ${r.status} — id: \\`${r.id.slice(0, 8)}\\``
      )
      .join("\n");
    return pack(
      `آخرین درخواست‌ها:\n${lines}\n\nبرای تغییر وضعیت:\nوضعیت درخواست ${reqs[0].id.slice(0, 8)} را انجام`,
      [{ type: "link_buttons", items: [{ label: "پنل درخواست‌ها", href: "/admin/requests" }] }]
    );
  }

  // --- READ: مدل‌ها ---
  if (/لیست\s*مدل|مدل‌ها|models/.test(t) || (path.includes("models") && /لیست|چند|تعداد/.test(t))) {
    const models = await prisma.curtainModel.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
    });
    const count = await prisma.curtainModel.count();
    return pack(`**${count}** مدل در دیتابیس. آخرین‌ها:`, [
      modelCards(models),
      { type: "link_buttons", items: [{ label: "مدیریت مدل‌ها", href: "/admin/models" }] },
    ]);
  }

  // --- READ: محصولات فروشگاه ---
  if (/محصول|فروشگاه|product/.test(t) || path.includes("product")) {
    const products = await prisma.product.findMany({ orderBy: { updatedAt: "desc" }, take: 6 });
    const count = await prisma.product.count();
    const lines = products.map((p) => `• **${p.name}** — ${p.price.toLocaleString("fa-IR")} ت`).join("\n");
    return pack(`**${count}** محصول اکسسوری.\n${lines || "—"}`, [
      { type: "link_buttons", items: [{ label: "محصولات", href: "/admin/products" }] },
    ]);
  }

  return null;
}

export async function buildAdminAssistantReply(
  userText: string,
  _history: ChatMessage[] = [],
  context: AssistantContext = {}
): Promise<AssistantResult> {
  const t = normalize(userText);
  const path = context.path || "";
  const page = context.page || path || "پنل";

  const acted = await runAdminAction(userText, context);
  if (acted) return acted;

  const { categories, models, modelCount, requestCount, orderCount } = await loadCatalog();

  if (/وضعیت|خلاصه|داشبورد|چیکار/.test(t) || path === "/admin") {
    return pack(
      `📊 وضعیت زنده دیتابیس:\n` +
        `• مدل پرده: **${modelCount}**\n` +
        `• دسته کاتالوگ: **${categories.length}**\n` +
        `• سفارش: **${orderCount}**\n` +
        `• درخواست مشاوره: **${requestCount}**\n\n` +
        `می‌توانم لیست بخوانم یا بنویسم — مثلاً:\n` +
        `• «لیست مدل‌ها»\n` +
        `• «درخواست‌های مشاوره»\n` +
        `• «دسته جدید نام: زبرا شناسه: zebra»\n` +
        `• «وضعیت درخواست ab12cd را انجام»`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "لیست مدل‌ها", message: "لیست مدل‌ها" },
            { label: "درخواست‌ها", message: "درخواست‌های مشاوره" },
            { label: "سفارش‌ها", message: "آخرین سفارش‌ها" },
          ],
        },
        {
          type: "link_buttons",
          items: [
            { label: "مدل‌ها", href: "/admin/models" },
            { label: "درخواست‌ها", href: "/admin/requests" },
            { label: "سفارش‌ها", href: "/admin/orders" },
          ],
        },
      ]
    );
  }

  if (GREETING_RE.test(t)) {
    return pack(
      `سلام — دستیار ادمین آنتیک. الان روی **${page}** هستی.\n` +
        `خواندن و نوشتن دیتابیس را پشتیبانی می‌کنم. بگو چه کار کنی.`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "وضعیت سایت", message: "خلاصه وضعیت" },
            { label: "لیست مدل", message: "لیست مدل‌ها" },
            { label: "درخواست‌ها", message: "درخواست‌های مشاوره" },
          ],
        },
      ]
    );
  }

  if (/قالب|chroma|کروم|سبز|رندر/.test(t)) {
    return pack(
      `ساخت قالب chroma:\n۱) برو پنجره مجازی\n۲) روی سبک **ساخت قالب** بزن\n۳) پیش‌نمایش سبز را چک کن\n\nعکس پارچه مدل بدون برچسب کد باشد.`,
      [{ type: "link_buttons", items: [{ label: "پنجره مجازی", href: "/admin/window" }] }]
    );
  }

  if (/مدل|پارچه|کاتالوگ|افزودن مدل/.test(t) || path.includes("models")) {
    return pack(
      `ثبت مدل:\n۱) /admin/models → افزودن\n۲) فقط تکه پارچه\n۳) کد محصول + دسته نصب\n\nالان **${modelCount}** مدل در DB است. برای دیدن لیست بگو «لیست مدل‌ها».`,
      [
        modelCards(models.slice(0, 4)),
        { type: "link_buttons", items: [{ label: "صفحه مدل‌ها", href: "/admin/models" }] },
      ]
    );
  }

  if (/متن|توضیح|کپی|محتوا|بنویس|کپشن/.test(t)) {
    const sample = models[0];
    const code = sample?.code || "CODE";
    const name = sample?.name || "نام مدل";
    return pack(
      `نمونه متن:\n\n**عنوان:** پرده ${name} — کد ${code}\n**کوتاه:** پارچه منتخب کاتالوگ؛ مناسب فضای مدرن.\n**بلند:** بافت واقعی پارچه در پیش‌نمایش نصب دیده می‌شود. نصب پس از اندازه‌گیری.`
    );
  }

  if (/دسته|زیردسته|category/.test(t) || path.includes("categor")) {
    const lines = categories.slice(0, 12).map((c) => `• ${c.name} (\\`${c.slug}\\`)`).join("\n");
    return pack(
      `دسته‌های فعلی:\n${lines || "—"}\n\nساخت: «دسته جدید نام: رومن شناسه: roman»`,
      [{ type: "link_buttons", items: [{ label: "دسته‌بندی کاتالوگ", href: "/admin/categories" }] }]
    );
  }

  return pack(
    `روی **${page}** هستی. می‌توانم:\n` +
      `• خواندن: مدل، سفارش، درخواست، محصول\n` +
      `• نوشتن: وضعیت درخواست، ساخت/بروزرسانی دسته\n\n` +
      `دقیق بگو چه شود — مثلاً «لیست سفارش‌ها» یا «خلاصه وضعیت».`,
    [
      {
        type: "quick_replies",
        items: [
          { label: "خلاصه وضعیت", message: "خلاصه وضعیت" },
          { label: "لیست مدل‌ها", message: "لیست مدل‌ها" },
          { label: "درخواست‌ها", message: "درخواست‌های مشاوره" },
        ],
      },
    ]
  );
}

export async function buildAssistantReply(
  agentName: string,
  userText: string,
  history: ChatMessage[] = [],
  context: AssistantContext = {}
): Promise<AssistantResult> {
  if (agentName === "admin_assistant") {
    return buildAdminAssistantReply(userText, history, context);
  }
  return buildConsultantReply(userText, history);
}
