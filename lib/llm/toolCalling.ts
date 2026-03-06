/**
 * LLM Tool Calling Integration
 * Enables structured tool execution through LLM responses
 */

import { getToolDefinitionsForLLM } from "@/lib/tools/definitions";
import { extractToolCalls } from "@/lib/tools/validators";
import { getChatCompletion, streamChatCompletion } from "./ollama";
import type { OllamaMessage } from "./ollama";
import type { ToolCall } from "@/lib/tools/types";
import { ToolExecutor } from "@/lib/tools/executor";

export interface LLMToolResponse {
  mainContent: string;
  toolCalls: ToolCall[];
  hasToolCalls: boolean;
  explicitToolResult?: string;
}

/**
 * Get system prompt with tool definitions
 */
export function getToolEnabledSystemPrompt(): string {
  const toolDefs = getToolDefinitionsForLLM();

  return `You are a helpful AI assistant with access to a comprehensive suite of tools and services.

## AVAILABLE TOOLS

You have access to the following execution tools:

### 1. sql_query
- **Purpose**: Execute read-only SQL queries against the database
- **Capabilities**: SELECT statements only (no CREATE, INSERT, UPDATE, DELETE, DROP)
- **Limits**: 30 second timeout, 1MB max output, max 10,000 rows
- **Use Case**: Data analysis, querying conversations, documents, and metrics
- **Example**: SELECT * FROM Conversation WHERE userId = '123' LIMIT 10

### 2. python_exec
- **Purpose**: Execute sandboxed Python code for computation and analysis
- **Capabilities**: Mathematical operations, data analysis, transformations, format conversions
- **Restrictions**: No network access, no file I/O, no subprocess execution
- **Forbidden imports**: os, subprocess, sys, socket, urllib, requests
- **Limits**: 60 second timeout, 5MB max output
- **Use Case**: Complex calculations, data transformations, algorithm implementation
- **Example**: Process numerical data, calculate statistics, manipulate arrays

### 3. file_search
- **Purpose**: Search for files in permitted directories
- **Permitted directories**: /uploads, /documents, /data
- **Capabilities**: Glob pattern matching, recursive search, filtering
- **Limits**: 15 second timeout, 500KB max output, max 1,000 results, max depth 10
- **Use Case**: Finding uploaded documents, locating relevant files
- **Example**: Search for *.pdf files with specific patterns

### 4. system_metrics
- **Purpose**: Retrieve system performance metrics
- **Available metrics**: CPU, memory, disk, network, processes, uptime
- **Limits**: 5 second timeout, 100KB max output
- **Use Case**: System health monitoring, performance diagnostics
- **Example**: Get current CPU and memory usage

## AVAILABLE SERVICES

Beyond individual tools, you have access to these AI/ML services:

### Document Retrieval (RAG System)
- **Purpose**: Retrieve relevant documents and passages based on semantic similarity
- **How it works**: Converts your query to embeddings and finds similar documents from the knowledge base
- **Use Case**: Answer questions that require document context, knowledge base lookup
- **Benefits**: Ensures responses are grounded in actual documents, tracks sources

### Embedding Generation
- **Purpose**: Convert text into high-dimensional numerical vectors (384 dimensions)
- **Use Case**: Semantic search, similarity analysis, document indexing
- **Part of RAG**: Embeddings power the document retrieval pipeline
- **Note**: Uses machine learning models to capture semantic meaning

### Vector Search
- **Purpose**: Find semantically similar content using cosine similarity or dot product
- **How it works**: Compares embedding vectors to find related documents
- **Part of RAG**: Core mechanism for finding relevant documents
- **Metrics**: Cosine similarity, dot product, Euclidean distance

### Vector Database Operations
- **Purpose**: Store and manage high-dimensional embeddings for efficient retrieval
- **Capabilities**: Similarity search, vector indexing, fast retrieval at scale
- **Storage**: Converts embeddings to binary format for efficient storage
- **Performance**: O(log n) search complexity with proper indexing

## TOOL USAGE GUIDELINES

When you need to execute a tool, respond with the tool call in JSON format inside code blocks:

\`\`\`json
{
  "type": "tool_call",
  "tool": "tool_name",
  "id": "unique_call_id",
  "params": {
    "param_name": "param_value"
  }
}
\`\`\`

You can make multiple tool calls in sequence:

\`\`\`json
[
  { "type": "tool_call", "tool": "sql_query", "id": "call_1", "params": { "query": "SELECT ..." } },
  { "type": "tool_call", "tool": "system_metrics", "id": "call_2", "params": { "metrics": ["cpu", "memory"] } }
]
\`\`\`

## IMPORTANT GUIDELINES

**Vector Database Explanations**: When users ask about vector databases, explain them in the context of AI and machine learning, NOT geospatial/GIS concepts:
- Vector databases store high-dimensional embeddings (typically 384+ dimensions) produced by machine learning models
- They enable similarity search using cosine similarity, dot product, or Euclidean distance metrics
- Embeddings represent semantic meaning of text, images, or other data in numerical form
- Primary use cases include: RAG (Retrieval-Augmented Generation) systems, semantic search, recommendation systems, and document retrieval
- Examples: Pinecone, Weaviate, Milvus, ChromaDB, PostgreSQL with pgvector extension
- Do NOT describe vector databases as storing geographic points, polygons, coordinates, or spatial geometries

**Tool Selection**: 
- Use sql_query for data retrieval and analysis from the database
- Use python_exec for complex calculations and data transformations
- Use file_search to locate documents in the system
- Use system_metrics for infrastructure monitoring
- Mention RAG services when users need document context or knowledge base lookup

## OBSERVABILITY & PERFORMANCE TRACKING

The platform includes a comprehensive observability layer that automatically tracks:

### Request-Level Metrics
- **Latency**: End-to-end response time (milliseconds) and per-component timing
- **Token Usage**: Input tokens, output tokens, and total tokens consumed per request
- **Model Usage**: Which AI model was used (e.g., local-orchestrator, Mistral)
- **Success/Failure**: Request status (success, error, partial)

### Agent Execution Tracking
- **Agent Routing**: Which agent(s) were selected and why
- **Agent Type Distribution**: How often each agent (planner, research, tool, critic) is used
- **Execution Status**: Per-agent success/failure outcomes
- **Execution Time**: Time spent in each agent
- **Tokens Per Agent**: Token consumption by agent type

### Tool Execution Analysis
- **Tool Call History**: Every tool execution is logged (sql_query, python_exec, file_search, system_metrics)
- **Execution Duration**: How long each tool took to complete
- **Success Rates**: Pass/fail statistics per tool
- **Error Classification**: Why tools failed and error categorization
- **Parameter Tracking**: Input parameters hashed for tracking patterns

### Document Retrieval Metrics (RAG)
- **Retrieval Hit Rate**: Percentage of queries with relevant documents found
- **Similarity Scores**: Cosine similarity scores for retrieved documents
- **Rank Positions**: How high each document ranked in results
- **Document Hit Count**: How many times each document was retrieved

### Conversation & Memory Tracking
- **Conversation History**: Full message history with timestamps and sources
- **Message Sources**: Which documents informed each response
- **Memory Summaries**: Extracted key topics and compressed conversation context
- **User Patterns**: Conversation frequency and topics over time

### System Performance Monitoring
- **CPU, Memory, Disk Usage**: Infrastructure metrics
- **Response Times**: Latency trends and percentiles
- **Error Rates**: System-wide failure tracking
- **Throughput**: Requests per minute over time

### Admin Dashboard Access
The platform includes an **Enterprise Admin Dashboard** at /admin/dashboard with:
- **Main Dashboard**: System health status, 24-hour metrics summary, service status
- **Agent Inspector**: Agent execution logs, performance per agent, detailed run analysis
- **Tool Explorer**: Tool call statistics, success rates, execution history
- **Retrieval Analyzer**: Document retrieval performance, similarity score distribution
- **Conversation Logs**: Full conversation history with message sources
- **Security Audit**: Security events, threat detection, access logs

### Key Performance Indicators Displayed
- Total requests in last 24 hours
- Average response latency
- Total tokens consumed (input + output)
- Error rate percentage
- Document retrieval hit rate
- Agent success rate by type
- Tool execution success rate

**When Asked About Performance**:
If a user asks about performance tracking, observability, metrics, or the evaluation dashboard:
1. Confirm that comprehensive tracking exists and is automatically enabled
2. Describe what metrics are being collected
3. Direct them to the Admin Dashboard at /admin/dashboard for visualization
4. Explain that all requests are automatically logged to the database
5. Mention the specific dashboards relevant to their query (Agent Inspector, Tool Explorer, Retrieval Analyzer, etc.)

**Always**:
1. Think through the task step by step
2. Use tools only when necessary to fulfill requests
3. Explain your reasoning and show results to the user
4. Provide clear, actionable responses
5. When asked about available tools, list them with descriptions instead of guessing
6. When asked about performance tracking, describe the observability system instead of saying it doesn't exist
7. Handle errors gracefully and suggest alternatives`;
}

