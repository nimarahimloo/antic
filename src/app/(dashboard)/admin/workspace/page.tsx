"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DefaultChatTransport,
  isFileUIPart,
  isTextUIPart,
  isToolUIPart,
  type UIMessage,
} from "ai";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertCircle,
  Bot,
  Brain,
  Check,
  CircleCheck,
  Download,
  FileImage,
  ImagePlus,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Send,
  Sparkles,
  Square,
  Trash2,
  User,
  Wrench,
  X,
  Search,
  Plus,
  Edit2,
} from "lucide-react";
import { api, getAccessToken } from "@/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  AIWorkspaceConversation,
  AIWorkspaceFile,
  AIWorkspaceProvider,
  AIWorkspaceUsage,
  AIWorkspaceMemory,
  AIMemoryTypeInfo,
} from "@/types/ai-workspace";

const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/webp,image/gif,text/plain,text/markdown,text/csv,application/pdf,application/json";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "خطای پیش‌بینی‌نشده رخ داد.";
}

function fileIdFromUrl(url: string) {
  return url.match(/\/api\/ai\/files\/([A-Za-z0-9_-]+)/)?.[1] || null;
}

function formatTime(value?: string) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatDate(value?: string) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function PrivateImage({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  const directUrl = url.startsWith("data:") || url.startsWith("blob:") ? url : null;
  const fileId = fileIdFromUrl(url);
  const [loaded, setLoaded] = useState<{ url: string; src: string } | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (directUrl || !fileId) return;

    let active = true;
    let objectUrl: string | null = null;
    void api.ai
      .downloadFile(fileId)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ url, src: objectUrl });
      })
      .catch(() => {
        if (active) setFailedUrl(url);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [directUrl, fileId, url]);

  const src = directUrl || (loaded?.url === url ? loaded.src : null);
  const failed = !directUrl && (!fileId || failedUrl === url);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-secondary/40 text-xs text-muted-foreground",
          className,
        )}
      >
        <FileImage className="h-6 w-6" />
      </div>
    );
  }
  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-secondary/30",
          className,
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("object-cover", className)}
      loading="lazy"
    />
  );
}

