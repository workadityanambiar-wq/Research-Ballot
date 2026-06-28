import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ideaId } = await params;

  const [idea, questions, challenges, justifications, revisions, auditLogs] = await Promise.all([
    prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, ticker: true, dir: true, approvalStatus: true, createdAt: true, updatedAt: true },
    }),
    prisma.committeeQuestion.findMany({ where: { ideaId }, orderBy: { createdAt: 'asc' } }),
    prisma.committeeChallenge.findMany({ where: { ideaId }, orderBy: { createdAt: 'asc' } }),
    prisma.voteJustification.findMany({ where: { ideaId }, orderBy: { createdAt: 'asc' } }),
    prisma.researchDoc.findUnique({ where: { ideaId }, select: { id: true } }).then(async (doc) => {
      if (!doc) return [];
      return prisma.researchRevisionRecord.findMany({
        where: { docId: doc.id },
        orderBy: { revisionNum: 'asc' },
      });
    }),
    prisma.auditLog.findMany({
      where: {
        detail: { contains: ideaId },
        action: {
          in: [
            'IDEA_SUBMITTED', 'TRADE_APPROVED', 'BALLOT_SUBMITTED',
            'COMMITTEE_QUESTION_RAISED', 'COMMITTEE_CHALLENGE_RAISED',
            'COMMITTEE_CHALLENGE_RESOLVED', 'VOTE_JUSTIFICATION_SUBMITTED',
            'RESEARCH_REVISION_SUBMITTED', 'MEETING_CREATED', 'ALLOCATION_QUEUE_UPDATED',
          ] as never[],
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    }),
  ]);

  if (!idea) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  type TimelineEvent = {
    id: string;
    type: string;
    label: string;
    detail: string;
    actor: string;
    at: string;
    meta?: Record<string, unknown>;
  };

  const events: TimelineEvent[] = [];

  events.push({
    id: `idea-${idea.id}`,
    type: 'IDEA_SUBMITTED',
    label: 'Idea Submitted',
    detail: `${idea.ticker} (${idea.dir}) submitted for review`,
    actor: 'system',
    at: idea.createdAt.toISOString(),
  });

  for (const q of questions) {
    events.push({
      id: `q-${q.id}`,
      type: 'QUESTION_RAISED',
      label: 'Question Raised',
      detail: q.question.slice(0, 120),
      actor: q.raisedBy,
      at: q.createdAt.toISOString(),
      meta: { status: q.status, priority: q.priority },
    });
    if (q.answeredAt) {
      events.push({
        id: `qa-${q.id}`,
        type: 'QUESTION_ANSWERED',
        label: 'Question Answered',
        detail: q.question.slice(0, 80),
        actor: q.answeredBy ?? 'unknown',
        at: q.answeredAt.toISOString(),
      });
    }
  }

  for (const c of challenges) {
    events.push({
      id: `c-${c.id}`,
      type: 'CHALLENGE_RAISED',
      label: 'Challenge Raised',
      detail: `[${c.category}] ${c.description.slice(0, 100)}`,
      actor: c.raisedBy,
      at: c.createdAt.toISOString(),
      meta: { status: c.status, priority: c.priority, category: c.category },
    });
    if (c.resolvedAt) {
      events.push({
        id: `cr-${c.id}`,
        type: 'CHALLENGE_RESOLVED',
        label: 'Challenge Resolved',
        detail: c.description.slice(0, 80),
        actor: c.resolvedBy ?? 'unknown',
        at: c.resolvedAt.toISOString(),
      });
    }
  }

  for (const r of revisions) {
    events.push({
      id: `rev-${r.id}`,
      type: 'REVISION_SUBMITTED',
      label: `Revision #${r.revisionNum}`,
      detail: r.summary.slice(0, 120),
      actor: r.submittedBy,
      at: r.createdAt.toISOString(),
    });
  }

  for (const j of justifications) {
    events.push({
      id: `vote-${j.id}`,
      type: 'VOTE_SUBMITTED',
      label: 'Vote Submitted',
      detail: `Decision: ${j.decision}`,
      actor: j.userId,
      at: j.createdAt.toISOString(),
      meta: { decision: j.decision },
    });
  }

  for (const log of auditLogs) {
    if (!events.find(e => e.id === `audit-${log.id}`)) {
      events.push({
        id: `audit-${log.id}`,
        type: log.action,
        label: log.action.replace(/_/g, ' '),
        detail: log.detail,
        actor: log.userId ?? 'system',
        at: log.createdAt.toISOString(),
      });
    }
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return NextResponse.json({ idea, events });
}
