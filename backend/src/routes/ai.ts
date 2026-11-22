import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  convertToModelMessages,
  createIdGenerator,
  isStepCount,
  pipeUIMessageStreamToResponse,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type ToolSet,
  type UIMessage,
} from "ai";
import { requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { HttpError, sendError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { routeParam } from "../lib/routeParams.js";
import {
  estimateChatNeurons,
  getAIModelInfo,
  getChatModel,
  getDefaultChatModel,
  getDefaultImageModel,
  listAIProviders,
  type AIProviderId,
} from "../services/aiProviders.js";
import { AI_SYSTEM_PROMPT, createAITools } from "../services/aiTools.js";
import {
  getPrivateAIFile,
  hydratePrivateAIFileUrls,
  isAllowedAIFileMime,
  readPrivateAIFile,
  removePrivateAIFile,
  savePrivateAIFile,
  serializeAIFile,
} from "../services/aiFiles.js";
import {
  completeAIUsage,
  getAIUsageSummary,
  reserveAIUsage,
} from "../services/aiUsage.js";
import { generateWorkspaceImage } from "../services/aiImages.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedAIFileMime(file.mimetype)) {
      cb(new Error("نوع فایل پشتیبانی نمی‌شود."));
      return;
    }
    cb(null, true);
  },
});

router.use(requireAdmin);

function userId(req: AuthedRequest) {
  if (!req.user?.sub) throw new HttpError(401, "Authentication required");
  return req.user.sub;
}

function parseParts(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storedMessageToUI(message: {
  id: string;
  role: string;
  partsJson: string;
  createdAt: Date;
}): UIMessage {
  return {
    id: message.id,
    role: message.role === "assistant" ? "assistant" : "user",
    parts: parseParts(message.partsJson) as UIMessage["parts"],
  };
}

async function ownedConversation(id: string, ownerId: string) {
  const conversation = await prisma.aIConversation.findFirst({
    where: { id, userId: ownerId },
  });
  if (!conversation) throw new HttpError(404, "گفتگو پیدا نشد.");
  return conversation;
}

function messageText(message: UIMessage) {
  return message.parts
    .filter(
      (part): part is Extract<(typeof message.parts)[number], { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function titleFromMessage(message: UIMessage) {
  const text = messageText(message).replace(/\s+/g, " ").slice(0, 90);
  return text || "گفتگوی جدید";
}

function maxOutputTokens() {
  const value = Number(process.env.AI_MAX_OUTPUT_TOKENS);
  return Number.isFinite(value) && value >= 256 ? Math.min(Math.floor(value), 8_000) : 2_500;
}

router.get("/providers", (_req, res) => {
  res.json({ providers: listAIProviders() });
});

router.get("/conversations", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const rows = await prisma.aIConversation.findMany({
      where: { userId: ownerId },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { _count: { select: { messages: true, files: true } } },
    });
    res.json({
      conversations: rows.map((row) => ({
        id: row.id,
        title: row.title,
        provider: row.provider,
        model: row.model,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        messageCount: row._count.messages,
        fileCount: row._count.files,
      })),
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.post("/conversations", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const body = z
      .object({
        title: z.string().trim().min(1).max(120).optional(),
        provider: z.enum(["cloudflare", "google", "openrouter"]).optional(),
        model: z.string().trim().min(1).max(200).optional(),
      })
      .parse(req.body || {});
    const provider = body.provider || "cloudflare";
    const model = body.model || getDefaultChatModel(provider);
    const conversation = await prisma.aIConversation.create({
      data: {
        userId: ownerId,
        title: body.title || "گفتگوی جدید",
        provider,
        model,
      },
    });
    res.status(201).json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        provider: conversation.provider,
        model: conversation.model,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messageCount: 0,
        fileCount: 0,
      },
    });
  } catch (error) {
    sendError(
      res,
      error instanceof z.ZodError ? new HttpError(400, error.message) : error,
    );
  }
});

router.get("/conversations/:id", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const conversation = await ownedConversation(routeParam(req, "id"), ownerId);
    const [messages, files] = await Promise.all([
      prisma.aIChatMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.aIFile.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    res.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        provider: conversation.provider,
        model: conversation.model,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        parts: parseParts(message.partsJson),
        createdAt: message.createdAt.toISOString(),
      })),
      files: files.map(serializeAIFile),
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.patch("/conversations/:id", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const id = routeParam(req, "id");
    await ownedConversation(id, ownerId);
    const body = z
      .object({
        title: z.string().trim().min(1).max(120).optional(),
        provider: z.enum(["cloudflare", "google", "openrouter"]).optional(),
        model: z.string().trim().min(1).max(200).optional(),
      })
      .parse(req.body || {});
    const conversation = await prisma.aIConversation.update({
      where: { id },
      data: body,
    });
    res.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        provider: conversation.provider,
        model: conversation.model,
        updatedAt: conversation.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    sendError(
      res,
      error instanceof z.ZodError ? new HttpError(400, error.message) : error,
    );
  }
});

