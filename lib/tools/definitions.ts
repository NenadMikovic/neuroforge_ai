/**
 * Tool Definitions - Describes available tools and their parameters
 */

import type { ToolDefinition, ToolName } from "./types";

export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: "sql_query" as ToolName,
      description:
        "Execute read-only SQL queries against the database. Only SELECT statements are allowed.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "SQL SELECT query. Must not contain DROP, DELETE, INSERT, UPDATE, or other destructive operations.",
            minLength: 1,
            maxLength: 10000,
          },
          limit: {
            type: "number",
            description:
              "Maximum number of rows to return (default: 1000, max: 10000)",
            minimum: 1,
            maximum: 10000,
          },
        },
        required: ["query"],
      },
      restrictions: {
        maxDuration: 30000, // 30 seconds
        maxOutputSize: 1024 * 1024, // 1MB
        forbiddenPatterns: [
          /\b(DROP|DELETE|TRUNCATE|INSERT|UPDATE|CREATE|ALTER|PRAGMA)\b/i,
        ],
      },
    },

    {
      name: "python_exec" as ToolName,
      description:
        "Execute sandboxed Python code with restricted imports. No file I/O or network access.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description:
              "Python code to execute. Cannot import os, subprocess, sys, socket, urllib, or requests.",
            minLength: 1,
            maxLength: 50000,
          },
          timeout: {
            type: "number",
            description: "Execution timeout in seconds (default: 10, max: 60)",
            minimum: 1,
            maximum: 60,
          },
          context: {
            type: "object",
            description:
              "Variables to make available in the Python environment",
            properties: {
              data: {
                type: "object",
                description: "Data object to analyze",
              },
            },
          },
        },
        required: ["code"],
      },
      restrictions: {
        maxDuration: 60000, // 60 seconds
        maxOutputSize: 5 * 1024 * 1024, // 5MB
        forbiddenPatterns: [
          /\b(import|from)\s+(os|subprocess|sys|socket|urllib|requests)\b/i,
          /\b(__import__|exec|eval|compile|open)\s*\(/i,
        ],
      },
    },

    {
      name: "file_search" as ToolName,
      description:
        "Search for files matching a pattern within permitted directories. Cannot traverse outside allowed paths.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description:
              "File search pattern (glob pattern). Limited to /uploads, /documents, or /data directories.",
            minLength: 1,
            maxLength: 500,
          },
          depth: {
            type: "number",
            description:
              "Maximum directory recursion depth (default: 5, max: 10)",
            minimum: 1,
            maximum: 10,
          },
          includeHidden: {
            type: "boolean",
            description: "Include hidden files (default: false)",
          },
          limit: {
            type: "number",
            description:
              "Maximum number of results to return (default: 100, max: 1000)",
            minimum: 1,
            maximum: 1000,
          },
        },
        required: ["pattern"],
      },
      restrictions: {
        maxDuration: 15000, // 15 seconds
        maxOutputSize: 500 * 1024, // 500KB
        forbiddenPatterns: [/\.\./, /^\//, /^~/],
      },
    },

    {
      name: "system_metrics" as ToolName,
      description:
        "Retrieve current system metrics including CPU, memory, and disk usage. No sensitive data is returned.",
      parameters: {
        type: "object",
        properties: {
          metrics: {
            type: "array",
            description:
              "Array of metrics to retrieve (default: all available)",
            items: {
              type: "string",
              enum: ["cpu", "memory", "disk", "network", "processes", "uptime"],
              description: "Metric type to retrieve",
            },
          },
          detailed: {
            type: "boolean",
            description: "Return detailed breakdown (default: false)",
          },
        },
        required: [],
      },
      restrictions: {
        maxDuration: 5000, // 5 seconds
        maxOutputSize: 100 * 1024, // 100KB
      },
    },
  ];
}

/**
 * Get a specific tool definition by name
 */
export function getToolDefinition(toolName: ToolName): ToolDefinition | null {
  return getToolDefinitions().find((d) => d.name === toolName) || null;
}

/**
 * Get all tool definitions as JSON for LLM context
 */
export function getToolDefinitionsForLLM() {
  const definitions = getToolDefinitions();

  return {
    type: "object",
    description:
      "Available tools for executing actions. When you need to execute a tool, respond with a JSON block containing your tool call.",
    tools: definitions.map((def) => ({
      name: def.name,
      description: def.description,
      parameters: def.parameters,
    })),
    responseFormat: {
      description: "Tool calls must be in this format",
      example: {
        type: "tool_call",
        tool: "sql_query",
        id: "tool_call_1",
        params: {
          query: "SELECT * FROM users LIMIT 10",
        },
      },
      template: `
For each tool call, respond with:

\`\`\`json
{
  "type": "tool_call",
  "tool": "tool_name",
  "id": "unique_id",
  "params": {
    "param_name": "param_value"
  }
}
\`\`\`

You can make multiple tool calls in sequence:

\`\`\`json
[
  {
    "type": "tool_call",
    "tool": "tool_name1",
    "id": "call_1",
    "params": { }
  },
  {
    "type": "tool_call",
    "tool": "tool_name2",
    "id": "call_2",
    "params": { }
  }
]
\`\`\`
      `,
    },
  };
}
