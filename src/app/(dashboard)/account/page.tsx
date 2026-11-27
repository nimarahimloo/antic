"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MapPin, FileText, User, Settings, Phone, ShoppingBag } from "lucide-react";
import PageHero from "@/components/PageHero";
import { useAuth } from "@/lib/AuthContext";

export default function AccountDashboardPage() {
  const { user } = useAuth();

  const quickActions = [
    { label: "فروشگاه اکسسوری", href: "/shop", icon: ShoppingBag, color: "text-primary" },
    { label: "تماس با ما", href: "/contact", icon: Phone, color: "text-emerald-500" },
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
        description={user?.fullName ? `خوش آمدید، ${user.fullName}` : "مدیریت اطلاعات حساب"}
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
              <Link href="/shop" className="btn-ghost-gold">
                <ShoppingBag className="h-4 w-4 mr-2" /> فروشگاه
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
                  <span className="font-body text-sm text-muted-foreground">تاریخ عضویت</span>
                  <span className="font-display font-bold text-foreground">{user?.createdDate ? new Date(user.createdDate).toLocaleDateString("fa-IR") : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm text-muted-foreground">شماره تماس</span>
                  <span className="font-display font-bold text-foreground" dir="ltr">{user?.phone || "—"}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Contact to order */}
          <div className="lg:col-span-2">
            <h3 className="font-display text-lg font-black text-foreground mb-5">ثبت سفارش</h3>
            <Card className="p-8 text-center">
              <Phone className="mx-auto h-12 w-12 text-primary mb-4" aria-hidden="true" />
              <h4 className="font-display text-lg font-bold text-foreground mb-2">سفارش فقط با تماس با ادمین</h4>
              <p className="font-body text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
                برای اطلاع از قیمت و ثبت سفارش، از طریق فرم تماس یا شماره تماس درج‌شده در سایت با ما در ارتباط باشید.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/contact" className="btn-gold inline-flex">
                  <Phone className="h-4 w-4 ml-2" /> تماس با ما
                </Link>
                <Link href="/shop" className="btn-ghost-gold inline-flex">
                  <ShoppingBag className="h-4 w-4 ml-2" /> مشاهده فروشگاه
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}