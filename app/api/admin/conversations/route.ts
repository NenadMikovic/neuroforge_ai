/**
 * Admin Conversation Analytics API
 * GET /api/admin/conversations - Get conversation analytics with real data
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/service";

export const runtime = "nodejs";

interface ConversationAnalytics {
  id: string;
  userId: string;
  messageCount: number;
  totalTokens: number;
  duration: number; // in milliseconds
  createdAt: string;
  lastMessage: string;
  agentsUsed: string[];
  toolsUsed: string[];
  status: "active" | "completed" | "paused";
}

interface AnalyticsStats {
  totalConversations: number;
  averageMessagesPerConv: number;
  averageTokensPerConv: number;
  averageDuration: number;
  mostUsedAgents: { agent: string; count: number }[];
  mostUsedTools: { tool: string; count: number }[];
}

/**
 * GET /api/admin/conversations - Fetch conversation analytics
 */
export async function GET(request: NextRequest) {
  try {
    // Get all conversations with their messages
    const conversations = await prisma.conversation.findMany({
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50, // Limit to last 50 conversations
    });

    // Get agent logs for all conversations
    const conversationIds = conversations.map((c) => c.id);
    const agentLogs = await (prisma as any).agentLog?.findMany({
      where: {
        conversationId: { in: conversationIds },
        status: "success",
      },
      select: {
        conversationId: true,
        agentType: true,
        agentName: true,
      },
    });

    // Get tool execution logs
    const toolLogs = await (prisma as any).toolExecutionLog?.findMany({
      where: {
        conversationId: { in: conversationIds },
        success: true,
      },
      select: {
        conversationId: true,
        toolName: true,
      },
    });

    // Create maps for quick lookup
    const agentMap = new Map<string, string[]>();
    const toolMap = new Map<string, string[]>();

    if (agentLogs) {
      agentLogs.forEach((log: any) => {
        const agents = agentMap.get(log.conversationId) || [];
        if (!agents.includes(log.agentType)) {
          agents.push(log.agentType);
        }
        agentMap.set(log.conversationId, agents);
      });
    }

    if (toolLogs) {
      toolLogs.forEach((log: any) => {
        const tools = toolMap.get(log.conversationId) || [];
        if (!tools.includes(log.toolName)) {
          tools.push(log.toolName);
        }
        toolMap.set(log.conversationId, tools);
      });
    }

    // Process conversations into analytics format
    const analytics: ConversationAnalytics[] = conversations.map((conv) => {
      const messageCount = conv.messages.length;
      const totalTokens = conv.messages.reduce(
        (sum, msg) => sum + (msg.tokenUsage || 0),
        0,
      );

      // Calculate duration (time between first and last message)
      const firstMessage = conv.messages[0];
      const lastMessage = conv.messages[conv.messages.length - 1];
      const duration =
        lastMessage && firstMessage
          ? new Date(lastMessage.createdAt).getTime() -
            new Date(firstMessage.createdAt).getTime()
          : 0;

      // Determine status based on last update time
      const hoursSinceUpdate =
        (Date.now() - new Date(conv.updatedAt).getTime()) / (1000 * 60 * 60);
      const status: "active" | "completed" | "paused" =
        hoursSinceUpdate < 1
          ? "active"
          : hoursSinceUpdate < 24
            ? "paused"
            : "completed";

      return {
        id: conv.id,
        userId: conv.userId,
        messageCount,
        totalTokens,
        duration,
        createdAt: conv.createdAt.toISOString(),
        lastMessage:
          lastMessage?.content.substring(0, 100) || "No messages yet",
        agentsUsed: agentMap.get(conv.id) || [],
        toolsUsed: toolMap.get(conv.id) || [],
        status,
      };
    });

    // Calculate aggregate statistics
    const agentFrequency = new Map<string, number>();
    const toolFrequency = new Map<string, number>();

    analytics.forEach((conv) => {
      conv.agentsUsed.forEach((agent) => {
        agentFrequency.set(agent, (agentFrequency.get(agent) || 0) + 1);
      });
      conv.toolsUsed.forEach((tool) => {
        toolFrequency.set(tool, (toolFrequency.get(tool) || 0) + 1);
      });
    });

    const totalMessages = analytics.reduce(
      (sum, conv) => sum + conv.messageCount,
      0,
    );
    const totalTokens = analytics.reduce(
      (sum, conv) => sum + conv.totalTokens,
      0,
    );
    const totalDuration = analytics.reduce(
      (sum, conv) => sum + conv.duration,
      0,
    );

    const stats: AnalyticsStats = {
      totalConversations: analytics.length,
      averageMessagesPerConv:
        analytics.length > 0 ? totalMessages / analytics.length : 0,
      averageTokensPerConv:
        analytics.length > 0 ? totalTokens / analytics.length : 0,
      averageDuration:
        analytics.length > 0 ? totalDuration / analytics.length : 0,
      mostUsedAgents: Array.from(agentFrequency.entries())
        .map(([agent, count]) => ({ agent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      mostUsedTools: Array.from(toolFrequency.entries())
        .map(([tool, count]) => ({ tool, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };

    return NextResponse.json({
      conversations: analytics,
      stats,
    });
  } catch (error) {
    console.error("[Admin API] Error fetching conversation analytics:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch conversation analytics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
