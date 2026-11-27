/**
 * Functional tests — install-capable categories filter
 * Run: node --test tests/functional/installCategories.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isInstallCategory,
  filterInstallCategories,
} from "../../src/lib/installCategories.ts";

interface Category {
  slug: string;
  mechanism?: string | null;
  name?: string;
}

describe("isInstallCategory", () => {
  it("accepts categories with mechanism", () => {
    assert.equal(isInstallCategory({ slug: "custom", mechanism: "roman" } as Category), true);
  });

  it("accepts fabric-hint slugs", () => {
    assert.equal(isInstallCategory({ slug: "zebra" } as Category), true);
    assert.equal(isInstallCategory({ slug: "roman" } as Category), true);
    assert.equal(isInstallCategory({ slug: "turk-panel" } as Category), true);
  });

  it("rejects pure space categories", () => {
    assert.equal(isInstallCategory({ slug: "living-room" } as Category), false);
    assert.equal(isInstallCategory({ slug: "hotel" } as Category), false);
    assert.equal(isInstallCategory({ slug: "bedroom" } as Category), false);
  });

  it("accepts Persian technical names", () => {
    assert.equal(isInstallCategory({ slug: "x1", name: "پرده زبرا" } as Category), true);
    assert.equal(isInstallCategory({ slug: "x2", name: "رومن" } as Category), true);
  });
});

describe("filterInstallCategories", () => {
  it("filters mixed list", () => {
    const input: Category[] = [
      { slug: "shade", mechanism: "shade", name: "شید" },
      { slug: "living-room", name: "پذیرایی" },
      { slug: "zebra", name: "زبرا" },
      { slug: "hotel", name: "هتل" },
    ];
    const out = filterInstallCategories(input);
    assert.equal(out.length, 2);
    assert.deepEqual(
      out.map((c) => c.slug).sort(),
      ["shade", "zebra"],
    );
  });

  it("handles non-array", () => {
    assert.deepEqual(filterInstallCategories(null), []);
  });
});