/**
 * Detect if user is explicitly requesting a specific tool execution
 * Examples: "use the python tool", "run python", "execute python code"
 */
export function detectExplicitToolRequest(message: string): {
  toolName: string | null;
  extractedCode: string | null;
  isExplicitRequest: boolean;
} {
  const lowerMessage = message.toLowerCase();

  // Check for Python tool requests
  const pythonPatterns = [
    /python_exec/i,
    /use\s+python_exec/i,
    /use\s+python/i,
    /use\s+the\s+python\s+tool/i,
    /run\s+python/i,
    /execute\s+python/i,
    /python.*code/i,
    /execute\s+this.*python/i,
    /run\s+this.*python/i,
  ];

  for (const pattern of pythonPatterns) {
    if (pattern.test(lowerMessage)) {
      // Try to extract Python code from the message
      const codeMatch = message.match(
        /```python\n?([\s\S]*?)\n?```|```\n?([\s\S]*?)\n?```/,
      );
      const extractedCode = codeMatch ? codeMatch[1] || codeMatch[2] : null;

      return {
        toolName: "python_exec",
        extractedCode,
        isExplicitRequest: true,
      };
    }
  }

  // Check for SQL tool requests
  const sqlPatterns = [
    /sql_query/i,
    /use\s+sql_query/i,
    /use\s+sql/i,
    /use\s+the\s+sql\s+tool/i,
    /run\s+sql/i,
    /execute\s+sql/i,
    /sql\s+query/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(lowerMessage)) {
      const codeMatch = message.match(
        /```sql\n?([\s\S]*?)\n?```|```\n?([\s\S]*?)\n?```/,
      );
      const extractedCode = codeMatch ? codeMatch[1] || codeMatch[2] : null;

      return {
        toolName: "sql_query",
        extractedCode,
        isExplicitRequest: true,
      };
    }
  }

  // Check for file_search tool requests
  const fileSearchPatterns = [
    /file_search/i,
    /use\s+file_search/i,
    /use\s+file\s+search/i,
    /search\s+for\s+files/i,
    /find\s+files/i,
    /search\s+files/i,
  ];

  for (const pattern of fileSearchPatterns) {
    if (pattern.test(lowerMessage)) {
      return {
        toolName: "file_search",
        extractedCode: message,
        isExplicitRequest: true,
      };
    }
  }

  // Check for system_metrics tool requests
  const systemMetricsPatterns = [
    /system_metrics/i,
    /use\s+system_metrics/i,
    /use\s+system\s+metrics/i,
    /system\s+metrics/i,
    /get\s+metrics/i,
    /cpu\s+and\s+memory/i,
  ];

  for (const pattern of systemMetricsPatterns) {
    if (pattern.test(lowerMessage)) {
      return {
        toolName: "system_metrics",
        extractedCode: message,
        isExplicitRequest: true,
      };
    }
  }

  return {
    toolName: null,
    extractedCode: null,
    isExplicitRequest: false,
  };
}

