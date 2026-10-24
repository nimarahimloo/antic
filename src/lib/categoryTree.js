/**
 * سلسله‌مراتب دسته: مادر در جدول CurtainCategory،
 * زیردسته فقط داخل فیلد JSON subcategories مادر — نه ردیف جدا.
 */

const SPACE_ONLY = new Set([
  "living-room",
  "bedroom",
  "hotel",
  "villa",
  "living",
  "guest-room",
  "lobby",
  "hall",
  "terrace",
  "master",
  "kids",
  "classic",
  "modern",
  "neo-classic",
  "meeting",
  "manager",
]);

/** اسلاگ‌های ترکیبی/تکراری که نباید به‌عنوان دسته مادر باشند */
const JUNK_ROOTS = new Set([
  "shade-zebra",
  "pleated-roman",
  "track-panel", // تکراری با turk-panel
  "shade-blackout",
  "shade-screen",
  "double-shade",
  "mini-shade",
  "shade-roman",
  "pleated-manual",
  "pleated-chain",
  "pleated-touch",
  "pleated-day-night",
  "pleated-mesh",
  "wooden-blind",
  "metal-blind",
  "printed-hazan",
  "zebra-printed",
]);

export function parseSubs(raw) {
  let subs = raw;
  if (typeof subs === "string") {
    try {
      subs = JSON.parse(subs);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(subs)) return [];
  return subs
    .map((s) => {
      if (typeof s === "string") return { name: s, slug: s };
      return {
        name: s.name || s.slug || "",
        slug: String(s.slug || s.name || "").trim(),
      };
    })
    .filter((s) => s.slug);
}

/** همه slugهایی که جایی زیردسته تعریف شده‌اند */
export function collectSubSlugs(categories) {
  const set = new Set();
  for (const c of categories || []) {
    for (const s of parseSubs(c.subcategories)) {
      set.add(String(s.slug).toLowerCase());
    }
  }
  return set;
}

/**
 * فقط دسته‌های مادر برای سلکت باکس:
 * - نه فضاهای صرفاً نمونه‌کار (اختیاری با includeSpace)
 * - نه اسلاگی که خودش زیردستهٔ دیگری است
 * - نه اسلاگ‌های ترکیبی/تکراری شناخته‌شده
 */
export function getRootCategories(categories, { includeSpace = true } = {}) {
  const subSlugs = collectSubSlugs(categories);
  return (Array.isArray(categories) ? categories : [])
    .filter((c) => {
      const slug = String(c.slug || "")
        .toLowerCase()
        .trim();
      if (!slug) return false;
      if (JUNK_ROOTS.has(slug)) return false;
      if (subSlugs.has(slug)) return false;
      if (!includeSpace && SPACE_ONLY.has(slug)) return false;
      return true;
    })
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

export function getSubOptionsForParent(categories, parentSlug) {
  if (!parentSlug) return [];
  const parent = (categories || []).find(
    (c) => String(c.slug).toLowerCase() === String(parentSlug).toLowerCase()
  );
  if (!parent) return [];
  return parseSubs(parent.subcategories).map((s) => ({
    value: s.slug,
    label: s.name,
  }));
}

export function rootSelectOptions(categories, opts) {
  return getRootCategories(categories, opts).map((c) => ({
    value: c.slug,
    label: c.name,
  }));
}
