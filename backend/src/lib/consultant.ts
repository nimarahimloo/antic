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
  const blob = normalize(
    `${m.name} ${m.code || ""} ${m.fabric || ""} ${m.color || ""} ${m.description || ""} ${m.material || ""} ${m.texture || ""} ${slug} ${sub}`
  );
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
  if (/قیمت|هزینه|مبلغ|چند|ارزان|گران|بودجه|تخفیف|حساب/.test(n)) return "price";
  if (/نصب|اندازه|بازدید|اجرا|اندازه گیری|دوخت|نصاب|نصاب میاد|نصاب بیاد/.test(n)) return "install";
  if (/نمونه|پروژه|اجرا شده|گالری کار|نمونه کار|کارهای شما|کارهای قبلی/.test(n)) return "projects";
  if (/فروشگاه|اکسسوری|یراق|قلاب|محصول|ریل/.test(n)) return "shop";
  if (/درباره|شرکت|آنتیک|سابقه|برند|کی هستید|چند سال/.test(n)) return "about";
  if (/تماس|آدرس|تلفن|واتساپ|محل|شعبه|شماره|هماهنگ|مشاوره بگیر|زنگ|تماس بگیر|کجا هستید/.test(n)) return "contact";
  if (/شستشو|نگهداری|تمیز|لکه|مراقبت|چطور بشورم|چطور تمیز/.test(n)) return "care";
  if (/تفاوت|فرق|مقایسه|کدام بهتر|کدوم بهتر|چیزی بهتر/.test(n)) return "compare";
  if (/دسته|انواع پرده|چه مدل|چه سبک|لیست دسته|چه جور/.test(n)) return "categories";
  if (/کاتالوگ|همه مدل|ببینم|همه رو نشون/.test(n)) return "catalog";
  if (/کمک|راهنما|چیکار|نمیدونم|نمی دونم|چطور شروع|از کجا شروع/.test(n)) return "help";
  if (/پیشنهاد|پیشنهاد بده|چی بخرم|مناسب|چی خوبه|چی بخریم/.test(n)) return "recommend";
  if (/مراحل|فرآیند|روند|چطور سفارش|چجوری سفارش|از سفارش تا نصب/.test(n)) return "process";
  if (/پارچه|جنس|متریال|الیاف|پلی استر|کتان|مخمل|حریر/.test(n)) return "material";
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

  // ─── GREETING ───
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
        "خواهش می‌کنم 🙏 هر سوال دیگری داشتید بپرسید — از تفاوت مکانیزم‌ها تا نگهداری و مسیر قیمت و بازدید. برای هماهنگی حضوری از صفحه تماس اقدام کنید.",
        "موفق باشید. در صورت نیاز مجدد در خدمتم.",
        "مرسی — هر وقت آماده بودی برو تماس یا دوباره بپرس."
      )
    );
  }

  if (intent === "rude") {
    return pack("متوجه شدم کمی ناراحتید. من اینجام تا کمک کنم مدل مناسب پیدا کنید. اگر سوال مشخصی درباره پرده دارید بفرمایید.");
  }

  // ─── PRICE / INSTALL / CONTACT ───
  if (intent === "price" || intent === "install" || intent === "contact") {
    return pack(
      voice(
        tone,
        `### قیمت، اندازه‌گیری، نصب و تماس\n\n**چرا قیمت ثابت از روی عکس اعلام نمی‌شود؟**\nچون هزینه نهایی به این موارد بستگی دارد:\n- **ابعاد دقیق پنجره** (عرض و ارتفاع)\n- **نوع مکانیزم** (شید، زبرا، رومن، ترک‌پنل، پلیسه، …)\n- **پارچه و لایه‌ها** (بلک‌اوت، نیمه‌شفاف، مخمل، تور، حریر)\n- **یراق‌آلات و ریل**\n- **شرایط نصب** (ارتفاع، نوع دیوار/سقف، دسترسی)\n\n**مسیر استاندارد آنتیک (از انتخاب تا نصب):**\n1. **انتخاب مدل** از کاتالوگ (همین‌جا کمک می‌کنم مدل نزدیک سلیقه را پیدا کنید)\n2. **ثبت درخواست** در صفحه تماس با نام، شماره موبایل و ابعاد تقریبی\n3. **هماهنگی بازدید** برای اندازه‌گیری دقیق توسط تیم\n4. **اعلام قیمت نهایی** و زمان تقریبی دوخت\n5. **دوخت سفارشی** و **نصب حرفه‌ای** در محل\n\nاگر مدل خاصی مدنظرتان است نام یا کد آن را بگویید تا لینک و کارت همان مدل را بیاورم. در غیر این صورت فضا و نور را بگویید تا پیشنهاد بدهم.`,
        "برای برآورد هزینه و زمان نصب، ابعاد و مدل لازم است. لطفاً از صفحه تماس اقدام فرمایید یا مدل مورد نظر را ذکر کنید تا راهنمایی دقیق‌تری ارائه شود.",
        "قیمت بدون ابعاد و مدل نمی‌شه دقیق گفت.\nبرو صفحه تماس → نام + شماره + عرض/ارتفاع تقریبی.\nاگر مدل داری همین‌جا بگو تا برات پیدا کنم."
      ),
      contactBlocks()
    );
  }

  // ─── PROCESS ───
  if (intent === "process") {
    return pack(
      `### مراحل کامل از انتخاب تا نصب\n\n**۱. الهام و انتخاب مدل**\nاز کاتالوگ سایت یا همین دستیار چند مدل را با عکس ببینید. می‌توانید سبک (مدرن/کلاسیک)، فضا و میزان نور را بگویید تا فیلتر شود.\n\n**۲. درخواست مشاوره**\nاز صفحه **تماس** نام، شماره و ابعاد تقریبی پنجره را ثبت کنید. اگر مدل خاصی را پسندیده‌اید ذکر کنید.\n\n**۳. بازدید و اندازه‌گیری**\nتیم آنتیک در زمان هماهنگ‌شده به محل می‌آید، ابعاد دقیق را می‌گیرد و شرایط نصب را بررسی می‌کند.\n\n**۴. اعلام قیمت و تایید**\nبر اساس ابعاد، پارچه و مکانیزم قیمت نهایی و زمان تحویل اعلام می‌شود. بعد از تایید شما کار شروع می‌شود.\n\n**۵. دوخت سفارشی**\nپرده مطابق ابعاد و مدل انتخابی دوخته می‌شود.\n\n**۶. نصب**\nنصاب حرفه‌ای ریل/مکانیزم و پرده را نصب می‌کند و تنظیم نهایی انجام می‌شود.\n\nاگر الان در مرحله انتخاب هستید، بگویید فضا و نور چطور باشد تا مدل پیشنهاد دهم.`,
      contactBlocks()
    );
  }

  // ─── HELP ───
  if (intent === "help") {
    return pack(
      `### چطور می‌توانم کمکتان کنم؟\n\nمن روی **کاتالوگ واقعی** و **نمونه‌های اجرا** کار می‌کنم. می‌توانید از من بپرسید:\n\n- **پیشنهاد مدل** برای نشیمن، خواب، دفتر، آشپزخانه، لابی\n- **تفاوت مکانیزم‌ها** (شید، زبرا، رومن، ترک‌پنل، پلیسه، مخمل، تور)\n- **دسته‌ها و کاتالوگ** کامل\n- **نمونه‌های اجرای واقعی** با لینک گالری\n- **قیمت و نصب** و مسیر تماس و بازدید\n- **مراقبت و شستشو** پرده\n- **جنس و پارچه** (متریال)\n- **کد مدل** اگر کد را دارید\n\n**پیشنهاد شروع سریع:**\nفقط بگویید مثلاً «نشیمن روشن» یا «خواب بلک‌اوت» یا «دفتر مدرن» — چند مدل با عکس پیشنهاد می‌دهم.`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن مدرن", message: "نشیمن مدرن می‌خوام" },
            { label: "خواب بلک‌اوت", message: "اتاق خواب بلک‌اوت" },
            { label: "تفاوت شید و زبرا", message: "تفاوت شید و زبرا چیست؟" },
            { label: "مراحل کار", message: "مراحل از انتخاب تا نصب چیست؟" },
            { label: "نگهداری پرده", message: "چطور از پرده مراقبت کنم؟" },
          ],
        },
        ...contactBlocks(),
      ]
    );
  }

  // ─── CATEGORIES / CATALOG ───
  if (intent === "categories" || intent === "catalog") {
    const names = categories
      .slice(0, 16)
      .map((c) => {
        const mech = c.mechanism ? ` — ${c.mechanism}` : "";
        const desc = c.description ? ` · ${String(c.description).slice(0, 60)}` : "";
        return `• **${c.name}**${mech}${desc}`;
      })
      .join("\n");
    return pack(
      `### دسته‌های کاتالوگ آنتیک\n\nالان حدود **${modelCount} مدل** در دسته‌های زیر قرار دارند:\n\n${names || "—"}\n\nروی هر دسته می‌توانید کلیک کنید یا **نام دسته** را همین‌جا بنویسید تا مدل‌های همان گروه را با عکس نشان دهم.\n\nبرای دیدن همه مدل‌ها از دکمه **کاتالوگ کامل** استفاده کنید. اگر فضا و نور را هم بگویید، پیشنهاد دقیق‌تری می‌دهم.`,
      [
        { type: "link_buttons", items: [{ label: "کاتالوگ کامل", href: "/catalog" }, { label: "تماس و قیمت", href: "/contact" }] },
        {
          type: "quick_replies",
          items: categories.slice(0, 5).map((c) => ({ label: c.name, message: `مدل‌های دسته ${c.name}` })),
        },
      ]
    );
  }

  // ─── SHOP ───
  if (intent === "shop") {
    return pack(
      `### فروشگاه آنتیک\n\nفروشگاه آنلاین بیشتر برای **اکسسوری و یراق** است (قلاب، ریل، قطعات جانبی و …).\n\n**پرده اصلی** معمولاً از مسیر کاتالوگ انتخاب می‌شود و بعد از اندازه‌گیری و دوخت سفارشی تحویل و نصب می‌گردد.\n\nاگر به دنبال یراق یا محصول خاصی هستید بگویید. در غیر این صورت برای خود پرده، فضا و نور را بگویید تا مدل پیشنهاد بدهم.`,
      [
        { type: "link_buttons", items: [{ label: "فروشگاه", href: "/shop" }, { label: "کاتالوگ پرده", href: "/catalog" }, { label: "تماس", href: "/contact" }] },
      ]
    );
  }

  // ─── PROJECTS ───
  if (intent === "projects") {
    const top = projects.slice(0, 8);
    const lines =
      top.map((p, i) => `${i + 1}. **${p.title}**${p.categorySlug ? ` · ${p.categorySlug}` : ""}`).join("\n") || "—";
    return pack(
      `### نمونه‌های اجرای واقعی آنتیک\n\nاین‌ها بخشی از پروژه‌های انجام‌شده هستند (حدود **${projectCount}** نمونه در سایت):\n\n${lines}\n\nگالری کامل را در صفحه **نمونه‌های اجرا** ببینید؛ آنجا امکان بزرگ‌نمایی و مشاهده چندتصویری وجود دارد.\n\nاگر سبک خاصی می‌خواهید (مدرن، کلاسیک، اداری، نشیمن روشن، خواب تاریک) بگویید تا نزدیک‌ترین نمونه و مدل‌های کاتالوگ مرتبط را جور کنم.`,
      [
        { type: "link_buttons", items: [{ label: "گالری نمونه‌ها", href: "/projects" }, { label: "تماس", href: "/contact" }] },
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن مدرن", message: "نمونه نشیمن مدرن" },
            { label: "خواب بلک‌اوت", message: "نمونه اتاق خواب تاریک" },
            { label: "مدل پیشنهاد بده", message: "چند مدل خوب پیشنهاد بده" },
          ],
        },
      ]
    );
  }

  // ─── ABOUT ───
  if (intent === "about") {
    return pack(
      `### درباره پرده آنتیک\n\nآنتیک روی **مشاوره، دوخت سفارشی و نصب حرفه‌ای** تمرکز دارد.\n\n- حدود **${modelCount} مدل** در کاتالوگ (شید، زبرا، رومن، ترک‌پنل، تور، مخمل، پلیسه و …)\n- **${projectCount}+ نمونه اجرای واقعی** در سایت با امکان مشاهده جزئیات\n- مسیر شفاف: انتخاب مدل → تماس و ابعاد → بازدید → قیمت → دوخت و نصب\n- تمرکز روی کیفیت پارچه، دقت اندازه‌گیری و ظاهر نهایی\n\nاگر بگویید فضا و سلیقه‌تان چیست، از همین‌جا مدل پیشنهاد می‌دهم و لینک جزئیات را می‌فرستم.`,
      contactBlocks()
    );
  }

  // ─── COMPARE ───
  if (intent === "compare") {
    return pack(
      `### مقایسه سریع مکانیزم‌ها و سبک‌ها\n\n| نوع | ویژگی اصلی | مناسب برای | نکته |\n| --- | --- | --- | --- |\n| **شید** | تا بالا جمع می‌شود، خط تمیز افقی | مطالعه، تلویزیون، مدرن، خواب | ساده و کاربردی |\n| **زبرا** | نوار شفاف/مات قابل تنظیم | کنترل نور روز، دفتر، نشیمن | بدون جمع کامل پرده |\n| **رومن** | تاهای مرتب و ظاهر رسمی | پذیرایی کلاسیک، اتاق خواب | حس مجلل‌تر |\n| **ترک‌پنل** | پنل‌های عمودی مدرن | پنجره‌های عریض، مینیمال | خطوط عمودی تمیز |\n| **تور / حریر** | نور نرم و فضای دلباز | لایه دوم کنار پرده ضخیم | فضا را بزرگ‌تر نشان می‌دهد |\n| **مخمل** | عمق رنگ و حس لوکس | پذیرایی مجلل | بافت سنگین و گرم |\n| **پلیسه** | چین‌های ظریف و منظم | پنجره‌های متوسط تا بزرگ | ظاهر ظریف |\n| **رولر / کرکره** | جمع‌وجور و اقتصادی | کنترل نور ساده | نگهداری آسان |\n\n**ترکیب رایج:** تور (لایه روز) + شید/زبرا/رومن (لایه شب یا کنترل نور).\n\nبگویید فضا **روشن** می‌خواهید یا **تاریک** تا مدل‌های همان گروه را با عکس بیاورم.`,
      contactBlocks()
    );
  }

  // ─── CARE ───
  if (intent === "care") {
    return pack(
      `### نگهداری و مراقبت از پرده\n\nنکات کلی (بسته به جنس پارچه ممکن است کمی متفاوت باشد):\n\n**روزمره**\n- گردگیری ملایم با جاروبرقی در حالت کم‌قدرت یا پارچه نرم خشک\n- از کشیدن شدید پارچه خودداری کنید\n\n**شستشو**\n- بسیاری از پرده‌های مدرن (پلی‌استر و مشابه) قابل شستشوی ملایم هستند؛ دستور روی برچسب را رعایت کنید\n- مخمل و بعضی پارچه‌های خاص معمولاً خشکشویی یا تمیزکاری تخصصی توصیه می‌شود\n- از سفیدکننده و آب خیلی داغ پرهیز کنید\n\n**نور و رطوبت**\n- نور مستقیم شدید در طولانی‌مدت می‌تواند رنگ را کم‌رنگ کند؛ چرخش گاه‌به‌گاه یا لایه تور کمک می‌کند\n- در محیط خیلی مرطوب (مثل کنار پنجره آشپزخانه) تهویه مهم است\n\n**نصب و ریل**\n- ریل و مکانیزم را گاه‌به‌گاه از نظر گیر کردن یا صدای غیرعادی چک کنید\n\nاگر مدل خاصی مدنظرتان است بگویید تا راهنمایی دقیق‌تری بر اساس نوع پارچه بدهم. برای انتخاب مدل جدید هم فضا و نور را بگویید.`,
      contactBlocks()
    );
  }

  // ─── MATERIAL ───
  if (intent === "material") {
    return pack(
      `### جنس و پارچه پرده\n\nدر کاتالوگ آنتیک معمولاً با این گروه‌ها روبه‌رو می‌شوید:\n\n- **پلی‌استر و مخلوط‌ها** — رایج، مقاوم، نگهداری نسبتاً آسان، مناسب اکثر فضاها\n- **مخمل** — حس لوکس، عمق رنگ، مناسب پذیرایی\n- **حریر / تور / sheer** — نور نرم، لایه دوم، فضا را دلباز می‌کند\n- **بلک‌اوت** — لایه یا پارچه‌ای که نور را تقریباً کامل مسدود می‌کند (خواب، سالن سینما خانگی)\n- **کتان‌مانند و بافت‌های طبیعی‌تر** — ظاهر گرم‌تر و طبیعی‌تر\n\nانتخاب جنس به **نور مورد نظر**، **سبک دکوراسیون** و **میزان نگهداری** بستگی دارد.\n\nاگر فضا و اولویت‌تان (مثلاً تاریکی کامل یا نور زیاد) را بگویید، مدل‌های مناسب همان نیاز را پیشنهاد می‌دهم.`,
      contactBlocks()
    );
  }

  // ─── SEARCH / RECOMMEND ───
  for (const c of categories) {
    if (t.includes(normalize(c.name)) || t.includes(normalize(c.slug))) preferred.push(c.slug);
  }

  const scored = models
    .map((m) => ({ m, score: scoreModel(m, preferred, terms, colors) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // code exact match
  const codeHit = models.find((m) => {
    const code = (m.code || "").toLowerCase();
    return code && (t.includes(code) || terms.some((term) => code.includes(term) || term.includes(code)));
  });
  if (codeHit) {
    const bits = [codeHit.code, codeHit.color || codeHit.fabric, codeHit.categorySlug].filter(Boolean).join(" · ");
    return pack(
      `### مدل پیدا شد\n\n**${codeHit.name || codeHit.code}**\n${bits ? `${bits}\n\n` : ""}${codeHit.description ? String(codeHit.description).slice(0, 320) + "\n\n" : ""}اگر این مدل نزدیک سلیقه‌تان است، از **صفحه تماس** نام، شماره موبایل و ابعاد تقریبی پنجره را بفرستید تا بازدید و قیمت نهایی هماهنگ شود.\n\nمی‌توانید بگویید «مدل‌های مشابه» تا گزینه‌های نزدیک‌تر را هم نشان دهم.`,
      [modelCards([codeHit]), ...contactBlocks()]
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
