-- DropTable (no longer needed: progress is period-based now, not a
-- within-period numeric trend)
DROP TABLE "KeyResultSnapshot";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Objective" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "alignedToObjectiveId" TEXT,
    "leadUserId" TEXT NOT NULL,
    "weighting" REAL NOT NULL DEFAULT 0,
    "periodType" TEXT NOT NULL,
    "periodValue" TEXT NOT NULL,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Objective_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Objective_alignedToObjectiveId_fkey" FOREIGN KEY ("alignedToObjectiveId") REFERENCES "Objective" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Objective_leadUserId_fkey" FOREIGN KEY ("leadUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Backfill: lead <- old single assignee, falling back to the business owner
-- when an objective had no assignee; weighting <- 100% (a pre-existing
-- objective is, by definition, the only one so far for its period);
-- periodType/periodValue <- the old free-text "quarter" field, defaulting
-- to QUARTER/"Unspecified" when it was empty.
INSERT INTO "new_Objective" ("id", "businessId", "title", "alignedToObjectiveId", "leadUserId", "weighting", "periodType", "periodValue", "comments", "createdAt", "updatedAt")
SELECT o."id", o."businessId", o."title", NULL, COALESCE(o."assigneeId", b."ownerId"), 1.0, 'QUARTER', COALESCE(o."quarter", 'Unspecified'), NULL, o."createdAt", o."createdAt"
FROM "Objective" o
JOIN "Business" b ON b."id" = o."businessId";
DROP TABLE "Objective";
ALTER TABLE "new_Objective" RENAME TO "Objective";

CREATE TABLE "new_KeyResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "objectiveId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "responsibleUserId" TEXT NOT NULL,
    "outcomePercent" REAL,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KeyResult_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KeyResult_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Backfill: metric <- old title, target <- old numeric targetValue as text
-- (unit/startValue/currentValue have no equivalent in the new model and are
-- dropped), responsibleUserId <- the objective's own (now-backfilled) lead.
INSERT INTO "new_KeyResult" ("id", "objectiveId", "metric", "target", "responsibleUserId", "outcomePercent", "comments", "createdAt", "updatedAt")
SELECT kr."id", kr."objectiveId", kr."title", CAST(kr."targetValue" AS TEXT), o."leadUserId", NULL, NULL, kr."createdAt", kr."createdAt"
FROM "KeyResult" kr
JOIN "Objective" o ON o."id" = kr."objectiveId";
DROP TABLE "KeyResult";
ALTER TABLE "new_KeyResult" RENAME TO "KeyResult";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyResultId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "responsibleUserId" TEXT NOT NULL,
    "outcomePercent" REAL,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Initiative_keyResultId_fkey" FOREIGN KEY ("keyResultId") REFERENCES "KeyResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Initiative_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ObjectiveContributor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "objectiveId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObjectiveContributor_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ObjectiveContributor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ObjectiveContributor_objectiveId_userId_key" ON "ObjectiveContributor"("objectiveId", "userId");
