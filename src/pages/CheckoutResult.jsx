import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_API_BASE || "/api";

export default function CheckoutResult() {
  const [params] = useSearchParams();
  const status = params.get("Status") || params.get("status");
  const orderId = params.get("orderId");
  const refId = params.get("RefID") || params.get("RefId");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(!!orderId);

  useEffect(() => {
    if (!orderId) return;
    fetch(`${API}/orders/${orderId}`)
      .then((r) => r.json())
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  const ok = status === "OK" || order?.status === "paid";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      {ok ? (
        <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
      ) : (
        <XCircle className="mx-auto h-14 w-14 text-destructive" />
      )}
      <h1 className="mt-6 font-display text-2xl font-black text-foreground">
        {ok ? "پرداخت موفق" : "پرداخت ناموفق"}
      </h1>
      <p className="mt-3 font-body text-sm leading-7 text-muted-foreground">
        {ok
          ? "سفارش شما ثبت شد. به‌زودی با شما تماس می‌گیریم."
          : "پرداخت انجام نشد یا لغو شد. می‌توانید دوباره از سبد خرید اقدام کنید."}
      </p>
      {(refId || order?.refId) && (
        <p className="mt-4 font-body text-xs text-muted-foreground" dir="ltr">
          کد پیگیری: {refId || order?.refId}
        </p>
      )}
      {orderId && (
        <p className="mt-1 font-mono text-[10px] text-muted-foreground" dir="ltr">
          order: {orderId}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/shop" className="btn-gold">
          فروشگاه
        </Link>
        <Link to="/" className="btn-ghost-gold">
          صفحه اصلی
        </Link>
      </div>
    </div>
  );
}
