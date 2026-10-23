/**
 * Design consultant — 100% local, reads live Prisma catalog.
 * No external LLM. Uses intent + keyword matching over real models/categories/projects.
 */
import { prisma } from "./prisma.js";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls?: unknown[];
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
    note: "برای فضای پرنور و حس سبکی، پرده شفاف/تور یا پلیسه توری پیشنهاد می‌شود.",
  },
  {
    keys: ["کلاسیک", "لوکس", "مجلل", "مجلسی"],
    styles: ["drape", "roman"],
    note: "برای دکوراسیون کلاسیک، پردهٔ چین‌دار یا رومن انتخاب خوبی است.",
  },
  {
    keys: ["مدرن", "ساده", "مینیمال"],
    styles: ["panel", "turk-panel", "shade", "zebra", "roller"],
    note: "برای سبک مدرن، ترک‌پنل، شید، زبرا یا کرکره خطوط تمیزتری می‌دهند.",
  },
  {
    keys: ["اداری", "دفتر", "تجاری", "شرکت"],
    styles: ["zebra", "shade", "roller", "double"],
    note: "برای فضای اداری معمولاً زبرا، شید یا دبل‌شید کاربردی‌ترند.",
  },
  {
    keys: ["آشپزخانه", "kitchen"],
    styles: ["roman", "shade", "roller"],
    note: "برای آشپزخانه رومن یا شید جمع‌وجور و تمیز کار می‌شود.",
  },
  {
    keys: ["نشیمن", "پذیرایی", "سالن", "living"],
    styles: ["drape", "roman", "zebra"],
    note: "برای نشیمن بسته به نور و سبک، چین‌دار، رومن یا زبرا رایج است.",
  },
  {
    keys: ["زبرا", "zebra"],
    styles: ["zebra"],
    note: "زبرا هم نور را تنظیم می‌کند هم حریم خصوصی می‌دهد.",
  },
  {
    keys: ["رومن", "roman", "رومن شید"],
    styles: ["roman"],
    note: "رومن ظاهر مرتب و تاهای افقی مشخص دارد.",
  },
  {
    keys: ["شید", "shade", "بلک‌اوت", "بلکاوت"],
    styles: ["shade", "double"],
    note: "شید و دبل‌شید برای کنترل نور گزینه‌های رایج‌اند.",
  },
  {
    keys: ["ترک", "پنل", "turk", "panel"],
    styles: ["panel", "turk-panel"],
    note: "ترک‌پنل خطوط صاف و مدرن دارد.",
  },
  {
    keys: ["پلیسه", "pleated"],
    styles: ["pleated", "pleated-manual", "pleated-chain"],
    note: "پلیسه برای پنجره‌های کوچک تا متوسط و کنترل نور خوب است.",
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
  if (/کمک|چطور|چگونه|راهنما|help|چه کار|چی کار/.test(t)) return "help";
  if (/قیمت|هزینه|چند|price|مبلغ/.test(t)) return "about_price";
  if (/نصب|اندازه|اندازه‌گیری|بازدید|اجرا/.test(t)) return "about_install";
  if (/تماس|مشاوره|شماره|آدرس|contact|فرم/.test(t)) return "about_contact";
  if (/چه سبک|سبک‌ها|انواع پرده|لیست سبک|دسته/.test(t)) return "list_styles";
  if (/چه مدل|لیست مدل|همه مدل|کاتالوگ/.test(t)) return "list_models";
  if (
    STYLE_HINTS.some((h) => h.keys.some((k) => t.includes(normalize(k)))) ||
    /پیشنهاد|میخوام|می‌خوام|نیاز|برای|فضا|اتاق|پنجره/.test(t)
  ) {
    return "recommend";
  }
  if (/جستجو|پیدا|دارید|داری|موجود/.test(t)) return "search_models";
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
  ]);
  return normalize(text)
    .split(/[\s,،.؟!]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !stop.has(w));
}

async function loadCatalogSnapshot() {
  const [categories, models, projects, modelCount] = await Promise.all([
    prisma.curtainCategory.findMany({ orderBy: { order: "asc" }, take: 40 }),
    prisma.curtainModel.findMany({
      orderBy: { updatedAt: "desc" },
      take: 120,
    }),
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      take: 12,
    }).catch(() => [] as Awaited<ReturnType<typeof prisma.project.findMany>>),
    prisma.curtainModel.count(),
  ]);
  return { categories, models, projects, modelCount };
}

