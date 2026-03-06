/**
 * Metrics Service
 * Aggregates and analyzes system metrics
 */

import { prisma } from "@/lib/db/service";

export interface AggregatedMetrics {
  totalTokens: number;
  totalRequests: number;
  averageLatency: number;
  averageTokensPerRequest: number;
  errorRate: number;
  successRate: number;
  retrievalHitRate: number;
  agentRoutingDistribution: Record<string, number>;
  toolUsageFrequency: Record<string, number>;
  modelUsageDistribution: Record<string, number>;
  conversationCount: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export class MetricsService {
  /**
   * Get aggregated metrics for a user
   */
  static async getMetricsForUser(
    userId: string,
    days: number = 30,
  ): Promise<AggregatedMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const metrics =
        (await (prisma as any).metricsRecord?.findMany({
          where: {
            userId,
            createdAt: { gte: startDate },
          },
        })) || [];

      // Fetch tool execution logs
      const toolLogs =
        (await (prisma as any).toolExecutionLog?.findMany({
          where: {
            userId,
            createdAt: { gte: startDate },
          },
        })) || [];

      // Fetch agent logs
      const agentLogs =
        (await (prisma as any).agentLog?.findMany({
          where: {
            createdAt: { gte: startDate },
          },
        })) || [];

      return this.aggregateMetrics(metrics, toolLogs, agentLogs, startDate);
    } catch (error) {
      console.error("[MetricsService] Error fetching metrics:", error);
      throw error;
    }
  }

  /**
   * Get global system metrics
   */
  static async getGlobalMetrics(days: number = 30): Promise<AggregatedMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const metrics =
        (await (prisma as any).metricsRecord?.findMany({
          where: {
            createdAt: { gte: startDate },
          },
        })) || [];

      // Fetch tool execution logs
      const toolLogs =
        (await (prisma as any).toolExecutionLog?.findMany({
          where: {
            createdAt: { gte: startDate },
          },
        })) || [];

      // Fetch agent logs
      const agentLogs =
        (await (prisma as any).agentLog?.findMany({
          where: {
            createdAt: { gte: startDate },
          },
        })) || [];

      return this.aggregateMetrics(metrics, toolLogs, agentLogs, startDate);
    } catch (error) {
      console.error("[MetricsService] Error fetching global metrics:", error);
      throw error;
    }
  }

  /**
   * Aggregate metric arrays into summary
   */
  private static aggregateMetrics(
    metrics: any[] = [],
    toolLogs: any[] = [],
    agentLogs: any[] = [],
    startDate: Date,
  ): AggregatedMetrics {
    const endDate = new Date();

    // Token metrics
    const totalTokens = metrics.reduce(
      (sum, m) => sum + (m.tokenCount || 0),
      0,
    );
    const totalRequests = metrics.length;
    const averageTokensPerRequest =
      totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0;

    // Latency metrics
    const latencies = metrics.map((m) => m.latency || 0);
    const averageLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;

    // Error metrics
    const errors = metrics.filter((m) => m.errorOccurred).length;
    const errorRate =
      totalRequests > 0 ? Math.round((errors / totalRequests) * 100) : 0;
    const successRate = totalRequests > 0 ? 100 - errorRate : 0;

    // Retrieval hit rate
    const retrievalHits = metrics.filter((m) => m.retrievalHit).length;
    const retrievalHitRate =
      totalRequests > 0 ? Math.round((retrievalHits / totalRequests) * 100) : 0;

    // Agent routing distribution (from agentLogs)
    const agentRoutingDistribution: Record<string, number> = {};
    for (const log of agentLogs) {
      if (log.agentType) {
        agentRoutingDistribution[log.agentType] =
          (agentRoutingDistribution[log.agentType] || 0) + 1;
      }
    }
    // Also include from metrics if agentLogs is empty
    if (agentLogs.length === 0) {
      for (const metric of metrics) {
        if (metric.agentType) {
          agentRoutingDistribution[metric.agentType] =
            (agentRoutingDistribution[metric.agentType] || 0) + 1;
        }
      }
    }

    // Tool usage frequency
    const toolUsageFrequency: Record<string, number> = {};
    for (const log of toolLogs) {
      if (log.toolName) {
        toolUsageFrequency[log.toolName] =
          (toolUsageFrequency[log.toolName] || 0) + 1;
      }
    }

    // Model usage distribution
    const modelUsageDistribution: Record<string, number> = {};
    for (const metric of metrics) {
      modelUsageDistribution[metric.modelUsed || "unknown"] =
        (modelUsageDistribution[metric.modelUsed || "unknown"] || 0) + 1;
    }

    return {
      totalTokens,
      totalRequests,
      averageLatency,
      averageTokensPerRequest,
      errorRate,
      successRate,
      retrievalHitRate,
      agentRoutingDistribution,
      toolUsageFrequency,
      modelUsageDistribution,
      conversationCount:
        metrics.length > 0
          ? new Set(metrics.map((m) => m.conversationId)).size
          : 0,
      timeRange: {
        start: startDate,
        end: endDate,
      },
    };
  }

  /**
   * Record a metric
   */
  static async recordMetric(data: {
    userId: string;
    conversationId: string;
    tokenCount: number;
    latency: number;
    agentType?: string;
    toolUsed?: string;
    modelUsed: string;
    inputTokens?: number;
    outputTokens?: number;
    errorOccurred?: boolean;
    errorType?: string;
    retrievalHit?: boolean;
  }): Promise<void> {
    try {
      await (prisma as any).metricsRecord?.create({
        data: {
          ...data,
          inputTokens: data.inputTokens || 0,
          outputTokens: data.outputTokens || 0,
          errorOccurred: data.errorOccurred || false,
          retrievalHit: data.retrievalHit || false,
          metadata: JSON.stringify({
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (error) {
      console.error("[MetricsService] Error recording metric:", error);
    }
  }

  /**
   * Get error logs
   */
  static async getErrorLogs(
    userId?: string,
    days: number = 30,
  ): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const query: any = {
        errorOccurred: true,
        createdAt: { gte: startDate },
      };

      if (userId) {
        query.userId = userId;
      }

      return await (prisma as any).metricsRecord?.findMany({
        where: query,
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    } catch (error) {
      console.error("[MetricsService] Error fetching error logs:", error);
      return [];
    }
  }
}
