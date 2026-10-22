import { Check } from "lucide-react";
import FabricSwatch from "@/components/catalog/FabricSwatch";

export default function CatalogCard({ model, active, onClick }) {
  // Prefer approved install sample, else fabric photo, else synthetic swatch
  const thumb =
    model.install_status === "approved" && model.install_image
      ? model.install_image
      : model.image || null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${model.code} — ${model.name}`}
      className={`group relative flex flex-col overflow-hidden rounded-xl border text-right transition-all duration-300 ${
        active
          ? "border-primary ring-2 ring-primary/40"
          : "border-secondary/60 hover:border-primary/60"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary/30">
        {thumb ? (
          <img
            src={thumb}
            alt={model.code}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <FabricSwatch fabric={model} className="h-full w-full" />
        )}
        {active && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </span>
        )}
        {model.install_status === "approved" && model.install_image && (
          <span className="absolute bottom-1 left-1 rounded bg-background/85 px-1.5 py-0.5 font-body text-[8px] text-primary">
            نمونه نصب
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <span className="font-display text-[11px] font-bold text-primary">{model.code}</span>
        <span className="truncate font-body text-[10px] leading-tight text-foreground">{model.name}</span>
        <div className="mt-0.5 flex items-center gap-1.5">
          {model.color_code && (
            <span
              className="h-2.5 w-2.5 flex-none rounded-full border border-secondary/40"
              style={{ backgroundColor: model.color_code }}
            />
          )}
          <span className="truncate font-body text-[9px] text-muted-foreground">
            {[model.fabric, model.color].filter(Boolean).join(" · ") || "—"}
          </span>
        </div>
      </div>
    </button>
  );
}
