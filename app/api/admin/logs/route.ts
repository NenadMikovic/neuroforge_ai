/**
 * Admin System Logs API
 * GET /api/admin/logs - Get system logs from various sources
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/service";

export const runtime = "nodejs";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error" | "fatal";
  module: string;
  message: string;
  error?: {
    category: string;
    severity: string;
    originalMessage: string;
  };
  context?: {
    userId?: string;
    conversationId?: string;
    requestId?: string;
    operation?: string;
    duration?: number;
  };
}

/**
 * GET /api/admin/logs - Fetch system logs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const level = searchParams.get("level") || "all";
    const module = searchParams.get("module") || "all";

    const logs: LogEntry[] = [];

    // Fetch Agent Logs
    try {
      const agentLogs = await (prisma as any).agentLog?.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      if (agentLogs) {
        for (const log of agentLogs) {
          const logEntry: LogEntry = {
            id: `agent-${log.id}`,
            timestamp: log.createdAt.toISOString(),
            level:
              log.status === "error"
                ? "error"
                : log.status === "pending"
                  ? "debug"
                  : "info",
            module: `Agent:${log.agentType}`,
            message: `Agent ${log.agentName} ${log.status}`,
            context: {
              conversationId: log.conversationId,
              operation: log.agentType,
              duration: log.executionTime,
            },
          };

          if (log.status === "error" && log.errorMessage) {
            logEntry.error = {
              category: "AGENT_ERROR",
              severity: "error",
              originalMessage: log.errorMessage,
            };
          }

          logs.push(logEntry);
        }
      }
    } catch (error) {
      console.warn("[Admin Logs] Failed to fetch agent logs:", error);
    }

    // Fetch Tool Execution Logs
    try {
      const toolLogs = await (prisma as any).toolExecutionLog?.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      if (toolLogs) {
        for (const log of toolLogs) {
          const logEntry: LogEntry = {
            id: `tool-${log.id}`,
            timestamp: log.createdAt.toISOString(),
            level: !log.success ? "error" : "info",
            module: `Tool:${log.toolName}`,
            message: `Tool ${log.toolName} ${log.success ? "executed successfully" : "failed"}`,
            context: {
              userId: log.userId,
              conversationId: log.conversationId,
              operation: log.toolName,
              duration: log.executionTime,
            },
          };

          if (!log.success && log.errorMessage) {
            logEntry.error = {
              category: "TOOL_ERROR",
              severity: "error",
              originalMessage: log.errorMessage,
            };
          }

          logs.push(logEntry);
        }
      }
    } catch (error) {
      console.warn("[Admin Logs] Failed to fetch tool logs:", error);
    }

    // Fetch Metrics Records (errors only)
    try {
      const metricsLogs = await (prisma as any).metricsRecord?.findMany({
        where: {
          errorOccurred: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      if (metricsLogs) {
        for (const log of metricsLogs) {
          logs.push({
            id: `metric-${log.id}`,
            timestamp: log.createdAt.toISOString(),
            level: "error",
            module: `Metrics:${log.modelUsed || "unknown"}`,
            message: `Request failed with error`,
            error: {
              category: log.errorType || "UNKNOWN_ERROR",
              severity: "error",
              originalMessage: log.errorType || "No error details available",
            },
            context: {
              userId: log.userId,
              conversationId: log.conversationId,
              operation: log.agentType || "request",
              duration: log.latency,
            },
          });
        }
      }
    } catch (error) {
      console.warn("[Admin Logs] Failed to fetch metrics logs:", error);
    }

    // Fetch Security Audit Logs
    try {
      const securityLogs = await (prisma as any).securityAuditLog?.findMany({
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 50), // Limit security logs
      });

      if (securityLogs) {
        for (const log of securityLogs) {
          const severity = log.severity || "medium";
          logs.push({
            id: `security-${log.id}`,
            timestamp: log.createdAt.toISOString(),
            level:
              severity === "critical" || severity === "high" ? "error" : "warn",
            module: "Security",
            message: `Security threat detected: ${log.threatType}`,
            error: {
              category: log.threatType || "SECURITY_THREAT",
              severity: severity,
              originalMessage:
                log.action_taken || "No action details available",
            },
            context: {
              userId: log.userId,
              conversationId: log.conversationId,
              operation: "security_check",
            },
          });
        }
      }
    } catch (error) {
      console.warn("[Admin Logs] Failed to fetch security logs:", error);
    }

    // Sort all logs by timestamp (newest first)
    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Apply filters
    let filteredLogs = logs;

    if (level !== "all") {
      filteredLogs = filteredLogs.filter((log) => log.level === level);
    }

    if (module !== "all") {
      filteredLogs = filteredLogs.filter((log) => log.module === module);
    }

    // Limit to requested amount
    filteredLogs = filteredLogs.slice(0, limit);

    // Get unique modules for filter dropdown
    const modules = [...new Set(logs.map((log) => log.module))];

    return NextResponse.json({
      logs: filteredLogs,
      modules,
      total: filteredLogs.length,
    });
  } catch (error) {
    console.error("[Admin Logs API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch system logs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
