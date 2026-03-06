/**
 * DEBUG: Test complete orchestrator flow
 * POST /api/debug/test-orchestrator
 * Body: { userId: "...", query: "..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { AgentOrchestrator } from "@/lib/agents/orchestrator";
import { prisma } from "@/lib/db/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, query } = body;

    if (!userId || !query) {
      return NextResponse.json(
        { error: "Missing userId or query" },
        { status: 400 },
      );
    }

    console.log(
      `[DEBUG ORCHESTRATOR] Testing with userId: ${userId}, query: "${query}"`,
    );

    const tests = [
      {
        name: "Check documents in DB",
        run: async () => {
          const docs = await (prisma as any).document.findMany({
            where: { userId },
          });
          return {
            count: docs.length,
            documentNames: docs.map((d: any) => d.name),
          };
        },
      },
      {
        name: "Check chunks in DB",
        run: async () => {
          const totalChunks = await (prisma as any).documentChunk.count({
            where: { document: { userId } },
          });
          return { totalChunks };
        },
      },
      {
        name: "Run orchestrator",
        run: async () => {
          const orchestrator = new AgentOrchestrator({
            enableParallel: true,
            enableLogging: true,
            timeout: 30000,
          });
          const result = await orchestrator.processQuery(
            `test-${Date.now()}`,
            userId,
            query,
          );
          return {
            intent: result.intent,
            agents: result.selectedAgents,
            finalOutput: result.finalOutput.substring(0, 200) + "...",
            totalTime: result.totalExecutionTime,
          };
        },
      },
    ];

    const results = [];
    for (const test of tests) {
      try {
        console.log(`[DEBUG] Running: ${test.name}`);
        const result = await test.run();
        results.push({ test: test.name, status: "✓ success", data: result });
      } catch (error) {
        console.error(`[DEBUG] Failed: ${test.name}`, error);
        results.push({
          test: test.name,
          status: "✗ failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: results.every((r) => r.status === "✓ success"),
      userId,
      query,
      tests: results,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[DEBUG ORCHESTRATOR ERROR]", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
