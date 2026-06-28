-- CreateEnum
CREATE TYPE "ResearchStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETE', 'RISK_REVIEW', 'COMMITTEE_REVIEW', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'RESEARCH_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'RESEARCH_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMMENT_POSTED';
ALTER TYPE "AuditAction" ADD VALUE 'ATTACHMENT_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'WATCHLIST_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CALENDAR_EVENT_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'POST_MORTEM_CREATED';

-- CreateTable
CREATE TABLE "ResearchDoc" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "status" "ResearchStatus" NOT NULL DEFAULT 'DRAFT',
    "templateType" TEXT,
    "thesis" TEXT,
    "financials" TEXT,
    "valuation" TEXT,
    "technical" TEXT,
    "overview" TEXT,
    "completionScore" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT NOT NULL,
    "lastEditedBy" TEXT,
    "lastEditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchVersion" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchCatalyst" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedImpact" TEXT,
    "probability" INTEGER,
    "timeline" TEXT,
    "importance" TEXT NOT NULL DEFAULT 'MEDIUM',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchCatalyst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchRisk" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "probability" INTEGER,
    "mitigation" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchAttachment" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ResearchAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchReference" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT,
    "publishDate" TIMESTAMP(3),
    "notes" TEXT,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchComment" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ResearchComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "notes" TEXT,
    "addedBy" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ticker" TEXT,
    "ideaId" TEXT,
    "description" TEXT,
    "importance" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostMortem" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3),
    "exitDate" TIMESTAMP(3),
    "entryPrice" DOUBLE PRECISION,
    "exitPrice" DOUBLE PRECISION,
    "actualReturn" DOUBLE PRECISION,
    "maxDrawdown" DOUBLE PRECISION,
    "holdDays" INTEGER,
    "originalThesis" TEXT,
    "whatWorked" TEXT,
    "whatFailed" TEXT,
    "mistakes" TEXT,
    "lessonsLearned" TEXT,
    "futureAction" TEXT,
    "committeeNotes" TEXT,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostMortem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResearchDoc_ideaId_key" ON "ResearchDoc"("ideaId");

-- CreateIndex
CREATE INDEX "ResearchDoc_authorId_idx" ON "ResearchDoc"("authorId");

-- CreateIndex
CREATE INDEX "ResearchDoc_status_idx" ON "ResearchDoc"("status");

-- CreateIndex
CREATE INDEX "ResearchVersion_docId_field_idx" ON "ResearchVersion"("docId", "field");

-- CreateIndex
CREATE INDEX "ResearchCatalyst_docId_idx" ON "ResearchCatalyst"("docId");

-- CreateIndex
CREATE INDEX "ResearchRisk_docId_idx" ON "ResearchRisk"("docId");

-- CreateIndex
CREATE INDEX "ResearchAttachment_docId_idx" ON "ResearchAttachment"("docId");

-- CreateIndex
CREATE INDEX "ResearchReference_docId_idx" ON "ResearchReference"("docId");

-- CreateIndex
CREATE INDEX "ResearchComment_docId_idx" ON "ResearchComment"("docId");

-- CreateIndex
CREATE INDEX "ResearchComment_parentId_idx" ON "ResearchComment"("parentId");

-- CreateIndex
CREATE INDEX "Watchlist_ownerId_idx" ON "Watchlist"("ownerId");

-- CreateIndex
CREATE INDEX "WatchlistItem_watchlistId_idx" ON "WatchlistItem"("watchlistId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_watchlistId_ticker_key" ON "WatchlistItem"("watchlistId", "ticker");

-- CreateIndex
CREATE INDEX "CalendarEvent_date_idx" ON "CalendarEvent"("date");

-- CreateIndex
CREATE INDEX "CalendarEvent_ticker_idx" ON "CalendarEvent"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "PostMortem_ideaId_key" ON "PostMortem"("ideaId");

-- CreateIndex
CREATE INDEX "PostMortem_authorId_idx" ON "PostMortem"("authorId");

-- AddForeignKey
ALTER TABLE "ResearchDoc" ADD CONSTRAINT "ResearchDoc_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchVersion" ADD CONSTRAINT "ResearchVersion_docId_fkey" FOREIGN KEY ("docId") REFERENCES "ResearchDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchCatalyst" ADD CONSTRAINT "ResearchCatalyst_docId_fkey" FOREIGN KEY ("docId") REFERENCES "ResearchDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRisk" ADD CONSTRAINT "ResearchRisk_docId_fkey" FOREIGN KEY ("docId") REFERENCES "ResearchDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchAttachment" ADD CONSTRAINT "ResearchAttachment_docId_fkey" FOREIGN KEY ("docId") REFERENCES "ResearchDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchReference" ADD CONSTRAINT "ResearchReference_docId_fkey" FOREIGN KEY ("docId") REFERENCES "ResearchDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchComment" ADD CONSTRAINT "ResearchComment_docId_fkey" FOREIGN KEY ("docId") REFERENCES "ResearchDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchComment" ADD CONSTRAINT "ResearchComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ResearchComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMortem" ADD CONSTRAINT "PostMortem_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
