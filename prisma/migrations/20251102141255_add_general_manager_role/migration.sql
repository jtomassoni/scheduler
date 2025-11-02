-- CreateEnum
CREATE TYPE "CompanyRequestStatus" AS ENUM ('PENDING', 'REVIEWED', 'APPROVED', 'DECLINED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'GENERAL_MANAGER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "customAvailabilityDeadlines" JSONB;

-- CreateTable
CREATE TABLE "HistoricSchedule" (
    "id" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "venueId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodName" TEXT,
    "data" JSONB NOT NULL,
    "fileName" TEXT,
    "source" TEXT NOT NULL DEFAULT 'excel',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyRequest" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "numberOfVenues" INTEGER NOT NULL,
    "estimatedUsers" INTEGER NOT NULL,
    "additionalNotes" TEXT,
    "status" "CompanyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoricSchedule_uploadedById_idx" ON "HistoricSchedule"("uploadedById");

-- CreateIndex
CREATE INDEX "HistoricSchedule_venueId_idx" ON "HistoricSchedule"("venueId");

-- CreateIndex
CREATE INDEX "HistoricSchedule_periodStart_periodEnd_idx" ON "HistoricSchedule"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "CompanyRequest_status_idx" ON "CompanyRequest"("status");

-- CreateIndex
CREATE INDEX "CompanyRequest_reviewedById_idx" ON "CompanyRequest"("reviewedById");

-- CreateIndex
CREATE INDEX "CompanyRequest_createdAt_idx" ON "CompanyRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "HistoricSchedule" ADD CONSTRAINT "HistoricSchedule_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricSchedule" ADD CONSTRAINT "HistoricSchedule_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRequest" ADD CONSTRAINT "CompanyRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
