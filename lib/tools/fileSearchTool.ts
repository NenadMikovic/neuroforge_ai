/**
 * File Search Tool - Search for files in permitted directories
 */

import { promises as fs } from "fs";
import { join, resolve, relative } from "path";
// @ts-ignore - minimatch is a dependency but lacks type definitions
import { minimatch } from "minimatch";
import type { ToolCall, ToolResult, ToolContext } from "./types";

const ALLOWED_DIRS = [
  join(process.cwd(), "public", "uploads"),
  join(process.cwd(), "data"),
];

export class FileSearchTool {
  async execute(toolCall: ToolCall, context: ToolContext): Promise<ToolResult> {
    const startTime = performance.now();

    try {
      const params = toolCall.params as {
        pattern: string;
        depth?: number;
        includeHidden?: boolean;
        limit?: number;
      };

      const { pattern, depth = 5, includeHidden = false, limit = 100 } = params;

      if (!pattern || typeof pattern !== "string") {
        throw new Error("Pattern must be a non-empty string");
      }

      // Validate depth
      if (depth < 1 || depth > 10) {
        throw new Error("Depth must be between 1 and 10");
      }

      // Validate limit
      if (limit < 1 || limit > 1000) {
        throw new Error("Limit must be between 1 and 1000");
      }

      // Search for files
      const results = await this.searchFiles(
        pattern,
        depth,
        includeHidden,
        limit,
      );

      const executionTime = performance.now() - startTime;

      return {
        toolCallId: toolCall.id,
        tool: "file_search",
        success: true,
        result: results,
        executionTime,
        metadata: {
          resultCount: results.length,
          outputLength: JSON.stringify(results).length,
        },
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        toolCallId: toolCall.id,
        tool: "file_search",
        success: false,
        error: `File Search Error: ${errorMessage}`,
        executionTime,
      };
    }
  }

  private async searchFiles(
    pattern: string,
    maxDepth: number,
    includeHidden: boolean,
    limit: number,
  ): Promise<
    Array<{
      path: string;
      name: string;
      size: number;
      modified: string;
    }>
  > {
    const results: any[] = [];

    // Validate pattern - ensure it doesn't contain path traversal
    if (pattern.includes("..") || pattern.startsWith("/")) {
      throw new Error("Invalid pattern: path traversal not allowed");
    }

    // Search in allowed directories
    for (const baseDir of ALLOWED_DIRS) {
      if (results.length >= limit) break;

      try {
        const matches = await this.searchDirectory(
          baseDir,
          pattern,
          maxDepth,
          includeHidden,
          limit - results.length,
        );
        results.push(...matches);
      } catch (error) {
        // Log but continue searching other directories
        console.error(`[FileSearchTool] Error searching ${baseDir}:`, error);
      }
    }

    return results;
  }

  private async searchDirectory(
    dir: string,
    pattern: string,
    maxDepth: number,
    includeHidden: boolean,
    limit: number,
    currentDepth: number = 0,
  ): Promise<
    Array<{
      path: string;
      name: string;
      size: number;
      modified: string;
    }>
  > {
    if (currentDepth >= maxDepth || limit <= 0) {
      return [];
    }

    const results: any[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= limit) break;

        // Skip hidden files if not requested
        if (!includeHidden && entry.name.startsWith(".")) {
          continue;
        }

        const fullPath = join(dir, entry.name);

        // Additional security check - ensure we're still within allowed dirs
        if (!this.isWithinAllowedDir(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subResults = await this.searchDirectory(
            fullPath,
            pattern,
            maxDepth,
            includeHidden,
            limit - results.length,
            currentDepth + 1,
          );
          results.push(...subResults);
        } else if (entry.isFile()) {
          // Check if filename matches pattern
          if (minimatch(entry.name, pattern)) {
            try {
              const stats = await fs.stat(fullPath);
              results.push({
                path: fullPath,
                name: entry.name,
                size: stats.size,
                modified: new Date(stats.mtime).toISOString(),
              });
            } catch {
              // Skip files we can't stat
            }
          }
        }
      }
    } catch (error) {
      // Log but don't fail completely
      console.error(`[FileSearchTool] Error reading directory:`, error);
    }

    return results;
  }

  private isWithinAllowedDir(filePath: string): boolean {
    const resolved = resolve(filePath);
    return ALLOWED_DIRS.some((allowedDir) => {
      const resolvedAllowed = resolve(allowedDir);
      return resolved.startsWith(resolvedAllowed);
    });
  }
}
