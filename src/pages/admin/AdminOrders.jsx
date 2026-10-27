import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { adminToast } from "@/lib/adminToast";

const API = import.meta.env.VITE_API_BASE || "/api";

function authHeaders() {
  const t = localStorage.getItem("antic_access_token");
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

const STATUS_LABEL = {
  pending: "در انتظار",
  paid: "پرداخت‌شده",
  failed: "ناموفق",
  cancelled: "لغو",
};

export default function AdminOrders() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/orders`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id, status) {
    try {
      const res = await fetch(`${API}/orders/${id}/status`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("به‌روزرسانی وضعیت ناموفق بود");
      adminToast("update", "سفارش", STATUS_LABEL[status] || status);
      load();
    } catch (e) {
      adminToast("error", "سفارش", e?.message || "خطا در تغییر وضعیت");
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-black">سفارش‌ها</h1>
      <p className="mt-1 font-body text-xs text-muted-foreground">
        {loading ? "…" : `${rows.length} سفارش`}
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-secondary/60 bg-card">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-secondary/60">
              <th className="px-4 py-3 text-right text-xs text-muted-foreground">مشتری</th>
              <th className="px-4 py-3 text-right text-xs text-muted-foreground">مبلغ</th>
              <th className="px-4 py-3 text-right text-xs text-muted-foreground">وضعیت</th>
              <th className="px-4 py-3 text-right text-xs text-muted-foreground">پیگیری</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground">تغییر</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                  هنوز سفارشی ثبت نشده.
                </td>
              </tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id} className="border-b border-secondary/40 last:border-0">
                  <td className="px-4 py-3 text-xs">
                    <div className="font-bold">{o.customerName}</div>
                    <div className="text-muted-foreground" dir="ltr">
                      {o.customerPhone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {Number(o.amountToman).toLocaleString("fa-IR")} تومان
                  </td>
                  <td className="px-4 py-3 text-xs">{STATUS_LABEL[o.status] || o.status}</td>
                  <td className="px-4 py-3 font-mono text-[10px]" dir="ltr">
                    {o.refId || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-secondary bg-background px-2 py-1 text-[11px]"
                      value={o.status}
                      onChange={(e) => setStatus(o.id, e.target.value)}
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
