import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SymDef {
  sym: string;
  yf: string;
  fmt: (v: number) => string;
  bond?: boolean;
}

const SYMBOLS: SymDef[] = [
  { sym: 'SPX',  yf: '^GSPC',    fmt: v => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  { sym: 'NDX',  yf: '^NDX',     fmt: v => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  { sym: 'VIX',  yf: '^VIX',     fmt: v => v.toFixed(2) },
  { sym: 'DXY',  yf: 'DX-Y.NYB', fmt: v => v.toFixed(2) },
  { sym: '10Y',  yf: '^TNX',     fmt: v => v.toFixed(3) + '%', bond: true },
  { sym: 'WTI',  yf: 'CL=F',     fmt: v => v.toFixed(2) },
  { sym: 'NVDA', yf: 'NVDA',     fmt: v => v.toFixed(2) },
  { sym: 'MSFT', yf: 'MSFT',     fmt: v => v.toFixed(2) },
  { sym: 'TSLA', yf: 'TSLA',     fmt: v => v.toFixed(2) },
  { sym: 'META', yf: 'META',     fmt: v => v.toFixed(2) },
];

async function fetchQuote(s: SymDef): Promise<{ sym: string; val: string; chg: string; up: boolean } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s.yf)}?interval=1m&range=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price: number = meta.regularMarketPrice;
    const prev: number = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prev;
    const changePct = prev > 0 ? (change / prev) * 100 : 0;
    const up = change >= 0;
    const chg = s.bond
      ? (up ? '+' : '') + (change * 100).toFixed(1) + 'bp'
      : (up ? '+' : '') + changePct.toFixed(2) + '%';

    return { sym: s.sym, val: s.fmt(price), chg, up };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const results = await Promise.allSettled(SYMBOLS.map(fetchQuote));
    const tickers = results
      .flatMap(r => (r.status === 'fulfilled' && r.value ? [r.value] : []));

    if (tickers.length === 0) return NextResponse.json(null, { status: 503 });
    return NextResponse.json(tickers, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(null, { status: 503 });
  }
}
