import { request } from "./core";

interface Conversation {
  id: string;
  agent_name: string;
  metadata: Record<string, unknown>;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    created_at: string;
  }>;
}

export const agentsApi = {
  async createConversation(opts: { agent_name?: string; metadata?: Record<string, unknown> } = {}): Promise<Conversation> {
    const agent_name = opts.agent_name || "design_consultant";
    const metadata = opts.metadata;
    return request("/agents/conversations", {
      method: "POST",
      body: { agent_name, metadata },
      auth: true,
    }) as Promise<Conversation>;
  },
  async getConversation(id: string): Promise<Conversation> {
    return request(`/agents/conversations/${id}`, { auth: true }) as Promise<Conversation>;
  },
  async addMessage(conversation: string | { id: string }, message: unknown): Promise<Conversation> {
    const id = typeof conversation === "string" ? conversation : conversation.id;
    return request(`/agents/conversations/${id}/messages`, {
      method: "POST",
      body: message,
      auth: true,
    }) as Promise<Conversation>;
  },
  subscribeToConversation(id: string, onUpdate: (conv: Conversation) => void) {
    let stopped = false;
    let lastLen = -1;
    let timer: NodeJS.Timeout | null = null;
    const tick = async () => {
      if (stopped) return;
      try {
        const conv = await agentsApi.getConversation(id);
        const len = (conv as { messages?: unknown[] }).messages?.length || 0;
        if (len !== lastLen) {
          lastLen = len;
          onUpdate?.(conv);
        }
      } catch {
        /* ignore poll errors */
      }
      if (!stopped) timer = setTimeout(tick, 2500);
    };
    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  },
};
