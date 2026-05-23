-- DropForeignKey: remove old cascade/setNull constraints before re-adding as RESTRICT
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_userId_fkey";
ALTER TABLE "Therapist" DROP CONSTRAINT "Therapist_userId_fkey";

-- AlterTable: add soft-delete timestamps (nullable — null means not deleted)
ALTER TABLE "Patient" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Therapist" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AddForeignKey: re-add with RESTRICT to prevent hard deletes that would orphan records
ALTER TABLE "Therapist" ADD CONSTRAINT "Therapist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
