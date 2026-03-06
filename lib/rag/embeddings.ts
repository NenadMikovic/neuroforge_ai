/**
 * Embedding generation using Xenova transformers (lightweight, runs locally)
 */

import { env, pipeline } from "@xenova/transformers";

// Configure for offline usage and performance
(env as any).cacheDir = "../cache";
(env as any).allowRemoteModels = true;

let embeddingPipeline: any = null;

/**
 * Initialize embedding pipeline (lazy loading)
 */
async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    console.log("[Embeddings] Initializing embedding pipeline...");
    embeddingPipeline = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
    );
    console.log("[Embeddings] Pipeline ready");
  }
  return embeddingPipeline;
}

/**
 * Generate embedding for text
 * Returns a vector of 384 dimensions (all-MiniLM-L6-v2)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    console.log(
      "[Embeddings] Starting embedding generation for text length:",
      text.length,
    );
    const pipeline = await getEmbeddingPipeline();
    console.log("[Embeddings] Pipeline ready, generating embedding...");

    // Clean and normalize text
    const cleanedText = text.replace(/\s+/g, " ").trim();

    if (!cleanedText) {
      // Return zero vector for empty text
      console.log("[Embeddings] Empty text, returning zero vector");
      return new Array(384).fill(0);
    }

    // Generate embedding
    const result = await pipeline(cleanedText, {
      pooling: "mean",
      normalize: true,
    });

    // Convert to array
    const embedding = Array.from(result.data as any) as number[];
    console.log(
      "[Embeddings] Embedding generated successfully, dimensions:",
      embedding.length,
    );

    return embedding;
  } catch (error) {
    console.error("[Embeddings] Error generating embedding:", error);
    throw new Error(`Failed to generate embedding: ${error}`);
  }
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    results.push(embedding);
  }

  return results;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Batch generate embeddings with progress tracking
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<number[][]> {
  const results: number[][] = [];
  const batchSize = 32;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, Math.min(i + batchSize, texts.length));
    const batchEmbeddings = await Promise.all(
      batch.map((text) => generateEmbedding(text)),
    );
    results.push(...batchEmbeddings);

    if (onProgress) {
      onProgress(Math.min(i + batchSize, texts.length), texts.length);
    }
  }

  return results;
}

/**
 * Normalize a vector
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map((val) => val / magnitude);
}

/**
 * Convert vector to Buffer for storage
 */
export function vectorToBuffer(vector: number[]): Buffer {
  const floatArray = new Float32Array(vector);
  return Buffer.from(floatArray.buffer);
}

/**
 * Convert Buffer back to vector
 */
export function bufferToVector(buffer: Buffer): number[] {
  const floatArray = new Float32Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.length / 4,
  );
  return Array.from(floatArray);
}

export default {
  generateEmbedding,
  generateEmbeddings,
  generateEmbeddingsBatch,
  cosineSimilarity,
  normalizeVector,
  vectorToBuffer,
  bufferToVector,
};
