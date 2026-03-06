/**
 * API Route: Tool Configuration Management
 * GET /api/tools/config - Get current configuration
 * POST /api/tools/config - Update configuration
 * PUT /api/tools/config/reload - Reload configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { toolConfigService } from "@/lib/tools/configService";
import { getToolExecutor } from "@/lib/tools/executor";
import type { AdminToolConfig, ToolName } from "@/lib/tools/types";

/**
 * GET - Retrieve current configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin (basic check - enhance in production)
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await toolConfigService.getAdminConfig();

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to retrieve configuration",
        message,
      },
      { status: 500 },
    );
  }
}

/**
 * POST - Update configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<AdminToolConfig>;

    // Validate update request
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "No configuration updates provided" },
        { status: 400 },
      );
    }

    // Update configuration
    const updated = await toolConfigService.updateConfig(body);

    // Reload executor
    const executor = getToolExecutor();
    await executor.reloadConfig();

    return NextResponse.json({
      success: true,
      message: "Configuration updated successfully",
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to update configuration",
        message,
      },
      { status: 500 },
    );
  }
}

/**
 * PUT - Reload configuration
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const executor = getToolExecutor();
    await executor.reloadConfig();

    const config = await toolConfigService.getAdminConfig();

    return NextResponse.json({
      success: true,
      message: "Configuration reloaded",
      data: config,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to reload configuration",
        message,
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
