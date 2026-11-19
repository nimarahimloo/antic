#!/usr/bin/env node
/**
 * Import accessories (shop products) from a WooCommerce product CSV export.
 *
 * Usage:
 *   node scripts/import-accessories-csv.mjs /path/to/woocommerce-accessories.csv
 *   # or place the file at backend/data/woocommerce-accessories.csv and:
 *   npm run db:import-accessories
 *
 * Creates ShopCategory rows (one per leaf WooCommerce category) and Product
 * rows. Existing products (same slug) are updated, never duplicated.
 *
 * Prices in the export are Toman; the store keeps them as-is in `price`
 * with currency "IRR" (the checkout converts to Rial for Zarinpal).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const csvPath =
  process.argv[2] || path.join(__dirname, "../data/woocommerce-accessories.csv");

if (!fs.existsSync(csvPath)) {
  console.error(`CSV not found: ${csvPath}`);
  console.error("Pass the path as argv[2] or place the file in backend/data/.");
  process.exit(1);
}

/** Minimal RFC-4180 CSV parser. */
function parseCsv(text) {
  const rows = [];
  let row = [];
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
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, " ")
    .trim();
}

function norm(s) {
  return String(s || "")
    .replace(/\u200c/g, " ")
    .replace(/[\s_]+/g, " ")
    .trim()
    .toLowerCase();
}

/** Persian/ASCII slug that keeps the URL readable. */
function slugify(value, fallback) {
  const s = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\u200c]/g, "-")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return s || fallback;
}

/** Leaf category name of "اکسسوری,اکسسوری > ریل و میل پرده" → "ریل و میل پرده" */
function leafCategory(raw) {
  const segments = String(raw || "")
    .split(",")
    .flatMap((g) => g.split(">"))
    .map((s) => s.trim())
    .filter(Boolean);
  return segments.length ? segments[segments.length - 1] : "اکسسوری";
}

function parseNumber(raw) {
  const n = Number(String(raw || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  if (rows.length < 2) {
    console.log("CSV is empty.");
    return;
  }
  const headers = rows[0];
  const idx = {
    sku: headers.indexOf("SKU"),
    name: headers.indexOf("Name"),
    published: headers.indexOf("Published"),
    short: headers.indexOf("Short description"),
    desc: headers.indexOf("Description"),
    price: headers.indexOf("Regular price"),
    sale: headers.indexOf("Sale price"),
    cats: headers.indexOf("Categories"),
    stock: headers.indexOf("Stock"),
    inStock: headers.indexOf("In stock?"),
  };

  const catIds = new Map();
  let createdCats = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let order = 0;

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || cols.length < 2) continue;

    const name = String(cols[idx.name] || "").trim();
    if (!name) {
      skipped++;
      continue;
    }
    if (idx.published >= 0 && String(cols[idx.published] || "").trim() === "0") {
      skipped++;
      continue;
    }

    const catName = leafCategory(cols[idx.cats]);
    const catKey = norm(catName);
    let categoryId = catIds.get(catKey);
    if (!categoryId) {
      const slug = slugify(catName, `category-${order + 1}`);
      const existing = await prisma.shopCategory.findUnique({ where: { slug } });
      const row = existing
        ? await prisma.shopCategory.update({
            where: { id: existing.id },
            data: { name: catName, order: order },
          })
        : await prisma.shopCategory.create({
            data: { name: catName, slug, order: order++ },
          });
      if (!existing) createdCats++;
      categoryId = row.id;
      catIds.set(catKey, categoryId);
    }

    const sku = String(cols[idx.sku] || "").trim();
    const slug = slugify(sku || name, `product-${r}`);
    const price = parseNumber(cols[idx.price]);
    const sale = parseNumber(cols[idx.sale]);

    const data = {
      name,
      slug,
      description: stripHtml(cols[idx.short]) || stripHtml(cols[idx.desc]) || null,
      price: sale > 0 && sale < price ? sale : price,
      compareAtPrice: sale > 0 && sale < price ? price : null,
      currency: "IRR",
      categoryId,
      visible: true,
      inStock: idx.inStock >= 0 ? String(cols[idx.inStock] || "").trim() !== "0" : true,
      stock: parseNumber(cols[idx.stock]) || 100,
      sortOrder: r,
    };

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.product.create({ data });
      created++;
    }
  }

  console.log(
    `ShopCategory: created=${createdCats} | Products: created=${created} updated=${updated} skipped=${skipped}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
