/**
 * Customer assistant — strong local NLU over full catalog/projects/shop data.
 * Matches any tone (casual/formal/slang), answers free-form questions, returns rich blocks.
 * Responses are intentionally long, educational and actionable.
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
  { keys: ["بلک", "blackout", "تاریک", "خواب", "نور نده", "اتاق خواب", "سیاه", "شب"], slugs: ["shade", "zebra", "roman"], tip: "برای خواب عمیق معمولاً شید بلک‌اوت یا زبرا بهترین‌اند؛ نور بیرونی تقریباً کامل قطع می‌شود." },
  { keys: ["شفاف", "تور", "نورگیر", "روشن", "sheer", "حریر", "دلباز", "پرنور"], slugs: ["sheer", "silk"], tip: "تور و حریر نور را نرم می‌کنند، حریم نسبی می‌دهند و فضا را بزرگ‌تر و دلبازتر نشان می‌دهند." },
  { keys: ["کلاسیک", "لوکس", "مجلل", "مجلسی", "سلیقه", "سنتی", "لاکچری"], slugs: ["velvet", "roman", "silk", "sheer"], tip: "حس کلاسیک با مخمل یا رومن + لایه تور خیلی شیک درمی‌آید؛ عمق رنگ و تاهای مرتب فضا را مجلل می‌کند." },
  { keys: ["مدرن", "ساده", "مینیمال", "جوان", "اسکاندی"], slugs: ["turk-panel", "shade", "zebra", "roller", "cubism"], tip: "برای مدرن: ترک‌پنل، شید یا زبرا خط تمیز و بدون شلوغی می‌دهند و با مبلمان مینیمال عالی جور می‌شوند." },
  { keys: ["اداری", "دفتر", "تجاری", "شرکت", "محل کار", "اداره"], slugs: ["zebra", "shade", "roller", "office"], tip: "دفتر: زبرا و شید هم حریم می‌دهند هم نور روز را کنترل می‌کنند؛ خستگی چشم کمتر و ظاهر حرفه‌ای." },
  { keys: ["آشپزخانه", "kitchen", "اپن"], slugs: ["kitchen", "roman", "shade", "roller"], tip: "آشپزخانه بهتر است جمع‌وجور و قابل شستشو باشد — رومن یا شید کوتاه معمولاً عملی‌ترند." },
  { keys: ["نشیمن", "پذیرایی", "سالن", "living", "هال", "لابی"], slugs: ["velvet", "sheer", "roman", "zebra", "silk"], tip: "پذیرایی اغلب ترکیب تور (لایه اول) + لایه ضخیم‌تر یا رومن جواب می‌دهد؛ هم روز روشن است هم شب خصوصی." },
  { keys: ["شید", "shade"], slugs: ["shade"], tip: "شید تا بالا جمع می‌شود؛ خط افقی تمیز دارد و برای مطالعه و تلویزیون خیلی راحت است." },
  { keys: ["زبرا", "zebra"], slugs: ["zebra"], tip: "زبرا با چرخاندن نوارها بین شفاف و مات جابه‌جا می‌شود؛ کنترل نور دقیق بدون جمع کردن کامل پرده." },
  { keys: ["رومن", "roman"], slugs: ["roman"], tip: "رومن تاهای مرتب و افقی می‌سازد و ظاهر رسمی‌تری دارد؛ برای پذیرایی و اتاق خواب کلاسیک عالی است." },
  { keys: ["پلیسه", "pleated"], slugs: ["pleated", "pleated-manual", "pleated-chain"], tip: "پلیسه بافت ظریف و چین‌های منظم دارد و برای پنجره‌های متوسط تا بزرگ بسیار شیک است." },
  { keys: ["پنل", "ترک", "panel", "turk"], slugs: ["turk-panel", "panel"], tip: "ترک‌پنل خطوط عمودی تمیز و مدرن می‌دهد؛ مخصوصاً روی پنجره‌های عریض و دیوار شیشه‌ای عالی کار می‌کند." },
  { keys: ["کرکره", "رولر", "roller", "رول", "blind"], slugs: ["roller"], tip: "کرکره/رولر کاربردی و اقتصادی برای کنترل نور است؛ نگهداری ساده و ظاهر مینیمال." },
  { keys: ["مخمل", "velvet"], slugs: ["velvet"], tip: "مخمل عمق رنگی و حس لوکس برای پذیرایی می‌آورد؛ بافت نرم و سنگینی دارد که فضا را گرم می‌کند." },
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
    "اون", "رو", "را", "من", "تو", "ما", "شما", "اونجا", "اینجا",
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
  for (const t of terms) {
    if (!t || t.length < 2) continue;
    if (code === t || code.includes(t)) score += 12;
    if (blob.includes(t)) score += 4;
    if (normalize(m.name || "").includes(t)) score += 5;
  }
  for (const c of colors) if (blob.includes(normalize(c))) score += 6;
  if (m.installImage) score += 1;
  if (m.image) score += 0.5;
  return score;
}

function historyBlob(history: ChatMessage[]) {
  return history
    .filter((m) => m.role === "user")
    .slice(-10)
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

  if (
    /پیشنهاد|چی\s*بخرم|چی\s*بخریم|چی\s*خوبه|مدل.*(بده|پیشنهاد|خوب|مناسب)|چند\s*مدل|میخوام\s*(پرده|مدل)|برای\s*(نشیمن|خواب|اتاق|دفتر|آشپزخانه)/.test(
      n
    )
  )
    return "recommend";

  if (
    /قیمت|هزینه|مبلغ|بودجه|تخفیف|ارزان|گران|چقدر\s*(پول|هزینه|میشه|میشود)|چند\s*(تومان|میلیون|هزار|پول)|حساب\s*(میشه|میشود|کن)|هزینه\s*نصب/.test(
      n
    )
  )
    return "price";

  if (/نمونه\s*کار|نمونه\s*اجرا|پروژه|گالری\s*کار|کارهای\s*(شما|قبلی)|اجرا\s*شده/.test(n))
    return "projects";

  if (/نصب|اندازه\s*گیری|بازدید|دوخت|نصاب|اندازه\s*بگیر/.test(n)) return "install";
  if (/فروشگاه|اکسسوری|یراق|قلاب|محصول\s*فروش|ریل\s*پرده/.test(n)) return "shop";
  if (/درباره\s*(ما|شرکت)|شرکت\s*آنتیک|سابقه|برند|کی\s*هستید|چند\s*سال/.test(n)) return "about";
  if (/تماس|آدرس|تلفن|واتساپ|محل\s*نمایش|شعبه|شماره\s*تماس|هماهنگ|مشاوره\s*بگیر|زنگ|تماس\s*بگیر|کجا\s*هستید/.test(n))
    return "contact";
  if (/شستشو|نگهداری|تمیز|لکه|مراقبت|چطور\s*بشورم|چطور\s*تمیز/.test(n)) return "care";
  if (/تفاوت|فرق|مقایسه|کدام\s*بهتر|کدوم\s*بهتر/.test(n)) return "compare";
  if (/دسته.?بندی|انواع\s*پرده|چه\s*سبک|لیست\s*دسته|چه\s*جور\s*پرده|چه\s*مدل.?هایی\s*دارید/.test(n))
    return "categories";
  if (/کاتالوگ|همه\s*مدل|همه\s*رو\s*نشون|ببینم\s*کاتالوگ/.test(n)) return "catalog";
  if (/کمک|راهنما|چیکار\s*کنم|نمیدونم|نمی\s*دونم|چطور\s*شروع|از\s*کجا\s*شروع/.test(n)) return "help";
  if (/مراحل|فرآیند|روند|چطور\s*سفارش|چجوری\s*سفارش|از\s*سفارش\s*تا\s*نصب/.test(n)) return "process";
  if (/پارچه|جنس|متریال|الیاف|پلی\s*استر|کتان|مخمل|حریر/.test(n)) return "material";
  if (
    /شید|زبرا|رومن|پلیسه|ترک.?پنل|کرکره|بلک.?اوت|نشیمن|اتاق\s*خواب|آشپزخانه|دفتر|مدرن|کلاسیک|مینیمال|لوکس/.test(
      n
    )
  )
    return "recommend";
  if (n.length >= 1) return "search";
  return "unknown";
}

export async function buildConsultantReply(userText: string, history: ChatMessage[] = []): Promise<AssistantResult> {
  const tone = detectTone(userText);
  const t = expandText(userText);
  const intent = detectIntent(userText);
  const data = await loadAll();
  const { categories, models, projects, modelCount, projectCount } = data;
  const fullContext = `${historyBlob(history)} ${userText}`;
  const hints = detectHints(fullContext);
  const preferred = [...new Set(hints.flatMap((h) => h.slugs).filter(Boolean))];
  const terms = extractTerms(userText);
  const colors = COLOR_WORDS.filter((c) => t.includes(normalize(c)));

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
        { label: "میخوام تماس بگیرن", message: "لطفا بگو چطور تماس بگیرم" },
        { label: "مدل پیشنهاد بده", message: "چند مدل خوب پیشنهاد بده" },
        { label: "مراحل کار چیه؟", message: "مراحل از انتخاب تا نصب چیست؟" },
      ],
    },
  ];

  if (intent === "greeting") {
    return pack(
      voice(
        tone,
        `سلام، خیلی خوش اومدید 👋\n\nمن **دستیار طراحی پرده آنتیک** هستم و روی کاتالوگ واقعی سایت کار می‌کنم (الان حدود **${modelCount} مدل** و **${projectCount} نمونه اجرا** داریم).\n\nهدفم اینه که بدون فشار فروش، کمکتون کنم تا مدل مناسب فضاتون رو پیدا کنید. برای پیشنهاد دقیق‌تر این سه تا را بگویید:\n\n1. **فضا** — نشیمن، اتاق خواب، دفتر، آشپزخانه، لابی، …\n2. **نور** — روشن و دلباز می‌خواهید یا تاریک و بلک‌اوت؟\n3. **سلیقه** — مدرن، کلاسیک، مینیمال، لوکس، …\n\nبعد از این، چند مدل واقعی با عکس و لینک جزئیات نشان می‌دهم. اگر کد مدل خاصی دارید همان را بنویسید.\n\n**قیمت و بازدید:** قیمت از روی عکس اعلام نمی‌شود؛ بعد از انتخاب مدل از صفحه تماس اقدام کنید تا اندازه‌گیری و قیمت نهایی هماهنگ شود.`,
        `سلام و احترام.\n\nمشاور طراحی پرده آنتیک در خدمت شماست. بیش از ${modelCount} مدل در کاتالوگ و ${projectCount} نمونه اجرای واقعی موجود است.\n\nلطفاً نوع فضا، میزان نور مورد نظر و سبک مورد علاقه را بفرمایید تا پیشنهاد مناسب همراه با تصویر ارائه شود.`,
        `سلام! من اینجام تا برات پرده درست پیدا کنم 😊\nالان حدود ${modelCount} مدل واقعی داریم.\nبگو اتاق کجاست و نورش چقدر باشه — سریع چندتا گزینه‌ی خوب با عکس درمیارم.`
      ),
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن روشن", message: "نشیمن روشن و دلباز می‌خوام" },
            { label: "خواب تاریک", message: "اتاق خواب تاریک بلک‌اوت" },
            { label: "تفاوت شید و زبرا", message: "تفاوت شید و زبرا چیست؟" },
            { label: "قیمت چطور؟", message: "قیمت پرده چطور حساب می‌شود؟" },
            { label: "مراحل کار", message: "مراحل از انتخاب تا نصب چیست؟" },
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
      voice(
        tone,
        "خواهش می‌کنم 🙏 هر سوال دیگری داشتید بپرسید — از تفاوت مکانیزم‌ها تا نگهداری و مسیر قیمت و بازدید.",
        "خواهش می‌کنم. در خدمت شما هستم.",
        "مرسی از شما 😊 هر وقت خواستی دوباره بپرس."
      ),
      contactBlocks()
    );
  }

  if (intent === "rude") {
    return pack("متوجه شدم کمی ناراحتید. من اینجام تا کمک کنم مدل مناسب پیدا کنید. اگر سوال مشخصی درباره پرده دارید بفرمایید.");
  }

  if (intent === "price" || intent === "install" || intent === "contact") {
    return pack(
      voice(
        tone,
        `**قیمت و نصب** روی عکس یا کد مدل اعلام نمی‌شود — بستگی به ابعاد پنجره، مکانیزم، پارچه و دوخت دارد.\n\nمسیر درست:\n1. مدل را از کاتالوگ یا همین چت انتخاب کنید\n2. از **صفحه تماس** نام، موبایل و ابعاد تقریبی را بفرستید\n3. بازدید / اندازه‌گیری هماهنگ می‌شود و قیمت نهایی اعلام می‌گردد\n\nاگر مدل خاصی مدنظرتان است کد یا نامش را بنویسید تا جزئیاتش را نشان دهم.`,
        "برای اعلام قیمت نیاز به ابعاد و بازدید است. از صفحه تماس اقدام فرمایید.",
        "قیمت از روی عکس نمیشه گفت. مدل بگو + برو تماس تا اندازه‌گیری هماهنگ بشه."
      ),
      contactBlocks()
    );
  }

  if (intent === "process") {
    return pack(
      `### مراحل از انتخاب تا نصب\n\n1. **انتخاب مدل** از کاتالوگ یا پیشنهاد این دستیار\n2. **ثبت درخواست** در صفحه تماس (نام، موبایل، ابعاد تقریبی)\n3. **بازدید / اندازه‌گیری** در محل\n4. **تایید قیمت و دوخت**\n5. **نصب** توسط تیم\n\nمی‌توانید الان فضا و نور را بگویید تا چند مدل واقعی پیشنهاد کنم.`,
      contactBlocks()
    );
  }

  if (intent === "help") {
    return pack(
      `می‌توانم کمک کنم با:\n• پیشنهاد مدل بر اساس فضا و نور\n• توضیح تفاوت شید، زبرا، رومن، ترک‌پنل، …\n• نمایش نمونه اجرا\n• مسیر قیمت و نصب\n• نگهداری پارچه\n\nمثلاً بنویسید: «نشیمن روشن می‌خوام» یا «تفاوت شید و زبرا».`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن روشن", message: "نشیمن روشن و دلباز می‌خوام" },
            { label: "خواب بلک‌اوت", message: "اتاق خواب تاریک بلک‌اوت" },
            { label: "تفاوت شید و زبرا", message: "تفاوت شید و زبرا چیست؟" },
          ],
        },
      ]
    );
  }

  if (intent === "categories" || intent === "catalog") {
    const lines = categories
      .slice(0, 20)
      .map((c) => `• **${c.name}** (\\`${c.slug}\\`)`)
      .join("\n");
    return pack(
      `### دسته‌های کاتالوگ\n\n${lines || "هنوز دسته‌ای ثبت نشده."}\n\nنام دسته یا فضا را بگویید تا مدل‌های همان بخش را با عکس بیاورم.`,
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

  if (intent === "shop") {
    return pack(
      `بخش **فروشگاه** برای اکسسوری و محصولات جانبی است. برای پرده اصلی از کاتالوگ و پیشنهاد مدل استفاده کنید.`,
      [
        {
          type: "link_buttons",
          items: [
            { label: "فروشگاه", href: "/shop" },
            { label: "کاتالوگ پرده", href: "/catalog" },
          ],
        },
      ]
    );
  }

  if (intent === "projects") {
    const top = projects.slice(0, 6);
    return pack(
      `### نمونه‌های اجرا\n\n${top.map((p) => `• **${p.title}** — ${p.categorySlug || "—"}`).join("\n") || "هنوز نمونه‌ای ثبت نشده."}`,
      [
        {
          type: "link_buttons",
          items: [{ label: "گالری نمونه‌ها", href: "/projects" }],
        },
      ]
    );
  }

  if (intent === "about") {
    return pack(
      `**پرده آنتیک** روی طراحی تا اجرای پرده و پارچه کار می‌کند. کاتالوگ مدل‌ها و نمونه‌های اجرا در سایت در دسترس است. برای مشاوره از صفحه تماس اقدام کنید.`,
      contactBlocks()
    );
  }

  if (intent === "compare") {
    return pack(
      `### مقایسه کوتاه\n\n• **شید:** جمع‌شونده، خط تمیز، مناسب مطالعه و تلویزیون\n• **زبرا:** نوارهای شفاف/مات، کنترل نور دقیق بدون جمع کامل\n• **رومن:** تاهای افقی مرتب، ظاهر رسمی‌تر\n• **ترک‌پنل:** خطوط عمودی مدرن روی پنجره عریض\n• **پلیسه:** چین منظم و ظریف\n\nفضا را بگویید تا بگویم کدام‌یک معمولاً مناسب‌تر است و مدل واقعی نشان دهم.`,
      contactBlocks()
    );
  }

  if (intent === "care") {
    return pack(
      `### نگهداری\n\n• گردگیری ملایم منظم\n• شستشوی تخصصی برای مخمل و پارچه‌های خاص\n• دوری از رطوبت مستقیم زیاد برای بعضی مکانیزم‌ها\n\nجنس دقیق مدل را از صفحه همان مدل ببینید؛ اگر کد دارید بفرستید راهنمایی دقیق‌تر می‌دهم.`,
      contactBlocks()
    );
  }

  if (intent === "material") {
    return pack(
      `جنس پارچه روی نور، حریم و حس فضا اثر دارد (تور/حریر روشن‌تر؛ مخمل و بلک‌اوت سنگین‌تر). مدل یا فضا را بگویید تا از روی کاتالوگ واقعی پیشنهاد بدهم.`,
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
    if (!code) return false;
    return t.includes(code) || terms.some((x) => code === x || code.includes(x));
  });
  if (codeHit) {
    const bits = [codeHit.code, codeHit.color || codeHit.fabric, codeHit.categorySlug].filter(Boolean).join(" · ");
    return pack(
      `### مدل پیدا شد\n\n**${codeHit.name || codeHit.code}**\n${bits ? `${bits}\n\n` : ""}${codeHit.description ? String(codeHit.description).slice(0, 320) + "\n\n" : ""}اگر این مدل نزدیک سلیقه‌تان است، از **صفحه تماس** نام، شماره موبایل و ابعاد تقریبی پنجره را بفرستید تا بازدید و قیمت نهایی هماهنگ شود.\n\nمی‌توانید بگویید «مدل‌های مشابه» تا گزینه‌های نزدیک‌تر را هم نشان دهم.`,
      [modelCards([codeHit]), ...contactBlocks()]
    );
  }

  if (scored.length === 0 && models.length && (intent === "recommend" || intent === "search" || intent === "yesno")) {
    const fallback = models.slice(0, 6);
    return pack(
      voice(
        tone,
        `چند مدل از کاتالوگ فعلی (حدود **${modelCount}** مدل) را می‌بینید. اگر فضا یا سبک مشخص‌تری بگویید، دقیق‌تر فیلتر می‌کنم:\n\n• نشیمن / اتاق خواب / دفتر / آشپزخانه\n• روشن و دلباز یا تاریک و بلک‌اوت\n• مدرن، کلاسیک، مینیمال یا لوکس`,
        `چند مدل از کاتالوگ نمایش داده شد. برای فیلتر دقیق‌تر نوع فضا و نور را مشخص فرمایید.`,
        `اینا چندتا از مدل‌های فعلی‌ان — بگو فضا و نور تا دقیق‌تر کنم.`
      ),
      [
        modelCards(fallback),
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن روشن", message: "نشیمن روشن و دلباز می‌خوام" },
            { label: "خواب بلک‌اوت", message: "اتاق خواب تاریک بلک‌اوت" },
            { label: "تفاوت شید و زبرا", message: "تفاوت شید و زبرا چیست؟" },
          ],
        },
        ...contactBlocks(),
      ],
      { intent, fallback: true }
    );
  }

  if (scored.length === 0) {
    return pack(
      voice(
        tone,
        `هنوز دقیقاً نفهمیدم چه فضایی مدنظر است.\n\nلطفاً این سه مورد را بگویید تا پیشنهاد دقیق بدهم:\n\n1. **کدام اتاق؟** (نشیمن، خواب، دفتر، آشپزخانه، …)\n2. **نور:** روشن و دلباز یا تاریک و بلک‌اوت؟\n3. **سبک:** مدرن، کلاسیک، مینیمال یا لوکس؟\n\nبا همین اطلاعات چند مدل واقعی از کاتالوگ (حدود ${modelCount} مدل) با عکس پیشنهاد می‌دهم.`,
        "لطفاً نوع فضا، میزان نور و سبک مورد نظر را مشخص فرمایید تا پیشنهاد دقیق ارائه شود.",
        "بگو اتاق کجاست و نورش روشن باشه یا تاریک — سریع برات مدل میارم."
      ),
      contactBlocks()
    );
  }

  const top = scored.slice(0, 6).map((x) => x.m);
  const tipLine = hints.map((h) => h.tip).filter(Boolean)[0] || "";
  const intro = voice(
    tone,
    `### پیشنهاد مدل برای شما\n\n${tipLine ? tipLine + "\n\n" : ""}طبق چیزی که گفتید، این **${top.length} مدل** از کاتالوگ واقعی نزدیک‌ترند. روی کارت‌ها بزنید تا جزئیات و تصویر بزرگ‌تر را ببینید:`,
    `### پیشنهادها\n\n${tipLine ? tipLine + "\n\n" : ""}موارد زیر بر اساس درخواست شما از بین مدل‌های موجود انتخاب شده‌اند:`,
    `${tipLine ? tipLine + "\n\n" : ""}اینا نزدیک‌ترن به حرفات — روی کارت بزن جزئیات ببین:`
  );
  const close =
    "\n\n" +
    voice(
      tone,
      `**قدم بعدی:**  \nاگر یکی را پسندیدید، از **صفحه تماس** نام، شماره موبایل و ابعاد تقریبی پنجره را بفرستید تا بازدید و قیمت نهایی هماهنگ شود.\n\nمی‌توانید بگویید «تاریک‌تر»، «روشن‌تر»، «مدرن‌تر» یا «کلاسیک‌تر» تا فیلتر را عوض کنم. یا کد/نام مدل دیگری را بنویسید.`,
      "در صورت تأیید مدل، از صفحه تماس اقدام فرمایید. برای فیلتر دیگر (تاریک‌تر / روشن‌تر) همین‌جا بنویسید.",
      "پسندیدی؟ برو تماس و ابعاد+شماره بذار. یا بگو تاریک‌تر / روشن‌تر تا عوض کنم."
    );

  return pack(`${intro}${close}`, [
    modelCards(top),
    {
      type: "quick_replies",
      items: [
        { label: "میخوام تماس بگیرن", message: "می‌خوام برای قیمت و بازدید تماس بگیرم" },
        { label: "تاریک‌تر", message: "نسخه تاریک‌تر یا بلک‌اوت" },
        { label: "روشن‌تر", message: "نسخه روشن‌تر و شفاف" },
        { label: "قیمت؟", message: "درباره قیمت بگو" },
        { label: "مراحل کار", message: "مراحل از انتخاب تا نصب چیست؟" },
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
  ], { intent, preferred, hits: scored.length, tone });
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
