-- AlterTable: migrate startTime from String to DateTime
-- Drop and re-add as nullable first, backfill existing rows, then enforce NOT NULL
ALTER TABLE "Session" DROP COLUMN "startTime";
ALTER TABLE "Session" ADD COLUMN "startTime" TIMESTAMP(3);
UPDATE "Session" SET "startTime" = '1970-01-01 00:00:00' WHERE "startTime" IS NULL;
ALTER TABLE "Session" ALTER COLUMN "startTime" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "refreshToken";

-- CreateTable
CREATE TABLE "UserToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserToken_tokenHash_key" ON "UserToken"("tokenHash");

-- CreateIndex
CREATE INDEX "UserToken_userId_idx" ON "UserToken"("userId");

-- AddForeignKey
ALTER TABLE "UserToken" ADD CONSTRAINT "UserToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
