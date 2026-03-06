/**
 * Agent Metrics API Route
 * Provides metrics and statistics about agent performance
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/service";
import { TokenCounter } from "@/lib/services/tokenCounter";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const metric = searchParams.get("metric");
    const agentType = searchParams.get("agentType");
    const timeRange = searchParams.get("timeRange") || "all";

    // Route to appropriate handler
    if (metric === "performance") {
      return await getPerformanceMetrics(agentType);
    } else if (metric === "routing") {
      return await getRoutingMetrics(timeRange);
    } else if (metric === "logs") {
      return await getAgentLogs(agentType);
    } else if (metric === "summary") {
      return await getMetricsSummary();
    }

    // Default: return empty metrics
    return NextResponse.json({
      metrics: [],
    });
  } catch (error) {
    console.error("[Agent Metrics] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch metrics",
        metrics: [],
        routing: {
          intentFrequency: {},
          agentFrequency: {},
          averageConfidence: 0,
        },
        logs: [],
        summary: {
          summary: {
            totalAgentExecutions: 0,
            totalErrors: 0,
            avgExecutionTime: 0,
            overallSuccessRate: 0,
            executionsLast24h: 0,
            executionsLastHour: 0,
            totalRoutingDecisions: 0,
          },
          byAgent: {},
        },
      },
      { status: 200 },
    );
  }
}

/**
 * Get performance metrics for agents
 */
async function getPerformanceMetrics(agentType: string | null) {
  try {
    const where = agentType ? { agentType } : undefined;
    const metrics = await prisma.agentMetrics.findMany({ where });

    const enriched = metrics.map((m: any) => {
      const errorRate =
        m.totalExecutions > 0 ? (m.errorCount / m.totalExecutions) * 100 : 0;
      const successRate =
        m.totalExecutions > 0 ? (m.successCount / m.totalExecutions) * 100 : 0;

      return {
        ...m,
        errorRate: Math.round(errorRate * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        avgExecutionTime: Math.round(m.averageExecutionTime),
      };
    });

    return NextResponse.json({
      metrics: enriched,
    });
  } catch (error) {
    console.error("[Metrics] Failed to get performance metrics:", error);
    return NextResponse.json({
      metrics: [],
    });
  }
}

/**
 * Get routing metrics
 */
async function getRoutingMetrics(timeRange: string) {
  try {
    let dateFilter = undefined;

    if (timeRange === "24h") {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      dateFilter = { gte: oneDayAgo };
    } else if (timeRange === "7d") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { gte: sevenDaysAgo };
    }

    const logs = await prisma.agentRoutingLog.findMany({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
    });

    // Aggregate routing statistics
    const intentFrequency: Record<string, number> = {};
    const agentFrequency: Record<string, number> = {};
    const intentToAgent: Record<string, Record<string, number>> = {};
    const confidenceScores: number[] = [];

    for (const log of logs) {
      // Intent frequency
      intentFrequency[log.detectedIntent] =
        (intentFrequency[log.detectedIntent] || 0) + 1;

      // Agent frequency
      agentFrequency[log.selectedAgent] =
        (agentFrequency[log.selectedAgent] || 0) + 1;

      // Intent to Agent mapping
      if (!intentToAgent[log.detectedIntent]) {
        intentToAgent[log.detectedIntent] = {};
      }
      intentToAgent[log.detectedIntent][log.selectedAgent] =
        (intentToAgent[log.detectedIntent][log.selectedAgent] || 0) + 1;

      // Confidence scores
      confidenceScores.push(log.confidence);
    }

    const avgConfidence =
      confidenceScores.length > 0
        ? (
            (confidenceScores.reduce((a, b) => a + b, 0) /
              confidenceScores.length) *
            100
          ).toFixed(2)
        : 0;

    return NextResponse.json({
      timeRange,
      totalRoutingDecisions: logs.length,
      intentFrequency,
      agentFrequency,
      intentToAgent,
      averageConfidence: parseFloat(avgConfidence as string),
    });
  } catch (error) {
    console.error("[Metrics] Failed to get routing metrics:", error);
    return NextResponse.json({
      timeRange,
      totalRoutingDecisions: 0,
      intentFrequency: {},
      agentFrequency: {},
      intentToAgent: {},
      averageConfidence: 0,
    });
  }
}

/**
 * Get agent execution logs
 */
