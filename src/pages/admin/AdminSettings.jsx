import { useMemo } from "react";
import { Key, Globe, Sparkles, AlertCircle, ExternalLink } from "lucide-react";
import McpServerCard from "@/components/admin/McpServerCard";
import RenderingStatus from "@/components/admin/RenderingStatus";

export default function AdminSettings() {
  const appUrl = useMemo(() => window.location.origin, []);

  return (
    <div>
      <h1 className="font-display text-xl font-black text-foreground">تنظیمات و یکپارچگی</h1>
      <p className="mt-1 font-body text-xs text-muted-foreground">
        مدیریت سرور MCP، API و موتور رندرینگ پرده
      </p>

      <div className="mt-6 space-y-6">
        <McpServerCard />
        <RenderingStatus />

        {/* API & Integration */}
        <div className="rounded-2xl border border-secondary/60 bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
              <Key className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-sm font-black text-foreground">API برنامه</h2>
              <p className="font-body text-xs text-muted-foreground">دسترسی برنامه‌نویسی به داده‌های کاتالوگ</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-secondary/60 bg-background p-3">
              <p className="font-body text-[10px] text-muted-foreground">آدرس پایه API</p>
              <code
                className="mt-1 block overflow-x-auto font-mono text-xs text-primary"
                dir="ltr"
              >
                {appUrl}/api
              </code>
            </div>

            <div className="rounded-xl border border-secondary/60 bg-background p-3">
              <p className="font-body text-[10px] text-muted-foreground">کلیدهای API</p>
              <p className="mt-1 font-body text-xs text-foreground">
                کلیدهای API برنامه در داشبورد Base44 قابل مدیریت هستند.
              </p>
              <a
                href="https://app.base44.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-body text-[11px] text-primary hover:text-accent"
              >
                باز کردن داشبورد <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Production readiness */}
        <div className="rounded-2xl border border-secondary/60 bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-sm font-black text-foreground">آمادگی انتشار</h2>
              <p className="font-body text-xs text-muted-foreground">وضعیت بستر برای اجرا روی پروداکشن</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2.5">
            <ChecklistItem ok label="صفحات احراز هویت (ورود/ثبت‌نام/بازیابی)" />
            <ChecklistItem ok label="سطح‌بندی دسترسی (RLS) برای همهٔ موجودیت‌ها" />
            <ChecklistItem ok label="پنل مدیریت اختصاصی با دسترسی ادمین" />
            <ChecklistItem ok label="کاتالوگ تعاملی با ۶۴ پارچهٔ واقعی" />
            <ChecklistItem ok label="موتور رندرینگ هوشمند با بازبینی خودکار" />
            <ChecklistItem ok label="سرور MCP عمومی برای دستیارهای AI" />
            <ChecklistItem ok label="طراحی رسپانسیو (موبایل و دسکتاپ)" />
            <ChecklistItem
              warn
              label="اعتبارات یکپارچگی — برای رندرینگ هوشمند نیاز است (در صورت اتمام، رندر مرورگری فعال است)"
            />
          </ul>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ ok, warn, label }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border ${
          warn
            ? "border-accent/50 text-accent"
            : "border-primary/50 text-primary"
        }`}
      >
        {warn ? <AlertCircle className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
      </span>
      <span className="font-body text-xs text-foreground/90">{label}</span>
    </li>
  );
}