import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { resolveStyle } from '@/components/catalog/windowStyles';

// Side-by-side comparison: the model's generated render vs its fabric swatch vs the real project photos of the same mechanism.
export default function RenderCompare({ model, onClose }) {
  const [refs, setRefs] = useState(null);
  const style = useMemo(() => resolveStyle(model?.category_slug || '', (model?.subcategory || '').toLowerCase()), [model]);
  useEffect(() => {
    if (!model) return;
    base44.entities.InstallReference.filter({ style }, '-created_date', 6).then(setRefs);
  }, [model, style]);

  if (!model) return null;
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" >
      <div onClick={e => e.stopPropagation()} className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-secondary/60 bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="eyebrow">مقایسهٔ مدل {model.code} · {model.name}</span>
          <button type="button" onClick={onClose} className="text-xs text-muted-foreground underline underline-offset-4">بستن</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <figure className="rounded-xl border border-primary/40 bg-background p-2">
            <figcaption className="mb-1.5 text-[11px] font-bold text-primary">نمای تولیدشده (رندر هوشمند)</figcaption>
            <img src={model.install_image} alt={`رندر ${model.code}`} className="aspect-[4/3] w-full rounded-lg object-cover" />
          </figure>
          {model.image && <figure className="rounded-xl border border-secondary/60 bg-background p-2">
            <figcaption className="mb-1.5 text-[11px] font-bold text-foreground">نمونهٔ اصلی پارچه</figcaption>
            <img src={model.image} alt="پارچهٔ اصلی" className="aspect-[4/3] w-full rounded-lg object-cover" />
          </figure>}
        </div>
        <p className="mt-4 mb-2 text-[11px] font-bold text-foreground">عکس‌های واقعی پروژه‌های شما برای این سازوکار</p>
        {!refs ? <Loader2 className="mx-auto h-4 w-4 animate-spin text-primary" /> : refs.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {refs.map(r => <img key={r.id} src={r.image} alt={r.note || style} className="aspect-[4/3] w-full rounded-lg border border-secondary/60 object-cover" />)}
          </div>
        ) : <p className="text-xs text-muted-foreground">برای سازوکار «{style}» هنوز عکس پروژهٔ واقعی آپلود نکرده‌اید؛ بدون مرجع، بازبینی خودکار دقت کمتری دارد.</p>}
        {model.install_review && <p className="mt-4 rounded-xl border border-secondary/60 bg-background p-3 text-xs leading-6 text-muted-foreground">گزارش بازبین: {model.install_review}{model.install_score != null && ` · امتیاز ${model.install_score} از ۱۰`}</p>}
      </div>
    </div>
  );
}