import { createHash, randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { AIFile } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/errors.js";

export const AI_FILE_MAX_BYTES = 12 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "text/csv": ".csv",
  "application/pdf": ".pdf",
  "application/json": ".json",
};

export function isAllowedAIFileMime(mimeType: string) {
  return Boolean(MIME_EXTENSIONS[mimeType.toLowerCase()]);
}

function privateDirectory() {
  const configured = process.env.AI_PRIVATE_DIR?.trim() || "./data/ai";
  return path.resolve(configured);
}

async function ensurePrivateDirectory() {
  const directory = privateDirectory();
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  return directory;
}

function absoluteStoragePath(storagePath: string) {
  const directory = privateDirectory();
  const resolved = path.resolve(directory, path.basename(storagePath));
  if (path.dirname(resolved) !== directory) {
    throw new HttpError(400, "مسیر فایل خصوصی نامعتبر است.");
  }
  return resolved;
}

export async function savePrivateAIFile(input: {
  userId: string;
  conversationId?: string | null;
  kind?: "input" | "output";
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  provider?: string | null;
  model?: string | null;
  prompt?: string | null;
  metadata?: Record<string, unknown> | null;
  requestKey?: string | null;
}) {
  if (!input.buffer.length) throw new HttpError(400, "فایل خالی است.");
  if (input.buffer.length > AI_FILE_MAX_BYTES) {
    throw new HttpError(413, "حجم فایل نباید بیشتر از ۱۲ مگابایت باشد.");
  }
  const mimeType = input.mimeType.toLowerCase();
  if (!isAllowedAIFileMime(mimeType)) {
    throw new HttpError(415, "نوع فایل پشتیبانی نمی‌شود.");
  }

  const directory = await ensurePrivateDirectory();
  const filename = `${randomUUID()}${MIME_EXTENSIONS[mimeType] || ".bin"}`;
  const destination = path.join(directory, filename);
  await fs.writeFile(destination, input.buffer, { flag: "wx", mode: 0o600 });

  try {
    return await prisma.aIFile.create({
      data: {
        userId: input.userId,
        conversationId: input.conversationId || null,
        kind: input.kind || "input",
        originalName: path.basename(input.originalName || filename).slice(0, 255),
        mimeType,
        size: input.buffer.length,
        storagePath: filename,
        sha256: createHash("sha256").update(input.buffer).digest("hex"),
        requestKey: input.requestKey || null,
        provider: input.provider || null,
        model: input.model || null,
        prompt: input.prompt || null,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (error) {
    await fs.rm(destination, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function getPrivateAIFile(userId: string, id: string) {
  const file = await prisma.aIFile.findFirst({ where: { id, userId } });
  if (!file) throw new HttpError(404, "فایل پیدا نشد.");
  return file;
}

export async function readPrivateAIFile(file: AIFile) {
  const source = absoluteStoragePath(file.storagePath);
  try {
    return await fs.readFile(source);
  } catch {
    throw new HttpError(404, "فایل روی سرور موجود نیست.");
  }
}

export async function removePrivateAIFile(file: AIFile) {
  const source = absoluteStoragePath(file.storagePath);
  await fs.rm(source, { force: true }).catch(() => undefined);
  await prisma.aIFile.deleteMany({ where: { id: file.id, userId: file.userId } });
}

export function serializeAIFile(file: AIFile) {
  return {
    id: file.id,
    kind: file.kind,
    name: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    url: `/api/ai/files/${file.id}`,
    provider: file.provider,
    model: file.model,
    prompt: file.prompt,
    createdAt: file.createdAt.toISOString(),
  };
}

function privateFileId(url: string) {
  const match = url.match(/\/api\/ai\/files\/([A-Za-z0-9_-]+)(?:[?#]|$)/);
  return match?.[1] || null;
}

/**
 * Replaces protected workspace URLs with data URLs before a model call. The
 * provider never receives the local bearer token or a public file URL.
 */
export async function hydratePrivateAIFileUrls(
  messages: Array<{ role: string; parts: unknown[] }>,
  userId: string,
) {
  const ids = new Set<string>();
  for (const message of messages) {
    for (const part of message.parts || []) {
      if (!part || typeof part !== "object") continue;
      const candidate = part as { type?: unknown; url?: unknown };
      if (candidate.type !== "file" || typeof candidate.url !== "string") continue;
      const id = privateFileId(candidate.url);
      if (id) ids.add(id);
    }
  }
  if (!ids.size) return messages;

  const rows = await prisma.aIFile.findMany({
    where: { id: { in: [...ids] }, userId },
  });
  const byId = new Map(rows.map((file) => [file.id, file]));

  return Promise.all(
    messages.map(async (message) => ({
      ...message,
      parts: await Promise.all(
        (message.parts || []).map(async (part) => {
          if (!part || typeof part !== "object") return part;
          const candidate = part as { type?: unknown; url?: unknown };
          if (candidate.type !== "file" || typeof candidate.url !== "string") {
            return part;
          }
          const id = privateFileId(candidate.url);
          if (!id) return part;
          const file = byId.get(id);
          if (!file) return part;
          const bytes = await readPrivateAIFile(file);
          return {
            ...candidate,
            url: `data:${file.mimeType};base64,${bytes.toString("base64")}`,
          };
        }),
      ),
    })),
  );
}
