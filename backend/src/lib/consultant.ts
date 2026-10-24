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

/* ═══════════════ text utils ═══════════════ */
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

/** expand common slang / typos so matching is looser */
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

/* ═══════════════ domain knowledge ═══════════════ */
const STYLE_HINTS: { keys: string[]; slugs: string[]; tip: string }[] = [
  {
    keys: ["بلک", "blackout", "تاریک", "خواب", "نور نده", "اتاق خواب", "سیاه", "شب"],
    slugs: ["shade", "zebra", "roman"],
    tip: "برای خواب عمیق معمولاً شید بلک‌اوت یا زبرا بهترین‌اند.",
  },
  {
    keys: ["شفاف", "تور", "نورگیر", "روشن", "sheer", "حریر", "دلباز", "پرنور"],
    slugs: ["sheer", "silk"],
    tip: "تور و حریر نور را نرم می‌کنند و فضا را بزرگ‌تر نشان می‌دهند.",
  },
  {
    keys: ["کلاسیک", "لوکس", "مجلل", "مجلسی", "سلیقه", "سنتی", "لاکچری"],
    slugs: ["velvet", "roman", "silk", "sheer"],
    tip: "حس کلاسیک با مخمل/رومن و لایه تور خیلی شیک درمی‌آید.",
  },
  {
    keys: ["مدرن", "ساده", "مینیمال", "جوان", "اسکاندی"],
    slugs: ["turk-panel", "shade", "zebra", "roller", "cubism"],
    tip: "برای مدرن: ترک‌پنل، شید یا زبرا خط تمیز می‌دهند.",
  },
  {
    keys: ["اداری", "دفتر", "تجاری", "شرکت", "محل کار", "اداره"],
    slugs: ["zebra", "shade", "roller", "office"],
    tip: "دفتر: زبرا و شید هم حریم می‌دهند هم نور را کنترل می‌کنند.",
  },
  {
    keys: ["آشپزخانه", "kitchen", "اپن"],
    slugs: ["kitchen", "roman", "shade", "roller"],
    tip: "آشپزخانه بهتر است جمع‌وجور باشد — رومن یا شید.",
  },
  {
    keys: ["نشیمن", "پذیرایی", "سالن", "living", "هال", "لابی"],
    slugs: ["velvet", "sheer", "roman", "zebra", "silk"],
    tip: "پذیرایی اغلب ترکیب تور + لایه ضخیم‌تر یا رومن جواب می‌دهد.",
  },
  { keys: ["شید", "shade"], slugs: ["shade"], tip: "شید تا بالا جمع می‌شود؛ برای مطالعه و تلویزیون راحت است." },
  { keys: ["زبرا", "zebra"], slugs: ["zebra"], tip: "زبرا با چرخاندن نوارها بین شفاف و مات جابه‌جا می‌شود." },
  { keys: ["رومن", "roman"], slugs: ["roman"], tip: "رومن تاهای مرتب می‌سازد و ظاهر رسمی‌تری دارد." },
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
    keys: ["کرکره", "رولر", "roller", "رول", "blind"],
    slugs: ["roller"],
    tip: "کرکره/رولر کاربردی و اقتصادی برای کنترل نور است.",
  },
  { keys: ["مخمل", "velvet"], slugs: ["velvet"], tip: "مخمل عمق رنگی و حس لوکس برای پذیرایی می‌آورد." },
  {
    keys: ["کرم", "بژ", "طوسی", "خاکستری", "سفید", "ذغالی", "نوک مدادی", "قهوه"],
    slugs: [],
    tip: "رنگ را با دیوار و مبل ست کن؛ اگر کد مدل بگی دقیق‌تر پیدا می‌کنم.",
  },
];

const COLOR_WORDS = [
  "کرم", "بژ", "طوسی", "خاکستری", "سفید", "مشکی", "ذغالی", "قهوه", "طلایی",
  "نوک مدادی", "صورتی", "آبی", "سبز", "کرم روشن", "طوسی روشن",
];

