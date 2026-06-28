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
    include: { idea: true, position: true },
  });
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!['APPROVED', 'ACTIVE', 'PARTIAL_EXIT'].includes(trade.status as string)) {
    return NextResponse.json({ error: 'Trade must be APPROVED before execution' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const price = parseFloat(body.price as string);
  const quantity = parseFloat(body.quantity as string);
  const fees = parseFloat((body.fees as string) ?? '0') || 0;
  const execType = (body.type as string) ?? 'ENTRY';
  const notes = (body.notes as string) ?? null;

  if (isNaN(price) || isNaN(quantity)) return NextResponse.json({ error: 'price and quantity required' }, { status: 400 });

  const value = price * quantity;
  const executedAt = body.executedAt ? new Date(body.executedAt as string) : new Date();

  const [execution] = await prisma.$transaction(async (tx) => {
    const exec = await tx.tradeExecution.create({
      data: { tradeId: id, type: execType as never, price, quantity, value, fees, executedBy: user.legacyId, executedAt, notes },
    });

    // Build/update position
    const ticker = trade.idea?.ticker ?? '';
    const direction = trade.idea?.dir === 'SHORT' ? 'SHORT' : 'LONG';

    if (!trade.position && (execType === 'ENTRY' || execType === 'ADD')) {
      await tx.position.create({
        data: {
          tradeId: id,
          ticker,
          direction,
          quantity,
          avgCost: price,
          currentPrice: price,
          marketValue: value,
          unrealizedPnl: 0,
          entryDate: executedAt,
          stopLoss: trade.stopLoss,
          target: trade.target1,
        },
      });
      await tx.trade.update({ where: { id }, data: { status: 'ACTIVE' } });
      await tx.positionHistory.create({
        data: { tradeId: id, eventType: 'OPENED', description: `Position opened: ${quantity} @ $${price}`, price, quantity, value, createdBy: user.legacyId },
      });
    } else if (trade.position && (execType === 'ADD')) {
      const pos = trade.position;
      const newQty = pos.quantity + quantity;
      const newAvg = ((pos.avgCost * pos.quantity) + (price * quantity)) / newQty;
      const marketValue = newQty * (pos.currentPrice ?? price);
      await tx.position.update({
        where: { id: pos.id },
        data: { quantity: newQty, avgCost: newAvg, marketValue, unrealizedPnl: marketValue - newAvg * newQty },
      });
      await tx.positionHistory.create({
        data: { tradeId: id, eventType: 'INCREASED', description: `Added ${quantity} shares @ $${price}`, price, quantity, value, createdBy: user.legacyId },
      });
    }

    await tx.auditLog.create({
      data: { userId: user.id, action: 'POSITION_OPENED', detail: `Execution: ${execType} ${quantity} @ ${price} on trade ${id}`, risk: 'MEDIUM' },
    });

    return [exec];
  });

  return NextResponse.json({
    ...execution,
    type: execution.type as string,
    executedAt: execution.executedAt.toISOString(),
    createdAt: execution.createdAt.toISOString(),
  }, { status: 201 });
}
