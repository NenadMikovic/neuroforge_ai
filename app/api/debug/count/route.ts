/**
 * Simple document count endpoint
 * Shows exact number of documents and chunks in database
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    // Get all data
    const totalDocuments = await (prisma as any).document.count();
    const totalChunks = await (prisma as any).documentChunk.count();

    let userDocumentCount = 0;
    let userChunkCount = 0;
    const userDocumentList: any[] = [];

    if (userId) {
      userDocumentCount = await (prisma as any).document.count({
        where: { userId },
      });

      userChunkCount = await (prisma as any).documentChunk.count({
        where: { document: { userId } },
      });

      // Get document details
      const docs = await (prisma as any).document.findMany({
        where: { userId },
        include: {
          _count: {
            select: { chunks: true },
          },
        },
      });

      userDocumentList.push(
        ...docs.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          chunkCount: d._count.chunks,
          createdAt: d.createdAt,
        })),
      );
    }

    return NextResponse.json({
      database: {
        totalDocuments,
        totalChunks,
      },
      user: {
        userId: userId || "not-provided",
        documentCount: userDocumentCount,
        chunkCount: userChunkCount,
      },
      yourDocuments: userDocumentList,
      instructions: {
        step1:
          "Copy your User ID from the test page or browser console (chatService.getUserId())",
        step2: "Upload a document using http://localhost:3000/upload-debug",
        step3: "Then check this endpoint if the document appears:",
        step4:
          "If documentCount is 0, the upload failed. Check upload-debug console logs",
        step5:
          "If documentCount > 0 but chunkCount = 0, chunks failed to generate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
