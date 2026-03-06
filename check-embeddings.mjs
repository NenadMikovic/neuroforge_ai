#!/usr/bin/env node

/**
 * Check if embeddings exist in the database
 */

const fs = require("fs");
const path = require("path");

// Read the Prisma client directly
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkEmbeddings() {
  try {
    console.log("🔍 Checking embeddings in database...\n");

    // Get a sample chunk
    const chunk = await prisma.documentChunk.findFirst({
      include: {
        document: true,
      },
    });

    if (!chunk) {
      console.log("❌ No chunks found in database");
      return;
    }

    console.log(`✓ Found chunk from document: "${chunk.document.name}"`);
    console.log(`  Chunk ID: ${chunk.id}`);
    console.log(`  Content length: ${chunk.content.length} chars`);
    console.log(`  Embedding: ${chunk.embedding ? "Present" : "NULL"}`);

    if (chunk.embedding) {
      // Try to convert the embedding
      const buffer = chunk.embedding;
      console.log(`  Embedding buffer length: ${buffer.length} bytes`);
      console.log(`  Dimensions: ${buffer.length / 4} (assuming Float32)`);

      // Try to read first few values
      const floatArray = new Float32Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.length / 4,
      );
      console.log(
        `  First 5 values: [${Array.from(floatArray.slice(0, 5))
          .map((v) => v.toFixed(4))
          .join(", ")}]`,
      );
      console.log(
        `  Vector is valid: ${floatArray.length > 0 && !isNaN(floatArray[0])}`,
      );
    } else {
      console.log("  ❌ Embedding is NULL!");
    }

    // Check how many chunks have embeddings
    const chunksWithoutEmbedding = await prisma.documentChunk.count({
      where: {
        embedding: null,
      },
    });

    const totalChunks = await prisma.documentChunk.count();

    console.log(`\n📊 Embedding Stats:`);
    console.log(`  Total chunks: ${totalChunks}`);
    console.log(
      `  Chunks with embedding: ${totalChunks - chunksWithoutEmbedding}`,
    );
    console.log(`  Chunks without embedding: ${chunksWithoutEmbedding}`);

    if (chunksWithoutEmbedding === totalChunks) {
      console.log("\n❌ NO EMBEDDINGS IN DATABASE!");
      console.log("   Documents need to be re-indexed to generate embeddings.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmbeddings();
