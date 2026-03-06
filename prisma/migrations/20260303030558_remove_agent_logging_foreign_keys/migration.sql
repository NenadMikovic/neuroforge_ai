-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentLog" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AgentLog" ("agentName", "agentType", "conversationId", "createdAt", "errorMessage", "executionTime", "id", "input", "metadata", "output", "status", "tokenUsage") SELECT "agentName", "agentType", "conversationId", "createdAt", "errorMessage", "executionTime", "id", "input", "metadata", "output", "status", "tokenUsage" FROM "AgentLog";
DROP TABLE "AgentLog";
ALTER TABLE "new_AgentLog" RENAME TO "AgentLog";
CREATE INDEX "AgentLog_conversationId_idx" ON "AgentLog"("conversationId");
CREATE INDEX "AgentLog_agentType_idx" ON "AgentLog"("agentType");
CREATE INDEX "AgentLog_status_idx" ON "AgentLog"("status");
CREATE INDEX "AgentLog_createdAt_idx" ON "AgentLog"("createdAt");
CREATE TABLE "new_AgentRoutingLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "detectedIntent" TEXT NOT NULL,
    "selectedAgent" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "reasoning" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AgentRoutingLog" ("confidence", "conversationId", "createdAt", "detectedIntent", "id", "query", "reasoning", "selectedAgent") SELECT "confidence", "conversationId", "createdAt", "detectedIntent", "id", "query", "reasoning", "selectedAgent" FROM "AgentRoutingLog";
DROP TABLE "AgentRoutingLog";
ALTER TABLE "new_AgentRoutingLog" RENAME TO "AgentRoutingLog";
CREATE INDEX "AgentRoutingLog_conversationId_idx" ON "AgentRoutingLog"("conversationId");
CREATE INDEX "AgentRoutingLog_detectedIntent_idx" ON "AgentRoutingLog"("detectedIntent");
CREATE INDEX "AgentRoutingLog_selectedAgent_idx" ON "AgentRoutingLog"("selectedAgent");
CREATE INDEX "AgentRoutingLog_createdAt_idx" ON "AgentRoutingLog"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
