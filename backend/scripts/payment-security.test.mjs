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
