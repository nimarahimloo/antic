/**
 * Customer assistant — free-form NLU over catalog/projects/shop.
 * Accepts any tone/phrasing; always tries to answer from real data.
 */
import { prisma } from "./prisma.js";
import { buildAdminAssistantReply as buildAdminReply } from "./consultantAdmin.js";

export type RichBlock =
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

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  blocks?: RichBlock[];
  attachments?: Array<{ type: "image"; url: string }>;
};

export type AssistantContext = {
  path?: string;
  page?: string;
  role?: string;
};

export type AssistantResult = {
  text: string;
  blocks?: RichBlock[];
  meta?: Record<string, unknown>;
};

function normalize(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[یي]/g, "ی")
    .replace(/[کك]/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/[ـ_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pack(text: string, blocks?: RichBlock[], meta?: Record<string, unknown>): AssistantResult {
  return { text, blocks, meta };
}
