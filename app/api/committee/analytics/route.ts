import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [
    totalIdeas,
    approvedIdeas,
    rejectedIdeas,
    pendingIdeas,
    totalQuestions,
    openQuestions,
    totalChallenges,
    openChallenges,
    totalVotes,
    meetings,
    revisions,
    queueEntries,
  ] = await Promise.all([
    prisma.idea.count(),
    prisma.idea.count({ where: { approvalStatus: 'APPROVED' } }),
    prisma.idea.count({ where: { approvalStatus: 'REJECTED' } }),
    prisma.idea.count({ where: { approvalStatus: { in: ['PENDING', 'REVIEW'] } } }),
    prisma.committeeQuestion.count(),
    prisma.committeeQuestion.count({ where: { status: 'OPEN' } }),
    prisma.committeeChallenge.count(),
    prisma.committeeChallenge.count({ where: { status: 'OPEN' } }),
    prisma.voteJustification.count(),
    prisma.committeeMeeting.findMany({
      orderBy: { meetingDate: 'desc' },
      take: 10,
      include: { agendaItems: { select: { id: true } }, attendance: { select: { userId: true } } },
    }),
    prisma.researchRevisionRecord.count(),
    prisma.allocationQueueEntry.count({ where: { status: { not: 'ALLOCATED' } } }),
  ]);

  const voteDistribution = await prisma.voteJustification.groupBy({
    by: ['decision'],
    _count: { decision: true },
  });

  const challengesByCategory = await prisma.committeeChallenge.groupBy({
    by: ['category'],
    _count: { category: true },
  });

  const ideasByDir = await prisma.idea.groupBy({
    by: ['dir'],
    _count: { dir: true },
  });

  const avgResolutionQuery = await prisma.committeeChallenge.findMany({
    where: { resolvedAt: { not: null } },
    select: { createdAt: true, resolvedAt: true },
  });

  let avgResolutionDays = 0;
  if (avgResolutionQuery.length > 0) {
    const totalMs = avgResolutionQuery.reduce((sum, c) => {
      return sum + (c.resolvedAt!.getTime() - c.createdAt.getTime());
    }, 0);
    avgResolutionDays = Math.round(totalMs / avgResolutionQuery.length / 86400000);
  }

  return NextResponse.json({
    overview: {
      totalIdeas,
      approvedIdeas,
      rejectedIdeas,
      pendingIdeas,
      approvalRate: totalIdeas > 0 ? Math.round((approvedIdeas / totalIdeas) * 100) : 0,
    },
    questions: { total: totalQuestions, open: openQuestions, resolved: totalQuestions - openQuestions },
    challenges: {
      total: totalChallenges,
      open: openChallenges,
      resolved: totalChallenges - openChallenges,
      avgResolutionDays,
      byCategory: challengesByCategory.map(c => ({ category: c.category, count: c._count.category })),
    },
    votes: {
      total: totalVotes,
      distribution: voteDistribution.map(v => ({ decision: v.decision, count: v._count.decision })),
    },
    research: { totalRevisions: revisions },
    meetings: {
      total: meetings.length,
      recent: meetings.map(m => ({
        id: m.id,
        title: m.title,
        meetingDate: m.meetingDate.toISOString(),
        status: m.status,
        agendaCount: m.agendaItems.length,
        attendeeCount: m.attendance.length,
      })),
    },
    allocationQueue: { count: queueEntries },
    ideasByDir: ideasByDir.map(d => ({ dir: d.dir as string, count: d._count.dir })),
  });
}
