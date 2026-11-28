"use client";

import { OptimizedImage } from "@/components/ui/image";
import { useEffect, useRef, useState } from "react";
import { renderFabricCanvas } from "@/components/catalog/fabricSwatch";

interface FabricSwatchProps {
  fabric: Record<string, unknown>;
  className?: string;
}

/**
 * Prefer real catalog photo (phone shot of physical swatch).
 * Fallback: synthetic weave from color_code for models without image yet.
 */
export default function FabricSwatch({ fabric, className }: FabricSwatchProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const hasPhoto = Boolean(fabric?.image) && !imgFailed;

  useEffect(() => {
    (async () => {
      setImgFailed(false);
    })();
  }, [fabric?.image, fabric?.id]);

  useEffect(() => {
    if (hasPhoto) return;
    const c = ref.current;
    if (!c) return;
    c.width = 400;
    c.height = 300;
    renderFabricCanvas(c, fabric);
  }, [hasPhoto, fabric]);

  if (hasPhoto) {
    return (
      <OptimizedImage src={String(fabric.image)} alt={`نمونه پارچه ${String(fabric?.code || "")}`} fill className={className} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={() => setImgFailed(true)} />
    );
  }

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-label={`نمونهٔ پارچهٔ ${String(fabric?.code || "")}`}
    />
  );
}