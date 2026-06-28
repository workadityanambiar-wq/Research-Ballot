import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WEEK_ID } from '@/lib/data';
import { getSessionUser } from '@/lib/session-helpers';
import { scoreIdeas } from '@/lib/scoring';
import type { Idea, User, VoteMap } from '@/lib/types';

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const weekId = req.nextUrl.searchParams.get('weekId') ?? WEEK_ID;
  const allocs = await prisma.allocation.findMany({ where: { weekId } });

  return NextResponse.json(allocs.map(a => ({
    id: a.id,
    userId: a.userId,
    ideaId: a.ideaId,
    amount: a.amount,
    round: a.round as 1 | 2,
    submittedAt: a.submittedAt.toISOString(),
    weekId: a.weekId,
  })));
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const legacyId = sessionUser.legacyId;

  let body: { allocations?: Array<{ ideaId: string; amount: number }>; round?: number; weekId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { allocations: allocs, round = 1, weekId = WEEK_ID } = body;
  if (!allocs?.length) return NextResponse.json({ error: 'No allocations provided' }, { status: 400 });

  const existing = await prisma.allocation.count({ where: { userId: legacyId, round, weekId } });
  if (existing > 0) {
    return NextResponse.json({ error: 'Already submitted this round' }, { status: 400 });
  }

  const now = new Date();

  // Save allocations then recalculate scores for ALL ideas in the week atomically
  await prisma.$transaction(async (tx) => {
    // 1. Persist new allocations
    await tx.allocation.createMany({
      data: allocs.map(a => ({
        userId: legacyId,
        ideaId: a.ideaId,
        amount: a.amount,
        round,
        weekId,
        submittedAt: now,
      })),
    });

    // 2. Load all ideas + all allocations for this week + all users
    const [allIdeas, allAllocs, dbUsers] = await Promise.all([
      tx.idea.findMany({ where: { weekId } }),
      tx.allocation.findMany({ where: { weekId } }),
      tx.user.findMany({
        select: {
          legacyId: true, email: true, displayName: true, title: true,
          role: true, tier: true, hitRate: true, avgRet: true,
          sharpe: true, drawCtrl: true, consistency: true,
          peerScore: true, ideaScore: true, allocScore: true, researchScore: true,
        },
      }),
    ]);

    // 3. Build VoteMap from all allocations (userId = legacyId in this table)
    const votes: VoteMap = {};
    for (const a of allAllocs) {
      if (!votes[a.ideaId]) votes[a.ideaId] = {};
      votes[a.ideaId][a.userId] = (votes[a.ideaId][a.userId] ?? 0) + a.amount;
    }

    // 4. Map to canonical types for the scoring engine
    const usersForScoring: User[] = dbUsers.map(u => ({
      id: u.legacyId,
      email: u.email ?? '',
      name: u.displayName,
      title: u.title,
      role: u.role as User['role'],
      tier: (u.tier === 'A_PLUS' ? 'A+' : u.tier) as User['tier'],
      hitRate: u.hitRate,
      avgRet: u.avgRet,
      sharpe: u.sharpe,
      drawCtrl: u.drawCtrl,
      consistency: u.consistency,
      peerScore: u.peerScore,
      ideaScore: u.ideaScore,
      allocScore: u.allocScore,
      researchScore: u.researchScore,
    }));

    const ideasForScoring = allIdeas.map(idea => ({
      ...idea,
      dir: idea.dir as Idea['dir'],
      approvalStatus: idea.approvalStatus as Idea['approvalStatus'],
      submittedAt: idea.submittedAt.toISOString(),
    })) as Idea[];

    // 5. Run canonical scoring across all ideas (no partial recalc)
    const scored = scoreIdeas(ideasForScoring, votes, usersForScoring);
    const scoreMap = new Map(scored.map(s => [s.id, s]));

    // 6. Update every idea with fresh scores and rank
    await Promise.all(allIdeas.map(idea => {
      const s = scoreMap.get(idea.id);
      if (!s) return;
      return tx.idea.update({
        where: { id: idea.id },
        data: {
          pmScore: +s.pmScore.toFixed(1),
          skillScore: +s.skillScore.toFixed(1),
          rrScore: +s.rrScore.toFixed(1),
          quantScore: +s.quantScore.toFixed(1),
          finalScore: +s.finalScore.toFixed(1),
          totalCredits: Math.round(s.totalCredits),
          rank: s.rank,
        },
      });
    }));
  });

  await prisma.auditLog.create({
    data: {
      userId: sessionUser.id,
      action: 'BALLOT_SUBMITTED',
      detail: `Round ${round} ballot: ${allocs.length} allocations, total $${allocs.reduce((s, a) => s + a.amount, 0)}`,
      risk: 'LOW',
    },
  });

  return NextResponse.json({ success: true });
}
