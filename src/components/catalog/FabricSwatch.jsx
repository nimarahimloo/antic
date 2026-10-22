import { useEffect, useRef, useState } from "react";
import { renderFabricCanvas } from "@/components/catalog/fabricSwatch";

/**
 * Prefer real catalog photo (phone shot of physical swatch).
 * Fallback: synthetic weave from color_code for models without image yet.
 */
export default function FabricSwatch({ fabric, className }) {
  const ref = useRef(null);
  const [imgFailed, setImgFailed] = useState(false);
  const hasPhoto = Boolean(fabric?.image) && !imgFailed;

  useEffect(() => {
    setImgFailed(false);
  }, [fabric?.image, fabric?.id]);

  useEffect(() => {
    if (hasPhoto) return;
    const c = ref.current;
    if (!c) return;
    c.width = 400;
    c.height = 300;
    renderFabricCanvas(c, fabric);
  }, [
    hasPhoto,
    fabric?.color_code,
    fabric?.material,
    fabric?.texture,
    fabric?.fabric,
    fabric?.category_slug,
    fabric?.id,
  ]);

  if (hasPhoto) {
    return (
      <img
        src={fabric.image}
        alt={`نمونه پارچه ${fabric?.code || ""}`}
        className={className}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-label={`نمونهٔ پارچهٔ ${fabric?.code || ""}`}
    />
  );
}
