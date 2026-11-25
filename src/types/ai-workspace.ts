export type AIProviderId =
  | "cloudflare"
  | "google"
  | "nvidia"
  | "openrouter";

export type AIWorkspaceModel = {
  id: string;
  label: string;
  supportsTools: boolean;
};

export type AIWorkspaceImageModel = {
  id: string;
  label: string;
  supportsReferences: boolean;
  maxReferences: number;
};

export type AIWorkspaceProvider = {
  id: AIProviderId;
  label: string;
  configured: boolean;
  configurationMessage: string;
  models: AIWorkspaceModel[];
  imageModels: AIWorkspaceImageModel[];
};

export type AIWorkspaceConversation = {
  id: string;
  title: string;
  provider: AIProviderId | null;
  model: string | null;
  createdAt?: string;
  updatedAt?: string;
  messageCount?: number;
  fileCount?: number;
};

export type AIWorkspaceMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: unknown[];
  createdAt?: string;
};

export type AIWorkspaceFile = {
  id: string;
  kind: "input" | "output" | string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  provider?: string | null;
  model?: string | null;
  prompt?: string | null;
  createdAt: string;
};

export type AIWorkspaceUsage = {
  window: { startsAt: string; endsAt: string; timezone: string };
  limits: {
    chatRequests: number;
    imageRequests: number;
    totalTokens: number;
    cloudflareQuotaUnits: number;
  };
  used: {
    chatRequests: number;
    imageRequests: number;
    totalTokens: number;
    cloudflareQuotaUnits: number;
  };
  recent: Array<{
    id: string;
    provider: string;
    model: string;
    operation: string;
    status: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    quotaUnits: number;
    errorCode?: string | null;
    createdAt: string;
  }>;
};

export type AIMemoryType =
  | "preference"
  | "fact"
  | "project_context"
  | "communication_style"
  | "decision"
  | "correction";

export type AIWorkspaceMemory = {
  id: string;
  userId: string;
  conversationId: string | null;
  type: AIMemoryType;
  category: string | null;
  content: string;
  sourceMessageId: string | null;
  confidence: number;
  importance: number;
  expiresAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type AIMemoryTypeInfo = {
  value: AIMemoryType;
  label: string;
  description: string;
};
