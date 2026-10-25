/**
 * Customer assistant — strong local NLU over full catalog/projects/shop data.
 * Matches any tone (casual/formal/slang), answers free-form questions, returns rich blocks.
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
    .replace(/[ـ_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pack(text: string, blocks?: RichBlock[], meta?: Record<string, unknown>): AssistantResult {
  return { text, blocks, meta };
}

function expandText(raw: string) {
  let t = normalize(raw);
  const pairs: [RegExp, string][] = [
    [/میخوام|می خام|میخاه|می خوام/g, "میخوام"],
    [/چیه|چیست|چیزی|چی هست/g, "چیست"],
    [/کدوم|کدام|کدومه/g, "کدام"],
    [/گرون|گرانه|گران/g, "گران"],
    [/ارزون|ارزان/g, "ارزان"],
    [/بفرست|بفرستین|بده|بدهید/g, "بده"],
    [/دارین|دارید|داری/g, "دارید"],
    [/نمیخوام|نمی خام/g, "نمیخوام"],
    [/لطفا|خواهشا|خواهش میکنم/g, "لطفا"],
    [/آخه|اخه/g, " "],
    [/والا|والله/g, " "],
  ];
  for (const [re, rep] of pairs) t = t.replace(re, rep);
  return t;
}

type Tone = "warm" | "formal" | "playful" | "short";
function detectTone(raw: string): Tone {
  const t = normalize(raw);
  if (/[؟!?]{2,}|😂|😅|😆|خخخ|ههه|جدی|والا/.test(raw) || /جوک|شوخی/.test(t)) return "playful";
  if (/لطفاً|خواهشمند|جناب|با سلام|احتراما/.test(t) || raw.length > 120) return "formal";
  if (raw.length < 18 || /^(آره|نه|باشه|اوکی|ok|بله|نخیر)$/i.test(t)) return "short";
  return "warm";
}

function voice(tone: Tone, warm: string, formal: string, playful: string, short?: string) {
  if (tone === "formal") return formal;
  if (tone === "playful") return playful;
  if (tone === "short" && short) return short;
  return warm;
}

const STYLE_HINTS: { keys: string[]; slugs: string[]; tip: string }[] = [
  { keys: ["بلک", "blackout", "تاریک", "خواب", "نور نده", "اتاق خواب", "سیاه", "شب"], slugs: ["shade", "zebra", "roman"], tip: "برای خواب عمیق معمولاً شید بلک‌اوت یا زبرا بهترین‌اند." },
  { keys: ["شفاف", "تور", "نورگیر", "روشن", "sheer", "حریر", "دلباز", "پرنور"], slugs: ["sheer", "silk"], tip: "تور و حریر نور را نرم می‌کنند و فضا را بزرگ‌تر نشان می‌دهند." },
  { keys: ["کلاسیک", "لوکس", "مجلل", "مجلسی", "سلیقه", "سنتی", "لاکچری"], slugs: ["velvet", "roman", "silk", "sheer"], tip: "حس کلاسیک با مخمل/رومن و لایه تور خیلی شیک درمی‌آید." },
  { keys: ["مدرن", "ساده", "مینیمال", "جوان", "اسکاندی"], slugs: ["turk-panel", "shade", "zebra", "roller", "cubism"], tip: "برای مدرن: ترک‌پنل، شید یا زبرا خط تمیز می‌دهند." },
  { keys: ["اداری", "دفتر", "تجاری", "شرکت", "محل کار", "اداره"], slugs: ["zebra", "shade", "roller", "office"], tip: "دفتر: زبرا و شید هم حریم می‌دهند هم نور را کنترل می‌کنند." },
  { keys: ["آشپزخانه", "kitchen", "اپن"], slugs: ["kitchen", "roman", "shade", "roller"], tip: "آشپزخانه بهتر است جمع‌وجور باشد — رومن یا شید." },
  { keys: ["نشیمن", "پذیرایی", "سالن", "living", "هال", "لابی"], slugs: ["velvet", "sheer", "roman", "zebra", "silk"], tip: "پذیرایی اغلب ترکیب تور + لایه ضخیم‌تر یا رومن جواب می‌دهد." },
  { keys: ["شید", "shade"], slugs: ["shade"], tip: "شید تا بالا جمع می‌شود؛ برای مطالعه و تلویزیون راحت است." },
  { keys: ["زبرا", "zebra"], slugs: ["zebra"], tip: "زبرا با چرخاندن نوارها بین شفاف و مات جابه‌جا می‌شود." },
  { keys: ["رومن", "roman"], slugs: ["roman"], tip: "رومن تاهای مرتب می‌سازد و ظاهر رسمی‌تری دارد." },
  { keys: ["پلیسه", "pleated"], slugs: ["pleated", "pleated-manual", "pleated-chain"], tip: "پلیسه بافت ظریف دارد و برای پنجره‌های متوسط عالی است." },
  { keys: ["پنل", "ترک", "panel", "turk"], slugs: ["turk-panel", "panel"], tip: "ترک‌پنل خطوط عمودی تمیز و مدرن می‌دهد." },
  { keys: ["کرکره", "رولر", "roller", "رول", "blind"], slugs: ["roller"], tip: "کرکره/رولر کاربردی و اقتصادی برای کنترل نور است." },
  { keys: ["مخمل", "velvet"], slugs: ["velvet"], tip: "مخمل عمق رنگی و حس لوکس برای پذیرایی می‌آورد." },
];

const COLOR_WORDS = ["کرم", "بژ", "طوسی", "خاکستری", "سفید", "مشکی", "ذغالی", "قهوه", "طلایی", "نوک مدادی"];

function detectHints(text: string) {
  const t = expandText(text);
  return STYLE_HINTS.filter((h) => h.keys.some((k) => t.includes(normalize(k))));
}

function extractTerms(text: string): string[] {
  const stop = new Set(["سلام", "برای", "یک", "یه", "از", "به", "با", "که", "می", "میخوام", "لطفا", "پیشنهاد", "بده", "کن", "مدل", "پرده", "دارید", "هست", "چیست", "چی", "آیا", "میشه", "خوب", "خیلی", "هم", "یا", "این", "آن", "اون", "رو", "را"]);
  return expandText(text)
    .split(/[\s,،.؟!؛:\/\\|\-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !stop.has(w));
}

type CatRow = { id: string; name: string; slug: string; description: string | null; mechanism: string | null; image: string | null; subcategories: unknown };
type ModelRow = { id: string; name: string; code: string | null; fabric: string | null; color: string | null; description: string | null; categorySlug: string | null; subcategory: string | null; material: string | null; texture: string | null; image: string | null; installImage: string | null };
type ProjectRow = { id: string; title: string; description: string | null; coverImage: string | null; categorySlug: string | null; subcategory: string | null };
type ProductRow = { id: string; name: string; slug: string; description: string | null; price: unknown; image: string | null };

async function loadAll() {
  const [categories, models, projects, products, modelCount, projectCount, productCount] = await Promise.all([
    prisma.curtainCategory.findMany({ orderBy: { order: "asc" }, take: 120 }),
    prisma.curtainModel.findMany({ orderBy: { updatedAt: "desc" }, take: 400 }),
    prisma.project.findMany({ orderBy: { updatedAt: "desc" }, take: 80 }),
    prisma.product.findMany({ where: { visible: true }, orderBy: { updatedAt: "desc" }, take: 60 }).catch(() => []),
    prisma.curtainModel.count(),
    prisma.project.count(),
    prisma.product.count().catch(() => 0),
  ]);
  return { categories: categories as CatRow[], models: models as ModelRow[], projects: projects as ProjectRow[], products: (products || []) as ProductRow[], modelCount, projectCount, productCount: productCount as number };
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

function scoreModel(m: ModelRow, preferredSlugs: string[], terms: string[], colors: string[]) {
  const slug = (m.categorySlug || "").toLowerCase();
  const sub = (m.subcategory || "").toLowerCase();
  const blob = normalize(`${m.name} ${m.code || ""} ${m.fabric || ""} ${m.color || ""} ${m.description || ""} ${m.material || ""} ${m.texture || ""} ${slug} ${sub}`);
  let score = 0;
  for (const s of preferredSlugs) {
    const ns = normalize(s);
    if (!ns) continue;
    if (slug === ns) score += 14;
    else if (slug.includes(ns) || sub.includes(ns)) score += 8;
  }
  for (const t of terms) {
    if (blob.includes(t)) score += 3;
    if ((m.code || "").toLowerCase().includes(t)) score += 8;
  }
  for (const c of colors) if (blob.includes(normalize(c))) score += 5;
  if (m.installImage) score += 1;
  return score;
}

function historyBlob(history: ChatMessage[]) {
  return history.filter((m) => m.role === "user").slice(-10).map((m) => m.content).join(" ");
}

type Intent = "greeting" | "thanks" | "price" | "install" | "catalog" | "categories" | "shop" | "projects" | "about" | "contact" | "care" | "compare" | "help" | "recommend" | "search" | "yesno" | "rude" | "unknown";

function detectIntent(raw: string): Intent {
  const n = expandText(raw);
  if (/^(سلام|درود|hi|hello|hey|سلام علیکم|صبح بخیر|عصر بخیر|شب بخیر|خوبی|چطوری)[\s!.؟?]*$/i.test(n)) return "greeting";
  if (/^(ممنون|مرسی|تشکر|thanks|thank you|خداحافظ|bye)[\s!.؟?]*$/i.test(n)) return "thanks";
  if (/^(آره|بله|باشه|اوکی|ok|yes|نه|نخیر|no)$/i.test(n)) return "yesno";
  if (/احمق|خر|لعنت|آشغال/.test(n)) return "rude";
  if (/قیمت|هزینه|مبلغ|چند|ارزان|گران|بودجه|تخفیف/.test(n)) return "price";
  if (/نصب|اندازه|بازدید|اجرا|اندازه گیری|دوخت|نصاب/.test(n)) return "install";
  if (/نمونه|پروژه|اجرا شده|گالری کار|نمونه کار/.test(n)) return "projects";
  if (/فروشگاه|اکسسوری|یراق|قلاب|محصول/.test(n)) return "shop";
  if (/درباره|شرکت|آنتیک|سابقه|برند/.test(n)) return "about";
  if (/تماس|آدرس|تلفن|واتساپ|محل|شعبه|شماره|هماهنگ|مشاوره بگیر|زنگ|تماس بگیر/.test(n)) return "contact";
  if (/شستشو|نگهداری|تمیز|لکه|مراقبت/.test(n)) return "care";
  if (/تفاوت|فرق|مقایسه|کدام بهتر|کدوم بهتر/.test(n)) return "compare";
  if (/دسته|انواع پرده|چه مدل|چه سبک|لیست دسته/.test(n)) return "categories";
  if (/کاتالوگ|همه مدل|ببینم/.test(n)) return "catalog";
  if (/کمک|راهنما|چیکار|نمیدونم|نمی دونم/.test(n)) return "help";
  if (/پیشنهاد|پیشنهاد بده|چی بخرم|مناسب|چی خوبه/.test(n)) return "recommend";
  if (n.length >= 1) return "search";
  return "unknown";
}

export async function buildConsultantReply(userText: string, history: ChatMessage[] = []): Promise<AssistantResult> {
  const tone = detectTone(userText);
  const t = expandText(userText);
  const intent = detectIntent(userText);
  const data = await loadAll();
  const { categories, models, projects, products, modelCount, projectCount, productCount } = data;
  const fullContext = `${historyBlob(history)} ${userText}`;
  const hints = detectHints(fullContext);
  const preferred = [...new Set(hints.flatMap((h) => h.slugs).filter(Boolean))];
  const terms = extractTerms(userText);
  const colors = COLOR_WORDS.filter((c) => t.includes(normalize(c)));
  const tip = hints.map((h) => h.tip).filter(Boolean)[0];

  const contactBlocks = (): RichBlock[] => [
    {
      type: "link_buttons",
      items: [
        { label: "درخواست مشاوره و قیمت", href: "/contact" },
        { label: "کاتالوگ", href: "/catalog" },
      ],
    },
    {
      type: "quick_replies",
      items: [
        { label: "میخوام تماس بگیرن", message: "لطفا بگو چطور تماس بگیرم" },
        { label: "مدل پیشنهاد بده", message: "چند مدل خوب پیشنهاد بده" },
      ],
    },
  ];

  if (intent === "greeting") {
    return pack(
      voice(
        tone,
        `سلام 🌿 من مشاور پرده آنتیک‌ام — ${modelCount} مدل در کاتالوگ دارم.\nاتاق و نور را بگو تا پیشنهاد بدهم؛ در پایان مسیر، برای قیمت و بازدید از تماس اقدام می‌کنی.`,
        `سلام. مشاور طراحی پرده آنتیک هستم. نوع فضا را بفرمایید.`,
        `سلام! بگو کدوم اتاقه تا برات مدل پیدا کنم 💚`
      ),
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن روشن", message: "نشیمن روشن و دلباز" },
            { label: "خواب تاریک", message: "اتاق خواب تاریک بلک‌اوت" },
            { label: "قیمت؟", message: "قیمت پرده چطور حساب می‌شود؟" },
          ],
        },
      ]
    );
  }

  if (intent === "thanks") {
    return pack(
      voice(tone, "خواهش می‌کنم. هر وقت آماده بودی از تماس برای بازدید هماهنگ کن.", "موفق باشید.", "مرسی از تو 😄 برو تماس اگر آماده بودی!")
    );
  }

  if (intent === "price" || intent === "install" || intent === "contact") {
    return pack(
      voice(
        tone,
        "قیمت و زمان نصب بعد از ابعاد پنجره و مدل مشخص می‌شود.\n\n**قدم بعدی:** از صفحه تماس نام، شماره و ابعاد تقریبی را بفرست تا کارشناس برای بازدید یا برآورد با تو هماهنگ کند.",
        "لطفاً از صفحه تماس اقدام فرمایید تا برآورد و هماهنگی بازدید انجام شود.",
        "برای قیمت و نصب باید ابعاد داشته باشیم — برو تماس، شماره و ابعادت رو بذار تا زنگ بزنن."
      ),
      contactBlocks()
    );
  }

  if (intent === "help") {
    return pack(
      "کمکت می‌کنم مدل مناسب را پیدا کنی؛ بعد برای قیمت و نصب از **تماس** اقدام می‌کنی.\nبگو: اتاق کجاست و نور را بیشتر می‌خواهی یا کمتر؟",
      contactBlocks()
    );
  }

  if (intent === "categories" || intent === "catalog") {
    const names = categories.slice(0, 12).map((c) => `• **${c.name}**`).join("\n");
    return pack(
      `دسته‌های کاتالوگ:\n${names || "—"}\n\nیکی را بگو تا مدل پیشنهاد بدهم؛ برای سفارش نهایی از تماس اقدام کن.`,
      [
        { type: "link_buttons", items: [{ label: "کاتالوگ", href: "/catalog" }, { label: "تماس", href: "/contact" }] },
        { type: "quick_replies", items: categories.slice(0, 4).map((c) => ({ label: c.name, message: `مدل‌های ${c.name}` })) },
      ]
    );
  }

  if (intent === "shop") {
    return pack(
      "فروشگاه فقط اکسسوری است. خود پرده از کاتالوگ و سپس تماس برای اندازه‌گیری.",
      [{ type: "link_buttons", items: [{ label: "فروشگاه", href: "/shop" }, { label: "تماس", href: "/contact" }] }]
    );
  }

  if (intent === "projects") {
    const top = projects.slice(0, 4);
    const lines = top.map((p, i) => `${i + 1}. **${p.title}**`).join("\n") || "—";
    return pack(`نمونه‌های اجرا:\n${lines}\n\nمدل نزدیک سلیقه‌ات را بگو تا مسیر تماس را باز کنم.`, [
      { type: "link_buttons", items: [{ label: "نمونه‌ها", href: "/projects" }, { label: "تماس", href: "/contact" }] },
    ]);
  }

  if (intent === "about") {
    return pack(
      `پرده آنتیک مشاوره، دوخت و نصب انجام می‌دهد — ${modelCount} مدل در کاتالوگ.\nبرای شروع پروژه از تماس اقدام کن.`,
      contactBlocks()
    );
  }

  if (intent === "compare") {
    return pack(
      "شید: جمع‌شونده و ساده · زبرا: نوار شفاف/مات · رومن: ظاهر رسمی.\nبگو فضا روشن می‌خواهی یا تاریک تا مدل پیشنهاد بدهم؛ بعد برای قیمت از تماس اقدام کن.",
      contactBlocks()
    );
  }

  for (const c of categories) {
    if (t.includes(normalize(c.name)) || t.includes(normalize(c.slug))) preferred.push(c.slug);
  }

  const scored = models
    .map((m) => ({ m, score: scoreModel(m, preferred, terms, colors) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const codeHit = models.find((m) => {
    const code = (m.code || "").toLowerCase();
    return code && (t.includes(code) || terms.some((term) => code.includes(term)));
  });
  if (codeHit) {
    return pack(
      `مدل **${codeHit.name || codeHit.code}** را پیدا کردم.\n\nاگر می‌پسندی، از **تماس** ابعاد را بفرست تا قیمت و بازدید هماهنگ شود.`,
      [modelCards([codeHit]), ...contactBlocks()]
    );
  }

  if (scored.length === 0) {
    return pack(
      voice(
        tone,
        "بگو اتاق کجاست و نور را بیشتر می‌خواهی یا کمتر — بعد مدل می‌دهم و مسیر تماس را باز می‌کنم.",
        "لطفاً نوع فضا را مشخص کنید.",
        "بگو اتاق و نورش چیه تا بریم سر مدل 😊"
      ),
      contactBlocks()
    );
  }

  const top = scored.slice(0, 5).map((x) => x.m);
  const intro =
    tip ||
    voice(tone, "طبق حرف‌هات این مدل‌ها نزدیک‌ترند:", "پیشنهادها:", "اینا به نظر نزدیک‌ترن:");
  const teach = "\n\nیکی را انتخاب کن؛ برای قیمت و نصب قطعی باید با مجموعه هماهنگ شوی.";
  const close =
    "\n\n" +
    voice(
      tone,
      "اگر یکی نزدیک سلیقه‌ات است، **از صفحه تماس** ابعاد تقریبی و شماره را بفرست تا کارشناس برای بازدید و قیمت با تو هماهنگ کند.",
      "از صفحه تماس اقدام فرمایید تا هماهنگی انجام شود.",
      "پسندیدی؟ برو تماس، ابعاد و شماره‌ت رو بذار تا تیم زنگ بزنه."
    );

  return pack(`${intro}${teach}${close}`, [
    modelCards(top),
    {
      type: "quick_replies",
      items: [
        { label: "میخوام تماس بگیرن", message: "می‌خوام برای قیمت و بازدید تماس بگیرم" },
        { label: "تاریک‌تر", message: "نسخه تاریک‌تر یا بلک‌اوت" },
        { label: "روشن‌تر", message: "نسخه روشن‌تر و شفاف" },
        { label: "قیمت؟", message: "درباره قیمت بگو" },
      ],
    },
    {
      type: "link_buttons",
      items: [
        { label: "درخواست مشاوره و قیمت", href: "/contact" },
        { label: "کاتالوگ کامل", href: "/catalog" },
      ],
    },
  ], { intent, preferred, hits: scored.length, tone });
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
