-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "parentTaskId" TEXT,
    "originalQuery" TEXT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentTask_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "executionTime" INTEGER NOT NULL,
    "tokenUsage" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentType" TEXT NOT NULL,
    "totalExecutions" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "totalExecutionTime" INTEGER NOT NULL DEFAULT 0,
    "averageExecutionTime" REAL NOT NULL DEFAULT 0,
    "averageTokenUsage" INTEGER NOT NULL DEFAULT 0,
    "routingFrequency" INTEGER NOT NULL DEFAULT 0,
    "lastExecution" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AgentRoutingLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "detectedIntent" TEXT NOT NULL,
    "selectedAgent" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "reasoning" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentRoutingLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AgentTask_conversationId_idx" ON "AgentTask"("conversationId");

-- CreateIndex
CREATE INDEX "AgentTask_parentTaskId_idx" ON "AgentTask"("parentTaskId");

-- CreateIndex
CREATE INDEX "AgentTask_status_idx" ON "AgentTask"("status");

-- CreateIndex
CREATE INDEX "AgentLog_conversationId_idx" ON "AgentLog"("conversationId");

-- CreateIndex
CREATE INDEX "AgentLog_agentType_idx" ON "AgentLog"("agentType");

-- CreateIndex
CREATE INDEX "AgentLog_status_idx" ON "AgentLog"("status");

-- CreateIndex
CREATE INDEX "AgentLog_createdAt_idx" ON "AgentLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentMetrics_agentType_key" ON "AgentMetrics"("agentType");

-- CreateIndex
CREATE INDEX "AgentMetrics_agentType_idx" ON "AgentMetrics"("agentType");

-- CreateIndex
CREATE INDEX "AgentRoutingLog_conversationId_idx" ON "AgentRoutingLog"("conversationId");

-- CreateIndex
CREATE INDEX "AgentRoutingLog_detectedIntent_idx" ON "AgentRoutingLog"("detectedIntent");

-- CreateIndex
CREATE INDEX "AgentRoutingLog_selectedAgent_idx" ON "AgentRoutingLog"("selectedAgent");

-- CreateIndex
CREATE INDEX "AgentRoutingLog_createdAt_idx" ON "AgentRoutingLog"("createdAt");
