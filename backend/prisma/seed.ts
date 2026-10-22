import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** دسته‌های کامل کاتالوگ (هم‌تراز src/lib/catalogData.js) */
const CURTAIN_CATEGORIES = [
  {
    name: "رومن",
    slug: "roman",
    order: 1,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
      { name: "بلک‌اوت", slug: "blackout" },
    ],
  },
  {
    name: "شید",
    slug: "shade",
    order: 2,
    subcategories: [
      { name: "بلک‌اوت", slug: "blackout" },
      { name: "اسکرین", slug: "screen" },
      { name: "هارمونی", slug: "harmony" },
      { name: "ساده", slug: "plain" },
    ],
  },
  {
    name: "دبل شید",
    slug: "double-shade",
    order: 3,
    subcategories: [
      { name: "روز/شب", slug: "day-night" },
      { name: "دو لایه", slug: "double-layer" },
    ],
  },
  {
    name: "پلیسه",
    slug: "pleated",
    order: 4,
    subcategories: [
      { name: "دستی", slug: "manual" },
      { name: "زنجیری", slug: "chain" },
    ],
  },
  {
    name: "کرکره‌ای",
    slug: "roller",
    order: 5,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
    ],
  },
  {
    name: "زبرا",
    slug: "zebra",
    order: 6,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
    ],
  },
  {
    name: "چاپی",
    slug: "printed",
    order: 7,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
      { name: "دیجیتال", slug: "digital" },
    ],
  },
  {
    name: "اورسی",
    slug: "aurora",
    order: 8,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "دو لایه", slug: "double-layer" },
    ],
  },
  {
    name: "ترک پنل",
    slug: "turk-panel",
    order: 9,
    subcategories: [
      { name: "افقی", slug: "horizontal" },
      { name: "عمودی", slug: "vertical" },
    ],
  },
  {
    name: "کوبیسم",
    slug: "cubism",
    order: 10,
    subcategories: [
      { name: "هندسی", slug: "geometric" },
      { name: "انتزاعی", slug: "abstract" },
    ],
  },
  {
    name: "پرده استخری",
    slug: "outdoor",
    order: 11,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "کرکره‌ای", slug: "roller" },
    ],
  },
  {
    name: "پرده کنترلی",
    slug: "motorized",
    order: 12,
    subcategories: [
      { name: "موتوردار", slug: "motor" },
      { name: "هوشمند", slug: "smart" },
    ],
  },
  {
    name: "اکسسوری",
    slug: "accessories",
    order: 13,
    subcategories: [
      { name: "نیوار", slug: "tieback" },
      { name: "حلقه", slug: "ring" },
      { name: "چوب", slug: "rod" },
    ],
  },
  {
    name: "توری پلیسه",
    slug: "pleated-mesh",
    order: 14,
    subcategories: [
      { name: "ثابت", slug: "fixed" },
      { name: "متحرک", slug: "movable" },
    ],
  },
  {
    name: "تور",
    slug: "sheer",
    order: 15,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
    ],
  },
  {
    name: "حریر",
    slug: "silk",
    order: 16,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
    ],
  },
  {
    name: "مخمل",
    slug: "velvet",
    order: 17,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
    ],
  },
  {
    name: "کتان",
    slug: "cotton",
    order: 18,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
    ],
  },
];

