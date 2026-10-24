/**
 * Customer design assistant — local NLU + catalog knowledge.
 * Answers product, style, install, price, shop, projects, and general questions
 * with warm Persian tone and rich UI blocks (cards / links / quick replies).
 */
import { prisma } from "./prisma.js";
import { buildAdminAssistantReply as buildAdminReply } from "./consultantAdmin.js";

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

function normalize(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[یي]/g, "ی")
    .replace(/[کك]/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/[ًٌٍَُِّْ]/g, "")
    .trim();
}

function pack(text: string, blocks?: RichBlock[], meta?: Record<string, unknown>): AssistantResult {
  return { text, blocks, meta };
}

const STYLE_HINTS: { keys: string[]; slugs: string[]; tip: string }[] = [
  {
    keys: ["بلک", "blackout", "تاریک", "خواب", "نور نده", "اتاق خواب", "سیاه"],
    slugs: ["shade", "zebra", "roman"],
    tip: "برای اتاق خواب معمولاً شید بلک‌اوت یا زبرا انتخاب می‌شود تا صبح راحت بخوابی.",
  },
  {
    keys: ["شفاف", "تور", "نورگیر", "روشن", "sheer", "حریر", "دلباز"],
    slugs: ["sheer", "silk"],
    tip: "تور و حریر نور را نرم رد می‌کنند و فضا را دلباز نشان می‌دهند.",
  },
  {
    keys: ["کلاسیک", "لوکس", "مجلل", "مجلسی", "سلیقه", "سنتی"],
    slugs: ["velvet", "roman", "silk", "sheer"],
    tip: "برای حس کلاسیک، مخمل و رومن با تور روی هم خیلی شیک می‌نشینند.",
  },
  {
    keys: ["مدرن", "ساده", "مینیمال", "جوان"],
    slugs: ["turk-panel", "shade", "zebra", "roller", "cubism"],
    tip: "خط‌های تمیز ترک‌پنل، شید یا زبرا با دکوراسیون مدرن جورتر است.",
  },
  {
    keys: ["اداری", "دفتر", "تجاری", "شرکت", "محل کار"],
    slugs: ["zebra", "shade", "roller", "office"],
    tip: "در دفتر زبرا و شید هم حریم می‌دهند هم نور را کنترل می‌کنند.",
  },
  {
    keys: ["آشپزخانه", "kitchen"],
    slugs: ["kitchen", "roman", "shade", "roller"],
    tip: "آشپزخانه بهتر است پرده‌اش جمع‌وجور باشد — رومن یا شید.",
  },
  {
    keys: ["نشیمن", "پذیرایی", "سالن", "living", "هال"],
    slugs: ["velvet", "sheer", "roman", "zebra", "silk"],
    tip: "پذیرایی اغلب ترکیب تور + لایه ضخیم‌تر یا رومن جواب می‌دهد.",
  },
  {
    keys: ["شید", "shade"],
    slugs: ["shade"],
    tip: "شید را می‌شود تا بالا جمع کرد؛ برای مطالعه و تلویزیون خیلی راحت است.",
  },
  {
    keys: ["زبرا", "zebra"],
    slugs: ["zebra"],
    tip: "در زبرا با چرخاندن نوارها بین شفاف و مات جابه‌جا می‌شوی.",
  },
  {
    keys: ["رومن", "roman"],
    slugs: ["roman"],
    tip: "رومن وقتی بالا می‌رود تاهای مرتب می‌سازد و ظاهر رسمی‌تری دارد.",
  },
  {
    keys: ["پلیسه", "pleated"],
    slugs: ["pleated", "pleated-manual", "pleated-chain"],
    tip: "پلیسه بافت ظریف دارد و برای پنجره‌های متوسط عالی است.",
  },
  {
    keys: ["پنل", "ترک", "panel", "turk"],
    slugs: ["turk-panel", "panel"],
    tip: "ترک‌پنل خطوط عمودی تمیز و مدرن می‌دهد.",
  },
  {
    keys: ["کرکره", "رولر", "roller", "رول"],
    slugs: ["roller"],
    tip: "کرکره‌ای/رولر برای کنترل نور کاربردی است.",
  },
  {
    keys: ["مخمل", "velvet"],
    slugs: ["velvet"],
    tip: "مخمل عمق رنگی و حس لوکس می‌آورد؛ برای پذیرایی عالی است.",
  },
];

