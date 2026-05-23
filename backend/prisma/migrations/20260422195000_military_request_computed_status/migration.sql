-- AlterTable: drop fake status column — status is now a computed field in the Prisma extension
ALTER TABLE "MilitaryRequest" DROP COLUMN "status";

-- DropEnum
DROP TYPE "RequestStatus";

-- CreateIndex: prevent duplicate request numbers
CREATE UNIQUE INDEX "MilitaryRequest_requestNumber_key" ON "MilitaryRequest"("requestNumber");
