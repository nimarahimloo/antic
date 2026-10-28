import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Star } from "lucide-react";
import { api } from "@/api/client";
import { adminToast } from "@/lib/adminToast";

const inputCls =
  "w-full rounded-xl border border-secondary bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none focus:border-primary";
const labelCls = "mb-1.5 block font-body text-xs text-muted-foreground";

const empty = {
  title: "منزل",
  full_name: "",
  phone: "",
  province: "",
  city: "",
  address: "",
  postal_code: "",
  is_default: false,
};

export default function AccountAddresses() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await api.account.addresses();
      setRows(Array.isArray(d) ? d : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  }

  function startEdit(a) {
    setEditingId(a.id);
    setForm({
      title: a.title || "",
      full_name: a.full_name || a.fullName || "",
      phone: a.phone || "",
      province: a.province || "",
      city: a.city || "",
      address: a.address || "",
      postal_code: a.postal_code || a.postalCode || "",
      is_default: Boolean(a.is_default || a.isDefault),
    });
    setOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.account.updateAddress(editingId, form);
        adminToast("update", "آدرس");
      } else {
        await api.account.createAddress(form);
        adminToast("create", "آدرس");
      }
      setOpen(false);
      await load();
    } catch (err) {
      adminToast("error", "آدرس", err.message || "خطا");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("این آدرس حذف شود؟")) return;
    try {
      await api.account.deleteAddress(id);
      adminToast("delete", "آدرس");
      await load();
    } catch (err) {
      adminToast("error", "آدرس", err.message || "خطا");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-black text-foreground">آدرس‌های من</h1>
          <p className="mt-1 font-body text-xs text-muted-foreground">برای تسویه سریع‌تر در خرید</p>
        </div>
        <button type="button" onClick={startNew} className="btn-gold">
          <Plus className="h-4 w-4" /> آدرس جدید
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 && !open ? (
        <p className="rounded-2xl border border-secondary/60 bg-card px-4 py-16 text-center text-sm text-muted-foreground">
          هنوز آدرسی ثبت نکرده‌اید.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((a) => (
            <div key={a.id} className="rounded-2xl border border-secondary/60 bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-body text-xs font-bold text-foreground flex items-center gap-1">
                    {a.title || "آدرس"}
                    {(a.is_default || a.isDefault) && <Star className="h-3 w-3 text-primary fill-primary" />}
                  </p>
                  <p className="mt-1 font-body text-[11px] text-muted-foreground leading-6">
                    {[a.province, a.city].filter(Boolean).join(" · ")}
                    <br />
                    {a.address}
                    {a.phone ? (
                      <>
                        <br />
                        <span dir="ltr">{a.phone}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => startEdit(a)} className="rounded-lg border border-secondary/70 px-2 py-1 text-[10px] text-muted-foreground hover:text-primary">
                    ویرایش
                  </button>
                  <button type="button" onClick={() => remove(a.id)} className="rounded-lg border border-secondary/70 p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <form onSubmit={submit} className="mt-6 rounded-2xl border border-secondary/60 bg-card p-5 space-y-3 max-w-xl">
          <h2 className="font-display text-sm font-black">{editingId ? "ویرایش آدرس" : "آدرس جدید"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>عنوان</label>
              <input className={inputCls} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="منزل / محل کار" />
            </div>
            <div>
              <label className={labelCls}>گیرنده</label>
              <input className={inputCls} value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>موبایل</label>
              <input className={inputCls} dir="ltr" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>کد پستی</label>
              <input className={inputCls} dir="ltr" value={form.postal_code} onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>استان</label>
              <input className={inputCls} value={form.province} onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>شهر</label>
              <input className={inputCls} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>آدرس کامل</label>
              <textarea className={`${inputCls} resize-none`} rows={3} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))} style={{ accentColor: "#C9A227" }} />
            آدرس پیش‌فرض
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-gold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              ذخیره
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost-gold">
              انصراف
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
