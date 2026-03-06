import { v4 as uuidv4 } from "uuid";

export interface MessageSource {
  documentId: string;
  documentName: string;
  chunkId: string;
  similarity: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  latency?: number;
  tokens?: number;
  sources?: MessageSource[];
  createdAt?: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastMessage?: string;
  createdAt: Date;
  updatedAt?: Date;
}

class ChatService {
  private userId: string = "";
  private apiUrl: string;

  constructor(apiUrl: string = "/api/chat") {
    this.apiUrl = apiUrl;
  }

  /**
   * Load conversations for current user from API
   */
  async loadConversations(): Promise<Conversation[]> {
    const userId = this.getOrCreateUserId();
    const response = await fetch(`${this.apiUrl}?userId=${userId}`);

    if (!response.ok) {
      throw new Error("Failed to load conversations");
    }

    const data = await response.json();
    const conversations = (data.conversations || []) as any[];

    return conversations.map((conv) => ({
      id: conv.id,
      title: conv.title || "New Conversation",
      messages: (conv.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        latency: m.latency ?? undefined,
        tokens: m.tokenUsage ?? undefined,
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
      })),
      lastMessage: conv.lastMessage || undefined,
      createdAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
      updatedAt: conv.updatedAt ? new Date(conv.updatedAt) : undefined,
    }));
  }

  /**
   * Delete a conversation for current user
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const userId = this.getOrCreateUserId();
    const response = await fetch(
      `${this.apiUrl}?conversationId=${conversationId}&userId=${userId}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to delete conversation");
    }
  }

  /**
   * Get or create a persistent user ID
   */
  private getOrCreateUserId(): string {
    if (this.userId) return this.userId;

    if (typeof window === "undefined") {
      // Server-side, use a temporary ID
      return "server-" + Math.random().toString(36).substring(7);
    }

    const storageKey = "chat_user_id";
    let userId = localStorage.getItem(storageKey);

    if (!userId) {
      userId = uuidv4();
      localStorage.setItem(storageKey, userId);
    }

    this.userId = userId;
    return userId;
  }

  /**
   * Get user ID
   */
  getUserId(): string {
    if (!this.userId) {
      this.userId = this.getOrCreateUserId();
    }
    return this.userId;
  }

  /**
   * Stream a chat message to the API with full conversation history
   */
  async *streamMessage(
    conversationId: string,
    message: string,
    signal?: AbortSignal,
    conversationHistory?: Message[],
  ): AsyncGenerator<{
    type: "token" | "complete" | "error";
    content?: string;
    latency?: number;
    tokens?: number;
    error?: string;
    messageId?: string;
    sources?: Array<{
      documentId: string;
      documentName: string;
      chunkId: string;
      similarity: number;
    }>;
  }> {
    try {
      const userId = this.getOrCreateUserId();
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          message,
          userId,
          useAgents: true, // Enable agent orchestration so agent executions are logged
          conversationHistory: conversationHistory || [],
        }),
        signal,
      });

      if (!response.ok) {
        const error = await response.json();
        yield {
          type: "error",
          error: error.error || "Failed to send message",
        };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield {
          type: "error",
          error: "Failed to initialize stream",
        };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        if (signal?.aborted) {
          reader.cancel();
          yield {
            type: "error",
            error: "Stream interrupted by user",
          };
          break;
        }

        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              yield parsed;
            } catch (e) {
              console.error("Failed to parse stream line:", line);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          yield JSON.parse(buffer);
        } catch (e) {
          console.error("Failed to parse final buffer:", buffer);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Don't yield error for aborted requests, already handled above
        return;
      }
      yield {
        type: "error",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**

   * Create a new conversation
   */
  createConversation(): Conversation {
    return {
      id: uuidv4(),
      title: "New Conversation",
      messages: [],
      createdAt: new Date(),
    };
  }
}

// Export singleton instance with explicit API endpoint
export const chatService = new ChatService("/api/chat");
