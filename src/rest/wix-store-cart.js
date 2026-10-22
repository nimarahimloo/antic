/**
 * Local cart — localStorage only. Same function names as the former Wix cart helpers
 * so CartContext keeps working without external APIs.
 *
 * Checkout: currently shows a message to contact the store (no payment gateway yet).
 */

const CART_KEY = "antic-local-cart";

function loadCart() {
  if (typeof window === "undefined") return emptyCart();
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* */
  }
  return emptyCart();
}

function saveCart(cart) {
  if (typeof window === "undefined") return cart;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* */
  }
  return cart;
}

function emptyCart() {
  return {
    id: "local",
    lineItems: [],
    businessInfo: { currencyCode: "IRR" },
  };
}

function uid() {
  return `li_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const API = import.meta.env.VITE_API_BASE || "/api";

async function fetchProduct(id) {
  // list and find — or we could add GET by id; use products list admin/public
  const res = await fetch(`${API}/catalog/products?limit=100`);
  if (!res.ok) return null;
  const data = await res.json();
  return (data.products || []).find((p) => p.id === id) || null;
}

export async function getCurrentCart() {
  return loadCart();
}

export async function addToCart(catalogItemId, variantId, quantity = 1, _extras = {}) {
  const product = await fetchProduct(catalogItemId);
  if (!product) throw new Error("محصول پیدا نشد.");

  const status = product.inventory?.availabilityStatus;
  if (status && status !== "IN_STOCK") {
    throw new Error("این محصول موجود نیست.");
  }

  const cart = loadCart();
  const existing = cart.lineItems.find(
    (l) =>
      l.source?.catalogReference?.catalogItemId === catalogItemId &&
      (!variantId || l.source?.catalogReference?.options?.variantId === variantId)
  );

  const unitAmount = Number(product.actualPriceRange?.minValue?.amount || 0);
  const unitFormatted = product.actualPriceRange?.minValue?.formattedAmount || String(unitAmount);
  const imageUrl = product.media?.main?.image?.url || null;

  if (existing) {
    existing.quantityInfo.confirmedQuantity += quantity;
    existing.pricing.totalPrice = {
      amount: String(unitAmount * existing.quantityInfo.confirmedQuantity),
      convertedAmount: String(unitAmount * existing.quantityInfo.confirmedQuantity),
    };
  } else {
    cart.lineItems.push({
      id: uid(),
      quantityInfo: { confirmedQuantity: quantity },
      source: {
        catalogReference: {
          catalogItemId,
          options: variantId ? { variantId } : undefined,
        },
      },
      name: { original: product.name },
      pricing: {
        unitPrice: { amount: String(unitAmount), convertedAmount: String(unitAmount) },
        totalPrice: {
          amount: String(unitAmount * quantity),
          convertedAmount: String(unitAmount * quantity),
        },
        // helper for UI that still expects formatted strings
        unitFormatted,
      },
      attributes: {
        image: imageUrl ? { url: imageUrl, altText: product.name } : undefined,
        descriptionLines: [],
      },
      status: "IN_STOCK",
    });
  }

  return saveCart(cart);
}

export async function updateCartItemQuantity(lineItemId, quantity) {
  const cart = loadCart();
  const line = cart.lineItems.find((l) => l.id === lineItemId);
  if (!line) throw new Error("آیتم در سبد پیدا نشد.");
  if (quantity <= 0) {
    cart.lineItems = cart.lineItems.filter((l) => l.id !== lineItemId);
  } else {
    const unit = Number(line.pricing?.unitPrice?.amount || 0);
    line.quantityInfo.confirmedQuantity = quantity;
    line.pricing.totalPrice = {
      amount: String(unit * quantity),
      convertedAmount: String(unit * quantity),
    };
  }
  return saveCart(cart);
}

export async function removeFromCart(lineItemId) {
  const cart = loadCart();
  cart.lineItems = cart.lineItems.filter((l) => l.id !== lineItemId);
  return saveCart(cart);
}

export async function checkout() {
  const cart = loadCart();
  if (!cart.lineItems?.length) throw new Error("سبد خرید خالی است.");
  // No payment gateway yet — open contact with cart summary
  const names = cart.lineItems.map((l) => l.name?.original).join("، ");
  const msg = encodeURIComponent(`سفارش از فروشگاه آنتیک: ${names}`);
  return `/contact?message=${msg}`;
}
