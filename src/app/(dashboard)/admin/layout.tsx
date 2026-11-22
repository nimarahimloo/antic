"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingBag, FileText, Settings, LogOut, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { label: "داشبورد", href: "/admin", icon: LayoutDashboard },
  { label: "فضای کاری هوش مصنوعی", href: "/admin/workspace", icon: Sparkles },
  { label: "درخواست‌ها", href: "/admin/requests", icon: FileText },
  { label: "مدل‌ها", href: "/admin/models", icon: Package },
  { label: "پروژه‌ها", href: "/admin/projects", icon: FileText },
  { label: "دسته‌بندی‌ها", href: "/admin/categories", icon: Package },
  { label: "محصولات", href: "/admin/products", icon: ShoppingBag },
  { label: "سفارش‌ها", href: "/admin/orders", icon: Package },
  { label: "تنظیمات پنجره", href: "/admin/window", icon: Settings },
  { label: "تنظیمات", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = Boolean(isAuthenticated && user?.role === "admin");

  useEffect(() => {
    if (!isAdmin) {
      router.push("/login?returnTo=/admin");
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = () => {
    logout(true);
    router.push("/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-secondary/60 bg-background transition-transform duration-300 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="منوی مدیریت"
      >
        <div className="flex h-16 items-center justify-between border-b border-secondary/60 px-4 lg:px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-foreground">پنل مدیریت</span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-secondary/50"
            aria-label="بستن منو"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 lg:p-6" aria-label="منوی اصلی ادمین">
          <ul className="space-y-1">
            {ADMIN_NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground/90 hover:bg-secondary/40 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 border-t border-secondary/60 pt-6">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              خروج
            </button>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-0 min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-secondary/60 bg-background/85 backdrop-blur-xl px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-secondary/50"
            aria-label="باز کردن منو"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <span className="hidden font-body text-sm text-muted-foreground lg:block">
              {user?.full_name || user?.email}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              {user?.full_name?.charAt(0) || "ا"}
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}