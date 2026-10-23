import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const NAV = [
  { label: "خانه", to: "/" },
  { label: "کاتالوگ", to: "/catalog" },
  { label: "پروژه‌ها", to: "/projects" },
  { label: "فروشگاه", to: "/shop" },
  { label: "درباره ما", to: "/about" },
  { label: "تماس", to: "/contact" },
  { label: "مشاور طراحی", to: "/consultant" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

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
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-10">
        <Link to="/" className="group flex items-center gap-3">
          <img
            src="/brand/mark.svg"
            alt="Antic Curtain"
            className="h-11 w-11 object-contain transition-transform group-hover:scale-105"
            width={44}
            height={44}
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold text-foreground">پرده آنتیک</span>
            <span className="font-body text-[10px] tracking-wider text-primary">ANTIC CURTAIN</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
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

        <div className="flex items-center gap-3">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border border-secondary text-foreground md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="منو"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-secondary/60 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-5 py-4">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="border-b border-secondary/40 py-3 font-body text-sm text-foreground/85"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
