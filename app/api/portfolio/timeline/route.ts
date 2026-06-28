import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const take = parseInt(req.nextUrl.searchParams.get('take') ?? '100');
  const tradeId = req.nextUrl.searchParams.get('tradeId') ?? undefined;

  const events = await prisma.positionHistory.findMany({
    where: tradeId ? { tradeId } : {},
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      trade: {
        select: { id: true, idea: { select: { ticker: true, dir: true } } },
      },
    },
  });

  return NextResponse.json(events.map(e => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    trade: e.trade ? {
      id: e.trade.id,
      ticker: e.trade.idea?.ticker ?? '',
      dir: e.trade.idea?.dir ? (e.trade.idea.dir as string) : '',
    } : null,
  })));
}
