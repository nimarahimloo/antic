import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { HttpError, sendError } from "../lib/errors.js";
import { buildAssistantReply, type ChatMessage } from "../lib/consultant.js";
import { optionalAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

type Conversation = {
  id: string;
  agent_name: string;
  metadata?: Record<string, unknown>;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

const store = new Map<string, Conversation>();

function prune() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, c] of store) {
    if (c.updatedAt < cutoff) store.delete(id);
  }
}

function welcome(agent: string): ChatMessage {
  if (agent === "admin_assistant") {
    return {
      role: "assistant",
      content:
        "سلام — دستیار ادمین آنتیک. می‌توانم از دیتابیس بخوانم و بنویسم (مدل، دسته، سفارش، درخواست). بگو چه کاری انجام شود.",
      blocks: [
        {
          type: "quick_replies",
          items: [
            { label: "خلاصه وضعیت", message: "خلاصه وضعیت" },
            { label: "لیست مدل‌ها", message: "لیست مدل‌ها" },
            { label: "درخواست‌ها", message: "درخواست‌های مشاوره" },
          ],
        },
      ],
    };
  }
  return {
    role: "assistant",
    content:
      "سلام 👋 دستیار طراحی پرده آنتیک هستم. فضا و نور را بگو تا از کاتالوگ واقعی مدل پیشنهاد بدهم.",
    blocks: [
      {
        type: "quick_replies",
        items: [
          { label: "نشیمن مدرن", message: "نشیمن مدرن می‌خوام" },
          { label: "خواب بلک‌اوت", message: "اتاق خواب بلک‌اوت می‌خوام" },
          { label: "کلاسیک لوکس", message: "سلیقه‌م کلاسیک و لوکسه" },
        ],
      },
      {
        type: "link_buttons",
        items: [
          { label: "کاتالوگ", href: "/catalog" },
          { label: "تماس", href: "/contact" },
        ],
      },
    ],
  };
}

router.post("/conversations", async (req, res) => {
  try {
    prune();
    const body = z
      .object({
        agent_name: z.string().default("design_consultant"),
        metadata: z.record(z.unknown()).optional(),
      })
      .parse(req.body || {});

    const id = randomUUID();
    const conv: Conversation = {
      id,
      agent_name: body.agent_name,
      metadata: body.metadata,
      messages: [welcome(body.agent_name)],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    store.set(id, conv);
    res.status(201).json(conv);
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.get("/conversations/:id", (req, res) => {
  try {
    const conv = store.get(req.params.id);
    if (!conv) throw new HttpError(404, "Conversation not found");
    res.json(conv);
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/conversations/:id/messages", optionalAuth, async (req: AuthedRequest, res) => {
  try {
    const conv = store.get(req.params.id);
    if (!conv) throw new HttpError(404, "Conversation not found");

    const body = z
      .object({
        role: z.enum(["user", "assistant"]).default("user"),
        content: z.string().min(1),
        attachments: z
          .array(
            z.object({
              type: z.literal("image"),
              url: z.string().url().or(z.string().startsWith("/")),
            })
          )
          .optional(),
        context: z
          .object({
            path: z.string().optional(),
            page: z.string().optional(),
            role: z.string().optional(),
          })
          .optional(),
      })
      .parse(req.body || {});

    // نوشتن در DB فقط برای ادمین احراز هویت‌شده
    if (conv.agent_name === "admin_assistant") {
      if (!req.user || req.user.role !== "admin") {
        throw new HttpError(403, "Admin authentication required for admin assistant");
      }
    }

    const userMsg: ChatMessage = {
      role: body.role,
      content: body.content,
      attachments: body.attachments,
    };
    conv.messages.push(userMsg);
    conv.updatedAt = Date.now();

    if (body.role === "user") {
      const history = conv.messages.slice(0, -1);
      const ctx = {
        ...(typeof conv.metadata === "object" && conv.metadata?.context
          ? (conv.metadata.context as object)
          : {}),
        ...body.context,
      };

      let contentForModel = body.content;
      if (body.attachments?.length) {
        contentForModel +=
          "\n[تصویر پیوست: " + body.attachments.map((a) => a.url).join(", ") + "]";
      }

      const { text, blocks } = await buildAssistantReply(
        conv.agent_name,
        contentForModel,
        history,
        ctx
      );

      conv.messages.push({
        role: "assistant",
        content: text,
        blocks: blocks || [],
      });
      conv.updatedAt = Date.now();
    }

    res.json(conv);
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

export default router;
