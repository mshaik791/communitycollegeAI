-- CreateTable
CREATE TABLE "StudentSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "studentName" TEXT,
    "studentEmail" TEXT,
    "studentPhone" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "persona" TEXT NOT NULL DEFAULT 'sofia',
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "sentimentStart" INTEGER,
    "sentimentEnd" INTEGER,
    "chatRecommended" BOOLEAN NOT NULL DEFAULT false,
    "withdrawIntent" BOOLEAN NOT NULL DEFAULT true,
    "withdrawPrevented" BOOLEAN,
    "transcriptText" TEXT,
    "summaryText" TEXT
);

-- CreateTable
CREATE TABLE "BarrierEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "BarrierEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudentSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudentSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CallbackRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "counselorName" TEXT NOT NULL DEFAULT 'Jimmy',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "smsSent" BOOLEAN NOT NULL DEFAULT false,
    "smsError" TEXT,
    CONSTRAINT "CallbackRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudentSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BarrierEvent_sessionId_idx" ON "BarrierEvent"("sessionId");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "CallbackRequest_sessionId_idx" ON "CallbackRequest"("sessionId");
