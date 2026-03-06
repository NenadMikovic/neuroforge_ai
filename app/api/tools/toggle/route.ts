/**
 * API Route: Tool Enable/Disable Control
 * POST /api/tools/toggle
 */

import { NextRequest, NextResponse } from "next/server";
import { toolConfigService } from "@/lib/tools/configService";
import { getToolExecutor } from "@/lib/tools/executor";
import type { ToolName } from "@/lib/tools/types";

interface ToggleRequest {
  toolName?: ToolName;
  enabled: boolean;
  global?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ToggleRequest;

    // Validate request
    if (body.enabled === undefined) {
      return NextResponse.json(
        { error: "Missing required field: enabled" },
        { status: 400 },
      );
    }

    let message = "";

    if (body.global) {
      // Toggle global settings
      await toolConfigService.setGlobalEnabled(body.enabled);
      message = `Tools globally ${body.enabled ? "enabled" : "disabled"}`;
    } else if (body.toolName) {
      // Toggle specific tool
      await toolConfigService.setToolEnabled(body.toolName, body.enabled);
      message = `Tool '${body.toolName}' ${body.enabled ? "enabled" : "disabled"}`;
    } else {
      return NextResponse.json(
        { error: "Must specify either toolName or global flag" },
        { status: 400 },
      );
    }

    // Reload executor
    const executor = getToolExecutor();
    await executor.reloadConfig();

    const config = await toolConfigService.getAdminConfig();

    return NextResponse.json({
      success: true,
      message,
      data: config,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to toggle tool setting",
        message: errorMessage,
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
