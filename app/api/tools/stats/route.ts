/**
 * API Route: Tool Statistics and Metrics
 * GET /api/tools/stats - Get statistics for all tools
 * GET /api/tools/stats?tool=sql_query - Get stats for specific tool
 */

import { NextRequest, NextResponse } from "next/server";
import { toolConfigService } from "@/lib/tools/configService";
import type { ToolName } from "@/lib/tools/types";

export async function GET(request: NextRequest) {
  try {
    // Check authorization (basic)
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get tool name from query params
    const toolName = request.nextUrl.searchParams.get(
      "tool",
    ) as ToolName | null;

    let stats: any;

    if (toolName) {
      // Get stats for specific tool
      stats = await toolConfigService.getToolStatistics(toolName);

      if (!stats) {
        return NextResponse.json(
          {
            message: `No statistics available for tool '${toolName}'`,
            data: null,
          },
          { status: 200 },
        );
      }
    } else {
      // Get stats for all tools
      stats = await toolConfigService.getStatistics();
    }

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to retrieve statistics",
        message,
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
