import { NextResponse } from 'next/server';

const SYMBOLS = [
  { sym: 'SPX',  yf: '^GSPC',    fmt: (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), bond: false },
  { sym: 'NDX',  yf: '^NDX',     fmt: (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), bond: false },
  { sym: 'VIX',  yf: '^VIX',     fmt: (v: number) => v.toFixed(2), bond: false },
  { sym: 'DXY',  yf: 'DX-Y.NYB', fmt: (v: number) => v.toFixed(2), bond: false },
  { sym: '10Y',  yf: '^TNX',     fmt: (v: number) => v.toFixed(3) + '%', bond: true },
  { sym: 'WTI',  yf: 'CL=F',     fmt: (v: number) => v.toFixed(2), bond: false },
  { sym: 'NVDA', yf: 'NVDA',     fmt: (v: number) => v.toFixed(2), bond: false },
  { sym: 'MSFT', yf: 'MSFT',     fmt: (v: number) => v.toFixed(2), bond: false },
  { sym: 'TSLA', yf: 'TSLA',     fmt: (v: number) => v.toFixed(2), bond: false },
  { sym: 'META', yf: 'META',     fmt: (v: number) => v.toFixed(2), bond: false },
];

export async function GET() {
  try {
    const syms = SYMBOLS.map(s => s.yf).join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${syms}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error(`YF ${res.status}`);

    const json = await res.json();
    const quotes: Record<string, unknown>[] = json.quoteResponse?.result ?? [];

    const tickers = SYMBOLS.map(s => {
      const q = quotes.find(r => r.symbol === s.yf);
      if (!q) return null;
      const price = q.regularMarketPrice as number;
      const chgPct = q.regularMarketChangePercent as number;
      const chgVal = q.regularMarketChange as number;
      const up = chgPct >= 0;
      const chg = s.bond
        ? (up ? '+' : '') + (chgVal * 100).toFixed(1) + 'bp'
        : (up ? '+' : '') + chgPct.toFixed(2) + '%';
      return { sym: s.sym, val: s.fmt(price), chg, up };
    }).filter(Boolean);

    return NextResponse.json(tickers);
  } catch {
    return NextResponse.json(null, { status: 503 });
  }
}
