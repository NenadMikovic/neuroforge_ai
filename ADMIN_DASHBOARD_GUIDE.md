# Enterprise Admin Dashboard

## Overview

The Admin Dashboard provides comprehensive system monitoring, analytics, and diagnostics for the NeuroForge AI system. All components use **dark mode by default** with slate-900/slate-800 backgrounds.

## Dashboard Pages

### 1. **Main Dashboard** (`/admin/dashboard`)

The central hub showing:

- **System Health Status** - Real-time checks for LLM primary/fallback, database, and configuration
- **Health Overview Cards** - Quick status of all critical services
- **Metrics Summary** - 24-hour metrics: requests, tokens, latency, success/error rates
- **Navigation Cards** - Links to specialized views

**Features:**

- Auto-refresh every 30 seconds
- Color-coded status indicators (green=healthy, yellow=degraded, red=unhealthy)
- HTTP status codes (200 for healthy, 503 for degraded/unhealthy)

### 2. **Agent Inspector** (`/admin/agents`)

Monitor agent execution and performance:

- **Agent Execution Logs** - See every agent run with status, model, duration, tokens
- **Status Filtering** - Filter by success/failure/partial/timeout
- **Detailed View Panel** - Inspect individual executions with:
  - Prompt and response text
  - Model used and token count
  - Tools called and execution time
  - Error details if failed

**Metrics Tracked:**

- Agent type and execution status
- LLM model chosen
- Token usage per agent
- Execution duration
- Tool calls made
- Error classification and messages

### 3. **Tool Explorer** (`/admin/tools`)

Analyze tool execution history:

- **Tool Statistics** - Success rates, average duration, total calls per tool
- **Execution History** - Browse individual tool calls with input/output
- **Performance Analysis** - Identify slow or failing tools
- **Agent Context** - See which agents are calling which tools

**Tool Metrics:**

- Total calls per tool
- Success/failure breakdown
- Average execution duration
- Success rate percentage
- Detailed input/output logs

### 4. **Retrieval Source Explorer** (`/admin/retrieval`)

Understand document retrieval performance:

- **Retrieved Documents** - View statistics on which documents are retrieved most
- **Retrieval Queries** - Browse individual retrieval operations with results
- **Relevance Scores** - See similarity scores (0-1) for each document chunk
- **Document Ranking** - Visual representation of relevance rankings

**Retrieval Insights:**

- Query text and processing duration
- Retrieved document titles and relevance scores
- Chunk indices for exact location tracking
- Document excerpt previews
- Retrieval model used

### 5. **Conversation Analytics** (`/admin/conversations`)

Deep dive into conversation patterns:

- **Conversation Statistics** - Overall metrics (message count, tokens, duration)
- **Agent Distribution** - Which agents are used most frequently
- **Tool Distribution** - Which tools are called in conversations
- **Conversation Explorer** - Browse individual conversations with details

**Conversation Metrics:**

- Total conversations and message count
- Average tokens per conversation
- Conversation duration and status
- Agents used per conversation
- Tools invoked per conversation
- User engagement patterns

### 6. **System Logs** (`/admin/logs`)

Structured logging and error tracking:

- **Log Filtering** - Filter by level (debug/info/warn/error/fatal) and module
- **Search** - Full-text search across log messages and errors
- **Error Details** - Classified errors with category and severity
- **Context Tracking** - User IDs, conversation IDs, request IDs, operation durations

**Log Features:**

- 5 log levels with color coding
- Request context stacking (nested operations)
- Error classification (11 categories)
- Module-based filtering
- Timestamp and duration tracking

## Architecture

### Data Sources

All dashboard components fetch from enterprise service layers:

```
Admin Dashboard Pages
           ↓
    API Endpoint Routes
           ↓
    Service Layers (Logger, ErrorClassifier, LLMService)
           ↓
    Database (Prisma) & External Services (Ollama)
```

### Key Integration Points

1. **Health Endpoint** (`/api/health`)
   - LLM primary/fallback status + latency
   - Database connectivity check
   - Configuration validation

