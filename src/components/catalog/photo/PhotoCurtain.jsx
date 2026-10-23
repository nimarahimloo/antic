import { useEffect, useRef, useState } from "react";
import { analyzeTemplate, renderPhoto } from "@/components/catalog/photo/photoRenderer";
import { materialOf } from "@/components/catalog/photo/materials";
import { analyzeFabric } from "@/components/catalog/photo/fabricAnalyzer";
import { makeSwatchCanvas } from "@/components/catalog/fabricSwatch";

const load = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Shows the model's fabric image mapped onto a real window install template.
 * The fabric photo is the product — we do not recolor it from metadata.
 */
export default function PhotoCurtain({ template, fabric, scale = 0.55 }) {
  const canvas = useRef(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");

    const fabricSrc = fabric?.image;
    Promise.all([
      load(template),
      fabricSrc ? load(fabricSrc) : Promise.resolve(makeSwatchCanvas(fabric)),
      fabricSrc ? analyzeFabric(fabricSrc).catch(() => null) : Promise.resolve(null),
    ])
      .then(([photo, swatch, analysis]) => {
        if (!alive) return;
        const info = analyzeTemplate(photo);
        if (info.coverage < 0.02) return setState("invalid");

        const tileScale = analysis?.patternScale
          ? Math.min(1.1, Math.max(0.3, scale * (analysis.patternScale / 18)))
          : scale;

        const material = materialOf(fabric, analysis);
        renderPhoto(canvas.current, photo, swatch, info, material, tileScale);
        setState("ready");
      })
      .catch(() => alive && setState("error"));

    return () => {
      alive = false;
    };
  }, [template, fabric?.image, fabric?.fabric, fabric?.material, scale]);

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card">
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
          قالب نصب پارچهٔ سبز قابل‌تشخیص ندارد. در ادمین برای این سبک یک عکس واقعی نصب با پارچه سبز آپلود کنید.
        </p>
      )}
      {state === "error" && (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-muted-foreground">
          بارگذاری تصویر پارچه یا قالب ناموفق بود.
        </p>
      )}
    </div>
  );
}
