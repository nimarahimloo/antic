/**
 * اجرای CRUD ادمین با تشخیص آزاد جمله (adminNlu).
 * حذف/افزودن/ویرایش فقط بعد از پیش‌نمایش و تایید ادمین.
 */
import { prisma } from "./prisma.js";
import {
  parseAdminCommand,
  type Action,
  type EntityKind,
} from "./adminNlu.js";

export type AdminBlock =
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

export type AdminActionResult = {
  text: string;
  blocks?: AdminBlock[];
  meta?: Record<string, unknown>;
};

function pack(text: string, blocks?: AdminBlock[], meta?: Record<string, unknown>): AdminActionResult {
  return { text, blocks, meta };
}

type PendingMutation = {
  action: Action;
  entity: EntityKind;
  target: string | null;
  fields: Record<string, string>;
  resolvedId?: string;
  resolvedLabel?: string;
  createdAt: number;
};

const pendingMutations = new Map<string, PendingMutation>();

function confirmButtons(): AdminBlock {
  return {
    type: "quick_replies",
    items: [
      { label: "✅ تایید اجرا", message: "تایید" },
      { label: "✕ انصراف", message: "انصراف" },
    ],
  };
}

function fieldLines(fields: Record<string, string>): string {
  const keys = Object.keys(fields);
  if (!keys.length) return "• (بدون فیلد اضافه)";
  return keys.map((k) => `• **${k}**: ${fields[k]}`).join("\n");
}

function isConfirmText(s: string) {
  const n = s.trim().toLowerCase().replace(/[یي]/g, "ی");
  return /^(تایید|تاید|تائید|confirm|yes|آره|باشه)$/i.test(n) || n === "تایید کن" || n === "اجرا کن";
}

function isCancelText(s: string) {
  const n = s.trim().toLowerCase().replace(/[یي]/g, "ی");
  return /^(انصراف|لغو|رد|cancel|no|نه)$/i.test(n);
}

function slugify(s: string) {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\u0600-\u06FF-]/g, "")
      .replace(/-+/g, "-")
      .slice(0, 64) || `item-${Date.now().toString(36)}`
  );
}

async function resolveByIdOrName(
  entity: EntityKind,
  token: string
): Promise<{ id: string; label: string } | null> {
  const t = token.trim();
  if (!t) return null;

  switch (entity) {
    case "model": {
      const r = await prisma.curtainModel.findFirst({
        where: {
          OR: [
            { id: { contains: t } },
            { code: { contains: t } },
            { name: { contains: t } },
          ],
        },
      });
      return r ? { id: r.id, label: r.name || r.code } : null;
    }
    case "category": {
      const r = await prisma.curtainCategory.findFirst({
        where: {
          OR: [{ id: { contains: t } }, { slug: { contains: t } }, { name: { contains: t } }],
        },
      });
      return r ? { id: r.id, label: r.name } : null;
    }
    case "project": {
      const r = await prisma.project.findFirst({
        where: { OR: [{ id: { contains: t } }, { title: { contains: t } }] },
      });
      return r ? { id: r.id, label: r.title } : null;
    }
    case "product": {
      const r = await prisma.product.findFirst({
        where: {
          OR: [{ id: { contains: t } }, { slug: { contains: t } }, { name: { contains: t } }],
        },
      });
      return r ? { id: r.id, label: r.name } : null;
    }
    case "shop_category": {
      const r = await prisma.shopCategory.findFirst({
        where: {
          OR: [{ id: { contains: t } }, { slug: { contains: t } }, { name: { contains: t } }],
        },
      });
      return r ? { id: r.id, label: r.name } : null;
    }
    case "order": {
      const r = await prisma.order.findFirst({
        where: {
          OR: [
            { id: { contains: t } },
            { customerPhone: { contains: t } },
            { customerName: { contains: t } },
            { authority: t },
          ],
        },
      });
      return r ? { id: r.id, label: r.customerName } : null;
    }
    case "request": {
      const r = await prisma.consultationRequest.findFirst({
        where: {
          OR: [{ id: { contains: t } }, { phone: { contains: t } }, { name: { contains: t } }],
        },
      });
      return r ? { id: r.id, label: r.name } : null;
    }
    case "template": {
      const r = await prisma.renderTemplate.findFirst({
        where: { OR: [{ id: { contains: t } }, { style: { contains: t } }] },
      });
      return r ? { id: r.id, label: r.style } : null;
    }
    case "install_ref": {
      const r = await prisma.installReference.findFirst({
        where: { OR: [{ id: { contains: t } }, { style: { contains: t } }] },
      });
      return r ? { id: r.id, label: r.style } : null;
    }
    case "saved_design": {
      const r = await prisma.savedDesign.findFirst({
        where: { OR: [{ id: { contains: t } }, { title: { contains: t } }] },
      });
      return r ? { id: r.id, label: r.title } : null;
    }
    case "window": {
      const r = await prisma.virtualWindowSetting.findFirst({
        where: { id: { contains: t } },
      });
      return r ? { id: r.id, label: "تنظیم پنجره" } : null;
    }
    default:
      return null;
  }
}

