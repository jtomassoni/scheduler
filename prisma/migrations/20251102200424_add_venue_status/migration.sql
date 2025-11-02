-- CreateEnum
CREATE TYPE "VenueStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "status" "VenueStatus" NOT NULL DEFAULT 'ACTIVE';
