-- CreateTable
CREATE TABLE "WeeklyCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "weekOf" DATETIME NOT NULL,
    "personName" TEXT NOT NULL,
    "wellbeingScore" INTEGER NOT NULL,
    "goalCompletionPct" REAL NOT NULL,
    "highlights" TEXT,
    "blockers" TEXT,
    "priorities" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyCheckIn_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
