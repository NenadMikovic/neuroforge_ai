/**
 * SQL Query Tool - Read-only database queries
 */

import { prisma } from "@/lib/db/service";
import type { ToolCall, ToolResult, ToolContext } from "./types";

export class SQLQueryTool {
  async execute(toolCall: ToolCall, context: ToolContext): Promise<ToolResult> {
    const startTime = performance.now();

    try {
      const params = toolCall.params as {
        query: string;
        limit?: number;
      };

      const { query, limit = 1000 } = params;

      // Additional safety checks
      if (!query || typeof query !== "string") {
        throw new Error("Query must be a non-empty string");
      }

      // Ensure query is read-only
      const upperQuery = query.toUpperCase().trim();
      if (!upperQuery.startsWith("SELECT") && !upperQuery.startsWith("WITH")) {
        throw new Error(
          "Only SELECT statements are allowed. Query must start with SELECT or WITH.",
        );
      }

      // Prevent multiple statements
      if (query.includes(";") && query.lastIndexOf(";") !== query.length - 1) {
        throw new Error("Multiple statements are not allowed");
      }

      // Execute the query
      // Note: Using raw SQL through Prisma's $queryRawUnsafe
      // In production, consider using a parameterized approach
      const result = await this.executeQuery(query, limit);

      const executionTime = performance.now() - startTime;

      return {
        toolCallId: toolCall.id,
        tool: "sql_query",
        success: true,
        result,
        executionTime,
        metadata: {
          rowCount: Array.isArray(result) ? result.length : 1,
          outputLength: JSON.stringify(result).length,
        },
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        toolCallId: toolCall.id,
        tool: "sql_query",
        success: false,
        error: `SQL Error: ${errorMessage}`,
        executionTime,
      };
    }
  }

  private async executeQuery(query: string, limit: number): Promise<unknown> {
    // This is a simplified implementation
    // In production, you might want to parse and validate the query more thoroughly
    try {
      // Remove limit if already present, add our safety limit
      let finalQuery = query;
      if (query.toUpperCase().includes("LIMIT")) {
        // Extract existing limit and use the minimum
        const limitMatch = query.match(/LIMIT\s+(\d+)/i);
        const existingLimit = limitMatch ? parseInt(limitMatch[1], 10) : limit;
        finalQuery = query.replace(
          /LIMIT\s+\d+/i,
          `LIMIT ${Math.min(existingLimit, limit)}`,
        );
      } else {
        finalQuery = `${query.trimEnd().replace(/;$/, "")} LIMIT ${limit}`;
      }

      // Execute query using Prisma
      const result = await (prisma as any).$queryRawUnsafe(finalQuery);

      // Convert BigInt to regular numbers for JSON serialization
      return this.convertBigIntsToNumbers(result);
    } catch (error) {
      // Log but don't expose detailed database errors to user
      console.error("[SQLQueryTool] Query execution error:", error);
      throw new Error("Database query failed. Please check your query syntax.");
    }
  }

  /**
   * Convert BigInt values to regular numbers for JSON serialization
   * SQLite returns COUNT() as BigInt which can't be serialized
   */
  private convertBigIntsToNumbers(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "bigint") {
      return Number(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertBigIntsToNumbers(item));
    }

    if (typeof obj === "object") {
      const converted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        converted[key] = this.convertBigIntsToNumbers(value);
      }
      return converted;
    }

    return obj;
  }
}