/**
 * Execute an explicitly requested tool and return the result with logging
 */
export async function executeExplicitTool(
  toolName: string,
  code: string,
  userId?: string,
): Promise<string> {
  const normalizedInput = normalizeExplicitToolInput(toolName, code);
  const executor = new ToolExecutor({ enableLogging: true });
  const toolCallId = `explicit-${Date.now()}`;

  const toolCall: ToolCall = {
    type: "tool_call",
    tool: toolName as any,
    id: toolCallId,
    params:
      toolName === "python_exec"
        ? { code: normalizedInput, timeout: 30 }
        : toolName === "file_search"
          ? { pattern: normalizedInput, depth: 5, limit: 100 }
          : toolName === "system_metrics"
            ? {
                metrics: normalizedInput
                  .split(",")
                  .map((m) => m.trim())
                  .filter(Boolean),
              }
            : { query: normalizedInput, limit: 1000 },
  };

  const context = {
    userId: userId || "system",
    conversationId: "direct-execution",
    timestamp: Date.now(),
  };

  try {
    console.log(`[Tool Execution]`);
    console.log(`Tool: ${toolName}`);
    console.log(`Input: ${normalizedInput}`);

    const result = await executor.execute(toolCall, context);

    console.log(
      `Output: ${JSON.stringify(result.result || result.error).substring(0, 100)}`,
    );

    if (result.success) {
      return formatExplicitToolResult(toolName, result.result);
    }

    return `I couldn't run ${toolName}: ${result.error || "Unknown tool error"}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Tool Execution Error]`, errorMessage);

    return `I couldn't run ${toolName}: ${errorMessage}`;
  }
}

