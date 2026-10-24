/**
 * تشخیص آزاد دستور ادمین — نه فقط چند الگوی ثابت.
 * خروجی: action + entity + target token + fields
 */

export type EntityKind =
  | "model"
  | "category"
  | "project"
  | "product"
  | "shop_category"
  | "order"
  | "request"
  | "template"
  | "install_ref"
  | "saved_design"
  | "window";

export type Action = "create" | "update" | "delete" | "list" | "count" | "search" | "help";

export type ParsedCommand = {
  action: Action | null;
  entity: EntityKind | null;
  target: string | null;
  fields: Record<string, string>;
  raw: string;
  confidence: number;
};

export function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[یي]/g, "ی")
    .replace(/[کك]/g, "ک")
    .replace(/[\u200c\u200f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FIELD_ALIASES: Record<string, string> = {
  نام: "name",
  name: "name",
  عنوان: "title",
  title: "title",
  کد: "code",
  code: "code",
  شناسه: "slug",
  اسلاگ: "slug",
  slug: "slug",
  دسته: "category",
  دسته‌بندی: "category",
  دستهبندی: "category",
  category: "category",
  زیردسته: "subcategory",
  subcategory: "subcategory",
  رنگ: "color",
  color: "color",
  پارچه: "fabric",
  fabric: "fabric",
  توضیح: "description",
  توضیحات: "description",
  description: "description",
  قیمت: "price",
  price: "price",
  موجودی: "stock",
  stock: "stock",
  تصویر: "image",
  عکس: "image",
  image: "image",
  کاور: "cover",
  cover: "cover",
  وضعیت: "status",
  status: "status",
  ترتیب: "order",
  order: "order",
  مکانیزم: "mechanism",
  mechanism: "mechanism",
  سبک: "style",
  style: "style",
  note: "note",
  یادداشت: "note",
};

/** استخراج فیلد از key:value و الگوهای محاوره‌ای */
export function parseFields(text: string): Record<string, string> {
  const out: Record<string, string> = {};

  // نام: X  |  نام = X  |  name: X
  const re =
    /(?:^|[\s,،\n])([\u0600-\u06FFa-zA-Z_][\u0600-\u06FFa-zA-Z0-9_]*)\s*[:：=]\s*([^\n,،]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const key = FIELD_ALIASES[normalize(m[1])] || normalize(m[1]);
    const val = m[2].trim().replace(/[«»"']/g, "");
    if (key && val) out[key] = val;
  }

  // نامش X باشه / کدش Y است / قیمتش را بگذار 2000
  const colloquial: Array<[RegExp, string]> = [
    [/نام(?:ش|شو)?\s*(?:را|رو)?\s*(?:بگذار|بکن|کن|باشه|است|=|:)?\s*[«"]?([^\n,،»"]+)/i, "name"],
    [/عنوان(?:ش|شو)?\s*(?:را|رو)?\s*(?:بگذار|بکن|کن|باشه|=|:)?\s*[«"]?([^\n,،»"]+)/i, "title"],
    [/کد(?:ش|شو)?\s*(?:را|رو)?\s*(?:بگذار|بکن|کن|باشه|=|:)?\s*[«"]?([A-Za-z0-9_-]+)/i, "code"],
    [/شناسه(?:اش|ش)?\s*(?:را|رو)?\s*(?:بگذار|بکن|کن|باشه|=|:)?\s*[«"]?([A-Za-z0-9_-]+)/i, "slug"],
    [/قیمت(?:ش|شو)?\s*(?:را|رو)?\s*(?:بگذار|بکن|کن|باشه|=|:)?\s*([\d٬,]+)/i, "price"],
    [/رنگ(?:ش|شو)?\s*(?:را|رو)?\s*(?:بگذار|بکن|کن|باشه|=|:)?\s*[«"]?([^\n,،»"]+)/i, "color"],
    [/دسته(?:اش|ش)?\s*(?:را|رو)?\s*(?:بگذار|بکن|کن|باشه|=|:)?\s*[«"]?([A-Za-z0-9\u0600-\u06FF_-]+)/i, "category"],
    [/وضعیت(?:ش|شو)?\s*(?:را|رو)?\s*(?:بگذار|بکن|کن|باشه|=|:|به)?\s*[«"]?([A-Za-z\u0600-\u06FF_-]+)/i, "status"],
  ];
  for (const [rx, field] of colloquial) {
    const mm = text.match(rx);
    if (mm?.[1] && !out[field]) out[field] = mm[1].trim();
  }

  // وضعیت‌های فارسی کوتاه
  if (!out.status) {
    const st = normalize(text).match(
      /\b(جدید|انجام|بسته|درحال|پرداخت|ارسال|لغو|new|done|closed|processing|pending|paid|shipped|cancelled)\b/
    );
    if (st && /وضعیت|status|بکن|کن|عوض|تغییر|ویرایش/.test(normalize(text))) {
      const map: Record<string, string> = {
        جدید: "new",
        انجام: "done",
        بسته: "closed",
        درحال: "processing",
        پرداخت: "paid",
        ارسال: "shipped",
        لغو: "cancelled",
      };
      out.status = map[st[1]] || st[1];
    }
  }

  if (out.price) out.price = out.price.replace(/[٬,]/g, "");
  return out;
}

function scoreKeywords(t: string, groups: string[][]): number {
  let best = 0;
  for (const g of groups) {
    let s = 0;
    for (const k of g) if (t.includes(normalize(k))) s += 1;
    if (s > best) best = s;
  }
  return best;
}

export function detectAction(t: string): { action: Action | null; score: number } {
  const scores: Record<Action, number> = {
    delete: 0,
    create: 0,
    update: 0,
    list: 0,
    count: 0,
    search: 0,
    help: 0,
  };

  const add = (a: Action, n: number) => {
    scores[a] += n;
  };

  if (/حذف|پاک\s*کن|پاکش|بنداز\s*دور|از\s*بین\s*ببر|delete|remove|drop\b/.test(t)) add("delete", 3);
  if (/حذفش|پاکش\s*کن|دیلیت/.test(t)) add("delete", 2);

  if (/افزودن|اضافه|بساز|بسازید|ثبت\s*کن|ایجاد|create|add\b|new\b|insert/.test(t)) add("create", 3);
  if (/یه\s+.+(بساز|اضافه|ثبت)/.test(t)) add("create", 2);
  if (/میخوام\s+.+(اضافه|بسازم|ثبت)/.test(t)) add("create", 2);

  if (/ویرایش|بروز|آپدیت|تغییر|عوض\s*کن|rename|update|edit|set\b|modify/.test(t)) add("update", 3);
  if (/بکن|بگذار|بذار|کن/.test(t) && /قیمت|رنگ|نام|وضعیت|کد/.test(t)) add("update", 2);

  if (/لیست|فهرست|نشان\s*بده|نشون\s*بده|بیار|list|show|display|همه\s*ی/.test(t)) add("list", 2);
  if (/چی\s*داریم|چه\s*.+هایی|ببینم/.test(t)) add("list", 1);

  if (/تعداد|چندتا|چند\s*تا|count|how\s*many/.test(t)) add("count", 3);

  if (/جستجو|پیدا\s*کن|search|find\b/.test(t)) add("search", 2);

  if (/راهنما|چطور|چگونه|کمک|help|دستورات/.test(t)) add("help", 2);

  let best: Action | null = null;
  let bestScore = 0;
  for (const [a, s] of Object.entries(scores) as [Action, number][]) {
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }
  if (bestScore < 1) return { action: null, score: 0 };
  return { action: best, score: bestScore };
}

export function detectEntity(t: string, pathHint?: string): { entity: EntityKind | null; score: number } {
  const scores: Partial<Record<EntityKind, number>> = {};
  const bump = (e: EntityKind, n: number) => {
    scores[e] = (scores[e] || 0) + n;
  };

  if (/مدل|curtain\s*model|پارچه.?مدل|کاتالوگ.?مدل/.test(t)) bump("model", 3);
  if (/\bmodel\b/.test(t)) bump("model", 2);

  if (/نمونه\s*اجرا|پروژه|project\b|نمونه.?کار/.test(t)) bump("project", 3);
  if (/portfolio\s*item/.test(t)) bump("project", 2);

  if (/محصول|product\b|فروشگاه.?آیتم/.test(t)) bump("product", 3);

  if (/دسته\s*فروشگاه|shop\s*categor|اکسسوری.?دسته/.test(t)) bump("shop_category", 4);
  if (/دسته\s*کاتالوگ|curtain\s*categor/.test(t)) bump("category", 3);
  if (/\bدسته\b|دسته‌بندی|category/.test(t) && !scores.shop_category) bump("category", 2);

  if (/سفارش|order\b/.test(t)) bump("order", 3);
  if (/درخواست|مشاوره|consultation|request\b|اینباکس/.test(t)) bump("request", 3);

  if (/قالب|template|chroma/.test(t)) bump("template", 3);
  if (/مرجع\s*نصب|install\s*ref/.test(t)) bump("install_ref", 3);
  if (/طراحی\s*ذخیره|saved\s*design/.test(t)) bump("saved_design", 3);
  if (/پنجره\s*مجازی|window\s*setting/.test(t)) bump("window", 3);

  // سرنخ از مسیر ادمین
  if (pathHint) {
    if (pathHint.includes("models")) bump("model", 1);
    if (pathHint.includes("categories") && !pathHint.includes("portfolio")) bump("category", 1);
    if (pathHint.includes("portfolio")) bump("category", 1);
    if (pathHint.includes("projects")) bump("project", 1);
    if (pathHint.includes("products")) bump("product", 1);
    if (pathHint.includes("orders")) bump("order", 1);
    if (pathHint.includes("requests")) bump("request", 1);
    if (pathHint.includes("window")) bump("template", 1);
  }

  let best: EntityKind | null = null;
  let bestScore = 0;
  for (const [e, s] of Object.entries(scores) as [EntityKind, number][]) {
    if (s > bestScore) {
      bestScore = s;
      best = e;
    }
  }
  if (bestScore < 1) return { entity: null, score: 0 };
  return { entity: best, score: bestScore };
}

const STOP = new Set(
  normalize(
    "را رو رااز به با که از در برای یه یک این اون راحذف کن پاک بساز اضافه ثبت ویرایش تغییر عوض لیست نشان بده تعداد مدل دسته محصول سفارش درخواست پروژه نمونه اجرا پرده لطفا خواهشا میخوام می‌خوام بکن بگذار بذار باشه است هستشو اش"
  ).split(" ")
);

/** هدف (کد/نام/id) از باقی‌مانده جمله */
export function extractTarget(text: string, fields: Record<string, string>): string | null {
  if (fields.code) return fields.code;
  if (fields.slug) return fields.slug;
  if (fields.name) return fields.name;
  if (fields.title) return fields.title;

  // cuid
  const cuid = text.match(/\b(c[a-z0-9]{20,})\b/i);
  if (cuid) return cuid[1];

  // CODE-123
  const code = text.match(/\b([A-Za-z]{1,6}-?\d{2,6})\b/);
  if (code) return code[1];

  // بعد از فعل حذف/ویرایش
  const after = text.match(
    /(?:حذف|پاک|ویرایش|تغییر|عوض|delete|remove|update|edit)\s+(?:مدل|دسته|محصول|سفارش|درخواست|پروژه|نمونه)?\s*[«"]?([\u0600-\u06FFa-zA-Z0-9_-]{2,})/i
  );
  if (after?.[1] && !STOP.has(normalize(after[1]))) return after[1];

  // «X را حذف کن»
  const obj = text.match(/[«"]([^»"]{2,40})[»"]/);
  if (obj) return obj[1].trim();

  // آخرین توکن معنادار
  const tokens = normalize(text)
    .split(/[\s,،.؟!]+/)
    .filter((w) => w.length >= 2 && !STOP.has(w));
  if (tokens.length) {
    // ترجیح توکن شبیه کد
    const codeLike = tokens.find((w) => /[a-z].*\d|\d.*[a-z]/.test(w));
    if (codeLike) return codeLike;
    return tokens[tokens.length - 1];
  }
  return null;
}

export function parseAdminCommand(
  userText: string,
  opts?: { path?: string; imageUrl?: string }
): ParsedCommand {
  const raw = userText.trim();
  const t = normalize(raw);
  const fields = parseFields(raw);
  if (opts?.imageUrl) {
    fields.image = fields.image || opts.imageUrl;
    fields.cover = fields.cover || opts.imageUrl;
  }

  const { action, score: aScore } = detectAction(t);
  const { entity, score: eScore } = detectEntity(t, opts?.path);
  const target = extractTarget(raw, fields);

  // اگر فقط فیلد و هدف باشد بدون فعل → update فرضی
  let finalAction = action;
  if (!finalAction && target && (fields.price || fields.color || fields.status || fields.name || fields.title)) {
    finalAction = "update";
  }
  // «مدل‌ها» تنها → list
  if (!finalAction && entity && /ها\b|ها$/.test(t)) finalAction = "list";

  const confidence = Math.min(1, (aScore + eScore) / 6);

  return {
    action: finalAction,
    entity,
    target,
    fields,
    raw,
    confidence,
  };
}
