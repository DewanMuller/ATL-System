-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'ROLE',
    "accountableOwner" TEXT NOT NULL,
    "rootCause" TEXT,
    "actionPlan" TEXT,
    "dibred" BOOLEAN NOT NULL DEFAULT false,
    "dibredAt" DATETIME,
    "ceoApproved" BOOLEAN NOT NULL DEFAULT false,
    "convertedNextStepId" TEXT,
    "escalatedToQuarter" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Issue_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Issue_convertedNextStepId_fkey" FOREIGN KEY ("convertedNextStepId") REFERENCES "NextStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Issue_convertedNextStepId_key" ON "Issue"("convertedNextStepId");
