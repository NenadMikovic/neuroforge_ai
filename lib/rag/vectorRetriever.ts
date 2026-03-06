/**
 * Vector retriever using database for storage (FAISS alternative)
 * Provides similarity search with disk persistence
 */

import { cosineSimilarity, bufferToVector } from "./embeddings";
import { prisma } from "@/lib/db/service";

export interface RetrievalResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  similarity: number;
  chunkIndex: number;
}

export interface RetrievalQuery {
  embedding: number[];
  topK?: number;
  threshold?: number;
  userId?: string;
}

/**
 * Vector database retriever
 * Uses SQLite + FAISS-like similarity search
 */
export class VectorRetriever {
  private topK: number;
  private threshold: number;

  constructor(topK: number = 5, threshold: number = 0.15) {
    this.topK = topK;
    this.threshold = threshold;
  }

  /**
   * Retrieve similar chunks for an embedding
   */
  async retrieve(query: RetrievalQuery): Promise<RetrievalResult[]> {
    const {
      embedding,
      topK = this.topK,
      threshold = this.threshold,
      userId,
    } = query;

    try {
      console.log(
        `[Retriever] Starting retrieval for userId: ${userId}, embedding dims: ${embedding.length}, topK: ${topK}, threshold: ${threshold}`,
      );

      // Get all chunks from database (filtered by userId if provided)
      const allChunks = await (prisma as any).documentChunk.findMany({
        include: {
          document: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
        },
      });

      console.log(`[Retriever] Total chunks in database: ${allChunks.length}`);

      if (allChunks.length === 0) {
        console.log("[Retriever] No chunks found in database");
        return [];
      }

      // Filter by userId if provided
      const userChunks = userId
        ? allChunks.filter((chunk: any) => chunk.document.userId === userId)
        : allChunks;

      console.log(
        `[Retriever] Chunks for user ${userId}: ${userChunks.length}`,
      );

      if (userChunks.length === 0) {
        console.log(`[Retriever] No chunks found for userId: ${userId}`);
        // Log which userIds have documents
        const userIds = new Set(allChunks.map((c: any) => c.document.userId));
        console.log(
          `[Retriever] Available userIds in database:`,
          Array.from(userIds),
        );
        return [];
      }

      // Calculate similarity for each chunk
      const similarities = userChunks.map((chunk: any) => {
        const vector = bufferToVector(chunk.embedding);
        const similarity = cosineSimilarity(embedding, vector);

        // Check for invalid vectors
        if (similarity === 0 && vector.every((v: number) => v === 0)) {
          console.warn(
            `[Retriever] WARNING: Chunk "${chunk.id}" has zero vector (corrupted embedding)`,
          );
        }

        return {
          chunk,
          similarity,
          vectorLength: vector.length,
          vectorAllZeros: vector.every((v: number) => v === 0),
        };
      });

      // Log top similarities even if below threshold
      const topSimilarities = similarities
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, 5);

      console.log(`[Retriever] Top 5 similarities (threshold ${threshold}):`);
      topSimilarities.forEach((item: any, idx: number) => {
        const allZeros = item.vectorAllZeros ? " [ZERO VECTOR]" : "";
        console.log(
          `  [${idx + 1}] Document "${item.chunk.document.name}" - Similarity: ${item.similarity.toFixed(4)}${allZeros}`,
        );
      });

      // Sort by similarity and filter
      const results = similarities
        .filter((item: any) => item.similarity >= threshold)
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, topK)
        .map((item: any) => ({
          chunkId: item.chunk.id,
          documentId: item.chunk.documentId,
          documentName: item.chunk.document.name,
          content: item.chunk.content,
          similarity: item.similarity,
          chunkIndex: item.chunk.chunkIndex,
        }));

      console.log(
        `[Retriever] Retrieved ${results.length} relevant chunks (threshold ${threshold}) for userId: ${userId}`,
      );
      if (results.length > 0) {
        console.log(
          `[Retriever] Top match similarity: ${results[0].similarity.toFixed(4)}`,
        );
      }