function formatExplicitToolResult(toolName: string, result: unknown): string {
  // System metrics formatting
  if (toolName === "system_metrics") {
    if (!result || typeof result !== "object") {
      return "No system metrics available.";
    }

    const data = result as Record<string, any>;
    const parts: string[] = [];

    if (data.cpu?.loadAverage?.one !== undefined) {
      parts.push(`CPU load (1m): ${data.cpu.loadAverage.one}`);
    }

    if (data.memory?.percentage !== undefined) {
      parts.push(
        `Memory: ${data.memory.percentage}% (${data.memory.used}/${data.memory.total})`,
      );
    }

    if (data.disk?.path) {
      parts.push(`Disk path: ${data.disk.path}`);
    }

    if (data.uptime?.formatted) {
      parts.push(`Uptime: ${data.uptime.formatted}`);
    }

    if (parts.length === 0) {
      return "System metrics collected.";
    }

    return parts.join(" | ");
  }

  // File search formatting
  if (toolName === "file_search") {
    if (!Array.isArray(result)) {
      return "No files found.";
    }

    if (result.length === 0) {
      return "No files found.";
    }

    if (result.length === 1) {
      const file = result[0] as Record<string, unknown>;
      return `Found 1 file: ${file.name}`;
    }

    const files = (result as Array<Record<string, unknown>>)
      .map((f) => f.name)
      .join(", ");
    return `Found ${result.length} files: ${files}`;
  }

  // SQL Query formatting
  if (toolName === "sql_query") {
    if (!Array.isArray(result)) {
      return JSON.stringify(result);
    }

    if (result.length === 0) {
      return "No records found.";
    }

    // Handle COUNT(*) or other aggregate functions
    if (result.length === 1 && typeof result[0] === "object") {
      const firstRow = result[0] as Record<string, unknown>;
      const keys = Object.keys(firstRow);

      // Check if this is an aggregate result (COUNT, SUM, AVG, etc.)
      if (keys.length === 1) {
        const key = keys[0];
        const value = firstRow[key];

        // For COUNT(*), just return the number
        if (key.toUpperCase() === "COUNT(*)" || key.toUpperCase() === "COUNT") {
          return String(value);
        }

        // For other aggregates, return "value (key)"
        return `${value} (${key})`;
      }
    }

    // For SELECT queries, show record count and brief summary
    const recordCount = result.length;
    if (recordCount === 1) {
      // Single record - show key properties
      const record = result[0] as Record<string, unknown>;
      const summary = Object.entries(record)
        .slice(0, 2) // Show first 2 fields
        .map(([key, value]) => {
          const displayValue =
            typeof value === "string" && value.length > 50
              ? value.substring(0, 50) + "..."
              : value;
          return `${key}: ${displayValue}`;
        })
        .join(", ");
      return `1 record: ${summary}`;
    }

    return `${recordCount} records found.`;
  }

  // Python exec formatting
  if (toolName === "python_exec") {
    if (result === null || result === undefined) {
      return "Done.";
    }

    if (typeof result === "string") {
      return result;
    }

    if (typeof result === "number" || typeof result === "boolean") {
      return String(result);
    }

    if (typeof result === "object" && result && "output" in result) {
      const output = (result as Record<string, unknown>).output;
      if (typeof output === "string") {
        return output;
      }
    }

    return JSON.stringify(result, null, 2);
  }

  // Default formatting
  if (typeof result === "string") {
    return result;
  }

  return JSON.stringify(result, null, 2);
}