async function downloadWorkspaceFile(file: AIWorkspaceFile) {
  const blob = await api.ai.downloadFile(file.id);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name || `workspace-${file.id}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

type WorkspaceToolPart = {
  type: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function ToolPart({ part }: { part: WorkspaceToolPart }) {
  const state = part.state;
  const status =
    state === "output-available"
      ? "انجام شد"
      : state === "output-error" || state === "output-denied"
        ? "خطا"
        : state === "input-available"
          ? "آمادهٔ اجرا"
          : "در حال اجرا";
  const details =
    state === "output-available"
      ? part.output
      : state === "output-error"
        ? part.errorText
        : part.input;
  const toolName =
    part.toolName || part.type.replace(/^tool-/, "").replace(/^dynamic-tool$/, "tool");

  return (
    <details dir="rtl" className="my-2 overflow-hidden rounded-xl border border-primary/20 bg-primary/5">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs text-primary">
        <Wrench className="h-3.5 w-3.5" />
        <span className="font-semibold">{toolName}</span>
        <span className="text-muted-foreground">· {status}</span>
      </summary>
      {details !== undefined ? (
        <pre className="max-h-64 overflow-auto border-t border-primary/15 bg-background px-3 py-2 text-sm font-mono text-right text-muted-foreground">
          {JSON.stringify(details, null, 2)}
        </pre>
      ) : null}
    </details>
  );
}

function WorkspaceMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <article
      dir="rtl"
      className={cn(
        "flex gap-3 py-4",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-primary/15 text-primary",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[86%] space-y-2 rounded-2xl px-4 py-3 text-right",
          isUser
            ? "bg-secondary/70 text-foreground"
            : "border border-secondary/50 bg-card text-card-foreground",
        )}
      >
        {message.parts.map((part, index) => {
          if (isTextUIPart(part)) {
            if (!part.text.trim()) return null;
            if (isUser) {
              return (
                <p
                  key={`${message.id}-text-${index}`}
                  className="whitespace-pre-wrap text-sm leading-7"
                >
                  {part.text}
                </p>
              );
            }
            return (
              <div
                key={`${message.id}-text-${index}`}
                className="workspace-markdown text-sm leading-7"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
              </div>
            );
          }

          if (isFileUIPart(part)) {
            const fileId = fileIdFromUrl(part.url);
            const isImage = part.mediaType.startsWith("image/");
            return (
              <div
                key={`${message.id}-file-${index}`}
                className="rounded-xl border border-secondary/50 bg-background/40 p-2"
              >
                {isImage ? (
                  <PrivateImage
                    url={part.url}
                    alt={part.filename || "پیوست تصویر"}
                    className="h-48 w-full max-w-sm rounded-lg"
                  />
                ) : null}
                <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{part.filename || "فایل پیوست"}</span>
                  </span>
                  {fileId ? (
                    <button
                      type="button"
                      onClick={() =>
                        void downloadWorkspaceFile({
                          id: fileId,
                          name: part.filename || "پیوست",
                          mimeType: part.mediaType,
                          size: 0,
                          url: part.url,
                          kind: "input",
                          createdAt: new Date().toISOString(),
                        })
                      }
                      className="text-primary hover:text-primary/80"
                    >
                      دریافت
                    </button>
                  ) : null}
                </div>
              </div>
            );
          }

          if (isToolUIPart(part)) {
            return (
              <ToolPart
                key={`${message.id}-tool-${index}`}
                part={part as WorkspaceToolPart}
              />
            );
          }

          return null;
        })}
      </div>
    </article>
  );
}

type PendingAttachment = {
  key: string;
  file: File;
  preview?: string;
};

type MemoryTab = "chat" | "images" | "memory";

export default function AIWorkspacePage() {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        headers: () => {
          const headers: Record<string, string> = {};
          const token = getAccessToken();
          if (token) headers.Authorization = `Bearer ${token}`;
          return headers;
        },
      }),
    [],
  );

  const {
    messages,
    setMessages,
    sendMessage,
    stop,
    status,
    error: chatError,
    clearError,
  } = useChat({
    transport,
    onFinish: () => {
      void refreshUsage();
      void refreshConversations();
    },
  });

  const [providers, setProviders] = useState<AIWorkspaceProvider[]>([]);
  const [selectedModelKey, setSelectedModelKey] = useState("auto");
  const [conversations, setConversations] = useState<AIWorkspaceConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [usage, setUsage] = useState<AIWorkspaceUsage | null>(null);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sendingFiles, setSendingFiles] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [selectedImageModel, setSelectedImageModel] = useState("auto");
  const [imageWidth, setImageWidth] = useState(1024);
  const [imageHeight, setImageHeight] = useState(1024);
  const [imageReferences, setImageReferences] = useState<AIWorkspaceFile[]>([]);
  const [imageOutputs, setImageOutputs] = useState<AIWorkspaceFile[]>([]);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memory state
  const [activeTab, setActiveTab] = useState<MemoryTab>("chat");
  const [memoryTypes, setMemoryTypes] = useState<AIMemoryTypeInfo[]>([]);
  const [memories, setMemories] = useState<AIWorkspaceMemory[]>([]);
  const [memoryTotal, setMemoryTotal] = useState(0);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memoryPage, setMemoryPage] = useState(0);
  const [memorySearch, setMemorySearch] = useState("");
  const [memoryFilterType, setMemoryFilterType] = useState<string>("");
  const [memoryFilterCategory, setMemoryFilterCategory] = useState<string>("");
  const [showMemoryForm, setShowMemoryForm] = useState(false);
  const [editingMemory, setEditingMemory] = useState<AIWorkspaceMemory | null>(null);
  const [memoryFormData, setMemoryFormData] = useState({
    type: "preference" as AIWorkspaceMemory["type"],
    category: "",
    content: "",
    confidence: 0.8,
    importance: 3,
  });
  const [memoryFormError, setMemoryFormError] = useState<string | null>(null);

  const configuredProviders = useMemo(
    () => providers.filter((provider) => provider.configured),
    [providers],
  );
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const selectedModel = useMemo(() => {
    if (selectedModelKey === "auto") return null;
    for (const provider of configuredProviders) {
      const model = provider.models.find(
        (item) => provider.id + "::" + item.id === selectedModelKey && item.supportsTools,
      );
      if (model) return { provider: provider.id, model: model.id };
    }
    return null;
  }, [configuredProviders, selectedModelKey]);
  const availableImageModels = useMemo(
    () => configuredProviders.flatMap((provider) =>
      provider.imageModels.map((model) => ({
        provider: provider.id,
        ...model,
      })),
    ),
    [configuredProviders],
  );
  const isStreaming = status === "submitted" || status === "streaming";

  async function refreshConversations() {
    const result = await api.ai.conversations();
    setConversations(result.conversations);
    return result.conversations;
  }

  async function refreshUsage() {
    const result = await api.ai.usage();
    setUsage(result);
  }

  async function refreshImages(id?: string | null) {
    const result = await api.ai.images(id || undefined);
    setImageOutputs(result.files);
  }

  const loadMemories = useCallback(async (append = false) => {
    setMemoryLoading(true);
    setMemoryError(null);
    try {
      const result = await api.ai.memories({
        type: memoryFilterType || undefined,
        category: memoryFilterCategory || undefined,
        search: memorySearch || undefined,
        limit: 20,
        offset: append ? memoryPage * 20 : 0,
      });
      if (append) {
        setMemories((current) => [...current, ...result.memories]);
      } else {
        setMemories(result.memories);
      }
      setMemoryTotal(result.total);
    } catch (err) {
      setMemoryError(errorMessage(err));
    } finally {
      setMemoryLoading(false);
    }
  }, [
    memoryFilterType,
    memoryFilterCategory,
    memorySearch,
    memoryPage,
    setMemoryLoading,
    setMemoryError,
    setMemories,
    setMemoryTotal,
  ]);

// eslint-disable-next-line react-hooks/preserve-manual-memoization
  const createMemory = useCallback(async () => {
    setMemoryFormError(null);
    try {
      await api.ai.createMemory({
        conversationId: conversationId || undefined,
        ...memoryFormData,
        deduplicate: true,
      });
      setShowMemoryForm(false);
      setMemoryFormData({ type: "preference", category: "", content: "", confidence: 0.8, importance: 3 });
      setMemoryPage(0);
      await loadMemories(false);
    } catch (err) {
      setMemoryFormError(errorMessage(err));
    }
  }, [conversationId, memoryFormData, loadMemories, setMemoryFormError, setShowMemoryForm, setMemoryPage]);

  const updateMemory = useCallback(async () => {
    if (!editingMemory) return;
    setMemoryFormError(null);
    try {
      await api.ai.updateMemory(editingMemory.id, memoryFormData);
      setEditingMemory(null);
      setMemoryFormData({ type: "preference", category: "", content: "", confidence: 0.8, importance: 3 });
      await loadMemories(false);
    } catch (err) {
      setMemoryFormError(errorMessage(err));
    }
  }, [
    editingMemory,
    memoryFormData,
    loadMemories,
    setMemoryFormError,
    setEditingMemory,
    setMemoryPage,
  ]);

  const deleteMemory = useCallback(async (id: string) => {
    if (!window.confirm("این خاطره حذف شود؟")) return;
    try {
      await api.ai.deleteMemory(id);
      setMemories((current) => current.filter((m) => m.id !== id));
      setMemoryTotal((current) => current - 1);
    } catch (err) {
      setMemoryError(errorMessage(err));
    }
  }, [setMemories, setMemoryTotal, setMemoryError]);

  const clearAllMemories = useCallback(async () => {
    if (!window.confirm("تمام خاطرات کاربر حذف می‌شوند. این عمل غیرقابل بازگشت است. ادامه دهید؟")) return;
    try {
      await api.ai.deleteAllMemories(true);
      setMemories([]);
      setMemoryTotal(0);
    } catch (err) {
      setMemoryError(errorMessage(err));
    }
  }, [setMemories, setMemoryTotal, setMemoryError]);

  const startEditMemory = useCallback((memory: AIWorkspaceMemory) => {
    setEditingMemory(memory);
    setMemoryFormData({
      type: memory.type,
      category: memory.category || "",
      content: memory.content,
      confidence: memory.confidence,
      importance: memory.importance,
    });
    setShowMemoryForm(true);
  }, [setEditingMemory, setMemoryFormData, setShowMemoryForm]);

  const cancelMemoryForm = useCallback(() => {
    setShowMemoryForm(false);
    setEditingMemory(null);
    setMemoryFormData({ type: "preference", category: "", content: "", confidence: 0.8, importance: 3 });
    setMemoryFormError(null);
  }, [setShowMemoryForm, setEditingMemory, setMemoryFormData, setMemoryFormError]);

  useEffect(() => {
    let active = true;
    void Promise.all([api.ai.providers(), api.ai.conversations(), api.ai.usage(), api.ai.memoryTypes()])
      .then(([providerResult, conversationResult, usageResult, memoryTypesResult]) => {
        if (!active) return;
        setProviders(providerResult.providers);
        setUsage(usageResult);
        setConversations(conversationResult.conversations);
        setMemoryTypes(memoryTypesResult.types);
      })
      .catch((err) => {
        if (active) setWorkspaceError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab === "memory") {
      setMemoryPage(0);
      loadMemories();
    }
  }, [activeTab, memoryFilterType, memoryFilterCategory, memorySearch, loadMemories]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function ensureConversation() {
    if (conversationId) return conversationId;
    const result = await api.ai.createConversation({});
    setConversationId(result.conversation.id);
    setConversations((current) => [result.conversation, ...current]);
    return result.conversation.id;
  }

  async function openConversation(id: string) {
    setLoadingConversation(true);
    setWorkspaceError(null);
    setImageError(null);
    try {
      const result = await api.ai.conversation(id);
      setConversationId(result.conversation.id);
      setSelectedModelKey("auto");
      setMessages(result.messages as UIMessage[]);
      await refreshImages(result.conversation.id);
    } catch (err) {
      setWorkspaceError(errorMessage(err));
    } finally {
      setLoadingConversation(false);
    }
  }

  async function removeConversation(id: string) {
    if (!window.confirm("این گفتگو و فایل‌های خصوصی آن حذف شوند؟")) return;
    try {
      await api.ai.deleteConversation(id);
      const next = conversations.filter((conversation) => conversation.id !== id);
      setConversations(next);
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
        setImageReferences([]);
        setImageOutputs([]);
      }
    } catch (err) {
      setWorkspaceError(errorMessage(err));
    }
  }

  function addAttachments(files: FileList | null) {
    if (!files) return;
    const next = [...files]
      .filter((file) => file.size <= 12 * 1024 * 1024)
      .slice(0, Math.max(0, 4 - attachments.length));
    setAttachments((current) => [
      ...current,
      ...next.map((file) => ({
        key: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      })),
    ]);
  }

  function removeAttachment(key: string) {
    setAttachments((current) => {
      const target = current.find((item) => item.key === key);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return current.filter((item) => item.key !== key);
    });
  }

  async function submitChat(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if ((!text && !attachments.length) || isStreaming) return;
    if (!configuredProviders.length) {
      setWorkspaceError("هیچ ارائه‌دهندهٔ Free پیکربندی نشده است.");
      return;
    }

    setWorkspaceError(null);
    clearError();
    setSendingFiles(true);
    try {
      const id = await ensureConversation();
      const fileParts = [] as Array<{
        type: "file";
        mediaType: string;
        filename: string;
        url: string;
      }>;
      for (const attachment of attachments) {
        const uploaded = await api.ai.uploadFile(attachment.file, id);
        fileParts.push({
          type: "file",
          mediaType: uploaded.file.mimeType,
          filename: uploaded.file.name,
          url: uploaded.file.url,
        });
      }

      const parts = [
        ...fileParts,
        ...(text ? [{ type: "text" as const, text }] : []),
      ];
      setInput("");
      setAttachments((current) => {
        current.forEach((item) => {
          if (item.preview) URL.revokeObjectURL(item.preview);
        });
        return [];
      });
      await sendMessage(
        { role: "user", parts },
        {
          body: {
            conversationId: id,
            ...(selectedModel
              ? { provider: selectedModel.provider, model: selectedModel.model }
              : {}),
          },
        },
      );
    } catch (err) {
      setWorkspaceError(errorMessage(err));
    } finally {
      setSendingFiles(false);
    }
  }

  async function uploadReferences(files: FileList | null) {
    const selectedFiles = files ? [...files] : [];
    if (!selectedFiles.length) return;
    setImageError(null);
    try {
      const id = await ensureConversation();
      const available = Math.max(0, 4 - imageReferences.length);
      const selected = selectedFiles
        .filter((file) => file.type.startsWith("image/"))
        .slice(0, available);
      const uploaded: AIWorkspaceFile[] = [];
      for (const file of selected) {
        const result = await api.ai.uploadFile(file, id);
        uploaded.push(result.file);
      }
      setImageReferences((current) => [...current, ...uploaded]);
    } catch (err) {
      setImageError(errorMessage(err));
    }
  }

  async function generateImage() {
    const prompt = imagePrompt.trim();
    if (!prompt || generatingImage) return;
    if (!configuredProviders.length) {
      setImageError("هیچ ارائه‌دهندهٔ Free پیکربندی نشده است.");
      return;
    }
    setGeneratingImage(true);
    setImageError(null);
    try {
      const id = await ensureConversation();
      const result = await api.ai.generateImage({
        conversationId: id,
        prompt,
        ...(selectedImageModel !== "auto" ? { model: selectedImageModel } : {}),
        referenceFileIds: imageReferences.map((file) => file.id),
        width: imageWidth,
        height: imageHeight,
        requestKey:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `image-${Date.now()}-${Math.random()}`,
      });
      setImageOutputs((current) => [result.file, ...current.filter((file) => file.id !== result.file.id)]);
      await Promise.all([refreshUsage(), refreshImages(id)]);
    } catch (err) {
      setImageError(errorMessage(err));
    } finally {
      setGeneratingImage(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          در حال آماده‌سازی فضای کاری...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-secondary/50 bg-card p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="eyebrow">AI Workspace</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-black text-foreground">
            فضای کاری هوش مصنوعی
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            گفتگوی پایدار با مدل‌های واقعی، ابزار کاتالوگ و پروژه، استودیوی تصویر، و حافظه بلندمدت.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {usage ? (
            <div className="rounded-xl border border-secondary/50 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
              امروز: {usage.used.chatRequests.toLocaleString("fa-IR")} گفتگو ·{" "}
              {usage.used.imageRequests.toLocaleString("fa-IR")} تصویر ·{" "}
              {usage.used.totalTokens.toLocaleString("fa-IR")} توکن
            </div>
          ) : null}
          <Button
            type="button"
            onClick={() => {
              setConversationId(null);
              setSelectedModelKey("auto");
              setMessages([]);
              setImageReferences([]);
              setImageOutputs([]);
              setWorkspaceError(null);
              clearError();
            }}
          >
            <MessageSquarePlus className="h-4 w-4" />
            گفتگوی جدید
          </Button>
        </div>
      </header>

      {workspaceError ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{workspaceError}</span>
          <button
            type="button"
            className="ml-auto"
            onClick={() => setWorkspaceError(null)}
            aria-label="بستن خطا"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {!configuredProviders.length ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-7 text-amber-200">
          <strong className="block font-display text-base">اتصال ارائه‌دهنده لازم است.</strong>
          {providers.find((provider) => provider.id === "cloudflare")?.configurationMessage ||
            "CLOUDFLARE_ACCOUNT_ID و CLOUDFLARE_API_TOKEN را در backend/.env تنظیم کنید."}
        </div>
      ) : null}

      {/* Tab Navigation */}
      <div className="flex gap-2 rounded-xl border border-secondary/50 bg-card p-1" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition",
            activeTab === "chat"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MessageSquarePlus className="inline h-4 w-4 mr-2" />
          گفتگو
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "images"}
          onClick={() => setActiveTab("images")}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition",
            activeTab === "images"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ImagePlus className="inline h-4 w-4 mr-2" />
          استودیوی تصویر
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "memory"}
          onClick={() => setActiveTab("memory")}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition",
            activeTab === "memory"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Brain className="inline h-4 w-4 mr-2" />
          حافظه
        </button>
      </div>

      {activeTab === "chat" && (
        <div className="grid min-h-[720px] gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
          <aside className="order-2 flex max-h-[760px] flex-col overflow-hidden rounded-2xl border border-secondary/50 bg-card xl:order-1">
            <div className="border-b border-secondary/50 p-4">
              <h2 className="font-display font-bold text-foreground">تاریخچهٔ گفتگوها</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                گفتگو و پیوست‌ها به‌صورت محلی و خصوصی نگهداری می‌شوند.
              </p>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {conversations.length ? (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-xl border border-transparent transition-colors",
                      conversation.id === conversationId
                        ? "border-primary/20 bg-primary/10"
                        : "hover:bg-secondary/40",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void openConversation(conversation.id)}
                      className="min-w-0 flex-1 px-3 py-3 text-right"
                    >
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {conversation.title}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {conversation.messageCount || 0} پیام · {formatTime(conversation.updatedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeConversation(conversation.id)}
                      className="mr-1 rounded-lg p-2 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      aria-label={`حذف ${conversation.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="p-4 text-center text-xs leading-6 text-muted-foreground">
                  هنوز گفتگویی ندارید. اولین پیام، گفتگو را ایجاد می‌کند.
                </p>
              )}
            </div>
          </aside>

          <section className="order-1 flex min-h-[720px] min-w-0 flex-col overflow-hidden rounded-2xl border border-secondary/50 bg-card xl:order-2">
            <div className="flex flex-col gap-3 border-b border-secondary/50 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 font-semibold">مدل گفتگو</span>
                  <select
                    value={selectedModelKey}
                    onChange={(event) => setSelectedModelKey(event.target.value)}
                    disabled={isStreaming || !configuredProviders.length}
                    className="max-w-full rounded-lg border border-secondary bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                    aria-label="انتخاب خودکار یا دستی مدل هوش مصنوعی"
                  >
                    <option value="auto">انتخاب خودکار و جابه‌جایی هنگام خطا</option>
                    {configuredProviders.map((provider) => (
                      <optgroup key={provider.id} label={provider.label}>
                        {provider.models.filter((model) => model.supportsTools).map((model) => (
                          <option key={provider.id + "::" + model.id} value={provider.id + "::" + model.id}>
                            {model.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                {selectedModel ? (
                  <span className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                    انتخاب دستی · {selectedModel.provider}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700">
                    <CircleCheck className="h-3 w-3 fill-current" />
                    <span>روتینگ خودکار با Failover</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4">
              {loadingConversation ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : messages.length ? (
                messages.map((message) => (
                  <WorkspaceMessage key={message.id} message={message} />
                ))
              ) : (
                <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-center">
                  <div className="max-w-lg">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <h3 className="mt-5 font-display text-xl font-bold text-foreground">
                      از یک سؤال واقعی شروع کنید
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      مثلاً «مدل‌های شید مشکی موجود را پیدا کن»، «پروژه‌های ویلا را نشان بده» یا «برای پذیرایی روشن چه پرده‌ای مناسب است؟»
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {chatError ? (
              <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{errorMessage(chatError)}</span>
              </div>
            ) : null}

            <form onSubmit={submitChat} className="border-t border-secondary/50 p-4">
              {attachments.length ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.key}
                      className="flex items-center gap-2 rounded-xl border border-secondary/60 bg-background/60 py-1.5 pl-3 pr-1.5 text-xs"
                    >
                      {attachment.preview ? (
                        <PrivateImage
                          url={attachment.preview}
                          alt={attachment.file.name}
                          className="h-9 w-9 rounded-lg"
                        />
                      ) : (
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="max-w-36 truncate">{attachment.file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment.key)}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        aria-label="حذف پیوست"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex items-end gap-2 rounded-2xl border border-secondary/60 bg-background/70 p-2 focus-within:border-primary/60">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    addAttachments(event.target.files);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachments.length >= 4 || isStreaming}
                  className="rounded-xl p-2.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
                  aria-label="افزودن پیوست"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={2}
                  placeholder="پیام خود را بنویسید؛ Enter برای ارسال و Shift+Enter برای خط جدید"
                  className="max-h-40 min-h-12 flex-1 resize-none rounded-xl border border-secondary bg-card px-3 py-2 text-sm text-right text-foreground outline-none placeholder:text-muted-foreground"
                  style={{ direction: "rtl", textAlign: "right" }}
                />
                {isStreaming ? (
                  <Button type="button" variant="outline" onClick={() => stop()}>
                    <Square className="h-4 w-4 fill-current" />
                    توقف
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={(!input.trim() && !attachments.length) || sendingFiles || !configuredProviders.length}
                  >
                    {sendingFiles ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    ارسال
                  </Button>
                )}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                فایل‌های پیوست خصوصی هستند و فقط در پوشهٔ غیرعمومی backend ذخیره می‌شوند.
              </p>
            </form>
          </section>

          <aside className="order-3 flex max-h-[760px] flex-col overflow-hidden rounded-2xl border border-secondary/50 bg-card">
            <div className="border-b border-secondary/50 p-4">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-5 w-5 text-primary" />
                <h2 className="font-display font-bold text-foreground">استودیوی تصویر</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                FLUX.2 واقعی با حداکثر چهار تصویر مرجع خصوصی.
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <label htmlFor="image-prompt" className="mb-2 block text-xs font-semibold text-foreground">
                  درخواست تصویر
                </label>
                <textarea
                  id="image-prompt"
                  value={imagePrompt}
                  onChange={(event) => setImagePrompt(event.target.value)}
                  rows={5}
                  placeholder="مثلاً: پردهٔ شید مشکی مینیمال در پذیرایی روشن با نور عصر"
                  className="w-full resize-none rounded-xl border border-secondary/60 bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none focus:border-primary"
                  style={{ direction: "rtl", textAlign: "right" }}
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs text-muted-foreground">
                  مدل تصویر
                  <select
                    value={selectedImageModel}
                    onChange={(event) => setSelectedImageModel(event.target.value)}
                    disabled={generatingImage}
                    className="mt-1 h-10 w-full rounded-xl border border-secondary/60 bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="auto">انتخاب خودکار با جایگزینی مدل</option>
                    {availableImageModels.map((model) => (
                      <option key={model.provider + "::" + model.id} value={model.id}>
                        {model.provider} · {model.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-muted-foreground">
                  اندازه
                  <select
                    value={`${imageWidth}x${imageHeight}`}
                    onChange={(event) => {
                      const [width, height] = event.target.value.split("x").map(Number);
                      setImageWidth(width);
                      setImageHeight(height);
                    }}
                    className="mt-1 h-10 w-full rounded-xl border border-secondary/60 bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="512x512">۵۱۲ × ۵۱۲</option>
                    <option value="768x768">۷۶۸ × ۷۶۸</option>
                    <option value="1024x1024">۱۰۲۴ × ۱۰۲۴</option>
                    <option value="1024x768">۱۰۲۴ × ۷۶۸</option>
                    <option value="768x1024">۷۶۸ × ۱۰۲۴</option>
                  </select>
                </label>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">تصاویر مرجع</span>
                  <span className="text-[11px] text-muted-foreground">
                    {imageReferences.length} از ۴
                  </span>
                </div>
                <input
                  ref={referenceInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void uploadReferences(event.target.files);
                    event.target.value = "";
                  }}
                />
                <div className="grid grid-cols-4 gap-2">
                  {imageReferences.map((file) => (
                    <div key={file.id} className="group relative aspect-square overflow-hidden rounded-xl border border-secondary/60">
                      <PrivateImage
                        url={file.url}
                        alt={file.name}
                        className="h-full w-full"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setImageReferences((current) =>
                            current.filter((reference) => reference.id !== file.id),
                          )
                        }
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                        aria-label="حذف تصویر مرجع"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {imageReferences.length < 4 ? (
                    <button
                      type="button"
                      onClick={() => referenceInputRef.current?.click()}
                      className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-secondary/70 bg-background/40 text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                      aria-label="افزودن تصویر مرجع"
                    >
                      <ImagePlus className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {imageError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
                  {imageError}
                </div>
              ) : null}

              <Button
                type="button"
                className="w-full"
                onClick={() => void generateImage()}
                disabled={
                  generatingImage ||
                  !imagePrompt.trim() ||
                  !availableImageModels.length
                }
              >
                {generatingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generatingImage ? "در حال تولید..." : "تولید تصویر"}
              </Button>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">خروجی‌های اخیر</span>
                  {imageOutputs.length ? (
                    <span className="text-[11px] text-muted-foreground">
                      {imageOutputs.length.toLocaleString("fa-IR")}
                    </span>
                  ) : null}
                </div>
                {imageOutputs.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {imageOutputs.map((file) => (
                      <div
                        key={file.id}
                        className="group overflow-hidden rounded-xl border border-secondary/60 bg-background/40"
                      >
                        <PrivateImage
                          url={file.url}
                          alt={file.prompt || "تصویر تولیدشده"}
                          className="aspect-square w-full"
                        />
                        <div className="flex items-center justify-between p-2">
                          <button
                            type="button"
                            onClick={() => {
                              setImageReferences((current) =>
                                current.length < 4 ? [...current, file] : current,
                              );
                              setImagePrompt((current) =>
                                current ||
                                "این تصویر را به‌عنوان مرجع، با حفظ سبک و جزئیات، ویرایش کن.",
                              );
                            }}
                            className="text-[11px] text-primary hover:underline"
                          >
                            استفاده به‌عنوان مرجع
                          </button>
                          <button
                            type="button"
                            onClick={() => void downloadWorkspaceFile(file)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            aria-label="دریافت تصویر"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-secondary/60 p-5 text-center text-xs leading-6 text-muted-foreground">
                    <Check className="mx-auto mb-2 h-5 w-5 text-emerald-500" />
                    خروجی‌های خصوصی این گفتگو اینجا نگهداری می‌شوند.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeTab === "images" && (
        <div className="grid min-h-[720px] gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
          <aside className="order-2 flex max-h-[760px] flex-col overflow-hidden rounded-2xl border border-secondary/50 bg-card xl:order-1">
            <div className="border-b border-secondary/50 p-4">
              <h2 className="font-display font-bold text-foreground">تاریخچهٔ گفتگوها</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                گفتگو و پیوست‌ها به‌صورت محلی و خصوصی نگهداری می‌شوند.
              </p>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {conversations.length ? (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-xl border border-transparent transition-colors",
                      conversation.id === conversationId
                        ? "border-primary/20 bg-primary/10"
                        : "hover:bg-secondary/40",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void openConversation(conversation.id)}
                      className="min-w-0 flex-1 px-3 py-3 text-right"
                    >
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {conversation.title}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {conversation.messageCount || 0} پیام · {formatTime(conversation.updatedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeConversation(conversation.id)}
                      className="mr-1 rounded-lg p-2 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      aria-label={`حذف ${conversation.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="p-4 text-center text-xs leading-6 text-muted-foreground">
                  هنوز گفتگویی ندارید.
                </p>
              )}
            </div>
          </aside>

          <section className="order-1 flex min-h-[720px] min-w-0 flex-col overflow-hidden rounded-2xl border border-secondary/50 bg-card xl:order-2">
            <div className="flex flex-col gap-3 border-b border-secondary/50 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                <span className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700">
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span>حالت استودیوی تصویر</span>
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-8 text-center">
              <ImagePlus className="mx-auto h-16 w-16 text-muted-foreground/50" />
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">استودیوی تصویر</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                از تب «استودیوی تصویر» در نوار بالا برای تولید و ویرایش تصاویر با FLUX.2 استفاده کنید.
              </p>
            </div>
          </section>

          <aside className="order-3 flex max-h-[760px] flex-col overflow-hidden rounded-2xl border border-secondary/50 bg-card">
            <div className="border-b border-secondary/50 p-4">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-5 w-5 text-primary" />
                <h2 className="font-display font-bold text-foreground">استودیوی تصویر</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                FLUX.2 واقعی با حداکثر چهار تصویر مرجع خصوصی.
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <label htmlFor="image-prompt" className="mb-2 block text-xs font-semibold text-foreground">
                  درخواست تصویر
                </label>
                <textarea
                  id="image-prompt"
                  value={imagePrompt}
                  onChange={(event) => setImagePrompt(event.target.value)}
                  rows={5}
                  placeholder="مثلاً: پردهٔ شید مشکی مینیمال در پذیرایی روشن با نور عصر"
                  className="w-full resize-none rounded-xl border border-secondary/60 bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none focus:border-primary"
                  style={{ direction: "rtl", textAlign: "right" }}
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs text-muted-foreground">
                  مدل تصویر
                  <select
                    value={selectedImageModel}
                    onChange={(event) => setSelectedImageModel(event.target.value)}
                    disabled={generatingImage}
                    className="mt-1 h-10 w-full rounded-xl border border-secondary/60 bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="auto">انتخاب خودکار با جایگزینی مدل</option>
                    {availableImageModels.map((model) => (
                      <option key={model.provider + "::" + model.id} value={model.id}>
                        {model.provider} · {model.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-muted-foreground">
                  اندازه
                  <select
                    value={`${imageWidth}x${imageHeight}`}
                    onChange={(event) => {
                      const [width, height] = event.target.value.split("x").map(Number);
                      setImageWidth(width);
                      setImageHeight(height);
                    }}
                    className="mt-1 h-10 w-full rounded-xl border border-secondary/60 bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="512x512">۵۱۲ × ۵۱۲</option>
                    <option value="768x768">۷۶۸ × ۷۶۸</option>
                    <option value="1024x1024">۱۰۲۴ × ۱۰۲۴</option>
                    <option value="1024x768">۱۰۲۴ × ۷۶۸</option>
                    <option value="768x1024">۷۶۸ × ۱۰۲۴</option>
                  </select>
                </label>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">تصاویر مرجع</span>
                  <span className="text-[11px] text-muted-foreground">
                    {imageReferences.length} از ۴
                  </span>
                </div>
                <input
                  ref={referenceInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void uploadReferences(event.target.files);
                    event.target.value = "";
                  }}
                />
                <div className="grid grid-cols-4 gap-2">
                  {imageReferences.map((file) => (
                    <div key={file.id} className="group relative aspect-square overflow-hidden rounded-xl border border-secondary/60">
                      <PrivateImage
                        url={file.url}
                        alt={file.name}
                        className="h-full w-full"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setImageReferences((current) =>
                            current.filter((reference) => reference.id !== file.id),
                          )
                        }
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                        aria-label="حذف تصویر مرجع"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {imageReferences.length < 4 ? (
                    <button
                      type="button"
                      onClick={() => referenceInputRef.current?.click()}
                      className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-secondary/70 bg-background/40 text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                      aria-label="افزودن تصویر مرجع"
                    >
                      <ImagePlus className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {imageError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
                  {imageError}
                </div>
              ) : null}

              <Button
                type="button"
                className="w-full"
                onClick={() => void generateImage()}
                disabled={
                  generatingImage ||
                  !imagePrompt.trim() ||
                  !availableImageModels.length
                }
              >
                {generatingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generatingImage ? "در حال تولید..." : "تولید تصویر"}
              </Button>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">خروجی‌های اخیر</span>
                  {imageOutputs.length ? (
                    <span className="text-[11px] text-muted-foreground">
                      {imageOutputs.length.toLocaleString("fa-IR")}
                    </span>
                  ) : null}
                </div>
                {imageOutputs.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {imageOutputs.map((file) => (
                      <div
                        key={file.id}
                        className="group overflow-hidden rounded-xl border border-secondary/60 bg-background/40"
                      >
                        <PrivateImage
                          url={file.url}
                          alt={file.prompt || "تصویر تولیدشده"}
                          className="aspect-square w-full"
                        />
                        <div className="flex items-center justify-between p-2">
                          <button
                            type="button"
                            onClick={() => {
                              setImageReferences((current) =>
                                current.length < 4 ? [...current, file] : current,
                              );
                              setImagePrompt((current) =>
                                current ||
                                "این تصویر را به‌عنوان مرجع، با حفظ سبک و جزئیات، ویرایش کن.",
                              );
                            }}
                            className="text-[11px] text-primary hover:underline"
                          >
                            استفاده به‌عنوان مرجع
                          </button>
                          <button
                            type="button"
                            onClick={() => void downloadWorkspaceFile(file)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            aria-label="دریافت تصویر"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-secondary/60 p-5 text-center text-xs leading-6 text-muted-foreground">
                    <Check className="mx-auto mb-2 h-5 w-5 text-emerald-500" />
                    خروجی‌های خصوصی این گفتگو اینجا نگهداری می‌شوند.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeTab === "memory" && (
        <div className="grid min-h-[720px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex max-h-[760px] flex-col overflow-hidden rounded-2xl border border-secondary/50 bg-card">
            <div className="border-b border-secondary/50 p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <h2 className="font-display font-bold text-foreground">حافظه بلندمدت</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                اطلاعات ذخیره‌شده برای شخصی‌سازی پاسخ‌های دستیار. فقط برای شما قابل مشاهده است.
              </p>
            </div>

            <div className="border-b border-secondary/50 p-3 space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={memorySearch}
                  onChange={(e) => {
                    setMemorySearch(e.target.value);
                    setMemoryPage(0);
                  }}
                  placeholder="جستجو در خاطرات..."
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-secondary/60 bg-background text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex gap-2">
                <Select value={memoryFilterType} onValueChange={setMemoryFilterType}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="نوع خاطره" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">همه انواع</SelectItem>
                    {memoryTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={memoryFilterCategory} onValueChange={setMemoryFilterCategory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="دسته‌بندی" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">همه دسته‌ها</SelectItem>
                    <SelectItem value="curtain_catalog">کاتالوگ پرده</SelectItem>
                    <SelectItem value="shop_accessories">فروشگاه اکسسوری</SelectItem>
                    <SelectItem value="projects">پروژه‌ها</SelectItem>
                    <SelectItem value="user_preferences">ترجیحات کاربر</SelectItem>
                    <SelectItem value="installation">نصب و راه‌اندازی</SelectItem>
                    <SelectItem value="pricing">قیمت‌گذاری</SelectItem>
                    <SelectItem value="technical_specs">مشخصات فنی</SelectItem>
                    <SelectItem value="general">عمومی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showMemoryForm || editingMemory ? (
              <div className="border-b border-secondary/50 p-3 space-y-3 max-h-[300px] overflow-y-auto">
                <h4 className="font-semibold text-foreground">
                  {editingMemory ? "ویرایش خاطره" : "افزودن خاطره جدید"}
                </h4>
                {memoryFormError && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {memoryFormError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-xs text-muted-foreground">
                    نوع
                    <Select value={memoryFormData.type} onValueChange={(v) => setMemoryFormData((prev) => ({ ...prev, type: v as AIWorkspaceMemory["type"] }))}>
                      <SelectTrigger className="mt-1 h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {memoryTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    دسته‌بندی
                    <Select value={memoryFormData.category} onValueChange={(v) => setMemoryFormData((prev) => ({ ...prev, category: v }))}>
                      <SelectTrigger className="mt-1 h-9 w-full">
                        <SelectValue placeholder="انتخابی (اختیاری)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">بدون دسته‌بندی</SelectItem>
                        <SelectItem value="curtain_catalog">کاتالوگ پرده</SelectItem>
                        <SelectItem value="shop_accessories">فروشگاه اکسسوری</SelectItem>
                        <SelectItem value="projects">پروژه‌ها</SelectItem>
                        <SelectItem value="user_preferences">ترجیحات کاربر</SelectItem>
                        <SelectItem value="installation">نصب و راه‌اندازی</SelectItem>
                        <SelectItem value="pricing">قیمت‌گذاری</SelectItem>
                        <SelectItem value="technical_specs">مشخصات فنی</SelectItem>
                        <SelectItem value="general">عمومی</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    محتوا
                    <Textarea
                      value={memoryFormData.content}
                      onChange={(e) => setMemoryFormData((prev) => ({ ...prev, content: e.target.value }))}
                      rows={4}
                      placeholder="محتوای خاطره را اینجا بنویسید..."
                      className="mt-1 w-full"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs text-muted-foreground">
                      اطمینان ({Math.round(memoryFormData.confidence * 100)}%)
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={memoryFormData.confidence}
                        onChange={(e) => setMemoryFormData((prev) => ({ ...prev, confidence: Number(e.target.value) }))}
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-xs text-muted-foreground">
                      اهمیت ({memoryFormData.importance}/5)
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={memoryFormData.importance}
                        onChange={(e) => setMemoryFormData((prev) => ({ ...prev, importance: Number(e.target.value) }))}
                        className="mt-1 w-full"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={editingMemory ? updateMemory : createMemory}
                      disabled={!memoryFormData.content.trim()}
                    >
                      {editingMemory ? "ذخیره تغییرات" : "افزودن خاطره"}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={cancelMemoryForm}>
                      انصراف
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMemoryForm(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-secondary/70 bg-background/40 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/60 hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                افزودن خاطره دستی
              </button>
            )}

            {memoryError && (
              <div className="m-3 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive">
                {memoryError}
              </div>
            )}

            <div className="p-3 pt-0">
              <button
                type="button"
                onClick={clearAllMemories}
                disabled={memoryTotal === 0}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive transition hover:bg-destructive/20 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                حذف تمام خاطرات ({memoryTotal})
              </button>
            </div>
          </aside>

          <section className="flex min-h-[720px] min-w-0 flex-col overflow-hidden rounded-2xl border border-secondary/50 bg-card">
            <div className="border-b border-secondary/50 p-4">
              <h2 className="font-display font-bold text-foreground">لیست خاطرات</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {memoryTotal} خاطره ذخیره‌شده است. اگرچه دستیار به‌طور خودکار خاطرات مرتبط را بازیابی می‌کند، می‌توانید اینجا آن‌ها را مدیریت کنید.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {memoryLoading && memories.length === 0 ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : memories.length ? (
                <div className="space-y-3">
                  {memories.map((memory) => {
                    const typeInfo = memoryTypes.find((t) => t.value === memory.type);
                    return (
                      <div
                        key={memory.id}
                        className="group relative rounded-xl border border-secondary/50 bg-card p-4 transition hover:border-primary/30"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              memory.type === "preference" && "bg-amber-100 text-amber-700",
                              memory.type === "fact" && "bg-blue-100 text-blue-700",
                              memory.type === "project_context" && "bg-green-100 text-green-700",
                              memory.type === "communication_style" && "bg-purple-100 text-purple-700",
                              memory.type === "decision" && "bg-emerald-100 text-emerald-700",
                              memory.type === "correction" && "bg-red-100 text-red-700",
                            )}
                          >
                            {memory.type === "preference" && <Sparkles className="h-4 w-4" />}
                            {memory.type === "fact" && <Check className="h-4 w-4" />}
                            {memory.type === "project_context" && <Brain className="h-4 w-4" />}
                            {memory.type === "communication_style" && <MessageSquarePlus className="h-4 w-4" />}
                            {memory.type === "decision" && <CircleCheck className="h-4 w-4" />}
                            {memory.type === "correction" && <Wrench className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-foreground">{typeInfo?.label || memory.type}</span>
                              {memory.category && (
                                <span className="px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground">
                                  {memory.category}
                                </span>
                              )}
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground">
                                اطمینان: {Math.round(memory.confidence * 100)}%
                              </span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground">
                                اهمیت: {memory.importance}/5
                              </span>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-foreground whitespace-pre-wrap">{memory.content}</p>
                            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>ایجاد: {formatDate(memory.createdAt)}</span>
                              {memory.updatedAt !== memory.createdAt && (
                                <>
                                  <span>·</span>
                                  <span>بروز: {formatDate(memory.updatedAt)}</span>
                                </>
                              )}
                              {memory.expiresAt && (
                                <>
                                  <span>·</span>
                                  <span className="text-amber-600">انقضا: {formatDate(memory.expiresAt)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => startEditMemory(memory)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              aria-label="ویرایش خاطره"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMemory(memory.id)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              aria-label="حذف خاطره"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-center">
                  <div className="max-w-lg">
                    <Brain className="mx-auto h-14 w-14 text-muted-foreground/30" />
                    <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                      هنوز خاطره‌ای ذخیره نشده
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      دستیار به‌طور خودکار از گفتگوهای شما یاد می‌گیرد. همچنین می‌توانید با دکمه «افزودن خاطره دستی» اطلاعات مهم را ثبت کنید.
                    </p>
                  </div>
                </div>
              )}

              {memories.length && memoryTotal > memories.length && !memoryLoading && (
                <button
                  type="button"
                  onClick={() => loadMemories(true)}
                  className="mt-4 mx-auto block w-full max-w-xs rounded-xl border border-secondary/50 bg-background/40 px-4 py-2 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  بارگذاری بیشتر ({memories.length} از {memoryTotal})
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}