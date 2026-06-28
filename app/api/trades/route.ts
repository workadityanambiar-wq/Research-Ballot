import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status');
  const ideaId = req.nextUrl.searchParams.get('ideaId');

  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  if (ideaId) where.ideaId = ideaId;

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      idea: { select: { ticker: true, dir: true, entry: true, target: true, stop: true, thesis: true, authorId: true, approvalStatus: true } },
      position: true,
    },
  });

  return NextResponse.json(trades.map(serializeTrade));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['CIO', 'PM'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { ideaId } = body;
  if (!ideaId || typeof ideaId !== 'string') return NextResponse.json({ error: 'ideaId required' }, { status: 400 });

  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  if (idea.approvalStatus !== 'APPROVED') return NextResponse.json({ error: 'Idea not yet approved' }, { status: 400 });

  const trade = await prisma.trade.create({
    data: {
      ideaId,
      proposedBy: user.legacyId,
      side: idea.dir === 'SHORT' ? 'SELL' : 'BUY',
      entryPrice: idea.entry,
      stopLoss: idea.stop,
      target1: idea.target,
      convictionLevel: idea.conv,
      timeHorizon: idea.hold,
      positionSize: idea.posSize,
      tradeRationale: idea.thesis,
    },
    include: {
      idea: { select: { ticker: true, dir: true, entry: true, target: true, stop: true, thesis: true, authorId: true, approvalStatus: true } },
      position: true,
    },
  });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'TRADE_PROPOSAL_CREATED', detail: `Trade proposal created for ${idea.ticker} (${ideaId})`, risk: 'MEDIUM' },
  }).catch(() => {});

  prisma.positionHistory.create({
    data: { tradeId: trade.id, eventType: 'PROPOSED', description: `Trade proposal created by ${user.legacyId}`, createdBy: user.legacyId },
  }).catch(() => {});

  return NextResponse.json(serializeTrade(trade), { status: 201 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTrade(t: any) {
  return {
    ...t,
    status: t.status as string,
    proposedAt: t.proposedAt?.toISOString?.() ?? t.proposedAt,
    approvedAt: t.approvedAt?.toISOString?.() ?? null,
    closedAt: t.closedAt?.toISOString?.() ?? null,
    createdAt: t.createdAt?.toISOString?.() ?? t.createdAt,
    updatedAt: t.updatedAt?.toISOString?.() ?? t.updatedAt,
    idea: t.idea ? { ...t.idea, dir: t.idea.dir as string, approvalStatus: t.idea.approvalStatus as string } : null,
    position: t.position ? serializePosition(t.position) : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePosition(p: any) {
  return {
    ...p,
    entryDate: p.entryDate?.toISOString?.() ?? p.entryDate,
    exitDate: p.exitDate?.toISOString?.() ?? null,
    lastPriceUpdate: p.lastPriceUpdate?.toISOString?.() ?? null,
    createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
    updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
  };
}
