-- CreateEnum
CREATE TYPE "MajorType" AS ENUM ('fixed', 'extra', 'income');

-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('family', 'self', 'child', 'husband', 'other');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('voice', 'text');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('DRAFT', 'COLLECTING', 'CONFIRMING', 'CONFIRMED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "wechatOpenid" TEXT,
    "deviceId" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "majorType" "MajorType" NOT NULL,
    "platformTags" TEXT[],
    "usageType" "UsageType" NOT NULL,
    "reason" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "source" "EntrySource" NOT NULL,
    "rawText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missingSlots" TEXT[],
    "slotValues" JSONB NOT NULL,
    "jsonContext" TEXT NOT NULL,
    "lastQuestion" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdviceReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "inputSnapshot" TEXT NOT NULL,
    "adviceText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdviceReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_wechatOpenid_key" ON "User"("wechatOpenid");

-- CreateIndex
CREATE UNIQUE INDEX "User_deviceId_key" ON "User"("deviceId");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_occurredAt_idx" ON "LedgerEntry"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_majorType_idx" ON "LedgerEntry"("majorType");

-- CreateIndex
CREATE INDEX "ConversationDraft_userId_status_idx" ON "ConversationDraft"("userId", "status");

-- CreateIndex
CREATE INDEX "AdviceReport_userId_periodType_periodKey_idx" ON "AdviceReport"("userId", "periodType", "periodKey");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationDraft" ADD CONSTRAINT "ConversationDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdviceReport" ADD CONSTRAINT "AdviceReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
