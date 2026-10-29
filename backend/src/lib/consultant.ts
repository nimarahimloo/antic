/**
 * Customer assistant — free-form NLU over catalog/projects/shop.
 * Accepts any tone/phrasing; always tries to answer from real data.
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
<<<<<<< HEAD
=======

function expandText(raw: string) {
  let t = normalize(raw);
  const pairs: [RegExp, string][] = [
    [/میخوام|میخام|می خام|میخاه|می خوام|میخوامم|دلم میخواد|دوست دارم/g, "میخوام"],
    [/چیه|چیست|چیزی|چی هست|چی بود/g, "چیست"],
    [/کدوم|کدام|کدومه|کدومش/g, "کدام"],
    [/گرون|گرانه|گران/g, "گران"],
    [/ارزون|ارزان/g, "ارزان"],
    [/بفرست|بفرستین|بده|بدهید|برام بفرست|نشون بده|نشان بده|بیار|بیارین/g, "بده"],
    [/دارین|دارید|داری|داریم|موجوده|موجود هست/g, "دارید"],
    [/نمیخوام|نمی خام|نمیخوامش/g, "نمیخوام"],
    [/لطفا|خواهشا|خواهش میکنم|ممنون میشم/g, "لطفا"],
    [/آخه|اخه/g, " "],
    [/والا|والله/g, " "],
    [/اتاق خواب|خوابگاه|اتاقخواب/g, "اتاق خواب"],
    [/نشیمن|هال|پذیرایی|سالن پذیرایی/g, "نشیمن"],
    [/بلک اوت|بلک‌اوت|black out|blackout/g, "بلک اوت"],
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
  { keys: ["بلک", "blackout", "تاریک", "خواب", "نور نده", "اتاق خواب", "سیاه", "شب", "بلک اوت"], slugs: ["shade", "zebra", "roman"], tip: "برای خواب عمیق معمولاً شید بلک‌اوت یا زبرا بهترین‌اند." },
  { keys: ["شفاف", "تور", "نورگیر", "روشن", "sheer", "حریر", "دلباز", "پرنور"], slugs: ["sheer", "silk"], tip: "تور و حریر نور را نرم می‌کنند و فضا را دلبازتر نشان می‌دهند." },
  { keys: ["کلاسیک", "لوکس", "مجلل", "مجلسی", "سنتی", "لاکچری"], slugs: ["velvet", "roman", "silk", "sheer"], tip: "حس کلاسیک با مخمل یا رومن + لایه تور شیک درمی‌آید." },
  { keys: ["مدرن", "ساده", "مینیمال", "جوان", "اسکاندی"], slugs: ["turk-panel", "shade", "zebra", "roller", "cubism"], tip: "برای مدرن: ترک‌پنل، شید یا زبرا خط تمیز می‌دهند." },
  { keys: ["اداری", "دفتر", "تجاری", "شرکت", "محل کار", "اداره"], slugs: ["zebra", "shade", "roller", "office"], tip: "دفتر: زبرا و شید هم حریم می‌دهند هم نور را کنترل می‌کنند." },
  { keys: ["آشپزخانه", "kitchen", "اپن"], slugs: ["kitchen", "roman", "shade", "roller"], tip: "آشپزخانه بهتر است جمع‌وجور باشد — رومن یا شید کوتاه عملی‌ترند." },
  { keys: ["نشیمن", "پذیرایی", "سالن", "living", "هال", "لابی"], slugs: ["velvet", "sheer", "roman", "zebra", "silk"], tip: "پذیرایی اغلب ترکیب تور + لایه ضخیم‌تر جواب می‌دهد." },
  { keys: ["شید", "shade"], slugs: ["shade"], tip: "شید تا بالا جمع می‌شود و خط افقی تمیز دارد." },
  { keys: ["زبرا", "zebra"], slugs: ["zebra"], tip: "زبرا با چرخاندن نوارها بین شفاف و مات جابه‌جا می‌شود." },
  { keys: ["رومن", "roman"], slugs: ["roman"], tip: "رومن تاهای مرتب افقی و ظاهر رسمی‌تری دارد." },
  { keys: ["پلیسه", "pleated"], slugs: ["pleated", "pleated-manual", "pleated-chain"], tip: "پلیسه چین‌های منظم و ظریف دارد." },
  { keys: ["پنل", "ترک", "panel", "turk"], slugs: ["turk-panel", "panel"], tip: "ترک‌پنل خطوط عمودی مدرن روی پنجره عریض می‌دهد." },
  { keys: ["کرکره", "رولر", "roller", "رول", "blind"], slugs: ["roller"], tip: "کرکره/رولر کاربردی و مینیمال است." },
  { keys: ["مخمل", "velvet"], slugs: ["velvet"], tip: "مخمل عمق رنگی و حس لوکس برای پذیرایی می‌آورد." },
];

const COLOR_WORDS = ["کرم", "بژ", "طوسی", "خاکستری", "سفید", "مشکی", "ذغالی", "قهوه", "طلایی", "نوک مدادی", "خاکی", "نسکافه", "آبی", "سبز"];

function detectHints(text: string) {
  const t = expandText(text);
  return STYLE_HINTS.filter((h) => h.keys.some((k) => t.includes(normalize(k))));
}

function extractTerms(text: string): string[] {
  const stop = new Set([
    "سلام", "برای", "یک", "یه", "از", "به", "با", "که", "می", "میخوام", "لطفا", "پیشنهاد", "بده", "کن",
    "مدل", "پرده", "دارید", "هست", "چیست", "چی", "آیا", "میشه", "خوب", "خیلی", "هم", "یا", "این", "آن",
    "اون", "رو", "را", "من", "تو", "ما", "شما", "اونجا", "اینجا", "یکم", "یه کم", "فقط",
  ]);
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
  return {
    categories: categories as CatRow[],
    models: models as ModelRow[],
    projects: projects as ProjectRow[],
    products: (products || []) as ProductRow[],
    modelCount,
    projectCount,
    productCount: productCount as number,
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

function scoreModel(m: ModelRow, preferredSlugs: string[], terms: string[], colors: string[]) {
  const slug = (m.categorySlug || "").toLowerCase();
  const sub = (m.subcategory || "").toLowerCase();
  const code = (m.code || "").toLowerCase();
  const blob = normalize(
    `${m.name} ${m.code || ""} ${m.fabric || ""} ${m.color || ""} ${m.description || ""} ${m.material || ""} ${m.texture || ""} ${slug} ${sub}`
  );
  let score = 0;
  for (const s of preferredSlugs) {
    const ns = normalize(s);
    if (!ns) continue;
    if (slug === ns) score += 16;
    else if (slug.includes(ns) || sub.includes(ns) || ns.includes(slug)) score += 10;
  }
  for (const term of terms) {
    if (!term || term.length < 2) continue;
    if (code === term || code.includes(term)) score += 12;
    if (blob.includes(term)) score += 4;
    if (normalize(m.name || "").includes(term)) score += 5;
  }
  for (const c of colors) if (blob.includes(normalize(c))) score += 6;
  if (m.installImage) score += 1;
  if (m.image) score += 0.5;
  return score;
}

function historyBlob(history: ChatMessage[]) {
  return history
    .filter((m) => m.role === "user")
    .slice(-12)
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
  | "yesno"
  | "rude"
  | "process"
  | "material"
  | "unknown";

function detectIntent(raw: string): Intent {
  const n = expandText(raw);
  if (/^(سلام|درود|hi|hello|hey|سلام علیکم|صبح بخیر|عصر بخیر|شب بخیر|خوبی|چطوری)[\s!.؟?]*$/i.test(n)) return "greeting";
  if (/^(ممنون|مرسی|تشکر|thanks|thank you|خداحافظ|bye)[\s!.؟?]*$/i.test(n)) return "thanks";
  if (/^(آره|بله|باشه|اوکی|ok|yes|نه|نخیر|no)$/i.test(n)) return "yesno";
  if (/احمق|خر|لعنت|آشغال/.test(n)) return "rude";
  if (/نمونه\s*کار|نمونه\s*اجرا|پروژه|گالری\s*کار|کارهای\s*(شما|قبلی)|اجرا\s*شده/.test(n)) return "projects";
  if (/قیمت|هزینه|مبلغ|بودجه|تخفیف|ارزان|گران|چقدر\s*(پول|هزینه|میشه|میشود)|چند\s*(تومان|میلیون|هزار|پول)|حساب\s*(میشه|میشود|کن)|هزینه\s*نصب/.test(n))
    return "price";
  if (/نصب|اندازه\s*گیری|بازدید|دوخت|نصاب|اندازه\s*بگیر/.test(n)) return "install";
  if (/فروشگاه|اکسسوری|یراق|قلاب|محصول\s*فروش|ریل\s*پرده/.test(n)) return "shop";
  if (/درباره\s*(ما|شرکت)|شرکت\s*آنتیک|سابقه|برند|کی\s*هستید|چند\s*سال/.test(n)) return "about";
  if (/تماس|آدرس|تلفن|واتساپ|محل\s*نمایش|شعبه|شماره\s*تماس|هماهنگ|مشاوره\s*بگیر|زنگ|تماس\s*بگیر|کجا\s*هستید/.test(n))
    return "contact";
  if (/شستشو|نگهداری|تمیز|لکه|مراقبت|چطور\s*بشورم|چطور\s*تمیز/.test(n)) return "care";
  if (/تفاوت|فرق|مقایسه|کدام\s*بهتر|کدوم\s*بهتر/.test(n)) return "compare";
  if (/دسته.?بندی|انواع\s*پرده|چه\s*سبک|لیست\s*دسته|چه\s*جور\s*پرده|چه\s*مدل.?هایی\s*دارید/.test(n)) return "categories";
  if (/کاتالوگ|همه\s*مدل|همه\s*رو\s*نشون|ببینم\s*کاتالوگ/.test(n)) return "catalog";
  if (/کمک|راهنما|چیکار\s*کنم|نمیدونم|نمی\s*دونم|چطور\s*شروع|از\s*کجا\s*شروع/.test(n)) return "help";
  if (/مراحل|فرآیند|روند|چطور\s*سفارش|چجوری\s*سفارش|از\s*سفارش\s*تا\s*نصب/.test(n)) return "process";
  if (/پارچه|جنس|متریال|الیاف|پلی\s*استر|کتان|مخمل|حریر/.test(n)) return "material";
  if (n.length >= 1) return "search";
  return "unknown";
}

export async function buildConsultantReply(userText: string, history: ChatMessage[] = []): Promise<AssistantResult> {
  const tone = detectTone(userText);
  const t = expandText(userText);
  const intent = detectIntent(userText);
  const data = await loadAll();
  const { categories, models, projects, modelCount, projectCount } = data;

  // کل تاریخچه — محدود به یک کلمه/جمله ثابت نیست
  const fullContext = `${historyBlob(history)} ${userText}`;
  const fullNorm = expandText(fullContext);
  const hints = detectHints(fullContext);
  const preferred = [...new Set(hints.flatMap((h) => h.slugs).filter(Boolean))];
  const terms = [...new Set([...extractTerms(userText), ...extractTerms(fullContext)])];
  const colors = COLOR_WORDS.filter((c) => fullNorm.includes(normalize(c)));

  for (const c of categories) {
    if (fullNorm.includes(normalize(c.name)) || fullNorm.includes(normalize(c.slug))) preferred.push(c.slug);
  }

  const contactBlocks = (): RichBlock[] => [
    {
      type: "link_buttons",
      items: [
        { label: "درخواست مشاوره و قیمت", href: "/contact" },
        { label: "کاتالوگ کامل", href: "/catalog" },
        { label: "نمونه‌های اجرا", href: "/projects" },
      ],
    },
    {
      type: "quick_replies",
      items: [
        { label: "میخوام تماس بگیرن", message: "میخوام برای قیمت و بازدید تماس بگیرم" },
        { label: "مدل‌های بیشتر", message: "مدل‌های بیشتری نشون بده" },
        { label: "مراحل کار چیه؟", message: "مراحل از انتخاب تا نصب چیست؟" },
      ],
    },
  ];

  if (intent === "greeting") {
    return pack(
      voice(
        tone,
        `سلام، خیلی خوش اومدید 👋\n\nمن **دستیار طراحی پرده آنتیک** هستم و روی کاتالوگ واقعی سایت کار می‌کنم (حدود **${modelCount} مدل** و **${projectCount} نمونه اجرا**).\n\n**هر جور راحتید بنویسید** — رسمی، خودمونی، کوتاه یا بلند. مثلاً:\n• «برای نشیمن یه چیز روشن میخوام»\n• «اتاق خوابم نور زیاد میاد چی بذارم»\n• یا کد مدل اگر دارید\n\n**قیمت:** از روی عکس اعلام نمی‌شود؛ بعد از انتخاب مدل از صفحه تماس اقدام کنید.`,
        `سلام و احترام. مشاور طراحی پرده آنتیک در خدمت شماست. بیش از ${modelCount} مدل موجود است. نوع فضا و نور را به هر بیانی بفرمایید.`,
        `سلام! هر جوری بگی میفهمم 😊 بگو اتاق کجاست و نورش چی باشه.`
      ),
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن روشن", message: "نشیمن روشن و دلباز می‌خوام" },
            { label: "خواب تاریک", message: "اتاق خواب تاریک بلک‌اوت" },
            { label: "تفاوت شید و زبرا", message: "تفاوت شید و زبرا چیست؟" },
            { label: "قیمت چطور؟", message: "قیمت پرده چطور حساب می‌شود؟" },
          ],
        },
        {
          type: "link_buttons",
          items: [
            { label: "کاتالوگ", href: "/catalog" },
            { label: "نمونه‌های اجرا", href: "/projects" },
            { label: "تماس", href: "/contact" },
          ],
        },
      ]
    );
  }

  if (intent === "thanks") {
    return pack(
      voice(tone, "خواهش می‌کنم 🙏 هر سوالی داشتید همین‌جا بپرسید.", "خواهش می‌کنم.", "مرسی از شما 😊"),
      contactBlocks()
    );
  }

  if (intent === "rude") {
    return pack("متوجه شدم. من اینجام تا کمک کنم — هر سوالی درباره پرده بفرمایید.");
  }

  const faqBits: string[] = [];
  if (intent === "price" || intent === "install" || intent === "contact") {
    faqBits.push(
      voice(
        tone,
        `**قیمت و نصب** از روی عکس اعلام نمی‌شود و به ابعاد، پارچه و مکانیزم بستگی دارد.\nمسیر: انتخاب مدل → **صفحه تماس** (نام، موبایل، ابعاد تقریبی) → بازدید و قیمت نهایی.`,
        "برای اعلام قیمت نیاز به ابعاد و بازدید است. از صفحه تماس اقدام فرمایید.",
        "قیمت از عکس نمیشه گفت؛ مدل بگو بعد از تماس اندازه‌گیری هماهنگ میشه."
      )
    );
  }
  if (intent === "process") {
    faqBits.push("### مراحل کار\n1. انتخاب مدل\n2. ثبت درخواست در تماس\n3. بازدید / اندازه‌گیری\n4. تایید قیمت و دوخت\n5. نصب");
  }
  if (intent === "compare") {
    faqBits.push(
      "### مقایسه کوتاه\n• **شید:** جمع‌شونده، خط تمیز\n• **زبرا:** نوار شفاف/مات\n• **رومن:** تاهای افقی رسمی\n• **ترک‌پنل:** خطوط عمودی مدرن\n• **پلیسه:** چین ظریف"
    );
  }
  if (intent === "care") faqBits.push("### نگهداری\nگردگیری ملایم؛ شستشوی تخصصی برای مخمل و پارچه‌های خاص.");
  if (intent === "about") faqBits.push("**پرده آنتیک** روی طراحی تا اجرای پرده کار می‌کند. کاتالوگ و نمونه‌های اجرا در سایت است.");
  if (intent === "shop") faqBits.push("بخش **فروشگاه** برای اکسسوری است؛ پرده اصلی از کاتالوگ و همین چت انتخاب می‌شود.");
  if (intent === "material") faqBits.push("جنس پارچه روی نور و حس فضا اثر دارد (تور روشن‌تر؛ مخمل و بلک‌اوت سنگین‌تر).");
  if (intent === "help") faqBits.push("آزاد بنویسید: فضا، نور، سبک، کد مدل، یا سوال درباره قیمت/نصب/تفاوت مکانیزم‌ها.");

  if (intent === "categories" || intent === "catalog") {
    const lines = categories.slice(0, 24).map((c) => "• **" + (c.name || "") + "** (`" + c.slug + "`)").join("\n");
    return pack(
      `### دسته‌های کاتالوگ\n\n${lines || "هنوز دسته‌ای ثبت نشده."}\n\nهر دسته یا فضایی را به زبان خودتان بگویید تا مدل همان بخش را با عکس بیاورم.`,
      [
        { type: "link_buttons", items: [{ label: "باز کردن کاتالوگ", href: "/catalog" }] },
        {
          type: "quick_replies",
          items: categories.slice(0, 5).map((c) => ({ label: c.name, message: `مدل‌های ${c.name}` })),
        },
      ]
    );
  }

  if (intent === "projects") {
    const topP = projects.slice(0, 8);
    return pack(
      `### نمونه‌های اجرا\n\n${topP.map((p) => `• **${p.title}** — ${p.categorySlug || "—"}`).join("\n") || "هنوز نمونه‌ای ثبت نشده."}`,
      [{ type: "link_buttons", items: [{ label: "گالری نمونه‌ها", href: "/projects" }] }, ...contactBlocks()]
    );
  }

  // هسته آزاد: هر متنی روی کاتالوگ جستجو می‌شود
  const scored = models
    .map((m) => ({ m, score: scoreModel(m, preferred, terms, colors) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const codeHit = models.find((m) => {
    const code = (m.code || "").toLowerCase();
    if (!code) return false;
    return t.includes(code) || fullNorm.includes(code) || terms.some((x) => code === x || code.includes(x));
  });

  if (codeHit) {
    const bits = [codeHit.code, codeHit.color || codeHit.fabric, codeHit.categorySlug].filter(Boolean).join(" · ");
    const faq = faqBits.length ? "\n\n" + faqBits.join("\n\n") : "";
    return pack(
      `### مدل پیدا شد\n\n**${codeHit.name || codeHit.code}**\n${bits ? bits + "\n\n" : ""}${codeHit.description ? String(codeHit.description).slice(0, 320) + "\n\n" : ""}اگر نزدیک سلیقه‌تان است از **صفحه تماس** نام، موبایل و ابعاد تقریبی را بفرستید.${faq}`,
      [modelCards([codeHit]), ...contactBlocks()]
    );
  }

  let top = scored.slice(0, 6).map((x) => x.m);
  let weakMatch = false;
  if (!top.length && models.length) {
    top = models.slice(0, 6);
    weakMatch = true;
  }

  const pureFaq =
    intent === "price" ||
    intent === "install" ||
    intent === "contact" ||
    intent === "process" ||
    intent === "care" ||
    intent === "about" ||
    intent === "help";

  if (pureFaq && weakMatch && faqBits.length && terms.length < 2 && preferred.length === 0) {
    return pack(faqBits.join("\n\n"), contactBlocks());
  }

  if (!top.length) {
    return pack(
      voice(
        tone,
        "الان مدلی در کاتالوگ برای نمایش نیست. از صفحه تماس بنویسید تا راهنمایی‌تان کنیم.",
        "در حال حاضر مدلی برای نمایش ثبت نشده است.",
        "فعلاً مدلی تو کاتالوگ نیست — از تماس پیام بده."
      ),
      contactBlocks()
    );
  }

  const tipLine = hints.map((h) => h.tip).filter(Boolean)[0] || "";
  const faq = faqBits.length ? "\n\n" + faqBits.join("\n\n") : "";

  const intro = weakMatch
    ? voice(
        tone,
        `هر جور بگید سعی می‌کنم از روی **کاتالوگ واقعی** (${modelCount} مدل) کمک کنم.\n\n${tipLine ? tipLine + "\n\n" : ""}فعلاً چند مدل از کاتالوگ را می‌بینید. اگر بگویید **کدام اتاق** و **نور روشن یا تاریک**، دقیق‌تر فیلتر می‌کنم:`,
        `چند مدل از کاتالوگ نمایش داده شد. برای پیشنهاد دقیق‌تر فضا و نور را مشخص فرمایید.`,
        `اینا چندتا از مدل‌های فعلی‌ان. بگو اتاق و نور تا دقیق‌تر کنم 😊`
      )
    : voice(
        tone,
        `### پیشنهاد بر اساس حرف شما\n\n${tipLine ? tipLine + "\n\n" : ""}این **${top.length} مدل** از کاتالوگ نزدیک‌تر به چیزی است که گفتید. روی کارت بزنید تا جزئیات را ببینید:`,
        `### پیشنهادها\n\n${tipLine ? tipLine + "\n\n" : ""}موارد زیر بر اساس درخواست شما انتخاب شده‌اند:`,
        `${tipLine ? tipLine + "\n\n" : ""}اینا نزدیک حرفات بودن — روی کارت بزن:`
      );

  const close =
    "\n\n" +
    voice(
      tone,
      `**قدم بعدی:** اگر یکی را پسندیدید از **صفحه تماس** نام، موبایل و ابعاد تقریبی را بفرستید.\n\nمی‌توانید آزادتر هم بنویسید — مثلاً «تاریک‌تر»، «مدرن‌تر»، «کرم باشه»، یا هر توضیح دیگری.`,
      "در صورت تأیید مدل از صفحه تماس اقدام فرمایید. برای تغییر فیلتر همین‌جا بنویسید.",
      "پسندیدی؟ برو تماس. یا همین‌جا بگو تاریک‌تر / روشن‌تر / رنگ دیگه."
    );

  return pack(`${intro}${close}${faq}`, [
    modelCards(top),
    {
      type: "quick_replies",
      items: [
        { label: "تماس برای قیمت", message: "میخوام برای قیمت و بازدید تماس بگیرم" },
        { label: "تاریک‌تر", message: "نسخه تاریک‌تر یا بلک‌اوت میخوام" },
        { label: "روشن‌تر", message: "نسخه روشن‌تر و شفاف" },
        { label: "مدرن‌تر", message: "سبک مدرن‌تر نشون بده" },
        { label: "کلاسیک‌تر", message: "سبک کلاسیک و لوکس" },
      ],
    },
    {
      type: "link_buttons",
      items: [
        { label: "درخواست مشاوره و قیمت", href: "/contact" },
        { label: "کاتالوگ کامل", href: "/catalog" },
        { label: "نمونه‌های اجرا", href: "/projects" },
      ],
    },
  ], { intent, preferred, hits: scored.length, weakMatch, tone });
}

export async function buildAdminAssistantReply(
  userText: string,
  history: ChatMessage[] = [],
  context: AssistantContext = {},
  options?: { imageUrl?: string; conversationId?: string }
): Promise<AssistantResult> {
  return buildAdminReply(userText, history, context, options);
}

export async function buildAssistantReply(
  agentName: string,
  userText: string,
  history: ChatMessage[] = [],
  context: AssistantContext = {},
  options?: { imageUrl?: string; conversationId?: string }
): Promise<AssistantResult> {
  if (agentName === "admin_assistant") {
    return buildAdminAssistantReply(userText, history, context, options);
  }
  return buildConsultantReply(userText, history);
}
>>>>>>> 67ee9fa (from server)
