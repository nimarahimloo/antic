"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { OptimizedImage } from "@/components/ui/image";
import { mediaUrl } from "@/lib/mediaUrl";
import { cn } from "@/lib/utils";

interface Model {
  id: string;
  code: string;
  name: string;
  install_image?: string;
  image?: string;
  color_code?: string;
  fabric?: string;
  color?: string;
}

interface CatalogCardProps {
  model: Model;
  active: boolean;
  onClick: () => void;
}

interface InstallBadgeProps {
  visible: boolean;
}

export function InstallBadge({ visible }: InstallBadgeProps) {
  if (!visible) return null;
  return (
    <span className="absolute bottom-1 left-1 rounded bg-background/85 px-1.5 py-0.5 font-body text-[8px] text-primary">
      نمونه نصب
    </span>
  );
}

interface ColorSwatchProps {
  colorCode?: string;
  fabric?: string;
  color?: string;
}

export function ColorSwatch({ colorCode, fabric, color }: ColorSwatchProps) {
  return (
    <div className="mt-0.5 flex items-center gap-1.5">
      {colorCode && (
        <span
          className="h-2.5 w-2.5 flex-none rounded-full border border-secondary/40"
          style={{ backgroundColor: colorCode }}
        />
      )}
      <span className="truncate font-body text-[9px] text-muted-foreground">
        {[fabric, color].filter(Boolean).join(" · ") || "—"}
      </span>
    </div>
  );
}

export default function CatalogCard({ model, active, onClick }: CatalogCardProps) {
  const thumb = mediaUrl(model.install_image || model.image);
  const hasInstallImage = Boolean(model.install_image);

  return (
    <Link href={`/curtain/${model.id}`} className="block">
      <article
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        title={`${model.code} — ${model.name}`}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-xl border text-right transition-all duration-300",
          active ? "border-primary ring-2 ring-primary/40" : "border-secondary/60 hover:border-primary/60"
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary/30">
          {thumb ? (
            <OptimizedImage
              src={thumb}
              alt={model.code}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-secondary/30">
              <span className="font-display text-sm text-muted-foreground">{model.code}</span>
            </div>
          )}

          {active && (
            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-3 w-3" />
            </span>
          )}

          <InstallBadge visible={hasInstallImage} />
        </div>

        <div className="flex flex-1 flex-col gap-0.5 p-2">
          <span className="font-display text-[11px] font-bold text-primary">{model.code}</span>
          <span className="truncate font-body text-[10px] leading-tight text-foreground">{model.name}</span>
          <ColorSwatch colorCode={model.color_code} fabric={model.fabric} color={model.color} />
        </div>
      </article>
    </Link>
  );
}
