-- CreateTable
CREATE TABLE "ToolExecutionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "toolCallId" TEXT NOT NULL,
    "paramsHash" TEXT NOT NULL,
    "executionTime" INTEGER NOT NULL,
    "resultHash" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "resultSize" INTEGER NOT NULL,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ToolConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "globalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "toolSettings" TEXT NOT NULL,
    "loggingConfig" TEXT NOT NULL,
    "securityConfig" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ConversationMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "embedding" BLOB NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "keyTopics" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MetricsRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "latency" INTEGER NOT NULL,
    "agentType" TEXT,
    "toolUsed" TEXT,
    "modelUsed" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "errorOccurred" BOOLEAN NOT NULL DEFAULT false,
    "errorType" TEXT,
    "retrievalHit" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SecurityAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "threatType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "suspicious_input" TEXT,
    "action_taken" TEXT NOT NULL,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ToolExecutionLog_conversationId_idx" ON "ToolExecutionLog"("conversationId");

-- CreateIndex
CREATE INDEX "ToolExecutionLog_userId_idx" ON "ToolExecutionLog"("userId");

-- CreateIndex
CREATE INDEX "ToolExecutionLog_toolName_idx" ON "ToolExecutionLog"("toolName");

-- CreateIndex
CREATE INDEX "ToolExecutionLog_success_idx" ON "ToolExecutionLog"("success");

-- CreateIndex
CREATE INDEX "ToolExecutionLog_createdAt_idx" ON "ToolExecutionLog"("createdAt");

-- CreateIndex
CREATE INDEX "ToolConfiguration_globalEnabled_idx" ON "ToolConfiguration"("globalEnabled");

-- CreateIndex
CREATE INDEX "ConversationMemory_userId_idx" ON "ConversationMemory"("userId");

-- CreateIndex
CREATE INDEX "ConversationMemory_conversationId_idx" ON "ConversationMemory"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationMemory_createdAt_idx" ON "ConversationMemory"("createdAt");

-- CreateIndex
CREATE INDEX "MetricsRecord_userId_idx" ON "MetricsRecord"("userId");

-- CreateIndex
CREATE INDEX "MetricsRecord_conversationId_idx" ON "MetricsRecord"("conversationId");

-- CreateIndex
CREATE INDEX "MetricsRecord_agentType_idx" ON "MetricsRecord"("agentType");

-- CreateIndex
CREATE INDEX "MetricsRecord_toolUsed_idx" ON "MetricsRecord"("toolUsed");

-- CreateIndex
CREATE INDEX "MetricsRecord_createdAt_idx" ON "MetricsRecord"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_userId_idx" ON "SecurityAuditLog"("userId");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_threatType_idx" ON "SecurityAuditLog"("threatType");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_severity_idx" ON "SecurityAuditLog"("severity");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_is_blocked_idx" ON "SecurityAuditLog"("is_blocked");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_createdAt_idx" ON "SecurityAuditLog"("createdAt");
