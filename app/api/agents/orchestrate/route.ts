/**
 * Agent Orchestration API Route
 * Processes queries through the multi-agent system
 */

import { NextRequest, NextResponse } from "next/server";
import { AgentOrchestrator } from "@/lib/agents/orchestrator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, userId, query } = body;

    if (!conversationId || !userId || !query) {
      return NextResponse.json(
        { error: "Missing required fields: conversationId, userId, query" },
        { status: 400 },
      );
    }

    console.log(
      `[Orchestrate] Processing query: "${query}" for user: ${userId}`,
    );

    // Initialize orchestrator
    const orchestrator = new AgentOrchestrator({
      enableParallel: true,
      enableLogging: true,
      timeout: 30000,
    });

    console.log(`[Orchestrate] Orchestrator initialized successfully`);

    // Process query through multi-agent system
    const result = await orchestrator.processQuery(
      conversationId,
      userId,
      query,
    );

    console.log(`[Orchestrate] Query processing completed successfully`);

    return NextResponse.json({
      success: true,
      result: {
        conversationId: result.conversationId,
        originalQuery: result.originalQuery,
        intent: result.intent,
        selectedAgents: result.selectedAgents,
        finalOutput: result.finalOutput,
        totalExecutionTime: result.totalExecutionTime,
        executionPlan: {
          stepCount: result.executionPlan.steps.length,
          estimatedTime: result.executionPlan.estimatedCompletionTime,
        },
        agentResponses: Array.from(result.responses.entries()).map(
          ([agentType, response]) => ({
            agent: agentType,
            status: response.status,
            output: response.output,
            executionTime: response.executionTime,
          }),
        ),
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process query";
    const errorStack = error instanceof Error ? error.stack : "";

    console.error(
      "[Agent Orchestration] Error processing query:",
      errorMessage,
    );
    console.error("[Agent Orchestration] Stack trace:", errorStack);

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * GET: Retrieve agent logs and execution history
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get("conversationId");
    const action = searchParams.get("action");

    const orchestrator = new AgentOrchestrator();

    if (action === "summary" && conversationId) {
      const summary = await orchestrator.getExecutionSummary(conversationId);
      return NextResponse.json(summary);
    } else if (action === "logs") {
      const logs = await orchestrator.getAgentLogs(conversationId || undefined);
      return NextResponse.json(logs);
    } else if (action === "routing") {
      const stats = await orchestrator.getRoutingStatistics(
        conversationId || undefined,
      );
      return NextResponse.json(stats);
    } else if (action === "metrics") {
      const metrics = await orchestrator.getAgentMetrics();
      return NextResponse.json(metrics);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[Agent Orchestration GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent data" },
      { status: 500 },
    );
  }
}
