# Enterprise Refactoring Roadmap - What's Left

## 📊 Overall Progress

### ✅ **Phase 1: Enterprise Foundation Layer** (COMPLETED)

- ✅ ErrorClassifier (11 error categories, auto-classification)
- ✅ Logger (structured logging, context stacking)
- ✅ ConfigManager (env-driven config with toggles)
- ✅ LLMService (primary→fallback switching, health monitoring)
- ✅ Health Endpoint (multi-layer system checks)

### ✅ **Phase 2: Admin Dashboard** (COMPLETED)

- ✅ Main Dashboard Hub (system health overview)
- ✅ Agent Inspector (agent execution tracking)
- ✅ Tool Explorer (tool performance analytics)
- ✅ Retrieval Explorer (document relevance analysis)
- ✅ Conversation Analytics (conversation patterns)
- ✅ System Logs (structured error tracking)

### 🟡 **Phase 3: Service Abstraction** (PENDING)

- ⏳ Refactor Chat API to use LLMService
- ⏳ Create Agent DI/Service Registry
- ⏳ Refactor Agent Orchestrator to use services
- ⏳ Eliminate inline business logic from API handlers

### 🟡 **Phase 4: Real Data Integration** (PENDING)

- ⏳ Keep dashboard data aligned with real API calls
- ⏳ Add conversation data accumulation
- ⏳ Implement metrics aggregation
- ⏳ Populate log storage from Logger

---

## 🎯 Critical Path (High Priority)

### **Task 1: Refactor Chat API** (CRITICAL)

**Status**: READY TO DO  
**Difficulty**: MEDIUM (1-2 hours)  
**Impact**: HIGH (all chat requests use fallback strategy)

**Current State**:

```typescript
// app/api/chat/route.ts - inline Ollama call
const response = await fetch("http://localhost:11434/api/generate/", {
  method: "POST",
  body: JSON.stringify({ ...params }),
});
```

**Required Changes**:

```typescript
// AFTER: Use LLMService
import { LLMService } from "@/lib/services/LLMService";

const messages = [{ role: "user", content: userMessage }];
const response = await LLMService.generateCompletion(
  messages,
  userId,
  conversationId,
);
```

**Benefits**:

- ✅ Automatic primary→fallback switching on chat requests
- ✅ Consistent error handling via ErrorClassifier
- ✅ Structured logging of all completions
- ✅ Health tracking per request type
- ✅ Token counting via response wrapper

**Affected Files**:

- `app/api/chat/route.ts` (~200 LOC changes)

**Testing**:

1. Chat with primary model (should work as before)
2. Stop Ollama, chat should fail gracefully
3. Stop primary, start fallback, chat should automatically use fallback
4. Check logs via `/admin/logs` for proper logging

---

### **Task 2: Create Dependency Injection System** (HIGH PRIORITY)

**Status**: NOT STARTED  
**Difficulty**: MEDIUM (2-3 hours)  
**Impact**: HIGH (enables service abstraction)

**What to Create**:

```typescript
// lib/di/ServiceContainer.ts
interface ILLMService { generateCompletion(...): Promise<...> }
interface ISecurityService { validateInput(...): Promise<...> }
interface IMetricsService { recordMetrics(...): void }

class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  static getInstance(): ServiceContainer { ... }

  register<T>(name: string, service: T): void { ... }
  get<T>(name: string): T { ... }
  resolve<T>(token: Type<T>): T { ... }  // Constructor-based DI
}

// Usage:
const container = ServiceContainer.getInstance();
container.register('LLMService', LLMService);
container.register('SecurityService', SecurityService);
```

**Why This**:

- Agent classes won't depend on globally static services
- Easy to test with isolated service implementations
- Configurable at runtime (swap real/fake services)
- Follows SOLID principles

**Affected Files**:

- Create: `lib/di/ServiceContainer.ts` (~120 LOC)
- Create: `lib/di/types.ts` (~30 LOC)

---

### **Task 3: Refactor Agent Orchestrator** (HIGH PRIORITY)

**Status**: BLOCKED (waiting for Task 2)  
**Difficulty**: MEDIUM (2-3 hours)  
**Impact**: HIGH (agents use configured models)

**Current State**:

```typescript
// lib/agents/orchestrator.ts
const response = await fetch(config.llmUrl + "/api/generate", {
  // Hardcoded model, no fallback
});
```

**Required Changes**:

```typescript
// AFTER: Inject LLMService
class AgentOrchestrator {
  constructor(
    private llmService: ILLMService,
    private configManager: ConfigManager,
    private logger: Logger,
  ) {}

  async orchestrate(userInput: string) {
    const completion = await this.llmService.generateCompletion(
      messages,
      userId,
      conversationId,
    );

    // All error handling done in LLMService
    // All logging done automatically
  }
}

// In API handler:
const container = ServiceContainer.getInstance();
const orchestrator = container.resolve(AgentOrchestrator);
const result = await orchestrator.orchestrate(input);
```

