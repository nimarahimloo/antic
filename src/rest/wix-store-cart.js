/**
 * Local cart (localStorage) + checkout via /api/orders (Zarinpal).
 */

const CART_KEY = "antic-local-cart";
const API = import.meta.env.VITE_API_BASE || "/api";

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

async function fetchProduct(id) {
  const res = await fetch(`${API}/catalog/products?limit=100`);
  if (!res.ok) return null;
  const data = await res.json();
  return (data.products || []).find((p) => p.id === id) || null;
}

export async function getCurrentCart() {
  return loadCart();
}

export async function addToCart(catalogItemId, variantId, quantity = 1) {
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

export function clearCart() {
  return saveCart(emptyCart());
}

/**
 * Start checkout: requires customer info. Returns payment URL (Zarinpal or demo).
 * @param {{ customerName: string, customerPhone: string, customerEmail?: string, customerAddress?: string, note?: string }}
 */
export async function checkout(customer = {}) {
  const cart = loadCart();
  if (!cart.lineItems?.length) throw new Error("سبد خرید خالی است.");

  if (!customer.customerName || !customer.customerPhone) {
    // Fall back to dedicated checkout page
    return "/checkout";
  }

  const items = cart.lineItems.map((l) => ({
    productId: l.source?.catalogReference?.catalogItemId,
    name: l.name?.original || "محصول",
    quantity: l.quantityInfo?.confirmedQuantity || 1,
    unitPrice: Number(l.pricing?.unitPrice?.amount || 0),
    image: l.attributes?.image?.url,
  }));

  const res = await fetch(`${API}/orders/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...customer, items }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "خطا در ثبت سفارش");
  if (!data.paymentUrl) throw new Error("آدرس پرداخت دریافت نشد");
  return data.paymentUrl;
}
