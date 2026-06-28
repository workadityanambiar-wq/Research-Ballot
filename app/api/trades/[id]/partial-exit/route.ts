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
    include: { position: true },
  });
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!['ACTIVE', 'PARTIAL_EXIT'].includes(trade.status as string)) {
    return NextResponse.json({ error: 'Trade not active' }, { status: 400 });
  }
  if (!trade.position) return NextResponse.json({ error: 'No open position' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const exitPrice = parseFloat(body.exitPrice as string);
  const exitQty = parseFloat(body.quantity as string);
  const reason = (body.reason as string) ?? '';
  if (isNaN(exitPrice) || isNaN(exitQty)) return NextResponse.json({ error: 'exitPrice and quantity required' }, { status: 400 });

  const pos = trade.position;
  if (exitQty >= pos.quantity) return NextResponse.json({ error: 'Use close endpoint for full exit' }, { status: 400 });

  const closeValue = exitPrice * exitQty;
  const costBasis = pos.avgCost * exitQty;
  const partialPnl = pos.direction === 'SHORT' ? costBasis - closeValue : closeValue - costBasis;
  const remainingQty = pos.quantity - exitQty;
  const remainingValue = remainingQty * (pos.currentPrice ?? exitPrice);

  await prisma.$transaction([
    prisma.tradeExecution.create({
      data: {
        tradeId: id, type: 'PARTIAL_EXIT', price: exitPrice,
        quantity: exitQty, value: closeValue, executedBy: user.legacyId,
        notes: reason,
      },
    }),
    prisma.position.update({
      where: { id: pos.id },
      data: {
        quantity: remainingQty,
        marketValue: remainingValue,
        realizedPnl: pos.realizedPnl + partialPnl,
        unrealizedPnl: remainingValue - pos.avgCost * remainingQty,
      },
    }),
    prisma.trade.update({ where: { id }, data: { status: 'PARTIAL_EXIT' } }),
    prisma.positionHistory.create({
      data: {
        tradeId: id, eventType: 'PARTIAL_PROFIT',
        description: `Partial exit: ${exitQty} shares @ $${exitPrice} — ${partialPnl >= 0 ? '+' : ''}$${partialPnl.toFixed(0)}. ${remainingQty} remaining.${reason ? ' ' + reason : ''}`,
        price: exitPrice, quantity: exitQty, value: closeValue, createdBy: user.legacyId,
      },
    }),
    prisma.auditLog.create({
      data: { userId: user.id, action: 'PARTIAL_EXIT_RECORDED', detail: `Partial exit ${exitQty} @ ${exitPrice} on trade ${id}`, risk: 'LOW' },
    }),
  ]);

  return NextResponse.json({ partialPnl, remainingQty });
}
