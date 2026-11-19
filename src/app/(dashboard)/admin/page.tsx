"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, Package, ShoppingBag, DollarSign, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import PageHero from "@/components/PageHero";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalModels: 0,
    recentOrders: [] as Array<{ id: string; customer: string; total: number; status: string; date: string }>,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, fetch from API
    // For now, show placeholder data
    const timer = setTimeout(() => {
      setStats({
        totalOrders: 127,
        pendingOrders: 8,
        totalRevenue: 2450000000,
        totalUsers: 45,
        totalProducts: 89,
        totalModels: 156,
        recentOrders: [
          { id: "ORD-001", customer: "سارا محمدی", total: 45000000, status: "pending", date: "۱۴۰۳/۰۶/۱۵" },
          { id: "ORD-002", customer: "احمد رضایی", total: 125000000, status: "completed", date: "۱۴۰۳/۰۶/۱۴" },
          { id: "ORD-003", customer: "مریم حسینی", total: 78000000, status: "processing", date: "۱۴۰۳/۰۶/۱۳" },
          { id: "ORD-004", customer: "رضا کریمی", total: 210000000, status: "completed", date: "۱۴۰۳/۰۶/۱۲" },
          { id: "ORD-005", customer: "فاطمه احمدی", total: 34000000, status: "cancelled", date: "۱۴۰۳/۰۶/۱۱" },
        ],
      });
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const formatToman = (amount: number) =>
    new Intl.NumberFormat("fa-IR").format(Math.round(amount)) + " تومان";

  const statCards = [
    { title: "کل سفارش‌ها", value: stats.totalOrders.toString(), icon: Package, color: "text-primary" },
    { title: "سفارش‌های در انتظار", value: stats.pendingOrders.toString(), icon: Clock, color: "text-amber-500" },
    { title: "مجموع درآمد", value: formatToman(stats.totalRevenue), icon: DollarSign, color: "text-emerald-500" },
    { title: "کاربران ثبت‌نام", value: stats.totalUsers.toString(), icon: Users, color: "text-blue-500" },
    { title: "محصولات فروشگاه", value: stats.totalProducts.toString(), icon: ShoppingBag, color: "text-purple-500" },
    { title: "مدل‌های کاتالوگ", value: stats.totalModels.toString(), icon: Package, color: "text-orange-500" },
  ];

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    pending: { icon: <Clock className="h-3 w-3" />, label: "در انتظار", className: "bg-amber-100 text-amber-700" },
    processing: { icon: <TrendingUp className="h-3 w-3" />, label: "در حال پردازش", className: "bg-blue-100 text-blue-700" },
    completed: { icon: <CheckCircle className="h-3 w-3" />, label: "تکمیل شده", className: "bg-emerald-100 text-emerald-700" },
    cancelled: { icon: <XCircle className="h-3 w-3" />, label: "لغو شده", className: "bg-red-100 text-red-700" },
  };

  return (
    <div className="bg-background">
      <PageHero
        pageKey="admin-dashboard"
        eyebrow="پنل مدیریت"
        title="داشبورد"
        description="نمای کلی عملکرد فروشگاه و مدیریت محتوا"
      />

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        {/* Stats Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.title} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-sm text-muted-foreground">{stat.title}</p>
                  <p className="mt-1 font-display text-2xl font-black text-foreground">{stat.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Recent Orders */}
        <Card className="overflow-hidden">
          <div className="border-b border-secondary/60 px-6 py-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-black text-foreground">آخرین سفارش‌ها</h2>
            <a href="/admin/orders" className="font-body text-sm text-primary hover:underline">مشاهده همه</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary/60 bg-background/50">
                  <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">کد سفارش</th>
                  <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">مشتری</th>
                  <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">مبلغ</th>
                  <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">وضعیت</th>
                  <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">تاریخ</th>
                  <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-secondary/40 animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-secondary/30 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-32 bg-secondary/30 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-secondary/30 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 bg-secondary/30 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-secondary/30 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-secondary/30 rounded" /></td>
                    </tr>
                  ))
                ) : stats.recentOrders.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.pending;
                  return (
                    <tr key={order.id} className="border-b border-secondary/40 hover:bg-background/50">
                      <td className="px-6 py-4 font-display text-sm font-bold text-foreground">{order.id}</td>
                      <td className="px-6 py-4 font-body text-sm text-foreground">{order.customer}</td>
                      <td className="px-6 py-4 font-display text-sm font-bold text-primary">{formatToman(order.total)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[10px] font-bold ${status.className}`}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-body text-sm text-muted-foreground">{order.date}</td>
                      <td className="px-6 py-4">
                        <a href={`/admin/orders/${order.id}`} className="font-body text-xs text-primary hover:underline">مشاهده</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}