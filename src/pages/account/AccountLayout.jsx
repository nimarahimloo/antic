import { NavLink, Outlet, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  Package,
  User,
  MapPin,
  MessageSquare,
  LogOut,
  Loader2,
  ExternalLink,
  ShoppingBag,
} from "lucide-react";

const MENU = [
  { to: "/account", label: "خلاصه حساب", icon: LayoutDashboard, end: true },
  { to: "/account/orders", label: "سفارش‌ها", icon: Package },
  { to: "/account/addresses", label: "آدرس‌ها", icon: MapPin },
  { to: "/account/requests", label: "درخواست‌های مشاوره", icon: MessageSquare },
  { to: "/account/profile", label: "پروفایل و امنیت", icon: User },
];

export default function AccountLayout() {
  const { user, isLoadingAuth, isAuthenticated, logout } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login?returnTo=/account" replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  const displayName = user.full_name || user.fullName || user.email || user.phone || "کاربر";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-secondary/60 bg-card/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/50 font-display text-sm font-bold text-primary">
              {String(displayName).charAt(0)}
            </span>
            <div className="leading-tight">
              <p className="font-display text-sm font-black text-foreground">حساب کاربری</p>
              <p className="font-body text-[11px] text-muted-foreground">{displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/shop" className="hidden items-center gap-1.5 font-body text-xs text-muted-foreground hover:text-primary sm:flex">
              <ShoppingBag className="h-3.5 w-3.5" /> فروشگاه
            </Link>
            <Link to="/" className="flex items-center gap-1.5 font-body text-xs text-muted-foreground hover:text-primary">
              <ExternalLink className="h-3.5 w-3.5" /> سایت
            </Link>
            <button
              type="button"
              onClick={() => logout(true)}
              className="flex items-center gap-1.5 font-body text-xs text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" /> خروج
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 lg:flex-row lg:px-10">
        <aside className="lg:w-56 lg:shrink-0">
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
    </div>
  );
}
