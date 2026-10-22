import { useEffect, useState } from 'react';
import { Loader2, Sparkles, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { refreshRenderTemplates } from '@/hooks/useRenderTemplates';

export const STYLES = [
  ['drape', 'پردهٔ کلاسیک'], ['wave', 'اورسی موجی'], ['panel', 'ترک پنل'], ['roman', 'رومن'],
  ['zebra', 'زبرا'], ['pleated-manual', 'پلیسه دستی'], ['pleated-chain', 'پلیسه زنجیری'],
  ['pleated-sheer', 'پلیسه توری'], ['shade', 'شید'], ['double', 'دبل شید'], ['roller', 'کرکره'],
];

export default function RenderTemplatesAdmin() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const reload = () => base44.entities.RenderTemplate.list('-updated_date', 50).then(setRows).catch(() => setRows([]));
  useEffect(() => { reload(); }, []);
  const imageOf = (style) => rows.find((r) => r.style === style)?.image;

  async function run(style, task) {
    setBusy(style);
    setError('');
    setOkMsg('');
    try {
      await task();
      refreshRenderTemplates();
      await reload();
      setOkMsg('قالب ذخیره شد.');
    } catch (e) {
      const msg =
        e?.data?.error ||
        e?.message ||
        'عملیات ناموفق بود؛ دوباره تلاش کنید.';
      setError(String(msg));
    } finally {
      setBusy('');
    }
  }

  const generate = (style) =>
    run(style, async () => {
      const res = await base44.functions.invoke('generateRenderTemplate', { style });
      if (res?.error && !res?.data?.image) throw new Error(res.error);
      return res;
    });

  const upload = (style, file) =>
    file &&
    run(style, async () => {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      if (!file_url) throw new Error('آپلود فایل ناموفق بود');
      const row = rows.find((r) => r.style === style);
      if (row) await base44.entities.RenderTemplate.update(row.id, { image: file_url });
      else await base44.entities.RenderTemplate.create({ style, image: file_url });
    });

  return (
    <div className="mt-6 rounded-2xl border border-secondary/60 bg-card p-5">
      <span className="eyebrow mb-2 block">قالب‌های عکس‌محور نصب</span>
      <p className="mb-4 text-xs leading-6 text-muted-foreground">
        برای هر سازوکار یک قالب سبز (chroma) لازم است. با «ساخت قالب» به‌صورت محلی ساخته می‌شود،
        یا یک عکس نصب واقعی با پارچه سبز آپلود کنید.
      </p>
      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
      {okMsg && <p className="mb-3 text-xs text-primary">{okMsg}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {STYLES.map(([style, label]) => (
          <div key={style} className="rounded-xl border border-secondary/60 bg-background p-2">
            <div className="aspect-[4/3] overflow-hidden rounded-lg bg-secondary/40">
              {imageOf(style) && (
                <img src={imageOf(style)} alt={label} className="h-full w-full object-cover" />
              )}
            </div>
            <p className="mt-2 text-xs font-bold text-foreground">{label}</p>
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                disabled={!!busy}
                onClick={() => generate(style)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-primary/50 py-1.5 text-[10px] text-primary disabled:opacity-50"
              >
                {busy === style ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {imageOf(style) ? 'ساخت دوباره' : 'ساخت قالب'}
              </button>
              <label
                className="flex cursor-pointer items-center rounded-lg border border-secondary/70 px-2 text-muted-foreground"
                aria-label="آپلود عکس واقعی"
              >
                <Upload className="h-3 w-3" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={!!busy}
                  onChange={(e) => upload(style, e.target.files?.[0])}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
