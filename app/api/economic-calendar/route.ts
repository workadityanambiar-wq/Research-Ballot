import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-helpers';

export const dynamic = 'force-dynamic';

export interface EcoEvent {
  id: string;
  title: string;
  date: string;        // ISO UTC
  currency: string;    // country code e.g. "US"
  importance: 1 | 2 | 3;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

const _cache = new Map<string, { events: EcoEvent[]; at: number }>();
const TTL = 4 * 3600 * 1000; // 4 h

interface FinnhubEvent {
  event:    string;
  country:  string;
  impact:   string;         // "low" | "medium" | "high"
  actual:   string | null;
  estimate: string | null;
  prev:     string | null;
  time:     string;         // "YYYY-MM-DD HH:MM:SS" UTC
}

function toImportance(impact: string): 1 | 2 | 3 {
  if (impact === 'high')   return 3;
  if (impact === 'medium') return 2;
  return 1;
}

async function fetchFromFinnhub(dateFrom: string, dateTo: string): Promise<EcoEvent[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error('FINNHUB_API_KEY not configured');

  const url = `https://finnhub.io/api/v1/calendar/economic?from=${dateFrom}&to=${dateTo}&token=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) });

  if (!res.ok) throw new Error(`Finnhub ${res.status} ${res.statusText}`);

  const json = await res.json() as { economicCalendar?: FinnhubEvent[] };
  const items = json.economicCalendar ?? [];

  return items
    .filter(e => e.event && e.time)
    .map(e => ({
      id:         `eco-${e.country}-${e.time}-${e.event}`.replace(/\s+/g, '-'),
      title:      e.event,
      date:       new Date(e.time.replace(' ', 'T') + 'Z').toISOString(),
      currency:   e.country ?? 'US',
      importance: toImportance(e.impact),
      actual:     e.actual   ?? null,
      forecast:   e.estimate ?? null,
      previous:   e.prev     ?? null,
    }));
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const fromStr = req.nextUrl.searchParams.get('from') ?? new Date().toISOString();
  const toStr   = req.nextUrl.searchParams.get('to')   ?? new Date(Date.now() + 30 * 86400_000).toISOString();

  const dateFrom = fromStr.slice(0, 10);
  const dateTo   = toStr.slice(0, 10);
  const cacheKey = `${dateFrom}_${dateTo}`;

  const hit = _cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json({ events: hit.events, source: 'cache', fetchedAt: new Date(hit.at).toISOString() });
  }

  try {
    const events = await fetchFromFinnhub(dateFrom, dateTo);
    _cache.set(cacheKey, { events, at: Date.now() });
    return NextResponse.json({ events, source: 'finnhub', fetchedAt: new Date().toISOString() });
  } catch (err) {
    if (hit) {
      return NextResponse.json({ events: hit.events, source: 'stale-cache', fetchedAt: new Date(hit.at).toISOString() });
    }
    return NextResponse.json({ events: [], source: 'error', error: String(err) });
  }
}
