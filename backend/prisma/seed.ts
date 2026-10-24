import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * دو دامنهٔ جدا:
 * - CurtainCategory / CurtainModel → کاتالوگ پرده (طراحی، فیلتر، رندر)
 * - ShopCategory / Product → فقط اکسسوری قابل خرید در /shop
 */

type CatDef = {
  name: string;
  slug: string;
  order: number;
  parentSlug?: string | null;
};

/** mechanism پیش‌فرض برای ریشه دسته‌های پرده (قابل ویرایش در ادمین) */
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

/** دسته‌های کاتالوگ پرده (CurtainCategory) — از taxonomy ووکامرس */
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
];

const CURTAIN_SUBS: CatDef[] = [
  { name: "شید بلک اوت", slug: "shade-blackout", order: 101, parentSlug: "shade" },
  { name: "شید اسکرین", slug: "shade-screen", order: 102, parentSlug: "shade" },
  { name: "دبل شید", slug: "double-shade", order: 103, parentSlug: "shade" },
  { name: "مینی شید", slug: "mini-shade", order: 104, parentSlug: "shade" },
  { name: "شید رومن", slug: "shade-roman", order: 201, parentSlug: "roman" },
  { name: "پلیسه دستی", slug: "pleated-manual", order: 301, parentSlug: "pleated" },
  { name: "پلیسه زنجیری", slug: "pleated-chain", order: 302, parentSlug: "pleated" },
  { name: "پلیسه تاچ", slug: "pleated-touch", order: 303, parentSlug: "pleated" },
  { name: "پلیسه شب و روز", slug: "pleated-day-night", order: 304, parentSlug: "pleated" },
  { name: "توری پلیسه", slug: "pleated-mesh", order: 305, parentSlug: "pleated" },
  { name: "کرکره چوبی", slug: "wooden-blind", order: 401, parentSlug: "roller" },
  { name: "کرکره فلزی / آلومینیومی", slug: "metal-blind", order: 402, parentSlug: "roller" },
  { name: "هازان چاپی", slug: "printed-hazan", order: 501, parentSlug: "printed" },
  { name: "زبرا چاپی", slug: "zebra-printed", order: 601, parentSlug: "zebra" },
];

/**
 * فقط اکسسوری برای ShopCategory
 * root: accessories — زیردسته‌ها با parentSlug
 */
const SHOP_ACCESSORY_CATS: CatDef[] = [
  { name: "اکسسوری پرده", slug: "accessories", order: 1 },
  { name: "ریسه چرمی", slug: "leather-cord", order: 2, parentSlug: "accessories" },
  { name: "فینیال / سرمیله", slug: "finial", order: 3, parentSlug: "accessories" },
  { name: "نوار حاشیه", slug: "border", order: 4, parentSlug: "accessories" },
  { name: "میخ‌سر / نگین", slug: "nailhead", order: 5, parentSlug: "accessories" },
  { name: "منگوله", slug: "tassel", order: 6, parentSlug: "accessories" },
  { name: "ریشه / فرینج", slug: "fringe", order: 7, parentSlug: "accessories" },
  { name: "بند نگهدارنده", slug: "tieback", order: 8, parentSlug: "accessories" },
];

const ACCESSORY_SLUGS = new Set(SHOP_ACCESSORY_CATS.map((c) => c.slug));

/** محصولات نمونه فروشگاه — فقط اکسسوری */
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
  {
    name: "میخ‌سر تزئینی",
    slug: "decorative-nailhead",
    categorySlug: "nailhead",
    price: 120000,
    description: "ست میخ‌سر تزئینی برای نصب و دکور",
  },
  {
    name: "حلقه فلزی طلایی",
    slug: "gold-metal-ring",
    categorySlug: "accessories",
    price: 95000,
    description: "حلقه فلزی طلایی برای ریل پرده",
  },
  {
    name: "میله پرده استیل",
    slug: "steel-curtain-rod",
    categorySlug: "accessories",
    price: 890000,
    description: "میله پرده استیل مات",
  },
  {
    name: "بند نگهدارنده مخمل",
    slug: "velvet-tieback",
    categorySlug: "tieback",
    price: 210000,
    description: "بند نگهدارنده مخملی با گیره فلزی",
  },
];

const SAMPLE_MODELS = [
  {
    code: "SH-001",
    name: "شید بلک‌اوت",
    categorySlug: "shade",
    subcategory: "shade-blackout",
    fabric: "بلک‌اوت",
    color: "ذغالی",
    colorCode: "#3B352C",
    material: "cotton",
    texture: "مات",
    description: "شید بلک‌اوت از کاتالوگ",
  },
  {
    code: "PL-001",
    name: "پلیسه دستی",
    categorySlug: "pleated",
    subcategory: "pleated-manual",
    fabric: "پلیسه",
    color: "سفید",
    colorCode: "#F0EDE5",
    material: "cotton",
    texture: "آکاردئون",
    description: "پلیسه دستی",
  },
  {
    code: "ZB-001",
    name: "پرده زبرا",
    categorySlug: "zebra",
    subcategory: "zebra-printed",
    fabric: "پلی‌استر",
    color: "نقره‌ای",
    colorCode: "#B8B8B8",
    material: "cotton",
    texture: "نوار",
    description: "زبرا / زبرا چاپی",
  },
  {
    code: "RM-001",
    name: "رومن",
    categorySlug: "roman",
    subcategory: "shade-roman",
    fabric: "کتان",
    color: "کرم",
    colorCode: "#E8DCC8",
    material: "cotton",
    texture: "صاف",
    description: "رومن کلاسیک",
  },
  {
    code: "TR-001",
    name: "تور",
    categorySlug: "sheer",
    subcategory: "",
    fabric: "تور",
    color: "سفید",
    colorCode: "#FAFAFA",
    material: "sheer",
    texture: "توری",
    description: "تور پرده",
  },
];

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
    console.log(`Admin created: ${email} / ${password}`);
  } else {
    console.log(`Admin exists: ${email}`);
  }
}

