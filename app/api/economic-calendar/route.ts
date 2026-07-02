import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-helpers';

export const dynamic = 'force-dynamic';

export interface EcoEvent {
  id: string;
  title: string;
  date: string;        // ISO UTC
  currency: string;    // currency code e.g. "USD"
  importance: 1 | 2 | 3;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

// Single cache entry for the weekly FF data (covers this week + next week)
let _cache: { events: EcoEvent[]; at: number } | null = null;
const TTL = 60 * 60 * 1000; // 1 h

interface FfEvent {
  title: string;
  country: string;   // currency code e.g. "USD"
  date: string;      // ISO with tz offset e.g. "2026-07-03T14:30:00-04:00"
  impact: string;    // "Low" | "Medium" | "High" | "Holiday"
  forecast: string;
  previous: string;
  actual?: string;
}

function toImportance(impact: string): 1 | 2 | 3 {
  const s = (impact ?? '').toLowerCase();
  if (s === 'high')   return 3;
  if (s === 'medium') return 2;
  return 1;
}

async function fetchFfWeek(url: string): Promise<FfEvent[]> {
  const res = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) throw new Error(`FF ${res.status}`);
  const items = await res.json() as FfEvent[];
  if (!Array.isArray(items)) throw new Error('Unexpected FF response');
  return items;
}

async function fetchFromForexFactory(): Promise<EcoEvent[]> {
  const urls = [
    'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
    'https://nfs.faireconomy.media/ff_calendar_nextweek.json',
  ];

  const results = await Promise.allSettled(urls.map(fetchFfWeek));
  const allItems: FfEvent[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') allItems.push(...r.value);
  }

  if (allItems.length === 0) throw new Error('No data from ForexFactory');

  return allItems
    .filter(e => e.title && e.date && e.impact?.toLowerCase() !== 'holiday')
    .map(e => ({
      id:         `eco-${e.country}-${e.date}-${e.title}`.replace(/\s+/g, '-'),
      title:      e.title,
      date:       new Date(e.date).toISOString(),
      currency:   e.country ?? 'USD',
      importance: toImportance(e.impact),
      actual:     e.actual   || null,
      forecast:   e.forecast || null,
      previous:   e.previous || null,
    }));
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Refresh cache if stale
  if (!_cache || Date.now() - _cache.at >= TTL) {
    try {
      const events = await fetchFromForexFactory();
      _cache = { events, at: Date.now() };
    } catch (err) {
      if (!_cache) {
        return NextResponse.json({ events: [], source: 'error', error: String(err) });
      }
      // Return stale cache on error
      return NextResponse.json({ events: _cache.events, source: 'stale-cache', fetchedAt: new Date(_cache.at).toISOString() });
    }
  }

  // Filter by requested date range if provided
  const fromStr = req.nextUrl.searchParams.get('from');
  const toStr   = req.nextUrl.searchParams.get('to');
  let events = _cache.events;
  if (fromStr || toStr) {
    const from = fromStr ? new Date(fromStr).getTime() : -Infinity;
    const to   = toStr   ? new Date(toStr).getTime()   : Infinity;
    events = events.filter(e => {
      const t = new Date(e.date).getTime();
      return t >= from && t <= to;
    });
  }

  return NextResponse.json({ events, source: 'forexfactory', fetchedAt: new Date(_cache.at).toISOString() });
}
