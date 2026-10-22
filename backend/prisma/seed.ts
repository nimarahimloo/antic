import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
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
    console.log(`Admin already exists: ${email}`);
  }

  const catCount = await prisma.curtainCategory.count();
  if (catCount === 0) {
    await prisma.curtainCategory.createMany({
      data: [
        {
          name: "رومن",
          slug: "roman",
          order: 1,
          subcategories: JSON.stringify([
            { name: "ساده", slug: "plain" },
            { name: "طرح‌دار", slug: "patterned" },
          ]),
        },
        {
          name: "شید",
          slug: "shade",
          order: 2,
          subcategories: JSON.stringify([
            { name: "بلک‌اوت", slug: "blackout" },
            { name: "اسکرین", slug: "screen" },
          ]),
        },
        {
          name: "زبرا",
          slug: "zebra",
          order: 3,
          subcategories: JSON.stringify([{ name: "ساده", slug: "plain" }]),
        },
      ],
    });
    console.log("Sample curtain categories seeded");
  }

  const shopCatCount = await prisma.shopCategory.count();
  let ringCatId: string | undefined;
  if (shopCatCount === 0) {
    const created = await prisma.shopCategory.createMany({
      data: [
        { name: "حلقه و میله", slug: "rings-rods", order: 1 },
        { name: "نیوار", slug: "tiebacks", order: 2 },
        { name: "فینیس", slug: "finials", order: 3 },
      ],
    });
    void created;
    const ring = await prisma.shopCategory.findUnique({ where: { slug: "rings-rods" } });
    ringCatId = ring?.id;
    console.log("Sample shop categories seeded");
  } else {
    const ring = await prisma.shopCategory.findFirst({ where: { slug: "rings-rods" } });
    ringCatId = ring?.id;
  }

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
          categoryId: ringCatId || null,
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
          categoryId: ringCatId || null,
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
    console.log("Sample products seeded");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
