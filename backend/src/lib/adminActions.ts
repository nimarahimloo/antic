/**
 * اجرای CRUD ادمین با تشخیص آزاد جمله (adminNlu).
 * حذف/افزودن/ویرایش فقط بعد از پیش‌نمایش و تایید ادمین.
 */
import { prisma } from "./prisma.js";
import {
  parseAdminCommand,
  type Action,
  type EntityKind,
} from "./adminNlu.js";

export type AdminBlock =
  | { type: "text"; markdown: string }
  | {
      type: "model_cards";
      items: Array<{
        id: string;
        title: string;
        subtitle?: string;
        image?: string | null;
        href: string;
      }>;
    }
  | { type: "link_buttons"; items: Array<{ label: string; href: string }> }
  | { type: "quick_replies"; items: Array<{ label: string; message: string }> };

export type AdminActionResult = {
  text: string;
  blocks?: AdminBlock[];
  meta?: Record<string, unknown>;
};

function pack(text: string, blocks?: AdminBlock[], meta?: Record<string, unknown>): AdminActionResult {
  return { text, blocks, meta };
}

type PendingMutation = {
  action: Action;
  entity: EntityKind;
  target: string | null;
  fields: Record<string, string>;
  resolvedId?: string;
  resolvedLabel?: string;
  createdAt: number;
};

const pendingMutations = new Map<string, PendingMutation>();

function confirmButtons(): AdminBlock {
  return {
    type: "quick_replies",
    items: [
      { label: "✅ تایید اجرا", message: "تایید" },
      { label: "✕ انصراف", message: "انصراف" },
    ],
  };
}

function fieldLines(fields: Record<string, string>): string {
  const keys = Object.keys(fields);
  if (!keys.length) return "• (بدون فیلد اضافه)";
  return keys.map((k) => `• **${k}**: ${fields[k]}`).join("\n");
}

function isConfirmText(s: string) {
  const n = s.trim().toLowerCase().replace(/[یي]/g, "ی");
  return /^(تایید|تاید|تائید|confirm|yes|آره|باشه)$/i.test(n) || n === "تایید کن" || n === "اجرا کن";
}

function isCancelText(s: string) {
  const n = s.trim().toLowerCase().replace(/[یي]/g, "ی");
  return /^(انصراف|لغو|رد|cancel|no|نه)$/i.test(n);
}

function slugify(s: string) {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\u0600-\u06FF-]/g, "")
      .replace(/-+/g, "-")
      .slice(0, 64) || `item-${Date.now().toString(36)}`
  );
}
