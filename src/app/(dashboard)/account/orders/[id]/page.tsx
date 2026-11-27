"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";
import { api } from "@/api";
import { apiErrorMessage } from "@/lib/apiError";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "در انتظار پرداخت", cls: "text-accent border-accent/40" },
  paid: { label: "پرداخت‌شده", cls: "text-emerald-500 border-emerald-500/40" },
  failed: { label: "ناموفق", cls: "text-destructive border-destructive/40" },
  cancelled: { label: "لغو شده", cls: "text-muted-foreground border-secondary" },
};

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AccountOrderDetailPage({ params }: OrderDetailPageProps) {
  interface OrderDetail {
  id: string;
  status: string;
  createdAt?: string;
  amountToman?: number;
  refId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  note?: string;
  items?: Array<{
    image?: string;
    name?: string;
    quantity?: number;
    unitPrice?: number;
  }>;
}

const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    params.then(({ id }) => {
      api.account
        .order(id)
        .then((data) => {
          if (!cancelled) setOrder(data as OrderDetail);
        })
        .catch((e) => {
          if (!cancelled) setError(apiErrorMessage(e));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return <p className="text-sm text-destructive">{error || "یافت نشد"}</p>;
  }

  const st = STATUS[order.status as string] || { label: String(order.status), cls: "" };

  return (
    <div>
      <Link href="/account/orders" className="mb-4 inline-flex items-center gap-1 font-body text-xs text-muted-foreground hover:text-primary">
        <ArrowRight className="h-3.5 w-3.5" /> بازگشت به سفارش‌ها
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-black text-foreground">
            سفارش #{String(order.id).slice(-6).toUpperCase()}
          </h1>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            {order.createdAt ? new Date(String(order.createdAt)).toLocaleString("fa-IR") : ""}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs ${st.cls}`}>{st.label}</span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-secondary/60 bg-card p-5">
          <h2 className="font-display text-sm font-black">اقلام</h2>
          <ul className="mt-3 space-y-3">
            {Array.isArray(order.items) ? order.items.map((it: { image?: string; name?: string; quantity?: number; unitPrice?: number }, i: number) => (
              <li key={i} className="flex items-center gap-3">
                {it.image ? (
                  <img src={String(it.image)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-background" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-xs font-bold">{String(it.name)}</p>
                  <p className="font-body text-[11px] text-muted-foreground">
                    {it.quantity} × {Number(it.unitPrice || 0).toLocaleString("fa-IR")} تومان
                  </p>
                </div>
              </li>
            )) : null}
          </ul>
          <div className="mt-4 border-t border-secondary/50 pt-3 flex justify-between">
            <span className="text-xs text-muted-foreground">مبلغ کل</span>
            <span className="font-bold text-primary text-sm">
              {Number(order.amountToman || 0).toLocaleString("fa-IR")} تومان
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-secondary/60 bg-card p-5 space-y-3">
          <h2 className="font-display text-sm font-black">جزئیات</h2>
          <Row label="نام" value={String(order.customerName)} />
          <Row label="موبایل" value={String(order.customerPhone)} dir="ltr" />
          <Row label="ایمیل" value={String(order.customerEmail || "—")} dir="ltr" />
          <Row label="آدرس" value={String(order.customerAddress || "—")} />
          <Row label="کد پیگیری" value={String(order.refId || "—")} dir="ltr" />
          {order.note && <Row label="یادداشت" value={String(order.note)} />}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, dir }: { label: string; value: string; dir?: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-left" dir={dir}>
        {value}
      </span>
    </div>
  );
}