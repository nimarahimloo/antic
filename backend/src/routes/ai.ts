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
  getChatModel,
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
  getProviderUsageToday,
  reserveAIUsage,
} from "../services/aiUsage.js";
import { generateWorkspaceImage } from "../services/aiImages.js";
import {
  classifyProviderError,
  getBreakerStatus,
  getChatCandidates,
  recordProviderFailure,
  recordProviderSuccess,
  selectChatRoute,
  selectImageRoute,
} from "../services/aiRouting.js";
import {
  createMemory,
  deleteMemory,
  deleteAllMemories,
  getMemory,
  getMemoriesForContext,
  listMemories,
  searchMemoriesByContent,
  updateMemory,
  upsertMemory,
  type CreateMemoryInput,
  type MemoryType,
  MEMORY_TYPES,
  MEMORY_CATEGORIES,
} from "../services/aiMemory.js";
import { extractMemoriesFromConversation } from "../services/aiMemoryExtraction.js";

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
      })
      .parse(req.body || {});

    // Conversations can be created without an assigned provider.
    // Provider/model are assigned on the first inference request via
    // automatic routing in POST /api/ai/chat.
    const route = selectChatRoute();

    const conversation = await prisma.aIConversation.create({
      data: {
        userId: ownerId,
        title: body.title || "گفتگوی جدید",
        provider: route.primary?.providerId ?? undefined,
        model: route.primary?.modelId ?? undefined,
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
        routing: {
          candidates: route.candidates.map((c) => ({
            provider: c.providerId,
            model: c.modelId,
          })),
          available: route.primary !== null,
        },
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
        // Optional explicit FLUX model. When omitted, use the automatic
        // Cloudflare image-model fallback chain.
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

    // Automatic image routing can fail over between FLUX variants. A manual
    // model selection is validated against the configured image-model catalog.
    const route = selectImageRoute();
    const candidates = body.model
      ? route.candidates.filter((candidate) => candidate.modelId === body.model)
      : route.candidates;
    if (!candidates.length) {
      throw new HttpError(
        body.model ? 400 : 503,
        body.model
          ? "مدل تصویر انتخاب‌شده در فهرست مدل‌های فعال وجود ندارد."
          : "هیچ مدل تولید تصویر در حال حاضر در دسترس نیست.",
      );
    }

    const result = await generateWorkspaceImage({
      userId: ownerId,
      conversationId,
      prompt: body.prompt,
      modelCandidates: candidates.map((c) => c.modelId),
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
    res.status(result.reused ? 200 : 201).json({
      ...result,
      routing: {
        mode: body.model ? "manual" : "automatic",
        candidates: candidates.map((c) => ({
          provider: c.providerId,
          model: c.modelId,
        })),
      },
    });
  } catch (error) {
    sendError(
      res,
      error instanceof z.ZodError ? new HttpError(400, error.message) : error,
    );
  }
});

router.post("/chat", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const body = z
      .object({
        conversationId: z.string().trim().min(1),
        // Both fields must be supplied together and are checked against the
        // configured provider/model allowlist below.
        provider: z.enum(["cloudflare", "google", "nvidia", "openrouter"]).optional(),
        model: z.string().trim().min(1).max(200).optional(),
        messages: z.array(z.unknown()).min(1),
        trigger: z.string().optional(),
        messageId: z.string().optional(),
      })
      .passthrough()
      .parse(req.body || {});

    const conversation = await ownedConversation(body.conversationId, ownerId);
    const toolDefinitions = createAITools();

    // Retrieve relevant long-term memories for this user
    const relevantMemories = await getMemoriesForContext(ownerId, conversation.id, 8);
    const memoryContext = relevantMemories.length
      ? `\n\n[حافظه‌های بلندمدت مرتبط با این کاربر:]\n` +
        relevantMemories
          .map((m) => `- [${m.type}] ${m.content} (اطمینان: ${Math.round(m.confidence * 100)}%, اهمیت: ${m.importance}/5)`)
          .join("\n")
      : "";

    const systemPromptWithMemory = AI_SYSTEM_PROMPT + memoryContext;

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

    // For the UI message stream, exclude any trailing assistant message to avoid
    // the stream treating the new generation as a continuation of the previous
    // assistant response. This ensures each user message gets a fresh assistant
    // response with a unique message ID.
    const uiMessages = (() => {
      let lastUserIndex = -1;
      for (let i = hydrated.length - 1; i >= 0; i--) {
        if (hydrated[i].role === "user") {
          lastUserIndex = i;
          break;
        }
      }
      if (lastUserIndex >= 0) {
        return hydrated.slice(0, lastUserIndex + 1);
      }
      return hydrated;
    })();

    const outputLimit = maxOutputTokens();
    const estimatedInputTokens = Math.ceil(
      JSON.stringify(modelMessages).length / 4,
    );

    let lastError: unknown = null;

    // ─── Automatic routing or explicit model selection ───
    // Manual selections are allow-listed and pinned to the requested model.
    // Automatic mode keeps the health-aware failover chain.
    if (Boolean(body.provider) !== Boolean(body.model)) {
      throw new HttpError(400, "برای انتخاب دستی، Provider و Model باید هم‌زمان ارسال شوند.");
    }
    let candidates;
    if (body.provider && body.model) {
      const selected = getChatCandidates({ requireTools: true }).find(
        (candidate) =>
          candidate.providerId === body.provider && candidate.modelId === body.model,
      );
      if (!selected) {
        throw new HttpError(
          400,
          "مدل انتخاب‌شده در فهرست مدل‌های فعال و سازگار با ابزارها وجود ندارد.",
        );
      }
      candidates = [selected];
    } else {
      const route = selectChatRoute({ requireTools: true });
      if (!route.primary) {
        throw new HttpError(
          503,
          "هیچ ارائه‌دهندهٔ هوش مصنوعی پیکربندی‌شده و در دسترس نیست.",
        );
      }
      candidates = route.candidates;
    }

    for (const candidate of candidates) {
      const { providerId, modelId, model } = candidate;
      const activeTools: ToolSet = model.supportsTools
        ? toolDefinitions
        : {};
      const estimatedQuotaUnits = estimateChatNeurons(
        providerId,
        modelId,
        estimatedInputTokens,
        outputLimit,
      );

      // Reserve quota for this candidate. 429 → try next candidate.
      let usage;
      try {
        usage = await reserveAIUsage({
          userId: ownerId,
          provider: providerId,
          model: modelId,
          operation: "chat",
          estimatedUnits: estimatedQuotaUnits,
        });
      } catch (error) {
        recordProviderFailure(providerId, modelId);
        lastError = error;
        continue;
      }

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
        instructions: systemPromptWithMemory,
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
        "X-AI-Provider": providerId,
        "X-AI-Model": modelId,
      });

      // Use a generator that produces unique IDs per request by incorporating
    // a timestamp and random component. This avoids the issue where
    // createIdGenerator() resets its counter on each request.
    const messageIdGenerator = () =>
      `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 15)}`;

    const uiStream = toUIMessageStream({
        stream: result.stream,
        tools: activeTools,
        originalMessages: uiMessages,
        generateMessageId: messageIdGenerator,
        onError: (error) => {
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
        onEnd: async ({ responseMessage, outcome, isAborted, isContinuation }) => {
          try {
            const usageData = await result.usage;
            const inputTokens = usageData.inputTokens || 0;
            const outputTokens = usageData.outputTokens || 0;
            const totalTokens = usageData.totalTokens || 0;

            // Reconcile actual provider-reported usage with local accounting.
            // Cloudflare Workers AI reports actual Neurons in the API response;
            // use those when available instead of local estimates. For other
            // providers, fall back to the local estimate.
            const estimatedUnits = estimateChatNeurons(
              providerId,
              modelId,
              inputTokens,
              outputTokens,
            );
            const actualNeurons = extractActualNeurons(usageData, providerId);
            const quotaUnits =
              providerId === "cloudflare" && actualNeurons !== null
                ? actualNeurons
                : estimatedUnits;

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

            // Trigger memory extraction in background (non-blocking)
            if (outcome.status === "completed" && responseMessage?.id) {
              void extractMemoriesFromConversation(ownerId, conversation.id, responseMessage.id).catch((err) => {
                console.error("Background memory extraction failed:", err);
              });
            }
          } catch (error) {
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

      try {
        await pipeUIMessageStreamToResponse({
          response: res,
          stream: uiStream,
          headers: {
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
        // Stream completed successfully.
        recordProviderSuccess(providerId, modelId);
        return;
      } catch (streamError) {
        // If headers already sent, we are committed to this response and
        // cannot fail over mid-stream.
        if (res.headersSent) {
          recordProviderFailure(providerId, modelId);
          throw streamError;
        }
        // Not yet committed — try the next candidate.
        recordProviderFailure(providerId, modelId);
        await completeAIUsage(usage.id, {
          status: "error",
          errorCode: "stream_failed",
        }).catch(() => undefined);
        lastError = streamError;
        continue;
      }
    }

    // All candidates exhausted.
    if (lastError instanceof HttpError) throw lastError;
    throw new HttpError(
      502,
      "هیچ ارائه‌دهندهٔ هوش مصنوعی درخواست را هندل نکرد.",
    );
  } catch (error) {
    if (!res.headersSent) {
      sendError(
        res,
        error instanceof z.ZodError
          ? new HttpError(400, error.message)
          : error,
      );
    } else {
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

/** Diagnostic: circuit-breaker status for all provider/model candidates. */
router.get("/breakers", async (_req: AuthedRequest, res) => {
  res.json({ breakers: getBreakerStatus() });
});

/** Diagnostic: per-provider usage for the current UTC day. */
router.get("/provider-usage", async (_req: AuthedRequest, res) => {
  res.json(await getProviderUsageToday());
});

/* ─────────────────────────── Memory Management ─────────────────────────── */

router.get("/memory/types", (_req, res) => {
  res.json({ types: MEMORY_TYPES, categories: MEMORY_CATEGORIES });
});

router.get("/memory", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const query = z
      .object({
        type: z.enum(["preference", "fact", "project_context", "communication_style", "decision", "correction"]).optional(),
        category: z.string().trim().max(50).optional(),
        conversationId: z.string().trim().min(1).optional(),
        minImportance: z.coerce.number().int().min(1).max(5).optional(),
        minConfidence: z.coerce.number().min(0).max(1).optional(),
        includeExpired: z.coerce.boolean().optional(),
        limit: z.coerce.number().int().min(1).max(200).optional(),
        offset: z.coerce.number().int().min(0).optional(),
        search: z.string().trim().max(200).optional(),
      })
      .parse(req.query);

    if (query.search) {
      const memories = await searchMemoriesByContent(ownerId, query.search, {
        type: query.type,
        category: query.category,
        conversationId: query.conversationId,
        minImportance: query.minImportance,
        minConfidence: query.minConfidence,
        includeExpired: query.includeExpired,
        limit: query.limit,
      });
      return res.json({ memories, total: memories.length });
    }

    const result = await listMemories({
      userId: ownerId,
      type: query.type,
      category: query.category,
      conversationId: query.conversationId,
      minImportance: query.minImportance,
      minConfidence: query.minConfidence,
      includeExpired: query.includeExpired,
      limit: query.limit,
      offset: query.offset,
    });
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
});

router.post("/memory", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const body = z
      .object({
        conversationId: z.string().trim().min(1).optional(),
        type: z.enum(["preference", "fact", "project_context", "communication_style", "decision", "correction"]),
        category: z.string().trim().max(50).optional(),
        content: z.string().trim().min(5).max(2000),
        sourceMessageId: z.string().trim().min(1).optional(),
        confidence: z.number().min(0).max(1).optional(),
        importance: z.number().int().min(1).max(5).optional(),
        expiresAt: z.string().datetime().optional(),
        metadata: z.record(z.unknown()).optional(),
        deduplicate: z.boolean().optional(),
      })
      .parse(req.body || {});

    const input: CreateMemoryInput = {
      userId: ownerId,
      conversationId: body.conversationId || null,
      type: body.type,
      category: body.category || null,
      content: body.content,
      sourceMessageId: body.sourceMessageId || null,
      confidence: body.confidence,
      importance: body.importance,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      metadata: body.metadata || null,
    };

    const memory = body.deduplicate
      ? await upsertMemory({ ...input, deduplicate: true })
      : await createMemory(input);

    res.status(201).json({ memory });
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/memory/:id", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const memory = await getMemory(ownerId, routeParam(req, "id"));
    if (!memory) throw new HttpError(404, " خاطره یافت نشد.");
    res.json({ memory });
  } catch (error) {
    sendError(res, error);
  }
});

router.patch("/memory/:id", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const id = routeParam(req, "id");
    const body = z
      .object({
        content: z.string().trim().min(5).max(2000).optional(),
        type: z.enum(["preference", "fact", "project_context", "communication_style", "decision", "correction"]).optional(),
        category: z.string().trim().max(50).nullable().optional(),
        confidence: z.number().min(0).max(1).optional(),
        importance: z.number().int().min(1).max(5).optional(),
        expiresAt: z.string().datetime().nullable().optional(),
        metadata: z.record(z.unknown()).nullable().optional(),
      })
      .parse(req.body || {});

    const memory = await updateMemory(ownerId, id, {
      content: body.content,
      type: body.type,
      category: body.category ?? undefined,
      confidence: body.confidence,
      importance: body.importance,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : body.expiresAt === null ? null : undefined,
      metadata: body.metadata ?? undefined,
    });
    res.json({ memory });
  } catch (error) {
    sendError(res, error);
  }
});

router.delete("/memory/:id", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    await deleteMemory(ownerId, routeParam(req, "id"));
    res.status(204).end();
  } catch (error) {
    sendError(res, error);
  }
});

router.delete("/memory", async (req: AuthedRequest, res) => {
  try {
    const ownerId = userId(req);
    const body = z.object({ confirm: z.literal(true) }).parse(req.body || {});
    if (!body.confirm) throw new HttpError(400, "تأیید حذف تمام خاطرات الزامی است.");
    const count = await deleteAllMemories(ownerId);
    res.json({ deleted: count });
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * Extract actual Cloudflare Neurons from the Vercel AI SDK usage data.
 *
 * Cloudflare Workers AI reports actual Neuron consumption in the API
 * response. The Vercel AI SDK may surface this as a provider-specific
 * field on the usage object. When available, use the actual value
 * instead of the local estimate for accurate quota accounting.
 *
 * Returns null when actual neurons cannot be determined, in which case
 * the caller should fall back to estimateChatNeurons().
 */
function extractActualNeurons(
  usageData: Record<string, unknown>,
  providerId: AIProviderId,
): number | null {
  if (providerId !== "cloudflare") return null;

  // Check common locations where the SDK might surface provider-specific
  // usage metadata (e.g. Cloudflare's `neurons` field). Cast through
  // `any` to avoid strict unknown-type errors when probing nested fields.
  const raw = usageData as Record<string, unknown> & {
    neurons?: unknown;
    cloudflareNeurons?: unknown;
    providerMetadata?: Record<string, unknown> | null;
    usage?: Record<string, unknown> | null;
  };

  const candidates: unknown[] = [
    raw.neurons,
    raw.cloudflareNeurons,
    raw.providerMetadata?.["neurons"],
    raw.usage?.["neurons"],
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && candidate >= 0) {
      return candidate;
    }
  }

  return null;
}

export default router;
