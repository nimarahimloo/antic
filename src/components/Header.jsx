import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LayoutDashboard, LogIn } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import GlobalSearch from "@/components/GlobalSearch";

const NAV = [
  { label: "خانه", to: "/" },
  { label: "کاتالوگ", to: "/catalog" },
  { label: "نمونه‌های اجرا", to: "/projects" },
  { label: "فروشگاه", to: "/shop" },
  { label: "درباره ما", to: "/about" },
  { label: "تماس", to: "/contact" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = Boolean(isAuthenticated && user?.role === "admin");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-500 ${
        scrolled
          ? "bg-background/85 backdrop-blur-xl border-b border-secondary/60"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-5 lg:px-10">
        <Link to="/" className="group flex shrink-0 items-center gap-3">
          <img
            src="/brand/mark.svg"
            alt="Antic Curtain"
            className="h-11 w-11 object-contain transition-transform group-hover:scale-105"
            width={44}
            height={44}
          />
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-display text-lg font-bold text-foreground">پرده آنتیک</span>
            <span className="font-body text-[10px] tracking-wider text-primary">ANTIC CURTAIN</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="relative font-body text-sm text-foreground/80 transition-colors hover:text-primary after:absolute after:-bottom-1.5 after:right-0 after:h-px after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <GlobalSearch compact className="max-w-[min(100%,18rem)] flex-1 sm:flex-none" />

          {isAdmin && (
            <Link
              to="/admin"
              className="hidden items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 font-display text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground md:inline-flex"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              پنل مدیریت
            </Link>
          )}
          {!isAuthenticated && (
            <Link
              to="/login"
              className="hidden items-center gap-1.5 rounded-full border border-secondary px-3 py-1.5 font-body text-xs text-foreground/80 transition-colors hover:border-primary hover:text-primary sm:inline-flex"
            >
              <LogIn className="h-3.5 w-3.5" />
              ورود
            </Link>
          )}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border border-secondary text-foreground lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="منو"
            type="button"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-secondary/60 bg-background/95 px-5 py-4 backdrop-blur-xl lg:hidden">
          <div className="mb-4">
            <GlobalSearch className="w-full" />
          </div>
          <nav className="flex flex-col gap-3">
            {NAV.map((item) => (
              <Link key={item.label} to={item.to} className="font-body text-sm text-foreground">
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" className="font-display text-sm font-bold text-primary">
                پنل مدیریت
              </Link>
            )}
            {!isAuthenticated && (
              <Link to="/login" className="font-body text-sm text-primary">
                ورود / ثبت‌نام
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
