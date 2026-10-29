/**
 * Seed ایمن — هرگز دادهٔ موجود ادمین را پاک یا بازنویسی نمی‌کند.
 * - بدون deleteMany روی محتوا
 * - فقط رکوردهای غایب ساخته می‌شوند
 * - update فقط فیلدهای خالی را پر می‌کند
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type CatDef = {
  name: string;
  slug: string;
  order: number;
  parentSlug?: string | null;
  description?: string;
  subs?: { name: string; slug: string }[];
};

const SLUG_MECHANISM: Record<string, string> = {
  shade: "shade",
  roman: "roman",
  pleated: "pleated-manual",
  "turk-panel": "panel",
  roller: "roller",
  cubism: "drape",
  printed: "drape",
  aurora: "wave",
  zebra: "zebra",
  silk: "drape",
  velvet: "drape",
  cotton: "drape",
  sheer: "drape",
  kitchen: "roman",
  office: "zebra",
};

/** فقط برای پر کردن دیتابیس خالی — مرجع بعدی همیشه جدول CurtainCategory است */
const CURTAIN_ROOTS: CatDef[] = [
  { name: "شید", slug: "shade", order: 1 },
  { name: "رومن", slug: "roman", order: 2 },
  { name: "پلیسه", slug: "pleated", order: 3 },
  { name: "ترک پنل", slug: "turk-panel", order: 4 },
  { name: "پرده کرکره‌ای", slug: "roller", order: 5 },
  { name: "پرده کوبیسم", slug: "cubism", order: 6 },
  { name: "پرده چاپی", slug: "printed", order: 7 },
  { name: "پرده اورسی", slug: "aurora", order: 8 },
  { name: "پرده زبرا", slug: "zebra", order: 9 },
  { name: "حریر", slug: "silk", order: 10 },
  { name: "مخمل", slug: "velvet", order: 11 },
  { name: "کتان", slug: "cotton", order: 12 },
  { name: "تور", slug: "sheer", order: 13 },
  { name: "پرده آشپزخانه", slug: "kitchen", order: 14 },
  { name: "پرده اداری", slug: "office", order: 15 },
  { name: "پذیرایی", slug: "living-room", order: 20, description: "نمونه‌های اجرا در فضای پذیرایی و نشیمن" },
  { name: "اتاق خواب", slug: "bedroom", order: 21, description: "پرده‌های اتاق خواب و فضای خصوصی" },
  { name: "هتل و اقامتگاه", slug: "hotel", order: 22, description: "پروژه‌های هتل، سوئیت و اقامتگاه" },
  { name: "ویلا و حیاط", slug: "villa", order: 23, description: "اجرا در ویلا و فضاهای باز" },
];

const SHOP_ACCESSORY_CATS = [
  { name: "اکسسوری", slug: "accessories", order: 0 },
  { name: "فینیال", slug: "finial", order: 1 },
  { name: "حاشیه", slug: "border", order: 2 },
  { name: "میخ‌سر", slug: "nailhead", order: 3 },
  { name: "منگوله", slug: "tassel", order: 4 },
  { name: "ریشه / فرینج", slug: "fringe", order: 5 },
  { name: "بند نگهدارنده", slug: "tieback", order: 6 },
];

const SAMPLE_ACCESSORY_PRODUCTS = [
  {
    name: "فینیال دکوراتیو طلایی",
    slug: "decorative-finial",
    categorySlug: "finial",
    price: 450000,
    description: "سرمیله دکوراتیو طلایی برای پرده کلاسیک",
  },
  {
    name: "نوار حاشیه مخمل",
    slug: "decorative-border",
    categorySlug: "border",
    price: 280000,
    description: "نوار حاشیه مخملی برای لبه‌دوزی پرده",
  },
];

function empty(v: unknown): boolean {
  return v == null || v === "";
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@antic.local";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        fullName: "مدیر سیستم",
        role: "admin",
      },
    });
    console.log(`Admin created: ${email}`);
  } else {
    console.log(`Admin exists: ${email} — unchanged`);
  }
}

