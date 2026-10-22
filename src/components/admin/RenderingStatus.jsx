import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Check, X, Clock, Layers, Loader2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function RenderingStatus() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.CurtainModel.count({}),
      base44.entities.CurtainModel.count({ install_status: "approved" }),
      base44.entities.CurtainModel.count({ install_status: "rejected" }),
    ])
      .then(([total, approved, rejected]) =>
        setStats({ total, approved, rejected, pending: total - approved - rejected })
      )
      .catch(() => setStats({ total: 0, approved: 0, rejected: 0, pending: 0 }));
  }, []);

  const cards = [
    { label: "کل مدل‌ها", value: stats?.total, icon: Layers, color: "text-foreground" },
    { label: "تأییدشده (نمایش)", value: stats?.approved, icon: Check, color: "text-primary" },
    { label: "ردشده", value: stats?.rejected, icon: X, color: "text-destructive" },
    { label: "در انتظار رندر", value: stats?.pending, icon: Clock, color: "text-muted-foreground" },
  ];

  return (
    <div className="rounded-2xl border border-secondary/60 bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-sm font-black text-foreground">موتور رندرینگ پرده</h2>
          <p className="mt-1 font-body text-xs text-muted-foreground">وضعیت تولید نماهای واقعی هوشمند</p>
        </div>
        <Link
          to="/admin/window"
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 font-body text-[11px] text-primary transition-colors hover:bg-primary/10"
        >
          <Sparkles className="h-3 w-3" /> مدیریت رندرها
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-secondary/60 bg-background p-3">
            <c.icon className={`h-4 w-4 ${c.color}`} />
            <p className="mt-2 font-display text-xl font-black text-foreground">
              {stats ? c.value : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </p>
            <p className="font-body text-[10px] text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 font-body text-[11px] leading-5 text-muted-foreground">
        نماهای واقعی هنگام بازدید مشتری یک‌بار ساخته و بازبینی می‌شوند؛ فقط نماهای تأییدشده نمایش داده می‌شوند.
        برای ساخت دستی یا بازبینی دوباره به بخش «پنجرهٔ مجازی» بروید.
      </p>
    </div>
  );
}