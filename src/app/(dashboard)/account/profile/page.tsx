"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/api/client";
import { adminToast, adminToasts } from "@/lib/adminToast";
import { useConfirmation } from "@/hooks/useConfirmation";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

const inputCls =
  "w-full rounded-xl border border-secondary bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none focus:border-primary";
const labelCls = "mb-1.5 block font-body text-xs text-muted-foreground";

export default function AccountProfilePage() {
  const { user, checkUserAuth } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  // Confirmation dialogs
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmation();

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const confirmed = await confirm({
      title: "ذخیره پروفایل",
      description: "آیا می‌خواهید تغییرات اطلاعات شخصی ذخیره شود؟",
      confirmLabel: "ذخیره",
      cancelLabel: "انصراف",
      variant: "primary",
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      await api.account.updateProfile({
        full_name: fullName,
        phone: phone || undefined,
        email: email || "",
      });
      await checkUserAuth();
      adminToasts.updated("پروفایل");
    } catch (err) {
      adminToast("error", "پروفایل", err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    const confirmed = await confirm({
      title: "تغییر رمز عبور",
      description: "آیا می‌خواهید رمز عبور خود را تغییر دهید؟ پس از تغییر، باید دوباره وارد شوید.",
      confirmLabel: "تغییر",
      cancelLabel: "انصراف",
      variant: "warning",
    });
    if (!confirmed) return;

    setPwdSaving(true);
    try {
      await api.account.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      adminToasts.updated("رمز عبور");
    } catch (err) {
      adminToast("error", "رمز عبور", err instanceof Error ? err.message : "خطا");
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-black text-foreground">پروفایل و امنیت</h1>
        <p className="mt-1 font-body text-xs text-muted-foreground">ویرایش اطلاعات تماس و رمز عبور</p>
      </div>

      <form onSubmit={saveProfile} className="rounded-2xl border border-secondary/60 bg-card p-5 space-y-4 max-w-lg">
        <h2 className="font-display text-sm font-black">اطلاعات شخصی</h2>
        <div>
          <label className={labelCls}>نام و نام خانوادگی</label>
          <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>موبایل</label>
          <input className={inputCls} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" />
        </div>
        <div>
          <label className={labelCls}>ایمیل</label>
          <input className={inputCls} dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" disabled={saving} className="btn-gold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          ذخیره پروفایل
        </button>
      </form>

      <form onSubmit={savePassword} className="rounded-2xl border border-secondary/60 bg-card p-5 space-y-4 max-w-lg">
        <h2 className="font-display text-sm font-black">تغییر رمز عبور</h2>
        <div>
          <label className={labelCls}>رمز فعلی</label>
          <input className={inputCls} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>رمز جدید (حداقل ۶ کاراکتر)</label>
          <input className={inputCls} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required />
        </div>
        <button type="submit" disabled={pwdSaving} className="btn-gold">
          {pwdSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          به‌روزرسانی رمز
        </button>
      </form>

      {dialogState.open && dialogState.options && (
        <ConfirmationDialog
          open={dialogState.open}
          onOpenChange={handleCancel}
          title={dialogState.options.title}
          description={dialogState.options.description}
          confirmLabel={dialogState.options.confirmLabel}
          cancelLabel={dialogState.options.cancelLabel}
          variant={dialogState.options.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}