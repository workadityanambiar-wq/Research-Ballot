import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WEEK_ID, ROUND_BUDGET, getPhase } from '@/lib/data';
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

  // Phase enforcement — only accept allocations when the round is open
  const phase = getPhase();
  const roundPhase: Record<number, string> = { 1: 'round1', 2: 'round2' };
  if (phase !== roundPhase[round]) {
    return NextResponse.json({ error: `Round ${round} is not currently open` }, { status: 400 });
  }

  // Validate individual amounts: must be positive integers
  for (const a of allocs) {
    if (!Number.isInteger(a.amount) || a.amount <= 0) {
      return NextResponse.json({ error: 'Each allocation must be a positive integer' }, { status: 400 });
    }
  }

  // Validate total equals exactly ROUND_BUDGET
  const total = allocs.reduce((s, a) => s + a.amount, 0);
  if (total !== ROUND_BUDGET) {
    return NextResponse.json(
      { error: `Total must equal exactly $${ROUND_BUDGET.toLocaleString()} (got $${total.toLocaleString()})` },
      { status: 400 },
    );
  }

  // Validate no self-voting
  const ideaIds = allocs.map(a => a.ideaId);
  const ownIdeas = await prisma.idea.count({ where: { id: { in: ideaIds }, authorId: legacyId, weekId } });
  if (ownIdeas > 0) {
    return NextResponse.json({ error: 'Cannot allocate to your own ideas' }, { status: 400 });
  }

  // Validate no duplicate ideaIds in the same submission
  const uniqueIdeaIds = new Set(ideaIds);
  if (uniqueIdeaIds.size !== ideaIds.length) {
    return NextResponse.json({ error: 'Duplicate idea IDs in allocation' }, { status: 400 });
  }

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
