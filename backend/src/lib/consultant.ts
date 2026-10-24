/** Dual assistant: warm design chat + admin DB tools. Never dump raw paths in text. */
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

const GREETING_RE =
  /^(سلام|درود|hi|hello|hey|سلام علیکم|صبح بخیر|عصر بخیر|شب بخیر|خوبی|چطوری)[\s!.؟?]*$/i;
const THANKS_RE = /^(ممنون|مرسی|تشکر|thanks|thank you|خداحافظ|bye)[\s!.؟?]*$/i;

/** هر کلید → اسلاگ واقعی دسته در DB */
const STYLE_HINTS: { keys: string[]; slugs: string[]; tip: string }[] = [
  {
    keys: ["بلک", "blackout", "تاریک", "خواب", "نور نده", "اتاق خواب"],
    slugs: ["shade", "zebra", "roman"],
    tip: "برای اتاق خواب معمولاً شید بلک‌اوت یا زبرا انتخاب می‌شود تا صبح راحت بخوابی.",
  },
  {
    keys: ["شفاف", "تور", "نورگیر", "روشن", "sheer"],
    slugs: ["sheer", "silk"],
    tip: "تور و حریر نور را نرم رد می‌کنند و فضا را دلباز نشان می‌دهند.",
  },
  {
    keys: ["کلاسیک", "لوکس", "مجلل", "مجلسی", "سلیقه"],
    slugs: ["velvet", "roman", "silk", "sheer"],
    tip: "برای حس کلاسیک، مخمل و رومن با تور روی هم خیلی شیک می‌نشینند.",
  },
  {
    keys: ["مدرن", "ساده", "مینیمال"],
    slugs: ["turk-panel", "shade", "zebra", "roller", "cubism"],
    tip: "خط‌های تمیز ترک‌پنل، شید یا زبرا با دکوراسیون مدرن جورتر است.",
  },
  {
    keys: ["اداری", "دفتر", "تجاری", "شرکت"],
    slugs: ["zebra", "shade", "roller", "office"],
    tip: "در دفتر زبرا و شید هم حریم می‌دهند هم نور را کنترل می‌کنند.",
  },
  {
    keys: ["آشپزخانه", "kitchen"],
    slugs: ["kitchen", "roman", "shade", "roller"],
    tip: "آشپزخانه بهتر است پرده‌اش جمع‌وجور باشد — رومن یا شید.",
  },
  {
    keys: ["نشیمن", "پذیرایی", "سالن", "living"],
    slugs: ["velvet", "sheer", "roman", "zebra", "silk"],
    tip: "پذیرایی اغلب ترکیب تور + لایه سنگین‌تر (مخمل یا رومن) جواب می‌دهد.",
  },
  { keys: ["زبرا", "zebra"], slugs: ["zebra"], tip: "زبرا نوار روشن و تیره دارد؛ هم نور می‌آید هم دید کم می‌شود." },
  { keys: ["رومن", "roman"], slugs: ["roman"], tip: "رومن تاهای افقی مرتب دارد و برای پنجره متوسط عالی است." },
  { keys: ["شید", "shade"], slugs: ["shade"], tip: "شید برای کنترل دقیق نور ساخته شده؛ بلک‌اوت یا اسکرین." },
  {
    keys: ["ترک", "پنل", "turk", "panel"],
    slugs: ["turk-panel"],
    tip: "ترک‌پنل ظاهر مدرن و تخت دارد.",
  },
  {
    keys: ["پلیسه", "pleated"],
    slugs: ["pleated"],
    tip: "پلیسه مثل آکاردئون جمع می‌شود و برای پنجره‌های معمولی مناسب است.",
  },
  { keys: ["مخمل", "velvet"], slugs: ["velvet"], tip: "مخمل حس لوکس و سنگینی به فضا می‌دهد." },
  { keys: ["کرکره", "roller", "رول"], slugs: ["roller"], tip: "کرکره‌ای/رولر برای کنترل نور کاربردی است." },
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[یي]/g, "ی")
    .replace(/[کك]/g, "ک")
    .trim();
}

