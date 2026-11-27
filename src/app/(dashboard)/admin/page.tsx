"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, Package, ShoppingBag, FolderOpen, FileText } from "lucide-react";
import PageHero from "@/components/PageHero";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalModels: 0,
    totalCategories: 0,
    totalRequests: 0,
  });

  useEffect(() => {
    // In a real app, fetch from API
    // For now, show placeholder data
    const timer = setTimeout(() => {
      setStats({
        totalUsers: 45,
        totalProducts: 89,
        totalModels: 156,
        totalCategories: 12,
        totalRequests: 7,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const statCards = [
    { title: "کاربران ثبت‌نام", value: stats.totalUsers.toString(), icon: Users, color: "text-blue-500" },
    { title: "محصولات فروشگاه", value: stats.totalProducts.toString(), icon: ShoppingBag, color: "text-purple-500" },
    { title: "مدل‌های کاتالوگ", value: stats.totalModels.toString(), icon: Package, color: "text-orange-500" },
    { title: "دسته‌بندی‌ها", value: stats.totalCategories.toString(), icon: FolderOpen, color: "text-primary" },
    { title: "درخواست‌های مشاوره", value: stats.totalRequests.toString(), icon: FileText, color: "text-amber-500" },
  ];

  return (
    <div className="bg-background">
      <PageHero
        pageKey="admin-dashboard"
        eyebrow="پنل مدیریت"
        title="داشبورد"
        description="نمای کلی مدیریت محتوا و کاتالوگ"
      />

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        {/* Stats Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
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
      </section>
    </div>
  );
}