/**
 * DEBUG: Test RAG retrieval directly
 * GET /api/debug/rag?userId=xxx&query=test
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/service";
import { generateEmbedding } from "@/lib/rag/embeddings";
import VectorRetriever from "@/lib/rag/vectorRetriever";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    const query = request.nextUrl.searchParams.get("query");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 },
      );
    }

    const testQuery = query || "test";

    console.log(
      `[DEBUG RAG] Testing RAG for userId: ${userId}, query: "${testQuery}"`,
    );

    // Step 1: Check documents in database
    const documents = await (prisma as any).document.findMany({
      where: { userId },
      include: {
        chunks: {
          take: 1,
        },
      },
    });

    console.log(`[DEBUG RAG] Found ${documents.length} documents for user`);

    if (documents.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No documents found for this user",
        userId,
        steps: ["Check documents in DB"],
        documentCount: 0,
      });
    }

    // Step 2: Check total chunks
    const totalChunks = await (prisma as any).documentChunk.count({
      where: {
        document: {
          userId,
        },
      },
    });

    console.log(`[DEBUG RAG] Total chunks for user: ${totalChunks}`);

    // Step 3: Generate embedding
    console.log(`[DEBUG RAG] Generating embedding for query: "${testQuery}"`);
    const embedding = await generateEmbedding(testQuery);
    console.log(
      `[DEBUG RAG] Embedding generated, dimensions: ${embedding.length}`,
    );

    // Step 4: Retrieve using vector retriever
    const retriever = new VectorRetriever(5, 0.15);
    console.log(`[DEBUG RAG] Starting retrieval with threshold 0.15`);
    const results = await retriever.retrieve({
      embedding,
      topK: 5,
      threshold: 0.15,
      userId,
    });

    console.log(
      `[DEBUG RAG] Retrieval completed, found ${results.length} results`,
    );

    return NextResponse.json({
      success: true,
      userId,
      query: testQuery,
      steps: [
        "✓ Documents found in DB",
        `✓ Total chunks: ${totalChunks}`,
        `✓ Embedding generated (${embedding.length} dims)`,
        `✓ Retrieval completed`,
      ],
      results: {
        documentCount: documents.length,
        totalChunks,
        embeddingDimensions: embedding.length,
        retrievedResults: results.length,
        topResults: results.slice(0, 2).map((r) => ({
          document: r.documentName,
          similarity: r.similarity.toFixed(4),
          excerpt: r.content.substring(0, 100) + "...",
        })),
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";

    console.error("[DEBUG RAG] Error:", errorMessage);
    console.error("[DEBUG RAG] Stack:", errorStack);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        stack: errorStack,
      },
      { status: 500 },
    );
  }
}
