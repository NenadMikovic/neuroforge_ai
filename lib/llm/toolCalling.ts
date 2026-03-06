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
  const executor = new ToolExecutor({ enableLogging: true });
  const toolCallId = `explicit-${Date.now()}`;

  const toolCall: ToolCall = {
    type: "tool_call",
    tool: toolName as any,
    id: toolCallId,
    params:
      toolName === "python_exec"
        ? { code, timeout: 30 }
        : { query: code, limit: 1000 },
  };

  const context = {
    userId: userId || "system",
    conversationId: "direct-execution",
    timestamp: Date.now(),
  };

  try {
    console.log(`[Tool Execution]`);
    console.log(`Tool: ${toolName}`);
    console.log(`Input: ${code}`);

    const result = await executor.execute(toolCall, context);

    console.log(
      `Output: ${JSON.stringify(result.result || result.error).substring(0, 100)}`,
    );

    if (result.success) {
      return `
**[Tool Execution Result]**
- **Tool**: ${toolName}
- **Status**: Success ✓
- **Execution Time**: ${result.executionTime}ms
- **Result**: 
\`\`\`
${JSON.stringify(result.result, null, 2)}
\`\`\`
`;
    } else {
      return `
**[Tool Execution Result]**
- **Tool**: ${toolName}
- **Status**: Error ✗
- **Error**: ${result.error}
`;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Tool Execution Error]`, errorMessage);

    return `
**[Tool Execution Error]**
- **Tool**: ${toolName}
- **Error**: ${errorMessage}
`;
  }
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
