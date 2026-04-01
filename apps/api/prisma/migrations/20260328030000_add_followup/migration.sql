-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sessionId" TEXT NOT NULL,
    "scheduledFor" DATETIME NOT NULL,
    "counselorName" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" DATETIME,
    CONSTRAINT "FollowUp_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudentSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FollowUp_sessionId_idx" ON "FollowUp"("sessionId");
