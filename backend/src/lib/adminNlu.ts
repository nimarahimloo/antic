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
  "دسته‌بندی": "category",
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

export function parseFields(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re =
    /(?:^|[\s,،\n])([\u0600-\u06FFa-zA-Z_][\u0600-\u06FFa-zA-Z0-9_]*)\s*[:：=]\s*([^\n,،]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const key = FIELD_ALIASES[normalize(m[1])] || normalize(m[1]);
    const val = m[2].trim().replace(/[«»"']/g, "");
    if (key && val) out[key] = val;
  }

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

  if (/حذف|پاک\s*کن|پاکش|بنداز\s*دور|از\s*بین\s*ببر|دیلیت|پاک\s*کنید|بکش\s*کن|بزن\s*بیرون|نداشته\s*باش|delete|remove|drop\b/.test(t))
    add("delete", 3);
  if (/حذفش|پاکش\s*کن|دیلیت|برش\s*دار|ببر\s*دور/.test(t)) add("delete", 2);
  if (/رو\s+پاک|را\s+پاک|رو\s+حذف|را\s+حذف/.test(t)) add("delete", 3);

  if (/افزودن|اضافه|بساز|بسازید|ثبت\s*کن|ایجاد|بذار\s*تو\s*سیستم|وارد\s*کن|create|add\b|new\b|insert/.test(t))
    add("create", 3);
  if (/یه\s+.+(بساز|اضافه|ثبت)/.test(t)) add("create", 2);
  if (/میخوام\s+.+(اضافه|بسازم|ثبت)/.test(t)) add("create", 2);
  if (/دارم\s+.+(جدید|تازه)/.test(t) && /مدل|دسته|محصول|پروژه/.test(t)) add("create", 2);
  if (/بزن\s+تو\s+(سایت|دیتابیس|سیستم)/.test(t)) add("create", 2);

  if (/ویرایش|بروز|آپدیت|تغییر|عوض\s*کن|عوضش|درستش\s*کن|اصلاح|rename|update|edit|set\b|modify/.test(t))
    add("update", 3);
  if (/بکن|بگذار|بذار|کن\b/.test(t) && /قیمت|رنگ|نام|وضعیت|کد|عنوان|توضیح/.test(t)) add("update", 2);
  if (/رو\s+بکن|را\s+بکن|بشه\s+|بشود\s+/.test(t) && /قیمت|رنگ|نام|وضعیت/.test(t)) add("update", 2);
  if (/از\s+.+\s+به\s+/.test(t)) add("update", 2);

  if (/لیست|فهرست|نشان\s*بده|نشون\s*بده|بیار|بده\s*ببینم|list|show|display|همه\s*ی|نمایش\s*بده/.test(t))
    add("list", 3);
  if (/چی\s*داریم|چه\s*.+هایی|ببینم|چیا\s*داریم|چی\s*هست|چی\s*داری/.test(t)) add("list", 3);
  if (/همه\s*(مدل|دسته|محصول|سفارش|درخواست|پروژه|ها)/.test(t)) add("list", 3);
  if (/مدل.?ها|دسته.?ها|سفارش.?ها|محصول.?ها|درخواست.?ها/.test(t) && !/حذف|ویرایش|افزودن/.test(t))
    add("list", 2);

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

  if (/مدل|curtain\s*model|پارچه.?مدل|کاتالوگ.?مدل|مدل.?ها/.test(t)) bump("model", 3);
  if (/\bmodel\b/.test(t)) bump("model", 2);
  if (/نمونه\s*اجرا|پروژه|project\b|نمونه.?کار/.test(t)) bump("project", 3);
  if (/محصول|product\b|فروشگاه.?آیتم|محصول.?ها/.test(t)) bump("product", 3);
  if (/دسته\s*فروشگاه|shop\s*categor|اکسسوری.?دسته/.test(t)) bump("shop_category", 4);
  if (/دسته\s*کاتالوگ|دسته.?بندی|دسته.?ها|categor|کاتالوگ.?دسته/.test(t) && !/فروشگاه/.test(t))
    bump("category", 3);
  if (/دسته/.test(t) && !/فروشگاه/.test(t) && !scores["category"]) bump("category", 2);
  if (/سفارش|order\b/.test(t)) bump("order", 3);
  if (/درخواست|مشاوره|request\b/.test(t)) bump("request", 3);
  if (/قالب|template|chroma/.test(t)) bump("template", 3);
  if (/مرجع\s*نصب|install\s*ref/.test(t)) bump("install_ref", 3);
  if (/طراحی\s*ذخیره|saved\s*design/.test(t)) bump("saved_design", 3);
  if (/پنجره\s*مجازی|window\s*setting/.test(t)) bump("window", 3);

  if (pathHint) {
    if (pathHint.includes("models")) bump("model", 2);
    if (pathHint.includes("categories") && !pathHint.includes("portfolio")) bump("category", 2);
    if (pathHint.includes("portfolio")) bump("category", 1);
    if (pathHint.includes("projects")) bump("project", 2);
    if (pathHint.includes("products")) bump("product", 2);
    if (pathHint.includes("orders")) bump("order", 2);
    if (pathHint.includes("requests")) bump("request", 2);
    if (pathHint.includes("window")) bump("template", 2);
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
    "را رو به با که از در برای یه یک این اون حذف کن پاک بساز اضافه ثبت ویرایش تغییر عوض لیست نشان بده تعداد مدل دسته محصول سفارش درخواست پروژه نمونه اجرا پرده لطفا خواهشا میخوام می‌خوام بکن بگذار بذار باشه است هست"
  ).split(" ")
);

export function extractTarget(text: string, fields: Record<string, string>): string | null {
  if (fields.code) return fields.code;
  if (fields.slug) return fields.slug;
  if (fields.name) return fields.name;
  if (fields.title) return fields.title;

  const cuid = text.match(/\b(c[a-z0-9]{20,})\b/i);
  if (cuid) return cuid[1];

  const code = text.match(/\b([A-Za-z]{1,6}-?\d{2,6})\b/);
  if (code) return code[1];

  const after = text.match(
    /(?:حذف|پاک|ویرایش|تغییر|عوض|delete|remove|update|edit)\s+(?:مدل|دسته|محصول|سفارش|درخواست|پروژه|نمونه)?\s*[«"]?([\u0600-\u06FFa-zA-Z0-9_-]{2,})/i
  );
  if (after?.[1] && !STOP.has(normalize(after[1]))) return after[1];

  const objVerb = text.match(
    /([A-Za-z0-9\u0600-\u06FF_-]{2,40})\s*(?:رو|را)\s*(?:پاک|حذف|عوض|ویرایش|بکن|بگذار|بذار)/i
  );
  if (objVerb?.[1] && !STOP.has(normalize(objVerb[1]))) return objVerb[1];

  const obj = text.match(/[«"]([^»"]{2,40})[»"]/);
  if (obj) return obj[1].trim();

  const tokens = normalize(text)
    .split(/[\s,،.؟!]+/)
    .filter((w) => w.length >= 2 && !STOP.has(w));
  if (tokens.length) {
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

  let finalAction = action;
  if (!finalAction && target && (fields.price || fields.color || fields.status || fields.name || fields.title)) {
    finalAction = "update";
  }
  if (!finalAction && entity && /ها\b|ها$/.test(t)) finalAction = "list";

  let finalEntity = entity;
  if (!finalEntity && finalAction && opts?.path) {
    const { entity: pathEnt, score: ps } = detectEntity("", opts.path);
    if (ps >= 1) finalEntity = pathEnt;
  }

  const confidence = Math.min(1, ((finalAction ? 2 : 0) + (finalEntity ? 2 : 0) + aScore + eScore) / 8);

  return {
    action: finalAction,
    entity: finalEntity,
    target,
    fields,
    raw,
    confidence,
  };
}
