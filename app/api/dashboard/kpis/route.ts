import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';
import { WEEK_ID } from '@/lib/data';

export const dynamic = 'force-dynamic';

const SECTOR_MAP: Record<string, string> = {
  NVDA: 'Technology', MSFT: 'Technology', META: 'Technology', GOOGL: 'Technology',
  AMZN: 'Technology', AAPL: 'Technology', TSLA: 'Consumer', GS: 'Financials',
  JPM: 'Financials', XOM: 'Energy',
};

const TOTAL_CAPITAL = 1_000_000;

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const weekId = req.nextUrl.searchParams.get('weekId') ?? WEEK_ID;

  const [totalUsers, weekAllocators, ideas, snapshots, positions] = await Promise.all([
    prisma.user.count(),
    prisma.allocation.findMany({
      where: { weekId },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.idea.findMany({
      where: { weekId },
      select: { ticker: true, assetClass: true, approvalStatus: true, expRet: true },
      orderBy: [{ rank: 'asc' }, { finalScore: 'desc' }],
    }),
    prisma.portfolioSnapshot.findMany({
      orderBy: { snapshotDate: 'asc' },
      take: 52,
      select: { totalEquity: true, snapshotDate: true },
    }),
    prisma.position.findMany({
      where: { exitDate: null },
      select: { unrealizedPnl: true, marketValue: true, avgCost: true, quantity: true },
    }),
  ]);

  // Sector allocation derived from idea portfolio (auto-allocation rule)
  const sectorAlloc: Record<string, number> = {};
  let totalInvested = 0;
  ideas.forEach((idea, i) => {
    const alloc = i < 3 ? 15 : i < 8 ? 8 : 0;
    if (alloc > 0) {
      const sector = SECTOR_MAP[idea.ticker] ?? idea.assetClass ?? 'Other';
      sectorAlloc[sector] = (sectorAlloc[sector] ?? 0) + alloc;
      totalInvested += alloc;
    }
  });
  sectorAlloc['Cash'] = 100 - totalInvested;

  // Performance metrics from portfolio snapshots
  let performanceSeries: number[] = [];
  let portfolioReturnWtd: number | null = null;
  let ytdReturn: number | null = null;
  let sharpe: number | null = null;

  if (snapshots.length >= 2) {
    const baseEquity = snapshots[0].totalEquity || TOTAL_CAPITAL;
    performanceSeries = snapshots.map(s =>
      parseFloat((((s.totalEquity || TOTAL_CAPITAL) / baseEquity - 1) * 100).toFixed(2))
    );
    const latestEquity = snapshots[snapshots.length - 1].totalEquity || TOTAL_CAPITAL;
    const prevEquity = snapshots[snapshots.length - 2].totalEquity || TOTAL_CAPITAL;
    portfolioReturnWtd = parseFloat(((latestEquity / prevEquity - 1) * 100).toFixed(2));
    ytdReturn = parseFloat(((latestEquity / baseEquity - 1) * 100).toFixed(2));

    if (snapshots.length >= 4) {
      const returns = snapshots.slice(1).map((s, i) => {
        const base = snapshots[i].totalEquity || TOTAL_CAPITAL;
        return ((s.totalEquity || TOTAL_CAPITAL) - base) / base;
      });
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
      const annualStd = Math.sqrt(variance * 52);
      const annualReturn = mean * 52;
      if (annualStd > 0) sharpe = parseFloat((annualReturn / annualStd).toFixed(2));
    }
  } else if (positions.length > 0) {
    const unrealized = positions.reduce((s, p) => s + (p.unrealizedPnl ?? 0), 0);
    portfolioReturnWtd = parseFloat(((unrealized / TOTAL_CAPITAL) * 100).toFixed(2));
  }

  return NextResponse.json({
    weekId,
    dataSource: snapshots.length >= 3 ? 'live' : 'expected',
    activeAnalysts: weekAllocators.length || totalUsers,
    totalAnalysts: totalUsers,
    ideasCount: ideas.length,
    approvedCount: ideas.filter(i => i.approvalStatus === 'APPROVED').length,
    portfolioReturnWtd,
    ytdReturn,
    sharpe,
    sectorAllocation: Object.entries(sectorAlloc).map(([sector, pct]) => ({ sector, pct })),
    performanceSeries,
    lastUpdated: new Date().toISOString(),
  });
}
