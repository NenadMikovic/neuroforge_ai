# Multi-Agent Orchestration System Documentation

## Overview

The Multi-Agent Orchestration System is a custom-built framework that coordinates multiple specialized AI agents to process complex queries intelligently. Rather than routing all queries to a single LLM, the system analyzes intent, decomposes complex tasks, retrieves relevant information, and evaluates outputs through a pipeline of modular agents.

## Architecture

```
User Query
    ↓
Intent Classifier
    ↓
Routing Engine
    ↓
Agent Selection & Planning
    ↓
Parallel/Sequential Execution
    ├→ Planner Agent (task decomposition)
    ├→ Research Agent (RAG retrieval)
    ├→ Tool Agent (operations)
    └→ Critic Agent (evaluation)
    ↓
Output Synthesis
    ↓
Final Response + Metadata
```

## Core Components

### 1. Intent Classifier

Analyzes user queries to determine intent and query complexity.

**Location:** `lib/agents/intentClassifier.ts`

**Capabilities:**

- Classifies intent into categories: planning, research, execution, evaluation
- Detects query complexity: high or low
- Extracts entities (numbers, topics, quoted phrases)
- Calculates confidence scores (0-1)

**Example:**

```typescript
import { IntentClassifier } from "@/lib/agents";

const classifier = new IntentClassifier();
const intent = classifier.classifyIntent("How do I plan a project?");
// Returns: {
//   intent: "organizational-planning",
//   category: "planning",
//   confidence: 0.92,
//   reasoning: "..."
// }
```

**Output Types:**

- `planning`: Step-by-step guidance, workflow creation
- `research`: Information retrieval, background research
- `execution`: Content generation, data analysis
- `evaluation`: Quality review, validation

### 2. Routing Engine

Routes queries to appropriate agents based on intent and complexity.

**Location:** `lib/agents/routingEngine.ts`

**Capabilities:**

- Maps intents to primary agents
- Identifies secondary agents needed
- Determines if parallel execution is possible
- Creates execution plans with dependencies
- Adjusts routing based on agent performance

**Agent Capabilities:**

| Agent        | Purpose                                   | Input Types                          | Output                       |
| ------------ | ----------------------------------------- | ------------------------------------ | ---------------------------- |
| **Planner**  | Breaks down complex queries into subtasks | Complex queries, multi-step problems | Task list, execution plan    |
| **Research** | Retrieves relevant information via RAG    | Factual questions, info requests     | Summaries, source references |
| **Tool**     | Executes operations and generates content | Operational tasks, data processing   | Results, generated content   |
| **Critic**   | Validates output quality and correctness  | Draft outputs, requires validation   | Feedback, recommendations    |

### 3. Agents

#### PlannerAgent

Decomposes complex queries into hierarchical, prioritized subtasks.

**Location:** `lib/agents/plannerAgent.ts`

**Output:**

```typescript
{
  tasks: [
    {
      id: "task-0",
      description: "Research: <topic>",
      type: "research",
      priority: "high",
      dependencies: []
    },
    // ... more tasks
  ],
  thinking: "Detailed breakdown of analysis"
}
```

#### ResearchAgent

Uses the RAG (Retrieval-Augmented Generation) system to find relevant documents.

**Location:** `lib/agents/researchAgent.ts`

**Output:**

```typescript
{
  sources: [
    {
      documentId: "...",
      documentName: "...",
      similarity: 0.87,
      excerpt: "..."
    }
  ],
  summary: "Based on X retrieved sources..."
}
```

#### ToolAgent

Executes structured operations like text analysis, summarization, and data processing.

**Location:** `lib/agents/toolAgent.ts`

**Available Tools:**

- `text-analysis`: Pattern analysis, word frequency, sentiment
- `summarize`: Create concise summaries
- `data-process`: Extract and structure data
- `compare`: Compare items/concepts
- `list`: Create organized lists

**Output:**

