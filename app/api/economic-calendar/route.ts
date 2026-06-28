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

interface FmpEvent {
  event:    string;
  date:     string;   // "YYYY-MM-DD HH:MM:SS" UTC
  country:  string;
  actual:   string | null;
  estimate: string | null;
  previous: string | null;
  impact:   string;   // "Low" | "Medium" | "High"
}

function toImportance(impact: string): 1 | 2 | 3 {
  const s = (impact ?? '').toLowerCase();
  if (s === 'high')   return 3;
  if (s === 'medium') return 2;
  return 1;
}

async function fetchFromFmp(dateFrom: string, dateTo: string): Promise<EcoEvent[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new Error('FMP_API_KEY not configured');

  const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${dateFrom}&to=${dateTo}&apikey=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) });

  if (!res.ok) throw new Error(`FMP ${res.status} ${res.statusText}`);

  const items = await res.json() as FmpEvent[];
  if (!Array.isArray(items)) throw new Error('Unexpected FMP response shape');

  return items
    .filter(e => e.event && e.date)
    .map(e => ({
      id:         `eco-${e.country}-${e.date}-${e.event}`.replace(/\s+/g, '-'),
      title:      e.event,
      date:       new Date(e.date.replace(' ', 'T') + 'Z').toISOString(),
      currency:   e.country ?? 'US',
      importance: toImportance(e.impact),
      actual:     e.actual   ?? null,
      forecast:   e.estimate ?? null,
      previous:   e.previous ?? null,
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
    const events = await fetchFromFmp(dateFrom, dateTo);
    _cache.set(cacheKey, { events, at: Date.now() });
    return NextResponse.json({ events, source: 'fmp', fetchedAt: new Date().toISOString() });
  } catch (err) {
    if (hit) {
      return NextResponse.json({ events: hit.events, source: 'stale-cache', fetchedAt: new Date(hit.at).toISOString() });
    }
    return NextResponse.json({ events: [], source: 'error', error: String(err) });
  }
}
