/**
 * Main RAG (Retrieval-Augmented Generation) Service
 * Orchestrates document processing, embedding, and retrieval
 */

import DocumentSplitter from "./textSplitter";
import DocumentProcessor from "./documentProcessor";
import { generateEmbeddingsBatch, vectorToBuffer } from "./embeddings";
import VectorRetriever, { type RetrievalResult } from "./vectorRetriever";
import { prisma } from "@/lib/db/service";

export interface DocumentInfo {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  chunkCount: number;
  metadata: Record<string, any>;
}

export interface RAGResponse {
  answer: string;
  sources: Array<{
    documentId: string;
    documentName: string;
    chunkId: string;
    chunkIndex: number;
    similarity: number;
    excerpt: string;
  }>;
}

export class RAGService {
  private splitter: DocumentSplitter;
  private retriever: VectorRetriever;

  constructor(
    chunkSize: number = 1000,
    chunkOverlap: number = 100,
    retrievalTopK: number = 5,
  ) {
    this.splitter = new DocumentSplitter(chunkSize, chunkOverlap);
    this.retriever = new VectorRetriever(retrievalTopK, 0.15);
  }

  /**
   * Process and index a new document
   */
  async indexDocument(
    filePath: string,
    fileName: string,
    userId: string,
  ): Promise<DocumentInfo> {
    try {
      console.log(`[RAG] Processing document: ${fileName}`);

      // Validate file
      const fileType = DocumentProcessor.validateFileType(fileName);
      if (!fileType) {
        throw new Error(`Unsupported file type. Supported: PDF, DOCX, TXT`);
      }

      // Extract text
      console.log("[RAG] Extracting text...");
      const text = await DocumentProcessor.extractText(filePath, fileType);

      if (!text || text.trim().length === 0) {
        throw new Error("No text could be extracted from the document");
      }

      // Split into chunks
      console.log("[RAG] Splitting text into chunks...");
      const chunks = this.splitter.split(text);

      if (chunks.length === 0) {
        throw new Error("No chunks generated from document");
      }

      console.log(`[RAG] Generated ${chunks.length} chunks`);

      // Generate embeddings
      console.log("[RAG] Generating embeddings...");
      const embeddings = await generateEmbeddingsBatch(
        chunks,
        (current, total) => {
          console.log(`[RAG] Embedding progress: ${current}/${total}`);
        },
      );

      // Store in database
      console.log("[RAG] Storing in database...");
      const metadata = DocumentProcessor.extractMetadata(
        fileName,
        filePath,
        fileType,
      );

      const document = await (prisma as any).document.create({
        data: {
          userId,
          name: fileName,
          type: fileType,
          originalPath: filePath,
          metadata: JSON.stringify(metadata),
          chunks: {
            create: chunks.map((chunk, index) => ({
              chunkIndex: index,
              content: chunk,
              embedding: vectorToBuffer(embeddings[index]) as any,
            })),
          },
        },
        include: {
          chunks: true,
        },
      });

      console.log(`[RAG] Successfully indexed document: ${document.id}`);

      return {
        id: document.id,
        name: document.name,
        type: document.type,
        uploadedAt: document.createdAt.toISOString(),
        chunkCount: document.chunks.length,
        metadata,
      };
    } catch (error) {
      console.error("[RAG] Error indexing document:", error);
      throw error;
    }
  }

  /**
   * Retrieve relevant chunks for a query
   */
  async retrieveContext(
    queryEmbedding: number[],
    userId: string,
    topK: number = 5,
  ): Promise<RetrievalResult[]> {
    try {
      console.log("[RAG] Retrieving context for query...");

      const results = await this.retriever.retrieve({
        embedding: queryEmbedding,
        topK,
        threshold: 0.05,
        userId,
      });

      console.log(`[RAG] Retrieved ${results.length} relevant chunks`);

      return results;
    } catch (error) {
      console.error("[RAG] Error retrieving context:", error);
      throw error;
    }
  }

  /**
   * Format context for prompt injection
   */
  formatContext(results: RetrievalResult[]): string {
    if (results.length === 0) {
      return "";
    }

    let context = "## Related Document Excerpts:\n\n";

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      context += `[Source ${i + 1} - ${result.documentName}]\n`;
      context += `Similarity: ${(result.similarity * 100).toFixed(1)}%\n`;
      context += `${result.content.substring(0, 500)}\n`;
      context += "\n---\n\n";
    }

    return context;
  }

  /**
   * Delete a document and its vectors
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      console.log(`[RAG] Deleting document: ${documentId}`);

      // Delete vectors
      await this.retriever.deleteDocumentVectors(documentId);

      // Delete document and its chunks from database (cascading)
      await (prisma as any).document.delete({
        where: { id: documentId },
      });

      console.log(`[RAG] Successfully deleted document: ${documentId}`);
    } catch (error) {
      console.error("[RAG] Error deleting document:", error);
      throw error;
    }
  }

  /**
   * Reindex a document with new embeddings
   */
  async reindexDocument(
    documentId: string,
    filePath: string,
  ): Promise<DocumentInfo> {
    try {
      console.log(`[RAG] Reindexing document: ${documentId}`);

      // Get document info
      const document = await (prisma as any).document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error("Document not found");
      }

      // Extract text
      const fileType = document.type as "pdf" | "docx" | "txt";
      const text = await DocumentProcessor.extractText(filePath, fileType);

      // Split into chunks
      const chunks = this.splitter.split(text);

      // Generate embeddings
      const embeddings = await generateEmbeddingsBatch(chunks);

      // Reindex in retriever
      await this.retriever.reindexDocument(documentId, chunks, embeddings);

      // Update document
      const updatedDoc = await (prisma as any).document.update({
        where: { id: documentId },
        data: { updatedAt: new Date() },
        include: { chunks: true },
      });

      return {
        id: updatedDoc.id,
        name: updatedDoc.name,
        type: updatedDoc.type,
        uploadedAt: updatedDoc.createdAt.toISOString(),
        chunkCount: updatedDoc.chunks.length,
        metadata: JSON.parse(updatedDoc.metadata),
      };
    } catch (error) {
      console.error("[RAG] Error reindexing document:", error);
      throw error;
    }
  }

  /**
   * Get all documents for a user
   */
  async getUserDocuments(userId: string): Promise<DocumentInfo[]> {
    try {
      const documents = await (prisma as any).document.findMany({
        where: { userId },
        include: { chunks: true },
        orderBy: { createdAt: "desc" },
      });

      return documents.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        uploadedAt: doc.createdAt.toISOString(),
        chunkCount: doc.chunks.length,
        metadata: JSON.parse(doc.metadata),
      }));
    } catch (error) {
      console.error("[RAG] Error fetching user documents:", error);
      throw error;
    }
  }

  /**
   * Get statistics for a document
   */
  async getDocumentStats(documentId: string) {
    try {
      return await this.retriever.getDocumentStats(documentId);
    } catch (error) {
      console.error("[RAG] Error getting document stats:", error);
      throw error;
    }
  }

  /**
   * Create RAG prompt with context
   */
  createRAGPrompt(userQuery: string, context: string): string {
    return `${context}

Based on the document excerpts above, answer the following question:

Question: ${userQuery}

If the documents don't contain relevant information, say so explicitly.`;
  }
}

export default RAGService;
