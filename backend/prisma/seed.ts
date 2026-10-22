import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * دسته‌بندی واقعی فروشگاه از ووکامرس justelea_antic (product_cat)
 * parent=0 → دسته اصلی؛ بقیه زیرمجموعه
 */
type WooCat = {
  termId: number;
  name: string;
  slug: string;
  parentTermId: number;
  order: number;
};

const WOO_PRODUCT_CATS: WooCat[] = [
  // ── اصلی ──
  { termId: 64, name: "شید", slug: "shade", parentTermId: 0, order: 1 },
  { termId: 68, name: "رومن", slug: "roman", parentTermId: 0, order: 2 },
  { termId: 70, name: "پلیسه", slug: "pleated", parentTermId: 0, order: 3 },
  { termId: 76, name: "ترک پنل", slug: "turk-panel", parentTermId: 0, order: 4 },
  { termId: 77, name: "پرده کرکره‌ای", slug: "roller", parentTermId: 0, order: 5 },
  { termId: 81, name: "پرده کوبیسم", slug: "cubism", parentTermId: 0, order: 6 },
  { termId: 82, name: "پرده چاپی", slug: "printed", parentTermId: 0, order: 7 },
  { termId: 85, name: "پرده اورسی", slug: "aurora", parentTermId: 0, order: 8 },
  { termId: 86, name: "پرده زبرا", slug: "zebra", parentTermId: 0, order: 9 },
  { termId: 90, name: "حریر", slug: "silk", parentTermId: 0, order: 10 },
  { termId: 91, name: "مخمل", slug: "velvet", parentTermId: 0, order: 11 },
  { termId: 92, name: "کتان", slug: "cotton", parentTermId: 0, order: 12 },
  { termId: 93, name: "تور", slug: "sheer", parentTermId: 0, order: 13 },
  { termId: 95, name: "اکسسوری", slug: "accessories", parentTermId: 0, order: 14 },
  { termId: 2140, name: "پرده آشپزخانه", slug: "kitchen", parentTermId: 0, order: 15 },
  { termId: 2179, name: "پرده اداری", slug: "office", parentTermId: 0, order: 16 },

  // ── زیر شید (64) ──
  { termId: 65, name: "شید بلک اوت", slug: "shade-blackout", parentTermId: 64, order: 101 },
  { termId: 66, name: "شید اسکرین", slug: "shade-screen", parentTermId: 64, order: 102 },
  { termId: 67, name: "دبل شید", slug: "double-shade", parentTermId: 64, order: 103 },
  { termId: 80, name: "مینی شید", slug: "mini-shade", parentTermId: 64, order: 104 },

  // ── زیر رومن (68) ──
  { termId: 69, name: "شید رومن", slug: "shade-roman", parentTermId: 68, order: 201 },

  // ── زیر پلیسه (70) ──
  { termId: 71, name: "پلیسه دستی", slug: "pleated-manual", parentTermId: 70, order: 301 },
  { termId: 72, name: "پلیسه زنجیری", slug: "pleated-chain", parentTermId: 70, order: 302 },
  { termId: 73, name: "پلیسه تاچ", slug: "pleated-touch", parentTermId: 70, order: 303 },
  { termId: 74, name: "پلیسه شب و روز", slug: "pleated-day-night", parentTermId: 70, order: 304 },
  { termId: 75, name: "توری پلیسه", slug: "pleated-mesh", parentTermId: 70, order: 305 },

  // ── زیر کرکره‌ای (77) ──
  { termId: 78, name: "کرکره چوبی", slug: "wooden-blind", parentTermId: 77, order: 401 },
  { termId: 79, name: "کرکره فلزی / آلومینیومی", slug: "metal-blind", parentTermId: 77, order: 402 },

  // ── زیر چاپی (82) ──
  { termId: 84, name: "هازان چاپی", slug: "printed-hazan", parentTermId: 82, order: 501 },

  // ── زیر زبرا (86) ──
  { termId: 83, name: "زبرا چاپی", slug: "zebra-printed", parentTermId: 86, order: 601 },

  // ── زیر اکسسوری (95) ──
  { termId: 2141, name: "بند چرم", slug: "leather-cord", parentTermId: 95, order: 701 },
  { termId: 2142, name: "قپه", slug: "finial", parentTermId: 95, order: 702 },
  { termId: 2143, name: "بوردر", slug: "border", parentTermId: 95, order: 703 },
  { termId: 2144, name: "گل میخ", slug: "nailhead", parentTermId: 95, order: 704 },
  { termId: 2145, name: "منگوله", slug: "tassel", parentTermId: 95, order: 705 },
  { termId: 2149, name: "شرابه", slug: "fringe", parentTermId: 95, order: 706 },
  { termId: 2150, name: "کمر پرده", slug: "tieback", parentTermId: 95, order: 707 },
];