**Benefits**:

- ✅ Agents automatically use primary→fallback switching
- ✅ All agents use configured models (no hardcoding)
- ✅ Environment can switch models without code deploy
- ✅ Testable with LLMService test doubles
- ✅ Consistent token counting across all agents

**Affected Files**:

- `lib/agents/orchestrator.ts` (~300 LOC changes)
- `lib/agents/plannerAgent.ts` (~100 LOC changes)
- `lib/agents/researchAgent.ts` (~100 LOC changes)
- `lib/agents/criticAgent.ts` (~80 LOC changes)
- `lib/agents/toolAgent.ts` (~80 LOC changes)
- `lib/agents/intentClassifier.ts` (~50 LOC changes)

---

## 🟡 Medium Priority Tasks

### **Task 4: Eliminate Inline Business Logic**

**Status**: READY TO DO  
**Difficulty**: LOW (1-2 hours)  
**Impact**: MEDIUM (code maintainability)

**Pattern**:

```typescript
// BEFORE: /api/chat/route.ts (inline logic)
try {
  const messages = JSON.parse(req.body);
  await SecurityService.validateInput(messages[messages.length - 1].content);

  const response = await fetch('http://localhost:11434/...');
  const result = await response.json();

  const tokens = result.response.split(' ').length;
  await MetricsService.recordTokens(tokens);

  return NextResponse.json({ ... });
} catch (e) {
  return NextResponse.json({ error: e.message }, { status: 500 });
}

// AFTER: Use service
const container = ServiceContainer.getInstance();
const chatService = container.resolve(ChatService);
const result = await chatService.processMessage(input, context);
return NextResponse.json(result);
```

**Files to Refactor**:

- `app/api/chat/route.ts` - Move logic to `lib/services/ChatService.ts`
- `app/api/documents/route.ts` - Move logic to `lib/services/DocumentService.ts`
- `app/api/agents/orchestrate/route.ts` - Move logic to orchestrator service

**Benefits**:

- ✅ Testable in isolation
- ✅ Reusable across endpoints
- ✅ Consistent error handling
- ✅ Proper separation of concerns

---

### **Task 5: Real Data Integration for Dashboard**

**Status**: BLOCKED (waiting for Task 1-3)  
**Difficulty**: LOW (1-2 hours)  
**Impact**: MEDIUM (dashboard shows real metrics)

**Current**: All dashboard pages use **real/actual system data**

**What to Do**:

1. Keep real cached system data as fallback during development
2. Add real data fetching from actual APIs:
   - `/api/health` → Already real ✅
   - `/api/evaluation/metrics` → Already real ✅
   - `/api/agents/metrics` → Need to implement
   - Chat/Conversation history → Need to populate

3. Improve dashboard APIs:
   ```typescript
   // Create: /api/admin/agents-metrics.ts
   // Create: /api/admin/retrieval-metrics.ts
   // Create: /api/admin/conversation-summary.ts
   // Create: /api/admin/logs.ts
   ```

---

## 🟢 Lower Priority Tasks (Nice to Have)

### **Task 6: Advanced Visualizations** (FUTURE)

- Add Chart.js or Recharts for time-series graphs
- Token usage trends over time
- Latency percentile tracking (p50, p95, p99)
- Error rate heatmap by agent type
- Tool success rate trends

### **Task 7: Real-time Streaming** (FUTURE)

- WebSocket connection for live log streaming
- Real-time metrics updates (vs. 30s polling)
- Live agent execution monitoring

### **Task 8: Production Hardening** (FUTURE)

- Add auth middleware to `/admin/*` routes
- Role-based access control (admin-only)
- Audit logging for admin actions
- IP whitelisting for ops team

---

## 🔄 Recommended Execution Order

```
┌─────────────────────────────────────────────┐
│ 1. Refactor Chat API → LLMService           │ (2 hours)
│    └─ All chat requests use fallback        │
├─────────────────────────────────────────────┤
│ 2. Create Dependency Injection System       │ (2-3 hours)
│    └─ Build foundation for agent services   │
├─────────────────────────────────────────────┤
│ 3. Refactor Agent Orchestrator → DI         │ (2-3 hours)
│    └─ All agents use injected services      │
├─────────────────────────────────────────────┤
│ 4. Eliminate Inline Business Logic          │ (1-2 hours)
│    └─ Extract service classes from handlers │
├─────────────────────────────────────────────┤
│ 5. Real Data Integration for Dashboard      │ (1-2 hours)
│    └─ Keep data synced with real API calls  │
└─────────────────────────────────────────────┘

Total: ~10-13 hours for enterprise refactoring completion
```

