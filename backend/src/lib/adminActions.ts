/**
 * اجرای دستورات CRUD ادمین از متن فارسی/انگلیسی.
 * فقط از مسیر admin_assistant و بعد از requireAdmin فراخوانی شود.
 */
import { prisma } from "./prisma.js";
import type { AssistantResult, RichBlock } from "./consultant.js";

function pack(text: string, blocks?: RichBlock[], meta?: Record<string, unknown>): AssistantResult {
  return { text, blocks, meta };
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[یي]/g, "ی")
    .replace(/[کك]/g, "ک")
    .trim();
}

/** استخراج جفت‌های کلید:مقدار از متن */
function parseFields(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re =
    /(?:^|[\s,،\n])([\u0600-\u06FFa-zA-Z_][\u0600-\u06FFa-zA-Z0-9_]*)\s*[:：=]\s*([^\n,،]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const key = normalize(m[1]);
    const val = m[2].trim();
    if (key && val) out[key] = val;
  }
  // alias های فارسی
  const map: Record<string, string> = {
    نام: "name",
    عنوان: "title",
    کد: "code",
    شناسه: "slug",
    اسلاگ: "slug",
    دسته: "category",
    دسته‌بندی: "category",
    زیردسته: "subcategory",
    رنگ: "color",
    پارچه: "fabric",
    توضیح: "description",
    توضیحات: "description",
    قیمت: "price",
    موجودی: "stock",
    تصویر: "image",
    کاور: "cover",
    وضعیت: "status",
    ترتیب: "order",
    مکانیزم: "mechanism",
    visible: "visible",
  };
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(out)) {
    normalized[map[k] || k] = v;
  }
  return normalized;
}

function pickIdToken(text: string): string | null {
  // cuid-ish or short id
  const m =
    text.match(/\b(c[a-z0-9]{20,})\b/i) ||
    text.match(/(?:id|شناسه)\s*[:：=]?\s*([a-z0-9_-]{6,})/i) ||
    text.match(/\b([a-z]{2,}-?\d{2,}|[A-Z]{1,3}-?\d{2,})\b/);
  return m ? m[1] : null;
}

type EntityKind =
  | "model"
  | "category"
  | "portfolio_category"
  | "project"
  | "product"
  | "shop_category"
  | "order"
  | "request"
  | "template"
  | "install_ref"
  | "saved_design"
  | "window";

function detectEntity(t: string): EntityKind | null {
  if (/نمونه\s*اجرا|پروژه|project|portfolio\s*item/.test(t) && !/دسته/.test(t))
    return "project";
  if (/دسته\s*نمونه|portfolio\s*categor|دسته.?گالری/.test(t)) return "portfolio_category";
  if (/دسته\s*فروشگاه|shop\s*categor|اکسسوری.?دسته/.test(t)) return "shop_category";
  if (/دسته\s*کاتالوگ|curtain\s*categor|دسته.?پرده/.test(t)) return "category";
  if (/\bدسته\b|category/.test(t) && !/مدل|محصول|سفارش/.test(t)) return "category";
  if (/مدل|curtain\s*model|پارچه.?مدل/.test(t)) return "model";
  if (/محصول|product/.test(t)) return "product";
  if (/سفارش|order/.test(t)) return "order";
  if (/درخواست|مشاوره|request|consultation/.test(t)) return "request";
  if (/قالب|template|chroma/.test(t)) return "template";
  if (/مرجع\s*نصب|install\s*ref/.test(t)) return "install_ref";
  if (/طراحی\s*ذخیره|saved\s*design/.test(t)) return "saved_design";
  if (/پنجره\s*مجازی|window\s*setting/.test(t)) return "window";
  return null;
}

type Action = "create" | "update" | "delete" | "list" | "count";

function detectAction(t: string): Action | null {
  if (/حذف|پاک\s*کن|delete|remove/.test(t)) return "delete";
  if (/افزودن|اضافه|بساز|ثبت\s*کن|create|add|new/.test(t)) return "create";
  if (/ویرایش|بروز|تغییر|عوض|update|edit|set|rename/.test(t)) return "update";
  if (/تعداد|چند|count/.test(t)) return "count";
  if (/لیست|نشان\s*بده|list|show|همه/.test(t)) return "list";
  return null;
}

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 64) || `item-${Date.now().toString(36)}`;
}