async function seedCurtainCategories() {
  let created = 0;
  let skipped = 0;
  for (const root of CURTAIN_ROOTS) {
    const existing = await prisma.curtainCategory.findUnique({ where: { slug: root.slug } });
    if (existing) {
      const data: Record<string, unknown> = {};
      if (empty(existing.mechanism) && SLUG_MECHANISM[root.slug]) {
        data.mechanism = SLUG_MECHANISM[root.slug];
      }
      if (empty(existing.description) && root.description) {
        data.description = root.description;
      }
      if (Object.keys(data).length) {
        await prisma.curtainCategory.update({ where: { slug: root.slug }, data });
      }
      skipped++;
      continue;
    }
    await prisma.curtainCategory.create({
      data: {
        name: root.name,
        slug: root.slug,
        order: root.order,
        description: root.description || null,
        mechanism: SLUG_MECHANISM[root.slug] || null,
        subcategories: "[]",
        inCatalog: true,
      },
    });
    created++;
  }

  try {
    const old = await prisma.portfolioCategory.findMany();
    for (const p of old) {
      const exists = await prisma.curtainCategory.findUnique({ where: { slug: p.slug } });
      if (exists) continue;
      await prisma.curtainCategory.create({
        data: {
          name: p.name,
          slug: p.slug,
          order: p.order + 50,
          description: p.description,
          image: p.image,
          subcategories: p.subcategories || "[]",
          inCatalog: false,
        },
      });
      created++;
    }
  } catch {
    /* optional table */
  }

  console.log(`CurtainCategory: created=${created}, preserved=${skipped}`);
}

async function seedShopAccessoryCategories(): Promise<Map<string, string>> {
  const slugToId = new Map<string, string>();
  let created = 0;
  for (const c of SHOP_ACCESSORY_CATS) {
    const existing = await prisma.shopCategory.findUnique({ where: { slug: c.slug } });
    if (existing) {
      slugToId.set(c.slug, existing.id);
      continue;
    }
    const row = await prisma.shopCategory.create({
      data: {
        name: c.name,
        slug: c.slug,
        description: c.slug === "accessories" ? "اکسسوری قابل خرید در فروشگاه" : null,
        visible: true,
        order: c.order,
      },
    });
    slugToId.set(c.slug, row.id);
    created++;
  }
  const all = await prisma.shopCategory.findMany();
  for (const r of all) slugToId.set(r.slug, r.id);
  console.log(`ShopCategory: created=${created}, total=${all.length}`);
  return slugToId;
}

async function seedAccessoryProducts(slugToId: Map<string, string>) {
  let created = 0;
  for (const p of SAMPLE_ACCESSORY_PRODUCTS) {
    const exists = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (exists) continue;
    const categoryId = slugToId.get(p.categorySlug) || slugToId.get("accessories") || null;
    await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        currency: "IRR",
        categoryId,
        visible: true,
        inStock: true,
        stock: 50,
        sortOrder: created + 1,
      },
    });
    created++;
  }
  console.log(`Products: created=${created} (existing untouched)`);
}

async function seedModelsIfEmpty() {
  const count = await prisma.curtainModel.count();
  console.log(`Curtain models: ${count} (never auto-deleted)`);
}

async function seedVirtualWindow() {
  const n = await prisma.virtualWindowSetting.count();
  if (n === 0) {
    await prisma.virtualWindowSetting.create({
      data: {
        wallColor: "#75634f",
        frameColor: "#3b352c",
        railColor: "#C9A227",
      },
    });
    console.log("VirtualWindowSetting created once");
  }
}

async function main() {
  console.log("Safe seed — no deletes, no overwrite of existing content");
  await seedAdmin();
  await seedCurtainCategories();
  const slugToId = await seedShopAccessoryCategories();
  await seedAccessoryProducts(slugToId);
  await seedModelsIfEmpty();
  await seedVirtualWindow();
  console.log("Seed complete (data preserved).");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
