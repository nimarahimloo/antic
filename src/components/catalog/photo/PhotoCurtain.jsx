import { useEffect, useRef, useState } from 'react';
import { analyzeTemplate, renderPhoto } from '@/components/catalog/photo/photoRenderer';
import { profileFor } from '@/components/catalog/photo/materials';
import { analyzeFabric } from '@/components/catalog/photo/fabricAnalyzer';
import { makeSwatchCanvas } from '@/components/catalog/fabricSwatch';

const load = src => new Promise((resolve, reject) => {
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img); img.onerror = reject; img.src = src;
});

export default function PhotoCurtain({ template, fabric, scale }) {
  const canvas = useRef(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let alive = true;
    setState('loading');
    Promise.all([load(template), fabric?.image ? load(fabric.image) : Promise.resolve(makeSwatchCanvas(fabric)), analyzeFabric(fabric?.image)]).then(([photo, swatch, analysis]) => {
      if (!alive) return;
      const info = analyzeTemplate(photo);
      if (info.coverage < .02) return setState('invalid');
      // مقیاس تکرار الگو از تحلیل تصویر؛ در نبود آن مقدار ثابت
      const tileScale = analysis?.patternScale ? scale * (analysis.patternScale / 20) : scale;
      renderPhoto(canvas.current, photo, swatch, info, tileScale, profileFor(fabric, info, analysis));
      setState('ready');
    }).catch(() => alive && setState('error'));
    return () => { alive = false; };
  }, [template, fabric?.image, fabric?.color_code, scale]);

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card">
      <canvas ref={canvas} className="h-full w-full object-cover" aria-label={`نمای اجراشدهٔ ${fabric?.code || ''}`} />
      {state === 'loading' && <div className="absolute inset-0 flex items-center justify-center bg-card/70"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/30 border-t-primary" /></div>}
      {state === 'invalid' && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-muted-foreground">قالب این مدل پارچهٔ سبز قابل‌تشخیص ندارد؛ از پنل مدیریت قالب را دوباره بسازید.</p>}
      {state === 'error' && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-muted-foreground">بارگذاری تصویر ناموفق بود.</p>}
    </div>
  );
}