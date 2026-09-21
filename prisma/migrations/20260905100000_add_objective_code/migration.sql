-- AlterTable
ALTER TABLE "Objective" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Objective_businessId_code_key" ON "Objective"("businessId", "code");