2. **Metrics API** (`/api/evaluation/metrics`)
   - Token usage aggregation
   - Latency tracking
   - Success/error rates

3. **Agent Metrics** (`/api/agents/metrics`)
   - Agent execution history
   - Tool call tracking
   - Performance statistics

4. **Chat API** (`/api/chat`)
   - Conversation data
   - Message history
   - Agent/tool usage per conversation

### Service Layer Usage

All dashboard components use the new enterprise services:

- **Logger** - Structured logging with context stacking
- **ErrorClassifier** - 11 error categories with retryability + severity
- **ConfigManager** - Environment-driven configuration with toggles
- **LLMService** - Primary→fallback model switching with health tracking
- **MetricsService** - Token/latency/error aggregation

## Dark Mode Compliance

All admin dashboard components follow dark mode standards:

✅ Background colors:

- Primary: `bg-slate-950` (darkest)
- Secondary: `bg-slate-900/50` (with transparency)
- Cards: `border border-slate-700`

✅ Text colors:

- Primary: `text-slate-100`
- Secondary: `text-gray-400`
- Disabled: `text-gray-500`

✅ Accent colors (semantic):

- Success: `text-green-400`, `bg-green-500/20`
- Warning: `text-yellow-400`, `bg-yellow-500/20`
- Error: `text-red-400`, `bg-red-500/20`
- Info: `text-blue-400`, `bg-blue-500/20`

## Usage Examples

### Diagnosing a Failed Request

1. Visit `/admin/dashboard` to check system health
2. If LLM is degraded, check `/admin/agents` to see which agents failed
3. Review metrics at `/admin/dashboard` or `/evaluation`
4. Check `/admin/logs` for detailed error messages

### Analyzing Tool Performance

1. Go to `/admin/tools`
2. Click tools to see execution statistics
3. Identify slow or failing tools
4. View context showing which agents called the tools

### Understanding Retrieval Issues

1. Open `/admin/retrieval`
2. Review relevance scores for your queries
3. Check if expected documents are being retrieved
4. Verify document ranking and chunk selection

## API Contracts

### Health Check Response

```typescript
GET /api/health
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  timestamp: string,
  checks: {
    llm: { primary: boolean, fallback: boolean, latency: number },
    database: boolean,
    config: { loaded: boolean, llmConfigured: boolean }
  }
}
```

### Metrics Response

```typescript
GET /api/evaluation/metrics?days=1
{
  data: {
    metrics: {
      totalRequests: number,
      totalTokens: number,
      averageLatency: number,
      errorRate: number,
      successRate: number
    }
  }
}
```

## Future Enhancements

- [ ] Real-time charts using Chart.js or Recharts
- [ ] Time-series data visualization (token usage over time, latency trends)
- [ ] Alert configuration (notify on degradation, error spikes)
- [ ] Export reports (PDF, CSV) for compliance/audit
- [ ] WebSocket support for real-time log streaming
- [ ] Custom dashboard widgets and drag-and-drop layout
- [ ] Integration with external monitoring (Datadog, New Relic)
- [ ] Cost analysis per conversation/agent/tool
- [ ] ML model recommendation based on usage patterns

## Security Note

The admin dashboard is currently unprotected (visible to all). In production:

1. Add authentication middleware to `/admin/*` routes
2. Implement role-based access control (admin-only)
3. Audit log all admin dashboard access
4. Consider IP whitelisting for ops team

Example protection:

```typescript
// app/admin/layout.tsx
import { requireAuth, requireAdminRole } from "@/lib/auth";

export default async function AdminLayout({ children }) {
  await requireAuth();
  await requireAdminRole();
  return children;
}
```

## Troubleshooting

### "Failed to fetch metrics"

- Check `/api/health` to see if services are up
- Verify database migrations have run
- Check browser console for CORS errors

### Missing data in charts

- Data comes from real system data for new installations
- Run conversations to generate real metrics
- Check database tables exist: `Conversation`, `Message`, `Metrics`

### Slow dashboard load

- Check network tab for slow API endpoints
- Consider adding pagination to long lists
- Implement data caching if hitting APIs frequently