function detectHints(text: string) {
  const t = normalize(text);
  return STYLE_HINTS.filter((h) => h.keys.some((k) => t.includes(normalize(k))));
}

function extractTerms(text: string): string[] {
  const stop = new Set([
    "سلام", "درود", "برای", "یک", "یه", "از", "به", "با", "که", "می", "میخوام",
    "می‌خوام", "لطفا", "لطفاً", "پیشنهاد", "بده", "کن", "مدل", "پرده", "دارید",
    "دارین", "هست", "چیست", "چی", "آیا", "میشه", "میشود", "میتونم", "می‌تونم",
    "خواهش", "عالی", "خوب", "خیلی", "هم", "یا", "این", "آن", "اون", "رو",
  ]);
  return normalize(text)
    .split(/[\s,،.؟!؛:\/\\]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !stop.has(w));
}

type CatRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  mechanism: string | null;
  image: string | null;
  subcategories: unknown;
};
type ModelRow = {
  id: string;
  name: string;
  code: string | null;
  fabric: string | null;
  color: string | null;
  description: string | null;
  categorySlug: string | null;
  subcategory: string | null;
  material: string | null;
  image: string | null;
  installImage: string | null;
};
type ProjectRow = {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  categorySlug: string | null;
  subcategory: string | null;
};