      // Track retrieval metrics
      if (userId) {
        await this.trackRetrievals(results, userId);
      }

      return results;
    } catch (error) {
      console.error("[Retriever] Error retrieving similar chunks:", error);
      throw new Error(`Failed to retrieve chunks: ${error}`);
    }
  }

  /**
   * Track retrieval metrics for analytics
   */
  private async trackRetrievals(
    results: RetrievalResult[],
    userId: string,
  ): Promise<void> {
    try {
      for (const result of results) {
        // Update or create metric
        const existingMetric = await (prisma as any).retrievalMetric.findFirst({
          where: {
            documentId: result.documentId,
            chunkId: result.chunkId,
            userId,
          },
        });

        if (existingMetric) {
          await (prisma as any).retrievalMetric.update({
            where: { id: existingMetric.id },
            data: {
              hitCount: { increment: 1 },
              lastRetrieved: new Date(),
            },
          });
        } else {
          await (prisma as any).retrievalMetric.create({
            data: {
              documentId: result.documentId,
              chunkId: result.chunkId,
              userId,
              hitCount: 1,
            },
          });
        }
      }
    } catch (error) {
      console.error("[Retriever] Error tracking retrieval metrics:", error);
      // Don't throw here - tracking is secondary
    }
  }

  /**
   * Delete vectors for a document
   */
  async deleteDocumentVectors(documentId: string): Promise<void> {
    try {
      // Delete all chunks for the document
      await (prisma as any).documentChunk.deleteMany({
        where: { documentId },
      });

      console.log(`[Retriever] Deleted vectors for document: ${documentId}`);
    } catch (error) {
      console.error("[Retriever] Error deleting document vectors:", error);
      throw new Error(`Failed to delete document vectors: ${error}`);
    }
  }

  /**
   * Get retrieval statistics for a document
   */
  async getDocumentStats(documentId: string): Promise<{
    totalRetrievals: number;
    topChunks: Array<{
      chunkIndex: number;
      content: string;
      hits: number;
    }>;
  }> {
    try {
      const metrics = await (prisma as any).retrievalMetric.findMany({
        where: { documentId },
        include: {
          chunk: {
            select: {
              chunkIndex: true,
              content: true,
            },
          },
        },
        orderBy: { hitCount: "desc" },
        take: 10,
      });

      const totalRetrievals = metrics.reduce(
        (sum: number, m: any) => sum + m.hitCount,
        0,
      );

      return {
        totalRetrievals,
        topChunks: metrics.map((m: any) => ({
          chunkIndex: m.chunk.chunkIndex,
          content: m.chunk.content,
          hits: m.hitCount,
        })),
      };
    } catch (error) {
      console.error("[Retriever] Error getting document stats:", error);
      throw new Error(`Failed to get document stats: ${error}`);
    }
  }

  /**
   * Reindex document vectors (delete and regenerate embeddings)
   */
  async reindexDocument(
    documentId: string,
    chunks: string[],
    embeddings: number[][],
  ): Promise<void> {
    try {
      // Delete old chunks
      await this.deleteDocumentVectors(documentId);

      // Create new chunks with embeddings
      const { vectorToBuffer } = await import("./embeddings");

      for (let i = 0; i < chunks.length; i++) {
        const embeddingBuffer = vectorToBuffer(embeddings[i]);

        await (prisma as any).documentChunk.create({
          data: {
            documentId,
            chunkIndex: i,
            content: chunks[i],
            embedding: embeddingBuffer as any,
          },
        });
      }

      console.log(
        `[Retriever] Reindexed document: ${documentId} with ${chunks.length} chunks`,
      );
    } catch (error) {
      console.error("[Retriever] Error reindexing document:", error);
      throw new Error(`Failed to reindex document: ${error}`);
    }
  }
}

export default VectorRetriever;
