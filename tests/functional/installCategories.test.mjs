/**
 * Functional tests — install-capable categories filter
 * Run: node --test tests/functional/installCategories.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isInstallCategory,
  filterInstallCategories,
} from "../../src/lib/installCategories.js";

describe("isInstallCategory", () => {
  it("accepts categories with mechanism", () => {
    assert.equal(isInstallCategory({ slug: "custom", mechanism: "roman" }), true);
  });

  it("accepts fabric-hint slugs", () => {
    assert.equal(isInstallCategory({ slug: "zebra" }), true);
    assert.equal(isInstallCategory({ slug: "roman" }), true);
    assert.equal(isInstallCategory({ slug: "turk-panel" }), true);
  });

  it("rejects pure space categories", () => {
    assert.equal(isInstallCategory({ slug: "living-room" }), false);
    assert.equal(isInstallCategory({ slug: "hotel" }), false);
    assert.equal(isInstallCategory({ slug: "bedroom" }), false);
  });

  it("accepts Persian technical names", () => {
    assert.equal(isInstallCategory({ slug: "x1", name: "پرده زبرا" }), true);
    assert.equal(isInstallCategory({ slug: "x2", name: "رومن" }), true);
  });
});

describe("filterInstallCategories", () => {
  it("filters mixed list", () => {
    const input = [
      { slug: "shade", mechanism: "shade", name: "شید" },
      { slug: "living-room", name: "پذیرایی" },
      { slug: "zebra", name: "زبرا" },
      { slug: "hotel", name: "هتل" },
    ];
    const out = filterInstallCategories(input);
    assert.equal(out.length, 2);
    assert.deepEqual(
      out.map((c) => c.slug).sort(),
      ["shade", "zebra"]
    );
  });

  it("handles non-array", () => {
    assert.deepEqual(filterInstallCategories(null), []);
  });
});
