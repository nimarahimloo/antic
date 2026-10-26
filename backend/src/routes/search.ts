import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { sendError } from "../lib/errors.js";

const router = Router();

/** گسترش هوشمند واژه‌های فارسی/انگلیسی برای جستجوی مفهومی */
const SYNONYMS: Record<string, string[]> = {
  آشپزخانه: ["آشپزخانه", "آشپز", "kitchen", "کابینت", "اوپن"],
  پذیرایی: ["پذیرایی", "نشیمن", "سالن", "living", "هال"],
  اتاق: ["اتاق", "خواب", "bedroom", "مستر"],
  اداری: ["اداری", "دفتر", "office", "شرکت"],
  نمونه: ["نمونه", "پروژه", "اجرا", "نصب", "project", "portfolio"],
  پروژه: ["پروژه", "نمونه", "اجرا", "نصب", "project"],
  اجرا: ["اجرا", "نمونه", "پروژه", "نصب", "install"],
  کاتالوگ: ["کاتالوگ", "مدل", "پارچه", "catalog", "curtain"],
  مدل: ["مدل", "کاتالوگ", "پارچه", "curtain", "code"],
  پرده: ["پرده", "curtain", "مدل", "کاتالوگ"],
  فروشگاه: ["فروشگاه", "محصول", "اکسسوری", "shop", "product"],
  اکسسوری: ["اکسسوری", "فروشگاه", "محصول", "accessory"],
  شید: ["شید", "shade", "roller"],
  زبرا: ["زبرا", "zebra"],
  رومن: ["رومن", "roman"],
  پلیسه: ["پلیسه", "pleated", "pleat"],
  مخمل: ["مخمل", "velvet"],
  حریر: ["حریر", "توری", "sheer", "voile"],
};

function normalize(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ");
}

function tokenize(q: string): string[] {
  const n = normalize(q);
  if (!n) return [];
  const stop = new Set([
    "از",
    "به",
    "در",
    "با",
    "برای",
    "که",
    "و",
    "یا",
    "را",
    "یک",
    "های",
    "ها",
    "شده",
    "the",
    "a",
    "of",
    "for",
  ]);
  const raw = n.split(/[\s،,.\-/|]+/).filter(Boolean);
  const meaningful = raw.filter((t) => t.length > 1 && !stop.has(t));
  return meaningful.length ? meaningful : raw.filter((t) => t.length > 1);
}

function expandTokens(tokens: string[]): string[] {
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(t);
    for (const [key, list] of Object.entries(SYNONYMS)) {
      if (t.includes(key) || key.includes(t) || list.some((s) => s.includes(t) || t.includes(s))) {
        list.forEach((s) => out.add(normalize(s)));
        out.add(key);
      }
    }
  }
  return [...out].filter(Boolean).slice(0, 24);
}

function scoreText(hay: string, tokens: string[], expanded: string[]): number {
  const h = normalize(hay);
  if (!h) return 0;
  let score = 0;
  for (const t of tokens) {
    if (h.includes(t)) score += 12;
    else if (expanded.some((e) => e !== t && h.includes(e))) score += 6;
  }
  const joined = tokens.join(" ");
  if (joined && h.includes(joined)) score += 20;
  return score;
}

