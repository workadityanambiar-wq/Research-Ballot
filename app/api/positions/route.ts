import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const closed = req.nextUrl.searchParams.get('closed') === '1';

  const positions = await prisma.position.findMany({
    where: closed ? { exitDate: { not: null } } : { exitDate: null },
    orderBy: { entryDate: 'desc' },
    include: {
      trade: {
        select: {
          id: true, status: true, proposedBy: true, strategy: true,
          idea: { select: { ticker: true, dir: true, authorId: true, assetClass: true, thesis: true } },
        },
      },
    },
  });

  return NextResponse.json(positions.map(p => ({
    ...p,
    direction: p.direction,
    entryDate: p.entryDate.toISOString(),
    exitDate: p.exitDate?.toISOString() ?? null,
    lastPriceUpdate: p.lastPriceUpdate?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    trade: p.trade ? { ...p.trade, status: p.trade.status as string, idea: p.trade.idea ? { ...p.trade.idea, dir: p.trade.idea.dir as string } : null } : null,
  })));
}
