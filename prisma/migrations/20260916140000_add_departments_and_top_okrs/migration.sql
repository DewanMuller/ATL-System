-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Department_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_businessId_code_key" ON "Department"("businessId", "code");

-- AlterTable
ALTER TABLE "Objective" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "Objective" ADD COLUMN "isTopCompanyOkr" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Objective" ADD COLUMN "isTopDepartmentOkr" BOOLEAN NOT NULL DEFAULT false;
