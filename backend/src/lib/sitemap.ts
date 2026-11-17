import { prisma } from "./prisma.js";

/** Canonical base URL for absolute sitemap loc entries. */
export const SITEMAP_BASE = (process.env.PUBLIC_BASE_URL || "https://pardehantic.ir").replace(
  /\/$/,
  ""
);

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build an absolute, XML-safe <loc> for a path. Non-ASCII paths are percent-encoded. */
function loc(path: string): string {
  return xmlEscape(`${SITEMAP_BASE}${encodeURI(path)}`);
}

function lastmod(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString();
}

function urlEntry(path: string, date?: Date | null): string {
  const lm = lastmod(date) ? `<lastmod>${lastmod(date)}</lastmod>` : "";
  return `<url><loc>${loc(path)}</loc>${lm}<changefreq>weekly</changefreq><priority>0.5</priority></url>`;
}

/** Public site root pages. */
const STATIC_PAGES = [
  "/",
  "/shop",
  "/catalog",
  "/about",
  "/contact",
  "/connect",
  "/projects",
];

function parseSubsArray(raw: unknown): Array<{ name: string; slug: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      if (typeof s === "string") return { name: s, slug: s };
      if (s && typeof s === "object") {
        return {
          name: String((s as { name?: unknown; slug?: unknown }).name || ""),
          slug: String((s as { name?: unknown; slug?: unknown }).slug || ""),
        };
      }
      return null;
    })
    .filter(
      (s): s is { name: string; slug: string } => Boolean(s && s.slug)
    );
}

/** Portfolio categories store subcategories as JSON array or a comma-separated string. */
function parseSubs(raw: string | null | undefined): Array<{ name: string; slug: string }> {
  if (!raw) return [];
  if (typeof raw !== "string") return [];
  try {
    return parseSubsArray(JSON.parse(raw));
  } catch {
    return raw
      .split(/[,،]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, slug] = part.split(":").map((x) => x.trim());
        return { name: name || slug, slug: slug || name };
      })
      .filter((s) => s.slug);
  }
}

/**
 * Build the sitemap XML dynamically from the database so it always reflects
 * published/removed content (no stale static file).
 */
export async function buildSitemap(): Promise<string> {
  const entries: string[] = [];

  for (const page of STATIC_PAGES) {
    entries.push(urlEntry(page));
  }

  // Shop accessory products — public detail pages
  const products = await prisma.product.findMany({
    where: { visible: true },
    select: { slug: true, updatedAt: true },
  });
  for (const p of products) {
    if (p.slug) entries.push(urlEntry(`/product/${p.slug}`, p.updatedAt));
  }

  // Curtain models — public detail pages
  const models = await prisma.curtainModel.findMany({
    select: { id: true, updatedAt: true },
  });
  for (const m of models) {
    entries.push(urlEntry(`/curtain/${m.id}`, m.updatedAt));
  }

  // Portfolio categories, subcategories, projects
  const categories = await prisma.portfolioCategory.findMany({
    select: { slug: true, subcategories: true, updatedAt: true },
  });
  for (const c of categories) {
    if (c.slug) {
      entries.push(urlEntry(`/projects/category/${c.slug}`, c.updatedAt));
      for (const sub of parseSubs(c.subcategories)) {
        entries.push(
          urlEntry(`/projects/category/${c.slug}/${encodeURI(sub.slug)}`)
        );
      }
    }
  }

  const projects = await prisma.project.findMany({
    select: { id: true, updatedAt: true },
  });
  for (const p of projects) {
    entries.push(urlEntry(`/projects/${p.id}`, p.updatedAt));
  }

  const body = entries.join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