async function loadCatalog() {
  const [categories, models, projects, modelCount, projectCount] = await Promise.all([
    prisma.curtainCategory.findMany({ orderBy: { order: "asc" }, take: 80 }),
    prisma.curtainModel.findMany({ orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.project.findMany({ orderBy: { updatedAt: "desc" }, take: 40 }),
    prisma.curtainModel.count(),
    prisma.project.count(),
  ]);
  return {
    categories: categories as CatRow[],
    models: models as ModelRow[],
    projects: projects as ProjectRow[],
    modelCount,
    projectCount,
  };
}

function modelCards(list: ModelRow[]): RichBlock {
  return {
    type: "model_cards",
    items: list.map((m) => ({
      id: m.id,
      title: m.name || m.code || "مدل",
      subtitle: [m.code, m.color || m.fabric, m.categorySlug].filter(Boolean).join(" · "),
      image: m.installImage || m.image,
      href: `/curtain/${m.id}`,
    })),
  };
}

function scoreModel(m: ModelRow, preferredSlugs: string[], terms: string[]) {
  const slug = (m.categorySlug || "").toLowerCase();
  const sub = (m.subcategory || "").toLowerCase();
  const blob = normalize(
    `${m.name} ${m.code || ""} ${m.fabric || ""} ${m.color || ""} ${m.description || ""} ${m.material || ""} ${slug} ${sub}`
  );
  let score = 0;
  for (const s of preferredSlugs) {
    const ns = normalize(s);
    if (slug === ns) score += 12;
    else if (slug.includes(ns) || sub.includes(ns)) score += 7;
  }
  for (const t of terms) {
    if (blob.includes(t)) score += 3;
    if ((m.code || "").toLowerCase().includes(t)) score += 5;
  }
  if (m.installImage || m.image) score += 0.5;
  return score;
}

function historyBlob(history: ChatMessage[]) {
  return history
    .filter((m) => m.role === "user")
    .slice(-8)
    .map((m) => m.content)
    .join(" ");
}

type Intent =
  | "greeting"
  | "thanks"
  | "price"
  | "install"
  | "catalog"
  | "categories"
  | "shop"
  | "projects"
  | "about"
  | "contact"
  | "care"
  | "compare"
  | "help"
  | "recommend"
  | "search"
  | "unknown";

function detectIntent(t: string): Intent {
  const n = normalize(t);
  if (/^(سلام|درود|hi|hello|hey|سلام علیکم|صبح بخیر|عصر بخیر|شب بخیر|خوبی|چطوری)[\s!.؟?]*$/i.test(n))
    return "greeting";
  if (/^(ممنون|مرسی|تشکر|thanks|thank you|خداحافظ|bye)[\s!.؟?]*$/i.test(n)) return "thanks";
  if (/قیمت|هزینه|مبلغ|چند|ارزان|گرون|بودجه/.test(n)) return "price";
  if (/نصب|اندازه|بازدید|اجرا|اندازه گیری|اندازه‌گیری|دوخت/.test(n)) return "install";
  if (/نمونه|پروژه|اجرا شده|گالری کار|نمونه کار/.test(n)) return "projects";
  if (/فروشگاه|اکسسوری|یراق|قلاب|ریله|ریسمان|محصول/.test(n)) return "shop";
  if (/درباره|شما کی|شرکت|آنتیک کی|سابقه|اعتماد/.test(n)) return "about";
  if (/تماس|آدرس|تلفن|واتساپ|محل|شعبه|ساعت کار/.test(n)) return "contact";
  if (/شستشو|نگهداری|تمیز|لکه|مراقبت/.test(n)) return "care";
  if (/تفاوت|فرق|مقایسه|کدام بهتر|کدوم بهتر/.test(n)) return "compare";
  if (/دسته|انواع پرده|چه مدل|چه سبک|لیست دسته/.test(n)) return "categories";
  if (/کاتالوگ|همه مدل|ببینم/.test(n)) return "catalog";
  if (/کمک|راهنما|چیکار|چه کار|چطور کار/.test(n)) return "help";
  if (/پیشنهاد|پیشنهاد بده|چی بخرم|چیه خوب|مناسب/.test(n)) return "recommend";
  if (n.length >= 2) return "search";
  return "unknown";
}

const FAQ_REPLIES: { keys: string[]; answer: string; links?: Array<{ label: string; href: string }> }[] =
  [
    {
      keys: ["گارانتی", "ضمانت", "warranty"],
      answer:
        "روی دوخت و نصب استاندارد، پشتیبانی داریم. جزئیات گارانتی هر مدل را هنگام سفارش اعلام می‌کنیم. اگر مشکلی پیش آمد از صفحه تماس پیام بگذار.",
      links: [{ label: "تماس", href: "/contact" }],
    },
    {
      keys: ["زمان", "چقدر طول", "مدت", "تحویل"],
      answer:
        "بعد از اندازه‌گیری و تأیید سفارش، معمولاً آماده‌سازی چند روز تا حدود دو هفته طول می‌کشد (بسته به مدل و حجم). زمان دقیق را در مشاوره اعلام می‌کنیم.",
    },
    {
      keys: ["رنگ دیوار", "هماهنگ با مبل", "ست کردن"],
      answer:
        "برای ست کردن با دیوار و مبل، یا کد رنگ را بگو یا از کاتالوگ مدل‌های نزدیک به رنگ فضا را ببین. اگر عکس فضا داری بفرست تا نزدیک‌تر پیشنهاد بدهم.",
      links: [{ label: "کاتالوگ", href: "/catalog" }],
    },
    {
      keys: ["موتور", "برقی", "ریموت", "هوشمند"],
      answer:
        "برای بعضی سبک‌ها امکان موتور و ریموت وجود دارد. بگو کدام فضا و سبک را می‌خواهی تا مسیر درست را نشان بدهم و از تماس هماهنگی فنی انجام شود.",
      links: [{ label: "مشاوره فنی", href: "/contact" }],
    },
  ];

function matchFaq(t: string) {
  const n = normalize(t);
  return FAQ_REPLIES.find((f) => f.keys.some((k) => n.includes(normalize(k))));
}

const COMPARE_NOTES: Record<string, string> = {
  shade: "شید: سطح صاف، جمع‌شونده به بالا، کنترل نور ساده.",
  zebra: "زبرا: نوارهای متناوب شفاف/مات؛ نور را دقیق تنظیم می‌کنی.",
  roman: "رومن: تاهای افقی شیک؛ ظاهر رسمی‌تر.",
  panel: "ترک‌پنل: خطوط عمودی مدرن و تمیز.",
  roller: "کرکره/رولر: کاربردی و اقتصادی برای کنترل نور.",
  "pleated-manual": "پلیسه: بافت ظریف، مناسب پنجره‌های متوسط.",
  sheer: "تور/حریر: نور نرم و حس دلباز.",
  velvet: "مخمل: لوکس و عمیق برای پذیرایی.",
};

export async function buildConsultantReply(
  userText: string,
  history: ChatMessage[] = []
): Promise<AssistantResult> {
  const t = normalize(userText);
  const intent = detectIntent(userText);
  const catalog = await loadCatalog();
  const { categories, models, projects, modelCount, projectCount } = catalog;
  const fullContext = `${historyBlob(history)} ${userText}`;
  const hints = detectHints(fullContext);
  const preferred = [...new Set(hints.flatMap((h) => h.slugs))];
  const terms = extractTerms(userText);
  const tip = hints.map((h) => h.tip).filter(Boolean)[0];

  const faq = matchFaq(userText);
  if (faq) {
    return pack(
      faq.answer,
      faq.links
        ? [{ type: "link_buttons", items: faq.links }]
        : [
            {
              type: "quick_replies",
              items: [
                { label: "پیشنهاد مدل", message: "پیشنهاد مدل بده" },
                { label: "تماس", message: "چطور تماس بگیرم؟" },
              ],
            },
          ]
    );
  }

  if (intent === "greeting") {
    return pack(
      `سلام، خوش اومدی 🌿\nمن دستیار طراحی **پرده آنتیک** هستم — از کاتالوگ واقعی (${modelCount} مدل) و نمونه‌های اجرا (${projectCount}) کمکت می‌کنم.\n\nبگو کدام اتاق است و فضا را **تاریک** می‌خواهی یا **روشن**؟ هر سوالی هم داشتی بپرس.`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن روشن", message: "نشیمن روشن و دلباز" },
            { label: "خواب تاریک", message: "اتاق خواب تاریک بلک‌اوت" },
            { label: "کلاسیک لوکس", message: "پذیرایی کلاسیک و لوکس" },
            { label: "انواع پرده؟", message: "چه دسته‌هایی دارید؟" },
          ],
        },
        {
          type: "link_buttons",
          items: [
            { label: "کاتالوگ", href: "/catalog" },
            { label: "نمونه‌های اجرا", href: "/projects" },
          ],
        },
      ]
    );
  }

  if (intent === "thanks") {
    return pack("قابلی نداشت 💛 هر وقت خواستی دوباره تنظیمش می‌کنیم. موفق باشی.");
  }

  if (intent === "help") {
    return pack(
      "می‌توانم کمکت کنم با:\n• پیشنهاد مدل از کاتالوگ واقعی\n• توضیح تفاوت شید / زبرا / رومن / پنل\n• راهنمای نصب و قیمت تقریبی\n• نمونه‌های اجرا شده\n• فروشگاه اکسسوری\n\nفقط به زبان خودت بپرس — لازم نیست اصطلاح تخصصی بلد باشی.",
      [
        {
          type: "quick_replies",
          items: [
            { label: "پیشنهاد مدل", message: "برای نشیمن پیشنهاد بده" },
            { label: "تفاوت شید و زبرا", message: "تفاوت شید و زبرا چیست؟" },
            { label: "قیمت؟", message: "قیمت پرده چطور حساب می‌شود؟" },
          ],
        },
      ]
    );
  }

  if (intent === "price") {
    return pack(
      "قیمت پرده مثل لباس آماده روی تگ نیست — به **عرض و ارتفاع پنجره**، نوع پارچه، سبک نصب و یراق بستگی دارد.\n\nمسیر درست:\n۱) مدل را از کاتالوگ انتخاب کن\n۲) ابعاد تقریبی را بگو یا درخواست بازدید بده\n۳) برآورد دقیق برات می‌فرستیم",
      [
        {
          type: "link_buttons",
          items: [
            { label: "درخواست قیمت", href: "/contact" },
            { label: "کاتالوگ", href: "/catalog" },
          ],
        },
        {
          type: "quick_replies",
          items: [
            { label: "مدل پیشنهاد بده", message: "چند مدل خوب پیشنهاد بده" },
            { label: "نصب چطور؟", message: "نصب چگونه انجام می‌شود؟" },
          ],
        },
      ]
    );
  }

  if (intent === "install") {
    return pack(
      "نصب استاندارد آنتیک:\n۱) انتخاب مدل از کاتالوگ\n۲) هماهنگی **بازدید و اندازه‌گیری**\n۳) دوخت / آماده‌سازی\n۴) نصب در محل\n\nاگر مدل را انتخاب کردی، از تماس اقدام کن تا نوبت بازدید بگیری.",
      [
        {
          type: "link_buttons",
          items: [
            { label: "درخواست بازدید", href: "/contact" },
            { label: "نمونه‌های اجرا", href: "/projects" },
          ],
        },
      ]
    );
  }

  if (intent === "contact") {
    return pack(
      "برای مشاوره، اندازه‌گیری و سفارش از صفحه **تماس** اقدام کن. نام، شماره و توضیح کوتاه فضا کافی است تا تیم برگردد سراغت.",
      [
        {
          type: "link_buttons",
          items: [
            { label: "صفحه تماس", href: "/contact" },
            { label: "ارتباط سریع", href: "/connect" },
          ],
        },
      ]
    );
  }

  if (intent === "about") {
    return pack(
      "**پرده آنتیک** روی طراحی، دوخت و نصب پرده تخصصی کار می‌کند — از پذیرایی کلاسیک تا دفتر مدرن.\nکاتالوگ واقعی مدل‌ها و نمونه‌های اجرا را می‌توانی در سایت ببینی؛ من هم اینجام که انتخاب را ساده کنم.",
      [
        {
          type: "link_buttons",
          items: [
            { label: "درباره ما", href: "/about" },
            { label: "کاتالوگ", href: "/catalog" },
            { label: "نمونه‌ها", href: "/projects" },
          ],
        },
      ]
    );
  }

  if (intent === "care") {
    return pack(
      "نگهداری کلی:\n• گردگیری آرام با جاروبرقی در حالت کم\n• لکه‌های تازه را سریع و بدون فشار پاک کن\n• شستشوی کامل معمولاً تخصصی است — نوع پارچه را اعلام کن تا راهنمایی دقیق‌تر بدهم\n\nاگر مدل خاصی مد نظرته کدش را بگو."
    );
  }

  if (intent === "shop") {
    return pack(
      "بخش **فروشگاه** فقط اکسسوری و یراق پرده است (قلاب، ریل و …) — خودِ پارچه و مدل پرده از **کاتالوگ** انتخاب می‌شود.",
      [
        {
          type: "link_buttons",
          items: [
            { label: "فروشگاه اکسسوری", href: "/shop" },
            { label: "کاتالوگ پرده", href: "/catalog" },
          ],
        },
      ]
    );
  }

  if (intent === "projects") {
    const top = projects.slice(0, 4);
    const lines =
      top.length === 0
        ? "هنوز نمونه ثبت نشده؛ از کاتالوگ شروع کن."
        : `چند نمونه اجرا:\n${top.map((p, i) => `${i + 1}. **${p.title}**${p.categorySlug ? ` (${p.categorySlug})` : ""}`).join("\n")}`;
    return pack(`${lines}\n\nبرای دیدن گالری کامل برو به نمونه‌های اجرا.`, [
      {
        type: "link_buttons",
        items: [
          { label: "نمونه‌های اجرا", href: "/projects" },
          { label: "کاتالوگ", href: "/catalog" },
        ],
      },
    ]);
  }

  if (intent === "categories" || intent === "catalog") {
    const names = categories
      .slice(0, 12)
      .map((c) => `• **${c.name}**`)
      .join("\n");
    return pack(
      `دسته‌های اصلی کاتالوگ:\n${names || "—"}\n\nروی هر کدام کلیک کن یا بگو کدام را می‌خواهی تا مدل پیشنهاد بدهم.`,
      [
        {
          type: "link_buttons",
          items: [{ label: "باز کردن کاتالوگ", href: "/catalog" }],
        },
        {
          type: "quick_replies",
          items: categories.slice(0, 4).map((c) => ({
            label: c.name,
            message: `مدل‌های دسته ${c.name}`,
          })),
        },
      ]
    );
  }

  if (intent === "compare") {
    const hit = hints.length
      ? hints
      : STYLE_HINTS.filter((h) => h.slugs.some((s) => t.includes(s)));
    const notes = (hit.length ? hit : STYLE_HINTS.slice(0, 3))
      .slice(0, 4)
      .map((h) => {
        const key = h.slugs[0];
        return COMPARE_NOTES[key] || h.tip;
      });
    return pack(
      `مقایسه کوتاه:\n${notes.map((n) => `• ${n}`).join("\n")}\n\nبگو فضا روشن می‌خواهی یا تاریک تا یکی را قطعی‌تر پیشنهاد بدهم.`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "شید می‌خوام", message: "شید برای کنترل نور" },
            { label: "زبرا می‌خوام", message: "زبرا اداری یا خانگی" },
            { label: "رومن می‌خوام", message: "رومن کلاسیک" },
          ],
        },
      ]
    );
  }

  const scored = models
    .map((m) => ({ m, score: scoreModel(m, preferred, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const codeHit = models.find((m) => {
    const code = (m.code || "").toLowerCase();
    return code && (t.includes(code) || terms.some((term) => code.includes(term)));
  });
  if (codeHit) {
    return pack(
      `مدل **${codeHit.name || codeHit.code}** را پیدا کردم.${codeHit.color ? ` رنگ تقریبی: ${codeHit.color}.` : ""}\nروی کارت بزن تا جزئیات و پیش‌نمایش نصب را ببینی.`,
      [
        modelCards([codeHit]),
        {
          type: "link_buttons",
          items: [
            { label: "مشاوره و قیمت", href: "/contact" },
            { label: "کاتالوگ", href: "/catalog" },
          ],
        },
      ]
    );
  }

  if (scored.length === 0) {
    if (/کجا|چطور|چگونه|چرا|آیا|میشه|می‌شود/.test(t) || intent === "unknown") {
      return pack(
        "سوالت را گرفتم 😊 اگر درباره **انتخاب پرده، سبک، نور، نصب، قیمت یا نمونه‌کار** است دقیق‌تر بگو.\n\nمثال:\n• «اتاق خواب تاریک می‌خوام»\n• «تفاوت شید و زبرا؟»\n• «مدل ZB-001 رو دارین؟»\n\nیا مستقیم برو کاتالوگ / تماس.",
        [
          {
            type: "quick_replies",
            items: [
              { label: "نشیمن کلاسیک", message: "نشیمن کلاسیک لوکس" },
              { label: "خواب تاریک", message: "اتاق خواب تاریک" },
              { label: "انواع پرده", message: "چه دسته‌هایی دارید؟" },
              { label: "قیمت؟", message: "قیمت پرده چطور حساب می‌شود؟" },
            ],
          },
          {
            type: "link_buttons",
            items: [
              { label: "کاتالوگ", href: "/catalog" },
              { label: "تماس", href: "/contact" },
            ],
          },
        ],
        { intent, model_count: modelCount }
      );
    }
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
      : "چند مدل مرتبط از کاتالوگ پیدا کردم:");

  const teach =
    preferred.includes("shade") || /شید/.test(t)
      ? "\n\nنکته: شید را می‌شود تا بالا جمع کرد؛ برای مطالعه یا تلویزیون راحت است."
      : preferred.includes("zebra") || /زبرا/.test(t)
        ? "\n\nنکته: در زبرا با چرخاندن نوارها بین شفاف و مات جابه‌جا می‌شوی."
        : preferred.includes("roman") || /رومن/.test(t)
          ? "\n\nنکته: رومن وقتی بالا می‌رود تاهای مرتب می‌سازد و ظاهر رسمی‌تری دارد."
          : "\n\nاگر رنگ دیوار یا اندازه پنجره را بگی، پیشنهاد را تنگ‌تر می‌کنم.";

  return pack(`${intro}${teach}\n\nروی کارت بزن تا مدل را کامل ببینی ✨`, [
    modelCards(top),
    {
      type: "quick_replies",
      items: [
        { label: "تاریک‌تر", message: "نسخه تاریک‌تر یا بلک‌اوت" },
        { label: "روشن‌تر", message: "نسخه روشن‌تر و شفاف" },
        { label: "قیمت و نصب", message: "درباره قیمت و نصب بگو" },
        { label: "نمونه اجرا", message: "نمونه اجرای مشابه نشان بده" },
      ],
    },
    {
      type: "link_buttons",
      items: [
        { label: "کاتالوگ کامل", href: "/catalog" },
        { label: "مشاوره حضوری", href: "/contact" },
      ],
    },
  ], { intent, preferred, hits: scored.length });
}

export async function buildAdminAssistantReply(
  userText: string,
  history: ChatMessage[] = [],
  context: AssistantContext = {},
  options?: { imageUrl?: string }
): Promise<AssistantResult> {
  return buildAdminReply(userText, history, context, options);
}

export async function buildAssistantReply(
  agentName: string,
  userText: string,
  history: ChatMessage[] = [],
  context: AssistantContext = {},
  options?: { imageUrl?: string }
): Promise<AssistantResult> {
  if (agentName === "admin_assistant") {
    return buildAdminAssistantReply(userText, history, context, options);
  }
  return buildConsultantReply(userText, history);
}
