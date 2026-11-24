/**
 * Local cart (localStorage) + checkout via /api/orders (Zarinpal).
 */

const CART_KEY = "antic-local-cart";
const API = process.env.NEXT_PUBLIC_API_BASE || "/api";

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

function loadCart(): Cart {
  if (typeof window === "undefined") return emptyCart();
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return emptyCart();
}

function saveCart(cart: Cart): Cart {
  if (typeof window === "undefined") return cart;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* ignore */
  }
  return cart;
}

function emptyCart(): Cart {
  return {
    id: "local",
    lineItems: [],
    businessInfo: { currencyCode: "IRR" },
  };
}

function uid(): string {
  return `li_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

interface Product {
  id: string;
  slug?: string;
  name: string;
  inventory?: { availabilityStatus?: string };
  actualPriceRange?: { minValue?: { amount: number; formattedAmount: string } };
  media?: { main?: { image?: { url: string } } };
}

async function fetchProduct(id: string): Promise<Product | null> {
  try {
    const byId = await fetch(`${API}/catalog/products/id/${encodeURIComponent(id)}`);
    if (byId.ok) {
      const data = await byId.json();
      if (data.product) return data.product;
    }
  } catch {
    /* fallback */
  }
  const res = await fetch(`${API}/catalog/products?limit=200`);
  if (!res.ok) return null;
  const data = await res.json();
  return (data.products || []).find((p: Product) => p.id === id || p.slug === id) || null;
}

export async function getCurrentCart(): Promise<Cart> {
  return loadCart();
}

export async function addToCart(
  catalogItemId: string,
  variantId: string,
  quantity = 1,
  extras: { modifierChoices?: Record<string, unknown>; customTextFields?: Record<string, unknown> } = {}
): Promise<Cart> {
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

  const modifierChoices = extras.modifierChoices ? { ...extras.modifierChoices } : undefined;
  const customTextFields = extras.customTextFields ? { ...extras.customTextFields } : undefined;

  if (existing) {
    existing.quantityInfo.confirmedQuantity += quantity;
    existing.pricing.totalPrice = {
      amount: String(unitAmount * existing.quantityInfo.confirmedQuantity),
      convertedAmount: String(unitAmount * existing.quantityInfo.confirmedQuantity),
    };
    if (modifierChoices) {
      existing.attributes = existing.attributes || {};
      existing.attributes.modifierChoices = {
        ...(existing.attributes.modifierChoices || {}),
        ...modifierChoices,
      };
    }
    if (customTextFields) {
      existing.attributes = existing.attributes || {};
      existing.attributes.customTextFields = {
        ...(existing.attributes.customTextFields || {}),
        ...customTextFields,
      };
    }
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
        ...(modifierChoices ? { modifierChoices } : {}),
        ...(customTextFields ? { customTextFields } : {}),
      },
      status: "IN_STOCK",
    });
  }

  return saveCart(cart);
}

export async function updateCartItemQuantity(lineItemId: string, quantity: number): Promise<Cart> {
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

export async function removeFromCart(lineItemId: string): Promise<Cart> {
  const cart = loadCart();
  cart.lineItems = cart.lineItems.filter((l) => l.id !== lineItemId);
  return saveCart(cart);
}

export function clearCart(): Cart {
  return saveCart(emptyCart());
}

/**
 * Start checkout → /api/orders/checkout (Zarinpal or demo).
 */
export async function checkout(customer: Record<string, unknown> = {}): Promise<string> {
  const cart = loadCart();
  if (!cart.lineItems?.length) throw new Error("سبد خرید خالی است.");

  if (!customer.customerName || !customer.customerPhone) {
    return "/checkout";
  }

  // The server resolves product names, images, variant prices and totals from Prisma.
  // Local cart prices are display-only and are never sent as payment authority.
  const items = cart.lineItems.map((line) => ({
    productId: line.source?.catalogReference?.catalogItemId,
    variantId: line.source?.catalogReference?.options?.variantId,
    quantity: line.quantityInfo?.confirmedQuantity || 1,
  }));

  const customerAddress = [
    customer.address,
    customer.city,
    customer.postalCode ? `کد پستی: ${customer.postalCode}` : "",
  ].filter((value) => typeof value === "string" && value.trim()).join("، ");

  const res = await fetch(`${API}/orders/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: customer.customerName,
      customerPhone: customer.customerPhone,
      customerEmail: customer.customerEmail,
      customerAddress,
      note: customer.notes,
      items,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "خطا در ثبت سفارش");
  if (!data.paymentUrl) throw new Error("آدرس پرداخت دریافت نشد");
  return data.paymentUrl;
}