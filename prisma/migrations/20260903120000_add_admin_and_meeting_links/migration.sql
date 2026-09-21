-- AlterTable
ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ImpersonationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "ImpersonationLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImpersonationLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NextStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "objectiveId" TEXT,
    "keyResultId" TEXT,
    "weeklyCheckInId" TEXT,
    "monthlyReviewId" TEXT,
    "quarterlyReviewId" TEXT,
    "otherContext" TEXT,
    "title" TEXT NOT NULL,
    "assigneeId" TEXT,
    "owner" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'AMBER',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NextStep_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NextStep_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NextStep_keyResultId_fkey" FOREIGN KEY ("keyResultId") REFERENCES "KeyResult" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NextStep_weeklyCheckInId_fkey" FOREIGN KEY ("weeklyCheckInId") REFERENCES "WeeklyCheckIn" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NextStep_monthlyReviewId_fkey" FOREIGN KEY ("monthlyReviewId") REFERENCES "MonthlyReview" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NextStep_quarterlyReviewId_fkey" FOREIGN KEY ("quarterlyReviewId") REFERENCES "QuarterlyReview" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NextStep_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_NextStep" ("id", "businessId", "objectiveId", "keyResultId", "title", "assigneeId", "owner", "dueDate", "status", "notes", "createdAt", "updatedAt") SELECT "id", "businessId", "objectiveId", "keyResultId", "title", "assigneeId", "owner", "dueDate", "status", "notes", "createdAt", "updatedAt" FROM "NextStep";
DROP TABLE "NextStep";
ALTER TABLE "new_NextStep" RENAME TO "NextStep";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
