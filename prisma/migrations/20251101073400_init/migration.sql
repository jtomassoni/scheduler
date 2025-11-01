-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'MANAGER', 'BARTENDER', 'BARBACK');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "OverrideStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'ACTIVE');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'APPROVED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('AVAILABILITY_REMINDER', 'AVAILABILITY_DEADLINE', 'SHIFT_ASSIGNED', 'SHIFT_CHANGED', 'TRADE_PROPOSED', 'TRADE_UPDATED', 'OVERRIDE_REQUESTED', 'OVERRIDE_APPROVED', 'TIP_PUBLISHED', 'TIP_UPDATED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "hashedPassword" TEXT,
    "hasDayJob" BOOLEAN NOT NULL DEFAULT false,
    "dayJobCutoff" TEXT,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "preferredVenuesOrder" TEXT[],
    "defaultAvailability" JSONB,
    "autoSubmitAvailability" BOOLEAN NOT NULL DEFAULT false,
    "notificationPrefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isNetworked" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "availabilityDeadlineDay" INTEGER NOT NULL DEFAULT 10,
    "tipPoolEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "bartendersRequired" INTEGER NOT NULL DEFAULT 1,
    "barbacksRequired" INTEGER NOT NULL DEFAULT 0,
    "leadsRequired" INTEGER NOT NULL DEFAULT 0,
    "tipsPublished" BOOLEAN NOT NULL DEFAULT false,
    "tipsPublishedAt" TIMESTAMP(3),
    "tipsPublishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftAssignment" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "tipAmount" DECIMAL(10,2),
    "tipCurrency" TEXT DEFAULT 'USD',
    "tipEnteredBy" TEXT,
    "tipEnteredAt" TIMESTAMP(3),
    "tipUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Override" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "violationType" TEXT NOT NULL,
    "status" "OverrideStatus" NOT NULL DEFAULT 'PENDING',
    "history" JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OverrideApproval" (
    "id" TEXT NOT NULL,
    "overrideId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OverrideApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityUnlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "unlockedBy" TEXT NOT NULL,
    "reason" TEXT,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftTrade" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'PROPOSED',
    "reason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "declinedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipPayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "enteredBy" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "history" JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VenueManagers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "Venue_isNetworked_idx" ON "Venue"("isNetworked");

-- CreateIndex
CREATE INDEX "Venue_createdById_idx" ON "Venue"("createdById");

-- CreateIndex
CREATE INDEX "Shift_venueId_idx" ON "Shift"("venueId");

-- CreateIndex
CREATE INDEX "Shift_date_idx" ON "Shift"("date");

-- CreateIndex
CREATE INDEX "Shift_venueId_date_idx" ON "Shift"("venueId", "date");

-- CreateIndex
CREATE INDEX "ShiftAssignment_shiftId_idx" ON "ShiftAssignment"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_userId_idx" ON "ShiftAssignment"("userId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_userId_shiftId_idx" ON "ShiftAssignment"("userId", "shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftAssignment_shiftId_userId_key" ON "ShiftAssignment"("shiftId", "userId");

-- CreateIndex
CREATE INDEX "Override_shiftId_idx" ON "Override"("shiftId");

-- CreateIndex
CREATE INDEX "Override_userId_idx" ON "Override"("userId");

-- CreateIndex
CREATE INDEX "Override_status_idx" ON "Override"("status");

-- CreateIndex
CREATE INDEX "OverrideApproval_overrideId_idx" ON "OverrideApproval"("overrideId");

-- CreateIndex
CREATE INDEX "OverrideApproval_approverId_idx" ON "OverrideApproval"("approverId");

-- CreateIndex
CREATE INDEX "Availability_userId_idx" ON "Availability"("userId");

-- CreateIndex
CREATE INDEX "Availability_month_idx" ON "Availability"("month");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_userId_month_key" ON "Availability"("userId", "month");

-- CreateIndex
CREATE INDEX "AvailabilityUnlock_userId_idx" ON "AvailabilityUnlock"("userId");

-- CreateIndex
CREATE INDEX "AvailabilityUnlock_month_idx" ON "AvailabilityUnlock"("month");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityUnlock_userId_month_key" ON "AvailabilityUnlock"("userId", "month");

-- CreateIndex
CREATE INDEX "ExternalBlock_userId_idx" ON "ExternalBlock"("userId");

-- CreateIndex
CREATE INDEX "ExternalBlock_startTime_idx" ON "ExternalBlock"("startTime");

-- CreateIndex
CREATE INDEX "ExternalBlock_userId_startTime_idx" ON "ExternalBlock"("userId", "startTime");

-- CreateIndex
CREATE INDEX "ShiftTrade_shiftId_idx" ON "ShiftTrade"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftTrade_proposerId_idx" ON "ShiftTrade"("proposerId");

-- CreateIndex
CREATE INDEX "ShiftTrade_receiverId_idx" ON "ShiftTrade"("receiverId");

-- CreateIndex
CREATE INDEX "ShiftTrade_status_idx" ON "ShiftTrade"("status");

-- CreateIndex
CREATE INDEX "TipPayout_userId_idx" ON "TipPayout"("userId");

-- CreateIndex
CREATE INDEX "TipPayout_shiftId_idx" ON "TipPayout"("shiftId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_sentAt_idx" ON "Notification"("sentAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_VenueManagers_AB_unique" ON "_VenueManagers"("A", "B");

-- CreateIndex
CREATE INDEX "_VenueManagers_B_index" ON "_VenueManagers"("B");

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Override" ADD CONSTRAINT "Override_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverrideApproval" ADD CONSTRAINT "OverrideApproval_overrideId_fkey" FOREIGN KEY ("overrideId") REFERENCES "Override"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverrideApproval" ADD CONSTRAINT "OverrideApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityUnlock" ADD CONSTRAINT "AvailabilityUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityUnlock" ADD CONSTRAINT "AvailabilityUnlock_unlockedBy_fkey" FOREIGN KEY ("unlockedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalBlock" ADD CONSTRAINT "ExternalBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTrade" ADD CONSTRAINT "ShiftTrade_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTrade" ADD CONSTRAINT "ShiftTrade_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTrade" ADD CONSTRAINT "ShiftTrade_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipPayout" ADD CONSTRAINT "TipPayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VenueManagers" ADD CONSTRAINT "_VenueManagers_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VenueManagers" ADD CONSTRAINT "_VenueManagers_B_fkey" FOREIGN KEY ("B") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

