#!/usr/bin/env node
/**
 * Import curtain catalog models from a WooCommerce product CSV export.
 *
 * Usage:
 *   cd backend && npx tsx scripts/import-curtains-csv.ts /path/to/woocommerce-curtains.csv
 *   # or place the file at backend/data/woocommerce-curtains.csv and:
 *   npm run db:import-curtains
 *
 * Maps:
 *   SKU                        → code
 *   Name                       → name
 *   Categories                 → categorySlug (+ subcategory)
 *   Attribute "طرح"|"نقش"     → fabric
 *   Attribute "رنگ"           → color
 *   Short/Long description     → description
 *
 * Existing rows (same code) are updated, never duplicated.
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const csvPath =
  process.argv[2] || path.join(path.resolve(), "data", "woocommerce-curtains.csv");

if (!fs.existsSync(csvPath)) {
  console.error(`CSV not found: ${csvPath}`);
  console.error("Pass the path as argv[2] or place the file in backend/data/.");
  process.exit(1);
}

/** Minimal RFC-4180 CSV parser (handles quotes, escaped quotes, embedded newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function stripHtml(html: string | null | undefined): string {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize Persian text: unify ZWNJ / spaces so names match the seed. */
function norm(s: string | null | undefined): string {
  return String(s || "")
    .replace(/\u200c/g, " ")
    .replace(/[\s_]+/g, " ")
    .trim()
    .toLowerCase();
}

interface ParsedCategories {
  categorySlug: string;
  subcategory: string | null;
}

/**
 * The CSV stores WooCommerce category *names* (Persian), not slugs, e.g.
 *   "پرده,پرده > پرده زبرا"
 *   "پرده,پرده > شید,پرده > شید > شید رومن"
 *
 * nameToSlug maps the CurtainCategory names to their slug. The first path
 * element that matches a known category becomes the category; the next one
 * (if any) becomes the subcategory.
 */
function parseCategories(raw: string | null | undefined, nameToSlug: Map<string, string>): ParsedCategories {
  const segments = String(raw || "")
    .split(",")
    .flatMap((group) => group.split(">"))
    .map(norm)
    .filter(Boolean);

  for (let i = 0; i < segments.length; i++) {
    const slug = nameToSlug.get(segments[i]);
    if (!slug) continue;
    const next = segments[i + 1];
    return {
      categorySlug: slug,
      subcategory: next ? originalSegment(raw, next) : null,
    };
  }
  return { categorySlug: "", subcategory: null };
}

/** Recover the human-readable form of a normalized segment. */
function originalSegment(raw: string | null | undefined, normalized: string): string | null {
  const all = String(raw || "")
    .split(",")
    .flatMap((group) => group.split(">"))
    .map((s) => s.trim())
    .filter(Boolean);
  const hit = all.find((s) => norm(s) === normalized);
  return hit || null;
}

function attrOf(
  cols: string[],
  headers: string[],
  names: string[],
): string | null {
  for (let i = 0; i < headers.length; i++) {
    const name = String(headers[i] || "").toLowerCase();
    if (names.some((n) => name.includes(n.toLowerCase()))) {
      const v = String(cols[i] || "").trim();
      if (v) return v;
    }
  }
  return null;
}

async function main() {
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  if (rows.length < 2) {
    console.log("CSV is empty.");
    return;
  }
  const headers = rows[0];

  const known = await prisma.curtainCategory.findMany({ select: { slug: true, name: true } });
  const nameToSlug = new Map<string, string>();
  for (const c of known) {
    nameToSlug.set(norm(c.name), c.slug);
    nameToSlug.set(norm(c.slug), c.slug);
  }
  if (nameToSlug.size === 0) {
    console.error("No CurtainCategory rows — run `npm run db:setup` first.");
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || cols.length < 2) continue;

    const code = String(cols[headers.indexOf("SKU")] || "").trim();
    const name = String(cols[headers.indexOf("Name")] || "").trim();
    if (!code || !name) {
      skipped++;
      continue;
    }
    const publishedIdx = headers.indexOf("Published");
    if (publishedIdx >= 0 && String(cols[publishedIdx] || "").trim() === "0") {
      skipped++;
      continue;
    }

    const { categorySlug, subcategory } = parseCategories(
      cols[headers.indexOf("Categories")],
      nameToSlug,
    );
    if (!categorySlug) {
      skipped++;
      continue;
    }

    const shortIdx = headers.indexOf("Short description");
    const descIdx = headers.indexOf("Description");
    const data = {
      code,
      name,
      categorySlug,
      subcategory,
      fabric: attrOf(cols, headers, ["طرح", "نقش", "fabric"]),
      color: attrOf(cols, headers, ["رنگ", "color"]),
      description:
        stripHtml(cols[shortIdx]) || stripHtml(cols[descIdx]) || null,
    };

    const existing = await prisma.curtainModel.findFirst({ where: { code } });
    if (existing) {
      await prisma.curtainModel.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.curtainModel.create({ data });
      created++;
    }
  }

  console.log(`Curtain models: created=${created} updated=${updated} skipped=${skipped}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
