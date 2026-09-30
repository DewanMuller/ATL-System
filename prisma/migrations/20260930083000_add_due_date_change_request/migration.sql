-- CreateTable
CREATE TABLE "DueDateChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "currentDueDate" DATETIME NOT NULL,
    "requestedDueDate" DATETIME NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DueDateChangeRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DueDateChangeRequest_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DueDateChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DueDateChangeRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DueDateChangeRequest_businessId_status_idx" ON "DueDateChangeRequest"("businessId", "status");

-- CreateIndex
CREATE INDEX "DueDateChangeRequest_initiativeId_idx" ON "DueDateChangeRequest"("initiativeId");
