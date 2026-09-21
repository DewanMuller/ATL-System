-- CreateTable
CREATE TABLE "BhagPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BhagPeriod_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BhagPeriod_businessId_label_key" ON "BhagPeriod"("businessId", "label");

-- CreateTable
CREATE TABLE "BhagMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "category" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "currentValue" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BhagMetric_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BhagMetricTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "metricId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "value" REAL,
    "note" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BhagMetricTarget_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "BhagMetric" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BhagMetricTarget_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "BhagPeriod" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BhagMetricTarget_metricId_periodId_key" ON "BhagMetricTarget"("metricId", "periodId");

-- CreateTable
CREATE TABLE "BhagMetricSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "metricId" TEXT NOT NULL,
    "value" REAL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BhagMetricSnapshot_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "BhagMetric" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
