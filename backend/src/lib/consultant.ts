/**
 * Customer assistant — free-form NLU over catalog/projects/shop.
 * Natural conversational tone; accepts any phrasing; answers from real catalog data.
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
  history: ChatMessage[] = []
): Promise<AssistantResult> {
  const tone = detectTone(userText);
  const t = expandText(userText);

  // Lightweight open reply when full NLU data path is not loaded in this slim restore
  // Prefer full catalog logic on server via restore-consultant-full if needed
  try {
    const { buildConsultantReplyFull } = await import("./consultantFull.js").catch(() => ({ buildConsultantReplyFull: null }));
    if (typeof buildConsultantReplyFull === "function") {
      return buildConsultantReplyFull(userText, history);
    }
  } catch {
    /* use open reply below */
  }

  const n = t;
  if (/^(سلام|درود|hi|hello|hey)/i.test(n)) {
    return pack(
      voice(
        tone,
        "سلام 👋 خوش اومدی.\n\nمنم دستیار آنتیک. هر جور راحتی بگو — فضا، نور، سبک، یا هر سوالی درباره پرده. از روی کاتالوگ واقعی سایت کمکت می‌کنم.",
        "سلام. مشاور پرده آنتیک هستم. فضا و نور را بفرمایید.",
        "سلام! بگو برای کدوم اتاق و نورش چطوره 😊",
        "سلام، بگو چی می‌خوای."
      ),
      [
        {
          type: "quick_replies",
          items: [
            { label: "نشیمن روشن", message: "نشیمن روشن و دلباز می‌خوام" },
            { label: "خواب بلک‌اوت", message: "اتاق خواب بلک‌اوت" },
            { label: "قیمت چطور؟", message: "قیمت پرده چطور حساب می‌شود؟" },
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
      voice(tone, "خواهش می‌کنم 🙏 هر چیزی که به ذهنت می‌رسه همین‌جا بپرس.", "خواهش می‌کنم.", "مرسی، هر وقت خواستی بپرس 😊")
    );
  }

  if (/قیمت|هزینه|مبلغ|بودجه/.test(n)) {
    return pack(
      voice(
        tone,
        "قیمت دقیق از روی چت اعلام نمی‌شه چون به ابعاد، پارچه و مکانیزم بستگی داره.\n\nمدل رو انتخاب کن، بعد از **صفحه تماس** اسم و موبایل و حدود ابعاد رو بفرست تا برات برآورد بفرستن.",
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

  // Default: open, flexible, point to catalog without rigid patterns
  return pack(
    voice(
      tone,
      `باشه، فهمیدم منظورت رو.\n\nهر جور بگی سعی می‌کنم کمکت کنم — از سبک و نور گرفته تا تفاوت شید و زبرا یا مسیر سفارش.\n\nاگر فضا یا نور رو کمی دقیق‌تر بگی (مثلاً نشیمن روشن / خواب تاریک)، از کاتالوگ نزدیک‌تر پیشنهاد می‌دم. یا مستقیم برو کاتالوگ و مدل‌ها رو ببین.`,
      "درخواست شما دریافت شد. برای پیشنهاد دقیق‌تر فضا و نور را مشخص کنید یا از کاتالوگ مدل‌ها را ببینید.",
      "اوکی 👍 یه کم بیشتر بگو اتاق و نورش چیه، یا برو کاتالوگ بگرد.",
      "بگو اتاق و نور، یا برو کاتالوگ."
    ),
    [
      {
        type: "quick_replies",
        items: [
          { label: "نشیمن", message: "برای نشیمن پیشنهاد بده" },
          { label: "اتاق خواب", message: "برای اتاق خواب پیشنهاد بده" },
          { label: "تفاوت شید و زبرا", message: "تفاوت شید و زبرا چیست؟" },
          { label: "کاتالوگ", message: "کاتالوگ را نشان بده" },
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
