-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "upForTrade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "upForTradeAt" TIMESTAMP(3),
ADD COLUMN     "upForTradeBy" TEXT,
ADD COLUMN     "upForTradeReason" TEXT;

-- AlterTable
ALTER TABLE "ShiftAssignment" ADD COLUMN     "isOnCall" BOOLEAN NOT NULL DEFAULT false;
