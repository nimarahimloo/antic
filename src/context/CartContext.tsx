"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  getCurrentCart,
  addToCart as apiAdd,
  removeFromCart as apiRemove,
  updateCartItemQuantity as apiQty,
} from "@/rest/store-cart";

interface CartLineItem {
  id: string;
  quantityInfo: { confirmedQuantity: number };
  source: {
    catalogReference: {
      catalogItemId: string;
      options?: { variantId?: string };
    };
  };
  name: { original: string };
  pricing: {
    unitPrice: { amount: string; convertedAmount: string };
    totalPrice: { amount: string; convertedAmount: string };
    unitFormatted: string;
  };
  attributes: {
    image?: { url: string; altText: string };
    descriptionLines: string[];
    modifierChoices?: Record<string, unknown>;
    customTextFields?: Record<string, unknown>;
  };
  status: string;
}

interface Cart {
  id: string;
  lineItems: CartLineItem[];
  businessInfo: { currencyCode: string };
}

interface CartContextType {
  cart: Cart | null;
  itemCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  addToCart: (id: string, variantId: string, qty?: number, extras?: Record<string, unknown>) => Promise<Cart>;
  removeItem: (lineItemId: string) => Promise<Cart>;
  updateQuantity: (lineItemId: string, qty: number) => Promise<Cart>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    const newCart = await getCurrentCart();
    setCart(newCart);
  }, []);

  useEffect(() => {
    refreshCart();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshCart();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshCart]);

  const itemCount = (cart?.lineItems ?? []).reduce(
    (n, li) => n + (li.quantityInfo?.confirmedQuantity || 0),
    0
  );

  const run = async (fn: () => Promise<Cart>, { reread = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (result) setCart(result);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطایی رخ داد. دوباره تلاش کنید.");
      setIsOpen(true);
      if (reread) await refreshCart().catch(() => {});
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (id: string, variantId: string, qty = 1, extras?: Record<string, unknown>) =>
    run(async () => {
      const newCart = await apiAdd(id, variantId, qty, extras);
      setIsOpen(true);
      return newCart;
    });

  const removeItem = (lineItemId: string) =>
    run(async () => {
      const newCart = await apiRemove(lineItemId);
      return newCart;
    });

  const updateQuantity = (lineItemId: string, qty: number) =>
    run(async () => {
      const newCart = await apiQty(lineItemId, qty);
      return newCart;
    });

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