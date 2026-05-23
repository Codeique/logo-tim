-- Rename column (preserves all existing data and the index)
ALTER TABLE "Patient" RENAME COLUMN "therapistId" TO "primaryTherapistId";

-- Rename the FK constraint to match the new column name
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_therapistId_fkey";
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_primaryTherapistId_fkey"
  FOREIGN KEY ("primaryTherapistId") REFERENCES "Therapist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
