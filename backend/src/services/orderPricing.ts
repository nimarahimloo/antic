import { HttpError } from "../lib/errors.js";

export type CheckoutRequestItem = {
  productId: string;
  quantity: number;
  variantId?: string;
};

export type CheckoutProduct = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  visible: boolean;
  inStock: boolean;
  stock: number;
  variantsJson: string | null;
};

export type PricedCheckoutItem = {
  productId: string;
  variantId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  image?: string;
};

export type PricedCheckout = {
  items: PricedCheckoutItem[];
  amountToman: number;
};

type StoredVariant = {
  id?: unknown;
  inventoryStatus?: { inStock?: unknown };
  price?: { actualPrice?: { amount?: unknown } };
};

function parseVariants(value: string | null): StoredVariant[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new Error("variantsJson must contain an array");
    }
    return parsed.filter(
      (entry): entry is StoredVariant =>
        entry !== null && typeof entry === "object" && !Array.isArray(entry)
    );
  } catch {
    throw new HttpError(500, "تنوع‌های محصول در پایگاه داده معتبر نیستند.");
  }
}

/**
 * Prices a checkout exclusively from persisted Product records.
 *
 * The browser is intentionally allowed to send only product/variant identifiers and quantity.
 * Any client-supplied name, image, price, or total is ignored and must never be persisted.
 */
export function buildPricedCheckout(
  requestedItems: CheckoutRequestItem[],
  products: CheckoutProduct[]
): PricedCheckout {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new HttpError(400, "سبد خرید خالی است.");
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const requestedQuantityByProduct = new Map<string, number>();

  for (const item of requestedItems) {
    if (
      !item ||
      typeof item.productId !== "string" ||
      !item.productId ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1
    ) {
      throw new HttpError(400, "اطلاعات محصول یا تعداد آن معتبر نیست.");
    }

    const product = productsById.get(item.productId);
    if (!product) {
      throw new HttpError(404, "یکی از محصولات سفارش پیدا نشد.");
    }
    if (!product.visible || !product.inStock || product.stock < 1) {
      throw new HttpError(409, `محصول «${product.name}» در حال حاضر موجود نیست.`);
    }

    requestedQuantityByProduct.set(
      item.productId,
      (requestedQuantityByProduct.get(item.productId) || 0) + item.quantity
    );
  }

  for (const [productId, quantity] of requestedQuantityByProduct) {
    const product = productsById.get(productId)!;
    if (quantity > product.stock) {
      throw new HttpError(409, `تعداد درخواستی محصول «${product.name}» بیشتر از موجودی است.`);
    }
  }

  const pricedItems: PricedCheckoutItem[] = requestedItems.map((item) => {
    const product = productsById.get(item.productId)!;
    const variants = parseVariants(product.variantsJson);
    let selectedVariant: StoredVariant | undefined;

    if (item.variantId) {
      if (variants.length > 0) {
        selectedVariant = variants.find((variant) => variant.id === item.variantId);
        if (!selectedVariant) {
          throw new HttpError(400, `گزینهٔ انتخاب‌شده برای محصول «${product.name}» معتبر نیست.`);
        }
      } else if (item.variantId !== `${product.id}-default`) {
        throw new HttpError(400, `گزینهٔ انتخاب‌شده برای محصول «${product.name}» معتبر نیست.`);
      }
    } else if (variants.length === 1) {
      selectedVariant = variants[0];
    } else if (variants.length > 1) {
      throw new HttpError(400, `برای محصول «${product.name}» باید یک گزینه انتخاب کنید.`);
    }

    if (selectedVariant?.inventoryStatus?.inStock === false) {
      throw new HttpError(409, `گزینهٔ انتخاب‌شده برای محصول «${product.name}» موجود نیست.`);
    }

    const variantPrice = selectedVariant?.price?.actualPrice?.amount;
    const persistedPrice =
      variantPrice === undefined || variantPrice === null ? product.price : Number(variantPrice);
    if (!Number.isFinite(persistedPrice) || persistedPrice <= 0) {
      throw new HttpError(409, `قیمت محصول «${product.name}» برای خرید آنلاین تنظیم نشده است.`);
    }

    const unitPrice = Math.round(persistedPrice);
    return {
      productId: product.id,
      ...(selectedVariant?.id
        ? { variantId: String(selectedVariant.id) }
        : item.variantId
          ? { variantId: item.variantId }
          : {}),
      name: product.name,
      quantity: item.quantity,
      unitPrice,
      ...(product.image ? { image: product.image } : {}),
    };
  });

  const amountToman = pricedItems.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0
  );
  if (!Number.isSafeInteger(amountToman) || amountToman < 1000) {
    throw new HttpError(400, "مبلغ سفارش معتبر نیست یا کمتر از حداقل پرداخت است.");
  }
  if (!Number.isSafeInteger(amountToman * 10)) {
    throw new HttpError(400, "مبلغ سفارش از محدودهٔ مجاز درگاه پرداخت بیشتر است.");
  }

  return { items: pricedItems, amountToman };
}
