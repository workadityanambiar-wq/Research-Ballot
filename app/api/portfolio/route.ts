import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';
import { WEEK_ID } from '@/lib/data';

const SECTOR_MAP: Record<string, string> = {
  NVDA: 'Technology', MSFT: 'Technology', META: 'Technology', GOOGL: 'Technology',
  AMZN: 'Technology', AAPL: 'Technology', TSLA: 'Consumer', GS: 'Financials',
  JPM: 'Financials', XOM: 'Energy',
};

const BETA_MAP: Record<string, number> = {
  NVDA: 1.42, MSFT: 0.91, META: 1.28, GS: 1.15, TSLA: 1.88,
  AMZN: 1.12, XOM: 0.78, GOOGL: 1.05, JPM: 1.08, AAPL: 1.14,
};

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const weekId = url.searchParams.get('weekId') ?? WEEK_ID;

  const ideas = await prisma.idea.findMany({
    where: { weekId },
    select: { id: true, ticker: true, dir: true, expRet: true, rank: true, finalScore: true },
    orderBy: [{ rank: 'asc' }, { finalScore: 'desc' }],
  });

  const positions = ideas.map((idea, i) => ({
    rank: i + 1,
    ideaId: idea.id,
    ticker: idea.ticker,
    dir: idea.dir as 'LONG' | 'SHORT',
    alloc: i < 3 ? 15 : i < 8 ? 8 : 0,
    expRet: idea.expRet,
    sector: SECTOR_MAP[idea.ticker] ?? 'Other',
    beta: BETA_MAP[idea.ticker] ?? 1.0,
    pmOvr: false,
  }));

  return NextResponse.json(positions);
}
