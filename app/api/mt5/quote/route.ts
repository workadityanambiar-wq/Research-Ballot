import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-helpers';

export const dynamic = 'force-dynamic';

const MT5_URL = process.env.MT5_SERVICE_URL ?? 'http://localhost:8765';
const MT5_KEY = process.env.MT5_SERVICE_KEY ?? '';

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase().trim();
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  try {
    const upstream = await fetch(`${MT5_URL}/quote/${encodeURIComponent(symbol)}`, {
      headers: { 'x-api-key': MT5_KEY },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({})) as Record<string, unknown>;
      return NextResponse.json(
        { error: (err.detail as string) ?? 'MT5 quote failed' },
        { status: upstream.status },
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch {
    return NextResponse.json({ error: 'MT5 service unavailable' }, { status: 503 });
  }
}
