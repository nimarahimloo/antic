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
