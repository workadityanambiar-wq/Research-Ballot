import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const position = await prisma.position.findUnique({
    where: { id },
    include: {
      trade: {
        include: {
          idea: true,
          executions: { orderBy: { executedAt: 'asc' } },
          history: { orderBy: { createdAt: 'asc' } },
          journal: true,
          alerts: { where: { isRead: false }, orderBy: { createdAt: 'desc' } },
        },
      },
    },
  });
  if (!position) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(serialize(position));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['CIO', 'PM'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  const position = await prisma.position.findUnique({ where: { id } });
  if (!position) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const update: Record<string, unknown> = { lastPriceUpdate: new Date() };

  if ('currentPrice' in body) {
    const cp = parseFloat(body.currentPrice as string);
    if (!isNaN(cp)) {
      update.currentPrice = cp;
      const mv = cp * position.quantity;
      update.marketValue = mv;
      const costBasis = position.avgCost * position.quantity;
      update.unrealizedPnl = position.direction === 'SHORT' ? costBasis - mv : mv - costBasis;
      update.returnPct = ((update.unrealizedPnl as number) / costBasis) * 100;
      // Track max gain / max drawdown
      if (position.maxGain === null || (update.returnPct as number) > position.maxGain) update.maxGain = update.returnPct;
      if (position.maxDrawdown === null || (update.returnPct as number) < position.maxDrawdown) update.maxDrawdown = update.returnPct;
    }
  }

  if ('stopLoss' in body) update.stopLoss = parseFloat(body.stopLoss as string) || null;
  if ('target' in body) update.target = parseFloat(body.target as string) || null;

  // Record stop/target adjustment in history
  const tradeId = position.tradeId;
  if ('stopLoss' in body) {
    prisma.positionHistory.create({
      data: { tradeId, eventType: 'STOP_ADJUSTED', description: `Stop updated to $${update.stopLoss}`, price: update.stopLoss as number, createdBy: user.legacyId },
    }).catch(() => {});
  }

  const daysHeld = Math.floor((Date.now() - position.entryDate.getTime()) / 86400000);
  update.daysHeld = daysHeld;

  const updated = await prisma.position.update({ where: { id }, data: update });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'POSITION_UPDATED', detail: `Position ${id} updated`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json({
    ...updated,
    entryDate: updated.entryDate.toISOString(),
    exitDate: updated.exitDate?.toISOString() ?? null,
    lastPriceUpdate: updated.lastPriceUpdate?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(p: any) {
  const serDt = (d: Date | null | undefined) => d?.toISOString?.() ?? null;
  return {
    ...p,
    entryDate: p.entryDate?.toISOString?.() ?? p.entryDate,
    exitDate: serDt(p.exitDate),
    lastPriceUpdate: serDt(p.lastPriceUpdate),
    createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
    updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
    trade: p.trade ? {
      ...p.trade,
      status: p.trade.status as string,
      proposedAt: p.trade.proposedAt?.toISOString?.() ?? p.trade.proposedAt,
      approvedAt: serDt(p.trade.approvedAt),
      closedAt: serDt(p.trade.closedAt),
      createdAt: p.trade.createdAt?.toISOString?.() ?? p.trade.createdAt,
      updatedAt: p.trade.updatedAt?.toISOString?.() ?? p.trade.updatedAt,
      idea: p.trade.idea ? {
        ...p.trade.idea,
        dir: p.trade.idea.dir as string,
        approvalStatus: p.trade.idea.approvalStatus as string,
        submittedAt: p.trade.idea.submittedAt?.toISOString?.() ?? p.trade.idea.submittedAt,
        createdAt: p.trade.idea.createdAt?.toISOString?.() ?? p.trade.idea.createdAt,
        updatedAt: p.trade.idea.updatedAt?.toISOString?.() ?? p.trade.idea.updatedAt,
      } : null,
      executions: (p.trade.executions ?? []).map((e: Record<string, unknown>) => ({
        ...e, type: e.type as string,
        executedAt: (e.executedAt as Date)?.toISOString?.() ?? e.executedAt,
        createdAt: (e.createdAt as Date)?.toISOString?.() ?? e.createdAt,
      })),
      history: (p.trade.history ?? []).map((h: Record<string, unknown>) => ({
        ...h, createdAt: (h.createdAt as Date)?.toISOString?.() ?? h.createdAt,
      })),
      journal: (p.trade.journal ?? []).map((j: Record<string, unknown>) => ({
        ...j,
        createdAt: (j.createdAt as Date)?.toISOString?.() ?? j.createdAt,
        updatedAt: (j.updatedAt as Date)?.toISOString?.() ?? j.updatedAt,
      })),
      alerts: (p.trade.alerts ?? []).map((a: Record<string, unknown>) => ({
        ...a, alertType: a.alertType as string,
        readAt: serDt(a.readAt as Date | null),
        createdAt: (a.createdAt as Date)?.toISOString?.() ?? a.createdAt,
      })),
    } : null,
  };
}