export async function executeAdminCommand(
  userText: string,
  options?: { imageUrl?: string; path?: string; conversationId?: string }
): Promise<AdminActionResult | null> {
  const conversationId = options?.conversationId || "default";

  if (isConfirmText(userText)) {
    const pending = pendingMutations.get(conversationId);
    if (!pending) {
      return pack("درخواستی در انتظار تایید نیست. دستور جدید بده.");
    }
    if (Date.now() - pending.createdAt > 5 * 60 * 1000) {
      pendingMutations.delete(conversationId);
      return pack("زمان تایید تمام شد. دوباره دستور را بفرست.");
    }
    try {
      const result = await runMutation(pending);
      pendingMutations.delete(conversationId);
      return result;
    } catch (e) {
      pendingMutations.delete(conversationId);
      const msg = e instanceof Error ? e.message : "خطا";
      return pack(`❌ اجرا ناموفق: ${msg}`);
    }
  }
  if (isCancelText(userText)) {
    if (pendingMutations.has(conversationId)) {
      pendingMutations.delete(conversationId);
      return pack("انصراف ثبت شد — تغییری اعمال نشد.", [
        {
          type: "quick_replies",
          items: [{ label: "خلاصه وضعیت", message: "خلاصه وضعیت" }],
        },
      ]);
    }
    return pack("درخواستی برای انصراف نبود.");
  }

  const parsed = parseAdminCommand(userText, {
    imageUrl: options?.imageUrl,
    path: options?.path,
  });

  let action = parsed.action;
  let entity = parsed.entity;
  const fields = { ...parsed.fields };
  const target = parsed.target;

  if (!action && !entity) return null;

  if (action === "help") {
    return pack(
      `می‌توانی آزاد حرف بزنی — مثال‌ها:\n` +
        `• «مدل ZB-001 رو پاک کن» → پیش‌نمایش → تایید\n` +
        `• «یه مدل جدید با کد TEST و نام تست و دسته zebra بساز»\n` +
        `• «قیمت محصول قلاب رو بکن 200000»\n` +
        `حذف / افزودن / ویرایش فقط بعد از دکمه **تایید اجرا** اعمال می‌شود.`
    );
  }

  if (action === "count") {
    const counts: Record<string, number> = {
      model: await prisma.curtainModel.count(),
      category: await prisma.curtainCategory.count(),
      project: await prisma.project.count(),
      product: await prisma.product.count(),
      shop_category: await prisma.shopCategory.count(),
      order: await prisma.order.count(),
      request: await prisma.consultationRequest.count(),
    };
    if (entity && counts[entity] !== undefined) {
      return pack(`تعداد **${labelEntity(entity)}**: **${counts[entity]}**`);
    }
    return pack(
      Object.entries(counts)
        .map(([k, v]) => `• ${labelEntity(k as EntityKind)}: **${v}**`)
        .join("\n")
    );
  }

  if (action === "list" || action === "search") {
    if (!entity) {
      return pack("بگو لیست **چی** را می‌خواهی: مدل، دسته، محصول، سفارش، درخواست، نمونه اجرا…");
    }
    return listEntity(entity, target);
  }

  if (!entity) {
    if (action) {
      return pack(
        `متوجه شدم می‌خواهی **${labelAction(action)}** کنی؛ بگو روی چه چیزی (مدل، دسته، محصول، سفارش، …).`
      );
    }
    return null;
  }

  if (!action) action = "list";

  if (action === "delete") {
    if (!target) return pack(`برای حذف ${labelEntity(entity)} نام، کد یا id را بگو.`);
    const found = await resolveByIdOrName(entity, target);
    if (!found) return pack(`${labelEntity(entity)} با «${target}» پیدا نشد.`);
    pendingMutations.set(conversationId, {
      action: "delete",
      entity,
      target,
      fields: {},
      resolvedId: found.id,
      resolvedLabel: found.label,
      createdAt: Date.now(),
    });
    return pack(
      `⚠️ **پیش‌نمایش حذف**\n` +
        `نوع: **${labelEntity(entity)}**\n` +
        `مورد: **${found.label}**\n` +
        `شناسه: \`${found.id}\`\n\n` +
        `این عملیات بعد از تایید اجرا می‌شود و قابل بازگشت نیست.\n` +
        `**حتماً روی «تایید اجرا» یا «انصراف» کلیک کن.**`,
      [confirmButtons(), { type: "link_buttons", items: adminLink(entity) }],
      { pending: true, action: "delete" }
    );
  }

  if (action === "create") {
    if (!fields.name && !fields.title && target && !/^(مدل|دسته|محصول)$/.test(target)) {
      if (entity === "project") fields.title = fields.title || target;
      else fields.name = fields.name || target;
    }
    const previewName = fields.name || fields.title || fields.code || "(بدون نام)";
    pendingMutations.set(conversationId, {
      action: "create",
      entity,
      target,
      fields: { ...fields },
      createdAt: Date.now(),
    });
    return pack(
      `📝 **پیش‌نمایش افزودن ${labelEntity(entity)}**\n` +
        `خروجی تقریبی بعد از تایید:\n` +
        `• عنوان/نام: **${previewName}**\n` +
        `${fieldLines(fields)}\n\n` +
        `${createHelp(entity)}\n\n` +
        `اگر درست است **تایید اجرا** را بزن؛ وگرنه **انصراف**.`,
      [confirmButtons()],
      { pending: true, action: "create" }
    );
  }

  if (action === "update") {
    if (!target) {
      return pack(`برای ویرایش ${labelEntity(entity)} بگو کدام مورد (کد/نام/id) و چه چیزی عوض شود.`);
    }
    const found = await resolveByIdOrName(entity, target);
    if (!found) return pack(`${labelEntity(entity)} با «${target}» پیدا نشد.`);
    if (Object.keys(fields).length === 0) {
      return pack(
        `**${found.label}** پیدا شد. بگو چه فیلدی عوض شود — مثلاً «رنگش کرم باشه» یا «قیمت: 200000».`
      );
    }
    pendingMutations.set(conversationId, {
      action: "update",
      entity,
      target,
      fields: { ...fields },
      resolvedId: found.id,
      resolvedLabel: found.label,
      createdAt: Date.now(),
    });
    return pack(
      `✏️ **پیش‌نمایش ویرایش**\n` +
        `نوع: **${labelEntity(entity)}**\n` +
        `مورد فعلی: **${found.label}**\n` +
        `تغییرات درخواستی:\n${fieldLines(fields)}\n\n` +
        `بعد از تایید این مقادیر اعمال می‌شود.\n` +
        `**روی تایید یا انصراف کلیک کن.**`,
      [confirmButtons(), { type: "link_buttons", items: adminLink(entity) }],
      { pending: true, action: "update" }
    );
  }

  if (action === "list") return listEntity(entity, target);

  return null;
}