async function resolveModel(token: string) {
  const byId = await prisma.curtainModel.findFirst({
    where: { OR: [{ id: { contains: token } }, { code: token }, { name: { contains: token } }] },
  });
  return byId;
}

async function resolveByIdOrName(
  entity: EntityKind,
  token: string
): Promise<{ id: string; label: string } | null> {
  switch (entity) {
    case "model": {
      const r = await resolveModel(token);
      return r ? { id: r.id, label: r.name || r.code } : null;
    }
    case "category": {
      const r = await prisma.curtainCategory.findFirst({
        where: { OR: [{ id: { contains: token } }, { slug: token }, { name: { contains: token } }] },
      });
      return r ? { id: r.id, label: r.name } : null;
    }
    case "portfolio_category": {
      const r = await prisma.portfolioCategory.findFirst({
        where: { OR: [{ id: { contains: token } }, { slug: token }, { name: { contains: token } }] },
      });
      return r ? { id: r.id, label: r.name } : null;
    }
    case "project": {
      const r = await prisma.project.findFirst({
        where: { OR: [{ id: { contains: token } }, { title: { contains: token } }] },
      });
      return r ? { id: r.id, label: r.title } : null;
    }
    case "product": {
      const r = await prisma.product.findFirst({
        where: { OR: [{ id: { contains: token } }, { slug: token }, { name: { contains: token } }] },
      });
      return r ? { id: r.id, label: r.name } : null;
    }
    case "shop_category": {
      const r = await prisma.shopCategory.findFirst({
        where: { OR: [{ id: { contains: token } }, { slug: token }, { name: { contains: token } }] },
      });
      return r ? { id: r.id, label: r.name } : null;
    }
    case "order": {
      const r = await prisma.order.findFirst({
        where: {
          OR: [{ id: { contains: token } }, { customerPhone: { contains: token } }, { authority: token }],
        },
      });
      return r ? { id: r.id, label: r.customerName } : null;
    }
    case "request": {
      const r = await prisma.consultationRequest.findFirst({
        where: {
          OR: [{ id: { contains: token } }, { phone: { contains: token } }, { name: { contains: token } }],
        },
      });
      return r ? { id: r.id, label: r.name } : null;
    }
    case "template": {
      const r = await prisma.renderTemplate.findFirst({
        where: { OR: [{ id: { contains: token } }, { style: token }] },
      });
      return r ? { id: r.id, label: r.style } : null;
    }
    case "install_ref": {
      const r = await prisma.installReference.findFirst({
        where: { OR: [{ id: { contains: token } }, { style: token }] },
      });
      return r ? { id: r.id, label: r.style } : null;
    }
    case "saved_design": {
      const r = await prisma.savedDesign.findFirst({
        where: { OR: [{ id: { contains: token } }, { title: { contains: token } }] },
      });
      return r ? { id: r.id, label: r.title } : null;
    }
    default:
      return null;
  }
}

