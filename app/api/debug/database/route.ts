/**
 * Database diagnostic endpoint
 * Shows what's actually stored
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    // Get all documents
    const allDocuments = await (prisma as any).document.findMany({
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    console.log(`[DEBUG] Total documents in database: ${allDocuments.length}`);
    console.log("[DEBUG] Documents:", JSON.stringify(allDocuments, null, 2));

    // Get documents for specific user
    let userDocuments = [];
    let userChunks = [];
    if (userId) {
      userDocuments = await (prisma as any).document.findMany({
        where: { userId },
        include: {
          chunks: {
            take: 5,
          },
          _count: {
            select: { chunks: true },
          },
        },
      });

      // Count all chunks for user
      userChunks = await (prisma as any).documentChunk.findMany({
        where: { document: { userId } },
        take: 5,
      });

      console.log(
        `[DEBUG] Documents for user ${userId}: ${userDocuments.length}`,
      );
      console.log(
        "[DEBUG] User documents:",
        JSON.stringify(userDocuments, null, 2),
      );
    }

    // Get total chunk count
    const totalChunks = await (prisma as any).documentChunk.count();

    return NextResponse.json({
      summary: {
        totalDocumentsInDB: allDocuments.length,
        totalChunksInDB: totalChunks,
        userIdQueried: userId || "NOT PROVIDED",
        documentsForUser: userDocuments.length,
        chunksForUser: userChunks.length,
      },
      allDocuments: allDocuments.map((doc: any) => ({
        id: doc.id,
        userId: doc.userId,
        name: doc.name,
        type: doc.type,
        chunkCount: doc._count.chunks,
      })),
      userDocuments: userDocuments.map((doc: any) => ({
        id: doc.id,
        userId: doc.userId,
        name: doc.name,
        type: doc.type,
        chunkCount: doc._count.chunks,
        firstChunks: doc.chunks.map((c: any) => ({
          id: c.id,
          index: c.chunkIndex,
          preview: c.content.substring(0, 100),
        })),
      })),
      sampleChunks: userChunks.map((chunk: any) => ({
        id: chunk.id,
        documentId: chunk.documentId,
        index: chunk.chunkIndex,
        contentLength: chunk.content.length,
        embeddingSize: chunk.embedding.length,
      })),
    });
  } catch (error) {
    console.error("[DEBUG Database] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
