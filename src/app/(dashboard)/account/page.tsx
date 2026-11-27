"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Package, MapPin, FileText, User, Settings, ArrowRight, CheckCircle, Clock, XCircle, Truck } from "lucide-react";
import PageHero from "@/components/PageHero";
import { useAuth } from "@/lib/AuthContext";

export default function AccountDashboardPage() {
  const [orders, setOrders] = useState([] as Array<{ id: string; total: number; status: string; date: string; items: number }>);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // In a real app, fetch from API
    const timer = setTimeout(() => {
      setOrders([
        { id: "ORD-002", total: 125000000, status: "completed", date: "۱۴۰۳/۰۶/۱۴", items: 3 },
        { id: "ORD-003", total: 78000000, status: "processing", date: "۱۴۰۳/۰۶/۱۳", items: 1 },
        { id: "ORD-005", total: 34000000, status: "cancelled", date: "۱۴۰۳/۰۶/۱۱", items: 2 },
      ]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const formatToman = (amount: number) =>
    new Intl.NumberFormat("fa-IR").format(Math.round(amount)) + " تومان";

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    pending: { icon: <Clock className="h-3 w-3" />, label: "در انتظار", className: "bg-amber-100 text-amber-700" },
    processing: { icon: <Truck className="h-3 w-3" />, label: "در حال پردازش", className: "bg-blue-100 text-blue-700" },
    completed: { icon: <CheckCircle className="h-3 w-3" />, label: "تکمیل شده", className: "bg-emerald-100 text-emerald-700" },
    cancelled: { icon: <XCircle className="h-3 w-3" />, label: "لغو شده", className: "bg-red-100 text-red-700" },
  };

  const quickActions = [
    { label: "سفارش جدید", href: "/shop", icon: Package, color: "text-primary" },
    { label: "آدرس‌ها", href: "/account/addresses", icon: MapPin, color: "text-blue-500" },
    { label: "درخواست‌ها", href: "/account/requests", icon: FileText, color: "text-amber-500" },
    { label: "تنظیمات پروفایل", href: "/account/profile", icon: Settings, color: "text-emerald-500" },
  ];

  return (
    <div className="bg-background">
      <PageHero
        pageKey="account-dashboard"
        eyebrow="حساب کاربری"
        title="داشبورد"
        description={user?.fullName ? `خوش آمدید، ${user.fullName}` : "مدیریت سفارش‌ها و اطلاعات حساب"}
      />

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        {/* Welcome Card */}
        <Card className="mb-8 p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex flex-col items-center text-center lg:flex-row lg:items-center lg:justify-between lg:text-right">
            <div className="mb-4 lg:mb-0 lg:mr-8">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-3">
                {user?.fullName?.charAt(0) || "ا"}
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                {user?.fullName || "کاربر عزیز"}
              </h2>
              <p className="font-body text-sm text-muted-foreground mt-1">{user?.email}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/account/orders" className="btn-ghost-gold">
                <Package className="h-4 w-4 mr-2" /> سفارش‌ها
              </Link>
              <Link href="/account/profile" className="btn-ghost-gold">
                <User className="h-4 w-4 mr-2" /> پروفایل
              </Link>
            </div>
          </div>
        </Card>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-5">
            <h3 className="font-display text-lg font-black text-foreground">دسترسی سریع</h3>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 rounded-xl border border-secondary/60 bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="font-body text-sm font-medium text-foreground">{action.label}</span>
                </Link>
              ))}
            </div>

            {/* Stats */}
            <Card className="mt-8 p-5">
              <h3 className="font-display text-lg font-black text-foreground mb-4">نمای کلی</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm text-muted-foreground">سفارش‌های فعال</span>
                  <span className="font-display font-bold text-primary">{orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm text-muted-foreground">تاریخ عضویت</span>
                  <span className="font-display font-bold text-foreground">{user?.createdDate ? new Date(user.createdDate).toLocaleDateString("fa-IR") : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm text-muted-foreground">مجموع خریدها</span>
                  <span className="font-display font-bold text-foreground">{formatToman(orders.reduce((sum, o) => sum + o.total, 0))}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-black text-foreground">آخرین سفارش‌ها</h3>
              <Link href="/account/orders" className="font-body text-sm text-primary hover:underline flex items-center gap-1">
                مشاهده همه <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loading ? (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-secondary/60 bg-background/50">
                        <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">کد سفارش</th>
                        <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">تاریخ</th>
                        <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">مبلغ</th>
                        <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">وضعیت</th>
                        <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="border-b border-secondary/40 animate-pulse">
                          <td className="px-6 py-4"><div className="h-4 w-24 bg-secondary/30 rounded" /></td>
                          <td className="px-6 py-4"><div className="h-4 w-24 bg-secondary/30 rounded" /></td>
                          <td className="px-6 py-4"><div className="h-4 w-24 bg-secondary/30 rounded" /></td>
                          <td className="px-6 py-4"><div className="h-4 w-20 bg-secondary/30 rounded" /></td>
                          <td className="px-6 py-4"><div className="h-4 w-16 bg-secondary/30 rounded" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : orders.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-secondary/60 bg-background/50">
                        <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">کد سفارش</th>
                        <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">تاریخ</th>
                        <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">مبلغ</th>
                        <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">وضعیت</th>
                        <th className="text-right px-6 py-3 font-body text-xs font-semibold text-muted-foreground">عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const status = statusConfig[order.status] || statusConfig.pending;
                        return (
                          <tr key={order.id} className="border-b border-secondary/40 hover:bg-background/50">
                            <td className="px-6 py-4 font-display text-sm font-bold text-foreground">{order.id}</td>
                            <td className="px-6 py-4 font-body text-sm text-muted-foreground">{order.date}</td>
                            <td className="px-6 py-4 font-display text-sm font-bold text-primary">{formatToman(order.total)}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[10px] font-bold ${status.className}`}>
                                {status.icon} {status.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Link href={`/account/orders/${order.id}`} className="font-body text-xs text-primary hover:underline">مشاهده</Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-display text-lg font-bold text-foreground mb-2">سفارشی یافت نشد</h3>
                <p className="font-body text-sm text-muted-foreground mb-6">هنوز سفارشی ثبت نکرده‌اید.</p>
                <Link href="/shop" className="btn-gold inline-flex">خرید اولین محصول</Link>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}