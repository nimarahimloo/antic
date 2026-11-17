/**
 * Functional tests — category hierarchy helpers
 * Run: node --test tests/functional/categoryTree.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseSubs,
  collectSubSlugs,
  getRootCategories,
  getSubOptionsForParent,
  rootSelectOptions,
} from "../../src/lib/categoryTree.js";

const SAMPLE = [
  {
    slug: "shade",
    name: "شید",
    order: 1,
    mechanism: "shade",
    subcategories: [
      { name: "بلک‌اوت", slug: "shade-blackout" },
      { name: "اسکرین", slug: "shade-screen" },
    ],
  },
  {
    slug: "zebra",
    name: "زبرا",
    order: 2,
    mechanism: "zebra",
    subcategories: [{ name: "چاپ‌شده", slug: "zebra-printed" }],
  },
  {
    slug: "shade-blackout",
    name: "شید بلک‌اوت (اشتباه به‌عنوان ریشه)",
    order: 99,
    mechanism: "shade",
    subcategories: [],
  },
  {
    slug: "track-panel",
    name: "ترک پنل تکراری",
    order: 50,
    mechanism: "panel",
    subcategories: [],
  },
  {
    slug: "living-room",
    name: "پذیرایی",
    order: 10,
    mechanism: null,
    subcategories: [],
  },
  {
    slug: "shade-zebra",
    name: "ترکیبی اشتباه",
    order: 80,
    mechanism: "zebra",
    subcategories: [],
  },
];

describe("parseSubs", () => {
  it("parses array of objects", () => {
    const out = parseSubs([{ name: "A", slug: "a" }]);
    assert.equal(out.length, 1);
    assert.equal(out[0].slug, "a");
  });

  it("parses JSON string", () => {
    const out = parseSubs(JSON.stringify([{ name: "B", slug: "b" }]));
    assert.equal(out[0].slug, "b");
  });

  it("returns empty on garbage", () => {
    assert.deepEqual(parseSubs(null), []);
    assert.deepEqual(parseSubs("{not json"), []);
  });
});

describe("getRootCategories", () => {
  it("excludes slugs that are defined as subcategories of another parent", () => {
    const roots = getRootCategories(SAMPLE, { includeSpace: true });
    const slugs = roots.map((c) => c.slug);
    assert.ok(slugs.includes("shade"));
    assert.ok(slugs.includes("zebra"));
    assert.ok(!slugs.includes("shade-blackout"), "sub must not appear as root");
  });

  it("excludes known junk composite roots", () => {
    const roots = getRootCategories(SAMPLE, { includeSpace: true });
    const slugs = roots.map((c) => c.slug);
    assert.ok(!slugs.includes("track-panel"));
    assert.ok(!slugs.includes("shade-zebra"));
  });

  it("can hide space-only categories for catalog model form", () => {
    const roots = getRootCategories(SAMPLE, { includeSpace: false });
    const slugs = roots.map((c) => c.slug);
    assert.ok(!slugs.includes("living-room"));
    assert.ok(slugs.includes("shade"));
  });

  it("keeps space categories when includeSpace=true", () => {
    const roots = getRootCategories(SAMPLE, { includeSpace: true });
    assert.ok(roots.some((c) => c.slug === "living-room"));
  });
});

describe("getSubOptionsForParent", () => {
  it("returns only children of selected parent", () => {
    const opts = getSubOptionsForParent(SAMPLE, "shade");
    assert.equal(opts.length, 2);
    assert.deepEqual(
      opts.map((o) => o.value).sort(),
      ["shade-blackout", "shade-screen"]
    );
  });

  it("returns empty when parent missing or has no subs", () => {
    assert.deepEqual(getSubOptionsForParent(SAMPLE, ""), []);
    assert.deepEqual(getSubOptionsForParent(SAMPLE, "living-room"), []);
  });

  it("is case-insensitive on parent slug", () => {
    const opts = getSubOptionsForParent(SAMPLE, "SHADE");
    assert.equal(opts.length, 2);
  });
});

describe("rootSelectOptions", () => {
  it("maps to {value,label} for select boxes", () => {
    const opts = rootSelectOptions(SAMPLE, { includeSpace: false });
    assert.ok(opts.every((o) => o.value && o.label));
    assert.ok(opts.some((o) => o.value === "shade" && o.label === "شید"));
  });
});

describe("collectSubSlugs", () => {
  it("collects all nested subcategory slugs", () => {
    const set = collectSubSlugs(SAMPLE);
    assert.ok(set.has("shade-blackout"));
    assert.ok(set.has("zebra-printed"));
  });
});
