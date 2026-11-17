import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { api } from "@/api/client";

const STATUS = {
  pending: { label: "در انتظار پرداخت", cls: "text-accent border-accent/40" },
  paid: { label: "پرداخت‌شده", cls: "text-emerald-500 border-emerald-500/40" },
  failed: { label: "ناموفق", cls: "text-destructive border-destructive/40" },
  cancelled: { label: "لغو شده", cls: "text-muted-foreground border-secondary" },
};

export default function AccountOrders() {
  const { id } = useParams();
  if (id) return <OrderDetail id={id} />;
  return <OrderList />;
}

function OrderList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.account
      .orders()
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
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
            <Link to="/shop" className="text-primary">
              فروشگاه
            </Link>{" "}
            خرید کنید.
          </p>
        ) : (
          <ul className="divide-y divide-secondary/40">
            {rows.map((o) => {
              const st = STATUS[o.status] || { label: o.status, cls: "" };
              return (
                <li key={o.id}>
                  <Link
                    to={`/account/orders/${o.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-background/40"
                  >
                    <div>
                      <p className="font-body text-xs font-bold text-foreground">
                        سفارش #{o.id.slice(-6).toUpperCase()}
                      </p>
                      <p className="mt-1 font-body text-[11px] text-muted-foreground">
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleDateString("fa-IR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "—"}
                        {" · "}
                        {(o.items || []).length} قلم
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

function OrderDetail({ id }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.account
      .order(id)
      .then(setOrder)
      .catch((e) => setError(e.message || "خطا"))
      .finally(() => setLoading(false));
  }, [id]);

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

  const st = STATUS[order.status] || { label: order.status, cls: "" };

  return (
    <div>
      <Link to="/account/orders" className="mb-4 inline-flex items-center gap-1 font-body text-xs text-muted-foreground hover:text-primary">
        <ArrowRight className="h-3.5 w-3.5" /> بازگشت به سفارش‌ها
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-black text-foreground">
            سفارش #{order.id.slice(-6).toUpperCase()}
          </h1>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            {order.createdAt ? new Date(order.createdAt).toLocaleString("fa-IR") : ""}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs ${st.cls}`}>{st.label}</span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-secondary/60 bg-card p-5">
          <h2 className="font-display text-sm font-black">اقلام</h2>
          <ul className="mt-3 space-y-3">
            {(order.items || []).map((it, i) => (
              <li key={i} className="flex items-center gap-3">
                {it.image ? (
                  <img src={it.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-background" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-xs font-bold">{it.name}</p>
                  <p className="font-body text-[11px] text-muted-foreground">
                    {it.quantity} × {Number(it.unitPrice || 0).toLocaleString("fa-IR")} تومان
                  </p>
                </div>
              </li>
            ))}
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
          <Row label="نام" value={order.customerName} />
          <Row label="موبایل" value={order.customerPhone} dir="ltr" />
          <Row label="ایمیل" value={order.customerEmail || "—"} dir="ltr" />
          <Row label="آدرس" value={order.customerAddress || "—"} />
          <Row label="کد پیگیری" value={order.refId || "—"} dir="ltr" />
          {order.note && <Row label="یادداشت" value={order.note} />}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, dir }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-left" dir={dir}>
        {value}
      </span>
    </div>
  );
}
