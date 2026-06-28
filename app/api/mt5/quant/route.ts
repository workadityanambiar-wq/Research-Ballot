import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-helpers';

export const dynamic = 'force-dynamic';

const MT5_URL = process.env.MT5_SERVICE_URL ?? 'http://localhost:8765';
const MT5_KEY = process.env.MT5_SERVICE_KEY ?? '';

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase().trim();
  const dir    = req.nextUrl.searchParams.get('dir')?.toUpperCase() ?? 'LONG';
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  if (dir !== 'LONG' && dir !== 'SHORT')
    return NextResponse.json({ error: 'dir must be LONG or SHORT' }, { status: 400 });

  try {
    const upstream = await fetch(
      `${MT5_URL}/quant/${encodeURIComponent(symbol)}?dir=${dir}`,
      {
        headers: { 'x-api-key': MT5_KEY },
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      },
    );

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({})) as Record<string, unknown>;
      return NextResponse.json(
        { error: (err.detail as string) ?? 'Quant calculation failed' },
        { status: upstream.status },
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch {
    return NextResponse.json({ error: 'MT5 quant service unavailable' }, { status: 503 });
  }
}
