import { useMemo } from "react";
import { Key, Globe, Sparkles, AlertCircle } from "lucide-react";

export default function AdminSettings() {
  const appUrl = useMemo(() => window.location.origin, []);

  return (
    <div>
      <h1 className="font-display text-xl font-black text-foreground">تنظیمات</h1>
      <p className="mt-1 font-body text-xs text-muted-foreground">
        وضعیت استقرار مستقل (بدون Base44 / Wix)
      </p>

      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-secondary/60 bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
              <Key className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-sm font-black text-foreground">API</h2>
              <p className="font-body text-xs text-muted-foreground">بک‌اند خود پروژه</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-secondary/60 bg-background p-3">
            <p className="font-body text-[10px] text-muted-foreground">آدرس پایه</p>
            <code className="mt-1 block overflow-x-auto font-mono text-xs text-primary" dir="ltr">
              {appUrl}/api
            </code>
          </div>
          <p className="mt-3 font-body text-[11px] text-muted-foreground">
            زرین‌پال: متغیرهای <code className="text-primary">ZARINPAL_MERCHANT_ID</code> و{" "}
            <code className="text-primary">ZARINPAL_SANDBOX</code> در فایل{" "}
            <code className="text-primary">backend/.env</code>
          </p>
        </div>

        <div className="rounded-2xl border border-secondary/60 bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-sm font-black text-foreground">آمادگی انتشار</h2>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5">
            <Item ok label="بدون وابستگی Base44 / Wix" />
            <Item ok label="فروشگاه و سبد محلی" />
            <Item ok label="پنل ادمین محصولات و سفارش‌ها" />
            <Item ok label="درگاه زرین‌پال (با Merchant ID)" />
            <Item warn label="برای پرداخت واقعی ZARINPAL_MERCHANT_ID را در سرور ست کنید" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function Item({ ok, warn, label }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border ${
          warn ? "border-accent/50 text-accent" : "border-primary/50 text-primary"
        }`}
      >
        {warn ? <AlertCircle className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
      </span>
      <span className="font-body text-xs text-foreground/90">{label}</span>
    </li>
  );
}