async function runMutation(pending: PendingMutation): Promise<AdminActionResult> {
  const { action, entity, fields } = pending;
  if (action === "delete") {
    if (!pending.resolvedId) throw new Error("مورد یافت نشد");
    await deleteEntity(entity, pending.resolvedId);
    return pack(`✅ **${pending.resolvedLabel}** (${labelEntity(entity)}) حذف شد.`, [
      { type: "link_buttons", items: adminLink(entity) },
    ]);
  }
  if (action === "create") {
    const created = await createEntity(entity, fields);
    return pack(`✅ ${labelEntity(entity)} **${created.label}** ساخته شد.\n\`${created.id}\``, [
      { type: "link_buttons", items: adminLink(entity) },
    ]);
  }
  if (action === "update") {
    if (!pending.resolvedId) throw new Error("مورد یافت نشد");
    const updated = await updateEntity(entity, pending.resolvedId, fields);
    return pack(`✅ **${updated.label}** به‌روزرسانی شد.`, [
      { type: "link_buttons", items: adminLink(entity) },
    ]);
  }
  throw new Error("عملیات پشتیبانی نشده");
}

function labelAction(a: Action) {
  const m: Record<string, string> = {
    create: "افزودن",
    update: "ویرایش",
    delete: "حذف",
    list: "لیست",
    count: "شمارش",
    search: "جستجو",
    help: "راهنما",
  };
  return m[a] || a;
}

function labelEntity(e: EntityKind | string) {
  const map: Record<string, string> = {
    model: "مدل پرده",
    category: "دسته",
    project: "نمونه اجرا",
    product: "محصول",
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
    category: { label: "دسته‌ها", href: "/admin/categories" },
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
    model: "مثال: یه مدل با کد ZB-10 و نام زبرا و دسته zebra بساز",
    category: "مثال: دسته جدید نام پذیرایی شناسه living-room اضافه کن",
    project: "مثال: نمونه اجرا با عنوان ویلا شمال و دسته living-room ثبت کن",
    product: "مثال: محصول قلاب با قیمت 150000 اضافه کن",
    shop_category: "مثال: دسته فروشگاه اکسسوری با شناسه accessories بساز",
    order: "سفارش را از چت فقط وضعیتش را عوض کن",
    request: "درخواست را با نام یا id پیدا کن و وضعیتش را عوض کن",
    template: "قالب نیاز به style و تصویر دارد",
    install_ref: "مرجع نصب نیاز به style و تصویر دارد",
    saved_design: "طراحی نیاز به عنوان و تصویر دارد",
    window: "wallColor یا frameColor را بگو",
  };
  return helps[e];
}

