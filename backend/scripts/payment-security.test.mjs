import test from "node:test";
import assert from "node:assert/strict";
import { requireMatchingPaymentAuthority } from "../src/services/paymentVerification.ts";

test("accepts only the exact authority stored on the order", () => {
  assert.equal(
    requireMatchingPaymentAuthority("A00000000000000000000000000123456789", "A00000000000000000000000000123456789"),
    "A00000000000000000000000000123456789"
  );
});

test("rejects a callback authority belonging to another order", () => {
  assert.throws(
    () => requireMatchingPaymentAuthority("authority-for-this-order", "authority-for-another-order"),
    (error) => error.status === 400
  );
});

test("rejects missing stored or callback authority rather than falling back", () => {
  assert.throws(
    () => requireMatchingPaymentAuthority(null, "callback-authority"),
    (error) => error.status === 400
  );
  assert.throws(
    () => requireMatchingPaymentAuthority("stored-authority", ""),
    (error) => error.status === 400
  );
});

import { classifyPaymentCallback } from "../src/services/paymentVerification.ts";

test("only pending orders can transition from a Zarinpal callback", () => {
  assert.equal(classifyPaymentCallback("pending", "OK"), "verify");
  assert.equal(classifyPaymentCallback("pending", "NOK"), "cancel");
  assert.equal(classifyPaymentCallback("pending", "UNKNOWN"), "ignore");
});

test("a replayed NOK callback never downgrades an already-paid order", () => {
  assert.equal(classifyPaymentCallback("paid", "NOK"), "already_paid");
  assert.equal(classifyPaymentCallback("paid", "OK"), "already_paid");
});

test("terminal failed or cancelled orders ignore stale callbacks", () => {
  for (const status of ["failed", "cancelled", "refunded"]) {
    assert.equal(classifyPaymentCallback(status, "OK"), "ignore");
    assert.equal(classifyPaymentCallback(status, "NOK"), "ignore");
  }
});
