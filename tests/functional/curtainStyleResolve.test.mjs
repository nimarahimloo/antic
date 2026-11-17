/**
 * Functional tests — curtain style resolution
 * Run: node --test tests/functional/curtainStyleResolve.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveStyle,
  pickTemplateUrl,
  MECHANISM_KEYS,
  styleFabricScale,
} from "../../src/lib/curtainStyleResolve.js";

describe("resolveStyle", () => {
  it("defaults to drape for empty fabric", () => {
    assert.equal(resolveStyle(null), "drape");
    assert.equal(resolveStyle({}), "drape");
  });

  it("honors explicit mechanism", () => {
    assert.equal(resolveStyle({ mechanism: "roman" }), "roman");
    assert.equal(resolveStyle({ curtain_style: "zebra" }), "zebra");
  });

  it("uses categoryMechanisms map before heuristics", () => {
    const style = resolveStyle(
      { category_slug: "custom-cat" },
      { "custom-cat": "pleated-chain" }
    );
    assert.equal(style, "pleated-chain");
  });

  it("maps known category slugs", () => {
    assert.equal(resolveStyle({ category_slug: "roman" }), "roman");
    assert.equal(resolveStyle({ category_slug: "zebra" }), "zebra");
    assert.equal(resolveStyle({ category_slug: "shade" }), "shade");
    assert.equal(resolveStyle({ category_slug: "turk-panel" }), "panel");
    assert.equal(resolveStyle({ category_slug: "track-panel" }), "panel");
    assert.equal(resolveStyle({ category_slug: "roller" }), "roller");
  });

  it("maps shade subcategories to shade mechanism", () => {
    assert.equal(resolveStyle({ category_slug: "shade-blackout" }), "shade");
    assert.equal(resolveStyle({ category_slug: "shade-screen" }), "shade");
    assert.equal(resolveStyle({ category_slug: "double-shade" }), "double");
  });

  it("maps pleated variants", () => {
    assert.equal(resolveStyle({ category_slug: "pleated" }), "pleated-manual");
    assert.equal(
      resolveStyle({ category_slug: "pleated", subcategory: "chain" }),
      "pleated-chain"
    );
    assert.equal(resolveStyle({ category_slug: "pleated-mesh" }), "pleated-sheer");
  });

  it("detects Persian/English keywords in name", () => {
    assert.equal(resolveStyle({ name: "پرده رومن کرم" }), "roman");
    assert.equal(resolveStyle({ name: "زبرا طوسی" }), "zebra");
  });
});

describe("pickTemplateUrl", () => {
  const templates = {
    shade: "https://cdn.example/shade-green.jpg",
    roman: "https://cdn.example/roman-green.jpg",
    zebra: "https://cdn.example/zebra-green.jpg",
  };

  it("prefers category slug key over style", () => {
    const r = pickTemplateUrl({ category_slug: "shade" }, templates);
    assert.equal(r.url, templates.shade);
    assert.equal(r.style, "shade");
  });

  it("falls back to resolved style key", () => {
    const r = pickTemplateUrl({ category_slug: "shade-blackout" }, templates);
    assert.equal(r.style, "shade");
    assert.equal(r.url, templates.shade);
  });

  it("returns null url when no template", () => {
    const r = pickTemplateUrl({ category_slug: "unknown-x" }, {});
    assert.equal(r.url, null);
  });
});

describe("styleFabricScale", () => {
  it("returns positive scale for every mechanism", () => {
    for (const k of MECHANISM_KEYS) {
      const s = styleFabricScale(k);
      assert.ok(s > 0 && s < 2, `${k} scale out of range: ${s}`);
    }
  });
});
