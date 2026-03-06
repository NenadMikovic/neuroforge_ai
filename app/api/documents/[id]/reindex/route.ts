/**
 * POST /api/documents/[id]/reindex - Reindex a document
 */

import { NextRequest, NextResponse } from "next/server";
import RAGService from "@/lib/rag/ragService";
import { prisma } from "@/lib/db/service";

export const runtime = "nodejs";

/**
 * POST /api/documents/[id]/reindex
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: documentId } = await params;
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 },
      );
    }

    // Verify ownership
    const document = await (prisma as any).document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    if (document.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Reindex document
    const ragService = new RAGService();
    const originalPath = document.originalPath;

    // Check if original file exists - if not, can't reindex
    const fs = require("fs");
    if (!fs.existsSync(originalPath)) {
      return NextResponse.json(
        {
          error: "Original document file not found. Please re-upload.",
        },
        { status: 400 },
      );
    }

    const updatedDoc = await ragService.reindexDocument(
      documentId,
      originalPath,
    );

    return NextResponse.json({
      success: true,
      document: updatedDoc,
      message: "Document reindexed successfully",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("[Reindex Error]", errorMessage);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
