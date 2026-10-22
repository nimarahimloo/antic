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
        { name: "رومن", slug: "roman", order: 1, subcategories: JSON.stringify([{ name: "ساده", slug: "plain" }, { name: "طرح‌دار", slug: "patterned" }]) },
        { name: "شید", slug: "shade", order: 2, subcategories: JSON.stringify([{ name: "بلک‌اوت", slug: "blackout" }, { name: "اسکرین", slug: "screen" }]) },
        { name: "زبرا", slug: "zebra", order: 3, subcategories: JSON.stringify([{ name: "ساده", slug: "plain" }]) },
      ],
    });
    console.log("Sample categories seeded");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
