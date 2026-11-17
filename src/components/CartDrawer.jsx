import { useEffect, useMemo } from "react";
import { useCart } from "@/context/CartContext";
import { storeImage } from "@/lib/storeImage";

function formatToman(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return "";
  return new Intl.NumberFormat("fa-IR").format(Math.round(Number(amount))) + " تومان";
}

export default function CartDrawer() {
  const { cart, isOpen, setIsOpen, removeItem, updateQuantity, checkout, loading, error, clearError } =
    useCart();
  const lineItems = cart?.lineItems ?? [];

  const subtotal = useMemo(() => {
    return lineItems.reduce(
      (s, li) =>
        s + Number(li.pricing?.unitPrice?.amount || 0) * (li.quantityInfo?.confirmedQuantity || 0),
      0
    );
  }, [lineItems]);

  const unavailable = lineItems.filter((li) => li.status && li.status !== "IN_STOCK");

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <div onClick={() => setIsOpen(false)} className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <aside
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="سبد خرید"
        className="flex h-full w-[min(420px,100%)] flex-col border-l border-border bg-background font-body text-foreground"
      >
        <header className="flex items-center justify-between border-b border-border p-4">
          <strong className="font-display">سبد خرید{lineItems.length ? ` (${lineItems.length})` : ""}</strong>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="بستن"
            className="cursor-pointer border-none bg-transparent text-xl text-muted-foreground"
          >
            ×
          </button>
        </header>

        {error && (
          <div role="alert" className="m-4 mb-0 rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="flex-1">{error}</span>
              <button onClick={clearError} className="border-none bg-transparent text-muted-foreground">
                ×
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {lineItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
              <p className="m-0 text-muted-foreground">سبد خرید خالی است.</p>
              <button
                onClick={() => setIsOpen(false)}
                className="cursor-pointer rounded-sm border border-border bg-card px-4 py-2 text-sm"
              >
                ادامه خرید
              </button>
            </div>
          ) : (
            lineItems.map((item) => {
              const image = storeImage(item.attributes?.image?.url);
              const qty = item.quantityInfo?.confirmedQuantity || 1;
              const lineTotal =
                Number(item.pricing?.unitPrice?.amount || 0) * qty;
              const isOut = item.status && item.status !== "IN_STOCK";
              return (
                <div key={item.id} className="flex gap-3 border-b border-border py-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-card">
                    {image && (
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-semibold">{item.name?.original}</span>
                    {isOut && <small className="text-destructive">ناموجود</small>}
                    <div className="mt-1 flex items-center gap-2">
                      <QtyButton
                        disabled={loading || qty <= 1}
                        label="کاهش"
                        onClick={() => updateQuantity(item.id, qty - 1)}
                      >
                        −
                      </QtyButton>
                      <span className="min-w-5 text-center">{qty}</span>
                      <QtyButton
                        disabled={loading}
                        label="افزایش"
                        onClick={() => updateQuantity(item.id, qty + 1)}
                      >
                        +
                      </QtyButton>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={loading}
                        className="mr-auto border-none bg-transparent text-[13px] text-muted-foreground underline"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0 font-semibold">{formatToman(lineTotal)}</div>
                </div>
              );
            })
          )}
        </div>

        {lineItems.length > 0 && (
          <footer className="flex flex-col gap-3 border-t border-border p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">جمع</span>
              <strong className="text-[17px]">{formatToman(subtotal)}</strong>
            </div>
            <button
              disabled={loading || unavailable.length > 0}
              onClick={checkout}
              className="w-full cursor-pointer rounded-sm border-none bg-primary p-3 text-[15px] font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "…" : unavailable.length > 0 ? "آیتم ناموجود را حذف کنید" : "ادامه و پرداخت"}
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

function QtyButton({ children, onClick, disabled, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="h-7 w-7 cursor-pointer rounded-sm border border-border bg-card leading-none disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
