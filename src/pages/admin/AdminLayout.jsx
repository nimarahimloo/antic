import { NavLink, Outlet, Link } from "react-router-dom";
import AdminAssistant from "@/components/agent/AdminAssistant";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Layers,
  FolderKanban,
  ListTree,
  Inbox,
  ExternalLink,
  LogOut,
  Loader2,
  AppWindow,
  Settings,
  ShoppingBag,
  Package,
} from "lucide-react";

const MENU = [
  { to: "/admin", label: "داشبورد", icon: LayoutDashboard, end: true },
  { to: "/admin/requests", label: "درخواست‌های مشاوره", icon: Inbox },
  { to: "/admin/models", label: "مدل‌های پرده", icon: Layers },
  { to: "/admin/projects", label: "پروژه‌ها", icon: FolderKanban },
  { to: "/admin/categories", label: "دسته‌بندی‌ها", icon: ListTree },
  { to: "/admin/products", label: "محصولات فروشگاه", icon: ShoppingBag },
  { to: "/admin/orders", label: "سفارش‌ها", icon: Package },
  { to: "/admin/window", label: "پنجرهٔ مجازی", icon: AppWindow },
  { to: "/admin/settings", label: "تنظیمات", icon: Settings },
];

export default function AdminLayout() {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-5 text-center">
        <h1 className="font-display text-2xl font-black text-foreground">دسترسی محدود</h1>
        <p className="font-body text-sm leading-7 text-muted-foreground">
          این بخش فقط برای مدیران سایت قابل دسترسی است.
        </p>
        <Link to="/login" className="btn-gold">
          ورود
        </Link>
        <Link to="/" className="btn-ghost-gold">
          بازگشت به سایت
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-secondary/60 bg-card/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/50 font-display text-sm font-bold text-primary">
              پ
            </span>
            <span className="font-display text-sm font-black text-foreground">پنل مدیریت پرده آنتیک</span>
          </div>
          <div className="flex items-center gap-5">
            <Link
              to="/"
              className="flex items-center gap-1.5 font-body text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" /> مشاهده سایت
            </Link>
            <button
              onClick={() => base44.auth.logout(window.location.origin + "/")}
              className="flex items-center gap-1.5 font-body text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" /> خروج
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 lg:flex-row lg:px-10">
        <aside className="lg:w-60 lg:shrink-0">
          <nav className="flex gap-2 overflow-x-auto no-scrollbar lg:flex-col lg:gap-1.5 lg:overflow-visible">
            {MENU.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2.5 rounded-xl border px-4 py-2.5 font-body text-xs transition-colors ${
                    isActive
                      ? "border-primary bg-primary/10 font-bold text-primary"
                      : "border-secondary/60 text-muted-foreground hover:border-primary/60 hover:text-primary"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
      <AdminAssistant />
    </div>
  );
}
