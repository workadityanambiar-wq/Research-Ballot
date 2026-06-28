import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-helpers';

export const dynamic = 'force-dynamic';

export interface EcoEvent {
  id: string;
  title: string;
  date: string;        // ISO UTC
  currency: string;
  importance: 1 | 2 | 3;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

// Module-level cache (per server process, survives across requests)
const _cache = new Map<string, { events: EcoEvent[]; at: number }>();
const TTL = 4 * 3600 * 1000; // 4 h

function parseHtml(html: string): EcoEvent[] {
  const events: EcoEvent[] = [];

  // Each row: data-event-datetime="2026-06-30 12:30:00" event_attr_id="00000"
  const rowRe = /data-event-datetime="([^"]+)"[^>]*event_attr_id="(\d+)"[^>]*>([\s\S]*?)(?=<tr\s|<\/tbody>|$)/g;
  let m: RegExpExecArray | null;

  while ((m = rowRe.exec(html)) !== null) {
    const [, dt, eventId, row] = m;

    // Currency: text node after the flag span
    const curr = row.match(/ceFlags[^"]*"[^/]*/)?.[0]?.match(/[A-Z]{3}\s*<\/td>/)
      ? row.match(/([A-Z]{3})\s*<\/td>/)?.[1]
      : row.match(/>\s*([A-Z]{3})\s*\n?\s*<\/td>/)?.[1] ?? 'USD';

    // Event name: inside the .event td
    const title = row
      .match(/class="[^"]*\bevent\b[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/)?.[1]
      ?.trim();
    if (!title) continue;

    // Importance: count full-bull icons (1–3)
    const bulls = (row.match(/FullBullishIcon/g) ?? []).length;
    const importance = (Math.min(3, Math.max(1, bulls || 1))) as 1 | 2 | 3;

    // Values from bold <td>s (actual, forecast, previous)
    const vals = [...row.matchAll(/<td[^>]*class="[^"]*\bbold\b[^"]*"[^>]*>([\s\S]*?)<\/td>/g)]
      .map(x => x[1].replace(/<[^>]+>/g, '').trim() || null);

    // data-event-datetime is UTC on investing.com
    let date: string;
    try {
      date = new Date(dt.replace(' ', 'T') + ':00Z').toISOString();
    } catch {
      continue;
    }

    events.push({
      id: `eco-${eventId}`,
      title,
      date,
      currency: String(curr ?? 'USD').trim(),
      importance,
      actual:   vals[0] ?? null,
      forecast: vals[1] ?? null,
      previous: vals[2] ?? null,
    });
  }

  return events;
}

async function fetchFromInvesting(dateFrom: string, dateTo: string): Promise<EcoEvent[]> {
  const body = new URLSearchParams();
  body.append('country[]', '72');     // US
  body.append('importance[]', '2');   // medium
  body.append('importance[]', '3');   // high
  body.append('dateFrom', dateFrom);
  body.append('dateTo', dateTo);
  body.append('timeFilter', 'timeRemain');
  body.append('currentTab', 'custom');
  body.append('limit_from', '0');

  const res = await fetch(
    'https://economic-calendar.investing.com/economic-calendar/Service/getCalendarFilteredData',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': 'https://www.investing.com/economic-calendar/',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(12000),
    },
  );

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json() as { data?: string };
  if (!json.data) throw new Error('Empty data field');

  return parseHtml(json.data);
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const fromStr = req.nextUrl.searchParams.get('from') ?? new Date().toISOString();
  const toStr   = req.nextUrl.searchParams.get('to')   ?? new Date(Date.now() + 30 * 86400_000).toISOString();

  const dateFrom = fromStr.slice(0, 10);
  const dateTo   = toStr.slice(0, 10);
  const key      = `${dateFrom}_${dateTo}`;

  const hit = _cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json({
      events:     hit.events,
      source:     'cache',
      fetchedAt:  new Date(hit.at).toISOString(),
    });
  }

  try {
    const events = await fetchFromInvesting(dateFrom, dateTo);
    _cache.set(key, { events, at: Date.now() });
    return NextResponse.json({ events, source: 'investing.com', fetchedAt: new Date().toISOString() });
  } catch (err) {
    // Return cached stale data if available rather than nothing
    if (hit) {
      return NextResponse.json({ events: hit.events, source: 'stale-cache', fetchedAt: new Date(hit.at).toISOString() });
    }
    return NextResponse.json({ events: [], source: 'error', error: String(err) });
  }
}
