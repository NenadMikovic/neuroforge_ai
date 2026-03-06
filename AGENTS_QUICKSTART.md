# Multi-Agent System - Quick Start Guide

## 🚀 Quick Start

### 1. Basic Usage

```typescript
import { AgentOrchestrator } from "@/lib/agents";

const orchestrator = new AgentOrchestrator();

const result = await orchestrator.processQuery(
  conversationId, // e.g., "conv-123"
  userId, // e.g., "user-456"
  "Your question here",
);

console.log(result.finalOutput); // The synthesized agent response
```

### 2. Access the Dashboard

Visit: `http://localhost:3000/agents`

View real-time metrics including:

- Total executions
- Success rates
- Response times
- Error rates
- Agent routing frequency

### 3. Test the System

Visit: `http://localhost:3000/agents/demo`

Interact with the agent system through a web interface and see:

- Intent classification
- Agent selection
- Individual agent responses
- Total execution time

## 📊 Available Endpoints

### Query Processing

```
POST /api/agents/orchestrate
```

Process a query through the multi-agent system.

### Metrics & Analytics

```
GET /api/agents/metrics?metric=performance
GET /api/agents/metrics?metric=routing&timeRange=24h
GET /api/agents/metrics?metric=summary
```

## 🧠 Agent Overview

| Agent           | Purpose               | Use When                            |
| --------------- | --------------------- | ----------------------------------- |
| **Planner** 🎯  | Task decomposition    | Query is complex or multi-part      |
| **Research** 🔍 | Information retrieval | Question needs document context     |
| **Tool** 🔧     | Operations & analysis | Need to generate or process content |
| **Critic** ✅   | Quality evaluation    | Want to validate or review output   |

## 📈 Monitoring

### Check Agent Performance

```typescript
const metrics = await orchestrator.getAgentMetrics();

metrics.forEach((m) => {
  console.log(`${m.agentType}: ${m.successRate}% success`);
});
```

### Get Routing Statistics

```typescript
const routing = await orchestrator.getRoutingStatistics();

console.log(`Total routing decisions: ${routing.totalRoutingDecisions}`);
console.log(`Average confidence: ${routing.averageConfidence}`);
```

### View Execution Logs

```typescript
const logs = await orchestrator.getAgentLogs(conversationId);

logs.forEach((log) => {
  console.log(`[${log.agentType}] ${log.status} - ${log.executionTime}ms`);
});
```

## 🔧 Configuration

```typescript
const orchestrator = new AgentOrchestrator({
  enableParallel: true, // Allow parallel agent execution
  enableLogging: true, // Log to database
  timeout: 30000, // 30 second timeout per agent
});
```

## 📝 Common Patterns

### Pattern 1: Simple Query

```typescript
const result = await orchestrator.processQuery(
  conversationId,
  userId,
  "What is machine learning?",
);
// Routes to: Research Agent
```

### Pattern 2: Complex Inquiry

```typescript
const result = await orchestrator.processQuery(
  conversationId,
  userId,
  "How do I build a machine learning model? Break it down step by step.",
);
// Routes to: Planner Agent → Research Agent → Critic Agent
```

### Pattern 3: Content Generation

```typescript
const result = await orchestrator.processQuery(
  conversationId,
  userId,
  "Create a summary of AI concepts",
);
// Routes to: Tool Agent → Critic Agent
```

## 🎯 Intent Classification

The system automatically detects:

- **Planning** 📋: "How do I...", "Create a plan", "Break down"
- **Research** 📚: "What is...", "Find", "Research", "Tell me about"
- **Execution** ⚙️: "Generate", "Create", "Analyze", "Summarize"
- **Evaluation** 🏆: "Review", "Evaluate", "Check quality", "Verify"

## 📊 Database Schema

New tables automatically created:

- `AgentTask` - Task breakdowns
- `AgentLog` - Execution records
- `AgentMetrics` - Performance statistics
- `AgentRoutingLog` - Routing decisions

## 🔍 Debugging

### View Recent Logs

```typescript
const logs = await orchestrator.getAgentLogs(conversationId, 10);
logs.forEach((log) => {
  console.log(`${log.agentType}: ${log.status}`);
  if (log.errorMessage) console.log(`Error: ${log.errorMessage}`);
});
```

### Check if Agent Failed

```typescript
const metrics = await orchestrator.getAgentMetrics();
const agent = metrics.find((m) => m.agentType === "research");
if (agent?.errorCount > agent?.successCount) {
  console.warn("Research agent has high error rate!");
}
```

## 💡 Troubleshooting

**Q: Agents running slowly?**

- Check database performance
- Verify RAG service is responsive
- Monitor network latency

**Q: High error rates?**

- Review error logs in database
- Check input validation
- Verify RAG documents are indexed

**Q: Wrong agent selected?**

- Check IntentClassifier logic
- Review routing rules
- Analyze routing confidence scores

## 📚 Full Documentation

See `AGENTS_DOCUMENTATION.md` for:

- Complete architecture overview
- API reference
- Advanced features
- Integration guides
- Performance tuning

## 🎬 Next Steps

1. **View Dashboard**: `/agents`
2. **Try Demo**: `/agents/demo`
3. **Integrate with Chat**: Modify `/api/chat/route.ts`
4. **Monitor Performance**: Set up alerts based on metrics
5. **Customize Agents**: Add domain-specific logic
6. **Optimize Routing**: Adjust based on your workload

## 📞 Support

For issues or questions:

1. Check error logs: `GET /api/agents/metrics?metric=logs`
2. Review AGENTS_DOCUMENTATION.md
3. Check agent implementations in `/lib/agents/`
4. Enable debug logging in orchestrator
