import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-helpers';

export const dynamic = 'force-dynamic';

const MT5_URL = process.env.MT5_SERVICE_URL ?? 'http://localhost:8765';

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const upstream = await fetch(`${MT5_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    const data = await upstream.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'disconnected', mt5_connected: false }, { status: 503 });
  }
}
