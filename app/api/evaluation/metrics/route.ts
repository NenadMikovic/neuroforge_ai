/**
 * Metrics & Evaluation API Route
 * GET /api/evaluation/metrics
 */

import { MetricsService } from "@/lib/services";
import { prisma } from "@/lib/db/service";

export async function GET(request: Request) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== "Bearer admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const days = Math.min(parseInt(url.searchParams.get("days") || "30"), 365);
    const userId = url.searchParams.get("userId");

    // Get metrics
    const metrics = userId
      ? await MetricsService.getMetricsForUser(userId, days)
      : await MetricsService.getGlobalMetrics(days);

    // Get error logs
    const errorLogs = userId
      ? await MetricsService.getErrorLogs(userId, days)
      : await MetricsService.getErrorLogs(undefined, days);

    // Get security incidents (handle case where table might not exist)
    let securityIncidents: any[] = [];
    try {
      securityIncidents =
        (await (prisma as any).securityAuditLog?.findMany({
          where: userId ? { userId } : {},
          orderBy: { createdAt: "desc" },
          take: 100,
        })) || [];
    } catch (e) {
      console.warn("[Evaluation API] Failed to fetch security audit logs:", e);
    }

    // Get conversation count (handle case where table might not exist)
    let conversationCount = 0;
    try {
      conversationCount =
        (await (prisma as any).conversation?.count({
          where: userId ? { userId } : {},
        })) || 0;
    } catch (e) {
      console.warn("[Evaluation API] Failed to fetch conversation count:", e);
    }

    return Response.json({
      success: true,
      data: {
        metrics: {
          ...metrics,
          conversationCount,
        },
        errorLogs: errorLogs ? errorLogs.slice(0, 20) : [],
        securityIncidents: securityIncidents
          ? securityIncidents.slice(0, 20)
          : [],
        timeRange: {
          start: metrics.timeRange.start,
          end: metrics.timeRange.end,
          days,
        },
      },
    });
  } catch (error) {
    console.error("[Evaluation API] Error:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to fetch metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
