-- CreateTable
CREATE TABLE "MonthlyReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "okrAveragePct" REAL,
    "highlights" TEXT,
    "blockers" TEXT,
    "priorities" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonthlyReview_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReview_businessId_month_key" ON "MonthlyReview"("businessId", "month");
