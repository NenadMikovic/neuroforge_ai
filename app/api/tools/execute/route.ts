/**
 * API Route: Execute Tool Call
 * POST /api/tools/execute
 */

import { NextRequest, NextResponse } from "next/server";
import type { ToolCall, ToolContext } from "@/lib/tools/types";
import { getToolExecutor } from "@/lib/tools/executor";
import { validateToolCall } from "@/lib/tools/validators";
import { prisma } from "@/lib/db/service";

interface ExecuteToolRequest {
  toolCall: ToolCall;
  conversationId: string;
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body = (await request.json()) as ExecuteToolRequest;

    // Validate required fields
    if (!body.toolCall || !body.conversationId || !body.userId) {
      return NextResponse.json(
        {
          error: "Missing required fields: toolCall, conversationId, userId",
        },
        { status: 400 },
      );
    }

    // Validate tool call
    const validation = validateToolCall(body.toolCall);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Invalid tool call",
          details: validation.errors,
        },
        { status: 400 },
      );
    }

    // Create execution context
    const context: ToolContext = {
      conversationId: body.conversationId,
      userId: body.userId,
      timestamp: Date.now(),
    };

    // Execute tool
    const executor = getToolExecutor();
    const result = await executor.execute(body.toolCall, context);

    // Return result
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error("[Tools API] Error executing tool:", error);

    return NextResponse.json(
      {
        error: "Tool execution failed",
        message,
      },
      { status: 500 },
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
