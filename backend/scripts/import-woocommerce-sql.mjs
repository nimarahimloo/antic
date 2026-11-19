#!/usr/bin/env node
/**
 * Import product categories + products from a WordPress/WooCommerce SQL dump
 * into Prisma (ShopCategory + Product).
 *
 * Usage:
 *   node scripts/import-woocommerce-sql.mjs /path/to/pardeha1_antic-new.sql
 *   # or place file at backend/data/woocommerce-dump.sql and:
 *   npm run db:import-woo
 *
 * Streams the file (supports 100MB+ dumps). Extracts:
 *   - product_cat hierarchy (parent/child) → ShopCategory
 *   - product posts + _price / _regular_price / _sale_price / _stock / _thumbnail_id
 *   - product↔category relationships
 */
import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const sqlPath =
  process.argv[2] ||
  path.join(__dirname, "../data/woocommerce-dump.sql") ||
  path.join(__dirname, "../data/pardeha1_antic-new.sql");

if (!fs.existsSync(sqlPath)) {
  console.error(`SQL file not found: ${sqlPath}`);
  console.error("Place the dump at backend/data/woocommerce-dump.sql or pass the path as argv.");
  process.exit(1);
}

function unescapeSqlString(s) {
  if (s == null) return "";
  return String(s)
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\\\/g, "\\")
    .replace(/\\0/g, "");
}

/** Parse a single VALUES row of mixed quoted/unquoted fields. */
function parseValuesRow(row) {
  const fields = [];
  let i = 0;
  const s = row.trim();
  while (i < s.length) {
    if (s[i] === "'" || s[i] === '"') {
      const q = s[i++];
      let val = "";
      while (i < s.length) {
        if (s[i] === "\\" && i + 1 < s.length) {
          val += s[i] + s[i + 1];
          i += 2;
          continue;
        }
        if (s[i] === q) {
          i++;
          break;
        }
        val += s[i++];
      }
      fields.push(unescapeSqlString(val));
      if (s[i] === ",") i++;
      continue;
    }
    // unquoted
    let val = "";
    while (i < s.length && s[i] !== ",") {
      val += s[i++];
    }
    val = val.trim();
    if (val.toUpperCase() === "NULL") fields.push(null);
    else fields.push(val);
    if (s[i] === ",") i++;
  }
  return fields;
}

/** Split INSERT ... VALUES (...),(...); into row strings */
function splitInsertRows(valuesChunk) {
  const rows = [];
  let depth = 0;
  let inStr = false;
  let strQ = "";
  let cur = "";
  for (let i = 0; i < valuesChunk.length; i++) {
    const c = valuesChunk[i];
    if (inStr) {
      cur += c;
      if (c === "\\" && i + 1 < valuesChunk.length) {
        cur += valuesChunk[++i];
        continue;
      }
      if (c === strQ) inStr = false;
      continue;
    }
    if (c === "'" || c === '"') {
      inStr = true;
      strQ = c;
      cur += c;
      continue;
    }
    if (c === "(") {
      if (depth === 0) {
        cur = "";
        depth = 1;
        continue;
      }
      depth++;
      cur += c;
      continue;
    }
    if (c === ")") {
      depth--;
      if (depth === 0) {
        rows.push(cur);
        cur = "";
        continue;
      }
      cur += c;
      continue;
    }
    if (depth > 0) cur += c;
  }
  return rows;
}

function slugify(name, fallback) {
  const s = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || fallback || "item";
}

