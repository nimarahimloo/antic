import { useEffect, useRef, useState } from "react";
import { analyzeTemplate, renderPhoto } from "@/components/catalog/photo/photoRenderer";
import { materialOf } from "@/components/catalog/photo/materials";
import { analyzeFabric } from "@/components/catalog/photo/fabricAnalyzer";
import { makeSwatchCanvas } from "@/components/catalog/fabricSwatch";
import { styleFabricScale } from "@/lib/curtainStyleResolve";

const load = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** فقط برای پیش‌نمایش ادمین — سایت عمومی از install_image استفاده می‌کند */
export default function PhotoCurtain({ template, fabric, scale, styleKey }) {
  const canvas = useRef(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");

    const fabricSrc = fabric?.image;
    const baseScale =
      typeof scale === "number" && scale > 0
        ? scale
        : styleFabricScale(styleKey || fabric?.category_slug);

    Promise.all([
      load(template),
      fabricSrc ? load(fabricSrc) : Promise.resolve(makeSwatchCanvas(fabric)),
      fabricSrc ? analyzeFabric(fabricSrc).catch(() => null) : Promise.resolve(null),
    ])
      .then(([photo, swatch, analysis]) => {
        if (!alive) return;
        const info = analyzeTemplate(photo);
        if (info.coverage < 0.02) return setState("invalid");

        // scale≈1 = یک‌بار پارچه روی ناحیه سبز؛ بدون تکرار کارتونی
        const tileScale = Math.min(1.35, Math.max(0.75, baseScale));
        const material = materialOf(fabric, analysis);
        renderPhoto(canvas.current, photo, swatch, info, material, tileScale);
        setState("ready");
      })
      .catch(() => alive && setState("error"));

    return () => {
      alive = false;
    };
  }, [template, fabric?.image, fabric?.fabric, fabric?.material, scale, styleKey]);

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvas}
        className="h-full w-full object-cover"
        aria-label={`نمای نصب ${fabric?.code || ""}`}
      />
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/70">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      )}
      {state === "invalid" && (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-muted-foreground">
          قالب chroma ناحیه سبز ندارد. در ادمین قالب دسته را بسازید.
        </p>
      )}
      {state === "error" && (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-muted-foreground">
          بارگذاری تصویر ناموفق بود.
        </p>
      )}
    </div>
  );
}
