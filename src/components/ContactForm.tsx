"use client";

import { useState } from "react";
import { Phone, Mail, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", message: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSent(true);
  };

  return (
    <div className="space-y-5">
      {sent ? (
        <div className="animate-fade-up rounded-2xl border border-primary/40 bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-6 w-6" />
          </div>
          <h3 className="font-display text-xl font-bold text-foreground">درخواست شما ثبت شد</h3>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            به‌زودی با شما تماس می‌گیریم. برای تماس فوری:
          </p>
          <a href="tel:+982112345678" className="btn-gold mt-5 justify-center">
            <Phone className="h-4 w-4" /> ۰۲۱-۱۲۳۴۵۶۷۸
          </a>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <h3 className="font-display text-lg font-bold text-foreground">فرم تماس</h3>
          <div>
            <Label htmlFor="name" className="mb-1.5 block font-body text-xs text-muted-foreground">نام و نام خانوادگی</Label>
            <Input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-12"
              placeholder="مثال: سارا محمدی"
              required
            />
          </div>
          <div>
            <Label htmlFor="phone" className="mb-1.5 block font-body text-xs text-muted-foreground">شماره تماس</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="h-12"
              placeholder="۰۹۱۲…"
              required
            />
          </div>
          <div>
            <Label htmlFor="message" className="mb-1.5 block font-body text-xs text-muted-foreground">پیام</Label>
            <textarea
              id="message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              className="h-32 rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary resize-none"
              placeholder="توضیحات پروژه، ابعاد تقریبی، نوع پارچه مورد نظر..."
              required
            />
          </div>
          <Button type="submit" className="w-full" style={{ minHeight: 48 }}>
            ارسال درخواست
          </Button>
        </form>
      )}
    </div>
  );
}
