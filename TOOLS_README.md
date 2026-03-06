# Structured Tool Calling System

A comprehensive, production-ready tool execution framework for LLM integration with security, monitoring, and admin controls.

## Overview

The tool system enables LLMs to execute structured tool calls in JSON format, processed through a secure pipeline with validation, execution, logging, and feedback mechanisms.

### Architecture Flow

```
LLM Response (JSON)
    ↓
Extract Tool Calls (validators.ts)
    ↓
Validate Schema (jsonschema)
    ↓
Security Checks (input validation, patterns)
    ↓
Execute Tool (executor.ts)
    ↓
Sanitize Output (remove sensitive data)
    ↓
Log Execution (database + console)
    ↓
Return Result to LLM
    ↓
Generate Final Response
```

## Tools Available

### 1. SQL Query Tool (`sql_query`)

- **Purpose**: Execute read-only SQL queries against the database
- **Safety**: Only SELECT statements allowed, no destructive operations
- **Rate Limit**: 60 calls/minute, 1000 calls/hour
- **Timeout**: 30 seconds
- **Max Output**: 1MB

**Example Call**:

```json
{
  "type": "tool_call",
  "tool": "sql_query",
  "id": "query_1",
  "params": {
    "query": "SELECT * FROM conversations WHERE userId = ? LIMIT 10",
    "limit": 1000
  }
}
```

### 2. Python Execution Tool (`python_exec`)

- **Purpose**: Run sandboxed Python code for data analysis
- **Safety**: Restricted imports (no os, subprocess, socket), no file I/O
- **Rate Limit**: 30 calls/minute, 500 calls/hour
- **Timeout**: 60 seconds
- **Max Output**: 5MB
- **Available Modules**: math, re, string, collections, itertools, functools, statistics, datetime

**Example Call**:

```json
{
  "type": "tool_call",
  "tool": "python_exec",
  "id": "py_1",
  "params": {
    "code": "import math\nresult = math.sqrt(16)\nprint(result)",
    "timeout": 10
  }
}
```

### 3. File Search Tool (`file_search`)

- **Purpose**: Search for files within permitted directories
- **Safety**: Limited to /uploads, /documents, /data directories
- **Rate Limit**: 60 calls/minute, 1000 calls/hour
- **Timeout**: 15 seconds
- **Max Output**: 500KB
- **Max Depth**: 10 levels

**Example Call**:

```json
{
  "type": "tool_call",
  "tool": "file_search",
  "id": "search_1",
  "params": {
    "pattern": "*.pdf",
    "depth": 5,
    "limit": 50
  }
}
```

### 4. System Metrics Tool (`system_metrics`)

- **Purpose**: Retrieve CPU, memory, disk, and network metrics
- **Safety**: Read-only, no sensitive data exposed
- **Rate Limit**: 120 calls/minute, 5000 calls/hour
- **Timeout**: 5 seconds
- **Max Output**: 100KB

**Example Call**:

```json
{
  "type": "tool_call",
  "tool": "system_metrics",
  "id": "metrics_1",
  "params": {
    "metrics": ["cpu", "memory", "disk"],
    "detailed": false
  }
}
```

## Security Features

### Input Validation

- JSON schema validation for all tool calls
- Pattern matching: forbids SQL keywords (DROP, DELETE, etc.)
- Prevents SQL injection patterns
- Blocks dangerous Python imports (os, subprocess, etc.)
- Path traversal prevention in file search

### Output Sanitization

- Automatic redaction of passwords, API keys, tokens
- Size limits to prevent data exfiltration
- Sensitive data masking

### Execution Safety

- Sandboxed Python environment
- Read-only database access
- Restricted file system access to designated directories
- Timeout enforcement

### Admin Controls

- Global enable/disable toggle
- Per-tool enable/disable
- Rate limiting configuration
- Logging levels and destinations
- Audit trail with detailed logging

## Integration Guide

### 1. Basic Tool Execution

```typescript
import { getToolExecutor } from "@/lib/tools";

const executor = getToolExecutor();

const result = await executor.execute(
  {
    type: "tool_call",
    tool: "system_metrics",
    id: "metrics_1",
    params: { metrics: ["cpu", "memory"] },
  },
  {
    conversationId: "conv_123",
    userId: "user_456",
    timestamp: Date.now(),
  },
);
```

### 2. LLM Integration with Tool Support

```typescript
import { getChatCompletionWithTools } from "@/lib/llm/toolCalling";

const response = await getChatCompletionWithTools(
  messages,
  (enableTools = true),
);

// response.toolCalls contains extracted tool calls
// response.mainContent contains assistant response
// response.hasToolCalls indicates if tools were called
```

### 3. Streaming Tool Execution

```typescript
for await (const chunk of streamChatCompletionWithTools(
  messages,
  (enableTools = true),
)) {
  console.log(chunk.mainContent);
  if (chunk.hasToolCalls) {
    // Process tool calls
  }
}
```

### 4. Tool-Aware Chat Endpoint

```
POST /api/tools/chat

Request:
{
  "conversationId": "conv_123",
  "message": "What are the system metrics?",
  "userId": "user_456",
  "enableRAG": true,
  "enableTools": true,
  "maxToolIterations": 3
}

Response: NDJSON stream with events
{type: 'assistant_response', content: '...'}
{type: 'tool_execution', toolName: '...', success: true, ...}
{type: 'complete', content: '...', executionSteps: [...]}
```

## API Endpoints

### Tool Execution

- **POST** `/api/tools/execute` - Execute a single tool call

