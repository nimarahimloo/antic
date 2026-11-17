import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { sendError } from "../lib/errors.js";

const router = Router();

const SYNONYMS: Record<string, string[]> = {
  آشپزخانه: ["آشپزخانه", "آشپز", "kitchen", "کابینت", "اوپن"],
  پذیرایی: ["پذیرایی", "نشیمن", "سالن", "living", "هال"],
  اتاق: ["اتاق", "خواب", "bedroom", "مستر"],
  اداری: ["اداری", "دفتر", "office", "شرکت"],
  زبرا: ["زبرا", "zebra"],
  شید: ["شید", "shade"],
  رومن: ["رومن", "roman"],
  پلیسه: ["پلیسه", "pleated", "pleat"],
  مخمل: ["مخمل", "velvet"],
  حریر: ["حریر", "توری", "sheer", "voile"],
  نمونه: ["نمونه", "پروژه", "اجرا", "portfolio", "project"],
  پروژه: ["پروژه", "نمونه", "اجرا", "project"],
  کاتالوگ: ["کاتالوگ", "catalog"],
  فروشگاه: ["فروشگاه", "shop", "محصول"],
  اکسسوری: ["اکسسوری", "accessory"],
};

const STOP = new Set([
  "از", "به", "در", "با", "برای", "که", "و", "یا", "را", "یک", "های", "ها", "شده",
  "the", "a", "of", "for", "and", "or",
]);

function normalize(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ");
}

function coreTokens(q: string): string[] {
  const n = normalize(q);
  if (!n) return [];
  return n.split(/[\s،,.\-/|_]+/).filter((t) => t.length >= 2 && !STOP.has(t));
}

function variantsOf(token: string): string[] {
  const t = normalize(token);
  const out = new Set<string>([t]);
  for (const [key, list] of Object.entries(SYNONYMS)) {
    if (t === key || list.some((s) => normalize(s) === t) || t.includes(key) || key.includes(t)) {
      out.add(key);
      list.forEach((s) => out.add(normalize(s)));
    }
  }
  return [...out];
}

function textHasToken(hay: string, token: string): boolean {
  const h = normalize(hay);
  return variantsOf(token).some((v) => v.length >= 2 && h.includes(v));
}

function matchesAll(hay: string, tokens: string[]): boolean {
  if (!tokens.length) return false;
  return tokens.every((t) => textHasToken(hay, t));
}

function scoreMatch(hay: string, tokens: string[], fullQ: string): number {
  const h = normalize(hay);
  if (!matchesAll(hay, tokens)) return 0;
  let score = 20 * tokens.length;
  const nq = normalize(fullQ);
  if (nq && h.includes(nq)) score += 40;
  for (const t of tokens) {
    if (h.includes(normalize(t))) score += 15;
  }
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

function buildOr(fields: string[], terms: string[]) {
  const clauses: Record<string, unknown>[] = [];
  for (const term of terms) {
    if (!term || term.length < 2) continue;
    for (const f of fields) {
      clauses.push({ [f]: { contains: term } });
    }
  }
  return clauses.slice(0, 100);
}

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || req.query.search || "").trim();
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 24));
    if (q.length < 1) {
      return res.json({ q, results: [], total: 0 });
    }

    const tokens = coreTokens(q);
    const effective = tokens.length ? tokens : [normalize(q)].filter((t) => t.length >= 1);
    const terms = Array.from(new Set(effective.flatMap((t) => variantsOf(t)))).filter(
      (t) => t.length >= 2
    );

    const [projects, models, categories, products, shopCats] = await Promise.all([
      prisma.project.findMany({
        where: { OR: buildOr(["title", "description", "categorySlug", "subcategory"], terms) },
        take: 80,
        orderBy: { updatedAt: "desc" },
      }).catch(() => []),
      prisma.curtainModel.findMany({
        where: {
          OR: buildOr(
            ["name", "code", "description", "categorySlug", "subcategory", "color", "fabric", "material", "texture"],
            terms
          ),
        },
        take: 80,
        orderBy: { updatedAt: "desc" },
      }).catch(() => []),
      prisma.curtainCategory.findMany({
        where: { OR: buildOr(["name", "slug", "description", "mechanism"], terms) },
        take: 40,
        orderBy: { order: "asc" },
      }).catch(() => []),
      prisma.product.findMany({
        where: { OR: buildOr(["name", "slug", "description"], terms) },
        take: 40,
        orderBy: { sortOrder: "asc" },
      }).catch(() => []),
      prisma.shopCategory.findMany({
        where: { OR: buildOr(["name", "slug", "description"], terms) },
        take: 20,
        orderBy: { order: "asc" },
      }).catch(() => []),
    ]);

    const hits: Hit[] = [];

    for (const p of projects) {
      const bag = [p.title, p.description, p.categorySlug, p.subcategory].join(" ");
      const score = scoreMatch(bag, effective, q);
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
      const bag = [m.name, m.code, m.description, m.categorySlug, m.subcategory, m.color, m.fabric, m.material, m.texture].join(" ");
      const score = scoreMatch(bag, effective, q);
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
      const score = scoreMatch(bag, effective, q);
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
        score: score - 5,
      });
    }

    for (const p of products) {
      const bag = [p.name, p.slug, p.description].join(" ");
      const score = scoreMatch(bag, effective, q);
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
      const score = scoreMatch(bag, effective, q);
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

    const pages: { title: string; bag: string; href: string; id: string }[] = [
      { id: "page-projects", title: "نمونه‌های اجرا شده", bag: "نمونه اجرا پروژه نصب portfolio", href: "/projects" },
      { id: "page-catalog", title: "کاتالوگ پرده", bag: "کاتالوگ مدل پرده catalog", href: "/catalog" },
      { id: "page-shop", title: "فروشگاه", bag: "فروشگاه اکسسوری محصول shop", href: "/shop" },
      { id: "page-contact", title: "تماس و مشاوره", bag: "تماس مشاوره سفارش تلفن", href: "/contact" },
      { id: "page-about", title: "درباره ما", bag: "درباره ما شرکت", href: "/about" },
    ];
    for (const pg of pages) {
      const score = scoreMatch(pg.bag + " " + pg.title, effective, q);
      if (score <= 0) continue;
      hits.push({ type: "page", id: pg.id, title: pg.title, subtitle: "صفحه", href: pg.href, score });
    }

    hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "fa"));
    const results = hits.slice(0, limit).map(({ score, ...rest }) => rest);

    res.json({ q, tokens: effective, total: hits.length, results });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
