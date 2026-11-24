import { HttpError } from "../lib/errors.js";

/**
 * Bind a payment callback to the exact authority issued for this order.
 * Never fall back to a stored authority when the callback omits its own value.
 */
export function requireMatchingPaymentAuthority(
  storedAuthority: string | null,
  callbackAuthority: string
): string {
  if (!storedAuthority || !callbackAuthority || storedAuthority !== callbackAuthority) {
    throw new HttpError(400, "شناسهٔ تراکنش با سفارش مطابقت ندارد.");
  }
  return storedAuthority;
}
