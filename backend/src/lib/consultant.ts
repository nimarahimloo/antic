/**
 * مشاور چت — لحن خودمونی، بدون قالب رباتی خشک
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
    [/میخوام|میخام|می خام|می خوام|دوست دارم/g, "میخوام"],
    [/چیه|چیست|چی هست/g, "چیست"],
    [/کدوم|کدام|کدومه/g, "کدام"],
    [/نشیمن|هال|پذیرایی/g, "نشیمن"],
    [/اتاق خواب|خوابگاه/g, "اتاق خواب"],
    [/بلک اوت|بلک‌اوت|blackout/g, "بلک اوت"],
  ];
  for (const [re, rep] of pairs) t = t.replace(re, rep);
  return t;
}

type Tone = "warm" | "formal" | "playful" | "short";
function detectTone(raw: string): Tone {
  const t = normalize(raw);
  if (/[؟!?]{2,}|😂|😅|خخخ|ههه/.test(raw) || /جوک|شوخی/.test(t)) return "playful";
  if (/لطفاً|خواهشمند|با سلام|احتراما/.test(t) || raw.length > 120) return "formal";
  if (raw.length < 18 || /^(آره|نه|باشه|اوکی|ok|بله)$/i.test(t)) return "short";
  return "warm";
}

function voice(tone: Tone, warm: string, formal: string, playful: string, short?: string) {
  if (tone === "formal") return formal;
  if (tone === "playful") return playful;
  if (tone === "short" && short) return short;
  return warm;
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

export async function buildConsultantReply(
  userText: string,
  _history: ChatMessage[] = []
): Promise<AssistantResult> {
  const tone = detectTone(userText);
  const n = expandText(userText);

  if (/^(سلام|درود|hi|hello|hey)/i.test(n)) {
    return pack(
      voice(
        tone,
        "سلام 👋 خوش اومدی.\n\nمن اینجام که مثل یه مشاور واقعی کمکت کنم. هر جور راحتی حرف بزن — نشیمن، خواب، نور زیاد، بلک‌اوت، هر چی.",
        "سلام، وقت بخیر. بفرمایید برای چه فضایی پرده می‌خواهید.",
        "سلام! بگو برای کدوم اتاق و نورش چطوره 😊",
        "سلام، بگو چی می‌خوای."
      ),
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن روشن", message: "نشیمن روشن و دلباز می‌خوام" },
            { label: "خواب بلک‌اوت", message: "اتاق خواب بلک‌اوت" },
            { label: "قیمت چطور؟", message: "قیمت پرده چطور حساب می‌شه؟" },
          ],
        },
        {
          type: "link_buttons",
          items: [
            { label: "کاتالوگ", href: "/catalog" },
            { label: "نمونه‌ها", href: "/projects" },
            { label: "تماس", href: "/contact" },
          ],
        },
      ]
    );
  }

  if (/^(ممنون|مرسی|تشکر)/i.test(n)) {
    return pack(
      voice(tone, "خواهش می‌کنم 🙏 هر وقت چیزی به ذهنت رسید بپرس.", "خواهش می‌کنم.", "مرسی، هر وقت خواستی بپرس 😊")
    );
  }

  if (/قیمت|هزینه|مبلغ|بودجه/.test(n)) {
    return pack(
      voice(
        tone,
        "قیمت دقیق از روی چت نمی‌تونم بگم — به ابعاد و پارچه و مکانیزم بستگی داره.\n\nمدل رو انتخاب کن، بعد از صفحه تماس اسم و موبایل و حدود ابعاد رو بفرست تا برات برآورد بفرستن.",
        "برای اعلام قیمت به ابعاد و مدل نیاز است. از صفحه تماس اقدام فرمایید.",
        "قیمت قطعی تو چت نمی‌دم — مدل بگو بعد برو تماس 😊"
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

  if (/شید|زبرا|رومن|پلیسه|ترک|تفاوت|فرق/.test(n)) {
    return pack(
      voice(
        tone,
        "راستش بستگی به فضا داره:\n\n• **شید** — سطح صاف، جمع می‌شه بالا، برای کنترل نور خیلی خوبه\n• **زبرا** — نوار شفاف و مات، هم نور می‌ده هم حریم\n• **رومن** — چین افقی، یه کم رسمی‌تر\n• **پلیسه** — چین‌های ریز آکاردئونی\n\nبگو اتاق کدومه تا دقیق‌تر بگم کدوم به دردت می‌خوره.",
        "شید، زبرا، رومن و پلیسه هر کدام کاربرد متفاوتی دارند. فضا را بفرمایید تا پیشنهاد دهم.",
        "شید ساده و کاربردی، زبرا هم نور هم حریم، رومن شیک‌تر. بگو اتاقت چیه 😊"
      ),
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن", message: "برای نشیمن کدوم بهتره" },
            { label: "خواب", message: "برای اتاق خواب کدوم بهتره" },
          ],
        },
      ]
    );
  }

  return pack(
    voice(
      tone,
      "باشه، فهمیدم.\n\nهر چی بپرسی سعی می‌کنم جواب بدم — نور، سبک، تفاوت شید و زبرا، نصب، هر چی.\n\nاگه بگی اتاق کدومه و نورش روشنه یا تاریک، از کاتالوگ نزدیک‌تر برات می‌چینم. وگرنه خودت یه سر به کاتالوگ بزن.",
      "متوجه شدم. فضا و نور را بگویید تا پیشنهاد دقیق‌تری بدهم، یا از کاتالوگ مدل‌ها را ببینید.",
      "اوکی 👍 بگو اتاق و نورش، یا برو کاتالوگ بگرد.",
      "بگو اتاق و نور چیه."
    ),
    [
      {
        type: "quick_replies",
        items: [
          { label: "نشیمن", message: "برای نشیمن پیشنهاد بده" },
          { label: "اتاق خواب", message: "برای اتاق خواب پیشنهاد بده" },
          { label: "تفاوت شید و زبرا", message: "تفاوت شید و زبرا چیه؟" },
          { label: "کاتالوگ", message: "کاتالوگ رو نشون بده" },
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
