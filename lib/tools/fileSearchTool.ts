/**
 * File Search Tool - Search for files in permitted directories
 */

import { promises as fs } from "fs";
import { join, resolve, relative } from "path";
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

    // Extract directory and filename pattern from pattern like "./uploads/*.pdf"
    let searchDirs = ALLOWED_DIRS;
    let filePattern = pattern;

    // If pattern contains a directory prefix, extract it
    const dirMatch = pattern.match(/^\.?\/?(\w+)\/(.*)/);
    if (dirMatch) {
      const dirName = dirMatch[1];
      filePattern = dirMatch[2] || "*";

      // Find matching allowed directory
      searchDirs = ALLOWED_DIRS.filter(
        (dir) =>
          dir.endsWith(join(dirName)) || dir.includes(`${dirName}${join("")}`),
      );

      // If no matching directory found, search all
      if (searchDirs.length === 0) {
        searchDirs = ALLOWED_DIRS;
      }
    }

    // Search in appropriate directories
    for (const baseDir of searchDirs) {
      if (results.length >= limit) break;

      try {
        // Check if directory exists before trying to read it
        try {
          await fs.access(baseDir);
        } catch {
          // Directory doesn't exist, skip it
          continue;
        }

        const matches = await this.searchDirectory(
          baseDir,
          filePattern,
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
          if (this.matchesPattern(entry.name, pattern)) {
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

  /**
   * Simple glob pattern matching for file names
   * Supports: *.ext, *filename*, * (match all)
   */
  private matchesPattern(filename: string, pattern: string): boolean {
    // Exact match
    if (pattern === filename) return true;

    // Match all
    if (pattern === "*") return true;

    // Extension match (*.pdf, *.txt)
    if (pattern.startsWith("*.")) {
      const ext = pattern.substring(1);
      return filename.endsWith(ext);
    }

    // Wildcard in middle (*filename* or pattern*something)
    if (pattern.includes("*")) {
      const parts = pattern.split("*");
      let pos = 0;
      for (const part of parts) {
        if (part === "") continue;
        const index = filename.indexOf(part, pos);
        if (index === -1) return false;
        pos = index + part.length;
      }
      return true;
    }

    return false;
  }

  private isWithinAllowedDir(filePath: string): boolean {
    const resolved = resolve(filePath);
    return ALLOWED_DIRS.some((allowedDir) => {
      const resolvedAllowed = resolve(allowedDir);
      return resolved.startsWith(resolvedAllowed);
    });
  }
}
