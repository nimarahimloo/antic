import { useEffect, useState } from 'react';
import { Check, Loader2, RefreshCw, X } from 'lucide-react';
import RenderCompare from '@/components/admin/RenderCompare';
import { base44 } from '@/api/base44Client';

const BADGE = { approved: ['تأییدشده', 'border-primary/60 text-primary'], rejected: ['ردشده', 'border-destructive/60 text-destructive'] };

export default function InstallReviewAdmin() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState('');
  const [compare, setCompare] = useState(null);
  const reload = () => base44.entities.CurtainModel.list('-updated_date', 200).then(all => setRows(all.filter(m => m.install_image)));
  useEffect(() => { reload(); }, []);

  async function act(id, task) { setBusy(id); await task(); await reload(); setBusy(''); }
  const setStatus = (m, install_status) => act(m.id, () => base44.entities.CurtainModel.update(m.id, { install_status }));
  const regenerate = m => act(m.id, () => base44.functions.invoke('generateInstallImage', { model_id: m.id, regenerate: true }));

  return (
    <div className="mt-6 rounded-2xl border border-secondary/60 bg-card p-5">
      <span className="eyebrow mb-2 block">بازبینی هوشمند نماهای واقعی</span>
      <p className="mb-4 text-xs leading-6 text-muted-foreground">هر نما قبل از نمایش با پارچهٔ اصلی و نمونه‌های اجراشدهٔ شما مقایسه می‌شود (سازوکار، یراق‌آلات، تطابق پارچه، هم‌راستایی طرح، واقع‌گرایی). فقط نماهای تأییدشده به مشتری نشان داده می‌شوند؛ تصمیم نهایی با شماست.</p>
      {!rows ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /> : !rows.length ? <p className="text-xs text-muted-foreground">هنوز نمایی ساخته نشده است.</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(m => {
            const [label, cls] = BADGE[m.install_status] || ['بازبینی‌نشده', 'border-secondary text-muted-foreground'];
            return (
              <div key={m.id} className="rounded-xl border border-secondary/60 bg-background p-2">
                <button type="button" onClick={() => setCompare(m)} className="flex w-full gap-2 text-right" title="مقایسه در کنار هم">
                  <img src={m.install_image} alt={m.code} className="aspect-[4/3] w-2/3 rounded-lg object-cover" />
                  {m.image && <img src={m.image} alt="پارچهٔ اصلی" className="aspect-square w-1/3 self-start rounded-lg object-cover" />}
                </button>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{m.code}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${cls}`}>{label}{m.install_score != null && ` · ${m.install_score}/10`}</span>
                </div>
                {m.install_review && <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{m.install_review}</p>}
                <div className="mt-2 flex gap-1.5">
                  {busy === m.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin text-primary" /> : <>
                    <button type="button" onClick={() => setStatus(m, 'approved')} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-primary/50 py-1.5 text-[10px] text-primary"><Check className="h-3 w-3" />تأیید</button>
                    <button type="button" onClick={() => setStatus(m, 'rejected')} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-secondary/70 py-1.5 text-[10px] text-muted-foreground"><X className="h-3 w-3" />رد</button>
                    <button type="button" onClick={() => regenerate(m)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-secondary/70 py-1.5 text-[10px] text-muted-foreground"><RefreshCw className="h-3 w-3" />ساخت دوباره</button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <RenderCompare model={compare} onClose={() => setCompare(null)} />
    </div>
  );
}