router.delete("/conversations/:id", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const id = routeParam(req, "id");
    await ownedConversation(id, ownerId);
    const files = await prisma.aIFile.findMany({
      where: { conversationId: id, userId: ownerId },
    });
    await prisma.aIConversation.delete({ where: { id } });
    await Promise.all(files.map((file) => removePrivateAIFile(file)));
    res.status(204).end();
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/usage", async (req: AuthedRequest, res) => {
  try {
    res.json(await getAIUsageSummary(userId(req)));
  } catch (error) {
    sendError(res, error);
  }
});

router.post("/files", (req: AuthedRequest, res) => {
  upload.single("file")(req, res, async (uploadError) => {
    if (uploadError) {
      sendError(res, new HttpError(400, uploadError.message || "بارگذاری فایل ناموفق بود."));
      return;
    }
    try {
      const ownerId = userId(req);
      if (!req.file) throw new HttpError(400, "فایلی ارسال نشده است.");
      const conversationId = String(req.body?.conversationId || "").trim();
      if (conversationId) await ownedConversation(conversationId, ownerId);
      const file = await savePrivateAIFile({
        userId: ownerId,
        conversationId: conversationId || null,
        kind: "input",
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
      });
      res.status(201).json({ file: serializeAIFile(file) });
    } catch (error) {
      sendError(res, error);
    }
  });
});

router.get("/files/:id", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const file = await getPrivateAIFile(ownerId, routeParam(req, "id"));
    const bytes = await readPrivateAIFile(file);
    res.set({
      "Content-Type": file.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(bytes);
  } catch (error) {
    sendError(res, error);
  }
});

router.delete("/files/:id", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const file = await getPrivateAIFile(ownerId, routeParam(req, "id"));
    await removePrivateAIFile(file);
    res.status(204).end();
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/images", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const conversationId = String(req.query.conversationId || "").trim();
    const where = {
      userId: ownerId,
      kind: "output",
      ...(conversationId ? { conversationId } : {}),
    };
    if (conversationId) await ownedConversation(conversationId, ownerId);
    const files = await prisma.aIFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ files: files.map(serializeAIFile) });
  } catch (error) {
    sendError(res, error);
  }
});

router.post("/images/generate", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const body = z
      .object({
        conversationId: z.string().trim().min(1).optional(),
        prompt: z.string().trim().min(1).max(4_000),
        model: z.string().trim().min(1).max(200).optional(),
        referenceFileIds: z.array(z.string().trim().min(1)).max(4).default([]),
        width: z.number().int().min(256).max(1_920).optional(),
        height: z.number().int().min(256).max(1_920).optional(),
        steps: z.number().int().min(1).max(20).optional(),
        guidance: z.number().min(0).max(10).optional(),
        requestKey: z.string().trim().min(8).max(120).optional(),
      })
      .parse(req.body || {});
    const conversationId = body.conversationId || null;
    if (conversationId) await ownedConversation(conversationId, ownerId);
    const result = await generateWorkspaceImage({
      userId: ownerId,
      conversationId,
      prompt: body.prompt,
      modelId: body.model || getDefaultImageModel(),
      referenceFileIds: body.referenceFileIds,
      width: body.width || 1024,
      height: body.height || 1024,
      steps: body.steps,
      guidance: body.guidance,
      requestKey:
        body.requestKey ||
        String(req.headers["idempotency-key"] || "").trim() ||
        null,
    });
    res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    sendError(
      res,
      error instanceof z.ZodError ? new HttpError(400, error.message) : error,
    );
  }
});

