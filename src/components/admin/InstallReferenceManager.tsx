"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Image as ImageIcon } from "lucide-react";
import { api } from "@/api/client";
import { compressImage } from "@/lib/compressImage";
import { apiErrorMessage } from "@/lib/apiError";
import { adminToast } from "@/lib/adminToast";
import { OptimizedImage } from "@/components/ui/image";

interface InstallReferenceRow {
  id: string;
  style: string;
  image: string;
  note?: string;
  created_date?: string;
}

export function InstallReferenceManager() {
  const [refs, setRefs] = useState<InstallReferenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStyle, setNewStyle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.entities.InstallReference.list("-updated_date", 200)
      .then((rows) => setRefs((Array.isArray(rows) ? rows : []) as InstallReferenceRow[]))
      .catch((e) => setError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addRef(file: File) {
    if (!newStyle.trim() || !file) {
      setError("نام سبک و عکس الزامی است");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const compressed = await compressImage(file);
      const res = await api.integrations.Core.UploadPublicFile({ file: compressed });
      const url = res?.file_url || res?.url || res?.path;
      if (!url) throw new Error("آپلود ناموفق");
      await api.entities.InstallReference.create({
        style: newStyle.trim(),
        image: url,
        note: newNote || null,
      });
      setNewStyle("");
      setNewNote("");
      adminToast("create", "نمونه نصب", newStyle);
      load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRef(id: string) {
    if (!window.confirm("این نمونه نصب حذف شود؟")) return;
    try {
      await api.entities.InstallReference.delete(id);
      adminToast("delete", "نمونه نصب");
      load();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-secondary/60 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-sm font-black text-foreground">نمونه‌های اجرا (نصب)</h2>
          <p className="font-body text-xs text-muted-foreground">عکس نصب واقعی هر سبک پارچه</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/70 px-3 py-2 text-[10px] text-muted-foreground hover:bg-secondary/40"
        >
          <Loader2 className="h-3 w-3 animate-spin" />
        </button>
      </div>

      {error && <p className="mb-3 text-[10px] text-destructive">{error}</p>}

      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={newStyle}
            onChange={(e) => setNewStyle(e.target.value)}
            placeholder="مثلاً pleated-manual"
            className="w-32 rounded-xl border border-secondary bg-background px-3 py-2 font-body text-xs text-foreground outline-none focus:border-primary"
          />
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="یادداشت (اختیاری)"
            className="w-32 rounded-xl border border-secondary bg-background px-3 py-2 font-body text-xs text-foreground outline-none focus:border-primary"
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={saving}
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              e.target.value = "";
              if (f) void addRef(f);
            }}
          />
          <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-3 py-2 font-body text-[10px] font-bold text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            {saving ? "آپلود…" : "آپلود مرجع"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={saving} onChange={(e) => {
              const f = e.target.files?.[0] || null;
              e.target.value = "";
              if (f) void addRef(f);
            }} />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-secondary/60 bg-background/50">
              <th className="text-right px-3 py-2 font-body text-xs font-semibold text-muted-foreground">سبک</th>
              <th className="text-right px-3 py-2 font-body text-xs font-semibold text-muted-foreground">عکس</th>
              <th className="text-right px-3 py-2 font-body text-xs font-semibold text-muted-foreground">یادداشت</th>
              <th className="text-right px-3 py-2 font-body text-xs font-semibold text-muted-foreground">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">بارگذاری…</td></tr>
            ) : refs.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">نمونه‌ای ثبت نشده است</td></tr>
            ) : (
              refs.map((r) => (
                <tr key={r.id} className="border-b border-secondary/40">
                  <td className="px-3 py-2 font-body text-xs text-foreground">{r.style}</td>
                  <td className="px-3 py-2">
                    <div className="relative flex h-8 w-12 items-center justify-center overflow-hidden rounded border border-secondary/60 bg-background">
                      {r.image ? <OptimizedImage src={r.image} alt="" fill className="object-cover" sizes="48px" /> : <ImageIcon className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-body text-xs text-muted-foreground truncate max-w-[80px]">{r.note || "—"}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => deleteRef(r.id)}
                      className="rounded border border-destructive/40 px-2 py-1 text-[9px] text-destructive hover:bg-destructive/10"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