type Hit = {
  type: "project" | "model" | "category" | "product" | "page";
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  href: string;
  score: number;
};

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || req.query.search || "").trim();
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 16));
    if (q.length < 1) {
      return res.json({ q, results: [], total: 0 });
    }

    const tokens = tokenize(q);
    const expanded = expandTokens(tokens);
    const orContains = (fields: string[]) => {
      const clauses: Record<string, unknown>[] = [];
      for (const term of expanded.slice(0, 12)) {
        for (const f of fields) {
          clauses.push({ [f]: { contains: term } });
        }
      }
      return clauses.length ? clauses : [{ id: "__none__" }];
    };

    const [projects, models, categories, products, shopCats] = await Promise.all([
      prisma.project.findMany({
        where: { OR: orContains(["title", "description", "categorySlug", "subcategory"]) },
        take: 40,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.curtainModel.findMany({
        where: {
          OR: orContains([
            "name",
            "code",
            "description",
            "categorySlug",
            "subcategory",
            "color",
            "fabric",
            "material",
          ]),
        },
        take: 40,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.curtainCategory.findMany({
        where: { OR: orContains(["name", "slug", "description", "mechanism"]) },
        take: 20,
        orderBy: { order: "asc" },
      }),
      prisma.product.findMany({
        where: {
          visible: true,
          OR: orContains(["name", "slug", "description"]),
        },
        take: 20,
        orderBy: { sortOrder: "asc" },
      }),
      prisma.shopCategory.findMany({
        where: { visible: true, OR: orContains(["name", "slug", "description"]) },
        take: 10,
        orderBy: { order: "asc" },
      }),
    ]);

    const hits: Hit[] = [];

    const projectIntent = /نمونه|پروژه|اجرا|نصب|portfolio|project/i.test(q);
    const catalogIntent = /کاتالوگ|مدل|پارچه|curtain|catalog/i.test(q);
    const shopIntent = /فروشگاه|محصول|اکسسوری|shop|product/i.test(q);

    for (const p of projects) {
      const bag = [p.title, p.description, p.categorySlug, p.subcategory].join(" ");
      let score = scoreText(bag, tokens, expanded);
      if (projectIntent) score += 15;
      if (score <= 0) continue;
      hits.push({
        type: "project",
        id: p.id,
        title: p.title,
        subtitle: p.categorySlug ? `نمونه اجرا · ${p.categorySlug}` : "نمونه اجرا",
        image: p.coverImage,
        href: `/projects/${p.id}`,
        score,
      });
    }

    for (const m of models) {
      const bag = [m.name, m.code, m.description, m.categorySlug, m.subcategory, m.color, m.fabric].join(
        " "
      );
      let score = scoreText(bag, tokens, expanded);
      if (catalogIntent) score += 12;
      if (score <= 0) continue;
      hits.push({
        type: "model",
        id: m.id,
        title: m.name || m.code,
        subtitle: [m.code, m.color, m.categorySlug].filter(Boolean).join(" · ") || "مدل کاتالوگ",
        image: m.installImage || m.image,
        href: `/curtain/${m.id}`,
        score,
      });
    }

    for (const c of categories) {
      const bag = [c.name, c.slug, c.description, c.mechanism].join(" ");
      let score = scoreText(bag, tokens, expanded);
      if (catalogIntent) score += 10;
      if (score <= 0) continue;
      hits.push({
        type: "category",
        id: c.id,
        title: c.name,
        subtitle: "دسته کاتالوگ",
        image: c.image,
        href: `/catalog?category=${encodeURIComponent(c.slug)}`,
        score,
      });
      hits.push({
        type: "category",
        id: c.id + "-projects",
        title: `نمونه‌های ${c.name}`,
        subtitle: "نمونه‌های اجرا",
        image: c.image,
        href: `/projects/category/${encodeURIComponent(c.slug)}`,
        score: score + (projectIntent ? 8 : 2),
      });
    }

    for (const p of products) {
      const bag = [p.name, p.slug, p.description].join(" ");
      let score = scoreText(bag, tokens, expanded);
      if (shopIntent) score += 12;
      if (score <= 0) continue;
      hits.push({
        type: "product",
        id: p.id,
        title: p.name,
        subtitle: "فروشگاه",
        image: p.image,
        href: `/product/${encodeURIComponent(p.slug)}`,
        score,
      });
    }

    for (const c of shopCats) {
      const bag = [c.name, c.slug, c.description].join(" ");
      let score = scoreText(bag, tokens, expanded);
      if (shopIntent) score += 8;
      if (score <= 0) continue;
      hits.push({
        type: "product",
        id: c.id,
        title: c.name,
        subtitle: "دسته فروشگاه",
        image: c.image,
        href: `/shop?category=${encodeURIComponent(c.slug)}`,
        score,
      });
    }

    const pages: Hit[] = [
      {
        type: "page",
        id: "page-projects",
        title: "نمونه‌های اجرا شده",
        subtitle: "صفحه",
        href: "/projects",
        score: projectIntent ? 18 : scoreText("نمونه اجرا پروژه", tokens, expanded),
      },
      {
        type: "page",
        id: "page-catalog",
        title: "کاتالوگ پرده",
        subtitle: "صفحه",
        href: "/catalog",
        score: catalogIntent ? 18 : scoreText("کاتالوگ مدل پرده", tokens, expanded),
      },
      {
        type: "page",
        id: "page-shop",
        title: "فروشگاه",
        subtitle: "صفحه",
        href: "/shop",
        score: shopIntent ? 18 : scoreText("فروشگاه اکسسوری", tokens, expanded),
      },
      {
        type: "page",
        id: "page-contact",
        title: "تماس و مشاوره",
        subtitle: "صفحه",
        href: "/contact",
        score: scoreText("تماس مشاوره سفارش", tokens, expanded),
      },
    ];
    for (const pg of pages) {
      if (pg.score > 0) hits.push(pg);
    }

    hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "fa"));
    const results = hits.slice(0, limit).map(({ score, ...rest }) => rest);

    res.json({
      q,
      tokens,
      total: hits.length,
      results,
    });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