/** نمونه مدل برای هر دسته اصلی — تا کاتالوگ خالی نباشد */
const SAMPLE_MODELS = [
  {
    code: "RM-101",
    name: "رومن کلاسیک کرم",
    categorySlug: "roman",
    subcategory: "plain",
    fabric: "کتان",
    color: "کرم",
    colorCode: "#E8DCC8",
    material: "cotton",
    texture: "صاف",
    description: "رومن ساده مناسب نشیمن؛ جمع‌شدن مرتب افقی.",
  },
  {
    code: "SH-201",
    name: "شید بلک‌اوت ذغالی",
    categorySlug: "shade",
    subcategory: "blackout",
    fabric: "بلک‌اوت",
    color: "ذغالی",
    colorCode: "#3B352C",
    material: "cotton",
    texture: "مات",
    description: "کنترل کامل نور برای اتاق خواب.",
  },
  {
    code: "ZB-301",
    name: "زبرا نقره‌ای",
    categorySlug: "zebra",
    subcategory: "plain",
    fabric: "پلی‌استر",
    color: "نقره‌ای",
    colorCode: "#B8B8B8",
    material: "cotton",
    texture: "نوار",
    description: "نوار پارچه و تور؛ تنظیم نور با زنجیر.",
  },
  {
    code: "PL-401",
    name: "پلیسه دستی سفید",
    categorySlug: "pleated",
    subcategory: "manual",
    fabric: "پلیسه",
    color: "سفید",
    colorCode: "#F0EDE5",
    material: "cotton",
    texture: "آکاردئون",
    description: "پلیسه دستی داخل فریم.",
  },
  {
    code: "DR-501",
    name: "پرده کلاسیک طلایی",
    categorySlug: "printed",
    subcategory: "plain",
    fabric: "مخمل",
    color: "طلایی",
    colorCode: "#C9A227",
    material: "velvet",
    texture: "پرزدار",
    description: "چین عمودی نرم روی میله؛ مناسب پذیرایی.",
  },
  {
    code: "WV-601",
    name: "اورسی موجی بژ",
    categorySlug: "aurora",
    subcategory: "plain",
    fabric: "کتان",
    color: "بژ",
    colorCode: "#D4C5A9",
    material: "cotton",
    texture: "موج",
    description: "موج S منظم اورسی.",
  },
  {
    code: "PN-701",
    name: "ترک پنل طوسی",
    categorySlug: "turk-panel",
    subcategory: "vertical",
    fabric: "اسکرین",
    color: "طوسی",
    colorCode: "#6B6B6B",
    material: "cotton",
    texture: "صاف",
    description: "پنل‌های صاف روی ریل سقفی.",
  },
  {
    code: "VL-801",
    name: "مخمل سبز زیتونی",
    categorySlug: "velvet",
    subcategory: "plain",
    fabric: "مخمل",
    color: "زیتونی",
    colorCode: "#6B7B5A",
    material: "velvet",
    texture: "پرزدار",
    description: "عمق رنگ مخمل برای فضای رسمی.",
  },
  {
    code: "SK-901",
    name: "حریر شیری",
    categorySlug: "silk",
    subcategory: "plain",
    fabric: "حریر",
    color: "شیری",
    colorCode: "#F8F5F0",
    material: "silk",
    texture: "براق",
    description: "لایه رویین شفاف و لوکس.",
  },
  {
    code: "SH-902",
    name: "تور سفید",
    categorySlug: "sheer",
    subcategory: "plain",
    fabric: "تور",
    color: "سفید",
    colorCode: "#FAFAFA",
    material: "sheer",
    texture: "توری",
    description: "لایه شفاف برای نرم کردن نور.",
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

async function seedCategories() {
  for (const c of CURTAIN_CATEGORIES) {
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
  console.log(`Curtain categories: ${CURTAIN_CATEGORIES.length}`);
}

async function seedModels() {
  const count = await prisma.curtainModel.count();
  if (count > 0) {
    console.log(`Curtain models already present (${count}) — skip sample models`);
    return;
  }
  for (const m of SAMPLE_MODELS) {
    await prisma.curtainModel.create({ data: m });
  }
  console.log(`Sample curtain models: ${SAMPLE_MODELS.length}`);
}

async function seedShop() {
  const shopCats = [
    { name: "حلقه و میله", slug: "rings-rods", order: 1 },
    { name: "نیوار", slug: "tiebacks", order: 2 },
    { name: "فینیس", slug: "finials", order: 3 },
  ];
  for (const c of shopCats) {
    await prisma.shopCategory.upsert({
      where: { slug: c.slug },
      create: c,
      update: { name: c.name, order: c.order },
    });
  }
  const ring = await prisma.shopCategory.findUnique({ where: { slug: "rings-rods" } });

  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.product.createMany({
      data: [
        {
          name: "حلقه فلزی طلایی",
          slug: "gold-metal-ring",
          description: "<p>حلقه پرده فلزی با پوشش طلایی — مناسب پرده‌های کلاسیک.</p>",
          price: 185000,
          compareAtPrice: 220000,
          currency: "IRR",
          categoryId: ring?.id || null,
          visible: true,
          inStock: true,
          stock: 50,
          ribbon: "پرفروش",
          sortOrder: 1,
        },
        {
          name: "میله پرده استیل",
          slug: "steel-curtain-rod",
          description: "<p>میله استیل ضدزنگ، قطر ۲.۵ سانتی‌متر، قابل برش.</p>",
          price: 890000,
          currency: "IRR",
          categoryId: ring?.id || null,
          visible: true,
          inStock: true,
          stock: 20,
          sortOrder: 2,
        },
        {
          name: "نیوار مخملی",
          slug: "velvet-tieback",
          description: "<p>نیوار مخمل با منگوله تزئینی.</p>",
          price: 320000,
          currency: "IRR",
          visible: true,
          inStock: true,
          stock: 30,
          sortOrder: 3,
        },
      ],
    });
    console.log("Sample shop products seeded");
  }

  await prisma.virtualWindowSetting.create({
    data: {
      wallColor: "#75634f",
      frameColor: "#3b352c",
      railColor: "#C9A227",
    },
  }).catch(() => {});
}

async function main() {
  await seedAdmin();
  await seedCategories();
  await seedModels();
  await seedShop();
  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