```typescript
{
  result: "Operation result",
  toolName: "summarize",
  toolArgs: { ... },
  success: true
}
```

#### CriticAgent

Evaluates outputs against multiple quality criteria.

**Location:** `lib/agents/criticAgent.ts`

**Evaluation Criteria:**

- Completeness (25% weight)
- Clarity (20% weight)
- Coherence (20% weight)
- Accuracy (20% weight)
- Relevance (15% weight)

**Output:**

```typescript
{
  isValid: true,
  confidence: 0.85,
  feedback: "Good quality with room for improvement",
  suggestions: ["...", "..."]
}
```

### 4. Orchestrator

Central coordinator that manages the entire pipeline.

**Location:** `lib/agents/orchestrator.ts`

**Main Methods:**

```typescript
// Process a query through the system
const result = await orchestrator.processQuery(
  conversationId,
  userId,
  "Your query here",
);

// Get performance metrics
const metrics = await orchestrator.getAgentMetrics();

// Get routing statistics
const stats = await orchestrator.getRoutingStatistics();

// Get execution logs
const logs = await orchestrator.getAgentLogs(conversationId);

// Get summary for a conversation
const summary = await orchestrator.getExecutionSummary(conversationId);
```

## Data Models

### AgentTask

Stores task breakdowns from the planner agent.

```prisma
model AgentTask {
  id              String
  conversationId  String
  parentTaskId    String?         // for hierarchical tasks
  originalQuery   String
  taskDescription String
  taskType        String          // "planning", "research", "execution", "evaluation"
  status          String          // "pending", "in-progress", "completed", "failed"
  result          String?
  metadata        String?         // JSON
  createdAt       DateTime
  updatedAt       DateTime
}
```

### AgentLog

Records all agent executions for audit and analysis.

```prisma
model AgentLog {
  id              String
  conversationId  String
  agentType       String          // "planner", "research", "tool", "critic"
  agentName       String
  input           String
  output          String?
  status          String          // "pending", "success", "error"
  errorMessage    String?
  executionTime   Int             // milliseconds
  tokenUsage      Int?
  metadata        String?         // JSON
  createdAt       DateTime
}
```

### AgentMetrics

Tracks performance metrics for each agent type.

```prisma
model AgentMetrics {
  id                   String
  agentType            String          // unique
  totalExecutions      Int
  successCount         Int
  errorCount           Int
  totalExecutionTime   Int             // cumulative
  averageExecutionTime Float
  averageTokenUsage    Int
  routingFrequency     Int
  lastExecution        DateTime
  createdAt            DateTime
}
```

### AgentRoutingLog

Records routing decisions for analysis.

```prisma
model AgentRoutingLog {
  id              String
  conversationId  String
  query           String
  detectedIntent  String
  selectedAgent   String
  confidence      Float           // 0-1
  reasoning       String?
  createdAt       DateTime
}
```

## API Endpoints

### POST /api/agents/orchestrate

Process a query through the multi-agent system.

**Request:**

```json
{
  "conversationId": "conv-123",
  "userId": "user-456",
  "query": "Your question here"
}
```

**Response:**

```json
{
  "success": true,
  "result": {
    "originalQuery": "...",
    "intent": "planning",
    "selectedAgents": ["planner", "research", "critic"],
    "finalOutput": "...",
    "totalExecutionTime": 2450,
    "agentResponses": [
      {
        "agent": "planner",
        "status": "success",
        "output": "...",
        "executionTime": 1200
      }
      // ... more agents
    ]
  }
}
```

### GET /api/agents/metrics

Get agent performance metrics.

**Query Parameters:**

- `metric`: "performance" | "routing" | "logs" | "summary"
- `agentType`: Optional, filter by agent type
- `timeRange`: "24h" | "7d" | "all"

**Example:** `/api/agents/metrics?metric=performance`

**Response:**