/** برای کاتالوگ پرده — فقط دسته‌های اصلی + زیردسته‌ها به‌صورت JSON */
function buildCurtainCategories() {
  const roots = WOO_PRODUCT_CATS.filter((c) => c.parentTermId === 0);
  return roots.map((root) => {
    const children = WOO_PRODUCT_CATS.filter((c) => c.parentTermId === root.termId);
    return {
      name: root.name,
      slug: root.slug,
      order: root.order,
      subcategories: children.map((ch) => ({ name: ch.name, slug: ch.slug })),
    };
  });
}

/** نمونه محصولات واقعی از ووکامرس (نمونه export) */
const SAMPLE_PRODUCTS = [
  {
    name: "پلیسه دستی پرده",
    slug: "pleated-manual-curtain",
    categorySlug: "pleated-manual",
    price: 0,
    description: "پلیسه دستی از کاتالوگ فروشگاه",
  },
  {
    name: "قپه پرده دکوراتیو (سرپرده تزئینی)",
    slug: "decorative-finial",
    categorySlug: "finial",
    price: 0,
    description: "قپه / سرپرده تزئینی",
  },
  {
    name: "بوردر پرده دکوراتیو (نوار تزئینی پرده)",
    slug: "decorative-border",
    categorySlug: "border",
    price: 0,
    description: "نوار تزئینی پرده",
  },
  {
    name: "گل میخ پرده دکوراتیو",
    slug: "decorative-nailhead",
    categorySlug: "nailhead",
    price: 0,
    description: "گل میخ دکوراتیو",
  },
  {
    name: "تور قیطان‌دوزی Avin – مناسب دکوراسیون کلاسیک و نئوکلاسیک",
    slug: "avin-sheer-braid",
    categorySlug: "sheer",
    price: 0,
    description: "تور قیطان‌دوزی Avin",
  },
  {
    name: "تور پرده Jonas ترک – عرض ۳ متر، پایین سرب‌دار و ضد دید",
    slug: "jonas-sheer-turkey",
    categorySlug: "sheer",
    price: 0,
    description: "تور Jonas ترک — عرض ۳ متر",
  },
  {
    name: "تور پرده Benis ترک (بریلنت) – عرض ۳ متر، ضد چروک و پایین سرب‌دار",
    slug: "benis-sheer-turkey",
    categorySlug: "sheer",
    price: 0,
    description: "تور Benis ترک (بریلنت)",
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
    description: "شید بلک‌اوت از کاتالوگ فروشگاه",
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

async function seedCurtainCategories() {
  const cats = buildCurtainCategories();
  for (const c of cats) {
    await prisma.curtainCategory.upsert({
      where: { slug: c.slug },
      create: {
        name: c.name,
        slug: c.slug,
        order: c.order,
        subcategories: JSON.stringify(c.subcategories),
      },
      update: {
        name: c.name,
        order: c.order,
        subcategories: JSON.stringify(c.subcategories),
      },
    });
  }
  console.log(`Curtain categories: ${cats.length} (from WooCommerce product_cat)`);
}

async function seedShopCategories() {
  // parents first
  const sorted = [...WOO_PRODUCT_CATS].sort((a, b) => {
    if (a.parentTermId === 0 && b.parentTermId !== 0) return -1;
    if (a.parentTermId !== 0 && b.parentTermId === 0) return 1;
    return a.order - b.order;
  });

  const termToId = new Map<number, string>();

  for (const c of sorted) {
    const parentName =
      c.parentTermId !== 0
        ? WOO_PRODUCT_CATS.find((x) => x.termId === c.parentTermId)?.name
        : null;
    const description = parentName ? `زیرمجموعه: ${parentName}` : null;

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
    termToId.set(c.termId, row.id);
  }
  console.log(`Shop categories: ${sorted.length}`);
  return termToId;
}

async function seedProducts(termToId: Map<number, string>) {
  const slugToCatId = new Map<string, string>();
  for (const c of WOO_PRODUCT_CATS) {
    const id = termToId.get(c.termId);
    if (id) slugToCatId.set(c.slug, id);
  }

  let n = 0;
  for (const p of SAMPLE_PRODUCTS) {
    const categoryId = slugToCatId.get(p.categorySlug) || null;
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
        categoryId,
        visible: true,
      },
    });
  }
  console.log(`Shop products (sample from Woo): ${SAMPLE_PRODUCTS.length}`);
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
  await seedCurtainCategories();
  const termToId = await seedShopCategories();
  await seedProducts(termToId);
  await seedModels();
  await seedVirtualWindow();
  console.log("Seed complete — WooCommerce categories loaded.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
