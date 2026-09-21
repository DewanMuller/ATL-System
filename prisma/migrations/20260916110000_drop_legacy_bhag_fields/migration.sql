-- DropTable
DROP TABLE "BhagSnapshot";

-- AlterTable
ALTER TABLE "Bhag" DROP COLUMN "targetDate";
ALTER TABLE "Bhag" DROP COLUMN "metricLabel";
ALTER TABLE "Bhag" DROP COLUMN "currentValue";
ALTER TABLE "Bhag" DROP COLUMN "targetValue";
