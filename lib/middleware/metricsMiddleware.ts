/**
 * Metrics Collection Middleware
 * Automatically captures request metrics: tokens, latency, errors
 */

import { NextRequest, NextResponse } from "next/server";
import { TokenCounter } from "@/lib/services/tokenCounter";
import {
  LatencyTracker,
  getLatencyTracker,
} from "@/lib/services/latencyTracker";
import { MetricsService } from "@/lib/services/metricsService";
import { prisma } from "@/lib/db/service";

interface MetricsData {
  userId?: string;
  conversationId?: string;
  agentType?: string;
  toolUsed?: string;
  modelUsed?: string;
  inferenceType?: "local" | "external";
}

export class MetricsMiddleware {
  /**
   * Record request/response metrics
   */
  static async recordRequest({
    userId,
    conversationId,
    input,
    response,
    agentType,
    toolUsed,
    modelUsed = "default",
    inferenceType = "local",
    error,
  }: {
    userId?: string;
    conversationId?: string;
    input: string;
    response?: string;
    agentType?: string;
    toolUsed?: string;
    modelUsed?: string;
    inferenceType?: "local" | "external";
    error?: Error;
  }) {
    try {
      const startTime = performance.now();

      // Count tokens
      const inputTokenCount = TokenCounter.countTokens(input);
      const outputTokenCount = response
        ? TokenCounter.countTokens(response)
        : 0;
      const totalTokens = inputTokenCount + outputTokenCount;

      // Estimate cost (external inference only)
      const estimatedCost =
        inferenceType === "external"
          ? TokenCounter.estimateCost(totalTokens, "external")
          : 0;

      // Record complete metric
      await MetricsService.recordMetric({
        userId: userId || "anonymous",
        conversationId: conversationId || "unknown",
        tokenCount: totalTokens,
        latency: Math.round(performance.now() - startTime),
        agentType: agentType || "unspecified",
        toolUsed: toolUsed,
        modelUsed,
        inputTokens: inputTokenCount,
        outputTokens: outputTokenCount,
        errorOccurred: !!error,
        errorType: error?.name,
        retrievalHit: false, // Set by caller if applicable
      });

      return {
        tokenCount: totalTokens,
        cost: estimatedCost,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.error("Error recording metrics:", err);
      // Fail silently to not block requests
      return null;
    }
  }

  /**
   * Wrap an API handler with metrics collection
   */
  static async withMetrics(
    handler: (
      req: NextRequest,
      metricsData: MetricsData,
    ) => Promise<NextResponse>,
    options?: {
      agentType?: string;
      modelUsed?: string;
      inferenceType?: "local" | "external";
    },
  ) {
    return async (req: NextRequest) => {
      const metricsData: MetricsData = {
        agentType: options?.agentType,
        modelUsed: options?.modelUsed || "default",
      };

      const startTime = performance.now();
      let response: NextResponse;
      let error: Error | null = null;
      let requestBody = "";

      try {
        // Capture request body
        if (req.method === "POST" || req.method === "PUT") {
          const clonedReq = req.clone();
          requestBody = await clonedReq.text();
        }

        // Call handler
        response = await handler(req, metricsData);

        // Capture response
        const clonedResponse = response.clone();
        const responseBody = await clonedResponse.text();

        // Record metrics with response
        const latency = Math.round(performance.now() - startTime);
        const inputTokens = TokenCounter.countTokens(requestBody || req.url);
        const outputTokens = TokenCounter.countTokens(responseBody);

        await prisma.metricsRecord.create({
          data: {
            userId: metricsData.userId || "anonymous",
            conversationId: metricsData.conversationId || "api-call",
            tokenCount: inputTokens + outputTokens,
            latency,
            agentType: metricsData.agentType || "api",
            toolUsed: metricsData.toolUsed,
            modelUsed: options?.modelUsed || "default",
            inputTokens,
            outputTokens,
            errorOccurred: false,
            errorType: null,
            retrievalHit: false,
            metadata: JSON.stringify({
              route: req.nextUrl.pathname,
              method: req.method,
              inferenceType: options?.inferenceType || "local",
              responseStatus: response.status,
            }),
          },
        });

        return response;
      } catch (err) {
        error = err as Error;
        const latency = Math.round(performance.now() - startTime);

        // Record error metric
        await prisma.metricsRecord.create({
          data: {
            userId: metricsData.userId || "anonymous",
            conversationId: metricsData.conversationId || "api-call",
            tokenCount: TokenCounter.countTokens(requestBody || req.url),
            latency,
            agentType: metricsData.agentType || "api",
            toolUsed: metricsData.toolUsed,
            modelUsed: options?.modelUsed || "default",
            inputTokens: TokenCounter.countTokens(requestBody || req.url),
            outputTokens: 0,
            errorOccurred: true,
            errorType: error?.name,
            retrievalHit: false,
            metadata: JSON.stringify({
              route: req.nextUrl.pathname,
              method: req.method,
              error: error?.message,
              inferenceType: options?.inferenceType || "local",
            }),
          },
        });

        throw error;
      }
    };
  }

  /**
   * Get latency tracker singleton
   */
  static getLatencyTracker() {
    return getLatencyTracker();
  }
}