async function getAgentLogs(agentType: string | null) {
  try {
    const where = agentType ? { agentType } : undefined;

    const logs = await prisma.agentLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const conversationIds = Array.from(
      new Set(logs.map((log) => log.conversationId).filter(Boolean)),
    );

    const [metricsByConversation, toolsByConversation] = await Promise.all([
      conversationIds.length > 0
        ? (prisma as any).metricsRecord
            ?.findMany({
              where: {
                conversationId: { in: conversationIds },
              },
              orderBy: { createdAt: "desc" },
            })
            .catch(() => [])
        : Promise.resolve([]),
      conversationIds.length > 0
        ? (prisma as any).toolExecutionLog
            ?.findMany({
              where: {
                conversationId: { in: conversationIds },
              },
              orderBy: { createdAt: "desc" },
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    const modelByConversation = new Map<string, string>();
    for (const metric of metricsByConversation || []) {
      if (metric.conversationId && metric.modelUsed) {
        if (!modelByConversation.has(metric.conversationId)) {
          modelByConversation.set(metric.conversationId, metric.modelUsed);
        }
      }
    }

    const toolsMap = new Map<string, string[]>();
    for (const toolLog of toolsByConversation || []) {
      if (!toolLog.conversationId || !toolLog.toolName) {
        continue;
      }
      const existing = toolsMap.get(toolLog.conversationId) || [];
      if (!existing.includes(toolLog.toolName)) {
        existing.push(toolLog.toolName);
      }
      toolsMap.set(toolLog.conversationId, existing);
    }

    // Parse JSON fields safely; malformed JSON should not drop the whole response.
    const safeParse = (value: string | null) => {
      if (!value) {
        return null;
      }
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    const parsed = logs.map((log) => {
      const inputText =
        typeof log.input === "string" ? log.input : JSON.stringify(log.input);
      const parsedOutput = safeParse(log.output);
      const outputText =
        typeof parsedOutput === "string"
          ? parsedOutput
          : JSON.stringify(parsedOutput ?? "");
      const estimatedTokenUsage =
        TokenCounter.countTokens(inputText) +
        TokenCounter.countTokens(outputText);

      return {
        ...log,
        input: inputText,
        output: parsedOutput,
        tokenUsage:
          typeof log.tokenUsage === "number" && log.tokenUsage > 0
            ? log.tokenUsage
            : estimatedTokenUsage,
        metadata: safeParse(log.metadata),
        modelUsed: modelByConversation.get(log.conversationId) || null,
        toolsCalled: toolsMap.get(log.conversationId) || [],
      };
    });

    return NextResponse.json({
      logs: parsed,
      total: parsed.length,
    });
  } catch (error) {
    console.error("[Metrics] Failed to get agent logs:", error);
    return NextResponse.json({
      logs: [],
      total: 0,
    });
  }
}

/**
 * Get overall metrics summary
 */
async function getMetricsSummary() {
  try {
    const [allMetrics, recentLogs, routingLogs] = await Promise.all([
      prisma.agentMetrics.findMany().catch(() => []),
      prisma.agentLog
        .findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        })
        .catch(() => []),
      prisma.agentRoutingLog
        .findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        })
        .catch(() => []),
    ]);

    const totalExecutions = allMetrics.reduce(
      (sum: number, m: any) => sum + m.totalExecutions,
      0,
    );
    const totalErrors = allMetrics.reduce(
      (sum: number, m: any) => sum + m.errorCount,
      0,
    );
    const totalTime = allMetrics.reduce(
      (sum: number, m: any) => sum + m.totalExecutionTime,
      0,
    );
    const overallSuccessRate =
      totalExecutions > 0
        ? ((totalExecutions - totalErrors) / totalExecutions) * 100
        : 0;

    const recentHour = recentLogs.filter(
      (log: any) => log.createdAt > new Date(Date.now() - 60 * 60 * 1000),
    ).length;

    const byAgent: Record<string, any> = {};
    for (const metric of allMetrics) {
      byAgent[metric.agentType] = {
        executions: metric.totalExecutions,
        successRate:
          metric.totalExecutions > 0
            ? ((metric.successCount / metric.totalExecutions) * 100).toFixed(2)
            : 0,
        avgTime: Math.round(metric.averageExecutionTime),
        routingFrequency: metric.routingFrequency,
      };
    }

    return NextResponse.json({
      summary: {
        totalAgentExecutions: totalExecutions,
        totalErrors,
        avgExecutionTime:
          totalExecutions > 0 ? Math.round(totalTime / totalExecutions) : 0,
        overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
        executionsLast24h: recentLogs.length,
        executionsLastHour: recentHour,
        totalRoutingDecisions: routingLogs.length,
      },
      byAgent,
    });
  } catch (error) {
    console.error("[Metrics] Failed to get metrics summary:", error);
    return NextResponse.json({
      summary: {
        totalAgentExecutions: 0,
        totalErrors: 0,
        avgExecutionTime: 0,
        overallSuccessRate: 0,
        executionsLast24h: 0,
        executionsLastHour: 0,
        totalRoutingDecisions: 0,
      },
      byAgent: {},
    });
  }
}
