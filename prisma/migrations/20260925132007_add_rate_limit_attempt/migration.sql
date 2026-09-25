-- CreateTable
CREATE TABLE "RateLimitAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Objective" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "departmentId" TEXT,
    "isTopCompanyOkr" BOOLEAN NOT NULL DEFAULT false,
    "isTopDepartmentOkr" BOOLEAN NOT NULL DEFAULT false,
    "alignedToObjectiveId" TEXT,
    "leadUserId" TEXT NOT NULL,
    "weighting" REAL NOT NULL DEFAULT 0,
    "periodType" TEXT NOT NULL,
    "periodValue" TEXT NOT NULL,
    "dueDate" DATETIME,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Objective_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Objective_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Objective_alignedToObjectiveId_fkey" FOREIGN KEY ("alignedToObjectiveId") REFERENCES "Objective" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Objective_leadUserId_fkey" FOREIGN KEY ("leadUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Objective" ("alignedToObjectiveId", "businessId", "code", "comments", "createdAt", "departmentId", "dueDate", "id", "isTopCompanyOkr", "isTopDepartmentOkr", "leadUserId", "periodType", "periodValue", "title", "updatedAt", "weighting") SELECT "alignedToObjectiveId", "businessId", "code", "comments", "createdAt", "departmentId", "dueDate", "id", "isTopCompanyOkr", "isTopDepartmentOkr", "leadUserId", "periodType", "periodValue", "title", "updatedAt", "weighting" FROM "Objective";
DROP TABLE "Objective";
ALTER TABLE "new_Objective" RENAME TO "Objective";
CREATE UNIQUE INDEX "Objective_businessId_code_key" ON "Objective"("businessId", "code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RateLimitAttempt_key_createdAt_idx" ON "RateLimitAttempt"("key", "createdAt");
