-- CreateTable
CREATE TABLE "InitiativeCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weeklyCheckInId" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AMBER',
    "blockers" TEXT,
    "priorities" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InitiativeCheckIn_weeklyCheckInId_fkey" FOREIGN KEY ("weeklyCheckInId") REFERENCES "WeeklyCheckIn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InitiativeCheckIn_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InitiativeCheckIn_initiativeId_idx" ON "InitiativeCheckIn"("initiativeId");

-- CreateIndex
CREATE UNIQUE INDEX "InitiativeCheckIn_weeklyCheckInId_initiativeId_key" ON "InitiativeCheckIn"("weeklyCheckInId", "initiativeId");
