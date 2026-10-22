import { prisma } from "./prisma.js";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls?: unknown[];
};

/** Simple keyword → style mapping for offline catalog advice (no external LLM required). */
const STYLE_HINTS: { keys: string[]; styles: string[]; note: string }[] = [
  {
    keys: ["بلک", "blackout", "تاریک", "خواب", "نور نده"],
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
    note: "برای دکوراسیون کلاسیک، پردهٔ چین‌دار کلاسیک یا رومن انتخاب خوبی است.",
  },
  {
    keys: ["مدرن", "ساده", "مینیمال"],
    styles: ["panel", "shade", "zebra", "roller"],
    note: "برای سبک مدرن، ترک‌پنل، شید، زبرا یا کرکره خطوط تمیزتری می‌دهند.",
  },
  {
    keys: ["اداری", "دفتر", "تجاری", "شرکت"],
    styles: ["zebra", "shade", "roller", "double"],
    note: "برای فضای اداری معمولاً زبرا، شید یا دبل‌شید کاربردی‌ترند.",
  },
  {
    keys: ["زبرا", "zebra"],
    styles: ["zebra"],
    note: "زبرا هم نور را تنظیم می‌کند هم حریم خصوصی می‌دهد.",
  },
  {
    keys: ["رومن", "roman"],
    styles: ["roman"],
    note: "رومن ظاهر مرتب و تاهای افقی مشخص دارد.",
  },
  {
    keys: ["شید", "shade"],
    styles: ["shade", "double"],
    note: "شید و دبل‌شید برای کنترل نور گزینه‌های رایج‌اند.",
  },
];

function detectHints(text: string) {
  const t = text.toLowerCase();
  const matched = STYLE_HINTS.filter((h) => h.keys.some((k) => t.includes(k.toLowerCase())));
  return matched.length ? matched : STYLE_HINTS.filter((h) => h.keys.includes("مدرن"));
}

export async function buildConsultantReply(userText: string): Promise<string> {
  const hints = detectHints(userText);
  const preferred = [...new Set(hints.flatMap((h) => h.styles))];

  const models = await prisma.curtainModel.findMany({
    take: 80,
    orderBy: { updatedAt: "desc" },
  });

  const scored = models
    .map((m) => {
      const slug = (m.categorySlug || "").toLowerCase();
      const blob = `${m.name} ${m.code} ${m.fabric || ""} ${m.color || ""} ${m.description || ""}`.toLowerCase();
      let score = 0;
      for (const s of preferred) {
        if (slug.includes(s) || blob.includes(s)) score += 3;
      }
      const words = userText.split(/\s+/).filter((w) => w.length > 2);
      for (const w of words) {
        if (blob.includes(w.toLowerCase())) score += 1;
      }
      return { m, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const intro = hints.map((h) => h.note).join(" ");

  if (!models.length) {
    return (
      `${intro}\n\n` +
      `هنوز مدلی در کاتالوگ ثبت نشده است. از پنل ادمین مدل‌های پرده را اضافه کنید، یا از صفحه [تماس](/contact) برای مشاوره حضوری اقدام کنید.`
    );
  }

  if (!scored.length) {
    const sample = models.slice(0, 4);
    const lines = sample
      .map((m) => `- **${m.name}** (\\`${m.code}\\`) — [مشاهده](/curtain/${m.id})`)
      .join("\n");
    return (
      `با توجه به توضیحت، چند مدل از کاتالوگ فعلی را می‌توانی ببینی:\n\n${lines}\n\n` +
      `اگر نوع فضا (خواب، نشیمن، اداری) یا سبک (مدرن/کلاسیک) را دقیق‌تر بگی، پیشنهاد را محدودتر می‌کنم.`
    );
  }

  const lines = scored
    .map(
      ({ m }) =>
        `- **${m.name}** (\\`${m.code}\\`${m.color ? `، رنگ ${m.color}` : ""}) — دسته: ${m.categorySlug} — [مشاهده مدل](/curtain/${m.id})`
    )
    .join("\n");

  return (
    `${intro}\n\n` +
    `از کاتالوگ فعلی این مدل‌ها با درخواستت هم‌خوانی بیشتری دارند:\n\n${lines}\n\n` +
    `می‌توانی مدل را در کاتالوگ باز کنی یا برای اندازه‌گیری و نصب از [فرم مشاوره](/contact) استفاده کنی.`
  );
}
