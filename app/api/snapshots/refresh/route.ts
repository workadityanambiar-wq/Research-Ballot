import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';
import { WEEK_ID } from '@/lib/data';

export const dynamic = 'force-dynamic';

// GET: read current live state for all snapshots in a week (no MT5 call, DB read only)
export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const weekId = req.nextUrl.searchParams.get('weekId') ?? WEEK_ID;
  const snapshots = await prisma.ideaMarketSnapshot.findMany({
    where: { weekId },
    select: {
      ideaId: true, symbol: true, direction: true,
      cmp: true, currentPrice: true, currentPnlPct: true, currentPnlAbs: true,
      distanceToTarget: true, distanceToStop: true,
      mfe: true, mae: true, tradeStatus: true, lastPriceUpdate: true,
    },
  });

  return NextResponse.json(
    snapshots.map(s => ({
      ...s,
      lastPriceUpdate: s.lastPriceUpdate?.toISOString() ?? null,
    })),
  );
}

const MT5_URL = process.env.MT5_SERVICE_URL ?? 'http://localhost:8765';
const MT5_KEY = process.env.MT5_SERVICE_KEY ?? '';

async function fetchMt5Mid(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${MT5_URL}/quote/${encodeURIComponent(symbol)}`,
      { headers: { 'x-api-key': MT5_KEY }, cache: 'no-store', signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = await res.json() as { mid: number };
    return data.mid ?? null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { weekId?: string } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }
  const weekId = body.weekId ?? WEEK_ID;

  const snapshots = await prisma.ideaMarketSnapshot.findMany({
    where: { weekId, tradeStatus: 'OPEN' },
    select: {
      id: true, symbol: true, direction: true, cmp: true,
      targetPrice: true, stopPrice: true, mfe: true, mae: true,
    },
  });

  if (snapshots.length === 0) {
    return NextResponse.json({ updated: 0, prices: {} });
  }

  // One MT5 call per unique symbol
  const symbols = [...new Set(snapshots.map(s => s.symbol))];
  const prices: Record<string, number | null> = {};
  await Promise.allSettled(
    symbols.map(async sym => { prices[sym] = await fetchMt5Mid(sym); }),
  );

  const now = new Date();
  let updated = 0;

  await Promise.allSettled(
    snapshots.map(async snap => {
      const currentPrice = prices[snap.symbol];
      if (currentPrice == null) return;

      const { direction, cmp, targetPrice, stopPrice, mfe, mae } = snap;
      const isLong = direction === 'LONG';

      const pnlPct = isLong
        ? ((currentPrice - cmp) / cmp) * 100
        : ((cmp - currentPrice) / cmp) * 100;

      const distToTarget = isLong
        ? ((targetPrice - currentPrice) / currentPrice) * 100
        : ((currentPrice - targetPrice) / currentPrice) * 100;
      const distToStop = isLong
        ? ((currentPrice - stopPrice) / currentPrice) * 100
        : ((stopPrice - currentPrice) / currentPrice) * 100;

      const newMfe = Math.max(mfe ?? 0, pnlPct > 0 ? pnlPct : 0);
      const newMae = Math.min(mae ?? 0, pnlPct < 0 ? pnlPct : 0);

      let tradeStatus = 'OPEN';
      if (isLong) {
        if (currentPrice >= targetPrice) tradeStatus = 'TARGET_HIT';
        else if (currentPrice <= stopPrice) tradeStatus = 'STOP_HIT';
      } else {
        if (currentPrice <= targetPrice) tradeStatus = 'TARGET_HIT';
        else if (currentPrice >= stopPrice) tradeStatus = 'STOP_HIT';
      }

      await prisma.ideaMarketSnapshot.update({
        where: { id: snap.id },
        data: {
          currentPrice,
          currentPnlPct:    +pnlPct.toFixed(4),
          currentPnlAbs:    +(currentPrice - cmp).toFixed(6),
          distanceToTarget: +distToTarget.toFixed(4),
          distanceToStop:   +distToStop.toFixed(4),
          mfe: +newMfe.toFixed(4),
          mae: +newMae.toFixed(4),
          tradeStatus,
          lastPriceUpdate: now,
        },
      });
      updated++;
    }),
  );

  return NextResponse.json({
    updated,
    prices: Object.fromEntries(
      Object.entries(prices).filter(([, v]) => v != null) as [string, number][],
    ),
  });
}
