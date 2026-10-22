import { motion } from "framer-motion";
import { Home, ShoppingBag, Images, Phone } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const TABS = [
  { to: "/", label: "خانه", icon: Home },
  { to: "/catalog", label: "کاتالوگ", icon: Images },
  { to: "/shop", label: "فروشگاه", icon: ShoppingBag },
  { to: "/contact", label: "تماس", icon: Phone },
];

export default function BottomTabBar() {
  const location = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex md:hidden border-t border-border bg-background/95 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="ناوبری پایین"
    >
      {TABS.map((tab) => {
        const isActive =
          tab.to === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(tab.to);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.to}
            to={tab.to}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
            style={{ minHeight: 44 }}
          >
            {isActive && (
              <motion.span
                layoutId="bottom-tab-indicator"
                className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <motion.div
              animate={{ scale: isActive ? 1.12 : 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Icon
                className={`h-5 w-5 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </motion.div>
            <span
              className={`font-body text-[10px] leading-none ${
                isActive ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}