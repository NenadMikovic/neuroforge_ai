/**
 * Admin Tool Explorer API
 * GET /api/admin/tools - Get tool execution history and aggregated stats
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/service";

export const runtime = "nodejs";

interface ToolExecution {
  id: string;
  toolName: string;
  timestamp: string;
  duration: number;
  status: "success" | "failure" | "timeout";
  input: string;
  output: string;
  error?: string;
  agentType: string;
}

interface ToolStats {
  name: string;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  successRate: number;
}

function safeParseJson(value: string | null): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);

    const toolLogs = await (prisma as any).toolExecutionLog?.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const conversationIds = Array.from(
      new Set(
        (toolLogs || []).map((log: any) => log.conversationId).filter(Boolean),
      ),
    );

    const [agentLogs, routingLogs] = await Promise.all([
      conversationIds.length > 0
        ? (prisma as any).agentLog
            ?.findMany({
              where: {
                conversationId: { in: conversationIds },
              },
              orderBy: { createdAt: "desc" },
            })
            .catch(() => [])
        : Promise.resolve([]),
      conversationIds.length > 0
        ? (prisma as any).agentRoutingLog
            ?.findMany({
              where: {
                conversationId: { in: conversationIds },
              },
              orderBy: { createdAt: "desc" },
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    const conversationToAgentType = new Map<string, string>();
    for (const log of agentLogs || []) {
      if (
        log.conversationId &&
        log.agentType &&
        !conversationToAgentType.has(log.conversationId)
      ) {
        conversationToAgentType.set(log.conversationId, log.agentType);
      }
    }
    for (const routing of routingLogs || []) {
      if (
        routing.conversationId &&
        routing.selectedAgent &&
        !conversationToAgentType.has(routing.conversationId)
      ) {
        conversationToAgentType.set(
          routing.conversationId,
          routing.selectedAgent,
        );
      }
    }

    const executions: ToolExecution[] = (toolLogs || []).map((log: any) => {
      const metadata = safeParseJson(log.metadata);
      const errorText = log.errorMessage || "";
      const status: "success" | "failure" | "timeout" = log.success
        ? "success"
        : /timeout|timed out|deadline/i.test(errorText)
          ? "timeout"
          : "failure";

      const inputText =
        metadata?.input ||
        metadata?.args ||
        metadata?.params ||
        (log.paramsHash
          ? `paramsHash:${log.paramsHash}`
          : "(input not stored)");

      const outputText =
        metadata?.output ||
        metadata?.result ||
        (log.resultHash
          ? `resultHash:${log.resultHash} (${log.resultSize || 0} bytes)`
          : "(output not stored)");

      return {
        id: log.id,
        toolName: log.toolName,
        timestamp: log.createdAt.toISOString(),
        duration: log.executionTime || 0,
        status,
        input:
          typeof inputText === "string" ? inputText : JSON.stringify(inputText),
        output:
          typeof outputText === "string"
            ? outputText
            : JSON.stringify(outputText),
        error: log.errorMessage || undefined,
        agentType:
          metadata?.agentType ||
          metadata?.agent ||
          metadata?.source ||
          conversationToAgentType.get(log.conversationId) ||
          "tool-calling",
      };
    });

    const statsMap = new Map<string, ToolStats>();
    for (const exec of executions) {
      const existing = statsMap.get(exec.toolName) || {
        name: exec.toolName,
        totalCalls: 0,
        successCount: 0,
        failureCount: 0,
        averageDuration: 0,
        successRate: 0,
      };

      existing.totalCalls += 1;
      if (exec.status === "success") {
        existing.successCount += 1;
      } else {
        existing.failureCount += 1;
      }

      existing.averageDuration =
        (existing.averageDuration * (existing.totalCalls - 1) + exec.duration) /
        existing.totalCalls;

      existing.successRate =
        existing.totalCalls > 0
          ? (existing.successCount / existing.totalCalls) * 100
          : 0;

      statsMap.set(exec.toolName, existing);
    }

    const stats = Array.from(statsMap.values()).sort(
      (a, b) => b.totalCalls - a.totalCalls,
    );

    return NextResponse.json({
      executions,
      stats,
      totalExecutions: executions.length,
    });
  } catch (error) {
    console.error("[Admin Tools API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tool executions",
        details: error instanceof Error ? error.message : String(error),
        executions: [],
        stats: [],
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
