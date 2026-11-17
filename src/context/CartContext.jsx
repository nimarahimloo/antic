import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getCurrentCart,
  addToCart as apiAdd,
  removeFromCart as apiRemove,
  updateCartItemQuantity as apiQty,
} from "@/rest/wix-store-cart";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshCart = useCallback(async () => setCart(await getCurrentCart()), []);
  useEffect(() => {
    refreshCart();
    const onVisible = () => document.visibilityState === "visible" && refreshCart();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshCart]);

  const itemCount = (cart?.lineItems ?? []).reduce(
    (n, li) => n + (li.quantityInfo?.confirmedQuantity || 0),
    0
  );

  const run = async (fn, { reread = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e?.message || "خطایی رخ داد. دوباره تلاش کنید.");
      setIsOpen(true);
      if (reread) await refreshCart().catch(() => {});
      return null;
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (id, variantId, qty = 1, extras) =>
    run(async () => {
      setCart(await apiAdd(id, variantId, qty, extras));
      setIsOpen(true);
    });
  const removeItem = (lineItemId) => run(async () => setCart(await apiRemove(lineItemId)));
  const updateQuantity = (lineItemId, qty) =>
    run(async () => setCart(await apiQty(lineItemId, qty)));

  /** Navigate to checkout page (collect customer info → Zarinpal) */
  const checkout = () => {
    setIsOpen(false);
    window.location.href = "/checkout";
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        isOpen,
        setIsOpen,
        loading,
        error,
        clearError: () => setError(null),
        addToCart,
        removeItem,
        updateQuantity,
        checkout,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
