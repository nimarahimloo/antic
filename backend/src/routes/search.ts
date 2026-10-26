import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { sendError } from "../lib/errors.js";

const router = Router();

/** مترادف‌ها فقط برای تقویت امتیاز؛ محدودکنندهٔ نتایج نیستند */
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

/** همهٔ توکن‌ها حفظ می‌شوند — هیچ کلمه‌ای حذف اجباری نمی‌شود */
function tokenize(q: string): string[] {
  const n = normalize(q);
  if (!n) return [];
  const raw = n.split(/[\s،,.\-/|_]+/).filter((t) => t.length > 0);
  const out = new Set<string>(raw);
  if (n.length >= 2) out.add(n);
  return [...out];
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
  return [...out].filter(Boolean).slice(0, 40);
}

function scoreText(hay: string, tokens: string[], expanded: string[], fullQ: string): number {
  const h = normalize(hay);
  if (!h) return 0;
  let score = 0;
  const nq = normalize(fullQ);
  if (nq && h.includes(nq)) score += 30;
  for (const t of tokens) {
    if (t.length < 1) continue;
    if (h.includes(t)) score += t.length >= 2 ? 12 : 4;
  }
  for (const e of expanded) {
    if (e.length < 2) continue;
    if (h.includes(e) && !tokens.includes(e)) score += 5;
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
    if (!term || term.length < 1) continue;
    for (const f of fields) {
      clauses.push({ [f]: { contains: term } });
    }
  }
  return clauses;
}

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || req.query.search || "").trim();
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 24));
    if (q.length < 1) {
      return res.json({ q, results: [], total: 0 });
    }

    const tokens = tokenize(q);
    const expanded = expandTokens(tokens);
    const terms = Array.from(new Set([normalize(q), ...tokens, ...expanded])).filter(
      (t) => t && t.length >= 1
    );

    const projectFields = ["title", "description", "categorySlug", "subcategory"];
    const modelFields = [
      "name",
      "code",
      "description",
      "categorySlug",
      "subcategory",
      "color",
      "fabric",
      "material",
      "texture",
    ];
    const catFields = ["name", "slug", "description", "mechanism"];
    const productFields = ["name", "slug", "description"];
    const shopCatFields = ["name", "slug", "description"];

    const orP = buildOr(projectFields, terms);
    const orM = buildOr(modelFields, terms);
    const orC = buildOr(catFields, terms);
    const orPr = buildOr(productFields, terms);
    const orSc = buildOr(shopCatFields, terms);

    const clip = (clauses: Record<string, unknown>[]) => clauses.slice(0, 80);

    const [projects, models, categories, products, shopCats] = await Promise.all([
      orP.length
        ? prisma.project.findMany({
            where: { OR: clip(orP) },
            take: 80,
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),
      orM.length
        ? prisma.curtainModel.findMany({
            where: { OR: clip(orM) },
            take: 80,
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),
      orC.length
        ? prisma.curtainCategory.findMany({
            where: { OR: clip(orC) },
            take: 40,
            orderBy: { order: "asc" },
          })
        : Promise.resolve([]),
      orPr.length
        ? prisma.product.findMany({
            where: { OR: clip(orPr) },
            take: 40,
            orderBy: { sortOrder: "asc" },
          })
        : Promise.resolve([]),
      orSc.length
        ? prisma.shopCategory.findMany({
            where: { OR: clip(orSc) },
            take: 20,
            orderBy: { order: "asc" },
          })
        : Promise.resolve([]),
    ]);

    let projectsF = projects;
    let modelsF = models;
    let categoriesF = categories;
    let productsF = products;
    let shopCatsF = shopCats;

    const totalDb =
      projects.length + models.length + categories.length + products.length + shopCats.length;

    if (totalDb === 0) {
      const [p2, m2, c2, pr2, sc2] = await Promise.all([
        prisma.project.findMany({ take: 100, orderBy: { updatedAt: "desc" } }),
        prisma.curtainModel.findMany({ take: 100, orderBy: { updatedAt: "desc" } }),
        prisma.curtainCategory.findMany({ take: 50, orderBy: { order: "asc" } }),
        prisma.product.findMany({ take: 50, orderBy: { sortOrder: "asc" } }),
        prisma.shopCategory.findMany({ take: 30, orderBy: { order: "asc" } }),
      ]);
      const matchAny = (bag: string) => {
        const h = normalize(bag);
        return terms.some((t) => t.length >= 1 && h.includes(t));
      };
      projectsF = p2.filter((p) =>
        matchAny([p.title, p.description, p.categorySlug, p.subcategory].join(" "))
      );
      modelsF = m2.filter((m) =>
        matchAny(
          [m.name, m.code, m.description, m.categorySlug, m.subcategory, m.color, m.fabric].join(" ")
        )
      );
      categoriesF = c2.filter((c) =>
        matchAny([c.name, c.slug, c.description, c.mechanism].join(" "))
      );
      productsF = pr2.filter((p) => matchAny([p.name, p.slug, p.description].join(" ")));
      shopCatsF = sc2.filter((c) => matchAny([c.name, c.slug, c.description].join(" ")));
    }

    const hits: Hit[] = [];
    const projectIntent = /نمونه|پروژه|اجرا|نصب|portfolio|project/i.test(q);
    const catalogIntent = /کاتالوگ|مدل|پارچه|curtain|catalog/i.test(q);
    const shopIntent = /فروشگاه|محصول|اکسسوری|shop|product/i.test(q);

    for (const p of projectsF) {
      const bag = [p.title, p.description, p.categorySlug, p.subcategory].join(" ");
      let score = scoreText(bag, tokens, expanded, q);
      if (projectIntent) score += 10;
      if (score <= 0 && !normalize(bag).includes(normalize(q))) continue;
      if (score <= 0) score = 1;
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

    for (const m of modelsF) {
      const bag = [m.name, m.code, m.description, m.categorySlug, m.subcategory, m.color, m.fabric, m.material, m.texture].join(" ");
      let score = scoreText(bag, tokens, expanded, q);
      if (catalogIntent) score += 8;
      if (score <= 0 && !normalize(bag).includes(normalize(q))) {
        if (!tokens.some((t) => normalize(bag).includes(t))) continue;
      }
      if (score <= 0) score = 1;
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

    for (const c of categoriesF) {
      const bag = [c.name, c.slug, c.description, c.mechanism].join(" ");
      let score = scoreText(bag, tokens, expanded, q);
      if (catalogIntent) score += 6;
      if (score <= 0 && !tokens.some((t) => normalize(bag).includes(t))) continue;
      if (score <= 0) score = 1;
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

    for (const p of productsF) {
      const bag = [p.name, p.slug, p.description].join(" ");
      let score = scoreText(bag, tokens, expanded, q);
      if (shopIntent) score += 8;
      if (score <= 0 && !tokens.some((t) => normalize(bag).includes(t))) continue;
      if (score <= 0) score = 1;
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

    for (const c of shopCatsF) {
      const bag = [c.name, c.slug, c.description].join(" ");
      let score = scoreText(bag, tokens, expanded, q);
      if (shopIntent) score += 6;
      if (score <= 0 && !tokens.some((t) => normalize(bag).includes(t))) continue;
      if (score <= 0) score = 1;
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
        score: projectIntent ? 20 : scoreText("نمونه اجرا پروژه نصب", tokens, expanded, q),
      },
      {
        type: "page",
        id: "page-catalog",
        title: "کاتالوگ پرده",
        subtitle: "صفحه",
        href: "/catalog",
        score: catalogIntent ? 20 : scoreText("کاتالوگ مدل پرده", tokens, expanded, q),
      },
      {
        type: "page",
        id: "page-shop",
        title: "فروشگاه",
        subtitle: "صفحه",
        href: "/shop",
        score: shopIntent ? 20 : scoreText("فروشگاه اکسسوری محصول", tokens, expanded, q),
      },
      {
        type: "page",
        id: "page-contact",
        title: "تماس و مشاوره",
        subtitle: "صفحه",
        href: "/contact",
        score: scoreText("تماس مشاوره سفارش تلفن", tokens, expanded, q),
      },
      {
        type: "page",
        id: "page-about",
        title: "درباره ما",
        subtitle: "صفحه",
        href: "/about",
        score: scoreText("درباره ما درباره شرکت", tokens, expanded, q),
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
