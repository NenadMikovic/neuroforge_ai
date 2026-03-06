/**
 * GET /api/documents/info - Get detailed info including first chunks of documents
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/service";

export const runtime = "nodejs";

/**
 * GET /api/documents/info?userId=xxx
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

    // Get documents with their first chunks
    const documents = await (prisma as any).document.findMany({
      where: { userId },
      include: {
        chunks: {
          take: 3, // Get first 3 chunks to show author info (preview)
          orderBy: { chunkIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        success: true,
        documents: [],
        message: "No documents found for this user",
      });
    }

    // Get total chunk counts for each document
    const formattedDocuments = await Promise.all(
      documents.map(async (doc: any) => {
        const totalChunks = await (prisma as any).documentChunk.count({
          where: { documentId: doc.id },
        });

        return {
          id: doc.id,
          name: doc.name,
          type: doc.type,
          uploadedAt: doc.createdAt.toISOString(),
          totalChunks, // Actual total chunks in database
          previewChunks: doc.chunks.length, // Number of chunks shown in preview
          metadata: doc.metadata ? JSON.parse(doc.metadata) : {},
          firstChunks: doc.chunks.map((chunk: any) => ({
            index: chunk.chunkIndex,
            content: chunk.content,
          })),
        };
      }),
    );

    return NextResponse.json({
      success: true,
      documents: formattedDocuments,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("[Documents Info Error]", errorMessage);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
