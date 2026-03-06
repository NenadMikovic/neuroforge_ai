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
}

class ChatService {
  private userId: string = "";
  private apiUrl: string;

  constructor(apiUrl: string = "/api/chat") {
    this.apiUrl = apiUrl;
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
          useAgents: false, // Disable agent orchestration - use direct LLM chat
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
