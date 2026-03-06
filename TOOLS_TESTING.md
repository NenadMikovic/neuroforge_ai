# Tool System Testing & Verification Guide

## Quick Verification Checklist

### ✅ Pre-Deployment Verification

- [ ] Database migrations applied
- [ ] Prisma client generated
- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] Ollama service running (for LLM)

### ✅ Manual Testing

Before deploying to production, verify these scenarios work:

#### 1. Tool Execution

```bash
# Test single tool execution
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolCall": {
      "type": "tool_call",
      "tool": "system_metrics",
      "id": "test_1",
      "params": {
        "metrics": ["cpu", "memory"],
        "detailed": false
      }
    },
    "conversationId": "conv_test",
    "userId": "user_test"
  }'

# Expected Response:
# {
#   "success": true,
#   "result": {
#     "toolCallId": "test_1",
#     "tool": "system_metrics",
#     "success": true,
#     "result": { "cpu": {...}, "memory": {...} },
#     "executionTime": <ms>
#   }
# }
```

#### 2. Configuration Management

```bash
# Get current configuration
curl -H "Authorization: Bearer admin" \
  http://localhost:3000/api/tools/config

# Expected: Full configuration object

# Disable all tools
curl -X POST http://localhost:3000/api/tools/toggle \
  -H "Authorization: Bearer admin" \
  -H "Content-Type: application/json" \
  -d '{"global": true, "enabled": false}'

# Verify disabled
curl -H "Authorization: Bearer admin" \
  http://localhost:3000/api/tools/config | grep "globalEnabled"
# Should show: "globalEnabled": false

# Re-enable
curl -X POST http://localhost:3000/api/tools/toggle \
  -H "Authorization: Bearer admin" \
  -H "Content-Type: application/json" \
  -d '{"global": true, "enabled": true}'
```

#### 3. Statistics Tracking

```bash
# Get all tool statistics
curl -H "Authorization: Bearer admin" \
  http://localhost:3000/api/tools/stats

# Expected: Statistics object for each tool
# {
#   "sql_query": {
#     "toolName": "sql_query",
#     "totalCalls": 0,
#     "successfulCalls": 0,
#     ...
#   }
# }

# Get specific tool stats
curl -H "Authorization: Bearer admin" \
  "http://localhost:3000/api/tools/stats?tool=system_metrics"
```

#### 4. Tool-Integrated Chat

```bash
# Test tool-aware chat
curl -X POST http://localhost:3000/api/tools/chat \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv_test",
    "message": "What are the current system metrics?",
    "userId": "user_test",
    "enableTools": true,
    "enableRAG": false,
    "maxToolIterations": 1
  }'

# Expected: NDJSON stream with events
# {"type":"assistant_response","content":"..."}
# {"type":"tool_execution","toolName":"system_metrics",...}
# {"type":"complete","content":"...", "executionSteps":[...]}
```

#### 5. Admin Dashboard

```
Navigate to: http://localhost:3000/tools

Expected to see:
- Global enable/disable toggle
- All 4 tools listed with enable/disable switches
- Real-time statistics for each tool
- Configuration details
- Status indicators
```

## Security Testing

### 1. SQL Injection Prevention

```bash
# This should FAIL validation
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolCall": {
      "type": "tool_call",
      "tool": "sql_query",
      "id": "test_1",
      "params": {
        "query": "DELETE FROM users; SELECT * FROM users;"
      }
    },
    "conversationId": "conv_test",
    "userId": "user_test"
  }'

# Expected: Error - "destructive operations not allowed"
```

### 2. Drop Statement Prevention

```bash
# This should FAIL
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolCall": {
      "type": "tool_call",
      "tool": "sql_query",
      "id": "test_2",
      "params": {
        "query": "DROP TABLE conversations"
      }
    },
    "conversationId": "conv_test",
    "userId": "user_test"
  }'
```

### 3. Python Dangerous Import Prevention

```bash
# This should FAIL
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolCall": {
      "type": "tool_call",
      "tool": "python_exec",
      "id": "test_3",
      "params": {
        "code": "import os; os.system(\"ls\")"
      }
    },
    "conversationId": "conv_test",
    "userId": "user_test"
  }'

# Expected: Error - "Import of 'os' is restricted"
```

### 4. Path Traversal Prevention

```bash
# This should FAIL
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolCall": {
      "type": "tool_call",
      "tool": "file_search",
      "id": "test_4",
      "params": {
        "pattern": "../../sensitive/file.txt"
      }
    },
    "conversationId": "conv_test",
    "userId": "user_test"
  }'

# Expected: Error - "Path traversal not allowed"
```

### 5. Valid SQL Query Success

```bash
# This SHOULD succeed
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolCall": {
      "type": "tool_call",
      "tool": "sql_query",
      "id": "test_5",
      "params": {
        "query": "SELECT * FROM conversations LIMIT 5"
      }
    },
    "conversationId": "conv_test",
    "userId": "user_test"
  }'

# Expected: success: true with results
```