function formatModelLine(m: {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  categorySlug: string | null;
  fabric: string | null;
}) {
  const code = m.code || m.name;
  const color = m.color ? `، رنگ ${m.color}` : "";
  const cat = m.categorySlug ? ` — دسته: ${m.categorySlug}` : "";
  return `• **${m.name}** (${code}${color})${cat} — /curtain/${m.id}`;
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
    texture: string | null;
  },
  preferredStyles: string[],
  terms: string[]
) {
  const slug = (m.categorySlug || "").toLowerCase();
  const sub = (m.subcategory || "").toLowerCase();
  const blob = normalize(
    `${m.name} ${m.code || ""} ${m.fabric || ""} ${m.color || ""} ${m.description || ""} ${m.material || ""} ${m.texture || ""} ${slug} ${sub}`
  );
  let score = 0;
  for (const s of preferredStyles) {
    const ns = normalize(s);
    if (slug.includes(ns) || sub.includes(ns) || blob.includes(ns)) score += 4;
  }
  for (const term of terms) {
    if (blob.includes(term)) score += 2;
  }
  return score;
}

export async function buildConsultantReply(
  userText: string,
  history: ChatMessage[] = []
): Promise<{ text: string; meta: Record<string, unknown> }> {
  const intent = detectIntent(userText);
  const catalog = await loadCatalogSnapshot();
  const { categories, models, projects, modelCount } = catalog;

  const meta: Record<string, unknown> = {
    source: "local-catalog",
    intent,
    model_count: modelCount,
    category_count: categories.length,
  };

  if (intent === "greeting") {
    const styleNames = categories
      .slice(0, 6)
      .map((c) => c.name)
      .join("، ");
    return {
      text:
        `سلام، خوش اومدی 👋 من مشاور طراحی **پرده آنتیک** هستم و به کاتالوگ زنده‌ات وصلم ` +
        `(الان **${modelCount} مدل** و **${categories.length} دسته** در دیتابیس هست).\n\n` +
        (styleNames ? `دسته‌های فعال: ${styleNames}${categories.length > 6 ? " و…" : ""}.\n\n` : "") +
        `بگو:\n` +
        `• فضا چیه؟ (نشیمن، خواب، آشپزخانه، اداری…)\n` +
        `• چقدر نور می‌خوای؟ (تاریک / نیمه‌روشن / روشن)\n` +
        `• سبک دکوراسیونت چطوره؟ (مدرن، کلاسیک، مینیمال…)\n\n` +
        `از روی همین اطلاعات، مدل واقعی از کاتالوگ پیشنهاد می‌دم.`,
      meta,
    };
  }

  if (intent === "thanks") {
    return {
      text: "خواهش می‌کنم. هر وقت خواستی دربارهٔ مدل، سبک یا نصب بپرس — از کاتالوگ واقعی جواب می‌دم.",
      meta,
    };
  }

  if (intent === "help") {
    return {
      text:
        `می‌تونم این کارها را انجام بدم:\n` +
        `• پیشنهاد مدل از **کاتالوگ واقعی** بر اساس فضا و سبک\n` +
        `• لیست سبک‌ها و دسته‌ها\n` +
        `• جستجوی مدل با نام/کد/رنگ\n` +
        `• راهنمای نصب، اندازه‌گیری و تماس\n\n` +
        `مثال: «برای اتاق خواب نور کم می‌خوام» یا «زبرا نقره‌ای دارید؟»`,
      meta,
    };
  }

  if (intent === "about_price") {
    return {
      text:
        `قیمت اکثر پرده‌ها **بر اساس ابعاد و پارچه** محاسبه می‌شود و در سایت به‌صورت ثابت نیست.\n\n` +
        `برای برآورد دقیق: مدل را از کاتالوگ انتخاب کن، بعد از **فرم مشاوره** یا صفحه تماس درخواست بده تا اندازه‌گیری و قیمت اعلام شود.\n` +
        `مسیر: /contact`,
      meta,
    };
  }

  if (intent === "about_install") {
    return {
      text:
        `نصب معمولاً بعد از بازدید و اندازه‌گیری انجام می‌شود.\n` +
        `۱) مدل را در کاتالوگ انتخاب کن\n` +
        `۲) از فرم مشاوره درخواست بازدید بده\n` +
        `۳) کارشناس اندازه می‌گیرد و زمان نصب را هماهنگ می‌کند\n\n` +
        `صفحه تماس: /contact`,
      meta,
    };
  }

  if (intent === "about_contact") {
    return {
      text:
        `برای مشاوره حضوری، اندازه‌گیری یا سفارش:\n` +
        `• فرم درخواست مشاوره در /contact\n` +
        `• یا از همان صفحه شماره و پیام بگذار\n\n` +
        `اگر مدل مشخصی مد نظرته لینکش را از کاتالوگ بفرست تا همان را در درخواستت ذکر کنیم.`,
      meta,
    };
  }

  if (intent === "list_styles") {
    if (!categories.length) {
      return {
        text: "هنوز دسته‌ای در دیتابیس ثبت نشده. از پنل ادمین → دسته‌های پرده اضافه کنید.",
        meta,
      };
    }
    const lines = categories.map((c) => {
      let subs = "";
      try {
        const parsed = c.subcategories ? JSON.parse(c.subcategories as string) : [];
        if (Array.isArray(parsed) && parsed.length) {
          const names = parsed
            .map((s: unknown) => (typeof s === "string" ? s : (s as { name?: string })?.name))
            .filter(Boolean)
            .slice(0, 4);
          if (names.length) subs = ` (زیردسته: ${names.join("، ")})`;
        }
      } catch {
        /* ignore */
      }
      return `• **${c.name}** — \`${c.slug}\`${subs}`;
    });
    return {
      text: `سبک‌ها / دسته‌های فعال در کاتالوگ:\n\n${lines.join("\n")}\n\nبگو کدام فضا یا سبک را می‌خواهی تا مدل واقعی پیشنهاد بدهم.`,
      meta: { ...meta, listed_categories: categories.map((c) => c.slug) },
    };
  }

  if (intent === "list_models") {
    if (!models.length) {
      return {
        text: "مدلی در کاتالوگ نیست. از ادمین → مدل‌های پرده اضافه کنید.",
        meta,
      };
    }
    const sample = models.slice(0, 8).map(formatModelLine);
    return {
      text:
        `الان **${modelCount} مدل** در دیتابیس است. نمونه‌های جدید:\n\n` +
        sample.join("\n") +
        (modelCount > 8 ? `\n\n… و ${modelCount - 8} مدل دیگر.` : "") +
        `\n\nبرای فیلتر دقیق‌تر بگو: فضا، رنگ، یا سبک (مثلاً رومن / زبرا).`,
      meta,
    };
  }

  const hints = detectStyleHints(userText);
  const preferred = [...new Set(hints.flatMap((h) => h.styles))];
  const terms = extractSearchTerms(userText);

  const histText = history
    .filter((m) => m.role === "user")
    .slice(-4)
    .map((m) => m.content)
    .join(" ");
  const histHints = detectStyleHints(histText);
  for (const s of histHints.flatMap((h) => h.styles)) {
    if (!preferred.includes(s)) preferred.push(s);
  }

  if (!models.length) {
    return {
      text:
        "هنوز مدلی در کاتالوگ ثبت نشده. از پنل ادمین مدل‌های پرده را با عکس پارچه اضافه کنید، " +
        "یا از /contact برای مشاوره حضوری اقدام کنید.",
      meta,
    };
  }

  const scored = models
    .map((m) => ({ m, score: scoreModel(m, preferred, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = (scored.length ? scored : models.map((m) => ({ m, score: 0 })))
    .slice(0, 5)
    .map((x) => x.m);

  meta.matched_styles = preferred;
  meta.returned_model_ids = top.map((m) => m.id);

  if (intent === "recommend" || scored.length > 0) {
    const note =
      hints.map((h) => h.note).join(" ") ||
      histHints.map((h) => h.note).join(" ") ||
      "بر اساس کاتالوگ فعلی این مدل‌ها نزدیک‌ترند:";

    const lines = top.map(formatModelLine);
    let projectNote = "";
    if (projects.length) {
      projectNote =
        `\n\nنمونه‌کارهای منتشرشده: ${projects
          .slice(0, 3)
          .map((p) => p.title)
          .join("، ")} — از منوی پروژه‌ها ببین.`;
    }

    return {
      text:
        `${note}\n\n` +
        `از کاتالوگ فعلی (${modelCount} مدل):\n` +
        lines.join("\n") +
        `\n\nمدل را در کاتالوگ باز کن یا برای اندازه‌گیری از /contact درخواست مشاوره بده.` +
        projectNote,
      meta,
    };
  }

  if (terms.length) {
    const found = models
      .map((m) => ({ m, score: scoreModel(m, [], terms) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    if (found.length) {
      return {
        text:
          `چند مورد مرتبط با «${terms.slice(0, 4).join(" ")}» در کاتالوگ:\n\n` +
          found.map((x) => formatModelLine(x.m)).join("\n") +
          `\n\nاگر فضا یا سبک را بگی دقیق‌تر پیشنهاد می‌دم.`,
        meta: { ...meta, returned_model_ids: found.map((x) => x.m.id) },
      };
    }
  }

  return {
    text:
      `متوجه نیاز دقیق نشدم، ولی به **${modelCount} مدل** و **${categories.length} دسته** در دیتابیس دسترسی دارم.\n\n` +
      `مثلاً بگو:\n` +
      `• «برای نشیمن مدرن پیشنهاد بده»\n` +
      `• «زبرا دارید؟»\n` +
      `• «سبک‌ها چیه؟»\n` +
      `• «قیمت چطور حساب می‌شه؟»`,
    meta,
  };
}
