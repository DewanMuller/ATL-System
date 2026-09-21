-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Objective" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quarter" TEXT,
    "assigneeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Objective_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Objective_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Objective" ("id", "businessId", "title", "quarter", "createdAt") SELECT "id", "businessId", "title", "quarter", "createdAt" FROM "Objective";
DROP TABLE "Objective";
ALTER TABLE "new_Objective" RENAME TO "Objective";

CREATE TABLE "new_NextStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "objectiveId" TEXT,
    "keyResultId" TEXT,
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
    CONSTRAINT "NextStep_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_NextStep" ("id", "businessId", "objectiveId", "keyResultId", "title", "owner", "dueDate", "status", "notes", "createdAt", "updatedAt") SELECT "id", "businessId", "objectiveId", "keyResultId", "title", "owner", "dueDate", "status", "notes", "createdAt", "updatedAt" FROM "NextStep";
DROP TABLE "NextStep";
ALTER TABLE "new_NextStep" RENAME TO "NextStep";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