router.post("/chat", async (req: AuthedRequest, res) => {
  let usageId: string | null = null;
  try {
    const ownerId = userId(req);
    const body = z
      .object({
        conversationId: z.string().trim().min(1),
        provider: z.enum(["cloudflare", "google", "openrouter"]).optional(),
        model: z.string().trim().min(1).max(200).optional(),
        messages: z.array(z.unknown()).min(1),
        trigger: z.string().optional(),
        messageId: z.string().optional(),
      })
      .passthrough()
      .parse(req.body || {});

    const conversation = await ownedConversation(body.conversationId, ownerId);
    const providerId = (body.provider || conversation.provider) as AIProviderId;
    const modelId = body.model || conversation.model || getDefaultChatModel(providerId);
    const modelInfo = getAIModelInfo(providerId, modelId);
    const toolDefinitions = createAITools();
    const validatedIncoming = await validateUIMessages({
      messages: body.messages,
      tools: toolDefinitions,
    });

    const storedRows = await prisma.aIChatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });
    let canonical = storedRows.map(storedMessageToUI);
    const canonicalIds = new Set(canonical.map((message) => message.id));

    if (body.trigger === "regenerate-message" && body.messageId) {
      const targetIndex = canonical.findIndex(
        (message) => message.id === body.messageId,
      );
      if (targetIndex >= 0) {
        const target = canonical[targetIndex];
        const deleteFrom = target.role === "assistant" ? targetIndex : targetIndex + 1;
        const deleteIds = canonical.slice(deleteFrom).map((message) => message.id);
        await prisma.aIChatMessage.deleteMany({
          where: { id: { in: deleteIds }, conversationId: conversation.id },
        });
        canonical = canonical.slice(0, deleteFrom);
      }
    }

    const incomingUsers = validatedIncoming.filter(
      (message): message is UIMessage => message.role === "user",
    );
    const newUsers: UIMessage[] = [];
    for (const message of incomingUsers) {
      if (canonicalIds.has(message.id)) continue;
      await prisma.aIChatMessage.create({
        data: {
          id: message.id,
          conversationId: conversation.id,
          role: "user",
          partsJson: JSON.stringify(message.parts),
        },
      });
      newUsers.push(message);
    }

    let contextMessages = [...canonical, ...newUsers];
    if (!contextMessages.some((message) => message.role === "user")) {
      throw new HttpError(400, "پیام کاربر برای تولید پاسخ وجود ندارد.");
    }
    contextMessages = contextMessages.slice(-80);

    const validatedContext = await validateUIMessages({
      messages: contextMessages,
      tools: toolDefinitions,
    });
    const hydrated = (await hydratePrivateAIFileUrls(
      validatedContext,
      ownerId,
    )) as UIMessage[];
    const modelMessages = await convertToModelMessages(hydrated, {
      tools: toolDefinitions,
      ignoreIncompleteToolCalls: true,
    });

    const activeTools: ToolSet = modelInfo.supportsTools
      ? toolDefinitions
      : {};
    const outputLimit = maxOutputTokens();
    const estimatedInputTokens = Math.ceil(
      JSON.stringify(modelMessages).length / 4,
    );
    const estimatedQuotaUnits = estimateChatNeurons(
      providerId,
      modelId,
      estimatedInputTokens,
      outputLimit,
    );
    const usage = await reserveAIUsage({
      userId: ownerId,
      provider: providerId,
      model: modelId,
      operation: "chat",
      estimatedUnits: estimatedQuotaUnits,
    });
    usageId = usage.id;

    await prisma.aIConversation.update({
      where: { id: conversation.id },
      data: {
        provider: providerId,
        model: modelId,
        ...(newUsers[0] && conversation.title === "گفتگوی جدید"
          ? { title: titleFromMessage(newUsers[0]) }
          : {}),
      },
    });

    const result = streamText({
      model: getChatModel(providerId, modelId),
      instructions: AI_SYSTEM_PROMPT,
      messages: modelMessages,
      tools: activeTools,
      stopWhen: isStepCount(6),
      maxOutputTokens: outputLimit,
      temperature: 0.35,
    });

    res.set({
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-AI-Conversation-Id": conversation.id,
    });

    const uiStream = toUIMessageStream({
      stream: result.stream,
      tools: activeTools,
      originalMessages: hydrated,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 18 }),
      onError: (error) => {
        // Log only safe fields - never expose prompts, attachments, or request bodies
        if (error && typeof error === 'object') {
          const err = error as Record<string, unknown>;
          console.error("AI workspace stream error", {
            name: err.name,
            code: err.code,
            status: err.status,
            message: err.message,
            requestId: err.requestId,
          });
        }
        return "خطا در ارتباط با سرویس هوش مصنوعی. لطفاً دوباره تلاش کنید.";
      },
      onEnd: async ({ responseMessage, outcome, isAborted }) => {
        try {
          const usageData = await result.usage;
          const inputTokens = usageData.inputTokens || 0;
          const outputTokens = usageData.outputTokens || 0;
          const totalTokens = usageData.totalTokens || 0;
          const quotaUnits = estimateChatNeurons(
            providerId,
            modelId,
            inputTokens,
            outputTokens,
          );

          if (responseMessage?.parts?.length) {
            await prisma.aIChatMessage.upsert({
              where: { id: responseMessage.id },
              create: {
                id: responseMessage.id,
                conversationId: conversation.id,
                role: "assistant",
                partsJson: JSON.stringify(responseMessage.parts),
                provider: providerId,
                model: modelId,
                inputTokens,
                outputTokens,
                totalTokens,
              },
              update: {
                partsJson: JSON.stringify(responseMessage.parts),
                provider: providerId,
                model: modelId,
                inputTokens,
                outputTokens,
                totalTokens,
              },
            });
          }

          await completeAIUsage(usage.id, {
            status:
              outcome.status === "completed"
                ? "success"
                : outcome.status === "aborted" || isAborted
                  ? "aborted"
                  : "error",
            inputTokens,
            outputTokens,
            totalTokens,
            units: quotaUnits,
            errorCode: outcome.status === "failed" ? "stream_failed" : undefined,
          });
          await prisma.aIConversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });
        } catch (error) {
          // Log only safe fields - never expose prompts, attachments, or request bodies
          if (error && typeof error === 'object') {
            const err = error as Record<string, unknown>;
            console.error("AI workspace persistence failed", {
              name: err.name,
              code: err.code,
              message: typeof err.message === 'string' ? err.message : 'unknown error',
              conversationId: conversation.id,
            });
          }
        }
      },
    });

    await pipeUIMessageStreamToResponse({
      response: res,
      stream: uiStream,
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (usageId) {
      await completeAIUsage(usageId, {
        status: "error",
        errorCode: error instanceof HttpError ? String(error.status) : "route_error",
      }).catch(() => undefined);
    }
    if (!res.headersSent) {
      sendError(
        res,
        error instanceof z.ZodError
          ? new HttpError(400, error.message)
          : error,
      );
    } else {
      // Log only safe fields - never expose prompts, attachments, or request bodies
      if (error && typeof error === 'object') {
        const err = error as Record<string, unknown>;
        console.error("AI workspace response failed after headers", {
          name: err.name,
          code: err.code,
          message: typeof err.message === 'string' ? err.message : 'unknown error',
        });
      }
      res.end();
    }
  }
});

export default router;
