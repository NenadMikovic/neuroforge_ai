/**
 * Tool Call Validation
 */

import { getToolDefinitions } from "./definitions";
import type { ToolCall } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a tool call against its definition
 */
export function validateToolCall(toolCall: ToolCall): ValidationResult {
  const errors: string[] = [];

  // Check basic structure
  if (!toolCall.tool) {
    errors.push("Missing tool name");
  }
  if (!toolCall.id) {
    errors.push("Missing tool call ID");
  }
  if (!toolCall.params || typeof toolCall.params !== "object") {
    errors.push("Invalid params: must be an object");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Get tool definition
  const definition = getToolDefinitions().find(
    (d: any) => d.name === toolCall.tool,
  );

  if (!definition) {
    return {
      valid: false,
      errors: [`Unknown tool: ${toolCall.tool}`],
    };
  }

  // Basic parameter validation - check required parameters
  const params = toolCall.params as Record<string, any>;

  for (const required of definition.parameters.required || []) {
    if (!(required in params)) {
      errors.push(`Missing required parameter: ${required}`);
    }
  }

  // Additional custom validation
  const customErrors = validateToolSpecific(toolCall);
  if (customErrors.length > 0) {
    return {
      valid: false,
      errors: customErrors,
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Tool-specific validation
 */
function validateToolSpecific(toolCall: ToolCall): string[] {
  const errors: string[] = [];
  const params = toolCall.params as Record<string, any>;

  switch (toolCall.tool) {
    case "sql_query": {
      const query = params.query as string;

      // Check for destructive operations
      const forbiddenKeywords = [
        "DROP",
        "DELETE",
        "TRUNCATE",
        "INSERT",
        "UPDATE",
        "CREATE",
        "ALTER",
        "PRAGMA",
      ];

      const upperQuery = query.toUpperCase();
      for (const keyword of forbiddenKeywords) {
        if (upperQuery.includes(keyword)) {
          errors.push(
            `SQL Error: ${keyword} statements are not allowed (read-only)`,
          );
        }
      }

      // Check for SQL injection patterns
      if (/['"];?[\s]*[-+*/=%]|exec|execute|script|javascript/i.test(query)) {
        errors.push("SQL Error: Potential SQL injection detected");
      }

      break;
    }

    case "python_exec": {
      const code = params.code as string;

      // Check for dangerous imports
      const dangerousImports = [
        "os",
        "subprocess",
        "sys",
        "socket",
        "urllib",
        "requests",
      ];

      for (const imp of dangerousImports) {
        if (
          new RegExp(`\\bimport\\s+${imp}\\b|\\bfrom\\s+${imp}\\b`, "i").test(
            code,
          )
        ) {
          errors.push(
            `Python Error: Import of '${imp}' is restricted for security`,
          );
        }
      }

      // Check for suspicious functions
      const dangerousFunctions = [
        "__import__",
        "exec",
        "eval",
        "compile",
        "open",
      ];

      for (const func of dangerousFunctions) {
        if (new RegExp(`\\b${func}\\s*\\(`, "i").test(code)) {
          errors.push(
            `Python Error: Function '${func}' is not allowed in sandboxed execution`,
          );
        }
      }

      break;
    }

    case "file_search": {
      const pattern = params.pattern as string;

      // Check for path traversal
      if (
        pattern.includes("..") ||
        pattern.includes("~") ||
        pattern.startsWith("/")
      ) {
        errors.push("File Error: Path traversal is not allowed");
      }

      // Only allow searching within permitted directories
      const allowedDirs = ["/uploads", "/documents", "/data"];
      const isAllowed = allowedDirs.some((dir) => pattern.includes(dir));

      if (!isAllowed && !pattern.startsWith("./")) {
        errors.push("File Error: Search must be within permitted directories");
      }

      break;
    }

    case "system_metrics": {
      // No dangerous operations here, but could add auth checks
      break;
    }
  }

  return errors;
}

/**
 * Validate tool output
 */
export function validateToolOutput(tool: string, output: unknown): string[] {
  const errors: string[] = [];

  // Check output size
  const outputSize = JSON.stringify(output).length;
  if (outputSize > 1024 * 1024) {
    // 1MB limit
    errors.push("Output exceeds maximum size limit (1MB)");
  }

  // Tool-specific validation
  switch (tool) {
    case "sql_query": {
      if (!Array.isArray(output) && typeof output !== "object") {
        errors.push("SQL output must be an array or object");
      }
      break;
    }
    case "python_exec": {
      // Output validation for Python
      break;
    }
  }

  return errors;
}

/**
 * Extract tool calls from LLM response
 */
export function extractToolCalls(response: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  // Look for JSON tool calls in the response
  const jsonPattern = /```json\s*([\s\S]*?)\s*```/g;
  let match;

  while ((match = jsonPattern.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);

      // Check if it's a tool call
      if (
        parsed.type === "tool_call" &&
        parsed.tool &&
        parsed.id &&
        parsed.params
      ) {
        toolCalls.push(parsed);
      }

      // Check if it's an array of tool calls
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (
            item.type === "tool_call" &&
            item.tool &&
            item.id &&
            item.params
          ) {
            toolCalls.push(item);
          }
        }
      }
    } catch {
      // Continue on JSON parse error
    }
  }

  return toolCalls;
}
