import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api } from "@/api/client";

const STATUS = {
  new: "جدید",
  contacted: "تماس گرفته شد",
  done: "پایان‌یافته",
};

export default function AccountRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.account
      .requests()
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-display text-xl font-black text-foreground">درخواست‌های مشاوره</h1>
      <p className="mt-1 font-body text-xs text-muted-foreground">
        درخواست‌هایی که با شماره یا ایمیل شما ثبت شده‌اند
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-secondary/60 bg-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">
            درخواستی یافت نشد. از صفحه{" "}
            <Link to="/contact" className="text-primary">
              تماس
            </Link>{" "}
            درخواست بفرستید.
          </p>
        ) : (
          <ul className="divide-y divide-secondary/40">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-body text-xs font-bold text-foreground">{r.name}</p>
                  <span className="rounded-full border border-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                    {STATUS[r.status] || r.status}
                  </span>
                </div>
                <p className="mt-1 font-body text-[11px] text-muted-foreground">
                  {r.space_type || r.spaceType || "—"}
                  {" · "}
                  {r.created_date || r.createdAt
                    ? new Date(r.created_date || r.createdAt).toLocaleDateString("fa-IR")
                    : ""}
                </p>
                {r.message && (
                  <p className="mt-2 font-body text-xs text-foreground/80 line-clamp-2">{r.message}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
