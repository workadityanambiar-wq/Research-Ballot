import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const closedTrades = await prisma.trade.findMany({
    where: { status: 'CLOSED', deletedAt: null },
    orderBy: { closedAt: 'desc' },
    include: {
      idea: { select: { ticker: true, dir: true, authorId: true, assetClass: true } },
      position: true,
      attribution: true,
    },
  });

  const enriched = closedTrades.map(t => {
    const pos = t.position;
    return {
      id: t.id,
      ticker: t.idea?.ticker ?? '',
      direction: t.idea?.dir ? (t.idea.dir as string) : '',
      authorId: t.idea?.authorId ?? t.proposedBy,
      assetClass: t.idea?.assetClass ?? 'Unknown',
      strategy: t.strategy ?? 'General',
      closedAt: t.closedAt?.toISOString() ?? null,
      proposedAt: t.proposedAt.toISOString(),
      realizedPnl: pos?.realizedPnl ?? 0,
      returnPct: pos?.returnPct ?? 0,
      daysHeld: pos?.daysHeld ?? 0,
      maxGain: pos?.maxGain ?? 0,
      maxDrawdown: pos?.maxDrawdown ?? 0,
      avgCost: pos?.avgCost ?? 0,
      exitPrice: pos?.currentPrice ?? 0,
      attribution: t.attribution ? {
        ...t.attribution,
        createdAt: t.attribution.createdAt.toISOString(),
        updatedAt: t.attribution.updatedAt.toISOString(),
      } : null,
    };
  });

  // Aggregate stats
  const winners = enriched.filter(t => t.realizedPnl > 0);
  const losers = enriched.filter(t => t.realizedPnl <= 0);
  const winRate = enriched.length > 0 ? (winners.length / enriched.length) * 100 : 0;
  const totalPnl = enriched.reduce((s, t) => s + t.realizedPnl, 0);
  const avgReturn = enriched.length > 0 ? enriched.reduce((s, t) => s + t.returnPct, 0) / enriched.length : 0;
  const avgDaysHeld = enriched.length > 0 ? enriched.reduce((s, t) => s + t.daysHeld, 0) / enriched.length : 0;

  // By analyst
  const byAnalyst: Record<string, { trades: number; pnl: number; winRate: number }> = {};
  for (const t of enriched) {
    if (!byAnalyst[t.authorId]) byAnalyst[t.authorId] = { trades: 0, pnl: 0, winRate: 0 };
    byAnalyst[t.authorId].trades++;
    byAnalyst[t.authorId].pnl += t.realizedPnl;
  }
  for (const k of Object.keys(byAnalyst)) {
    const analystTrades = enriched.filter(t => t.authorId === k);
    const wins = analystTrades.filter(t => t.realizedPnl > 0).length;
    byAnalyst[k].winRate = analystTrades.length > 0 ? (wins / analystTrades.length) * 100 : 0;
  }

  // Average attribution scores
  const withAttr = enriched.filter(t => t.attribution);
  const avgAttribution = withAttr.length > 0 ? {
    researchQuality: withAttr.reduce((s, t) => s + (t.attribution?.researchQuality ?? 0), 0) / withAttr.length,
    entryTiming: withAttr.reduce((s, t) => s + (t.attribution?.entryTiming ?? 0), 0) / withAttr.length,
    exitTiming: withAttr.reduce((s, t) => s + (t.attribution?.exitTiming ?? 0), 0) / withAttr.length,
    catalystOutcome: withAttr.reduce((s, t) => s + (t.attribution?.catalystOutcome ?? 0), 0) / withAttr.length,
    riskMgmt: withAttr.reduce((s, t) => s + (t.attribution?.riskMgmt ?? 0), 0) / withAttr.length,
    positionSizing: withAttr.reduce((s, t) => s + (t.attribution?.positionSizing ?? 0), 0) / withAttr.length,
    executionQuality: withAttr.reduce((s, t) => s + (t.attribution?.executionQuality ?? 0), 0) / withAttr.length,
  } : null;

  return NextResponse.json({
    totalTrades: enriched.length,
    winners: winners.length,
    losers: losers.length,
    winRate,
    totalPnl,
    avgReturn,
    avgDaysHeld,
    byAnalyst,
    avgAttribution,
    trades: enriched,
  });
}
