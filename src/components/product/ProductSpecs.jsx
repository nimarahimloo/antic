import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function ProductSpecs({ rows }) {
  const [open, setOpen] = useState(false);
  if (!rows || rows.length === 0) return null;

  const visible = open ? rows : rows.slice(0, 4);

  return (
    <section className="overflow-hidden rounded-3xl border border-secondary/60 bg-card">
      <div className="border-b border-secondary/60 px-6 py-5 lg:px-7">
        <h2 className="font-display text-lg font-black text-foreground">مشخصات محصول</h2>
      </div>
      <table className="w-full">
        <tbody>
          {visible.map((row, i) => (
            <tr key={row.key} className={i % 2 === 0 ? "bg-background/40" : ""}>
              <td className="w-1/3 border-b border-secondary/40 px-6 py-4 align-top font-body text-xs text-muted-foreground lg:px-7">
                {row.key}
              </td>
              <td className="border-b border-secondary/40 px-6 py-4 font-display text-xs font-bold text-foreground lg:px-7">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 4 && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-center gap-2 py-4 font-body text-xs font-bold text-primary transition-colors hover:text-accent"
        >
          {open ? "بستن مشخصات" : "مشاهده همه مشخصات"}
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </section>
  );
}