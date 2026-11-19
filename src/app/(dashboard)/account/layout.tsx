"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Package, MapPin, Settings, LogOut, ChevronLeft, FileText } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
const ACCOUNT_NAV = [
  { label: "داشبورد", href: "/account", icon: User },
  { label: "سفارش‌ها", href: "/account/orders", icon: Package },
  { label: "آدرس‌ها", href: "/account/addresses", icon: MapPin },
  { label: "درخواست‌ها", href: "/account/requests", icon: FileText },
  { label: "پروفایل", href: "/account/profile", icon: Settings },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const isUser = Boolean(isAuthenticated && user && user.role !== "admin");

  useEffect(() => {
    if (!isUser) {
      router.push("/login?returnTo=/account");
    }
  }, [isUser, router]);

  if (!isUser) {
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
        aria-label="منوی حساب کاربری"
      >
        <div className="flex h-16 items-center justify-between border-b border-secondary/60 px-4 lg:px-6">
          <Link href="/account" className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-foreground">حساب کاربری</span>
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

        <nav className="flex-1 overflow-y-auto p-4 lg:p-6" aria-label="منوی اصلی حساب کاربری">
          <div className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-primary/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {user?.full_name?.charAt(0) || "ا"}
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-foreground truncate">{user?.full_name}</p>
              <p className="font-body text-[11px] text-primary truncate">{user?.email}</p>
            </div>
          </div>

          <ul className="space-y-1">
            {ACCOUNT_NAV.map((item) => {
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
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <span className="hidden font-body text-sm text-muted-foreground lg:block">
              {user?.full_name}
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