/** حذف دسته‌های غیر‌اکسسوری از فروشگاه + محصولات نمونه پرده‌ای که اشتباه seed شده بودند */
async function purgeNonAccessoryShopData() {
  const allShopCats = await prisma.shopCategory.findMany();
  const nonAccessory = allShopCats.filter((c) => !ACCESSORY_SLUGS.has(c.slug));
  const nonIds = nonAccessory.map((c) => c.id);

  if (nonIds.length) {
    await prisma.product.updateMany({
      where: { categoryId: { in: nonIds } },
      data: { categoryId: null },
    });
    await prisma.shopCategory.deleteMany({ where: { id: { in: nonIds } } });
    console.log(`Removed ${nonIds.length} non-accessory shop categories`);
  }

  // محصولات نمونه پرده‌ای قبلی در فروشگاه
  await prisma.product.deleteMany({
    where: {
      slug: {
        in: [
          "pleated-manual-curtain",
          "avin-sheer-braid",
          "jonas-sheer-turkey",
          "benis-sheer-turkey",
        ],
      },
    },
  });

  // اکسسوری نباید در CurtainCategory باشد
  await prisma.curtainCategory.deleteMany({
    where: { slug: { in: [...ACCESSORY_SLUGS] } },
  });
}

async function seedCurtainCategories() {
  for (const root of CURTAIN_ROOTS) {
    const children = CURTAIN_SUBS.filter((s) => s.parentSlug === root.slug);
    await prisma.curtainCategory.upsert({
      where: { slug: root.slug },
      create: {
        name: root.name,
        slug: root.slug,
        order: root.order,
        mechanism: SLUG_MECHANISM[root.slug] || null,
        subcategories: JSON.stringify(
          children.map((ch) => ({ name: ch.name, slug: ch.slug }))
        ),
      },
      update: {
        name: root.name,
        order: root.order,
        mechanism: SLUG_MECHANISM[root.slug] || null,
        subcategories: JSON.stringify(
          children.map((ch) => ({ name: ch.name, slug: ch.slug }))
        ),
      },
    });
  }
  console.log(`Curtain categories: ${CURTAIN_ROOTS.length} roots`);
}

async function seedShopAccessoryCategories() {
  // اول ریشه، بعد زیردسته‌ها
  const sorted = [...SHOP_ACCESSORY_CATS].sort((a, b) => {
    if (!a.parentSlug && b.parentSlug) return -1;
    if (a.parentSlug && !b.parentSlug) return 1;
    return a.order - b.order;
  });

  const slugToId = new Map<string, string>();

  for (const c of sorted) {
    const description = c.parentSlug ? `زیرمجموعه: اکسسوری` : "اکسسوری قابل خرید در فروشگاه";
    const row = await prisma.shopCategory.upsert({
      where: { slug: c.slug },
      create: {
        name: c.name,
        slug: c.slug,
        description,
        visible: true,
        order: c.order,
      },
      update: {
        name: c.name,
        description,
        order: c.order,
        visible: true,
      },
    });
    slugToId.set(c.slug, row.id);
  }

  console.log(`Shop categories (accessories only): ${sorted.length}`);
  return slugToId;
}

async function seedAccessoryProducts(slugToId: Map<string, string>) {
  let n = 0;
  for (const p of SAMPLE_ACCESSORY_PRODUCTS) {
    const categoryId = slugToId.get(p.categorySlug) || slugToId.get("accessories") || null;
    await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        currency: "IRR",
        categoryId,
        visible: true,
        inStock: true,
        stock: 50,
        sortOrder: ++n,
      },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        categoryId,
        visible: true,
      },
    });
  }
  console.log(`Shop accessory products: ${SAMPLE_ACCESSORY_PRODUCTS.length}`);
}

async function seedModels() {
  const count = await prisma.curtainModel.count();
  if (count > 0) {
    console.log(`Curtain models already present (${count}) — skip samples`);
    return;
  }
  for (const m of SAMPLE_MODELS) {
    await prisma.curtainModel.create({ data: m });
  }
  console.log(`Sample curtain models: ${SAMPLE_MODELS.length}`);
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
  }
}

async function main() {
  await seedAdmin();
  await purgeNonAccessoryShopData();
  await seedCurtainCategories();
  const slugToId = await seedShopAccessoryCategories();
  await seedAccessoryProducts(slugToId);
  await seedModels();
  await seedVirtualWindow();
  console.log("Seed complete — shop = accessories only; catalog = curtain categories.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
