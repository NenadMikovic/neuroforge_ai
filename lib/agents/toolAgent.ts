/**
 * Tool Agent
 * Executes structured operations and tools
 */

import { BaseAgent } from "./baseAgent";
import { prisma } from "@/lib/db/service";
import { VectorRetriever } from "@/lib/rag/vectorRetriever";
import type { AgentPayload, AgentResponse, ToolOutput } from "./types";

interface Tool {
  name: string;
  description: string;
  keywords: string[];
  execute: (input: string, context?: Record<string, any>) => Promise<any>;
}

export class ToolAgent extends BaseAgent {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    super("tool", "ToolAgent-v1");
    this.registerTools();
  }

  async execute(payload: AgentPayload): Promise<AgentResponse> {
    const validation = this.validatePayload(payload);
    if (!validation.valid) {
      return this.createErrorResponse(new Error(validation.error));
    }

    try {
      const [output, executionTime] = await this.measureTimeAsync(async () => {
        // Identify which tool to use
        const toolName = this.identifyTool(payload.input);

        if (!toolName) {
          return {
            result:
              "No applicable tool found for this request. Try a different approach.",
            toolName: "none",
            success: false,
          };
        }

        const tool = this.tools.get(toolName);
        if (!tool) {
          return {
            result: `Tool "${toolName}" not found`,
            toolName,
            success: false,
          };
        }

        // Execute the tool
        const result = await tool.execute(payload.input, payload.context);

        return {
          result: typeof result === "string" ? result : JSON.stringify(result),
          toolName,
          toolArgs: this.extractToolArgs(payload.input),
          success: true,
        };
      });

      const response: AgentResponse = {
        agentType: "tool",
        status: "success",
        output: output.result,
        data: {
          toolName: output.toolName,
          toolArgs: output.toolArgs,
          success: output.success,
        },
        reasoning: `Executed tool: ${output.toolName}`,
        executionTime,
      };

      await this.logExecution(payload.conversationId, payload.input, response);
      return response;
    } catch (error) {
      console.error("[ToolAgent] Error:", error);
      const errorResponse = this.createErrorResponse(error);
      await this.logExecution(
        payload.conversationId,
        payload.input,
        errorResponse,
      );
      return errorResponse;
    }
  }

  /**
   * Register available tools
   */
  private registerTools(): void {
    // Text Analysis Tool
    this.tools.set("text-analysis", {
      name: "text-analysis",
      description:
        "Analyze text for patterns, word frequency, sentiment, and structure",
      keywords: [
        "analyze",
        "text",
        "language",
        "sentiment",
        "structure",
        "pattern",
      ],
      execute: async (input: string) => {
        return this.analyzeText(input);
      },
    });

    // Summarization Tool
    this.tools.set("summarize", {
      name: "summarize",
      description: "Create a concise summary of provided text",
      keywords: ["summarize", "summary", "condense", "brief", "overview"],
      execute: async (input: string) => {
        return this.summarizeText(input);
      },
    });

    // Data Processing Tool
    this.tools.set("data-process", {
      name: "data-process",
      description: "Process and extract structured data from text",
      keywords: ["extract", "data", "structure", "parse", "identify"],
      execute: async (input: string) => {
        return this.processData(input);
      },
    });

    // Comparison Tool
    this.tools.set("compare", {
      name: "compare",
      description: "Compare two or more items/concepts",
      keywords: ["compare", "difference", "similarity", "versus", "vs"],
      execute: async (input: string) => {
        return this.compareItems(input);
      },
    });

    // Listing Tool
    this.tools.set("list", {
      name: "list",
      description: "Create organized lists from content",
      keywords: ["list", "enumerate", "items", "points", "create list"],
      execute: async (input: string) => {
        return this.createList(input);
      },
    });

    // Document Retrieval Tool - Search uploaded documents
    this.tools.set("search-documents", {
      name: "search-documents",
      description: "Search and retrieve information from uploaded documents",
      keywords: [
        "search",
        "document",
        "find",
        "retrieve",
        "pdf",
        "author",
        "information",
        "knowledge",
        "uploaded",
      ],
      execute: async (input: string, context?: Record<string, any>) => {
        return this.searchDocuments(input, context);
      },
    });
  }

  /**
   * Identify which tool is most appropriate for the input
   */
  private identifyTool(input: string): string | null {
    const lowerInput = input.toLowerCase();
    let bestMatch: { tool: string; score: number } | null = null;

    for (const [toolName, tool] of this.tools.entries()) {
      let score = 0;

      // Score based on keyword matches
      for (const keyword of tool.keywords) {
        if (lowerInput.includes(keyword)) {
          score += 2;
        }
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { tool: toolName, score };
      }
    }

    return bestMatch ? bestMatch.tool : null;
  }

  /**
   * Extract tool arguments from input
   */
  private extractToolArgs(input: string): Record<string, any> {
    // Very basic argument extraction - can be enhanced as needed
    const args: Record<string, any> = {
      inputLength: input.length,
      wordCount: input.split(/\s+/).length,
    };

    // Look for quoted sections
    const quoted = input.match(/"([^"]*)"/g);
    if (quoted) {
      args.quotedSections = quoted.map((q) => q.slice(1, -1));
    }

    return args;
  }

  /**
   * Analyze text for patterns and statistics
   */
  private async analyzeText(input: string): Promise<{
    wordCount: number;
    sentenceCount: number;
    averageWordLength: number;
    topWords: string[];
  }> {
    const words = input.split(/\s+/);
    const sentences = input.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    // Calculate top words (excluding common stop words)
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
    ]);
    const wordFreq = new Map<string, number>();

    for (const word of words) {
      const cleaned = word.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleaned.length > 2 && !stopWords.has(cleaned)) {
        wordFreq.set(cleaned, (wordFreq.get(cleaned) || 0) + 1);
      }
    }

    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    const avgWordLength =
      words.reduce((sum, word) => sum + word.length, 0) / words.length;

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      averageWordLength: Math.round(avgWordLength * 10) / 10,
      topWords,
    };
  }

  /**
   * Summarize text
   */
  private async summarizeText(input: string): Promise<string> {
    const sentences = input.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    if (sentences.length <= 3) {
      return input;
    }

    // Simple extractive summary: keep first and last 1/3 of sentences
    const summaryLength = Math.ceil(sentences.length / 3);
    const summary = [
      ...sentences.slice(0, Math.ceil(summaryLength / 2)),
      ...sentences.slice(-Math.floor(summaryLength / 2)),
    ]
      .map((s) => s.trim())
      .join(". ");

    return summary + ".";
  }

  /**
   * Process and extract structured data
   */
  private async processData(input: string): Promise<Record<string, any>> {
    const lines = input.split("\n").filter((l) => l.trim().length > 0);

    return {
      lineCount: lines.length,
      structure: this.detectStructure(input),
      isEmpty: input.trim().length === 0,
      contentLength: input.length,
    };
  }

  /**
   * Detect input structure
   */
  private detectStructure(input: string): string {
    if (input.includes("\n")) {
      if (input.includes(":") || input.includes("-")) {
        return "structured";
      }
      return "multi-line";
    } else if (input.includes(",")) {
      return "comma-separated";
    }
    return "unstructured";
  }

  /**
   * Compare items
   */
  private async compareItems(input: string): Promise<{
    item1: string;
    item2: string;
    differences: string[];
    similarities: string[];
  }> {
    const parts = input.split(/\s+(vs|versus|vs\.|-)\s+/i);
    const item1 = parts[0]?.trim() || "Item 1";
    const item2 = parts[2]?.trim() || "Item 2";

    return {
      item1,
      item2,
      differences: [`${item1} and ${item2} have different characteristics`],
      similarities: [`Both are subjects of comparison`],
    };
  }

  /**
   * Create organized lists
   */
  private async createList(input: string): Promise<{
    items: string[];
    count: number;
    listType: string;
  }> {
    const items = input
      .split(/[,\n;]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return {
      items,
      count: items.length,
      listType: items.length > 5 ? "long-list" : "short-list",
    };
  }

  /**
   * Search documents using RAG
   */
  private async searchDocuments(
    input: string,
    context?: Record<string, any>,
  ): Promise<{
    success: boolean;
    results: string;
    sourcesFound: boolean;
    chunkCount: number;
  }> {
    try {
      const userId = context?.userId;

      if (!userId) {
        return {
          success: false,
          results: "User context not available. Cannot search documents.",
          sourcesFound: false,
          chunkCount: 0,
        };
      }

      const vectorRetriever = new VectorRetriever();
      // Generate embedding first
      const { generateEmbedding } = await import("@/lib/rag/embeddings");
      const embedding = await generateEmbedding(input);
      const relevantChunks = await vectorRetriever.retrieve({
        embedding,
        topK: 5,
        threshold: 0.3,
        userId,
      });

      if (!relevantChunks || relevantChunks.length === 0) {
        return {
          success: true,
          results: "No relevant documents found for your query.",
          sourcesFound: false,
          chunkCount: 0,
        };
      }

      // Format results from retrieved chunks
      const formattedResults = relevantChunks
        .map(
          (chunk, index) =>
            `[Result ${index + 1}] (Document: ${chunk.documentName}, Similarity: ${(chunk.similarity * 100).toFixed(1)}%)\n${chunk.content}`,
        )
        .join("\n\n---\n\n");

      return {
        success: true,
        results: formattedResults,
        sourcesFound: true,
        chunkCount: relevantChunks.length,
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("[ToolAgent] Document search error:", errorMsg);

      return {
        success: false,
        results: `Error searching documents: ${errorMsg}`,
        sourcesFound: false,
        chunkCount: 0,
      };
    }
  }
}
