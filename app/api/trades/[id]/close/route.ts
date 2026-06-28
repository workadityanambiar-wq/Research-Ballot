import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['CIO', 'PM'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const trade = await prisma.trade.findUnique({
    where: { id, deletedAt: null },
    include: { position: true, idea: true },
  });
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!['ACTIVE', 'PARTIAL_EXIT'].includes(trade.status as string)) {
    return NextResponse.json({ error: 'Trade not active' }, { status: 400 });
  }
  if (!trade.position) return NextResponse.json({ error: 'No open position' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const exitPrice = parseFloat(body.exitPrice as string);
  const reason = (body.reason as string) ?? 'Manual close';
  if (isNaN(exitPrice)) return NextResponse.json({ error: 'exitPrice required' }, { status: 400 });

  const pos = trade.position;
  const qty = pos.quantity;
  const closeValue = exitPrice * qty;
  const costBasis = pos.avgCost * qty;
  const realizedPnl = pos.direction === 'SHORT' ? costBasis - closeValue : closeValue - costBasis;
  const returnPct = ((realizedPnl / costBasis) * 100);
  const exitDate = new Date();

  await prisma.$transaction([
    prisma.tradeExecution.create({
      data: {
        tradeId: id, type: 'FULL_EXIT', price: exitPrice,
        quantity: qty, value: closeValue, executedBy: user.legacyId, executedAt: exitDate,
        notes: reason,
      },
    }),
    prisma.position.update({
      where: { id: pos.id },
      data: {
        quantity: 0, currentPrice: exitPrice, marketValue: 0,
        unrealizedPnl: 0, realizedPnl: pos.realizedPnl + realizedPnl,
        returnPct, exitDate,
      },
    }),
    prisma.trade.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: exitDate },
    }),
    prisma.positionHistory.create({
      data: {
        tradeId: id, eventType: 'CLOSED',
        description: `Position fully closed @ $${exitPrice} — ${realizedPnl >= 0 ? '+' : ''}${realizedPnl.toFixed(0)} P&L (${returnPct.toFixed(2)}%). ${reason}`,
        price: exitPrice, quantity: qty, value: closeValue, createdBy: user.legacyId,
      },
    }),
    prisma.auditLog.create({
      data: { userId: user.id, action: 'POSITION_CLOSED', detail: `Trade ${id} closed @ ${exitPrice}`, risk: 'MEDIUM' },
    }),
  ]);

  return NextResponse.json({ closed: true, realizedPnl, returnPct });
}
