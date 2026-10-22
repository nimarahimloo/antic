import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { checkout as apiCheckout, clearCart } from "@/rest/wix-store-cart";
import { Loader2 } from "lucide-react";

export default function Checkout() {
  const { cart, itemCount, refreshCart } = useCart();
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    note: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lines = cart?.lineItems || [];
  const total = lines.reduce(
    (s, l) => s + Number(l.pricing?.unitPrice?.amount || 0) * (l.quantityInfo?.confirmedQuantity || 0),
    0
  );

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      setError("نام و شماره تماس الزامی است.");
      return;
    }
    setLoading(true);
    try {
      const url = await apiCheckout(form);
      clearCart();
      await refreshCart();
      window.location.href = url;
    } catch (err) {
      setError(err?.message || "خطا در پرداخت");
      setLoading(false);
    }
  }

  if (!itemCount) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="font-body text-sm text-muted-foreground">سبد خرید خالی است.</p>
        <a href="/shop" className="btn-gold mt-6 inline-flex">
          بازگشت به فروشگاه
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 lg:px-10 lg:py-16">
      <h1 className="font-display text-2xl font-black text-foreground">تسویه حساب</h1>
      <p className="mt-2 font-body text-sm text-muted-foreground">
        اطلاعات تماس را وارد کنید؛ سپس به درگاه پرداخت هدایت می‌شوید.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <form onSubmit={submit} className="space-y-4 lg:col-span-3">
          {["customerName", "customerPhone", "customerEmail", "customerAddress"].map((key) => {
            const labels = {
              customerName: "نام و نام خانوادگی *",
              customerPhone: "شماره موبایل *",
              customerEmail: "ایمیل",
              customerAddress: "آدرس ارسال",
            };
            return (
              <div key={key}>
                <label className="mb-1.5 block font-body text-xs text-muted-foreground">{labels[key]}</label>
                <input
                  required={key === "customerName" || key === "customerPhone"}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-secondary bg-card px-4 py-2.5 font-body text-sm outline-none focus:border-primary"
                />
              </div>
            );
          })}
          <div>
            <label className="mb-1.5 block font-body text-xs text-muted-foreground">توضیحات</label>
            <textarea
              rows={3}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full resize-none rounded-xl border border-secondary bg-card px-4 py-2.5 font-body text-sm outline-none focus:border-primary"
            />
          </div>
          {error && <p className="font-body text-xs text-destructive">{error}</p>}
          <button type="submit" disabled={loading} className="btn-gold w-full justify-center disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `پرداخت ${total.toLocaleString("fa-IR")} تومان`}
          </button>
        </form>

        <div className="rounded-2xl border border-secondary/60 bg-card p-5 lg:col-span-2">
          <h2 className="font-display text-sm font-black">خلاصه سبد</h2>
          <ul className="mt-4 space-y-3">
            {lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-2 font-body text-xs">
                <span className="text-foreground">
                  {l.name?.original} × {l.quantityInfo?.confirmedQuantity}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {(Number(l.pricing?.unitPrice?.amount || 0) * (l.quantityInfo?.confirmedQuantity || 0)).toLocaleString(
                    "fa-IR"
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-secondary/50 pt-4 flex justify-between font-display text-sm font-bold">
            <span>جمع</span>
            <span className="text-primary">{total.toLocaleString("fa-IR")} تومان</span>
          </div>
        </div>
      </div>
    </div>
  );
}
