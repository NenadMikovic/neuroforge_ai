/**
 * Base Agent Class
 * Provides common functionality for all agents
 */

import { prisma } from "@/lib/db/service";
import type {
  AgentPayload,
  AgentResponse,
  AgentLogEntry,
  AgentType,
} from "./types";

export abstract class BaseAgent {
  protected agentType: AgentType;
  protected agentName: string;

  constructor(agentType: AgentType, agentName: string) {
    this.agentType = agentType;
    this.agentName = agentName;
  }

  /**
   * Execute the agent's core logic
   */
  abstract execute(payload: AgentPayload): Promise<AgentResponse>;

  /**
   * Log agent execution to database (non-blocking)
   */
  protected async logExecution(
    conversationId: string,
    input: string,
    output: AgentResponse,
  ): Promise<void> {
    // Fire and forget - don't block on database operations
    prisma.agentLog
      .create({
        data: {
          conversationId,
          agentType: this.agentType,
          agentName: this.agentName,
          input,
          output: JSON.stringify(output),
          status: output.status === "success" ? "success" : "error",
          errorMessage: output.error,
          executionTime: output.executionTime,
          tokenUsage: output.tokenUsage,
          metadata: output.reasoning
            ? JSON.stringify({ reasoning: output.reasoning })
            : undefined,
        },
      })
      .catch((error) => {
        console.error(`[${this.agentName}] Failed to log execution:`, error);
      });

    // Update agent metrics (non-blocking)
    this.updateMetrics(output).catch((error) => {
      console.error(`[${this.agentName}] Failed to update metrics:`, error);
    });
  }

  /**
   * Update performance metrics for this agent
   */
  protected async updateMetrics(response: AgentResponse): Promise<void> {
    try {
      const metrics = await prisma.agentMetrics.upsert({
        where: { agentType: this.agentType },
        create: {
          agentType: this.agentType,
          totalExecutions: 1,
          successCount: response.status === "success" ? 1 : 0,
          errorCount: response.status === "error" ? 1 : 0,
          totalExecutionTime: response.executionTime,
          averageExecutionTime: response.executionTime,
          averageTokenUsage: response.tokenUsage || 0,
          routingFrequency: 1,
        },
        update: {
          totalExecutions: { increment: 1 },
          successCount: {
            increment: response.status === "success" ? 1 : 0,
          },
          errorCount: {
            increment: response.status === "error" ? 1 : 0,
          },
          totalExecutionTime: { increment: response.executionTime },
          averageTokenUsage: {
            increment: response.tokenUsage || 0,
          },
        },
      });

      // Recalculate averages
      if (metrics) {
        const avgTime = metrics.totalExecutionTime / metrics.totalExecutions;
        const avgTokens =
          metrics.totalExecutions > 0 ? metrics.averageTokenUsage : 0;

        await prisma.agentMetrics.update({
          where: { id: metrics.id },
          data: {
            averageExecutionTime: avgTime,
            averageTokenUsage: Math.floor(avgTokens / metrics.totalExecutions),
          },
        });
      }
    } catch (error) {
      console.error(`[${this.agentName}] Failed to update metrics:`, error);
    }
  }

  /**
   * Get current metrics for this agent
   */
  async getMetrics() {
    return prisma.agentMetrics.findUnique({
      where: { agentType: this.agentType },
    });
  }

  /**
   * Record execution timing
   */
  protected measureTime<T>(fn: () => T): [T, number] {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    return [result, Math.round(duration)];
  }

  /**
   * Record async execution timing
   */
  protected async measureTimeAsync<T>(
    fn: () => Promise<T>,
  ): Promise<[T, number]> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return [result, Math.round(duration)];
  }

  /**
   * Safe error handling and response creation
   */
  protected createErrorResponse(
    error: unknown,
    defaultTime: number = 0,
  ): AgentResponse {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return {
      agentType: this.agentType,
      status: "error",
      output: "Failed to process request",
      error: errorMessage,
      executionTime: defaultTime,
    };
  }

  /**
   * Validate payload
   */
  protected validatePayload(payload: AgentPayload): {
    valid: boolean;
    error?: string;
  } {
    if (!payload.conversationId) {
      return { valid: false, error: "Missing conversationId" };
    }
    if (!payload.userId) {
      return { valid: false, error: "Missing userId" };
    }
    if (!payload.input || payload.input.trim().length === 0) {
      return { valid: false, error: "Empty input" };
    }
    return { valid: true };
  }

  /**
   * Parse JSON safely
   */
  protected safeJsonParse(json: string, fallback: any = null): any {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }

  /**
   * Stringify data with error handling
   */
  protected safeJsonStringify(data: any): string {
    try {
      return JSON.stringify(data);
    } catch {
      return "{}";
    }
  }
}
