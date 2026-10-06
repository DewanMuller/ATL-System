-- CreateTable
CREATE TABLE "MonthlyCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "wellbeingScore" INTEGER NOT NULL,
    "highlights" TEXT,
    "blockers" TEXT,
    "helpNeeded" TEXT,
    "dibrFollowUp" TEXT,
    "priorities" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonthlyCheckIn_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MonthlyCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KeyResultCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthlyCheckInId" TEXT NOT NULL,
    "keyResultId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AMBER',
    "reportedValue" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KeyResultCheckIn_monthlyCheckInId_fkey" FOREIGN KEY ("monthlyCheckInId") REFERENCES "MonthlyCheckIn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KeyResultCheckIn_keyResultId_fkey" FOREIGN KEY ("keyResultId") REFERENCES "KeyResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MonthlyCheckIn_businessId_month_idx" ON "MonthlyCheckIn"("businessId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyCheckIn_userId_month_key" ON "MonthlyCheckIn"("userId", "month");

-- CreateIndex
CREATE INDEX "KeyResultCheckIn_keyResultId_idx" ON "KeyResultCheckIn"("keyResultId");

-- CreateIndex
CREATE UNIQUE INDEX "KeyResultCheckIn_monthlyCheckInId_keyResultId_key" ON "KeyResultCheckIn"("monthlyCheckInId", "keyResultId");
