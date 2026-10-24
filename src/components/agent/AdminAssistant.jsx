import { useLocation } from "react-router-dom";
import FloatingBot from "@/components/agent/FloatingBot";

const STARTERS_BY_PATH = {
  "/admin": ["خلاصه وضعیت", "لیست مدل‌ها", "درخواست‌های مشاوره"],
  "/admin/models": ["لیست مدل‌ها", "چطور مدل اضافه کنم؟"],
  "/admin/window": ["برای رومن قالب بساز", "راهنمای chroma"],
  "/admin/categories": ["لیست دسته‌ها", "دسته جدید نام: زبرا شناسه: zebra"],
  "/admin/projects": ["راهنمای نمونه اجرا"],
  "/admin/portfolio-categories": ["دسته نمونه‌های اجرا"],
  "/admin/products": ["محصولات فروشگاه"],
  "/admin/orders": ["آخرین سفارش‌ها"],
  "/admin/requests": ["درخواست‌های مشاوره"],
  "/admin/settings": ["تنظیمات ضروری"],
};

function startersFor(path) {
  if (STARTERS_BY_PATH[path]) return STARTERS_BY_PATH[path];
  for (const [k, v] of Object.entries(STARTERS_BY_PATH)) {
    if (path.startsWith(k) && k !== "/admin") return v;
  }
  return ["خلاصه وضعیت", "لیست مدل‌ها"];
}

function labelFor(path) {
  const map = {
    "/admin": "داشبورد",
    "/admin/models": "مدل‌های پرده",
    "/admin/window": "پنجره مجازی",
    "/admin/categories": "دسته‌بندی کاتالوگ",
    "/admin/portfolio-categories": "دسته نمونه‌ها",
    "/admin/projects": "نمونه‌های اجرا",
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
      subtitle={`الان: ${labelFor(pathname)} · خواندن و نوشتن DB`}
      context={context}
      starters={startersFor(pathname)}
      accentClass="bg-foreground text-background"
      allowImage
    />
  );
}
