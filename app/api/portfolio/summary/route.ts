import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

const TOTAL_CAPITAL = 1_000_000; // $1M AUM

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [openPositions, closedPositions, activeTrades, proposals] = await Promise.all([
    prisma.position.findMany({ where: { exitDate: null } }),
    prisma.position.findMany({ where: { exitDate: { not: null } } }),
    prisma.trade.count({ where: { status: { in: ['ACTIVE', 'PARTIAL_EXIT'] }, deletedAt: null } }),
    prisma.trade.count({ where: { status: 'PROPOSAL', deletedAt: null } }),
  ]);

  const longPositions = openPositions.filter(p => p.direction === 'LONG');
  const shortPositions = openPositions.filter(p => p.direction === 'SHORT');

  const longExposure = longPositions.reduce((s, p) => s + (p.marketValue ?? p.avgCost * p.quantity), 0);
  const shortExposure = shortPositions.reduce((s, p) => s + (p.marketValue ?? p.avgCost * p.quantity), 0);
  const grossExposure = longExposure + shortExposure;
  const netExposure = longExposure - shortExposure;
  const unrealizedPnl = openPositions.reduce((s, p) => s + (p.unrealizedPnl ?? 0), 0);
  const realizedPnl = closedPositions.reduce((s, p) => s + p.realizedPnl, 0);
  const cashBalance = Math.max(0, TOTAL_CAPITAL - longExposure);

  // Win rate from closed positions
  const winners = closedPositions.filter(p => p.realizedPnl > 0);
  const losers = closedPositions.filter(p => p.realizedPnl < 0);
  const winRate = closedPositions.length > 0 ? (winners.length / closedPositions.length) * 100 : 0;
  const avgGain = winners.length > 0 ? winners.reduce((s, p) => s + (p.returnPct ?? 0), 0) / winners.length : 0;
  const avgLoss = losers.length > 0 ? Math.abs(losers.reduce((s, p) => s + (p.returnPct ?? 0), 0) / losers.length) : 0;
  const totalGains = winners.reduce((s, p) => s + p.realizedPnl, 0);
  const totalLosses = Math.abs(losers.reduce((s, p) => s + p.realizedPnl, 0));
  const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? 999 : 0;

  // Best/worst by return%
  const allClosed = closedPositions.filter(p => p.returnPct !== null);
  const bestReturn = allClosed.length > 0 ? Math.max(...allClosed.map(p => p.returnPct!)) : 0;
  const worstReturn = allClosed.length > 0 ? Math.min(...allClosed.map(p => p.returnPct!)) : 0;

  // Sector breakdown from trades
  const tradesWithIdeas = await prisma.trade.findMany({
    where: { status: { in: ['ACTIVE', 'PARTIAL_EXIT'] }, deletedAt: null },
    include: {
      idea: { select: { assetClass: true, dir: true } },
      position: { select: { marketValue: true, avgCost: true, quantity: true } },
    },
  });

  const bySector: Record<string, number> = {};
  const byStrategy: Record<string, number> = {};
  for (const t of tradesWithIdeas) {
    const val = t.position?.marketValue ?? (t.position ? t.position.avgCost * t.position.quantity : 0);
    const sector = t.idea?.assetClass ?? 'Unknown';
    bySector[sector] = (bySector[sector] ?? 0) + val;
    const strat = t.strategy ?? 'General';
    byStrategy[strat] = (byStrategy[strat] ?? 0) + val;
  }

  return NextResponse.json({
    totalEquity: TOTAL_CAPITAL,
    cashBalance,
    totalExposure: grossExposure,
    netExposure,
    grossExposure,
    longExposure,
    shortExposure,
    unrealizedPnl,
    realizedPnl,
    openPositions: openPositions.length,
    closedPositions: closedPositions.length,
    activeTrades,
    proposals,
    winRate,
    avgGain,
    avgLoss,
    profitFactor,
    bestReturn,
    worstReturn,
    bySector,
    byStrategy,
  });
}