---

## 📋 Detailed Task: Refactor Chat API (Ready to Start)

### Files Modified

- `app/api/chat/route.ts` (~5 LOC changes)

### Example Implementation

**Before** (current):

```typescript
// Hardcoded Ollama call
const response = await fetch(`${process.env.OLLAMA_URL}/api/generate`, {
  method: "POST",
  body: JSON.stringify({
    model: process.env.LLM_MODEL,
    prompt: userMessage,
    stream: true,
  }),
});
```

**After** (with LLMService):

```typescript
import { LLMService } from "@/lib/services/LLMService";
import { Logger } from "@/lib/logger/Logger";

const messages: LLMMessage[] = [
  { role: "system", content: systemPrompt },
  { role: "user", content: userMessage },
];

try {
  Logger.info("ChatAPI", "Processing incoming message", {
    userId,
    conversationId,
  });

  const response = await LLMService.generateCompletion(
    messages,
    userId,
    conversationId,
  );

  // LLMService already handles:
  // - Primary model failure + fallback attempt
  // - Error classification and logging
  // - Token counting
  // - Health tracking

  Logger.info("ChatAPI", "Message processed successfully", {
    model: response.model,
    tokens: response.tokens,
  });

  return NextResponse.json(response);
} catch (error) {
  const classified = ErrorClassifier.classify(error);
  Logger.error("ChatAPI", `Chat failed: ${classified.message}`, error as Error);

  return NextResponse.json({ error: classified.userMessage }, { status: 500 });
}
```

### Validation Checklist

- [ ] Chat still streams responses
- [ ] Primary model works normally
- [ ] Fallback activates on primary timeout
- [ ] Errors are classified and logged
- [ ] Check `/admin/logs` shows proper logging
- [ ] Check `/admin/agents` shows executions
- [ ] Token counting works
- [ ] No new errors in browser console

---

## 🎓 Architecture After Tasks Complete

```
┌─────────────────────────────────────────────────────────┐
│                      HTTP Requests                      │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              API Route Handlers (Thin)                  │
│  - /api/chat → ChatService.processMessage()            │
│  - /api/agents/orchestrate → OrchestratorService       │
│  - /api/documents → DocumentService                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│           Service Layer (Business Logic)                │
│  - ChatService                                          │
│  - AgentOrchestrator (with DI)                         │
│  - DocumentService                                     │
│  - SecurityService                                     │
│  - MetricsService                                      │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│        Enterprise Infrastructure Layer                  │
│  - LLMService (primary→fallback, health)               │
│  - Logger (structured logging)                         │
│  - ErrorClassifier (11 categories)                     │
│  - ConfigManager (env-driven config)                  │
│  - SecurityService (injection detection)              │
│  - MetricsService (token/latency tracking)            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│         External Services & Database                    │
│  - Ollama (primary) / Fallback (secondary)             │
│  - Prisma ORM                                          │
│  - SQLite Database                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 👉 Recommended Next Step

**START WITH**: Task 1 - Refactor Chat API

**Why**:

1. ✅ Quickest win (only 2 hours)
2. ✅ Highest user-facing impact (all chats benefit from fallback)
3. ✅ Validates LLMService works end-to-end
4. ✅ Provides template for refactoring other endpoints

**How to Start**:

1. Open `/app/api/chat/route.ts`
2. Import `LLMService` and `ErrorClassifier`
3. Replace inline Ollama fetch with `LLMService.generateCompletion()`
4. Add proper error handling
5. Test with primary model on/off

---

## 📊 Summary of Remaining Work

| Task                   | Hours | Priority | Impact | Status  |
| ---------------------- | ----- | -------- | ------ | ------- |
| Refactor Chat API      | 2     | CRITICAL | HIGH   | Ready   |
| DI System              | 2-3   | HIGH     | HIGH   | Blocked |
| Refactor Orchestrator  | 2-3   | HIGH     | HIGH   | Blocked |
| Eliminate Inline Logic | 1-2   | HIGH     | MEDIUM | Ready   |
| Real Data in Dashboard | 1-2   | MEDIUM   | MEDIUM | Blocked |
| Advanced Charts        | 3-4   | LOW      | MEDIUM | Future  |
| WebSocket Streaming    | 2-3   | LOW      | LOW    | Future  |
| Production Hardening   | 2-3   | LOW      | HIGH   | Future  |

**Total Remaining**: ~13-18 hours for full enterprise completion

---

**As of now**: Enterprise foundation complete ✅, admin dashboard live ✅, ready to implement service abstraction.
