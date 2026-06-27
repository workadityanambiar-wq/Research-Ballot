import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WEEK_ID } from '@/lib/data';
import { getSessionUser } from '@/lib/session-helpers';

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
  await prisma.allocation.createMany({
    data: allocs.map(a => ({
      userId: legacyId,
      ideaId: a.ideaId,
      amount: a.amount,
      round,
      weekId,
      submittedAt: now,
    })),
  });

  const allWeekAllocs = await prisma.allocation.findMany({ where: { weekId } });
  const totalsByIdea: Record<string, number> = {};
  allWeekAllocs.forEach(a => { totalsByIdea[a.ideaId] = (totalsByIdea[a.ideaId] ?? 0) + a.amount; });
  const maxCredits = Math.max(...Object.values(totalsByIdea), 1);

  for (const { ideaId } of allocs) {
    const totalCredits = totalsByIdea[ideaId] ?? 0;
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { conv: true, expRet: true, rr: true, skillScore: true },
    });
    if (!idea) continue;
    const pmScore = (totalCredits / maxCredits) * 100;
    const rrScore = Math.min(100, (idea.rr / 3) * 100);
    const quantScore = (idea.conv / 10) * 60 + (Math.min(idea.expRet, 30) / 30) * 40;
    const finalScore = pmScore * 0.40 + idea.skillScore * 0.25 + rrScore * 0.20 + quantScore * 0.15;
    await prisma.idea.update({
      where: { id: ideaId },
      data: { totalCredits, pmScore, rrScore, quantScore, finalScore },
    });
  }

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