function detectHints(text: string) {
  const t = normalize(text);
  return STYLE_HINTS.filter((h) => h.keys.some((k) => t.includes(normalize(k))));
}

function extractTerms(text: string): string[] {
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
    "دارید",
    "دارین",
    "هست",
    "چیست",
    "چی",
  ]);
  return normalize(text)
    .split(/[\s,،.؟!]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !stop.has(w));
}

function pack(text: string, blocks?: RichBlock[], meta?: Record<string, unknown>): AssistantResult {
  return { text, blocks, meta };
}

function modelCards(
  list: Array<{
    id: string;
    name: string;
    code: string | null;
    color: string | null;
    image: string | null;
    categorySlug: string | null;
    fabric?: string | null;
  }>
): RichBlock {
  return {
    type: "model_cards",
    items: list.map((m) => ({
      id: m.id,
      title: m.name || m.code || "مدل",
      subtitle: [m.code, m.color || m.fabric, m.categorySlug].filter(Boolean).join(" · "),
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
  preferredSlugs: string[],
  terms: string[]
) {
  const slug = (m.categorySlug || "").toLowerCase();
  const sub = (m.subcategory || "").toLowerCase();
  const blob = normalize(
    `${m.name} ${m.code || ""} ${m.fabric || ""} ${m.color || ""} ${m.description || ""} ${m.material || ""} ${slug} ${sub}`
  );
  let score = 0;
  for (const s of preferredSlugs) {
    const ns = normalize(s);
    if (slug === ns) score += 10;
    else if (slug.includes(ns) || sub.includes(ns)) score += 6;
  }
  for (const t of terms) {
    if (blob.includes(t)) score += 2;
  }
  return score;
}

async function loadCatalog() {
  const [categories, models, modelCount, orderCount, requestCount] = await Promise.all([
    prisma.curtainCategory.findMany({ orderBy: { order: "asc" }, take: 40 }),
    prisma.curtainModel.findMany({ orderBy: { updatedAt: "desc" }, take: 150 }),
    prisma.curtainModel.count(),
    prisma.order.count().catch(() => 0),
    prisma.consultationRequest.count().catch(() => 0),
  ]);
  return { categories, models, modelCount, orderCount, requestCount };
}

function historyBlob(history: ChatMessage[]) {
  return history
    .filter((m) => m.role === "user")
    .slice(-6)
    .map((m) => m.content)
    .join(" ");
}

export async function buildConsultantReply(
  userText: string,
  history: ChatMessage[] = []
): Promise<AssistantResult> {
  const t = normalize(userText);
  const { categories, models, modelCount } = await loadCatalog();
  const fullContext = `${historyBlob(history)} ${userText}`;
  const hints = detectHints(fullContext);
  const preferred = [...new Set(hints.flatMap((h) => h.slugs))];
  const terms = extractTerms(userText);
  const tip = hints.map((h) => h.tip).filter(Boolean)[0];

  // —— احوال‌پرسی ——
  if (GREETING_RE.test(t) || t.length < 2) {
    return pack(
      "سلام، خوش اومدی 🌿\nمن اینجام که کمکت کنم پرده‌ای انتخاب کنی که هم با سلیقه‌ت جور دربیاد هم با نور اتاقت.\n\nراستش را بگو: **کدام اتاق** است و دوست داری فضا **تاریک** بماند یا **روشن و پرنور**؟",
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن روشن", message: "نشیمن روشن و دلباز" },
            { label: "خواب تاریک", message: "اتاق خواب تاریک بلک‌اوت" },
            { label: "کلاسیک لوکس", message: "پذیرایی کلاسیک و لوکس" },
            { label: "دفتر کار", message: "پرده اداری برای دفتر" },
          ],
        },
      ]
    );
  }

  if (THANKS_RE.test(t)) {
    return pack("قابلی نداشت 💛 هر وقت خواستی دوباره تنظیمش می‌کنیم. موفق باشی.");
  }

  if (/قیمت|هزینه|مبلغ/.test(t)) {
    return pack(
      "قیمت پرده مثل لباس آماده روی تگ نیست — به **عرض و ارتفاع پنجره**، نوع پارچه و سبک نصب بستگی دارد.\n\nبهترین کار: مدلی که دوست داری را انتخاب کن، بعد از صفحه تماس ابعاد تقریبی را بفرست تا برات برآورد دقیق بفرستیم.",
      [
        {
          type: "link_buttons",
          items: [
            { label: "درخواست مشاوره و قیمت", href: "/contact" },
            { label: "کاتالوگ", href: "/catalog" },
          ],
        },
      ]
    );
  }

  if (/نصب|اندازه|بازدید|اجرا/.test(t)) {
    return pack(
      "نصب استاندارد ما این‌طور پیش می‌رود:\n۱) انتخاب مدل از کاتالوگ\n۲) هماهنگی بازدید و اندازه‌گیری\n۳) دوخت/آماده‌سازی و نصب در محل\n\nاگر مدل را انتخاب کردی، از تماس اقدام کن تا نوبت بازدید بگیری.",
      [
        {
          type: "link_buttons",
          items: [
            { label: "تماس و نوبت", href: "/contact" },
            { label: "نمونه‌های اجرا شده", href: "/projects" },
          ],
        },
      ]
    );
  }

  if (/تماس|مشاوره|شماره|فرم/.test(t)) {
    return pack("حتماً — از صفحه تماس می‌تونی درخواستت را ثبت کنی. کارشناس ما سریع جواب می‌دهد.", [
      { type: "link_buttons", items: [{ label: "رفتن به تماس", href: "/contact" }] },
    ]);
  }

  if (/سبک|انواع|دسته|چی دارید|چه پرده/.test(t) && preferred.length === 0) {
    return pack(
      categories.length
        ? `الان این سبک‌ها را در کاتالوگ داریم:\n${categories
            .slice(0, 12)
            .map((c) => `• **${c.name}**`)
            .join("\n")}\n\nبگو سراغ کدام فضا می‌روی تا همان را برایت باز کنم.`
        : "هنوز دسته‌ای ثبت نشده.",
      [
        {
          type: "link_buttons",
          items: categories.slice(0, 6).map((c) => ({
            label: c.name,
            href: `/catalog?category=${c.slug}`,
          })),
        },
      ]
    );
  }

  // —— پیشنهاد مدل ——
  if (!models.length) {
    return pack("کاتالوگ هنوز خالی است. از تماس می‌تونی مشاوره بگیری.", [
      { type: "link_buttons", items: [{ label: "تماس", href: "/contact" }] },
    ]);
  }

  const scored = models
    .map((m) => ({ m, score: scoreModel(m, preferred, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // فقط مدل‌هایی که واقعاً امتیاز دارند؛ اگر سبک مشخص است و چیزی نیست، نگوییم «نزدیک‌ترین» تصادفی
  if (preferred.length > 0 && scored.length === 0) {
    return pack(
      (tip ? tip + "\n\n" : "") +
        `متأسفانه الان مدلی با این مشخصات در کاتالوگ ثبت نشده. می‌تونی از کاتالوگ کامل ببینی یا از تماس بپرسی — شاید مدل جدید اضافه شده باشد.`,
      [
        {
          type: "link_buttons",
          items: [
            { label: "کاتالوگ", href: "/catalog" },
            { label: "تماس", href: "/contact" },
          ],
        },
        {
          type: "quick_replies",
          items: [
            { label: "زبرا ببینم", message: "زبرا دارید؟" },
            { label: "شید ببینم", message: "شید بلک‌اوت" },
            { label: "رومن", message: "رومن کلاسیک" },
          ],
        },
      ]
    );
  }

  // بدون سرنخ کافی → سؤال راهنما، نه لیست تصادفی
  if (scored.length === 0) {
    return pack(
      "دوست دارم دقیق‌تر کمکت کنم 😊\nفقط بگو:\n• اتاق کجاست؟\n• نور را بیشتر می‌خواهی یا کمتر؟\n• حس مدرن می‌خواهی یا کلاسیک؟",
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن کلاسیک", message: "نشیمن کلاسیک لوکس" },
            { label: "خواب تاریک", message: "اتاق خواب تاریک" },
            { label: "شید می‌خوام", message: "شید برای کنترل نور" },
            { label: "زبرا می‌خوام", message: "زبرا اداری یا خانگی" },
          ],
        },
      ]
    );
  }

  const top = scored.slice(0, 4).map((x) => x.m);
  const intro =
    tip ||
    (preferred.length
      ? "طبق چیزی که گفتی، این چند مدل از کاتالوگ واقعاً به کارت می‌آید:"
      : "چند مدل مرتبط پیدا کردم:");

  const teach =
    preferred.includes("shade") || /شید/.test(t)
      ? "\n\nنکته کوچک: شید را می‌شود تا بالا جمع کرد؛ برای مطالعه یا تلویزیون خیلی راحت است."
      : preferred.includes("zebra") || /زبرا/.test(t)
        ? "\n\nنکته کوچک: در زبرا با چرخاندن نوارها می‌توانی بین شفاف و مات جابه‌جا شوی."
        : preferred.includes("roman") || /رومن/.test(t)
          ? "\n\nنکته کوچک: رومن وقتی بالا می‌رود تاهای پارچه‌ای مرتب می‌سازد و ظاهر رسمی‌تری دارد."
          : "\n\nاگر رنگ دیوار یا اندازه پنجره را بگی، همان را تنگ‌تر می‌کنم.";

  return pack(`${intro}${teach}\n\nروی کارت بزن تا مدل را کامل ببینی ✨`, [
    modelCards(top),
    {
      type: "quick_replies",
      items: [
        { label: "تاریک‌تر", message: "نسخه تاریک‌تر یا بلک‌اوت" },
        { label: "روشن‌تر", message: "نسخه روشن‌تر و شفاف" },
        { label: "قیمت و نصب", message: "درباره قیمت و نصب بگو" },
      ],
    },
    {
      type: "link_buttons",
      items: [
        { label: "کاتالوگ کامل", href: "/catalog" },
        { label: "مشاوره حضوری", href: "/contact" },
      ],
    },
  ]);
}

async function runAdminAction(
  userText: string,
  context: AssistantContext
): Promise<AssistantResult | null> {
  const t = normalize(userText);
  const path = context.path || "";

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
    if (!found) return pack(`درخواستی با شناسه شبیه «${idPart}» پیدا نشد.`);
    const updated = await prisma.consultationRequest.update({
      where: { id: found.id },
      data: { status },
    });
    return pack(`وضعیت درخواست **${updated.name}** → **${updated.status}**`, [
      { type: "link_buttons", items: [{ label: "درخواست‌ها", href: "/admin/requests" }] },
    ]);
  }

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
      return pack(`دسته **${row.name}** ذخیره شد.`, [
        { type: "link_buttons", items: [{ label: "دسته‌ها", href: "/admin/categories" }] },
      ]);
    }
    return pack("فرمت: دسته جدید نام: رومن شناسه: roman");
  }

  if (/سفارش|orders?/.test(t) || path.includes("order")) {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 });
    if (!orders.length) return pack("سفارشی ثبت نشده.");
    const lines = orders
      .map(
        (o) =>
          `• **${o.customerName}** — ${o.amountToman.toLocaleString("fa-IR")} ت — ${o.status}`
      )
      .join("\n");
    return pack(`آخرین سفارش‌ها:\n${lines}`, [
      { type: "link_buttons", items: [{ label: "سفارش‌ها", href: "/admin/orders" }] },
    ]);
  }

  if (/درخواست|مشاوره|inbox|request/.test(t) || path.includes("request")) {
    const reqs = await prisma.consultationRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    if (!reqs.length) return pack("درخواستی نیست.");
    const lines = reqs
      .map((r) => `• **${r.name}** (${r.phone}) — ${r.status} — \`${r.id.slice(0, 8)}\``)
      .join("\n");
    return pack(`آخرین درخواست‌ها:\n${lines}`, [
      { type: "link_buttons", items: [{ label: "پنل درخواست", href: "/admin/requests" }] },
    ]);
  }

  if (/لیست\s*مدل|مدل‌ها|models/.test(t) || (path.includes("models") && /لیست|چند|تعداد/.test(t))) {
    const list = await prisma.curtainModel.findMany({ orderBy: { updatedAt: "desc" }, take: 8 });
    const count = await prisma.curtainModel.count();
    return pack(`**${count}** مدل در دیتابیس:`, [
      modelCards(list),
      { type: "link_buttons", items: [{ label: "مدیریت مدل‌ها", href: "/admin/models" }] },
    ]);
  }

  if (/محصول|فروشگاه|product/.test(t) || path.includes("product")) {
    const products = await prisma.product.findMany({ orderBy: { updatedAt: "desc" }, take: 6 });
    const count = await prisma.product.count();
    const lines = products
      .map((p) => `• **${p.name}** — ${p.price.toLocaleString("fa-IR")} ت`)
      .join("\n");
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
      `وضعیت DB:\n• مدل: **${modelCount}**\n• دسته: **${categories.length}**\n• سفارش: **${orderCount}**\n• درخواست: **${requestCount}**\n\nدستورات: «لیست مدل‌ها» · «درخواست‌های مشاوره» · «دسته جدید نام: … شناسه: …»`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "لیست مدل‌ها", message: "لیست مدل‌ها" },
            { label: "درخواست‌ها", message: "درخواست‌های مشاوره" },
            { label: "سفارش‌ها", message: "آخرین سفارش‌ها" },
          ],
        },
      ]
    );
  }

  if (GREETING_RE.test(t)) {
    return pack(`سلام — روی **${page}** هستی. بگو چه کار دیتابیسی انجام شود.`, [
      {
        type: "quick_replies",
        items: [
          { label: "خلاصه وضعیت", message: "خلاصه وضعیت" },
          { label: "لیست مدل", message: "لیست مدل‌ها" },
        ],
      },
    ]);
  }

  if (/قالب|chroma|رندر/.test(t)) {
    return pack("از پنجره مجازی قالب chroma هر سبک را بساز.", [
      { type: "link_buttons", items: [{ label: "پنجره مجازی", href: "/admin/window" }] },
    ]);
  }

  if (/مدل|پارچه|افزودن مدل/.test(t) || path.includes("models")) {
    return pack(`ثبت مدل از /admin/models. الان **${modelCount}** مدل داریم.`, [
      modelCards(models.slice(0, 4)),
      { type: "link_buttons", items: [{ label: "مدل‌ها", href: "/admin/models" }] },
    ]);
  }

  if (/دسته|category/.test(t) || path.includes("categor")) {
    const lines = categories.slice(0, 12).map((c) => `• ${c.name}`).join("\n");
    return pack(`دسته‌ها:\n${lines}`, [
      { type: "link_buttons", items: [{ label: "دسته‌ها", href: "/admin/categories" }] },
    ]);
  }

  return pack(`روی **${page}** هستی. بگو: لیست مدل‌ها، سفارش‌ها، درخواست‌ها، یا ساخت دسته.`, [
    {
      type: "quick_replies",
      items: [
        { label: "خلاصه وضعیت", message: "خلاصه وضعیت" },
        { label: "لیست مدل‌ها", message: "لیست مدل‌ها" },
      ],
    },
  ]);
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