export async function executeAdminCommand(
  userText: string,
  options?: { imageUrl?: string }
): Promise<AssistantResult | null> {
  const t = normalize(userText);
  const action = detectAction(t);
  const entity = detectEntity(t);
  const fields = parseFields(userText);
  if (options?.imageUrl) {
    fields.image = fields.image || options.imageUrl;
    fields.cover = fields.cover || options.imageUrl;
  }

  // دستورات بدون entity مشخص اما با action کلی
  if (!action && !entity) return null;

  // ——— COUNT ———
  if (action === "count" || (/تعداد/.test(t) && entity)) {
    const e = entity || "model";
    const counts: Record<string, number> = {
      model: await prisma.curtainModel.count(),
      category: await prisma.curtainCategory.count(),
      portfolio_category: await prisma.portfolioCategory.count(),
      project: await prisma.project.count(),
      product: await prisma.product.count(),
      shop_category: await prisma.shopCategory.count(),
      order: await prisma.order.count(),
      request: await prisma.consultationRequest.count(),
    };
    if (e && counts[e] !== undefined) {
      return pack(`تعداد **${labelEntity(e)}**: **${counts[e]}**`);
    }
    return pack(
      Object.entries(counts)
        .map(([k, v]) => `• ${labelEntity(k as EntityKind)}: **${v}**`)
        .join("\n")
    );
  }

  // ——— LIST ———
  if (action === "list" || (entity && !action && /لیست|نشان|همه/.test(t))) {
    return listEntity(entity || "model");
  }

  if (!entity) {
    if (action) {
      return pack(
        `نوع موجودیت را مشخص کن. مثال:\n` +
          `• حذف مدل ZB-001\n` +
          `• افزودن دسته کاتالوگ نام: زبرا شناسه: zebra\n` +
          `• ویرایش محصول slug:x قیمت:250000\n` +
          `• وضعیت سفارش id را paid کن`
      );
    }
    return null;
  }

  // ——— DELETE ———
  if (action === "delete") {
    const token = pickIdToken(userText) || fields.code || fields.slug || fields.name || fields.title;
    if (!token) {
      return pack(`برای حذف ${labelEntity(entity)} کد، نام یا id را بگو. مثال: حذف مدل ZB-001`);
    }
    const found = await resolveByIdOrName(entity, token);
    if (!found) return pack(`${labelEntity(entity)} با «${token}» پیدا نشد.`);

    await deleteEntity(entity, found.id);
    return pack(`✅ **${found.label}** (${labelEntity(entity)}) حذف شد.`, [
      { type: "link_buttons", items: adminLink(entity) },
    ]);
  }

  // ——— CREATE ———
  if (action === "create") {
    try {
      const created = await createEntity(entity, fields);
      return pack(`✅ ${labelEntity(entity)} **${created.label}** ساخته شد.\n\`${created.id}\``, [
        { type: "link_buttons", items: adminLink(entity) },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطا در ایجاد";
      return pack(`❌ ایجاد ناموفق: ${msg}\n\n${createHelp(entity)}`);
    }
  }

  // ——— UPDATE ———
  if (action === "update") {
    const token =
      pickIdToken(userText) || fields.code || fields.slug || fields.name || fields.title || "";
    if (!token) {
      return pack(`برای ویرایش ${labelEntity(entity)} شناسه/کد را بگو و فیلدها را با : بنویس.`);
    }
    const found = await resolveByIdOrName(entity, token);
    if (!found) return pack(`${labelEntity(entity)} با «${token}» پیدا نشد.`);

    // وضعیت سریع برای سفارش/درخواست
    if ((entity === "order" || entity === "request") && fields.status) {
      /* already in fields */
    } else if (entity === "order" || entity === "request") {
      const st = t.match(
        /(?:را|به|=)\s*(جدید|new|انجام|done|بسته|closed|درحال|processing|pending|paid|cancelled|shipped)/i
      );
      if (st) {
        const map: Record<string, string> = {
          جدید: "new",
          new: "new",
          انجام: "done",
          done: "done",
          بسته: "closed",
          closed: "closed",
          درحال: "processing",
          processing: "processing",
          pending: "pending",
          paid: "paid",
          cancelled: "cancelled",
          shipped: "shipped",
        };
        fields.status = map[normalize(st[1])] || st[1];
      }
    }

    try {
      const updated = await updateEntity(entity, found.id, fields);
      return pack(`✅ **${updated.label}** به‌روزرسانی شد.`, [
        { type: "link_buttons", items: adminLink(entity) },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطا";
      return pack(`❌ ویرایش ناموفق: ${msg}`);
    }
  }

  return null;
}

function labelEntity(e: EntityKind | string) {
  const map: Record<string, string> = {
    model: "مدل پرده",
    category: "دسته کاتالوگ",
    portfolio_category: "دسته نمونه‌اجرا",
    project: "نمونه اجرا",
    product: "محصول فروشگاه",
    shop_category: "دسته فروشگاه",
    order: "سفارش",
    request: "درخواست مشاوره",
    template: "قالب رندر",
    install_ref: "مرجع نصب",
    saved_design: "طراحی ذخیره‌شده",
    window: "تنظیم پنجره",
  };
  return map[e] || e;
}

function adminLink(e: EntityKind): Array<{ label: string; href: string }> {
  const map: Record<EntityKind, { label: string; href: string }> = {
    model: { label: "مدل‌ها", href: "/admin/models" },
    category: { label: "دسته‌های کاتالوگ", href: "/admin/categories" },
    portfolio_category: { label: "دسته نمونه‌ها", href: "/admin/portfolio-categories" },
    project: { label: "نمونه‌های اجرا", href: "/admin/projects" },
    product: { label: "محصولات", href: "/admin/products" },
    shop_category: { label: "دسته فروشگاه", href: "/admin/products" },
    order: { label: "سفارش‌ها", href: "/admin/orders" },
    request: { label: "درخواست‌ها", href: "/admin/requests" },
    template: { label: "پنجره مجازی", href: "/admin/window" },
    install_ref: { label: "پنجره مجازی", href: "/admin/window" },
    saved_design: { label: "داشبورد", href: "/admin" },
    window: { label: "پنجره مجازی", href: "/admin/window" },
  };
  return [map[e]];
}

function createHelp(e: EntityKind) {
  const helps: Record<EntityKind, string> = {
    model: "افزودن مدل کد: ZB-10 نام: زبرا طوسی دسته: zebra رنگ: طوسی",
    category: "افزودن دسته کاتالوگ نام: زبرا شناسه: zebra",
    portfolio_category: "افزودن دسته نمونه نام: پذیرایی شناسه: living",
    project: "افزودن نمونه اجرا عنوان: ویلا شمال دسته: living",
    product: "افزودن محصول نام: قلاب فلزی شناسه: hook-1 قیمت: 120000",
    shop_category: "افزودن دسته فروشگاه نام: اکسسوری شناسه: accessory",
    order: "سفارش را از پنل بساز؛ از چت فقط وضعیت را عوض کن",
    request: "درخواست‌ها از فرم سایت می‌آیند؛ وضعیت را عوض کن",
    template: "افزودن قالب style: roman تصویر: /uploads/...",
    install_ref: "افزودن مرجع نصب style: zebra",
    saved_design: "افزودن طراحی عنوان: طرح۱",
    window: "ویرایش پنجره مجازی wallColor: #fff",
  };
  return helps[e];
}

async function listEntity(entity: EntityKind): Promise<AssistantResult> {
  switch (entity) {
    case "model": {
      const rows = await prisma.curtainModel.findMany({ orderBy: { updatedAt: "desc" }, take: 10 });
      const n = await prisma.curtainModel.count();
      return pack(
        `**${n}** مدل — آخرین‌ها:\n` +
          rows.map((r) => `• **${r.name}** (${r.code}) — ${r.categorySlug} — \`${r.id.slice(0, 8)}\``).join("\n"),
        [{ type: "link_buttons", items: adminLink("model") }]
      );
    }
    case "category": {
      const rows = await prisma.curtainCategory.findMany({ orderBy: { order: "asc" }, take: 20 });
      return pack(
        rows.map((r) => `• **${r.name}** (\`${r.slug}\`)`).join("\n") || "خالی",
        [{ type: "link_buttons", items: adminLink("category") }]
      );
    }
    case "portfolio_category": {
      const rows = await prisma.portfolioCategory.findMany({ orderBy: { order: "asc" }, take: 20 });
      return pack(
        rows.map((r) => `• **${r.name}** (\`${r.slug}\`)`).join("\n") || "خالی",
        [{ type: "link_buttons", items: adminLink("portfolio_category") }]
      );
    }
    case "project": {
      const rows = await prisma.project.findMany({ orderBy: { updatedAt: "desc" }, take: 10 });
      return pack(
        rows.map((r) => `• **${r.title}** — ${r.categorySlug || "—"} — \`${r.id.slice(0, 8)}\``).join("\n") ||
          "خالی",
        [{ type: "link_buttons", items: adminLink("project") }]
      );
    }
    case "product": {
      const rows = await prisma.product.findMany({ orderBy: { updatedAt: "desc" }, take: 10 });
      return pack(
        rows
          .map((r) => `• **${r.name}** — ${r.price.toLocaleString("fa-IR")} ت — \`${r.slug}\``)
          .join("\n") || "خالی",
        [{ type: "link_buttons", items: adminLink("product") }]
      );
    }
    case "shop_category": {
      const rows = await prisma.shopCategory.findMany({ orderBy: { order: "asc" }, take: 20 });
      return pack(
        rows.map((r) => `• **${r.name}** (\`${r.slug}\`)`).join("\n") || "خالی",
        [{ type: "link_buttons", items: adminLink("shop_category") }]
      );
    }
    case "order": {
      const rows = await prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
      return pack(
        rows
          .map(
            (r) =>
              `• **${r.customerName}** — ${r.amountToman.toLocaleString("fa-IR")} — ${r.status} — \`${r.id.slice(0, 8)}\``
          )
          .join("\n") || "خالی",
        [{ type: "link_buttons", items: adminLink("order") }]
      );
    }
    case "request": {
      const rows = await prisma.consultationRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      return pack(
        rows
          .map((r) => `• **${r.name}** (${r.phone}) — ${r.status} — \`${r.id.slice(0, 8)}\``)
          .join("\n") || "خالی",
        [{ type: "link_buttons", items: adminLink("request") }]
      );
    }
    default: {
      return pack(`لیست ${labelEntity(entity)} از پنل مربوطه قابل مشاهده است.`, [
        { type: "link_buttons", items: adminLink(entity) },
      ]);
    }
  }
}

async function deleteEntity(entity: EntityKind, id: string) {
  switch (entity) {
    case "model":
      return prisma.curtainModel.delete({ where: { id } });
    case "category":
      return prisma.curtainCategory.delete({ where: { id } });
    case "portfolio_category":
      return prisma.portfolioCategory.delete({ where: { id } });
    case "project":
      return prisma.project.delete({ where: { id } });
    case "product":
      return prisma.product.delete({ where: { id } });
    case "shop_category":
      return prisma.shopCategory.delete({ where: { id } });
    case "order":
      return prisma.order.delete({ where: { id } });
    case "request":
      return prisma.consultationRequest.delete({ where: { id } });
    case "template":
      return prisma.renderTemplate.delete({ where: { id } });
    case "install_ref":
      return prisma.installReference.delete({ where: { id } });
    case "saved_design":
      return prisma.savedDesign.delete({ where: { id } });
    default:
      throw new Error("حذف این نوع پشتیبانی نشده");
  }
}

async function createEntity(
  entity: EntityKind,
  f: Record<string, string>
): Promise<{ id: string; label: string }> {
  switch (entity) {
    case "model": {
      const code = f.code || `M-${Date.now().toString(36).slice(-5)}`;
      const name = f.name || code;
      const categorySlug = f.category || f.slug || "roman";
      const row = await prisma.curtainModel.create({
        data: {
          code,
          name,
          categorySlug,
          subcategory: f.subcategory || null,
          color: f.color || null,
          fabric: f.fabric || null,
          description: f.description || null,
          image: f.image || null,
          material: f.material || null,
        },
      });
      return { id: row.id, label: row.name };
    }
    case "category": {
      const name = f.name || "دسته جدید";
      const slug = f.slug || slugify(name);
      const row = await prisma.curtainCategory.create({
        data: {
          name,
          slug,
          description: f.description || null,
          image: f.image || null,
          order: f.order ? Number(f.order) : 99,
          mechanism: f.mechanism || null,
          subcategories: f.subcategories || null,
        },
      });
      return { id: row.id, label: row.name };
    }
    case "portfolio_category": {
      const name = f.name || "دسته نمونه";
      const slug = f.slug || slugify(name);
      const row = await prisma.portfolioCategory.create({
        data: {
          name,
          slug,
          description: f.description || null,
          image: f.image || null,
          order: f.order ? Number(f.order) : 99,
          subcategories: f.subcategories || null,
        },
      });
      return { id: row.id, label: row.name };
    }
    case "project": {
      const title = f.title || f.name || "نمونه جدید";
      const row = await prisma.project.create({
        data: {
          title,
          description: f.description || null,
          coverImage: f.cover || f.image || null,
          categorySlug: f.category || "",
          subcategory: f.subcategory || null,
        },
      });
      return { id: row.id, label: row.title };
    }
    case "product": {
      const name = f.name || "محصول";
      const slug = f.slug || slugify(name);
      const row = await prisma.product.create({
        data: {
          name,
          slug,
          description: f.description || null,
          price: f.price ? Number(f.price) : 0,
          image: f.image || null,
          stock: f.stock ? Number(f.stock) : 100,
          visible: f.visible !== "false",
        },
      });
      return { id: row.id, label: row.name };
    }
    case "shop_category": {
      const name = f.name || "دسته";
      const slug = f.slug || slugify(name);
      const row = await prisma.shopCategory.create({
        data: {
          name,
          slug,
          description: f.description || null,
          image: f.image || null,
          order: f.order ? Number(f.order) : 0,
        },
      });
      return { id: row.id, label: row.name };
    }
    case "template": {
      const style = f.style || f.slug || "roman";
      const image = f.image || "";
      if (!image) throw new Error("برای قالب فیلد تصویر لازم است");
      const row = await prisma.renderTemplate.create({ data: { style, image } });
      return { id: row.id, label: row.style };
    }
    case "install_ref": {
      const style = f.style || "roman";
      const image = f.image || "";
      if (!image) throw new Error("تصویر لازم است");
      const row = await prisma.installReference.create({
        data: { style, image, note: f.description || null },
      });
      return { id: row.id, label: row.style };
    }
    case "saved_design": {
      const title = f.title || f.name || "طرح";
      const image = f.image || "";
      if (!image) throw new Error("تصویر لازم است");
      const row = await prisma.savedDesign.create({ data: { title, image } });
      return { id: row.id, label: row.title };
    }
    case "order":
    case "request":
      throw new Error("ایجاد سفارش/درخواست از چت پشتیبانی نمی‌شود — از فرم سایت استفاده کن");
    case "window": {
      const row = await prisma.virtualWindowSetting.create({
        data: {
          wallColor: f.wallColor || null,
          frameColor: f.frameColor || null,
          railColor: f.railColor || null,
          viewImage: f.image || null,
        },
      });
      return { id: row.id, label: "تنظیم پنجره" };
    }
    default:
      throw new Error("ایجاد پشتیبانی نشده");
  }
}

async function updateEntity(
  entity: EntityKind,
  id: string,
  f: Record<string, string>
): Promise<{ id: string; label: string }> {
  switch (entity) {
    case "model": {
      const data: Record<string, unknown> = {};
      if (f.name) data.name = f.name;
      if (f.code) data.code = f.code;
      if (f.category) data.categorySlug = f.category;
      if (f.subcategory) data.subcategory = f.subcategory;
      if (f.color) data.color = f.color;
      if (f.fabric) data.fabric = f.fabric;
      if (f.description) data.description = f.description;
      if (f.image) data.image = f.image;
      if (f.material) data.material = f.material;
      if (Object.keys(data).length === 0) throw new Error("هیچ فیلدی برای ویرایش نبود");
      const row = await prisma.curtainModel.update({ where: { id }, data });
      return { id: row.id, label: row.name };
    }
    case "category": {
      const data: Record<string, unknown> = {};
      if (f.name) data.name = f.name;
      if (f.slug) data.slug = f.slug;
      if (f.description) data.description = f.description;
      if (f.image) data.image = f.image;
      if (f.order) data.order = Number(f.order);
      if (f.mechanism) data.mechanism = f.mechanism;
      if (f.subcategories) data.subcategories = f.subcategories;
      const row = await prisma.curtainCategory.update({ where: { id }, data });
      return { id: row.id, label: row.name };
    }
    case "portfolio_category": {
      const data: Record<string, unknown> = {};
      if (f.name) data.name = f.name;
      if (f.slug) data.slug = f.slug;
      if (f.description) data.description = f.description;
      if (f.image) data.image = f.image;
      if (f.order) data.order = Number(f.order);
      if (f.subcategories) data.subcategories = f.subcategories;
      const row = await prisma.portfolioCategory.update({ where: { id }, data });
      return { id: row.id, label: row.name };
    }
    case "project": {
      const data: Record<string, unknown> = {};
      if (f.title || f.name) data.title = f.title || f.name;
      if (f.description) data.description = f.description;
      if (f.cover || f.image) data.coverImage = f.cover || f.image;
      if (f.category) data.categorySlug = f.category;
      if (f.subcategory) data.subcategory = f.subcategory;
      const row = await prisma.project.update({ where: { id }, data });
      return { id: row.id, label: row.title };
    }
    case "product": {
      const data: Record<string, unknown> = {};
      if (f.name) data.name = f.name;
      if (f.slug) data.slug = f.slug;
      if (f.description) data.description = f.description;
      if (f.price) data.price = Number(f.price);
      if (f.image) data.image = f.image;
      if (f.stock) data.stock = Number(f.stock);
      if (f.visible) data.visible = f.visible !== "false";
      const row = await prisma.product.update({ where: { id }, data });
      return { id: row.id, label: row.name };
    }
    case "shop_category": {
      const data: Record<string, unknown> = {};
      if (f.name) data.name = f.name;
      if (f.slug) data.slug = f.slug;
      if (f.description) data.description = f.description;
      if (f.image) data.image = f.image;
      if (f.order) data.order = Number(f.order);
      const row = await prisma.shopCategory.update({ where: { id }, data });
      return { id: row.id, label: row.name };
    }
    case "order": {
      const data: Record<string, unknown> = {};
      if (f.status) data.status = f.status;
      if (f.note) data.note = f.note;
      if (Object.keys(data).length === 0) throw new Error("وضعیت یا note بده");
      const row = await prisma.order.update({ where: { id }, data });
      return { id: row.id, label: row.customerName };
    }
    case "request": {
      const data: Record<string, unknown> = {};
      if (f.status) data.status = f.status;
      if (Object.keys(data).length === 0) throw new Error("وضعیت را مشخص کن");
      const row = await prisma.consultationRequest.update({ where: { id }, data });
      return { id: row.id, label: row.name };
    }
    case "template": {
      const data: Record<string, unknown> = {};
      if (f.style) data.style = f.style;
      if (f.image) data.image = f.image;
      const row = await prisma.renderTemplate.update({ where: { id }, data });
      return { id: row.id, label: row.style };
    }
    case "install_ref": {
      const data: Record<string, unknown> = {};
      if (f.style) data.style = f.style;
      if (f.image) data.image = f.image;
      if (f.description) data.note = f.description;
      const row = await prisma.installReference.update({ where: { id }, data });
      return { id: row.id, label: row.style };
    }
    case "saved_design": {
      const data: Record<string, unknown> = {};
      if (f.title || f.name) data.title = f.title || f.name;
      if (f.image) data.image = f.image;
      const row = await prisma.savedDesign.update({ where: { id }, data });
      return { id: row.id, label: row.title };
    }
    case "window": {
      const data: Record<string, unknown> = {};
      if (f.wallColor) data.wallColor = f.wallColor;
      if (f.frameColor) data.frameColor = f.frameColor;
      if (f.railColor) data.railColor = f.railColor;
      if (f.image) data.viewImage = f.image;
      const row = await prisma.virtualWindowSetting.update({ where: { id }, data });
      return { id: row.id, label: "تنظیم پنجره" };
    }
    default:
      throw new Error("ویرایش پشتیبانی نشده");
  }
}