async function streamParse(filePath) {
  const terms = new Map(); // term_id -> { name, slug }
  const taxonomies = new Map(); // term_taxonomy_id -> { term_id, taxonomy, parent, count }
  const products = new Map(); // post_id -> { title, slug, content, status }
  const postmeta = new Map(); // post_id -> { key: value }
  const relationships = []; // { object_id, term_taxonomy_id }

  let mode = null; // 'terms' | 'taxonomy' | 'posts' | 'postmeta' | 'relationships'
  let buffer = "";

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  function flushBuffer() {
    if (!buffer || !mode) {
      buffer = "";
      return;
    }
    const idx = buffer.toUpperCase().indexOf("VALUES");
    if (idx < 0) {
      buffer = "";
      return;
    }
    let chunk = buffer.slice(idx + 6).trim();
    if (chunk.endsWith(";")) chunk = chunk.slice(0, -1);
    const rows = splitInsertRows(chunk);
    for (const row of rows) {
      const f = parseValuesRow(row);
      try {
        if (mode === "terms" && f.length >= 3) {
          // term_id, name, slug, term_group?
          terms.set(String(f[0]), { name: f[1], slug: f[2] });
        } else if (mode === "taxonomy" && f.length >= 5) {
          // term_taxonomy_id, term_id, taxonomy, description, parent, count
          taxonomies.set(String(f[0]), {
            term_id: String(f[1]),
            taxonomy: f[2],
            parent: String(f[4] || "0"),
            count: parseInt(f[5] || "0", 10) || 0,
          });
        } else if (mode === "posts" && f.length >= 20) {
          // ID, author, date, date_gmt, content, title, excerpt, status, ..., post_name (index 11), ..., post_type (index 20)
          const id = String(f[0]);
          const content = f[4];
          const title = f[5];
          const status = f[7];
          const postName = f[11];
          const postType = f[20];
          if (postType === "product" && (status === "publish" || status === "private")) {
            products.set(id, {
              title: title || postName || id,
              slug: postName || slugify(title, id),
              content: content || "",
              status,
            });
          }
        } else if (mode === "postmeta" && f.length >= 4) {
          // meta_id, post_id, meta_key, meta_value
          const pid = String(f[1]);
          const key = f[2];
          const val = f[3];
          if (!postmeta.has(pid)) postmeta.set(pid, {});
          if (
            key === "_price" ||
            key === "_regular_price" ||
            key === "_sale_price" ||
            key === "_stock" ||
            key === "_stock_status" ||
            key === "_sku" ||
            key === "_thumbnail_id"
          ) {
            postmeta.get(pid)[key] = val;
          }
        } else if (mode === "relationships" && f.length >= 2) {
          relationships.push({
            object_id: String(f[0]),
            term_taxonomy_id: String(f[1]),
          });
        }
      } catch {
        /* skip bad row */
      }
    }
    buffer = "";
  }

  for await (const line of rl) {
    const upper = line.toUpperCase();
    if (upper.includes("INSERT INTO `WP_TERMS`") || upper.includes("INSERT INTO WP_TERMS")) {
      flushBuffer();
      mode = "terms";
      buffer = line;
      if (line.trim().endsWith(";")) flushBuffer();
      continue;
    }
    if (
      upper.includes("INSERT INTO `WP_TERM_TAXONOMY`") ||
      upper.includes("INSERT INTO WP_TERM_TAXONOMY")
    ) {
      flushBuffer();
      mode = "taxonomy";
      buffer = line;
      if (line.trim().endsWith(";")) flushBuffer();
      continue;
    }
    if (upper.includes("INSERT INTO `WP_POSTS`") || upper.includes("INSERT INTO WP_POSTS")) {
      flushBuffer();
      mode = "posts";
      buffer = line;
      if (line.trim().endsWith(";")) flushBuffer();
      continue;
    }
    if (upper.includes("INSERT INTO `WP_POSTMETA`") || upper.includes("INSERT INTO WP_POSTMETA")) {
      flushBuffer();
      mode = "postmeta";
      buffer = line;
      if (line.trim().endsWith(";")) flushBuffer();
      continue;
    }
    if (
      upper.includes("INSERT INTO `WP_TERM_RELATIONSHIPS`") ||
      upper.includes("INSERT INTO WP_TERM_RELATIONSHIPS")
    ) {
      flushBuffer();
      mode = "relationships";
      buffer = line;
      if (line.trim().endsWith(";")) flushBuffer();
      continue;
    }
    if (mode) {
      buffer += "\n" + line;
      if (line.trim().endsWith(";")) flushBuffer();
    }
  }
  flushBuffer();

  return { terms, taxonomies, products, postmeta, relationships };
}

