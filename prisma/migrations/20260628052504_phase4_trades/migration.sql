-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PROPOSAL', 'APPROVED', 'ACTIVE', 'PARTIAL_EXIT', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExecutionType" AS ENUM ('ENTRY', 'ADD', 'PARTIAL_EXIT', 'FULL_EXIT', 'STOP_LOSS', 'STOP_ADJUSTED', 'TARGET_ADJUSTED', 'NOTE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('STOP_LOSS_HIT', 'TARGET_HIT', 'EARNINGS_DATE', 'HIGH_DRAWDOWN', 'POSITION_AGE', 'CONCENTRATION', 'MARGIN_THRESHOLD', 'MANUAL_REVIEW');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TRADE_PROPOSAL_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TRADE_PROPOSAL_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'POSITION_OPENED';
ALTER TYPE "AuditAction" ADD VALUE 'POSITION_CLOSED';
ALTER TYPE "AuditAction" ADD VALUE 'POSITION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PARTIAL_EXIT_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE 'TRADE_ALERT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TRADE_JOURNAL_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TRADE_CANCELLED';

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'PROPOSAL',
    "side" TEXT NOT NULL DEFAULT 'BUY',
    "exchange" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "strategy" TEXT,
    "timeHorizon" TEXT,
    "convictionLevel" INTEGER,
    "holdingPeriod" TEXT,
    "entryPrice" DOUBLE PRECISION,
    "stopLoss" DOUBLE PRECISION,
    "target1" DOUBLE PRECISION,
    "target2" DOUBLE PRECISION,
    "target3" DOUBLE PRECISION,
    "riskReward" DOUBLE PRECISION,
    "positionSize" DOUBLE PRECISION,
    "maxCapital" DOUBLE PRECISION,
    "maxExposurePct" DOUBLE PRECISION,
    "tradeRationale" TEXT,
    "cioNotes" TEXT,
    "pmNotes" TEXT,
    "executionNotes" TEXT,
    "proposedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeExecution" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "type" "ExecutionType" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "fees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "executedBy" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "avgCost" DOUBLE PRECISION NOT NULL,
    "currentPrice" DOUBLE PRECISION,
    "marketValue" DOUBLE PRECISION,
    "unrealizedPnl" DOUBLE PRECISION,
    "realizedPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "returnPct" DOUBLE PRECISION,
    "maxGain" DOUBLE PRECISION,
    "maxDrawdown" DOUBLE PRECISION,
    "daysHeld" INTEGER NOT NULL DEFAULT 0,
    "stopLoss" DOUBLE PRECISION,
    "target" DOUBLE PRECISION,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "exitDate" TIMESTAMP(3),
    "lastPriceUpdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionHistory" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION,
    "value" DOUBLE PRECISION,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeJournal" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "totalEquity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExposure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netExposure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossExposure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unrealizedPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "realizedPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openPositions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeAlert" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT,
    "alertType" "AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "readBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceAttribution" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "researchQuality" INTEGER,
    "entryTiming" INTEGER,
    "exitTiming" INTEGER,
    "catalystOutcome" INTEGER,
    "riskMgmt" INTEGER,
    "positionSizing" INTEGER,
    "executionQuality" INTEGER,
    "analystComment" TEXT,
    "pmComment" TEXT,
    "cioComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trade_ideaId_idx" ON "Trade"("ideaId");

-- CreateIndex
CREATE INDEX "Trade_proposedBy_idx" ON "Trade"("proposedBy");

-- CreateIndex
CREATE INDEX "Trade_status_idx" ON "Trade"("status");

-- CreateIndex
CREATE INDEX "TradeExecution_tradeId_idx" ON "TradeExecution"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_tradeId_key" ON "Position"("tradeId");

-- CreateIndex
CREATE INDEX "Position_ticker_idx" ON "Position"("ticker");

-- CreateIndex
CREATE INDEX "PositionHistory_tradeId_idx" ON "PositionHistory"("tradeId");

-- CreateIndex
CREATE INDEX "PositionHistory_createdAt_idx" ON "PositionHistory"("createdAt");

-- CreateIndex
CREATE INDEX "TradeJournal_tradeId_idx" ON "TradeJournal"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeJournal_tradeId_field_key" ON "TradeJournal"("tradeId", "field");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_snapshotDate_idx" ON "PortfolioSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "TradeAlert_isRead_idx" ON "TradeAlert"("isRead");

-- CreateIndex
CREATE INDEX "TradeAlert_tradeId_idx" ON "TradeAlert"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceAttribution_tradeId_key" ON "PerformanceAttribution"("tradeId");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeExecution" ADD CONSTRAINT "TradeExecution_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionHistory" ADD CONSTRAINT "PositionHistory_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeJournal" ADD CONSTRAINT "TradeJournal_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeAlert" ADD CONSTRAINT "TradeAlert_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAttribution" ADD CONSTRAINT "PerformanceAttribution_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
