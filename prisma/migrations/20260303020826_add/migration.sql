-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RetrievalMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "lastRetrieved" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RetrievalMetric_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RetrievalMetric_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "DocumentChunk" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RetrievalMetric" ("chunkId", "createdAt", "documentId", "hitCount", "id", "lastRetrieved", "userId") SELECT "chunkId", "createdAt", "documentId", "hitCount", "id", "lastRetrieved", "userId" FROM "RetrievalMetric";
DROP TABLE "RetrievalMetric";
ALTER TABLE "new_RetrievalMetric" RENAME TO "RetrievalMetric";
CREATE INDEX "RetrievalMetric_documentId_idx" ON "RetrievalMetric"("documentId");
CREATE INDEX "RetrievalMetric_chunkId_idx" ON "RetrievalMetric"("chunkId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
