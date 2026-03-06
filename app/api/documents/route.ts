/**
 * GET /api/documents - List documents for user
 * DELETE /api/documents/[id] - Delete a document
 */

import { NextRequest, NextResponse } from "next/server";
import RAGService from "@/lib/rag/ragService";
import { prisma } from "@/lib/db/service";

export const runtime = "nodejs";

/**
 * GET /api/documents?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 },
      );
    }

    const ragService = new RAGService();
    const documents = await ragService.getUserDocuments(userId);

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("[Documents GET Error]", errorMessage);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
