/**
 * Functional tests — curtain style resolution
 * Run: node --test tests/functional/curtainStyleResolve.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveStyle,
  pickTemplateUrl,
  MECHANISM_KEYS,
  styleFabricScale,
} from "../../src/lib/curtainStyleResolve.ts";

interface StyleData {
  category_slug?: string;
  subcategory?: string;
  mechanism?: string;
  curtain_style?: string;
  name?: string;
}


describe("resolveStyle", () => {
  it("defaults to drape for empty fabric", () => {
    assert.equal(resolveStyle(null as unknown as StyleData), "drape");
    assert.equal(resolveStyle({} as StyleData), "drape");
  });

  it("honors explicit mechanism", () => {
    assert.equal(resolveStyle({ mechanism: "roman" } as StyleData), "roman");
    assert.equal(resolveStyle({ curtain_style: "zebra" } as StyleData), "zebra");
  });

  it("uses categoryMechanisms map before heuristics", () => {
    const style = resolveStyle(
      { category_slug: "custom-cat" } as StyleData,
      { "custom-cat": "pleated-chain" },
    );
    assert.equal(style, "pleated-chain");
  });

  it("maps known category slugs", () => {
    assert.equal(resolveStyle({ category_slug: "roman" } as StyleData), "roman");
    assert.equal(resolveStyle({ category_slug: "zebra" } as StyleData), "zebra");
    assert.equal(resolveStyle({ category_slug: "shade" } as StyleData), "shade");
    assert.equal(resolveStyle({ category_slug: "turk-panel" } as StyleData), "panel");
    assert.equal(resolveStyle({ category_slug: "track-panel" } as StyleData), "panel");
    assert.equal(resolveStyle({ category_slug: "roller" } as StyleData), "roller");
  });

  it("maps shade subcategories to shade mechanism", () => {
    assert.equal(resolveStyle({ category_slug: "shade-blackout" } as StyleData), "shade");
    assert.equal(resolveStyle({ category_slug: "shade-screen" } as StyleData), "shade");
    assert.equal(resolveStyle({ category_slug: "double-shade" } as StyleData), "double");
  });

  it("maps pleated variants", () => {
    assert.equal(resolveStyle({ category_slug: "pleated" } as StyleData), "pleated-manual");
    assert.equal(
      resolveStyle({ category_slug: "pleated", subcategory: "chain" } as StyleData),
      "pleated-chain",
    );
    assert.equal(resolveStyle({ category_slug: "pleated-mesh" } as StyleData), "pleated-sheer");
  });

  it("detects Persian/English keywords in name", () => {
    assert.equal(resolveStyle({ name: "پرده رومن کرم" } as StyleData), "roman");
    assert.equal(resolveStyle({ name: "زبرا طوسی" } as StyleData), "zebra");
  });
});

describe("pickTemplateUrl", () => {
  const templates = {
    shade: "https://cdn.example/shade-green.jpg",
    roman: "https://cdn.example/roman-green.jpg",
    zebra: "https://cdn.example/zebra-green.jpg",
  };

  it("prefers category slug key over style", () => {
    const r = pickTemplateUrl({ category_slug: "shade" } as StyleData, templates);
    assert.equal(r.url, templates.shade);
    assert.equal(r.style, "shade");
  });

  it("falls back to resolved style key", () => {
    const r = pickTemplateUrl({ category_slug: "shade-blackout" } as StyleData, templates);
    assert.equal(r.style, "shade");
    assert.equal(r.url, templates.shade);
  });

  it("returns null url when no template", () => {
    const r = pickTemplateUrl({ category_slug: "unknown-x" } as StyleData, {});
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