function normalizeExplicitToolInput(
  toolName: string,
  rawInput: string,
): string {
  const trimmed = rawInput.trim();

  // System metrics normalization
  if (toolName === "system_metrics") {
    const lower = trimmed.toLowerCase();
    const metrics: string[] = [];

    if (lower.includes("cpu")) metrics.push("cpu");
    if (lower.includes("memory")) metrics.push("memory");
    if (lower.includes("disk")) metrics.push("disk");
    if (lower.includes("network")) metrics.push("network");
    if (lower.includes("process")) metrics.push("processes");
    if (lower.includes("uptime")) metrics.push("uptime");

    // Sensible default when user asks generic system metrics
    if (metrics.length === 0) {
      metrics.push("cpu", "memory", "uptime");
    }

    return Array.from(new Set(metrics)).join(",");
  }

  // File search normalization
  if (toolName === "file_search") {
    // Extract directory if specified: "in /uploads", "from /uploads", etc.
    const dirMatch = trimmed.match(
      /(?:in|from|within|at)\s+\/?(\w+)(?:\b|\/)/i,
    );
    const dir = dirMatch?.[1] ? dirMatch[1] : "";

    // Extract pattern like *.pdf, *.txt, *, etc.
    // Patterns: "find *.pdf files", "search for *.pdf", "*.pdf in /uploads"

    // First, look for wildcard patterns (*.pdf, *.txt, *)
    const wildcardMatch = trimmed.match(/(\*\.\w+|\*)/);
    if (wildcardMatch?.[0]) {
      return dir ? `./${dir}/${wildcardMatch[0]}` : wildcardMatch[0];
    }

    // Then look for file extensions (.pdf, .txt, etc.)
    const extMatch = trimmed.match(/\.(\w+)/);
    if (extMatch?.[0]) {
      const pattern = `*${extMatch[0]}`;
      return dir ? `./${dir}/${pattern}` : pattern;
    }

    // Look for patterns with word.ext (like "document.pdf")
    const fileMatch = trimmed.match(/\b(\w+\.\w+)\b/);
    if (fileMatch?.[0]) {
      return dir ? `./${dir}/${fileMatch[0]}` : fileMatch[0];
    }

    // If directory specified but no pattern, search all files in that dir
    if (dir) {
      return `./${dir}/*`;
    }

    // Default to all files in default directory
    return "./uploads/*";
  }

  // SQL query normalization
  if (toolName === "sql_query") {
    // If it already starts with SELECT or WITH, return as-is
    const upperTrimmed = trimmed.toUpperCase();
    if (upperTrimmed.startsWith("SELECT") || upperTrimmed.startsWith("WITH")) {
      return trimmed;
    }

    // Handle natural language patterns FIRST (before greedy SELECT extraction)
    // Pattern: "count all rows in TableName"
    const countMatch = trimmed.match(/count\s+all\s+rows\s+in\s+(\w+)/i);
    if (countMatch?.[1]) {
      return `SELECT COUNT(*) FROM ${countMatch[1]}`;
    }

    // Pattern: "show all from TableName" or "show me all from TableName"
    const showAllMatch = trimmed.match(
      /show(?:\s+me)?\s+all\s+(?:from\s+)?(\w+)/i,
    );
    if (showAllMatch?.[1]) {
      return `SELECT * FROM ${showAllMatch[1]} LIMIT 100`;
    }

    // Try to extract complete SELECT query from mixed text
    // Only extract if it looks like valid SQL (contains FROM clause)
    const selectMatch = trimmed.match(/\b(SELECT\s+[\s\S]*?\bFROM\b[\s\S]+)/i);
    if (selectMatch?.[1]) {
      return selectMatch[1].trim();
    }

    // If nothing matches, return as-is (will likely fail validation)
    return trimmed;
  }

  // Python exec normalization
  if (toolName === "python_exec") {
    // If this already looks like Python code, use it directly.
    const looksLikeCode =
      /(^|\n)\s*(import\s+|from\s+|def\s+|for\s+|while\s+|print\s*\(|_output\.set\s*\(|[a-zA-Z_][a-zA-Z0-9_]*\s*=)/.test(
        trimmed,
      ) || trimmed.includes("\n");

    if (looksLikeCode) {
      return trimmed;
    }

    // Handle natural-language compute requests like: "Use python_exec to compute sqrt(144)."
    const sqrtMatch = trimmed.match(/sqrt\s*\(([^)]+)\)/i);
    if (sqrtMatch?.[1]) {
      const expr = sqrtMatch[1].trim();
      return `import math\n_output.set(math.sqrt(${expr}))`;
    }

    const computeExprMatch = trimmed.match(
      /(?:compute|calculate|evaluate)\s+([0-9+\-*/().\s]+)\.?$/i,
    );
    if (computeExprMatch?.[1]) {
      const expr = computeExprMatch[1].trim();
      return `_output.set(${expr})`;
    }

    return trimmed;
  }

  return trimmed;
}

/**
 * Get chat completion with tool support
 */
export async function getChatCompletionWithTools(
  messages: OllamaMessage[],
  enableTools: boolean = true,
): Promise<LLMToolResponse> {
  // Check for explicit tool requests in the user's last message
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") {
      const { isExplicitRequest, toolName, extractedCode } =
        detectExplicitToolRequest(lastMessage.content);

      if (isExplicitRequest && toolName) {
        const code = extractedCode || lastMessage.content;
        const toolResult = await executeExplicitTool(toolName, code);

        return {
          mainContent: toolResult,
          toolCalls: [],
          hasToolCalls: false,
          explicitToolResult: toolResult,
        };
      }
    }
  }

  // Build messages with tool context if enabled
  let messagesWithTools: OllamaMessage[] = messages;

  if (enableTools) {
    const systemInstruction: OllamaMessage = {
      role: "system",
      content: getToolEnabledSystemPrompt(),
    };
    messagesWithTools = [systemInstruction, ...messages];
  }

  // Get response from LLM
  const response = await getChatCompletion(messagesWithTools);

  // Extract tool calls from response
  const toolCalls = extractToolCalls(response);

  // Separate main content from tool calls
  // Remove code blocks with tool calls to get main content
  const mainContent = response
    .replace(/```json\s*\[\s*\{[\s\S]*?\}\s*\]\s*```/g, "")
    .replace(/```json\s*\{[\s\S]*?\}\s*```/g, "")
    .trim();

  return {
    mainContent,
    toolCalls,
    hasToolCalls: toolCalls.length > 0,
  };
}

