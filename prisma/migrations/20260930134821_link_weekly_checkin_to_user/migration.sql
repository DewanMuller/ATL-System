-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WeeklyCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekOf" DATETIME NOT NULL,
    "wellbeingScore" INTEGER NOT NULL,
    "goalCompletionPct" REAL NOT NULL,
    "highlights" TEXT,
    "blockers" TEXT,
    "priorities" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyCheckIn_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Maps the old free-text personName to a real userId via a prefix match
-- against the business's own members (e.g. "Dewan" -> "Dewan Muller"),
-- verified against every existing row in both the local and production
-- databases before this migration was written — each matched exactly one
-- member. Any future row this can't resolve is intentionally left to fail
-- the NOT NULL constraint rather than silently dropping the check-in.
INSERT INTO "new_WeeklyCheckIn" ("id", "businessId", "userId", "weekOf", "wellbeingScore", "goalCompletionPct", "highlights", "blockers", "priorities", "createdAt")
SELECT
  w."id",
  w."businessId",
  (
    SELECT m."userId" FROM "Membership" m
    JOIN "User" u ON u."id" = m."userId"
    WHERE m."businessId" = w."businessId"
      AND lower(u."name") LIKE lower(w."personName") || '%'
    LIMIT 1
  ) AS "userId",
  w."weekOf",
  w."wellbeingScore",
  w."goalCompletionPct",
  w."highlights",
  w."blockers",
  w."priorities",
  w."createdAt"
FROM "WeeklyCheckIn" w;
DROP TABLE "WeeklyCheckIn";
ALTER TABLE "new_WeeklyCheckIn" RENAME TO "WeeklyCheckIn";
CREATE INDEX "WeeklyCheckIn_businessId_weekOf_idx" ON "WeeklyCheckIn"("businessId", "weekOf");
CREATE UNIQUE INDEX "WeeklyCheckIn_userId_weekOf_key" ON "WeeklyCheckIn"("userId", "weekOf");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
