/**
 * DELETE /api/documents/[id] - Delete a document
 */

import { NextRequest, NextResponse } from "next/server";
import RAGService from "@/lib/rag/ragService";
import { prisma } from "@/lib/db/service";

export const runtime = "nodejs";

/**
 * DELETE /api/documents/[id]
 */
export async function DELETE(
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

    // Delete document
    const ragService = new RAGService();
    await ragService.deleteDocument(documentId);

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("[Documents DELETE Error]", errorMessage);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