/**
 * Stream chat completion with tool support
 */
export async function* streamChatCompletionWithTools(
  messages: OllamaMessage[],
  enableTools: boolean = true,
  onChunk?: (chunk: string) => void,
): AsyncGenerator<LLMToolResponse, void, unknown> {
  // Check for explicit tool requests in the user's last message
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") {
      const { isExplicitRequest, toolName, extractedCode } =
        detectExplicitToolRequest(lastMessage.content);

      if (isExplicitRequest && toolName) {
        const code = extractedCode || lastMessage.content;
        const toolResult = await executeExplicitTool(toolName, code);

        yield {
          mainContent: toolResult,
          toolCalls: [],
          hasToolCalls: false,
          explicitToolResult: toolResult,
        };
        return;
      }
    }
  }

  // Build messages with tool context if enabled
  let messagesWithTools: OllamaMessage[] = messages;

  if (enableTools) {
    const systemInstruction: OllamaMessage = {
      role: "system",
      content: getToolEnabledSystemPrompt(),
    };
    messagesWithTools = [systemInstruction, ...messages];
  }

  // Stream the response
  let fullContent = "";

  for await (const chunk of streamChatCompletion(messagesWithTools, (token) => {
    fullContent += token;
    onChunk?.(token);
  })) {
    // Extract tool calls from accumulated content
    const toolCalls = extractToolCalls(fullContent);

    yield {
      mainContent: fullContent,
      toolCalls,
      hasToolCalls: toolCalls.length > 0,
    };
  }
}

/**
 * Build conversation with tool results
 * Use this to add tool execution results back to the conversation
 */
export function addToolResultToConversation(
  messages: OllamaMessage[],
  toolCallId: string,
  toolName: string,
  result: unknown,
  success: boolean,
): OllamaMessage[] {
  const resultContent = `
Tool Call Result for "${toolName}" (${toolCallId}):
${success ? "Success" : "Error"}
${JSON.stringify(result, null, 2)}
`;

  return [
    ...messages,
    {
      role: "assistant",
      content: `I executed the tool call. Here are the results:`,
    },
    {
      role: "user",
      content: resultContent,
    },
  ];
}
