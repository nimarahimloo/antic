"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { api } from "@/api";
import { apiErrorMessage } from "@/lib/apiError";

const STATUS = {
  pending: { label: "در انتظار پرداخت", cls: "text-accent border-accent/40" },
  paid: { label: "پرداخت‌شده", cls: "text-emerald-500 border-emerald-500/40" },
  failed: { label: "ناموفق", cls: "text-destructive border-destructive/40" },
  cancelled: { label: "لغو شده", cls: "text-muted-foreground border-secondary" },
};

export default function AccountOrdersPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.account
      .orders()
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch((err) => {
        console.error("Failed to load orders:", apiErrorMessage(err));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-display text-xl font-black text-foreground">سفارش‌های من</h1>
      <p className="mt-1 font-body text-xs text-muted-foreground">
        {loading ? "…" : `${rows.length} سفارش`}
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-secondary/60 bg-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-16 text-center font-body text-sm text-muted-foreground">
            سفارشی یافت نشد. از{" "}
            <Link href="/shop" className="text-primary">
              فروشگاه
            </Link>{" "}
            خرید کنید.
          </p>
        ) : (
          <ul className="divide-y divide-secondary/40">
            {rows.map((o) => {
              const statusKey = String(o.status) as keyof typeof STATUS;
              const st = STATUS[statusKey] || { label: String(o.status), cls: "" };
              return (
                <li key={String(o.id)}>
                  <Link
                    href={`/account/orders/${o.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-background/40"
                  >
                    <div>
                      <p className="font-body text-xs font-bold text-foreground">
                        سفارش #{String(o.id).slice(-6).toUpperCase()}
                      </p>
                      <p className="mt-1 font-body text-[11px] text-muted-foreground">
                        {o.createdAt
                          ? new Date(String(o.createdAt)).toLocaleDateString("fa-IR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "—"}
                        {" · "}
                        {Array.isArray(o.items) ? o.items.length : 0} قلم
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] ${st.cls}`}>{st.label}</span>
                      <span className="font-body text-xs font-bold text-primary">
                        {Number(o.amountToman || 0).toLocaleString("fa-IR")} ت
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}