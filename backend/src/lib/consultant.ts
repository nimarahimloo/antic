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
  const { categories, models, projects, modelCount } = data;
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
        `سلام، خوش اومدید 👋\n\nمن **دستیار طراحی پرده آنتیک** هستم. الان حدود **${modelCount} مدل** واقعی در کاتالوگ داریم (شید، زبرا، رومن، ترک‌پنل، تور، مخمل و …).\n\nبرای اینکه پیشنهاد دقیق بدهم این‌ها را بگویید:\n1. **فضا** (نشیمن، خواب، دفتر، آشپزخانه، …)\n2. **نور** (روشن و دلباز یا تاریک و بلک‌اوت)\n3. **سلیقه** (مدرن، کلاسیک، مینیمال)\n\nبعد مدل‌های نزدیک را با عکس نشان می‌دهم. برای **قیمت و بازدید** هم از صفحه تماس اقدام کنید.`,
        `سلام و احترام.\n\nمشاور طراحی پرده آنتیک در خدمت شماست. بیش از ${modelCount} مدل در کاتالوگ موجود است.\nلطفاً نوع فضا، میزان نور مورد نظر و سبک مورد علاقه را بفرمایید تا پیشنهاد مناسب ارائه شود.`,
        `سلام! من اینجام تا برات پرده درست پیدا کنم.\nبگو اتاق کجاست و نورش چقدر باشه — از بین ${modelCount} مدل برات چندتا گزینه‌ی خوب درمیارم.`
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
    return pack(voice(tone, "خواهش می‌کنم. هر سوال دیگری داشتید بپرسید؛ برای بازدید از صفحه تماس هماهنگ کنید.", "موفق باشید. در صورت نیاز مجدد در خدمتم.", "مرسی — برو تماس اگر آماده بودی."));
  }

  if (intent === "price" || intent === "install" || intent === "contact") {
    return pack(
      voice(
        tone,
        `### قیمت، نصب و تماس\n\nقیمت پرده **ثابت از روی عکس** اعلام نمی‌شود؛ به این‌ها بستگی دارد:\n\n- **ابعاد پنجره** (عرض و ارتفاع)\n- **نوع مکانیزم** (شید، زبرا، رومن، ترک‌پنل، …)\n- **پارچه و لایه** (بلک‌اوت، نیمه‌شفاف، مخمل، تور)\n- **یراق و نصب**\n\n**مسیر استاندارد آنتیک:**\n1. انتخاب مدل از کاتالوگ (همین‌جا کمک می‌کنم)\n2. ثبت درخواست در **صفحه تماس** با نام، شماره و ابعاد تقریبی\n3. هماهنگی بازدید / اندازه‌گیری\n4. اعلام قیمت نهایی و زمان دوخت و نصب\n\nاگر مدل خاصی مدنظرتان است بگویید تا لینک و کارت همان مدل را بیاورم.`,
        "برای برآورد هزینه و زمان نصب، ابعاد و مدل لازم است. لطفاً از صفحه تماس اقدام فرمایید یا مدل مورد نظر را ذکر کنید.",
        "قیمت بدون ابعاد نمی‌شه گفت.\nبرو صفحه تماس → نام + شماره + عرض/ارتفاع تقریبی. اگر مدل داری همین‌جا بگو تا برات پیدا کنم."
      ),
      contactBlocks()
    );
  }

  if (intent === "help") {
    return pack(
      `### چطور کمکتان کنم؟\n\nمی‌توانید از من بپرسید:\n\n- **پیشنهاد مدل** برای نشیمن، خواب، دفتر، آشپزخانه\n- **تفاوت** شید، زبرا، رومن، ترک‌پنل\n- **دسته‌ها و کاتالوگ**\n- **نمونه اجرا**های واقعی\n- **قیمت و نصب** (مسیر تماس و بازدید)\n- **کد مدل** اگر کد را دارید\n\nفقط بگویید فضا کجاست و نور را روشن می‌خواهید یا تاریک — چند مدل با عکس پیشنهاد می‌دهم.`,
      contactBlocks()
    );
  }

  if (intent === "categories" || intent === "catalog") {
    const names = categories.slice(0, 14).map((c) => {
      const mech = c.mechanism ? ` — ${c.mechanism}` : "";
      return `• **${c.name}**${mech}`;
    }).join("\n");
    return pack(
      `### دسته‌های کاتالوگ آنتیک\n\n${names || "—"}\n\nروی هر دسته کلیک کنید یا **نام دسته** را همین‌جا بنویسید تا مدل‌های همان گروه را با عکس نشان دهم.\n\nبرای دیدن همه مدل‌ها از دکمه **کاتالوگ** استفاده کنید.`,
      [
        { type: "link_buttons", items: [{ label: "کاتالوگ کامل", href: "/catalog" }, { label: "تماس و قیمت", href: "/contact" }] },
        {
          type: "quick_replies",
          items: categories.slice(0, 4).map((c) => ({ label: c.name, message: `مدل‌های دسته ${c.name}` })),
        },
      ]
    );
  }

  if (intent === "shop") {
    return pack(
      `### فروشگاه آنتیک\n\nفروشگاه آنلاین بیشتر برای **اکسسوری و یراق** است (قلاب، ریل و …).\n\n**پرده اصلی** از مسیر کاتالوگ انتخاب می‌شود و قیمت نهایی بعد از ابعاد در **صفحه تماس** هماهنگ می‌شود.\n\nاگر دنبال اکسسوری هستید وارد فروشگاه شوید؛ اگر دنبال خود پرده هستید بگویید چه فضایی دارید تا مدل پیشنهاد بدهم.`,
      [
        { type: "link_buttons", items: [{ label: "فروشگاه", href: "/shop" }, { label: "کاتالوگ پرده", href: "/catalog" }, { label: "تماس", href: "/contact" }] },
      ]
    );
  }

  if (intent === "projects") {
    const top = projects.slice(0, 6);
    const lines = top.map((p, i) => `${i + 1}. **${p.title}**${p.categorySlug ? ` · ${p.categorySlug}` : ""}`).join("\n") || "—";
    return pack(
      `### نمونه‌های اجرای واقعی\n\nاین‌ها بخشی از پروژه‌های انجام‌شده آنتیک هستند:\n\n${lines}\n\nمی‌توانید گالری کامل را در صفحه **نمونه‌های اجرا** ببینید (با زوم و چندتصویری).\nاگر سبک خاصی می‌خواهید (مدرن، کلاسیک، اداری) بگویید تا نزدیک‌ترین نمونه و مدل کاتالوگ را جور کنم.`,
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

  if (intent === "about") {
    return pack(
      `### درباره پرده آنتیک\n\nآنتیک روی **مشاوره، دوخت سفارشی و نصب حرفه‌ای** تمرکز دارد.\n\n- حدود **${modelCount} مدل** در کاتالوگ\n- دسته‌های متنوع: شید، زبرا، رومن، ترک‌پنل، تور، مخمل و …\n- نمونه‌های اجرای واقعی در سایت\n- مسیر شفاف: انتخاب مدل → تماس و ابعاد → بازدید → قیمت → دوخت و نصب\n\nاگر بگویید فضا و سلیقه‌تان چیست، از همین‌جا مدل پیشنهاد می‌دهم.`,
      contactBlocks()
    );
  }

  if (intent === "compare") {
    return pack(
      `### مقایسه سریع مکانیزم‌ها\n\n| نوع | ویژگی | مناسب برای |\n| --- | --- | --- |\n| **شید** | تا بالا جمع می‌شود، خط تمیز | مطالعه، تلویزیون، مدرن |\n| **زبرا** | نوار شفاف/مات قابل تنظیم | کنترل نور روز، دفتر و نشیمن |\n| **رومن** | تاهای مرتب و ظاهر رسمی | پذیرایی کلاسیک، اتاق خواب |\n| **ترک‌پنل** | پنل‌های عمودی مدرن | پنجره‌های عریض، مینیمال |\n| **تور / حریر** | نور نرم و فضای دلباز | لایه دوم کنار پرده ضخیم |\n| **مخمل** | عمق رنگ و حس لوکس | پذیرایی مجلل |\n\nبگویید فضا **روشن** می‌خواهید یا **تاریک** تا مدل‌های همان گروه را با عکس بیاورم.`,
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
    const bits = [codeHit.code, codeHit.color || codeHit.fabric, codeHit.categorySlug].filter(Boolean).join(" · ");
    return pack(
      `### مدل پیدا شد\n\n**${codeHit.name || codeHit.code}**\n${bits ? `${bits}\n\n` : ""}${codeHit.description ? String(codeHit.description).slice(0, 280) + "\n\n" : ""}اگر این مدل نزدیک سلیقه‌تان است، از **صفحه تماس** نام، شماره و ابعاد تقریبی را بفرستید تا بازدید و قیمت هماهنگ شود.\nمی‌توانید مدل‌های مشابه هم بخواهید.`,
      [modelCards([codeHit]), ...contactBlocks()]
    );
  }

  if (scored.length === 0) {
    return pack(
      voice(
        tone,
        "هنوز دقیقاً نفهمیدم چه فضایی مدنظر است.\n\nلطفاً بگویید:\n- **کدام اتاق؟** (نشیمن، خواب، دفتر، …)\n- **نور:** روشن و دلباز یا تاریک و بلک‌اوت؟\n- **سبک:** مدرن، کلاسیک یا ساده؟\n\nبا همین سه مورد چند مدل واقعی با عکس پیشنهاد می‌دهم.",
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
    `### پیشنهاد مدل برای شما\n\n${tipLine ? tipLine + "\n\n" : ""}طبق چیزی که گفتید، این **${top.length} مدل** از کاتالوگ واقعی نزدیک‌ترند (کارت‌ها را ببینید):`,
    `### پیشنهادها\n\n${tipLine ? tipLine + "\n\n" : ""}موارد زیر بر اساس درخواست شما انتخاب شده‌اند:`,
    `${tipLine ? tipLine + "\n\n" : ""}اینا نزدیک‌ترن به حرفات — روی کارت بزن جزئیات ببین:`
  );
  const close =
    "\n\n" +
    voice(
      tone,
      "**قدم بعدی:** اگر یکی را پسندیدید، از **صفحه تماس** نام، شماره موبایل و ابعاد تقریبی پنجره را بفرستید تا بازدید و قیمت نهایی هماهنگ شود.\nمی‌توانید بگویید «تاریک‌تر» یا «روشن‌تر» تا فیلتر را عوض کنم.",
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
