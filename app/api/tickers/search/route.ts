import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

type Symbol = { ticker: string; description: string; category: string; path: string };

let cache: Symbol[] | null = null;

function getSymbols(): Symbol[] {
  if (cache) return cache;
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'mt5-symbols.json'), 'utf-8');
    cache = JSON.parse(raw) as Symbol[];
  } catch {
    cache = [];
  }
  return cache;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim().toUpperCase() ?? '';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10), 50);
  const category = req.nextUrl.searchParams.get('category') ?? '';

  if (q.length < 1) return NextResponse.json([]);

  const symbols = getSymbols();
  const results: Symbol[] = [];

  // Exact prefix matches first
  for (const s of symbols) {
    if (results.length >= limit) break;
    if (category && s.category !== category) continue;
    if (s.ticker.startsWith(q)) results.push(s);
  }

  // Then description matches
  if (results.length < limit) {
    const descQ = q.toLowerCase();
    for (const s of symbols) {
      if (results.length >= limit) break;
      if (category && s.category !== category) continue;
      if (s.ticker.startsWith(q)) continue; // already added
      if (s.description.toLowerCase().includes(descQ)) results.push(s);
    }
  }

  return NextResponse.json(results.slice(0, limit));
}
