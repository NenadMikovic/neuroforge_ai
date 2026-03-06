import { PrismaClient } from "../../.generated/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prismaClientSingleton = () => {
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  const client = new PrismaClient({ adapter } as any);
  return client;
};

declare global {
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined;
}

export const prisma = global.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export interface CreateMessageInput {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  tokenUsage?: number;
  latency?: number;
}

export interface ConversationWithMessages {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  tokenUsage: number | null;
  latency: number | null;
  createdAt: Date;
}

/**
 * Get or create a user
 */
export async function getOrCreateUser(userId: string, email?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (user) {
    return user;
  }

  return prisma.user.create({
    data: {
      id: userId,
      email,
      rateLimitKey: `${userId}-${Date.now()}`,
    },
  });
}

/**
 * Create a new conversation
 */
export async function createConversation(
  userId: string,
  title: string = "New Conversation",
) {
  return prisma.conversation.create({
    data: {
      userId,
      title,
    },
    include: {
      messages: true,
    },
  });
}

/**
 * Get conversation with all messages
 */
export async function getConversation(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/**
 * Get last N messages from conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 10,
) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return messages.reverse(); // Return in chronological order
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1, // Just get the last message for preview
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Add a message to conversation
 */
export async function addMessage(input: CreateMessageInput) {
  const message = await prisma.message.create({
    data: input,
  });

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string,
) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { title },
  });
}

/**
 * Delete conversation
 */
export async function deleteConversation(conversationId: string) {
  return prisma.conversation.delete({
    where: { id: conversationId },
  });
}

/**
 * Get token usage statistics
 */
export async function getTokenUsageStats(conversationId: string) {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      tokenUsage: { not: null },
    },
  });

  const totalTokens = messages.reduce(
    (sum, msg) => sum + (msg.tokenUsage || 0),
    0,
  );
  const avgLatency =
    messages.length > 0
      ? messages.reduce((sum, msg) => sum + (msg.latency || 0), 0) /
        messages.length
      : 0;

  return {
    totalTokens,
    messageCount: messages.length,
    averageLatency: Math.round(avgLatency),
  };
}
/**
 * Add sources to a message (link message to retrieved documents)
 */
export async function addMessageSources(
  messageId: string,
  sources: Array<{
    documentId: string;
    chunkId: string;
    rankPosition: number;
    similarity: number;
  }>,
) {
  return Promise.all(
    sources.map((source) =>
      (prisma as any).messageSource.create({
        data: {
          messageId,
          documentId: source.documentId,
          chunkId: source.chunkId,
          rankPosition: source.rankPosition,
          similarity: source.similarity,
        },
      }),
    ),
  );
}

/**
 * Get message sources
 */
export async function getMessageSources(messageId: string) {
  return (prisma as any).messageSource.findMany({
    where: { messageId },
    include: {
      document: {
        select: {
          id: true,
          name: true,
        },
      },
      chunk: {
        select: {
          id: true,
          chunkIndex: true,
          content: true,
        },
      },
    },
    orderBy: { rankPosition: "asc" },
  });
}

/**
 * Get retrieval metrics for a user
 */
export async function getRetrievalMetrics(userId: string) {
  const metrics = await (prisma as any).retrievalMetric.findMany({
    where: { userId },
    include: {
      document: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { lastRetrieved: "desc" },
  });

  return metrics;
}

/**
 * Get top documents by retrieval count
 */
export async function getTopDocumentsByRetrievals(
  userId: string,
  limit: number = 10,
) {
  const documents = await (prisma as any).document.findMany({
    where: { userId },
    include: {
      retrievalMetrics: {
        where: { userId },
      },
    },
  });

  // Sort by total retrieval count
  const sorted = documents
    .map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      retrievalCount: doc.retrievalMetrics.reduce(
        (sum: number, m: any) => sum + m.hitCount,
        0,
      ),
    }))
    .sort((a: any, b: any) => b.retrievalCount - a.retrievalCount)
    .slice(0, limit);

  return sorted;
}
