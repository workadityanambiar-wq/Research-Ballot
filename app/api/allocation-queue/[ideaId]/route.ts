import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['CIO', 'PM'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { ideaId } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, rank, capitalRequested, recommendedAlloc, portfolioExposurePct, riskRating, notes, status } = body;

  if (action === 'add') {
    const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
    if (!idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 });

    const maxRank = await prisma.allocationQueueEntry.findFirst({ orderBy: { rank: 'desc' }, select: { rank: true } });
    const nextRank = (maxRank?.rank ?? 0) + 1;

    const entry = await prisma.allocationQueueEntry.upsert({
      where: { ideaId },
      update: { rank: (rank as number) ?? nextRank, notes: (notes as string) ?? null, status: (status as string) ?? 'PENDING', updatedBy: user.legacyId },
      create: {
        ideaId,
        rank: (rank as number) ?? nextRank,
        capitalRequested: (capitalRequested as number) ?? null,
        recommendedAlloc: (recommendedAlloc as number) ?? null,
        portfolioExposurePct: (portfolioExposurePct as number) ?? null,
        riskRating: (riskRating as string) ?? 'MEDIUM',
        notes: (notes as string) ?? null,
        updatedBy: user.legacyId,
      },
    });

    prisma.auditLog.create({
      data: { userId: user.id, action: 'ALLOCATION_QUEUE_UPDATED', detail: `${ideaId} added to allocation queue at rank ${entry.rank}`, risk: 'LOW' },
    }).catch(() => {});

    return NextResponse.json({ ...entry, createdAt: entry.createdAt.toISOString(), updatedAt: entry.updatedAt.toISOString() });
  }

  if (action === 'remove') {
    await prisma.allocationQueueEntry.deleteMany({ where: { ideaId } });
    return NextResponse.json({ ok: true });
  }

  const update: Record<string, unknown> = { updatedBy: user.legacyId };
  if ('rank' in body) update.rank = body.rank;
  if ('capitalRequested' in body) update.capitalRequested = body.capitalRequested;
  if ('recommendedAlloc' in body) update.recommendedAlloc = body.recommendedAlloc;
  if ('portfolioExposurePct' in body) update.portfolioExposurePct = body.portfolioExposurePct;
  if ('riskRating' in body) update.riskRating = body.riskRating;
  if ('notes' in body) update.notes = body.notes;
  if ('status' in body) update.status = body.status;

  const entry = await prisma.allocationQueueEntry.update({ where: { ideaId }, data: update });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'ALLOCATION_QUEUE_UPDATED', detail: `Allocation queue entry updated for ${ideaId}`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json({ ...entry, createdAt: entry.createdAt.toISOString(), updatedAt: entry.updatedAt.toISOString() });
}
