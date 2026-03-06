/**
 * Research Agent
 * Uses RAG system to retrieve relevant information from documents
 */

import { BaseAgent } from "./baseAgent";
import { prisma } from "@/lib/db/service";
import type { AgentPayload, AgentResponse, ResearchOutput } from "./types";
import { RAGService } from "@/lib/rag/ragService";
import { generateEmbedding } from "@/lib/rag/embeddings";
import VectorRetriever from "@/lib/rag/vectorRetriever";

export class ResearchAgent extends BaseAgent {
  private ragService: RAGService | null;
  private retriever: VectorRetriever | null;

  constructor() {
    super("research", "ResearchAgent-v1");

    try {
      this.ragService = new RAGService(1000, 100, 5);
      console.log("[ResearchAgent] RAG service initialized");
    } catch (error) {
      console.error("[ResearchAgent] Failed to initialize RAG service:", error);
      this.ragService = null;
    }

    try {
      this.retriever = new VectorRetriever(5, 0.15);
      console.log("[ResearchAgent] Vector retriever initialized");
    } catch (error) {
      console.error(
        "[ResearchAgent] Failed to initialize vector retriever:",
        error,
      );
      this.retriever = null;
    }
  }

  async execute(payload: AgentPayload): Promise<AgentResponse> {
    const validation = this.validatePayload(payload);
    if (!validation.valid) {
      return this.createErrorResponse(new Error(validation.error));
    }

    // Check if RAG service is available
    if (!this.ragService || !this.retriever) {
      console.warn(
        "[ResearchAgent] RAG service unavailable, returning fallback response",
      );
      const response: AgentResponse = {
        agentType: "research",
        status: "success",
        output:
          "Research service temporarily unavailable. Using general knowledge.",
        data: {
          sources: [],
          sourceCount: 0,
        },
        reasoning: "RAG service not initialized",
        executionTime: 0,
      };
      await this.logExecution(payload.conversationId, payload.input, response);
      return response;
    }

    try {
      const [output, executionTime] = await this.measureTimeAsync(async () => {
        const retrievalThreshold = this.getRetrievalThreshold(payload.input);

        // Generate embedding for the query
        console.log(
          `[ResearchAgent] Generating embedding for query: "${payload.input}"`,
        );
        const embedding = await generateEmbedding(payload.input);
        console.log(
          `[ResearchAgent] Embedding generated, dimensions: ${embedding.length}`,
        );

        // Retrieve relevant documents
        console.log(
          `[ResearchAgent] Retrieving documents for userId: ${payload.userId}, topK: 5, threshold: ${retrievalThreshold}`,
        );
        const documents = await this.retriever!.retrieve({
          embedding,
          topK: 5,
          threshold: retrievalThreshold,
          userId: payload.userId,
        } as any);
        console.log(`[ResearchAgent] Retrieved ${documents.length} documents`);

        // Process and summarize findings
        const summary = this.generateSummary(payload.input, documents);
        console.log(
          `[ResearchAgent] Generated summary, length: ${summary.length}`,
        );

        const researchOutput: ResearchOutput = {
          sources: documents.map((doc) => ({
            documentId: doc.documentId,
            documentName: doc.documentName,
            chunkId: doc.chunkId,
            similarity: doc.similarity,
            excerpt: this.truncateExcerpt(doc.content, 200),
          })),
          summary,
        };

        return researchOutput;
      });

      const response: AgentResponse = {
        agentType: "research",
        status: "success",
        output: output.summary,
        data: {
          sources: output.sources,
          sourceCount: output.sources.length,
        },
        reasoning: `Retrieved ${output.sources.length} relevant source(s) for query analysis`,
        executionTime,
      };

      await this.logExecution(payload.conversationId, payload.input, response);
      return response;
    } catch (error) {
      console.error("[ResearchAgent] Error during execution:", error);
      // Return success response with error message instead of error status
      // This ensures the orchestrator can still use the response
      const response: AgentResponse = {
        agentType: "research",
        status: "success",
        output: `Unable to process research: ${error instanceof Error ? error.message : "Unknown error"}. General knowledge will be used.`,
        data: {
          sources: [],
          sourceCount: 0,
        },
        reasoning: "Error occurred during research execution",
        executionTime: 0,
      };

      await this.logExecution(payload.conversationId, payload.input, response);
      return response;
    }
  }

  /**
   * Use lower thresholds for document-grounded summarization/citation queries,
   * because semantic similarity can be lower for broad prompts.
   */
  private getRetrievalThreshold(query: string): number {
    const q = query.toLowerCase();
    const needsDocumentSummary =
      /(summari[sz]e|summary|bullet points?)/.test(q) &&
      /(uploaded|document|pdf|source|cite|citation)/.test(q);

    if (needsDocumentSummary) {
      return 0.12;
    }

    return 0.3;
  }

  /**
   * Generate summary from retrieved documents
   */
  private generateSummary(
    query: string,
    documents: Array<{
      documentId: string;
      documentName: string;
      chunkId: string;
      similarity: number;
      content: string;
      chunkIndex?: number;
    }>,
  ): string {
    if (documents.length === 0) {
      return `No relevant sources found for: "${query}". Using general knowledge to respond.`;
    }

    const topSources = documents.slice(0, 3);
    const sourceList = topSources
      .map(
        (doc, i) =>
          `${i + 1}. ${doc.documentName} (Relevance: ${Math.round(doc.similarity * 100)}%)`,
      )
      .join("\n");

    const excerpts = topSources
      .map((doc) => this.truncateExcerpt(doc.content, 200))
      .join("\n\n");

    return `Based on ${documents.length} retrieved source(s):\n\nTop Sources:\n${sourceList}\n\nKey Excerpts:\n${excerpts}\n\nThese sources contain relevant information for your query.`;
  }

  /**
   * Truncate excerpt to a reasonable length
   */
  private truncateExcerpt(excerpt: string, maxLength: number): string {
    if (excerpt.length <= maxLength) {
      return excerpt;
    }
    return excerpt.substring(0, maxLength) + "...";
  }

  /**
   * Extract key terms from query
   */
  private extractKeyTerms(query: string): string[] {
    // Remove common stop words
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
    ]);

    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => !stopWords.has(term) && term.length > 2);

    return [...new Set(terms)];
  }

  /**
   * Rank sources by relevance
   */
  private rankSources(
    documents: Array<{
      documentId: string;
      documentName: string;
      chunkId: string;
      similarity: number;
      excerpt: string;
    }>,
    query: string,
  ): typeof documents {
    const queryTerms = new Set(this.extractKeyTerms(query));

    return documents.sort((a, b) => {
      // Primary sort: similarity score
      if (Math.abs(a.similarity - b.similarity) > 0.05) {
        return b.similarity - a.similarity;
      }

      // Secondary sort: term overlap in excerpt
      const aTerms = this.extractKeyTerms(a.excerpt).filter((t) =>
        queryTerms.has(t),
      ).length;
      const bTerms = this.extractKeyTerms(b.excerpt).filter((t) =>
        queryTerms.has(t),
      ).length;

      return bTerms - aTerms;
    });
  }
}
