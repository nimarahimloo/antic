import { useLocation } from "react-router-dom";
import FloatingBot from "@/components/agent/FloatingBot";

const STARTERS_BY_PATH = {
  "/admin": ["خلاصه وضعیت", "لیست مدل‌ها", "راهنمای دستورات"],
  "/admin/models": ["لیست مدل‌ها", "افزودن مدل کد: NEW-1 نام: تست دسته: roman"],
  "/admin/window": ["لیست قالب‌ها", "راهنمای دستورات"],
  "/admin/categories": ["لیست دسته کاتالوگ", "افزودن دسته کاتالوگ نام: تست شناسه: test-cat"],
  "/admin/projects": ["لیست نمونه اجرا", "افزودن نمونه اجرا عنوان: پروژه تست دسته: living"],
  "/admin/portfolio-categories": ["لیست دسته نمونه", "افزودن دسته نمونه نام: تست شناسه: test-p"],
  "/admin/products": ["لیست محصول", "افزودن محصول نام: تست شناسه: test-p قیمت: 1000"],
  "/admin/orders": ["لیست سفارش‌ها"],
  "/admin/requests": ["لیست درخواست‌ها"],
  "/admin/settings": ["خلاصه وضعیت"],
};

function startersFor(path) {
  if (STARTERS_BY_PATH[path]) return STARTERS_BY_PATH[path];
  for (const [k, v] of Object.entries(STARTERS_BY_PATH)) {
    if (path.startsWith(k) && k !== "/admin") return v;
  }
  return ["خلاصه وضعیت", "راهنمای دستورات"];
}

function labelFor(path) {
  const map = {
    "/admin": "داشبورد",
    "/admin/models": "مدل‌های پرده",
    "/admin/window": "قالب نصب",
    "/admin/categories": "دسته‌بندی",
    "/admin/portfolio-categories": "دسته نمونه‌ها",
    "/admin/projects": "نمونه‌های اجرا",
    "/admin/products": "فروشگاه",
    "/admin/orders": "سفارش‌ها",
    "/admin/requests": "درخواست‌ها",
    "/admin/settings": "تنظیمات",
  };
  return map[path] || path;
}

export default function AdminAssistant() {
  const { pathname } = useLocation();
  const page = labelFor(pathname);
  const context = {
    path: pathname,
    page,
    role: "admin",
  };

  return (
    <FloatingBot
      mode="admin"
      agentName="admin_assistant"
      storageKey={`antic_bot_admin_v3_${pathname.split("/")[2] || "root"}`}
      title="دستیار ادمین"
      subtitle={`${page} · آنلاین`}
      context={context}
      starters={startersFor(pathname)}
      accentClass="bg-foreground text-background"
      allowImage
    />
  );
}
