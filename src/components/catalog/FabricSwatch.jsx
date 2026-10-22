import { useEffect, useRef } from "react";
import { renderFabricCanvas } from "@/components/catalog/fabricSwatch";

export default function FabricSwatch({ fabric, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = 400;
    c.height = 300;
    renderFabricCanvas(c, fabric);
  }, [fabric?.color_code, fabric?.material, fabric?.texture, fabric?.fabric, fabric?.category_slug]);
  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-label={`نمونهٔ پارچهٔ ${fabric?.code || ""}`}
    />
  );
}