## Performance Testing

### 1. Tool Execution Latency

```typescript
// Measure execution time
const times: number[] = [];

for (let i = 0; i < 10; i++) {
  const result = await executor.execute(toolCall, context);
  times.push(result.executionTime);
}

const avg = times.reduce((a, b) => a + b) / times.length;
console.log(`Average execution time: ${avg}ms`);
// Should be < 100ms for system_metrics
// Should be < 500ms for SQL queries
// Should be < 5000ms for Python execution
```

### 2. Cache Effectiveness

```bash
# Execute same query twice
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{...same tool call...}'

# Second call should have cacheHit: true
# Second call should be much faster
```

### 3. Load Testing

```bash
# Use Apache Bench or similar
ab -n 100 -c 10 \
  -p request.json \
  -T "application/json" \
  http://localhost:3000/api/tools/execute

# Monitor:
# - Response times
# - Error rates
# - System resource usage
```

## Database Testing

### 1. Verify Logging

```sql
-- Check if executions are being logged
SELECT COUNT(*) FROM ToolExecutionLog;

-- Check recent executions
SELECT * FROM ToolExecutionLog
ORDER BY createdAt DESC
LIMIT 10;

-- Verify statistics
SELECT
  toolName,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful,
  AVG(executionTime) as avg_time
FROM ToolExecutionLog
GROUP BY toolName;
```

### 2. Verify Configuration Storage

```sql
SELECT * FROM ToolConfiguration;
```

## Integration Testing

### 1. With Agents System

```typescript
// Verify orchestrator can use tools
const orchestrator = new AgentOrchestrator({
  enableTools: true,
});

const result = await orchestrator.processQuery(
  convId,
  userId,
  "What are the system metrics?",
);

// Check if tools were used in result
console.log(result.toolsUsed);
```

### 2. With RAG System

```bash
# Test combined RAG + Tools
curl -X POST http://localhost:3000/api/tools/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What metrics do we have for the uploaded documents?",
    "userId": "user_test",
    "enableRAG": true,
    "enableTools": true
  }'

# Should:
# 1. Retrieve RAG context
# 2. Execute system metrics tool
# 3. Combine results in response
```

## Monitoring & Observation

### 1. Console Logs

- Look for `[ToolExecutor]` prefixed logs
- Look for tool-specific debug info
- Check for validation error messages

### 2. Database Logs

```sql
-- Monitor execution patterns
SELECT
  DATE(createdAt) as execution_date,
  toolName,
  COUNT(*) as call_count,
  SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as success_count
FROM ToolExecutionLog
GROUP BY DATE(createdAt), toolName
ORDER BY execution_date DESC;

-- Find failed executions
SELECT * FROM ToolExecutionLog
WHERE success = false
ORDER BY createdAt DESC
LIMIT 20;
```

### 3. Performance Baseline

```typescript
// Record baseline metrics
const baseline = await toolConfigService.getStatistics();
console.log("Baseline metrics:", baseline);

// Compare over time
setTimeout(async () => {
  const updated = await toolConfigService.getStatistics();
  console.log("Updated metrics:", updated);
}, 3600000); // After 1 hour
```

## Endpoint Response Format Verification

### Success Response

```json
{
  "success": true,
  "result": {
    "toolCallId": "string",
    "tool": "tool_name",
    "success": true,
    "result": {},
    "executionTime": 123,
    "metadata": {}
  }
}
```

### Error Response

```json
{
  "error": "Error message",
  "details": ["validation error 1", "validation error 2"]
}
```

### Chat Stream Events

- `assistant_response` - LLM's initial response
- `tool_execution` - Tool execution result
- `tool_error` - Tool execution failure
- `complete` - Final response with metadata

## Troubleshooting During Testing

| Issue               | Cause                | Solution                          |
| ------------------- | -------------------- | --------------------------------- |
| 401 Unauthorized    | Missing auth header  | Add `Authorization: Bearer admin` |
| Tool not found      | Wrong tool name      | Check against defined tools       |
| Validation failed   | Invalid JSON schema  | Check parameters match definition |
| No results in query | Query has no matches | Use valid test data               |
| Timeout error       | Tool took too long   | Increase timeout in config        |
| Cache not working   | Result too large     | Check result size vs limit        |

## Success Criteria

✅ All endpoints respond with expected formats
✅ Security validations prevent attacks
✅ Tools execute without errors
✅ Logging captures all executions
✅ Statistics aggregate correctly
✅ Admin dashboard displays data
✅ Caching improves performance
✅ Configuration changes apply immediately
✅ Rate limiting enforces constraints
✅ Error handling is robust

---

**Ready for production when all checkmarks are verified!**
