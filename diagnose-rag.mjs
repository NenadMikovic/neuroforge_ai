#!/usr/bin/env node

/**
 * RAG System Diagnostic Script
 * Checks if documents are indexed and shows similarity scores
 */

import { prisma } from "@/lib/db/service";
import VectorRetriever from "@/lib/rag/vectorRetriever";
import {
  generateEmbedding,
  cosineSimilarity,
  bufferToVector,
} from "@/lib/rag/embeddings";

async function diagnoseRAG() {
  console.log("🔍 RAG System Diagnostic\n");

  try {
    // Check total documents
    const totalDocs = await prisma.document.count();
    console.log(`📄 Total documents in database: ${totalDocs}`);

    if (totalDocs === 0) {
      console.log("❌ No documents found! Upload some PDFs first.\n");
      return;
    }

    // Check documents by user
    const documents = await prisma.document.findMany({
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    for (const doc of documents) {
      console.log(
        `  - "${doc.name}" (${doc._count.chunks} chunks) - User: ${doc.userId}`,
      );
    }

    // Test with a query
    const testQuery = "pdf document title";
    console.log(`\n🔎 Test query: "${testQuery}"`);

    const embedding = await generateEmbedding(testQuery);
    console.log(`   Embedding dimensions: ${embedding.length}`);

    // Get all chunks and calculate similarities
    console.log("\n📊 Similarity Analysis:");
    const allChunks = await prisma.documentChunk.findMany({
      include: {
        document: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
      take: 10, // Show first 10
    });

    if (allChunks.length === 0) {
      console.log("  No chunks found!");
      return;
    }

    const similarities = allChunks
      .map((chunk) => {
        const vector = bufferToVector(chunk.embedding);
        const similarity = cosineSimilarity(embedding, vector);
        return {
          doc: chunk.document.name,
          similarity: similarity.toFixed(4),
          content: chunk.content.substring(0, 50),
        };
      })
      .sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity));

    for (const result of similarities) {
      const status = parseFloat(result.similarity) >= 0.3 ? "✓" : "✗";
      console.log(
        `  ${status} "${result.doc}" - Similarity: ${result.similarity} - "${result.content}..."`,
      );
    }

    // Check threshold settings
    console.log("\n⚙️ Current Settings:");
    console.log("  - Similarity threshold: 0.3");
    console.log("  - Embedding model: Xenova/all-MiniLM-L6-v2 (384 dims)");

    const aboveThreshold = similarities.filter(
      (s) => parseFloat(s.similarity) >= 0.3,
    ).length;
    console.log(
      `  - Chunks above threshold: ${aboveThreshold}/${allChunks.length}`,
    );

    if (aboveThreshold === 0) {
      console.log("\n⚠️ No chunks meet the threshold!");
      console.log(
        "   Try lowering the similarity threshold, or check document content quality.",
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseRAG();
