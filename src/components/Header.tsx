"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, LogIn, User, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import GlobalSearch from "@/components/GlobalSearch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "خانه", to: "/" },
  { label: "کاتالوگ", to: "/catalog" },
  { label: "نمونه‌های اجرا", to: "/projects" },
  { label: "فروشگاه", to: "/shop" },
  { label: "درباره ما", to: "/about" },
  { label: "تماس", to: "/contact" },
];

const DEFAULT_LOGO = "/brand/mark.svg";

function isActivePath(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated, appPublicSettings } = useAuth();
  const isAdmin = Boolean(isAuthenticated && user?.role === "admin");
  const isUser = Boolean(isAuthenticated && user && user.role !== "admin");
  const logoSrc =
    appPublicSettings?.public_settings?.logo_url ||
    appPublicSettings?.public_settings?.logoUrl ||
    DEFAULT_LOGO;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-500",
        scrolled
          ? "bg-background/85 backdrop-blur-xl border-b border-secondary/60 shadow-sm"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-5 lg:px-10">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5 sm:gap-3">
          <img
            src={logoSrc}
            alt="Antic Curtain"
            className="h-9 w-9 object-contain transition-transform group-hover:scale-105 sm:h-11 sm:w-11"
            width={44}
            height={44}
          />
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-display text-lg font-bold text-foreground">پرده آنتیک</span>
            <span className="font-body text-[10px] tracking-wider text-primary">ANTIC CURTAIN</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="منوی اصلی">
          {NAV.map((item) => {
            const active = isActivePath(pathname, item.to);
            return (
              <Link
                key={item.label}
                href={item.to}
                className={cn(
                  "font-body text-sm transition-colors",
                  active
                    ? "font-semibold text-primary"
                    : "text-foreground/75 hover:text-primary"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-2.5">
          <GlobalSearch compact className="hidden max-w-[min(100%,18rem)] flex-1 sm:block sm:flex-none" />
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 font-display text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground md:inline-flex"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              پنل مدیریت
            </Link>
          )}
          {isUser && (
            <Link
              href="/account"
              className="hidden items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 font-display text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:inline-flex"
            >
              <User className="h-3.5 w-3.5" />
              حساب من
            </Link>
          )}
          {!isAuthenticated && (
            <Link
              href="/login"
              className="hidden items-center gap-1.5 rounded-full border border-secondary px-3 py-1.5 font-body text-xs text-foreground/80 transition-colors hover:border-primary hover:text-primary sm:inline-flex"
            >
              <LogIn className="h-3.5 w-3.5" />
              ورود
            </Link>
          )}

          <a 
            href="/contact"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            aria-label="تماس با ما"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35-.03.74-.25 1.02l-2.2 2.2z"/></svg>
          </a>

          <button
            type="button"
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-full border transition-colors lg:hidden",
              open
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-secondary text-foreground hover:border-primary/50 hover:text-primary"
            )}
            onClick={() => setOpen(true)}
            aria-label="باز کردن منو"
            aria-expanded={open}
            aria-controls="mobile-nav-drawer"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          id="mobile-nav-drawer"
          className="flex w-[min(100vw-3rem,20rem)] flex-col gap-0 border-l border-secondary/50 bg-background p-0 sm:max-w-sm [&>button]:hidden fixed right-0 top-0 h-full z-50"
        >
          <SheetHeader className="space-y-0 border-b border-secondary/50 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-right">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-secondary text-foreground/80 transition-colors hover:border-primary hover:text-primary"
                aria-label="بستن منو"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="min-w-0 text-right">
                  <SheetTitle className="font-display text-base font-bold text-foreground">
                    پرده آنتیک
                  </SheetTitle>
                  <SheetDescription className="font-body text-[10px] tracking-wider text-primary">
                    ANTIC CURTAIN
                  </SheetDescription>
                </div>
                <img
                  src={logoSrc}
                  alt=""
                  className="h-10 w-10 shrink-0 object-contain"
                  width={40}
                  height={40}
                />
              </div>
            </div>
          </SheetHeader>

          <div className="border-b border-secondary/40 px-4 py-3">
            <GlobalSearch className="w-full" />
          </div>

          <nav
            className="flex-1 overflow-y-auto overscroll-contain px-2 py-3"
            aria-label="منوی موبایل"
          >
            <ul className="flex flex-col gap-0.5">
              {NAV.map((item) => {
                const active = isActivePath(pathname, item.to);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl px-3 py-3 font-body text-[15px] transition-colors",
                        active
                          ? "bg-primary/12 font-semibold text-primary"
                          : "text-foreground/90 hover:bg-secondary/40 hover:text-foreground"
                      )}
                    >
                      <span>{item.label}</span>
                      <ChevronLeft
                        className={cn(
                          "h-4 w-4 shrink-0 opacity-40",
                          active && "opacity-80 text-primary"
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="my-3 border-t border-secondary/40" />

            <ul className="flex flex-col gap-0.5">
              {isAdmin && (
                <li>
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-3 font-display text-[15px] font-bold text-primary transition-colors hover:bg-primary/10"
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    پنل مدیریت
                  </Link>
                </li>
              )}
              {isUser && (
                <li>
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-3 font-display text-[15px] font-bold text-primary transition-colors hover:bg-primary/10"
                  >
                    <User className="h-4 w-4 shrink-0" />
                    حساب کاربری
                  </Link>
                </li>
              )}
              {!isAuthenticated && (
                <li>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-3 font-body text-[15px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <LogIn className="h-4 w-4 shrink-0" />
                    ورود / ثبت‌نام
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <div className="border-t border-secondary/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center">
            <p className="font-body text-[11px] text-muted-foreground">
              طراحی و اجرای پرده لوکس
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}