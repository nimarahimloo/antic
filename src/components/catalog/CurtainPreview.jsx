import { useState } from 'react';
import VirtualWindow from '@/components/catalog/VirtualWindow';
import PhotoCurtain from '@/components/catalog/photo/PhotoCurtain';
import { resolveStyle } from '@/components/catalog/windowStyles';
import { useRenderTemplates } from '@/hooks/useRenderTemplates';

export default function CurtainPreview({ fabric }) {
  const [open, setOpen] = useState(.30);
  const templates = useRenderTemplates();
  const template = fabric && templates?.[resolveStyle(fabric)];
  const hasPhoto = !!template;

  return (
    <div id="curtain-render-preview">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs">
        <span className="font-display font-bold text-primary">
          {hasPhoto ? 'رندر هوشمند پارچه' : 'پیش‌نمایش نصب'}
        </span>
      </div>
      {template
        ? <PhotoCurtain template={template} fabric={fabric} scale={.65} />
        : <VirtualWindow fabric={fabric} open={open} scale={.65} />}
      <p className="mt-2 text-[10px] text-muted-foreground">
        {hasPhoto
          ? 'پارچهٔ واقعی روی فرم نصب اجراشده اعمال می‌شود — نور، سایه و چین‌ها از عکس واقعی، رنگ و بافت از نمونهٔ پارچه'
          : 'رنگ و بافت پارچه روی فرم سه‌بعدی پرده در مرورگر رندر می‌شود'}
      </p>
      {fabric && !hasPhoto && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <label className="block text-[11px] text-muted-foreground">
            {fabric.category_slug === 'zebra' ? 'هم‌پوشانی نوارها' : 'میزان بازشدن پرده'}
            <input
              aria-label="میزان بازشدن پرده"
              type="range"
              min="0"
              max="0.9"
              step="0.01"
              value={open}
              onChange={e => setOpen(Number(e.target.value))}
              className="mt-3 block w-full accent-primary"
            />
          </label>
        </div>
      )}
      {fabric && !fabric.image && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          این مدل عکس نمونهٔ پارچه ندارد؛ فقط رنگ روی نمای نصب اعمال می‌شود.
        </p>
      )}
    </div>
  );
}