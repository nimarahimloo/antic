import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Package, MapPin, MessageSquare, ShoppingBag } from "lucide-react";
import { api } from "@/api/client";

const STATUS = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  failed: "ناموفق",
  cancelled: "لغو شده",
};

export default function AccountDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.account.overview();
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e.message || "بارگذاری ناموفق بود");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="font-body text-sm text-destructive">{error}</p>;
  }

  const stats = data?.stats || {};
  const name = data?.user?.full_name || data?.user?.fullName || "عزیز";

  return (
    <div>
      <h1 className="font-display text-xl font-black text-foreground">سلام، {name}</h1>
      <p className="mt-1 font-body text-xs text-muted-foreground">
        از اینجا سفارش‌ها، آدرس‌ها و اطلاعات حساب‌تان را مدیریت کنید.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard icon={Package} label="سفارش‌ها" value={stats.orders ?? 0} to="/account/orders" />
        <StatCard icon={MapPin} label="آدرس‌ها" value={stats.addresses ?? 0} to="/account/addresses" />
        <StatCard icon={MessageSquare} label="درخواست مشاوره" value={stats.requests ?? 0} to="/account/requests" />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/shop" className="btn-gold">
          <ShoppingBag className="h-4 w-4" /> ادامه خرید
        </Link>
        <Link to="/account/orders" className="btn-ghost-gold">
          مشاهده سفارش‌ها
        </Link>
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-black text-foreground">آخرین سفارش‌ها</h2>
          <Link to="/account/orders" className="font-body text-xs text-primary">
            همه
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-secondary/60 bg-card">
          {!data?.recentOrders?.length ? (
            <p className="px-4 py-12 text-center font-body text-sm text-muted-foreground">
              هنوز سفارشی ثبت نکرده‌اید.
            </p>
          ) : (
            <ul className="divide-y divide-secondary/40">
              {data.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    to={`/account/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-background/50"
                  >
                    <div>
                      <p className="font-body text-xs font-bold text-foreground">
                        #{o.id.slice(-6).toUpperCase()}
                      </p>
                      <p className="font-body text-[11px] text-muted-foreground">
                        {STATUS[o.status] || o.status} ·{" "}
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleDateString("fa-IR")
                          : "—"}
                      </p>
                    </div>
                    <p className="font-body text-xs font-bold text-primary">
                      {Number(o.amountToman || 0).toLocaleString("fa-IR")} تومان
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, to }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-secondary/60 bg-card p-4 transition-colors hover:border-primary/50"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-display text-lg font-black text-foreground">{value}</p>
          <p className="font-body text-[11px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </Link>
  );
}
