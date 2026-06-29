import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MT5_URL = process.env.MT5_SERVICE_URL ?? 'http://localhost:8765';
const MT5_KEY = process.env.MT5_SERVICE_KEY ?? '';

const DEFAULT_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURJPY', 'GBPJPY', 'EURGBP', 'AUDJPY',
  'US30', 'US500', 'USTEC', 'GER40', 'UK100', 'JP225',
  'XAUUSD', 'XAGUSD', 'USOIL',
  'BTCUSD', 'ETHUSD',
];

const DEFAULT_TIMEFRAMES = ['H1', 'H4', 'D1'];

interface Mt5Pattern {
  symbol: string;
  asset_class: string;
  pattern: string;
  category: string;
  direction: string;
  timeframe: string;
  tf_label: string;
  description_str?: string;
  current_price: number;
  breakout_level: number;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  target3: number;
  risk: number;
  reward: number;
  rr_ratio: number;
  pattern_score: number;
  pattern_quality: number;
  trend_quality: number;
  volume_confirmation: number;
  breakout_probability: number;
  rr_score: number;
  classification: string;
  commentary?: string;
  description?: string;
  holding_period?: string;
  atr: number;
  rsi: number;
  adx: number;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    symbols?: string[];
    timeframes?: string[];
    minScore?: number;
  };

  const symbols    = body.symbols    ?? DEFAULT_SYMBOLS;
  const timeframes = body.timeframes ?? DEFAULT_TIMEFRAMES;
  const minScore   = body.minScore   ?? 70;

  try {
    const upstream = await fetch(
      `${MT5_URL}/scan?symbols=${symbols.join(',')}&timeframes=${timeframes.join(',')}&min_score=${minScore}`,
      {
        headers: { 'x-api-key': MT5_KEY },
        cache: 'no-store',
        signal: AbortSignal.timeout(120_000),
      },
    );

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({})) as Record<string, unknown>;
      return NextResponse.json(
        { error: (err.detail as string) ?? 'Scanner failed' },
        { status: upstream.status },
      );
    }

    const data = await upstream.json() as { patterns: Mt5Pattern[]; scanned_at: string };
    const patterns = data.patterns ?? [];

    // Upsert results into prisma â€” deduplicate by symbol+pattern+timeframe
    const upserted: string[] = [];
    for (const p of patterns) {
      // Check if same pattern already exists recently (within 4h)
      const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const existing = await prisma.scannerResult.findFirst({
        where: {
          symbol:    p.symbol,
          pattern:   p.pattern,
          timeframe: p.timeframe,
          detectedAt: { gte: cutoff },
        },
        orderBy: { detectedAt: 'desc' },
      });

      const payload = {
        symbol:        p.symbol,
        assetClass:    p.asset_class ?? 'Other',
        description:   p.description_str,
        pattern:       p.pattern,
        category:      p.category,
        direction:     p.direction,
        timeframe:     p.timeframe,
        tfLabel:       p.tf_label ?? p.timeframe,
        currentPrice:  p.current_price,
        breakoutLevel: p.breakout_level,
        entry:         p.entry,
        stop:          p.stop,
        target1:       p.target1,
        target2:       p.target2,
        target3:       p.target3,
        risk:          p.risk,
        reward:        p.reward,
        rrRatio:       p.rr_ratio,
        patternScore:  p.pattern_score,
        patternQuality: p.pattern_quality,
        trendQuality:  p.trend_quality,
        volumeConf:    p.volume_confirmation,
        breakoutProb:  p.breakout_probability,
        rrScore:       p.rr_score,
        classification: p.classification,
        commentary:    p.description ?? null,
        holdingPeriod: p.holding_period ?? null,
        atr:           p.atr ?? 0,
        rsi:           p.rsi ?? 0,
        adx:           p.adx ?? 0,
        status:        'WATCH',
        detectedAt:    new Date(data.scanned_at ?? Date.now()),
        expiresAt:     new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      if (existing) {
        await prisma.scannerResult.update({ where: { id: existing.id }, data: payload });
        upserted.push(existing.id);
      } else {
        const created = await prisma.scannerResult.create({ data: payload });
        // Create PATTERN_DETECTED alert
        await prisma.scannerAlert.create({
          data: {
            resultId:  created.id,
            alertType: 'PATTERN_DETECTED',
            message:   `${p.pattern} detected on ${p.symbol} (${p.tf_label}) â€” Score: ${p.pattern_score}`,
          },
        });
        upserted.push(created.id);
      }
    }

    return NextResponse.json({
      scanned:  symbols.length,
      found:    patterns.length,
      upserted: upserted.length,
      scanned_at: data.scanned_at,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Scanner unavailable';
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}

// GET: single-symbol scan
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const symbol     = req.nextUrl.searchParams.get('symbol')?.toUpperCase().trim();
  const timeframes = req.nextUrl.searchParams.get('timeframes') ?? 'H1,H4,D1';
  const minScore   = parseFloat(req.nextUrl.searchParams.get('minScore') ?? '70');

  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  try {
    const upstream = await fetch(
      `${MT5_URL}/scan/${encodeURIComponent(symbol)}?timeframes=${timeframes}&min_score=${minScore}`,
      {
        headers: { 'x-api-key': MT5_KEY },
        cache: 'no-store',
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({})) as Record<string, unknown>;
      return NextResponse.json({ error: (err.detail as string) ?? 'Scan failed' }, { status: upstream.status });
    }
    const data = await upstream.json() as { patterns: Mt5Pattern[] };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'MT5 scan service unavailable' }, { status: 503 });
  }
}