function detectHints(text: string) {
  const t = expandText(text);
  return STYLE_HINTS.filter((h) => h.keys.some((k) => t.includes(normalize(k))));
}

function extractTerms(text: string): string[] {
  const stop = new Set([
    "سلام", "درود", "برای", "یک", "یه", "از", "به", "با", "که", "می", "میخوام",
    "لطفا", "پیشنهاد", "بده", "کن", "مدل", "پرده", "دارید", "هست", "چیست", "چی",
    "آیا", "میشه", "میشود", "میتونم", "خواهش", "عالی", "خوب", "خیلی", "هم", "یا",
    "این", "آن", "اون", "رو", "را", "تو", "من", "ما", "شما", "دیگه", "دیگر",
    "فقط", "یعنی", "حالا", "بعد", "قبل", "پس", "اگر", "ولی", "اما", "نه", "آره",
  ]);
  return expandText(text)
    .split(/[\s,،.؟!؛:\/\\|\-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !stop.has(w));
}

/* ═══════════════ data load ═══════════════ */
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
  texture: string | null;
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
type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: unknown;
  image: string | null;
};

async function loadAll() {
  const [categories, models, projects, products, modelCount, projectCount, productCount] =
    await Promise.all([
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
    if ((m.name || "").toLowerCase().includes(t)) score += 4;
  }
  for (const c of colors) {
    if (blob.includes(normalize(c))) score += 5;
  }
  if (m.installImage) score += 1;
  else if (m.image) score += 0.4;
  return score;
}

function scoreProject(p: ProjectRow, preferredSlugs: string[], terms: string[]) {
  const blob = normalize(`${p.title} ${p.description || ""} ${p.categorySlug || ""} ${p.subcategory || ""}`);
  let score = 0;
  for (const s of preferredSlugs) {
    if ((p.categorySlug || "").toLowerCase().includes(normalize(s))) score += 10;
  }
  for (const t of terms) if (blob.includes(t)) score += 3;
  if (p.coverImage) score += 0.5;
  return score;
}

function historyBlob(history: ChatMessage[]) {
  return history
    .filter((m) => m.role === "user")
    .slice(-10)
    .map((m) => m.content)
    .join(" ");
}

/* ═══════════════ intents ═══════════════ */
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
  | "unknown";

function detectIntent(raw: string): Intent {
  const n = expandText(raw);
  if (/^(سلام|درود|hi|hello|hey|سلام علیکم|صبح بخیر|عصر بخیر|شب بخیر|خوبی|چطوری|چه خبر)[\s!.؟?]*$/i.test(n))
    return "greeting";
  if (/^(ممنون|مرسی|تشکر|thanks|thank you|خداحافظ|bye|فعلا)[\s!.؟?]*$/i.test(n)) return "thanks";
  if (/^(آره|بله|باشه|اوکی|ok|yes|نه|نخیر|no)$/i.test(n)) return "yesno";
  if (/احمق|خر|لعنت|آشغال|بدرد|به درد نمی/.test(n)) return "rude";
  if (/قیمت|هزینه|مبلغ|چند|ارزان|گران|بودجه|تخفیف/.test(n)) return "price";
  if (/نصب|اندازه|بازدید|اجرا|اندازه گیری|اندازه‌گیری|دوخت|نصاب/.test(n)) return "install";
  if (/نمونه|پروژه|اجرا شده|گالری کار|نمونه کار|کارهای شما/.test(n)) return "projects";
  if (/فروشگاه|اکسسوری|یراق|قلاب|ریله|ریسمان|محصول/.test(n)) return "shop";
  if (/درباره|شما کی|شرکت|آنتیک|سابقه|اعتماد|برند/.test(n)) return "about";
  if (/تماس|آدرس|تلفن|واتساپ|محل|شعبه|ساعت کار|شماره/.test(n)) return "contact";
  if (/شستشو|نگهداری|تمیز|لکه|مراقبت|خشکشویی/.test(n)) return "care";
  if (/تفاوت|فرق|مقایسه|کدام بهتر|کدوم بهتر|یا .* یا/.test(n)) return "compare";
  if (/دسته|انواع پرده|چه مدل|چه سبک|لیست دسته|سبک ها/.test(n)) return "categories";
  if (/کاتالوگ|همه مدل|ببینم|نمایشگاه/.test(n)) return "catalog";
  if (/کمک|راهنما|چیکار|چه کار|چطور کار|نمیدونم|نمی دونم/.test(n)) return "help";
  if (/پیشنهاد|پیشنهاد بده|چی بخرم|چیه خوب|مناسب|چی خوبه/.test(n)) return "recommend";
  if (n.length >= 1) return "search";
  return "unknown";
}

const FAQ: { keys: string[]; answer: (tone: Tone) => string; links?: Array<{ label: string; href: string }> }[] = [
  {
    keys: ["گارانتی", "ضمانت", "warranty"],
    answer: (tone) =>
      voice(
        tone,
        "روی دوخت و نصب استاندارد پشتیبانی داریم. جزئیات را موقع سفارش می‌گوییم؛ مشکلی بود از تماس پیام بگذار.",
        "گارانتی دوخت و نصب طبق شرایط اعلام‌شده هنگام سفارش اعمال می‌شود. برای پیگیری از صفحه تماس اقدام فرمایید.",
        "خیالت راحت — کار استاندارد رو پشتیبانی می‌کنیم. جزئیات رو موقع سفارش می‌گیم 👍"
      ),
    links: [{ label: "تماس", href: "/contact" }],
  },
  {
    keys: ["زمان", "چقدر طول", "مدت", "تحویل", "کی میرسه"],
    answer: (tone) =>
      voice(
        tone,
        "بعد از اندازه‌گیری و تأیید، معمولاً چند روز تا حدود دو هفته طول می‌کشد — بسته به مدل و حجم.",
        "زمان آماده‌سازی پس از اندازه‌گیری و تأیید سفارش، بسته به مدل و حجم کار متغیر است و معمولاً چند روز تا حدود دو هفته است.",
        "معمولاً چند روز تا حدود دو هفته بعد از تأیید و اندازه‌گیری آماده‌ست؛ دقیق‌ترش رو تو مشاوره می‌گیم."
      ),
  },
  {
    keys: ["رنگ دیوار", "هماهنگ با مبل", "ست کردن", "ست با"],
    answer: (tone) =>
      voice(
        tone,
        "برای ست با دیوار و مبل، رنگ یا کد مدل را بگو؛ یا از کاتالوگ نزدیک به فضای خودت را ببین.",
        "جهت هماهنگی با دکوراسیون، اعلام رنگ دیوار/مبل یا انتخاب از کاتالوگ کمک‌کننده است.",
        "رنگ دیوار یا مبل رو بگو تا نزدیک‌ترین مدل‌ها رو بیارم 🎨"
      ),
    links: [{ label: "کاتالوگ", href: "/catalog" }],
  },
  {
    keys: ["موتور", "برقی", "ریموت", "هوشمند", "اتومات"],
    answer: (tone) =>
      voice(
        tone,
        "برای بعضی سبک‌ها موتور و ریموت ممکن است. بگو کدام فضا را می‌خواهی تا مسیر فنی را هماهنگ کنیم.",
        "امکان موتور و ریموت برای برخی سبک‌ها فراهم است؛ لطفاً نوع فضا را اعلام کنید.",
        "آره بعضی مدل‌ها موتور و ریموت دارن — بگو کجا می‌خوای نصب شه تا راهش رو بگم."
      ),
    links: [{ label: "مشاوره فنی", href: "/contact" }],
  },
];

function matchFaq(t: string) {
  const n = expandText(t);
  return FAQ.find((f) => f.keys.some((k) => n.includes(normalize(k))));
}

const COMPARE_NOTES: Record<string, string> = {
  shade: "شید: سطح صاف، جمع‌شونده به بالا، کنترل نور ساده.",
  zebra: "زبرا: نوارهای شفاف/مات؛ نور را دقیق تنظیم می‌کنی.",
  roman: "رومن: تاهای افقی شیک و رسمی.",
  panel: "ترک‌پنل: خطوط عمودی مدرن.",
  roller: "کرکره/رولر: کاربردی و اقتصادی.",
  "pleated-manual": "پلیسه: بافت ظریف برای پنجره متوسط.",
  sheer: "تور/حریر: نور نرم و فضای دلباز.",
  velvet: "مخمل: لوکس و عمیق برای پذیرایی.",
};

/* ═══════════════ main ═══════════════ */
export async function buildConsultantReply(
  userText: string,
  history: ChatMessage[] = []
): Promise<AssistantResult> {
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

  const faq = matchFaq(userText);
  if (faq) {
    return pack(
      faq.answer(tone),
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

  if (intent === "rude") {
    return pack(
      voice(
        tone,
        "متوجه نارضایتی‌ات هستم. اگر بگویی دقیقاً چه می‌خواهی (اتاق، نور، بودجه)، مستقیم کمکت می‌کنم.",
        "از ناراحتی شما متأسفیم. لطفاً نیاز خود را مطرح کنید تا راهنمایی دقیق ارائه شود.",
        "اوکی آروم باش 😅 بگو دقیقاً چی می‌خوای تا برات پیدا کنم."
      ),
      [
        {
          type: "quick_replies",
          items: [
            { label: "پیشنهاد سریع", message: "چند مدل خوب پیشنهاد بده" },
            { label: "تماس با تیم", message: "چطور تماس بگیرم؟" },
          ],
        },
      ]
    );
  }

  if (intent === "greeting") {
    return pack(
      voice(
        tone,
        `سلام 🌿 من دستیار آنتیک‌ام — ${modelCount} مدل کاتالوگ و ${projectCount} نمونه اجرا دم دستم است.\nاتاق و نور را بگو، یا هر سوالی بپرس.`,
        `سلام و احترام. دستیار طراحی پرده آنتیک هستم. از میان ${modelCount} مدل و ${projectCount} نمونه اجرا راهنمایی می‌کنم. لطفاً نوع فضا را بفرمایید.`,
        `سلامی💚 ${modelCount} مدل و ${projectCount} نمونه آماده‌ست. بگو کجا می‌خوای پرده بزنی؟`,
        `سلام! اتاق و نورش چیه؟`
      ),
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن روشن", message: "نشیمن روشن و دلباز" },
            { label: "خواب تاریک", message: "اتاق خواب تاریک بلک‌اوت" },
            { label: "انواع پرده", message: "چه دسته‌هایی دارید؟" },
            { label: "قیمت؟", message: "قیمت پرده چطور حساب می‌شود؟" },
          ],
        },
        {
          type: "link_buttons",
          items: [
            { label: "کاتالوگ", href: "/catalog" },
            { label: "نمونه‌ها", href: "/projects" },
          ],
        },
      ]
    );
  }

  if (intent === "thanks") {
    return pack(
      voice(tone, "قابلی نداشت 💛 هر وقت خواستی برگرد.", "خواهش می‌کنم. در خدمتیم.", "مرسی از تو 😄 هر وقت بودی!")
    );
  }

  if (intent === "yesno") {
    return pack(
      voice(
        tone,
        "باشه — اگر جزئیات بیشتری بدهی (اتاق، نور، سبک) دقیق‌تر پیشنهاد می‌دهم.",
        "متوجه شدم. در صورت تمایل جزئیات فضا را بفرستید.",
        "اوکی! بگو اتاق و نورش چیه تا بریم سر اصل مطلب 😉",
        "بگو اتاق و نور؟"
      ),
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن", message: "نشیمن مدرن" },
            { label: "خواب", message: "اتاق خواب تاریک" },
            { label: "شید", message: "شید می‌خوام" },
          ],
        },
      ]
    );
  }

  if (intent === "help") {
    return pack(
      voice(
        tone,
        "می‌توانم: پیشنهاد مدل · مقایسه سبک‌ها · قیمت/نصب · نمونه اجرا · اکسسوری.\nهرجوری راحت هستی بپرس.",
        "خدمات راهنمایی شامل پیشنهاد مدل، مقایسه سبک، نصب و قیمت، نمونه‌کار و فروشگاه اکسسوری است.",
        "هرچی بپرسی حول پرده و دکور پنجره، اینجام 💪 از «شید می‌خوام» تا «فرق زبرا و رومن»."
      ),
      [
        {
          type: "quick_replies",
          items: [
            { label: "پیشنهاد مدل", message: "برای نشیمن پیشنهاد بده" },
            { label: "تفاوت سبک‌ها", message: "تفاوت شید و زبرا چیست؟" },
            { label: "قیمت", message: "قیمت پرده چطور حساب می‌شود؟" },
          ],
        },
      ]
    );
  }

  if (intent === "price") {
    return pack(
      voice(
        tone,
        "قیمت ثابت روی تگ نیست — به عرض/ارتفاع، پارچه و نصب بستگی دارد.\nمدل را انتخاب کن، ابعاد را بگو یا بازدید بگیر تا برآورد دقیق بدهیم.",
        "هزینه بر اساس ابعاد پنجره، جنس پارچه و سبک نصب محاسبه می‌شود. پس از انتخاب مدل و اندازه‌گیری، برآورد ارائه می‌گردد.",
        "قیمت آماده تو فروشگاه نیست — بستگی داره پنجره چقدر باشه و چه پارچه‌ای. مدل رو بگو تا مسیر قیمت رو برات باز کنم."
      ),
      [
        {
          type: "link_buttons",
          items: [
            { label: "درخواست قیمت", href: "/contact" },
            { label: "کاتالوگ", href: "/catalog" },
          ],
        },
      ]
    );
  }

  if (intent === "install") {
    return pack(
      voice(
        tone,
        "مسیر نصب: انتخاب مدل → بازدید و اندازه‌گیری → آماده‌سازی → نصب در محل.",
        "فرآیند: انتخاب مدل، بازدید و اندازه‌گیری، آماده‌سازی، سپس نصب.",
        "مدل رو وردار → میان اندازه می‌گیرن → دوخت/آماده‌سازی → نصب خونه. ساده!"
      ),
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
      voice(
        tone,
        "از صفحه تماس نام و شماره و توضیح کوتاه فضا را بفرست؛ تیم برمی‌گردد سراغت.",
        "لطفاً از صفحه تماس اطلاعات تماس و شرح فضا را ارسال فرمایید.",
        "برو تماس، اسم و شماره‌ت رو بذار — زنگ می‌زنن."
      ),
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
      voice(
        tone,
        `پرده آنتیک روی طراحی، دوخت و نصب تمرکز دارد — ${modelCount} مدل در کاتالوگ و ${projectCount} نمونه اجرا.`,
        `برند پرده آنتیک در زمینه طراحی و اجرای پرده فعالیت می‌کند؛ کاتالوگ شامل ${modelCount} مدل است.`,
        `ما اوناییم که پرده رو از انتخاب تا نصب جمع می‌کنیم 😎 ${modelCount} مدل آماده.`
      ),
      [
        {
          type: "link_buttons",
          items: [
            { label: "درباره ما", href: "/about" },
            { label: "کاتالوگ", href: "/catalog" },
          ],
        },
      ]
    );
  }

  if (intent === "care") {
    return pack(
      voice(
        tone,
        "گردگیری آرام، لکه تازه بدون فشار، شستشوی کامل معمولاً تخصصی. نوع پارچه را بگو دقیق‌تر بگویم.",
        "نگهداری: گردگیری ملایم؛ لکه‌گیری سریع؛ شستشوی تخصصی بر اساس جنس پارچه.",
        "جارو آروم، لکه رو سریع پاک کن، شستشوی کامل رو بسپار به متخصص."
      )
    );
  }

  if (intent === "shop") {
    const top = products.slice(0, 5);
    const extra =
      top.length > 0
        ? `\n\nچند قلم از فروشگاه:\n${top.map((p, i) => `${i + 1}. ${p.name}`).join("\n")}`
        : "";
    return pack(
      voice(
        tone,
        `فروشگاه فقط اکسسوری و یراق است (${productCount} قلم). خود پرده از کاتالوگ انتخاب می‌شود.${extra}`,
        `بخش فروشگاه شامل اکسسوری است. مدل پرده از کاتالوگ انتخاب می‌گردد.${extra}`,
        `فروشگاه = قلاب و ریل و اینا. خود پرده برو کاتالوگ 🛒${extra}`
      ),
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
    const scoredP = projects
      .map((p) => ({ p, score: scoreProject(p, preferred, terms) }))
      .sort((a, b) => b.score - a.score);
    const top = (scoredP[0]?.score > 0 ? scoredP : projects.map((p) => ({ p, score: 1 })))
      .slice(0, 5)
      .map((x) => x.p);
    const lines =
      top.length === 0
        ? "هنوز نمونه ثبت نشده."
        : top.map((p, i) => `${i + 1}. **${p.title}**${p.categorySlug ? ` — ${p.categorySlug}` : ""}`).join("\n");
    return pack(
      voice(
        tone,
        `نمونه‌های اجرا:\n${lines}`,
        `گزیده‌ای از نمونه‌های اجرا:\n${lines}`,
        `ببین چی کار کردیم:\n${lines}`
      ),
      [
        {
          type: "link_buttons",
          items: [
            { label: "گالری نمونه‌ها", href: "/projects" },
            { label: "کاتالوگ", href: "/catalog" },
          ],
        },
      ]
    );
  }

  if (intent === "categories" || intent === "catalog") {
    const names = categories
      .slice(0, 14)
      .map((c) => `• **${c.name}**${c.mechanism ? ` (${c.mechanism})` : ""}`)
      .join("\n");
    return pack(
      voice(
        tone,
        `دسته‌های کاتالوگ (${categories.length}):\n${names || "—"}`,
        `فهرست دسته‌ها:\n${names || "—"}`,
        `اینا رو داریم:\n${names || "—"}`
      ),
      [
        {
          type: "link_buttons",
          items: [{ label: "باز کردن کاتالوگ", href: "/catalog" }],
        },
        {
          type: "quick_replies",
          items: categories.slice(0, 5).map((c) => ({
            label: c.name,
            message: `مدل‌های ${c.name}`,
          })),
        },
      ]
    );
  }

  if (intent === "compare") {
    const hit = hints.length ? hints : STYLE_HINTS.filter((h) => h.slugs.some((s) => t.includes(s)));
    const notes = (hit.length ? hit : STYLE_HINTS.slice(7, 11))
      .slice(0, 4)
      .map((h) => COMPARE_NOTES[h.slugs[0]] || h.tip);
    return pack(
      `مقایسه:\n${notes.map((n) => `• ${n}`).join("\n")}\n\n${voice(tone, "روشن می‌خواهی یا تاریک؟", "ترجیح نور فضا را بفرمایید.", "بگو روشن یا تاریک؟")}`,
      [
        {
          type: "quick_replies",
          items: [
            { label: "شید", message: "شید برای کنترل نور" },
            { label: "زبرا", message: "زبرا می‌خوام" },
            { label: "رومن", message: "رومن کلاسیک" },
          ],
        },
      ]
    );
  }

  /* ─── search / recommend / free-form ─── */
  // category name match → treat as preferred slug
  for (const c of categories) {
    if (t.includes(normalize(c.name)) || t.includes(normalize(c.slug))) {
      preferred.push(c.slug);
    }
  }

  const scored = models
    .map((m) => ({ m, score: scoreModel(m, preferred, terms, colors) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // exact code
  const codeHit = models.find((m) => {
    const code = (m.code || "").toLowerCase();
    return code && (t.includes(code) || terms.some((term) => code.includes(term)));
  });
  if (codeHit) {
    return pack(
      voice(
        tone,
        `مدل **${codeHit.name || codeHit.code}** را پیدا کردم.${codeHit.color ? ` رنگ: ${codeHit.color}.` : ""}`,
        `مورد درخواستی: **${codeHit.name || codeHit.code}**.`,
        `پیداش کردم: **${codeHit.name || codeHit.code}** ✨`
      ),
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
    // soft fallback still useful
    const sample = models.slice(0, 3);
    return pack(
      voice(
        tone,
        "سوالت را گرفتم. اگر حول پرده، سبک، نور، نصب یا نمونه است دقیق‌تر بگو — یا از نمونه‌های زیر شروع کن.",
        "لطفاً نیاز را با جزئیات بیشتر بیان کنید. در غیر این صورت می‌توانید از کاتالوگ آغاز کنید.",
        "اوکی هنوز قفل نشدم روی مدل 😄 بگو اتاق/نور/سبک یا یکی از اینا رو باز کن.",
        "اتاق و نور؟ یا کاتالوگ:"
      ),
      [
        ...(sample.length ? [modelCards(sample)] : []),
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن", message: "نشیمن کلاسیک لوکس" },
            { label: "خواب تاریک", message: "اتاق خواب تاریک" },
            { label: "انواع پرده", message: "چه دسته‌هایی دارید؟" },
            { label: "قیمت", message: "قیمت پرده چطور حساب می‌شود؟" },
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

  const top = scored.slice(0, 5).map((x) => x.m);
  const intro =
    tip ||
    voice(
      tone,
      preferred.length
        ? "طبق حرف‌هات این‌ها از کاتالوگ نزدیک‌ترند:"
        : "چند مدل مرتبط از کاتالوگ:",
      "موارد پیشنهادی بر اساس درخواست شما:",
      preferred.length ? "اینا به نظر نزدیک‌ترن به چیزی که گفتی:" : "چندتا مرتبط پیدا کردم:"
    );

  const teach =
    preferred.includes("shade") || /شید/.test(t)
      ? "\n\nشید تا بالا جمع می‌شود و برای کنترل نور روز عالی است."
      : preferred.includes("zebra") || /زبرا/.test(t)
        ? "\n\nزبرا بین شفاف و مات با چرخش نوارها جابه‌جا می‌شود."
        : preferred.includes("roman") || /رومن/.test(t)
          ? "\n\nرومن ظاهر رسمی با تاهای مرتب دارد."
          : colors.length
            ? `\n\nرنگ‌هایی که گفتی (${colors.join("، ")}) را در پیشنهاد لحاظ کردم.`
            : "\n\nاگر رنگ دیوار یا نور دقیق‌تر بگی، تنگ‌تر می‌کنم.";

  return pack(
    `${intro}${teach}\n\n${voice(tone, "روی کارت بزن و مدل را ببین.", "جهت مشاهده جزئیات روی کارت کلیک کنید.", "بزن روی کارت ببینش ✨")}`,
    [
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
          { label: "مشاوره", href: "/contact" },
        ],
      },
    ],
    { intent, preferred, hits: scored.length, tone }
  );
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
