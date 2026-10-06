-- AlterTable
ALTER TABLE "InitiativeCheckIn" ADD COLUMN "reportedValue" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Initiative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyResultId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "responsibleUserId" TEXT NOT NULL,
    "outcomePercent" REAL,
    "comments" TEXT,
    "measureType" TEXT NOT NULL DEFAULT 'MANUAL',
    "targetValue" REAL,
    "startValue" REAL,
    "currentValue" REAL,
    "unit" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Initiative_keyResultId_fkey" FOREIGN KEY ("keyResultId") REFERENCES "KeyResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Initiative_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Initiative" ("comments", "createdAt", "dueDate", "id", "keyResultId", "name", "outcomePercent", "responsibleUserId", "updatedAt") SELECT "comments", "createdAt", "dueDate", "id", "keyResultId", "name", "outcomePercent", "responsibleUserId", "updatedAt" FROM "Initiative";
DROP TABLE "Initiative";
ALTER TABLE "new_Initiative" RENAME TO "Initiative";
CREATE INDEX "Initiative_keyResultId_idx" ON "Initiative"("keyResultId");
CREATE TABLE "new_KeyResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "objectiveId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "responsibleUserId" TEXT NOT NULL,
    "outcomePercent" REAL,
    "comments" TEXT,
    "measureType" TEXT NOT NULL DEFAULT 'MANUAL',
    "targetValue" REAL,
    "startValue" REAL,
    "currentValue" REAL,
    "unit" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KeyResult_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KeyResult_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_KeyResult" ("comments", "createdAt", "id", "metric", "objectiveId", "outcomePercent", "responsibleUserId", "target", "updatedAt") SELECT "comments", "createdAt", "id", "metric", "objectiveId", "outcomePercent", "responsibleUserId", "target", "updatedAt" FROM "KeyResult";
DROP TABLE "KeyResult";
ALTER TABLE "new_KeyResult" RENAME TO "KeyResult";
CREATE INDEX "KeyResult_objectiveId_idx" ON "KeyResult"("objectiveId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
