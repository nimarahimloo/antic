import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { HttpError, sendError } from "../lib/errors.js";
import { buildAssistantReply, type ChatMessage } from "../lib/consultant.js";

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

function welcome(agent: string) {
  if (agent === "admin_assistant") {
    return (
      "سلام — دستیار ادمین آنتیک هستم. هر صفحه‌ای از پنل که باشی می‌بینم و قدم‌به‌قدم کمک می‌کنم: " +
      "مدل، قالب chroma، متن، دسته، سفارش و درخواست مشاوره. بگو الان چی لازم داری."
    );
  }
  return (
    "سلام 👋 دستیار طراحی پرده آنتیک هستم. سلیقه‌ت را می‌پرسم و از کاتالوگ واقعی مدل پیشنهاد می‌دهم. " +
    "فضا، نور و سبک دکوراسیونت را بگو."
  );
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
      messages: [{ role: "assistant", content: welcome(body.agent_name) }],
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

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const conv = store.get(req.params.id);
    if (!conv) throw new HttpError(404, "Conversation not found");

    const body = z
      .object({
        role: z.enum(["user", "assistant"]).default("user"),
        content: z.string().min(1),
        context: z
          .object({
            path: z.string().optional(),
            page: z.string().optional(),
            role: z.string().optional(),
          })
          .optional(),
      })
      .parse(req.body || {});

    conv.messages.push({ role: body.role, content: body.content });
    conv.updatedAt = Date.now();

    if (body.role === "user") {
      const history = conv.messages.slice(0, -1);
      const ctx = {
        ...(typeof conv.metadata === "object" && conv.metadata?.context
          ? (conv.metadata.context as object)
          : {}),
        ...body.context,
      };
      const { text, meta } = await buildAssistantReply(
        conv.agent_name,
        body.content,
        history,
        ctx
      );
      conv.messages.push({
        role: "assistant",
        content: text,
        tool_calls: [
          {
            status: "completed",
            display_projection: {
              label: conv.agent_name === "admin_assistant" ? "دستیار ادمین" : "کاتالوگ محلی",
            },
            arguments_string: JSON.stringify({
              query: body.content.slice(0, 120),
              intent: meta.intent,
              path: meta.path,
            }),
            results: JSON.stringify(meta),
          },
        ],
      });
      conv.updatedAt = Date.now();
    }

    res.json(conv);
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

export default router;
