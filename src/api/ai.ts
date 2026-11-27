import { API_BASE } from "./constants";
import { getToken } from "./token";
import { request } from "./core";
import type {
  AIWorkspaceConversation,
  AIWorkspaceFile,
  AIWorkspaceProvider,
  AIWorkspaceUsage,
  AIWorkspaceMemory,
  AIMemoryTypeInfo,
} from "@/types/ai-workspace";

export const aiApi = {
  async providers(): Promise<{ providers: AIWorkspaceProvider[] }> {
    return request("/ai/providers") as Promise<{ providers: AIWorkspaceProvider[] }>;
  },
  async conversations(): Promise<{ conversations: AIWorkspaceConversation[] }> {
    return request("/ai/conversations") as Promise<{
      conversations: AIWorkspaceConversation[];
    }>;
  },
  async createConversation(
    body: { title?: string; provider?: string; model?: string } = {},
  ): Promise<{ conversation: AIWorkspaceConversation }> {
    return request("/ai/conversations", {
      method: "POST",
      body,
    }) as Promise<{ conversation: AIWorkspaceConversation }>;
  },
  async conversation(
    id: string,
  ): Promise<{
    conversation: AIWorkspaceConversation;
    messages: Array<{
      id: string;
      role: "user" | "assistant" | "system";
      parts: unknown[];
      createdAt: string;
    }>;
    files: AIWorkspaceFile[];
  }> {
    return request(`/ai/conversations/${encodeURIComponent(id)}`) as Promise<{
      conversation: AIWorkspaceConversation;
      messages: Array<{
        id: string;
        role: "user" | "assistant" | "system";
        parts: unknown[];
        createdAt: string;
      }>;
      files: AIWorkspaceFile[];
    }>;
  },
  async updateConversation(
    id: string,
    body: { title?: string; provider?: string; model?: string },
  ): Promise<{ conversation: AIWorkspaceConversation }> {
    return request(`/ai/conversations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    }) as Promise<{ conversation: AIWorkspaceConversation }>;
  },
  async deleteConversation(id: string) {
    return request(`/ai/conversations/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
  async usage(): Promise<AIWorkspaceUsage> {
    return request("/ai/usage") as Promise<AIWorkspaceUsage>;
  },
  async uploadFile(file: File, conversationId?: string) {
    const form = new FormData();
    form.append("file", file);
    if (conversationId) form.append("conversationId", conversationId);
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/ai/files`, {
      method: "POST",
      headers,
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (data as { error?: string }).error || "بارگذاری فایل ناموفق بود.",
        { cause: { status: res.status, data } },
      );
    }
    return data as { file: AIWorkspaceFile };
  },
  async downloadFile(id: string) {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/ai/files/${encodeURIComponent(id)}`, {
      method: "GET",
      headers,
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        (data as { error?: string }).error || "دریافت فایل ناموفق بود.",
        { cause: { status: res.status, data } },
      );
    }
    return res.blob();
  },
  async deleteFile(id: string) {
    return request(`/ai/files/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async images(conversationId?: string): Promise<{ files: AIWorkspaceFile[] }> {
    const query = conversationId
      ? `?conversationId=${encodeURIComponent(conversationId)}`
      : "";
    return request(`/ai/images${query}`) as Promise<{ files: AIWorkspaceFile[] }>;
  },
  async generateImage(
    body: {
      conversationId?: string;
      prompt: string;
      model?: string;
      referenceFileIds?: string[];
      width?: number;
      height?: number;
      steps?: number;
      guidance?: number;
      requestKey?: string;
    },
  ): Promise<{
    file: AIWorkspaceFile;
    reused: boolean;
    model: string;
    width: number;
    height: number;
    estimatedQuotaUnits: number;
  }> {
    return request("/ai/images/generate", {
      method: "POST",
      body,
    }) as Promise<{
      file: AIWorkspaceFile;
      reused: boolean;
      model: string;
      width: number;
      height: number;
      estimatedQuotaUnits: number;
    }>;
  },

  // Memory management
  async memoryTypes(): Promise<{ types: AIMemoryTypeInfo[]; categories: string[] }> {
    return request("/ai/memory/types") as Promise<{ types: AIMemoryTypeInfo[]; categories: string[] }>;
  },
  async memories(params: {
    type?: string;
    category?: string;
    conversationId?: string;
    minImportance?: number;
    minConfidence?: number;
    includeExpired?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
  } = {}): Promise<{ memories: AIWorkspaceMemory[]; total: number }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) searchParams.set(key, String(value));
    });
    const query = searchParams.toString();
    return request(`/ai/memory${query ? `?${query}` : ""}`) as Promise<{ memories: AIWorkspaceMemory[]; total: number }>;
  },
  async createMemory(body: {
    conversationId?: string;
    type: string;
    category?: string;
    content: string;
    sourceMessageId?: string;
    confidence?: number;
    importance?: number;
    expiresAt?: string;
    metadata?: Record<string, unknown>;
    deduplicate?: boolean;
  }): Promise<{ memory: AIWorkspaceMemory }> {
    return request("/ai/memory", {
      method: "POST",
      body,
    }) as Promise<{ memory: AIWorkspaceMemory }>;
  },
  async getMemory(id: string): Promise<{ memory: AIWorkspaceMemory }> {
    return request(`/ai/memory/${encodeURIComponent(id)}`) as Promise<{ memory: AIWorkspaceMemory }>;
  },
  async updateMemory(
    id: string,
    body: {
      content?: string;
      type?: string;
      category?: string | null;
      confidence?: number;
      importance?: number;
      expiresAt?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<{ memory: AIWorkspaceMemory }> {
    return request(`/ai/memory/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    }) as Promise<{ memory: AIWorkspaceMemory }>;
  },
  async deleteMemory(id: string): Promise<void> {
    await request(`/ai/memory/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async deleteAllMemories(confirm: boolean): Promise<{ deleted: number }> {
    return request("/ai/memory", {
      method: "DELETE",
      body: { confirm },
    }) as Promise<{ deleted: number }>;
  },
};
