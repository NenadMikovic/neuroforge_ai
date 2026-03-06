/**
 * Memory Service
 * Manages conversation memory with summarization and retrieval
 */

import { prisma } from "@/lib/db/service";
import { TokenCounter } from "./tokenCounter";

interface ConversationSummary {
  text: string;
  tokens: number;
  messageCount: number;
  keyTopics: string[];
}

interface RelevantMemory {
  conversationId: string;
  summary: string;
  similarity: number;
  messageCount: number;
  createdAt: Date;
}

export class MemoryService {
  // Threshold for auto-summarization (in message count)
  private static readonly SUMMARIZATION_THRESHOLD = 20;

  // Maximum memories to retrieve for context
  private static readonly MAX_MEMORIES_TO_RETRIEVE = 5;

  /**
   * Check if conversation should be summarized
   */
  static async shouldSummarize(conversationId: string): Promise<boolean> {
    try {
      const messageCount = await (prisma as any).message?.count({
        where: { conversationId },
      });

      return messageCount >= this.SUMMARIZATION_THRESHOLD;
    } catch (error) {
      console.error(
        "[MemoryService] Error checking summarization threshold:",
        error,
      );
      return false;
    }
  }

  /**
   * Summarize a conversation
   */
  static async summarizeConversation(
    conversationId: string,
    userId: string,
  ): Promise<ConversationSummary | null> {
    try {
      // Get all messages in conversation
      const messages = await (prisma as any).message?.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
      });

      if (messages.length === 0) {
        return null;
      }

      // Generate summary (simple concatenation in real app, would use LLM)
      const summary = this.generateSummary(messages);
      const tokens = TokenCounter.countTokens(summary);

      // Extract key topics
      const keyTopics = this.extractTopics(messages);

      // Store in database
      const embedding = this.generateSimpleEmbedding(summary);

      await (prisma as any).conversationMemory?.create({
        data: {
          userId,
          conversationId,
          summary,
          embedding,
          tokenCount: tokens,
          messageCount: messages.length,
          keyTopics: JSON.stringify(keyTopics),
          metadata: JSON.stringify({
            dateRange: {
              start: messages[0].createdAt,
              end: messages[messages.length - 1].createdAt,
            },
          }),
        },
      });

      return {
        text: summary,
        tokens,
        messageCount: messages.length,
        keyTopics,
      };
    } catch (error) {
      console.error("[MemoryService] Error summarizing conversation:", error);
      return null;
    }
  }

  /**
   * Retrieve relevant past memories for current conversation
   */
  static async retrieveRelevantMemories(
    userId: string,
    currentQuery: string,
    limit: number = this.MAX_MEMORIES_TO_RETRIEVE,
  ): Promise<RelevantMemory[]> {
    try {
      // Get all memories for user
      const memories = await (prisma as any).conversationMemory?.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20, // Get last 20 to calculate similarity
      });

      if (!memories || memories.length === 0) {
        return [];
      }

      // Generate embedding for current query
      const queryEmbedding = this.generateSimpleEmbedding(currentQuery);

      // Calculate similarity scores
      const scored = memories.map((memory: any) => ({
        ...memory,
        similarity: this.calculateSimilarity(
          queryEmbedding,
          memory.embedding instanceof Uint8Array
            ? memory.embedding
            : Buffer.from(memory.embedding, "binary"),
        ),
      }));

      // Sort by similarity and return top matches
      return scored
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, limit)
        .map((m: any) => ({
          conversationId: m.conversationId,
          summary: m.summary,
          similarity: m.similarity,
          messageCount: m.messageCount,
          createdAt: m.createdAt,
        }));
    } catch (error) {
      console.error("[MemoryService] Error retrieving memories:", error);
      return [];
    }
  }

  /**
   * Get memory usage statistics
   */
  static async getMemoryUsageStats(userId: string): Promise<{
    totalMemories: number;
    totalTokensStored: number;
    averageMessagesSummarized: number;
    oldestMemory: Date | null;
  }> {
    try {
      const memories = await (prisma as any).conversationMemory?.findMany({
        where: { userId },
      });

      if (memories.length === 0) {
        return {
          totalMemories: 0,
          totalTokensStored: 0,
          averageMessagesSummarized: 0,
          oldestMemory: null,
        };
      }

      const totalTokens = memories.reduce(
        (sum: number, m: any) => sum + (m.tokenCount || 0),
        0,
      );
      const avgMessages = Math.round(
        memories.reduce(
          (sum: number, m: any) => sum + (m.messageCount || 0),
          0,
        ) / memories.length,
      );

      return {
        totalMemories: memories.length,
        totalTokensStored: totalTokens,
        averageMessagesSummarized: avgMessages,
        oldestMemory: memories[memories.length - 1].createdAt,
      };
    } catch (error) {
      console.error("[MemoryService] Error getting memory stats:", error);
      return {
        totalMemories: 0,
        totalTokensStored: 0,
        averageMessagesSummarized: 0,
        oldestMemory: null,
      };
    }
  }

  /**
   * Format memories for inclusion in system prompt
   */
  static formatMemoriesForContext(memories: RelevantMemory[]): string {
    if (memories.length === 0) {
      return "";
    }

    const formatted = memories
      .map((m, i) => `[Memory ${i + 1}] ${m.summary}`)
      .join("\n");

    return `Information about the USER from past conversations:\n${formatted}\n\nRemember: This information is about the USER, not you. You are the AI assistant.`;
  }

  /**
   * Simple summary generation (in production, use LLM)
   */
  private static generateSummary(messages: any[]): string {
    // Extract user messages and create a simple summary
    const userMessages = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .slice(-5) // Last 5 user messages
      .join(" | ");

    return `User asked about: ${userMessages.substring(0, 400)}${userMessages.length > 400 ? "..." : ""}`;
  }

  /**
   * Extract key topics from messages
   */
  private static extractTopics(messages: any[]): string[] {
    const content = messages.map((m) => m.content).join(" ");

    // Simple keyword extraction (in production, use NLP)
    const words = content
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 5);

    // Get most common words
    const frequency: Record<string, number> = {};
    for (const word of words) {
      frequency[word] = (frequency[word] || 0) + 1;
    }

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Generate simple embedding (hash-based, not real vectors)
   * In production, use a real embedding model
   */
  private static generateSimpleEmbedding(text: string): Buffer {
    // Create a deterministic hash-based "embedding"
    // This is for demo purposes - real implementation would use models like Sentence Transformers
    const buffer = Buffer.alloc(100); // 100-dim embedding
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      buffer[i % 100] = Math.abs(hash) % 256;
    }

    return buffer;
  }

  /**
   * Calculate cosine similarity between embeddings
   */
  private static calculateSimilarity(
    embedding1: Buffer,
    embedding2: Buffer,
  ): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}
