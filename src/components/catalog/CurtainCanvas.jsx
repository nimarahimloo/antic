import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createCurtainEngine } from "@/components/catalog/renderer/engine";
import { resolveStyle } from "@/components/catalog/windowStyles";

function isRaiseStyle(style, categorySlug) {
  if (categorySlug === "zebra") return true;
  return ["zebra", "shade", "double", "roman", "roller", "pleated-manual", "pleated-chain", "pleated-sheer"].includes(
    style
  );
}

/**
 * Interactive 3D curtain — drag to open (side) or raise (vertical styles).
 */
export default function CurtainCanvas({ fabric, settings, open = 0.3, scale = 0.65, onOpenChange }) {
  const host = useRef(null);
  const engine = useRef(null);
  const openRef = useRef(open);
  const drag = useRef(null);
  const [state, setState] = useState({ loading: true });
  const [hint, setHint] = useState(true);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", { antialias: true, alpha: false });
    if (!context) {
      setState({ error: "برای نمایش رندر، شتاب‌دهی گرافیکی مرورگر را فعال کنید." });
      return;
    }
    canvas.style.width = canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "رندر سه‌بعدی تعاملی پرده — بکشید تا باز یا بالا شود");
    host.current.appendChild(canvas);

    let active = true;
    engine.current = createCurtainEngine(host.current, canvas, context, settings, (patch) => {
      if (active) setState((s) => ({ ...s, ...patch }));
    });

    const styleOf = () => resolveStyle(fabric || {});
    const raise = () => isRaiseStyle(styleOf(), fabric?.category_slug);

    const onPointerDown = (e) => {
      canvas.setPointerCapture?.(e.pointerId);
      canvas.style.cursor = "grabbing";
      setHint(false);
      drag.current = {
        x: e.clientX,
        y: e.clientY,
        open: openRef.current,
        raise: raise(),
      };
      engine.current?.pulseMotion(800);
    };

    const onPointerMove = (e) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      const rect = canvas.getBoundingClientRect();
      let next;
      if (drag.current.raise) {
        // drag up = more open (raised), drag down = lower
        next = drag.current.open + (-dy / Math.max(rect.height, 1)) * 1.15;
      } else {
        // drag outward (either side) opens more
        next = drag.current.open + (Math.abs(dx) / Math.max(rect.width, 1)) * 1.1 * (dx >= 0 ? 1 : 1);
        // refine: drag right increases open for classic panels
        next = drag.current.open + (dx / Math.max(rect.width, 1)) * 0.95;
      }
      next = Math.max(0, Math.min(0.9, next));
      openRef.current = next;
      engine.current?.setOpen(next);
      onOpenChange?.(next);
    };

    const onPointerUp = (e) => {
      if (!drag.current) return;
      drag.current = null;
      canvas.style.cursor = "grab";
      try {
        canvas.releasePointerCapture?.(e.pointerId);
      } catch {
        /* */
      }
      engine.current?.pulseMotion(400);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    return () => {
      active = false;
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      engine.current?.dispose();
      engine.current = null;
    };
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    engine.current?.update(fabric, open, scale);
  }, [fabric, settings, open, scale]);

  const style = fabric ? resolveStyle(fabric) : "drape";
  const raiseMode = isRaiseStyle(style, fabric?.category_slug);

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card select-none">
      <div ref={host} className="absolute inset-0" />
      {state.loading && !state.error && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/75 p-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}
      {state.error && (
        <div className="absolute inset-0 flex items-center justify-center bg-card p-6 text-center text-xs leading-7 text-muted-foreground">
          {state.error}
        </div>
      )}
      {state.warning && (
        <p role="status" className="absolute inset-x-3 bottom-3 rounded-lg bg-background/85 p-2 text-center text-[10px] text-foreground">
          {state.warning}
        </p>
      )}
      {state.calibration && !state.loading && (
        <span className="absolute right-3 top-3 rounded-full bg-background/85 px-3 py-1 text-[10px] text-foreground">
          انطباق رنگ:{" "}
          {state.calibration.deltaE < 2 ? "دقیق" : state.calibration.deltaE < 5 ? "نزدیک" : "بازبینی"} · ΔE{" "}
          {state.calibration.deltaE}
        </span>
      )}
      {hint && fabric && !state.loading && (
        <span className="pointer-events-none absolute inset-x-0 bottom-10 text-center text-[10px] text-foreground/80">
          {raiseMode ? "بکشید بالا/پایین — مثل زنجیر" : "بکشید چپ/راست — باز و بسته"}
        </span>
      )}
      {!fabric && (
        <span className="absolute inset-x-3 bottom-4 text-center text-xs text-foreground">یک پارچه انتخاب کنید</span>
      )}
    </div>
  );
}
