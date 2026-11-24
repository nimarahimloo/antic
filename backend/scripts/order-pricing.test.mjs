import test from "node:test";
import assert from "node:assert/strict";
import { buildPricedCheckout } from "../src/services/orderPricing.ts";

function product(overrides = {}) {
  return {
    id: "product-1",
    name: "فینیال طلایی",
    price: 250_000,
    image: "https://example.test/finial.webp",
    visible: true,
    inStock: true,
    stock: 8,
    variantsJson: null,
    ...overrides,
  };
}

test("uses database name, image and price, ignoring all client-supplied display and price fields", () => {
  const result = buildPricedCheckout(
    [{
      productId: "product-1",
      quantity: 2,
      name: "Fake product",
      unitPrice: 1,
      image: "https://attacker.test/fake.webp",
      total: 2,
    }],
    [product()]
  );

  assert.equal(result.amountToman, 500_000);
  assert.deepEqual(result.items, [{
    productId: "product-1",
    name: "فینیال طلایی",
    quantity: 2,
    unitPrice: 250_000,
    image: "https://example.test/finial.webp",
  }]);
});

test("uses the persisted selected variant price, not a client price", () => {
  const result = buildPricedCheckout(
    [{ productId: "product-1", variantId: "variant-large", quantity: 1, unitPrice: 5 }],
    [product({
      variantsJson: JSON.stringify([
        { id: "variant-small", price: { actualPrice: { amount: "200000" } } },
        { id: "variant-large", price: { actualPrice: { amount: "325500" } } },
      ]),
    })]
  );

  assert.equal(result.amountToman, 325_500);
  assert.equal(result.items[0].unitPrice, 325_500);
  assert.equal(result.items[0].variantId, "variant-large");
});

test("rejects a product missing from the catalog", () => {
  assert.throws(
    () => buildPricedCheckout([{ productId: "missing", quantity: 1 }], []),
    (error) => error.status === 404
  );
});

test("rejects hidden, disabled, and out-of-stock products", () => {
  for (const overrides of [
    { visible: false },
    { inStock: false },
    { stock: 0 },
  ]) {
    assert.throws(
      () => buildPricedCheckout([{ productId: "product-1", quantity: 1 }], [product(overrides)]),
      (error) => error.status === 409
    );
  }
});

test("rejects requested quantity above persisted stock, including duplicate cart lines", () => {
  assert.throws(
    () => buildPricedCheckout([
      { productId: "product-1", quantity: 5 },
      { productId: "product-1", quantity: 4 },
    ], [product({ stock: 8 })]),
    (error) => error.status === 409
  );
});

test("rejects unknown or unavailable variants", () => {
  const variantsJson = JSON.stringify([
    { id: "sold-out", inventoryStatus: { inStock: false } },
    { id: "available", price: { actualPrice: { amount: "270000" } } },
  ]);

  assert.throws(
    () => buildPricedCheckout([{ productId: "product-1", variantId: "not-a-variant", quantity: 1 }], [product({ variantsJson })]),
    (error) => error.status === 400
  );
  assert.throws(
    () => buildPricedCheckout([{ productId: "product-1", variantId: "sold-out", quantity: 1 }], [product({ variantsJson })]),
    (error) => error.status === 409
  );
});

test("rejects zero or invalid catalog prices for online checkout", () => {
  for (const price of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => buildPricedCheckout([{ productId: "product-1", quantity: 1 }], [product({ price })]),
      (error) => error.status === 409
    );
  }
});

test("rejects malformed persisted variant configuration", () => {
  assert.throws(
    () => buildPricedCheckout([{ productId: "product-1", quantity: 1 }], [product({ variantsJson: "{" })]),
    (error) => error.status === 500
  );
});
