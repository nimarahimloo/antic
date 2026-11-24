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

export type PaymentCallbackAction = "already_paid" | "cancel" | "verify" | "ignore";

/**
 * Keeps callback handling monotonic: paid orders cannot be downgraded by replayed NOK
 * callbacks, and terminal failed/cancelled orders cannot be reopened by stale callbacks.
 */
export function classifyPaymentCallback(
  orderStatus: string,
  callbackStatus: string
): PaymentCallbackAction {
  if (orderStatus === "paid") return "already_paid";
  if (orderStatus !== "pending") return "ignore";
  if (callbackStatus === "NOK") return "cancel";
  if (callbackStatus === "OK") return "verify";
  return "ignore";
}
