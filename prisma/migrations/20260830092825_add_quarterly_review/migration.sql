-- CreateTable
CREATE TABLE "QuarterlyReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "okrAveragePct" REAL,
    "businessSummary" TEXT,
    "adjustments" TEXT,
    "nextQuarterFocus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuarterlyReview_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "QuarterlyReview_businessId_quarter_key" ON "QuarterlyReview"("businessId", "quarter");
