import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createCurtainEngine } from '@/components/catalog/renderer/engine';

export default function CurtainCanvas({ fabric, settings, open, scale }) {
  const host = useRef(null), engine = useRef(null);
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!context) { setState({ error: 'برای نمایش رندر، شتاب‌دهی گرافیکی مرورگر را فعال کنید.' }); return; }
    canvas.style.width = canvas.style.height = '100%';
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'رندر سه‌بعدی محلی پرده با نور و بافت پارچه');
    host.current.appendChild(canvas);
    let active = true;
    engine.current = createCurtainEngine(host.current, canvas, context, settings, patch => { if (active) setState(s => ({ ...s, ...patch })); });
    return () => { active = false; engine.current.dispose(); engine.current = null; };
  }, [settings]);
  useEffect(() => { engine.current?.update(fabric, open, scale); }, [fabric, settings, open, scale]);
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card">
      <div ref={host} className="absolute inset-0" />
      {state.loading && !state.error && <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/75 p-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>}
      {state.error && <div className="absolute inset-0 flex items-center justify-center bg-card p-6 text-center text-xs leading-7 text-muted-foreground">{state.error}</div>}
      {state.warning && <p role="status" className="absolute inset-x-3 bottom-3 rounded-lg bg-background/85 p-2 text-center text-[10px] text-foreground">{state.warning}</p>}
      {state.calibration && !state.loading && (
        <span className="absolute right-3 top-3 rounded-full bg-background/85 px-3 py-1 text-[10px] text-foreground">
          انطباق رنگ با نمونهٔ واقعی: {state.calibration.deltaE < 2 ? 'دقیق' : state.calibration.deltaE < 5 ? 'نزدیک' : 'نیاز به بازبینی'} · ΔE {state.calibration.deltaE}
        </span>
      )}
      {!fabric && <span className="absolute inset-x-3 bottom-4 text-center text-xs text-foreground">یک پارچه انتخاب کنید</span>}
    </div>
  );
}