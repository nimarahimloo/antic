/**
 * اعمال ایمن زیر‌دسته‌های پلیسه — بدون حذف دادهٔ موجود
 * اجرا: cd backend && npx tsx ../scripts/apply-pleated-categories.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLEATED_SUBS = [
  {
    name: "پلیسه دستی",
    slug: "pleated-manual",
    description:
      "برای فضاهای پر رفت‌وآمد مناسب است؛ هنگام باز و بسته کردن در یا پنجره مزاحم نیست و به‌صورت یک‌طرفه و دو طرفه قابل اجراست.",
  },
  {
    name: "پلیسه زنجیری",
    slug: "pleated-chain",
    description:
      "بیرون فریم نصب می‌شود؛ کل پنجره را پوشش می‌دهد و به‌صورت بالارو جمع می‌شود.",
  },
  {
    name: "پلیسه تاچ",
    slug: "pleated-touch",
    description:
      "به‌صورت لمسی به بالارو جمع می‌شود و بیرون فریم پنجره نصب می‌شود.",
  },
  {
    name: "پلیسه شب و روز",
    slug: "pleated-day-night",
    description:
      "ترکیب نوارهای مات و شفاف برای کنترل نور روز و شب؛ مناسب فضاهایی که هم نور و هم حریم می‌خواهند.",
  },
  {
    name: "توری پلیسه",
    slug: "pleated-sheer",
    description:
      "پلیسه با پارچه توری/شفاف؛ نور نرم می‌گذرد و حس سبک‌تری به فضا می‌دهد.",
  },
];

function empty(v: unknown) {
  return v == null || v === "";
}

function parseSubs(raw: string | null | undefined) {
  if (!raw) return [] as { name: string; slug: string; description?: string }[];
  try {
    const p = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p
      .map((x) =>
        typeof x === "string"
          ? { name: x, slug: x }
          : {
              name: String(x?.name || ""),
              slug: String(x?.slug || x?.name || ""),
              description: x?.description ? String(x.description) : undefined,
            }
      )
      .filter((x) => x.name);
  } catch {
    return [];
  }
}

async function upsert(
  slug: string,
  data: {
    name: string;
    order: number;
    description?: string | null;
    mechanism?: string | null;
    subcategories?: string | null;
    inCatalog?: boolean;
  }
) {
  const existing = await prisma.curtainCategory.findUnique({ where: { slug } });
  if (!existing) {
    await prisma.curtainCategory.create({
      data: {
        name: data.name,
        slug,
        order: data.order,
        description: data.description ?? null,
        mechanism: data.mechanism ?? null,
        subcategories: data.subcategories ?? "[]",
        inCatalog: data.inCatalog !== false,
      },
    });
    console.log("created", slug);
    return;
  }
  const patch: Record<string, unknown> = {};
  if (empty(existing.description) && data.description) patch.description = data.description;
  if (empty(existing.mechanism) && data.mechanism) patch.mechanism = data.mechanism;
  if (data.subcategories) {
    const prev = parseSubs(existing.subcategories);
    const next = parseSubs(data.subcategories);
    const map = new Map(prev.map((s) => [s.slug.toLowerCase(), s]));
    for (const s of next) {
      const k = s.slug.toLowerCase();
      const old = map.get(k);
      if (!old) map.set(k, s);
      else
        map.set(k, {
          name: old.name || s.name,
          slug: old.slug || s.slug,
          description: old.description || s.description,
        });
    }
    const merged = JSON.stringify([...map.values()]);
    if (merged !== existing.subcategories) patch.subcategories = merged;
  }
  if (Object.keys(patch).length) {
    await prisma.curtainCategory.update({ where: { slug }, data: patch });
    console.log("updated(empty fields)", slug, Object.keys(patch));
  } else {
    console.log("preserved", slug);
  }
}

async function main() {
  await upsert("pleated", {
    name: "پلیسه",
    order: 3,
    description:
      "پرده پلیسه با چین‌های منظم آکاردئونی؛ زیر‌انواع دستی، زنجیری، تاچ، شب‌وروز و توری.",
    mechanism: "pleated-manual",
    subcategories: JSON.stringify(PLEATED_SUBS),
    inCatalog: true,
  });

  for (let i = 0; i < PLEATED_SUBS.length; i++) {
    const s = PLEATED_SUBS[i];
    await upsert(s.slug, {
      name: s.name,
      order: 30 + i + 1,
      description: s.description,
      mechanism: "pleated",
      inCatalog: true,
    });
  }

  console.log("Done — no deletes.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
