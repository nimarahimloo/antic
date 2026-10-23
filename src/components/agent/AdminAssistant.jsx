import { useLocation } from "react-router-dom";
import FloatingBot from "@/components/agent/FloatingBot";

const STARTERS_BY_PATH = {
  "/admin": ["خلاصه وضعیت سایت؟", "الان باید چیکار کنم؟"],
  "/admin/models": ["چطور مدل پارچه اضافه کنم؟", "برچسب روی عکس پارچه چی بشه؟"],
  "/admin/window": ["برای رومن قالب بساز", "قالب chroma یعنی چی؟"],
  "/admin/categories": ["دسته رومن چطور تنظیم بشه؟"],
  "/admin/projects": ["متن معرفی پروژه بنویس"],
  "/admin/products": ["توضیح محصول فروشگاهی بنویس"],
  "/admin/orders": ["سفارش‌های باز چی‌ان؟"],
  "/admin/requests": ["درخواست‌های مشاوره جدید؟"],
  "/admin/settings": ["تنظیمات ضروری چی‌ان؟"],
};

function startersFor(path) {
  if (STARTERS_BY_PATH[path]) return STARTERS_BY_PATH[path];
  for (const [k, v] of Object.entries(STARTERS_BY_PATH)) {
    if (path.startsWith(k) && k !== "/admin") return v;
  }
  return ["کمک در این صفحه", "راهنمای پنل ادمین"];
}

function labelFor(path) {
  const map = {
    "/admin": "داشبورد",
    "/admin/models": "مدل‌های پرده",
    "/admin/window": "پنجره مجازی / قالب",
    "/admin/categories": "دسته‌ها",
    "/admin/projects": "پروژه‌ها",
    "/admin/products": "محصولات",
    "/admin/orders": "سفارش‌ها",
    "/admin/requests": "درخواست مشاوره",
    "/admin/settings": "تنظیمات",
  };
  return map[path] || path;
}

export default function AdminAssistant() {
  const { pathname } = useLocation();
  const context = {
    path: pathname,
    page: labelFor(pathname),
    role: "admin",
  };

  return (
    <FloatingBot
      mode="admin"
      agentName="admin_assistant"
      storageKey={`antic_bot_admin_${pathname.split("/")[2] || "root"}`}
      title="دستیار ادمین آنتیک"
      subtitle={`الان: ${labelFor(pathname)}`}
      context={context}
      starters={startersFor(pathname)}
      accentClass="bg-foreground text-background"
    />
  );
}