### Configuration Management

- **GET** `/api/tools/config` - Get current configuration
- **POST** `/api/tools/config` - Update configuration
- **PUT** `/api/tools/config` - Reload configuration

### Statistics

- **GET** `/api/tools/stats` - Get statistics for all tools
- **GET** `/api/tools/stats?tool=sql_query` - Get specific tool stats

### Admin Control

- **POST** `/api/tools/toggle` - Enable/disable tools

## Monitoring & Logging

### Database Logging

All tool executions are logged to `ToolExecutionLog` table with:

- Tool name and call ID
- Parameters hash
- Execution time
- Success/failure status
- Result hash and size
- Cache hit status
- Timestamp

### Statistics Tracked

- Total calls
- Success/failure rates
- Average execution time
- Min/max execution time
- Cache hit rate
- Total data processed
- Last execution time

### Accessing Statistics

```typescript
import { toolConfigService } from "@/lib/tools";

// Get stats for all tools
const allStats = await toolConfigService.getStatistics();

// Get stats for specific tool
const sqlStats = await toolConfigService.getToolStatistics("sql_query");
```

## Admin Configuration

### Default Configuration

```typescript
{
  globalEnabled: true,
  tools: {
    sql_query: {
      enabled: true,
      rateLimit: { callsPerMinute: 60, callsPerHour: 1000 },
      timeout: 30000,
      cacheTtl: 300,
      cacheResults: true
    },
    // ... other tools
  },
  logging: {
    enabled: true,
    logLevel: 'info',
    logToDatabase: true,
    logResultsSize: true
  },
  security: {
    enableInputValidation: true,
    enableOutputSanitization: true,
    auditAllCalls: true,
    rateLimitPerUser: false
  }
}
```

### Updating Configuration

```typescript
import { toolConfigService } from "@/lib/tools";

await toolConfigService.updateConfig({
  globalEnabled: false, // Disable all tools
  tools: {
    sql_query: {
      enabled: true,
      timeout: 60000, // Increase timeout
    },
  },
  logging: {
    logLevel: "debug", // More verbose logging
  },
});
```

### Command Line Admin

```bash
# Get current configuration
curl -H "Authorization: Bearer admin" http://localhost:3000/api/tools/config

# Disable all tools
curl -X POST \
  -H "Authorization: Bearer admin" \
  -H "Content-Type: application/json" \
  -d '{"global": true, "enabled": false}' \
  http://localhost:3000/api/tools/toggle

# Get statistics
curl -H "Authorization: Bearer admin" http://localhost:3000/api/tools/stats
```

## Dashboard

Access the tool management dashboard at `/tools` to:

- View global enable/disable status
- Enable/disable individual tools
- View real-time statistics
- Check configuration details
- Monitor success rates and performance

## Best Practices

### For LLM Prompts

1. Explain tool capabilities clearly
2. Provide JSON format examples
3. Encourage tool use when beneficial
4. Handle missing tools gracefully

### For Tool Development

1. Validate all inputs thoroughly
2. Set appropriate timeouts
3. Limit output sizes
4. Log failures for debugging

### For Security

1. Never expose database credentials
2. Sanitize all outputs
3. Validate user permissions (future)
4. Monitor unusual access patterns
5. Regular security audits

### For Performance

1. Cache read-only queries
2. Limit result sets
3. Use pagination for large datasets
4. Monitor tool execution times

## Troubleshooting

### Tools Not Executing

1. Check if globally enabled: `GET /api/tools/config`
2. Check if tool enabled: Look for tool in config
3. Verify JSON format: Must be valid JSON in code blocks
4. Check tool call ID: Must be non-empty string

### High Latency

1. Check execution time in stats
2. Review timeout settings
3. Monitor database load
4. Check system resources

### Cache Not Working

1. Verify cacheTtl > 0 in config
2. Ensure identical parameters for hits
3. Check result size not exceeding limit
4. Review cacheResults setting

## Data Privacy

- Tool execution logs do not store raw results (only hashes)
- All sensitive data is sanitized before logging
- Audit trail with user attribution
- Option to exclude result sizes from logs

## Future Enhancements

- [ ] Per-user rate limiting
- [ ] Tool-specific permission controls
- [ ] Advanced caching with Redis
- [ ] Tool call queuing for heavy workloads
- [ ] Webhook notifications for failures
- [ ] Custom tool registration
- [ ] Execution cost tracking
- [ ] Tools composition/chaining

## File Structure

```
lib/tools/
├── types.ts                 # Type definitions
├── validators.ts            # Input validation
├── definitions.ts           # Tool definitions & schemas
├── executor.ts              # Core execution engine
├── configService.ts         # Admin configuration
├── sqlQueryTool.ts         # SQL tool implementation
├── pythonExecutionTool.ts  # Python sandbox
├── fileSearchTool.ts       # File search
├── systemMetricsTool.ts    # System metrics
└── index.ts                # Exports

app/api/tools/
├── execute/route.ts        # Single tool execution
├── config/route.ts         # Configuration management
├── stats/route.ts          # Statistics endpoint
├── toggle/route.ts         # Enable/disable tools
└── chat/route.ts           # Tool-integrated chat

app/components/
└── ToolManagementDashboard.tsx  # Admin dashboard

app/tools/
└── page.tsx               # Dashboard page
```

## References

- [Tool Definitions](./definitions.ts) - Complete tool specifications
- [Validators](./validators.ts) - Security validation rules
- [Executor](./executor.ts) - Execution pipeline
- [Config Service](./configService.ts) - Admin API
