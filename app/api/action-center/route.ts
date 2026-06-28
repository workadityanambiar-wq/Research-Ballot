import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isCioPm = ['CIO', 'PM'].includes(user.role);

  const [
    openQuestions,
    openChallenges,
    pendingVotes,
    unreadAlerts,
    upcomingMeetings,
    queueItems,
    readinessNeeded,
  ] = await Promise.all([
    // Questions assigned to me or raised by me that are open
    prisma.committeeQuestion.findMany({
      where: {
        status: 'OPEN',
        OR: [{ assignedTo: user.legacyId }, { raisedBy: user.legacyId }],
      },
      include: { idea: { select: { ticker: true, dir: true } } },
      orderBy: { createdAt: 'asc' },
      take: 20,
    }),

    // Open challenges on ideas I've submitted or challenged
    prisma.committeeChallenge.findMany({
      where: { status: 'OPEN', raisedBy: user.legacyId },
      include: { idea: { select: { ticker: true, dir: true } } },
      orderBy: { priority: 'asc' },
      take: 20,
    }),

    // Ideas I haven't voted on yet (only for CIO/PM)
    isCioPm
      ? prisma.idea.findMany({
          where: {
            approvalStatus: 'REVIEW',
            voteJustifications: { none: { userId: user.legacyId } },
          },
          select: { id: true, ticker: true, dir: true, finalScore: true },
          take: 10,
        })
      : Promise.resolve([]),

    // Unread alerts
    prisma.tradeAlert.count({ where: { isRead: false } }),

    // Upcoming meetings in next 7 days
    prisma.committeeMeeting.findMany({
      where: {
        status: 'SCHEDULED',
        meetingDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: { agendaItems: { select: { id: true } } },
      orderBy: { meetingDate: 'asc' },
    }),

    // Allocation queue items (CIO/PM only)
    isCioPm
      ? prisma.allocationQueueEntry.count({ where: { status: 'PENDING' } })
      : Promise.resolve(0),

    // Ideas I authored where readiness < 80% and in review
    prisma.researchDoc.findMany({
      where: { authorId: user.legacyId, idea: { approvalStatus: 'REVIEW' } },
      select: { ideaId: true, idea: { select: { ticker: true } } },
      take: 10,
    }),
  ]);

  type ActionItem = {
    id: string;
    type: string;
    priority: string;
    title: string;
    detail: string;
    href: string;
    createdAt: string;
  };

  const actions: ActionItem[] = [];

  for (const q of openQuestions) {
    const isAssigned = q.assignedTo === user.legacyId;
    actions.push({
      id: `q-${q.id}`,
      type: 'QUESTION',
      priority: q.priority,
      title: isAssigned ? 'Answer Required' : 'Awaiting Answer',
      detail: `${q.idea?.ticker ?? 'Unknown'}: ${q.question.slice(0, 80)}`,
      href: `/dashboard/committee/${q.ideaId}?tab=questions`,
      createdAt: q.createdAt.toISOString(),
    });
  }

  for (const c of openChallenges) {
    actions.push({
      id: `c-${c.id}`,
      type: 'CHALLENGE',
      priority: c.priority,
      title: 'Challenge Unresolved',
      detail: `${c.idea?.ticker ?? 'Unknown'}: ${c.description.slice(0, 80)}`,
      href: `/dashboard/committee/${c.ideaId}?tab=challenges`,
      createdAt: c.createdAt.toISOString(),
    });
  }

  for (const idea of pendingVotes as { id: string; ticker: string; dir: string; finalScore: number | null }[]) {
    actions.push({
      id: `vote-${idea.id}`,
      type: 'VOTE_NEEDED',
      priority: 'HIGH',
      title: 'Vote Required',
      detail: `${idea.ticker} (${idea.dir}) — Score: ${idea.finalScore?.toFixed(1) ?? 'N/A'}`,
      href: `/dashboard/committee/${idea.id}?tab=votes`,
      createdAt: new Date().toISOString(),
    });
  }

  for (const meeting of upcomingMeetings) {
    const daysUntil = Math.ceil((meeting.meetingDate.getTime() - Date.now()) / 86400000);
    actions.push({
      id: `meeting-${meeting.id}`,
      type: 'MEETING',
      priority: daysUntil <= 1 ? 'HIGH' : 'MEDIUM',
      title: `Meeting ${daysUntil === 0 ? 'Today' : `in ${daysUntil}d`}`,
      detail: `${meeting.title} — ${meeting.agendaItems.length} items`,
      href: `/dashboard/committee/meetings/${meeting.id}`,
      createdAt: meeting.meetingDate.toISOString(),
    });
  }

  actions.sort((a, b) => {
    const rank = { HIGH: 0, MEDIUM: 1, LOW: 2, CRITICAL: -1 };
    return (rank[a.priority as keyof typeof rank] ?? 1) - (rank[b.priority as keyof typeof rank] ?? 1);
  });

  return NextResponse.json({
    actions,
    summary: {
      openQuestions: openQuestions.length,
      openChallenges: openChallenges.length,
      pendingVotes: (pendingVotes as unknown[]).length,
      unreadAlerts,
      upcomingMeetings: upcomingMeetings.length,
      queueItems,
      docsNeedingWork: readinessNeeded.length,
    },
  });
}