async function listEntity(entity: EntityKind, search?: string | null): Promise<AdminActionResult> {
  const q = search?.trim();
  switch (entity) {
    case "model": {
      const rows = await prisma.curtainModel.findMany({
        where: q
          ? {
              OR: [
                { name: { contains: q } },
                { code: { contains: q } },
                { categorySlug: { contains: q } },
              ],
            }
          : undefined,
        orderBy: { updatedAt: "desc" },
        take: 12,
      });
      const n = await prisma.curtainModel.count();
      return pack(
        `**${n}** مدل${q ? ` (فیلتر: ${q})` : ""}:\n` +
          (rows.map((r) => `• **${r.name}** (${r.code}) — ${r.categorySlug}`).join("\n") || "—"),
        [{ type: "link_buttons", items: adminLink("model") }]
      );
    }
    case "category": {
      const rows = await prisma.curtainCategory.findMany({
        where: q
          ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] }
          : undefined,
        orderBy: { order: "asc" },
        take: 30,
      });
      return pack(
        rows.map((r) => `• **${r.name}** (\`${r.slug}\`)`).join("\n") || "خالی",
        [{ type: "link_buttons", items: adminLink("category") }]
      );
    }
    case "project": {
      const rows = await prisma.project.findMany({
        where: q
          ? { OR: [{ title: { contains: q } }, { categorySlug: { contains: q } }] }
          : undefined,
        orderBy: { updatedAt: "desc" },
        take: 12,
      });
      return pack(
        rows.map((r) => `• **${r.title}** — ${r.categorySlug || "—"}`).join("\n") || "خالی",
        [{ type: "link_buttons", items: adminLink("project") }]
      );
    }
    case "product": {
      const rows = await prisma.product.findMany({
        where: q
          ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] }
          : undefined,
        orderBy: { updatedAt: "desc" },
        take: 12,
      });
      return pack(
        rows
          .map((r) => `• **${r.name}** — ${r.price.toLocaleString("fa-IR")} ت`)
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
      const rows = await prisma.order.findMany({
        where: q
          ? {
              OR: [{ customerName: { contains: q } }, { customerPhone: { contains: q } }],
            }
          : undefined,
        orderBy: { createdAt: "desc" },
        take: 12,
      });
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
        where: q
          ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }] }
          : undefined,
        orderBy: { createdAt: "desc" },
        take: 12,
      });
      return pack(
        rows
          .map((r) => `• **${r.name}** (${r.phone}) — ${r.status} — \`${r.id.slice(0, 8)}\``)
          .join("\n") || "خالی",
        [{ type: "link_buttons", items: adminLink("request") }]
      );
    }
    default:
      return pack(`لیست ${labelEntity(entity)} از پنل قابل مشاهده است.`, [
        { type: "link_buttons", items: adminLink(entity) },
      ]);
  }
}

async function deleteEntity(entity: EntityKind, id: string) {
  switch (entity) {
    case "model":
      return prisma.curtainModel.delete({ where: { id } });
    case "category":
      return prisma.curtainCategory.delete({ where: { id } });
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
    case "window":
      return prisma.virtualWindowSetting.delete({ where: { id } });
    default:
      throw new Error("حذف پشتیبانی نشده");
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
      const categorySlug = f.category || "roman";
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
          visible: true,
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
          order: f.order ? Number(f.order) : 99,
        },
      });
      return { id: row.id, label: row.name };
    }
    default:
      throw new Error("ایجاد پشتیبانی نشده یا فیلد ناقص");
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
      const row = await prisma.curtainModel.update({ where: { id }, data });
      return { id: row.id, label: row.name || row.code };
    }
    case "category": {
      const data: Record<string, unknown> = {};
      if (f.name) data.name = f.name;
      if (f.slug) data.slug = f.slug;
      if (f.description) data.description = f.description;
      if (f.image) data.image = f.image;
      if (f.order) data.order = Number(f.order);
      if (f.mechanism) data.mechanism = f.mechanism;
      const row = await prisma.curtainCategory.update({ where: { id }, data });
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
      if (Object.keys(data).length === 0) throw new Error("وضعیت یا یادداشت بده");
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
