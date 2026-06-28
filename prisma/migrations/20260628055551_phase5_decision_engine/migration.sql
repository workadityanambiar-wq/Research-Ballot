-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'COMMITTEE_QUESTION_RAISED';
ALTER TYPE "AuditAction" ADD VALUE 'COMMITTEE_CHALLENGE_RAISED';
ALTER TYPE "AuditAction" ADD VALUE 'COMMITTEE_CHALLENGE_RESOLVED';
ALTER TYPE "AuditAction" ADD VALUE 'VOTE_JUSTIFICATION_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'MEETING_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEETING_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'ALLOCATION_QUEUE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'RESEARCH_REVISION_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'DECISION_PACKAGE_GENERATED';

-- CreateTable
CREATE TABLE "CommitteeMeeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "agenda" TEXT,
    "notes" TEXT,
    "decisions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommitteeMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAgendaItem" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingAgendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAttendance" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitteeQuestion" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "assignedTo" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "answeredBy" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommitteeQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitteeChallenge" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommitteeChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteJustification" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyStrengths" TEXT,
    "keyConcerns" TEXT,
    "conditions" TEXT,
    "additionalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoteJustification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchRevisionRecord" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "revisionNum" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "changes" TEXT,
    "submittedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchRevisionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationQueueEntry" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "rank" INTEGER,
    "capitalRequested" DOUBLE PRECISION,
    "recommendedAlloc" DOUBLE PRECISION,
    "portfolioExposurePct" DOUBLE PRECISION,
    "riskRating" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationQueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionPackage" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generatedBy" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommitteeMeeting_meetingDate_idx" ON "CommitteeMeeting"("meetingDate");

-- CreateIndex
CREATE INDEX "CommitteeMeeting_status_idx" ON "CommitteeMeeting"("status");

-- CreateIndex
CREATE INDEX "MeetingAgendaItem_meetingId_idx" ON "MeetingAgendaItem"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingAgendaItem_ideaId_idx" ON "MeetingAgendaItem"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingAgendaItem_meetingId_ideaId_key" ON "MeetingAgendaItem"("meetingId", "ideaId");

-- CreateIndex
CREATE INDEX "MeetingAttendance_meetingId_idx" ON "MeetingAttendance"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingAttendance_meetingId_userId_key" ON "MeetingAttendance"("meetingId", "userId");

-- CreateIndex
CREATE INDEX "CommitteeQuestion_ideaId_idx" ON "CommitteeQuestion"("ideaId");

-- CreateIndex
CREATE INDEX "CommitteeQuestion_status_idx" ON "CommitteeQuestion"("status");

-- CreateIndex
CREATE INDEX "CommitteeChallenge_ideaId_idx" ON "CommitteeChallenge"("ideaId");

-- CreateIndex
CREATE INDEX "CommitteeChallenge_status_idx" ON "CommitteeChallenge"("status");

-- CreateIndex
CREATE INDEX "VoteJustification_ideaId_idx" ON "VoteJustification"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "VoteJustification_ideaId_userId_key" ON "VoteJustification"("ideaId", "userId");

-- CreateIndex
CREATE INDEX "ResearchRevisionRecord_docId_idx" ON "ResearchRevisionRecord"("docId");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationQueueEntry_ideaId_key" ON "AllocationQueueEntry"("ideaId");

-- CreateIndex
CREATE INDEX "AllocationQueueEntry_status_idx" ON "AllocationQueueEntry"("status");

-- CreateIndex
CREATE INDEX "DecisionPackage_ideaId_idx" ON "DecisionPackage"("ideaId");

-- AddForeignKey
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CommitteeMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendance" ADD CONSTRAINT "MeetingAttendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CommitteeMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeQuestion" ADD CONSTRAINT "CommitteeQuestion_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeChallenge" ADD CONSTRAINT "CommitteeChallenge_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteJustification" ADD CONSTRAINT "VoteJustification_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRevisionRecord" ADD CONSTRAINT "ResearchRevisionRecord_docId_fkey" FOREIGN KEY ("docId") REFERENCES "ResearchDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationQueueEntry" ADD CONSTRAINT "AllocationQueueEntry_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionPackage" ADD CONSTRAINT "DecisionPackage_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
