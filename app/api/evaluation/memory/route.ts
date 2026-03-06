/**
 * Memory & History API Route
 * GET /api/evaluation/memory
 */

import { MemoryService } from "@/lib/services";
import { prisma } from "@/lib/db/service";

export async function GET(request: Request) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get("Authorization");
    const userId = new URL(request.url).searchParams.get("userId");

    // Only admin can see all data, users can only see their own
    if (authHeader !== "Bearer admin" && !userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authHeader !== "Bearer admin" && userId) {
      // User trying to access their own data - verify in real app
      // For now, allow it
    }

    const targetUserId = userId || "global";

    // Get memory statistics
    const memoryStats = userId
      ? await MemoryService.getMemoryUsageStats(userId)
      : {
          totalMemories: 0,
          totalTokensStored: 0,
          averageMessagesSummarized: 0,
          oldestMemory: null,
        };

    // Get recent conversations from memory
    let recentMemories: any[] = [];
    try {
      recentMemories = userId
        ? (await (prisma as any).conversationMemory?.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              conversationId: true,
              summary: true,
              tokenCount: true,
              messageCount: true,
              keyTopics: true,
              createdAt: true,
            },
          })) || []
        : [];
    } catch (e) {
      console.warn("[Memory API] Failed to fetch recent memories:", e);
      recentMemories = [];
    }

    // Get conversation statistics
    let conversationStats: any[] = [];
    try {
      conversationStats = userId
        ? (await (prisma as any).conversation?.findMany({
            where: { userId },
            include: {
              _count: {
                select: { messages: true },
              },
            },
          })) || []
        : [];
    } catch (e) {
      console.warn("[Memory API] Failed to fetch conversation stats:", e);
      conversationStats = [];
    }

    return Response.json({
      success: true,
      data: {
        memoryStats,
        recentMemories: (recentMemories || []).map((m: any) => ({
          ...m,
          keyTopics:
            typeof m.keyTopics === "string"
              ? JSON.parse(m.keyTopics)
              : m.keyTopics,
        })),
        conversationMetrics: {
          totalConversations: conversationStats.length,
          averageMessagesPerConversation:
            conversationStats.length > 0
              ? Math.round(
                  conversationStats.reduce(
                    (sum: number, c: any) => sum + (c._count?.messages || 0),
                    0,
                  ) / conversationStats.length,
                )
              : 0,
        },
      },
    });
  } catch (error) {
    console.error("[Memory API] Error:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to fetch memory data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
