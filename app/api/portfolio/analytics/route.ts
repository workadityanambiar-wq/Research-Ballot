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

const BETA_MAP: Record<string, number> = {
  NVDA: 1.42, MSFT: 0.91, META: 1.28, GS: 1.15, TSLA: 1.88,
  AMZN: 1.12, XOM: 0.78, GOOGL: 1.05, JPM: 1.08, AAPL: 1.14,
};

const MARKET_VOL = 0.16;

function sectorBaseCorr(sA: string, sB: string): number {
  if (sA === sB) return 0.72;
  const pair = [sA, sB].sort().join('-');
  const CROSS: Record<string, number> = {
    'Financials-Technology': 0.38,
    'Consumer-Technology': 0.35,
    'Energy-Technology': 0.18,
    'Consumer-Financials': 0.35,
    'Energy-Financials': 0.28,
    'Consumer-Energy': 0.22,
  };
  return CROSS[pair] ?? 0.25;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const weekId = req.nextUrl.searchParams.get('weekId') ?? WEEK_ID;

  const ideas = await prisma.idea.findMany({
    where: { weekId },
    select: { ticker: true, dir: true, expRet: true },
    orderBy: [{ rank: 'asc' }, { finalScore: 'desc' }],
  });

  const items = ideas.map((idea, i) => ({
    ticker: idea.ticker,
    dir: idea.dir as string,
    alloc: i < 3 ? 15 : i < 8 ? 8 : 0,
    expRet: idea.expRet,
    sector: SECTOR_MAP[idea.ticker] ?? 'Other',
    beta: BETA_MAP[idea.ticker] ?? 1.0,
  }));

  const n = items.length;

  // Pairwise correlation: sector baseline × direction sign + beta adjustment
  const corrMatrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1.0;
      const a = items[i], b = items[j];
      const base = sectorBaseCorr(a.sector, b.sector);
      const dirSign = a.dir === b.dir ? 1 : -1;
      const betaAdj = (a.beta - 1) * (b.beta - 1) * 0.05;
      return parseFloat(Math.max(-0.99, Math.min(0.99, base * dirSign + betaAdj)).toFixed(2));
    })
  );

  // Portfolio variance using CAPM-derived single-factor vol (only allocated positions)
  const allocated = items.filter(item => item.alloc > 0);
  let portfolioVariance = 0;
  for (let i = 0; i < allocated.length; i++) {
    for (let j = 0; j < allocated.length; j++) {
      const wi = allocated[i].alloc / 100;
      const wj = allocated[j].alloc / 100;
      const voli = allocated[i].beta * MARKET_VOL;
      const volj = allocated[j].beta * MARKET_VOL;
      const ii = items.findIndex(x => x.ticker === allocated[i].ticker);
      const jj = items.findIndex(x => x.ticker === allocated[j].ticker);
      const corr = ii === jj ? 1 : corrMatrix[ii][jj];
      portfolioVariance += wi * wj * corr * voli * volj;
    }
  }
  const volatility = parseFloat((Math.sqrt(portfolioVariance) * 100).toFixed(1));

  const expectedReturn = parseFloat(
    items.reduce((sum, item) => sum + (item.alloc / 100) * item.expRet, 0).toFixed(2)
  );
  const sharpe = volatility > 0 ? parseFloat((expectedReturn / volatility).toFixed(2)) : null;

  return NextResponse.json({
    tickers: items.map(i => i.ticker),
    corrMatrix,
    volatility,
    sharpe,
    expectedReturn,
    dataSource: 'computed',
    lastUpdated: new Date().toISOString(),
  });
}