```json
{
  "metrics": [
    {
      "agentType": "planner",
      "totalExecutions": 45,
      "successCount": 43,
      "errorCount": 2,
      "averageExecutionTime": 1250,
      "errorRate": 4.44,
      "successRate": 95.56,
      "routingFrequency": 25
    }
    // ... more agents
  ]
}
```

## Dashboard

Access the Agent Dashboard at `/agents` to view:

- **Summary Cards**
  - Total Executions
  - Success Rate
  - Average Response Time
  - Routing Decisions

- **Agent Performance Table**
  - Executions per agent
  - Success rates
  - Average response times
  - Error rates
  - Routing frequency

- **Intent Distribution**
  - Breakdown of detected intents
  - Frequency analysis

- **Agent Selection Frequency**
  - How often each agent is selected
  - Distribution across agent types

## Integration Guide

### Basic Integration

```typescript
import { AgentOrchestrator } from "@/lib/agents";

const orchestrator = new AgentOrchestrator({
  enableParallel: true,
  enableLogging: true,
  timeout: 30000,
});

const result = await orchestrator.processQuery(
  conversationId,
  userId,
  userMessage,
);

// Use result.finalOutput as the assistant response
```

### Configuration Options

```typescript
interface OrchestratorConfig {
  enableParallel?: boolean; // Allow parallel agent execution
  enableLogging?: boolean; // Log all executions to DB
  timeout?: number; // Timeout per agent in ms
}
```

### Chat Integration

To integrate with your chat system:

1. Add optional `enableAgentSystem` flag to chat requests
2. If enabled, route through `AgentOrchestrator.processQuery()`
3. Include agent metadata in response (intent, agents used, exec time)
4. Display agent information in UI

## Performance Considerations

- **Parallel Execution**: Enabled by default for independent agents
- **Database Logging**: Optional, can be disabled for high-throughput scenarios
- **Timeouts**: Default 30 seconds per agent, configurable
- **Memory**: Agents maintain reference to RAG service and database

## Monitoring

### Key Metrics to Monitor

1. **Success Rate**: Percentage of successful executions
2. **Error Rate**: Percentage of failed executions
3. **Average Response Time**: Mean execution time per agent
4. **Routing Confidence**: Confidence scores of routing decisions
5. **Intent Distribution**: Which types of queries are most common

### Health Indicators

- Success rates should be > 95%
- Error rates should be < 5%
- Response times should be < 3 seconds (excluding RAG delays)
- Routing confidence should be > 0.7 on average

## Advanced Features

### Custom Tool Registration

Extend ToolAgent with custom tools:

```typescript
// In ToolAgent.registerTools()
this.tools.set("custom-tool", {
  name: "custom-tool",
  description: "...",
  keywords: ["..."],
  execute: async (input) => {
    // Implementation
  },
});
```

### Performance Analysis

```typescript
const metrics = await orchestrator.getAgentMetrics();

const analysis = metrics.map((m) => ({
  agent: m.agentType,
  successRate: (m.successCount / m.totalExecutions) * 100,
  avgTime: m.averageExecutionTime,
  efficiency: m.averageExecutionTime * (1 - m.errorCount / m.totalExecutions),
}));
```

### Batch Processing

```typescript
for (const query of queries) {
  const result = await orchestrator.processQuery(conversationId, userId, query);
  // Process result
}
```

## Troubleshooting

### Common Issues

**Issue: Agent timeout**

- Increase timeout in config
- Check database performance
- Verify RAG service is responsive

**Issue: High error rate for specific agent**

- Check agent implementation
- Review error logs
- Consider fallback mechanisms

**Issue: Slow routing decisions**

- Check IntentClassifier performance
- Profile RoutingEngine logic
- Consider caching classification results

## Future Enhancements

- [ ] Agent caching for similar queries
- [ ] Dynamic weight adjustment based on performance
- [ ] Multi-language support
- [ ] Custom agent templates
- [ ] Real-time monitoring dashboard
- [ ] Agent failure recovery strategies
- [ ] Cost optimization (token usage tracking)
