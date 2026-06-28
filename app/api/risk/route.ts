import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

const TOTAL_CAPITAL = 1_000_000;

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const positions = await prisma.position.findMany({
    where: { exitDate: null },
    include: {
      trade: {
        select: {
          strategy: true,
          idea: { select: { ticker: true, dir: true, assetClass: true } },
        },
      },
    },
  });

  const enriched = positions.map(p => ({
    ...p,
    ticker: p.trade?.idea?.ticker ?? p.ticker,
    direction: p.direction,
    assetClass: p.trade?.idea?.assetClass ?? 'Unknown',
    strategy: p.trade?.strategy ?? 'General',
    mv: p.marketValue ?? p.avgCost * p.quantity,
  }));

  const totalExposure = enriched.reduce((s, p) => s + p.mv, 0);
  const capitalAtRisk = enriched.reduce((s, p) => {
    if (!p.stopLoss) return s;
    const riskPerShare = Math.abs(p.avgCost - p.stopLoss);
    return s + riskPerShare * p.quantity;
  }, 0);

  // Concentration by sector
  const bySector: Record<string, number> = {};
  const byDirection: Record<string, number> = { LONG: 0, SHORT: 0 };
  const byStrategy: Record<string, number> = {};

  for (const p of enriched) {
    bySector[p.assetClass] = (bySector[p.assetClass] ?? 0) + p.mv;
    byDirection[p.direction] = (byDirection[p.direction] ?? 0) + p.mv;
    byStrategy[p.strategy] = (byStrategy[p.strategy] ?? 0) + p.mv;
  }

  // Largest / smallest positions
  const sorted = [...enriched].sort((a, b) => b.mv - a.mv);
  const largestPosition = sorted[0] ?? null;

  // High concentration warning (>20% of capital)
  const concentrationWarnings = enriched
    .filter(p => p.mv / TOTAL_CAPITAL > 0.2)
    .map(p => ({ ticker: p.ticker, pct: (p.mv / TOTAL_CAPITAL * 100).toFixed(1) }));

  // Positions near stop
  const nearStop = enriched
    .filter(p => p.stopLoss && p.currentPrice)
    .map(p => {
      const dist = p.direction === 'LONG'
        ? ((p.currentPrice! - p.stopLoss!) / p.currentPrice!) * 100
        : ((p.stopLoss! - p.currentPrice!) / p.currentPrice!) * 100;
      return { ticker: p.ticker, distToStop: parseFloat(dist.toFixed(2)), currentPrice: p.currentPrice, stopLoss: p.stopLoss };
    })
    .filter(p => p.distToStop < 5)
    .sort((a, b) => a.distToStop - b.distToStop);

  // Drawdown leaders
  const highDrawdown = enriched
    .filter(p => p.maxDrawdown !== null && p.maxDrawdown < -10)
    .map(p => ({ ticker: p.ticker, maxDrawdown: p.maxDrawdown }))
    .sort((a, b) => (a.maxDrawdown ?? 0) - (b.maxDrawdown ?? 0));

  return NextResponse.json({
    totalPositions: positions.length,
    totalExposure,
    capitalAtRisk,
    concentrationPct: totalExposure > 0 ? (totalExposure / TOTAL_CAPITAL) * 100 : 0,
    bySector,
    byDirection,
    byStrategy,
    largestPosition: largestPosition ? {
      ticker: largestPosition.ticker,
      mv: largestPosition.mv,
      pct: (largestPosition.mv / TOTAL_CAPITAL * 100).toFixed(1),
      direction: largestPosition.direction,
    } : null,
    concentrationWarnings,
    nearStop,
    highDrawdown,
    positions: enriched.map(p => ({
      id: p.id, tradeId: p.tradeId, ticker: p.ticker,
      direction: p.direction, mv: p.mv,
      pct: (p.mv / TOTAL_CAPITAL * 100).toFixed(1),
      unrealizedPnl: p.unrealizedPnl, returnPct: p.returnPct,
      stopLoss: p.stopLoss, target: p.target,
      currentPrice: p.currentPrice, avgCost: p.avgCost,
      assetClass: p.assetClass, strategy: p.strategy,
    })),
  });
}
