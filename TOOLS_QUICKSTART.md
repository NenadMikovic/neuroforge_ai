# Tool System Quick Start Guide

Get up and running with structured tool calling in 5 minutes.

## 1. Installation

The tool system is already integrated into the codebase. Just ensure Prisma is configured:

```bash
# Apply database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## 2. Basic Usage - Single Tool Call

### Direct Tool Execution

```typescript
import { getToolExecutor } from "@/lib/tools";

// Get the executor instance
const executor = getToolExecutor();

// Execute a system metrics tool call
const result = await executor.execute(
  {
    type: "tool_call",
    tool: "system_metrics",
    id: "unique_call_id",
    params: { metrics: ["cpu", "memory"] },
  },
  {
    conversationId: "conv_123",
    userId: "user_456",
  },
);

console.log(result);
// {
//   toolCallId: 'unique_call_id',
//   tool: 'system_metrics',
//   success: true,
//   result: { cpu: {...}, memory: {...} },
//   executionTime: 45
// }
```

## 3. LLM Integration - Tool-Aware Chat

### Using Tool-Enabled Chat Endpoint

```typescript
// In your frontend/client code
const response = await fetch("/api/tools/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    conversationId: "conv_123",
    message: "What are the current system metrics?",
    userId: "user_456",
    enableTools: true,
    enableRAG: true,
  }),
});

// Stream the response
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = new TextDecoder().decode(value);
  const lines = text.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);

    if (event.type === "assistant_response") {
      console.log("Assistant:", event.content);
    } else if (event.type === "tool_execution") {
      console.log(`Tool ${event.toolName} executed:`, event.result);
    } else if (event.type === "complete") {
      console.log("Final response:", event.content);
      console.log("Tools executed:", event.executionSteps);
    }
  }
}
```

## 4. Tool Call Examples

### SQL Query

```json
{
  "type": "tool_call",
  "tool": "sql_query",
  "id": "sql_1",
  "params": {
    "query": "SELECT COUNT(*) as total FROM conversations",
    "limit": 1000
  }
}
```

### Python Code Execution

```json
{
  "type": "tool_call",
  "tool": "python_exec",
  "id": "py_1",
  "params": {
    "code": "import statistics\ndata = [1, 2, 3, 4, 5]\nmean = statistics.mean(data)\nprint(mean)",
    "timeout": 10
  }
}
```

### File Search

```json
{
  "type": "tool_call",
  "tool": "file_search",
  "id": "search_1",
  "params": {
    "pattern": "*.pdf",
    "depth": 5
  }
}
```

### System Metrics

```json
{
  "type": "tool_call",
  "tool": "system_metrics",
  "id": "metrics_1",
  "params": {
    "metrics": ["cpu", "memory", "uptime"],
    "detailed": true
  }
}
```

## 5. Admin Configuration

### Get Current Config

```bash
curl -H "Authorization: Bearer admin" \
  http://localhost:3000/api/tools/config
```

### Disable All Tools

```bash
curl -X POST \
  -H "Authorization: Bearer admin" \
  -H "Content-Type: application/json" \
  -d '{"global": true, "enabled": false}' \
  http://localhost:3000/api/tools/toggle
```

### Enable Specific Tool

```bash
curl -X POST \
  -H "Authorization: Bearer admin" \
  -H "Content-Type: application/json" \
  -d '{"toolName": "sql_query", "enabled": true}' \
  http://localhost:3000/api/tools/toggle
```

### View Statistics

```bash
curl -H "Authorization: Bearer admin" \
  http://localhost:3000/api/tools/stats

# Get stats for specific tool
curl -H "Authorization: Bearer admin" \
  http://localhost:3000/api/tools/stats?tool=sql_query
```

## 6. Web Dashboard

Access the tool management dashboard at:

```
http://localhost:3000/tools
```

Features:

- View/toggle global enable/disable
- Enable/disable individual tools
- Real-time statistics and metrics
- Configuration details
- Success rates and performance metrics

## 7. Security Best Practices

### Always Validate Inputs

```typescript
import { validateToolCall } from "@/lib/tools/validators";

const validation = validateToolCall(toolCall);
if (!validation.valid) {
  console.error("Invalid tool call:", validation.errors);
  return;
}
```

### Handle Errors Gracefully

```typescript
try {
  const result = await executor.execute(toolCall, context);
  if (!result.success) {
    console.error("Tool failed:", result.error);
  }
} catch (error) {
  console.error("Execution error:", error);
}
```

### Monitor Sensitive Operations

```typescript
// All operations are logged to database
// Check ToolExecutionLog table for:
// - Tool name
// - Execution time
// - Success/failure status
// - Timestamp
```

## 8. Common Patterns

### Agentic Loop (Multiple Tool Calls)

```typescript
const executor = getToolExecutor();
let conversationMessages = [...previousMessages];

for (let i = 0; i < maxIterations; i++) {
  // Get LLM response with tool awareness
  const llmResponse = await getChatCompletionWithTools(
    conversationMessages,
    (enableTools = true),
  );

  if (!llmResponse.hasToolCalls) break;

  // Execute all tool calls
  for (const toolCall of llmResponse.toolCalls) {
    const result = await executor.execute(toolCall, context);
    console.log(`Tool ${toolCall.tool}: ${result.success}`);
  }

  // Add results back to conversation
  conversationMessages = addToolResultToConversation(
    conversationMessages,
    toolCall.id,
    toolCall.tool,
    result.result,
    result.success,
  );
}
```

### Conditional Tool Execution

```typescript
if (message.includes("metrics")) {
  // Use system metrics tool
} else if (message.includes("files")) {
  // Use file search tool
} else if (message.includes("database")) {
  // Use SQL query tool
}
```

## 9. Troubleshooting

### Tool Not Responding

1. Check if tool is enabled: `GET /api/tools/config`
2. Verify JSON format in code block: Must be valid JSON
3. Check timeout: Tool may be taking too long
4. Review logs: Check database ToolExecutionLog table

### Permission Errors

- Ensure authorization header: `Authorization: Bearer admin`
- Check security settings in configuration

### Cache Not Working

- Verify `cacheTtl > 0` in tool config
- Parameters must be identical for cache hit
- Check result size doesn't exceed limit

## 10. Next Steps

1. **Integrate with Chat**: Update chat UI to use `/api/tools/chat` endpoint
2. **Custom Tools**: Extend system with domain-specific tools (see definitions.ts)
3. **Monitoring**: Set up alerts for failed tool executions
4. **Performance**: Optimize tool timeouts based on usage patterns
5. **User Permissions**: Implement per-user tool restrictions

## File References

- **[Full Documentation](./TOOLS_README.md)**
- **[Type Definitions](./lib/tools/types.ts)**
- **[Tool Definitions](./lib/tools/definitions.ts)**
- **[Executor](./lib/tools/executor.ts)**
- **[API Routes](./app/api/tools/)**

## API Quick Reference

```
POST   /api/tools/execute          Execute single tool
GET    /api/tools/config           Get configuration
POST   /api/tools/config           Update configuration
PUT    /api/tools/config           Reload configuration
GET    /api/tools/stats            Get statistics
POST   /api/tools/toggle           Enable/disable tools
POST   /api/tools/chat             Tool-enabled chat
```

## Performance Tips

- Cache frequently used queries (SQL)
- Use pagination for large result sets
- Set reasonable timeouts (check statistics)
- Monitor execution times in dashboard
- Batch similar operations

Happy tool calling! 🚀