async function importData(parsed) {
  const { terms, taxonomies, products, postmeta, relationships } = parsed;

  // product_cat only
  const productCats = [];
  for (const [ttId, tax] of taxonomies) {
    if (tax.taxonomy !== "product_cat") continue;
    const term = terms.get(tax.term_id);
    if (!term) continue;
    productCats.push({
      termTaxonomyId: ttId,
      termId: tax.term_id,
      parentTermId: tax.parent === "0" ? null : tax.parent,
      name: term.name,
      slug: term.slug || slugify(term.name, tax.term_id),
      count: tax.count,
    });
  }

  // sort parents first
  productCats.sort((a, b) => {
    if (!a.parentTermId && b.parentTermId) return -1;
    if (a.parentTermId && !b.parentTermId) return 1;
    return a.name.localeCompare(b.name, "fa");
  });

  console.log(`Found ${productCats.length} product categories`);
  console.log(`Found ${products.size} published products`);

  // Map term_id → ShopCategory id
  const termToShopCat = new Map();
  let order = 0;
  for (const cat of productCats) {
    order++;
    // encode hierarchy in description for subcats
    const parentName = cat.parentTermId
      ? terms.get(cat.parentTermId)?.name || null
      : null;
    const desc = parentName ? `زیرمجموعه: ${parentName}` : null;
    const slug = cat.slug.slice(0, 120);
    const row = await prisma.shopCategory.upsert({
      where: { slug },
      create: {
        name: cat.name,
        slug,
        description: desc,
        visible: true,
        order: order,
      },
      update: {
        name: cat.name,
        description: desc,
        order: order,
      },
    });
    termToShopCat.set(cat.termId, row.id);
    termToShopCat.set(`tt:${cat.termTaxonomyId}`, row.id);
  }
  console.log(`Upserted ${productCats.length} ShopCategory rows`);

  // product_id → preferred category (first product_cat)
  const productCatMap = new Map();
  for (const rel of relationships) {
    const tax = taxonomies.get(rel.term_taxonomy_id);
    if (!tax || tax.taxonomy !== "product_cat") continue;
    if (!products.has(rel.object_id)) continue;
    if (!productCatMap.has(rel.object_id)) {
      productCatMap.set(rel.object_id, tax.term_id);
    }
  }

  let created = 0;
  let updated = 0;
  let i = 0;
  for (const [pid, prod] of products) {
    i++;
    const meta = postmeta.get(pid) || {};
    const priceRaw = meta._price || meta._regular_price || "0";
    const saleRaw = meta._sale_price || null;
    const price = parseFloat(String(priceRaw).replace(/,/g, "")) || 0;
    const compareAt = saleRaw
      ? parseFloat(String(meta._regular_price || priceRaw).replace(/,/g, "")) || null
      : null;
    const stockStatus = meta._stock_status || "instock";
    const stockNum = meta._stock != null ? parseInt(meta._stock, 10) : 100;
    const sku = meta._sku || null;

    let slug = (prod.slug || slugify(prod.title, pid)).slice(0, 180);
    // ensure unique slug
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing && existing.id !== `woo-${pid}`) {
      slug = `${slug}-${pid}`.slice(0, 180);
    }

    const termId = productCatMap.get(pid);
    const categoryId = termId ? termToShopCat.get(termId) || null : null;

    const data = {
      name: prod.title.slice(0, 200),
      slug,
      description: prod.content ? prod.content.slice(0, 50000) : null,
      price,
      compareAtPrice: compareAt && compareAt > price ? compareAt : null,
      currency: "IRR",
      categoryId,
      visible: prod.status === "publish",
      inStock: stockStatus === "instock",
      stock: Number.isFinite(stockNum) ? stockNum : 100,
      ribbon: sku ? `SKU:${sku}` : null,
      sortOrder: i,
    };

    // Use stable id via slug match; create or update by slug
    const prev = await prisma.product.findUnique({ where: { slug } });
    if (prev) {
      await prisma.product.update({ where: { slug }, data });
      updated++;
    } else {
      await prisma.product.create({ data });
      created++;
    }

    if ((created + updated) % 50 === 0) {
      console.log(`  products progress: ${created + updated}/${products.size}`);
    }
  }

  console.log(`Products created=${created} updated=${updated}`);

  // Write a JSON snapshot for seed reuse
  const outDir = path.join(__dirname, "../data");
  fs.mkdirSync(outDir, { recursive: true });
  const snapshot = {
    categories: productCats.map((c) => ({
      name: c.name,
      slug: c.slug,
      parent: c.parentTermId ? terms.get(c.parentTermId)?.name || null : null,
      count: c.count,
    })),
    productCount: products.size,
  };
  fs.writeFileSync(
    path.join(outDir, "woo-shop-snapshot.json"),
    JSON.stringify(snapshot, null, 2),
    "utf8"
  );
  console.log("Wrote backend/data/woo-shop-snapshot.json");
}

async function main() {
  console.log(`Parsing ${sqlPath} ...`);
  const parsed = await streamParse(sqlPath);
  console.log(
    `Parsed terms=${parsed.terms.size} taxonomies=${parsed.taxonomies.size} products=${parsed.products.size} metaKeys=${parsed.postmeta.size} rels=${parsed.relationships.length}`
  );
  await importData(parsed);
  console.log("Import done.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
