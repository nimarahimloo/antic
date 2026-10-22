import { useEffect, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { STYLES } from '@/components/admin/RenderTemplatesAdmin';

export default function InstallReferencesAdmin() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState('');
  const reload = () => base44.entities.InstallReference.list('-created_date', 200).then(setRows);
  useEffect(() => { reload(); }, []);

  async function upload(style, files) {
    if (!files?.length) return;
    setBusy(style);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await base44.entities.InstallReference.create({ style, image: file_url });
    }
    await reload();
    setBusy('');
  }
  const remove = async id => { await base44.entities.InstallReference.delete(id); reload(); };

  return (
    <div className="mt-6 rounded-2xl border border-secondary/60 bg-card p-5">
      <span className="eyebrow mb-2 block">نمونه‌های اجراشدهٔ واقعی شما</span>
      <p className="mb-4 text-xs leading-6 text-muted-foreground">برای هر سازوکار عکس پروژه‌های واقعی خودتان را آپلود کنید. نمای واقعی هر مدل از روی همین عکس‌ها ساخته می‌شود: چوب پرده، ریل، کاست، قاب پنجره و نور. سه عکس آخر هر دسته استفاده می‌شود.</p>
      <div className="space-y-3">
        {STYLES.map(([style, label]) => (
          <div key={style} className="rounded-xl border border-secondary/60 bg-background p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">{label}</p>
              <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-primary/50 px-2 py-1 text-[10px] text-primary">
                {busy === style ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}افزودن عکس
                <input type="file" accept="image/*" multiple className="hidden" disabled={!!busy} onChange={e => upload(style, [...e.target.files])} />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {rows.filter(r => r.style === style).map(r => (
                <div key={r.id} className="relative h-16 w-16 overflow-hidden rounded-lg">
                  <img src={r.image} alt={label} className="h-full w-full object-cover" />
                  <button type="button" aria-label="حذف" onClick={() => remove(r.id)} className="absolute left-0.5 top-0.5 rounded-full bg-background/80 p-0.5"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}