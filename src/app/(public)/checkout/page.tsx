"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatToman } from "@/components/CartDrawer";
import PageHero from "@/components/PageHero";

export default function CheckoutPage() {
  const [step, setStep] = useState<"info" | "payment" | "result">("info");
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    address: "",
    city: "",
    postalCode: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { cart, checkout, refreshCart } = useCart();

  const lineItems = cart?.lineItems ?? [];
  const subtotal = lineItems.reduce(
    (s, li) => s + Number(li.pricing?.unitPrice?.amount || 0) * (li.quantityInfo?.confirmedQuantity || 0),
    0
  );

  if (lineItems.length === 0) {
    return (
      <div className="bg-background min-h-screen">
        <PageHero
          pageKey="checkout"
          eyebrow="پرداخت"
          title="سبد خرید خالی"
          description="محصولی در سبد خرید شما نیست."
        />
        <section className="mx-auto max-w-md px-5 py-12 lg:px-10 lg:py-16 text-center">
          <p className="font-body text-base text-muted-foreground mb-6">سبد خرید شما خالی است.</p>
          <Link href="/shop" className="btn-gold inline-flex">ادامه خرید</Link>
        </section>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const paymentUrl = await checkout({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        address: form.address,
        city: form.city,
        postalCode: form.postalCode,
        notes: form.notes,
      });
      if (paymentUrl && paymentUrl !== "/checkout") {
        window.location.href = paymentUrl;
      } else {
        setStep("payment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ثبت سفارش");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <PageHero
        pageKey="checkout"
        eyebrow="پرداخت"
        title="تکمیل خرید"
        description="اطلاعات تحویل را تکمیل کنید و به درگاه پرداخت منتقل شوید."
      />

      <section className="mx-auto max-w-3xl px-5 py-12 lg:px-10 lg:py-16">
        {error && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-3xl border border-secondary/60 bg-card p-6 lg:p-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-6">اطلاعات تحویل</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="customerName" className="mb-1.5 block font-body text-xs text-muted-foreground">نام و نام خانوادگی *</label>
                <input
                  id="customerName"
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="customerPhone" className="mb-1.5 block font-body text-xs text-muted-foreground">شماره تماس *</label>
                <input
                  id="customerPhone"
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  className="w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="customerEmail" className="mb-1.5 block font-body text-xs text-muted-foreground">ایمیل</label>
              <input
                id="customerEmail"
                type="email"
                value={form.customerEmail}
                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                className="w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="address" className="mb-1.5 block font-body text-xs text-muted-foreground">آدرس کامل *</label>
              <textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary resize-none"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className="mb-1.5 block font-body text-xs text-muted-foreground">شهر *</label>
                <input
                  id="city"
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="postalCode" className="mb-1.5 block font-body text-xs text-muted-foreground">کد پستی</label>
                <input
                  id="postalCode"
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  className="w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label htmlFor="notes" className="mb-1.5 block font-body text-xs text-muted-foreground">یادداشت سفارش</label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary resize-none"
                placeholder="توضیحات خاص برای ارسال، واحد پلاک،층..."
              />
            </div>

            <div className="border-t border-secondary/60 pt-6 mt-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-4">خلاصه سفارش</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {lineItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary/20">
                        {item.attributes?.image?.url && (
                          <img src={item.attributes.image.url} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-body text-sm font-medium text-foreground">{item.name?.original}</p>
                        <p className="font-body text-xs text-muted-foreground">تعداد: {item.quantityInfo?.confirmedQuantity || 1}</p>
                      </div>
                    </div>
                    <span className="font-display text-sm font-bold text-primary">
                      {formatToman(Number(item.pricing?.unitPrice?.amount || 0) * (item.quantityInfo?.confirmedQuantity || 1))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-secondary/60 pt-4 mt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-body text-sm text-muted-foreground">مجموع کالا</span>
                  <span className="font-display text-sm font-bold text-foreground">{formatToman(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-sm text-muted-foreground">هزینه ارسال</span>
                  <span className="font-display text-sm font-bold text-foreground">رایگان</span>
                </div>
                <div className="flex justify-between border-t border-secondary/60 pt-4">
                  <span className="font-display text-lg font-bold text-foreground">مبلغ قابل پرداخت</span>
                  <span className="font-display text-lg font-bold text-primary">{formatToman(subtotal)}</span>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-gold w-full justify-center mt-6" style={{ minHeight: 48 }}>
              {loading ? "در حال پردازش..." : "ادامه به پرداخت"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}