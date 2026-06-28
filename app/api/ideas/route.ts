import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WEEK_ID, IDEA_LIMIT_PER_WEEK, getPhase } from '@/lib/data';
import { computeScores } from '@/lib/scoring';
import { getSessionUser } from '@/lib/session-helpers';

const MT5_URL = process.env.MT5_SERVICE_URL ?? 'http://localhost:8765';
const MT5_KEY = process.env.MT5_SERVICE_KEY ?? '';

interface Mt5Quote {
  symbol: string; bid: number; ask: number; mid: number; spread: number;
  server_time: string; market_status: string; market_session: string;
  exchange: string; time_zone: string; digits: number;
  trading_day: string; week_number: number; description: string;
}

interface Mt5Quant {
  symbol: string; direction: string; price: number; calculated_at: string;
  ema20: number; ema50: number; ema100: number; ema200: number;
  rsi14: number; macd_line: number; macd_signal: number; macd_hist: number;
  atr14: number; atr_pct: number; hist_vol: number;
  adx14: number; di_plus: number; di_minus: number;
  high52w: number; low52w: number;
  nearest_support: number | null; nearest_resistance: number | null;
  dist_to_support: number | null; dist_to_resistance: number | null;
  avg_volume20: number | null; rel_volume: number | null;
  current_range: number; avg_range: number;
  price_above_ema20: boolean; price_above_ema50: boolean;
  price_above_ema100: boolean; price_above_ema200: boolean;
  ema20_above_ema50: boolean; ema50_above_ema100: boolean; ema100_above_ema200: boolean;
  trend_score: number; momentum_score: number; volatility_score: number;
  trend_quality_score: number; ma_alignment_score: number;
  sr_score: number; breakout_score: number; volume_score: number;
  trend_label: string; momentum_label: string; volatility_label: string;
  trend_quality_label: string; quant_label: string;
  quant_score: number;
}

async function fetchMt5Quote(symbol: string): Promise<Mt5Quote | null> {
  try {
    const res = await fetch(`${MT5_URL}/quote/${encodeURIComponent(symbol.toUpperCase())}`, {
      headers: { 'x-api-key': MT5_KEY },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function fetchMt5Quant(symbol: string, dir: string): Promise<Mt5Quant | null> {
  try {
    const res = await fetch(
      `${MT5_URL}/quant/${encodeURIComponent(symbol.toUpperCase())}?dir=${dir}`,
      {
        headers: { 'x-api-key': MT5_KEY },
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      },
    );
    return res.ok ? res.json() : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const weekId       = req.nextUrl.searchParams.get('weekId') ?? WEEK_ID;
  const withSnapshot = req.nextUrl.searchParams.get('withSnapshot') === '1';

  const ideas = await prisma.idea.findMany({
    where: { weekId },
    orderBy: { finalScore: 'desc' },
    include: withSnapshot ? { marketSnapshot: true, quantScoreData: true } : undefined,
  });

  return NextResponse.json(ideas.map(idea => ({
    ...idea,
    dir:            idea.dir as string,
    approvalStatus: idea.approvalStatus as string,
    submittedAt:    idea.submittedAt.toISOString(),
    createdAt:      idea.createdAt.toISOString(),
    updatedAt:      idea.updatedAt.toISOString(),
    marketSnapshot: 'marketSnapshot' in idea && idea.marketSnapshot
      ? {
          ...idea.marketSnapshot,
          mt5ServerTime:  (idea.marketSnapshot as { mt5ServerTime: Date }).mt5ServerTime.toISOString(),
          submittedAtUtc: (idea.marketSnapshot as { submittedAtUtc: Date }).submittedAtUtc.toISOString(),
          lastPriceUpdate: (idea.marketSnapshot as { lastPriceUpdate: Date | null }).lastPriceUpdate?.toISOString() ?? null,
          createdAt:      (idea.marketSnapshot as { createdAt: Date }).createdAt.toISOString(),
          updatedAt:      (idea.marketSnapshot as { updatedAt: Date }).updatedAt.toISOString(),
        }
      : undefined,
    quantScoreData: 'quantScoreData' in idea && idea.quantScoreData
      ? {
          ...idea.quantScoreData,
          calculatedAt: (idea.quantScoreData as { calculatedAt: Date }).calculatedAt.toISOString(),
          createdAt:    (idea.quantScoreData as { createdAt: Date }).createdAt.toISOString(),
          updatedAt:    (idea.quantScoreData as { updatedAt: Date }).updatedAt.toISOString(),
        }
      : undefined,
  })));
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const legacyId = sessionUser.legacyId;

  const phase = getPhase();
  if (phase !== 'round1') {
    return NextResponse.json({ error: 'Idea submission is only open during Round 1' }, { status: 400 });
  }

  const count = await prisma.idea.count({ where: { authorId: legacyId, weekId: WEEK_ID } });
  if (count >= IDEA_LIMIT_PER_WEEK) {
    return NextResponse.json({ error: 'Weekly limit reached' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  const { ticker, assetClass, dir, stop, target, hold, posSize, conv, expRet, expDD, thesis, catalysts, risks, imageUrl } = body;

  if (!ticker || !stop || !target || !thesis) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // ── Fetch live MT5 quote (required — blocks submission if unavailable) ──────
  const quote = await fetchMt5Quote(String(ticker));
  if (!quote) {
    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: 'MT5_SERVICE_UNAVAILABLE',
        detail: `Submission blocked — MT5 unavailable for ${ticker}`,
        risk: 'HIGH',
      },
    });
    return NextResponse.json(
      { error: 'MT5 market data unavailable. Cannot submit idea without a live price snapshot. Ensure the MT5 service is running.' },
      { status: 503 },
    );
  }

  // CMP = MT5 mid price (immutable entry price)
  const entryNum  = quote.mid;
  const stopNum   = parseFloat(String(stop));
  const targetNum = parseFloat(String(target));
  const rrNum     = Math.max(0, (targetNum - entryNum) / Math.abs(entryNum - stopNum));

  const authorUser = await prisma.user.findUnique({
    where: { legacyId },
    select: { ideaScore: true, role: true },
  });
  const authorIdeaScore = authorUser?.ideaScore ?? 50;
  const analystRole     = authorUser?.role ?? 'ANALYST';

  // ── Fetch MT5 quant score (non-blocking — 12s timeout) ───────────────────
  const dirStr  = String(dir).toUpperCase();
  const [quant] = await Promise.allSettled([fetchMt5Quant(String(ticker), dirStr)]);
  const quantData = quant.status === 'fulfilled' ? quant.value : null;
  const quantScoreVal = quantData?.quant_score ?? 0;

  const scores = computeScores({
    conv:           Number(conv) || 7,
    expRet:         parseFloat(String(expRet)) || 0,
    rr:             rrNum,
    authorIdeaScore,
    totalCredits:   0,
    maxCreditsAnyIdea: 1,
    mt5QuantScore:  quantScoreVal,
  });

  // Request metadata for audit snapshot
  const ipAddress       = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip') ?? null;
  const userAgent       = req.headers.get('user-agent') ?? null;
  const submissionDevice  = userAgent?.match(/\(([^)]+)\)/)?.[1]?.split(';')[0]?.trim() ?? null;
  const submissionBrowser = userAgent?.match(/(Chrome|Firefox|Safari|Edge|Opera)[/\s]([\d.]+)/)?.[0] ?? null;

  const now        = new Date();
  const baseData = {
    ticker:    String(ticker).toUpperCase(),
    assetClass: String(assetClass || 'US Equities'),
    dir:       dirStr as 'LONG' | 'SHORT',
    entry:     entryNum,
    stop:      stopNum,
    target:    targetNum,
    hold:      String(hold || '1-3M'),
    posSize:   parseFloat(String(posSize)) || 1,
    conv:      Number(conv) || 7,
    expRet:    parseFloat(String(expRet)) || 0,
    expDD:     parseFloat(String(expDD)) || 0,
    rr:        rrNum,
    thesis:    String(thesis),
    catalysts: Array.isArray(catalysts) ? (catalysts as string[]) : String(catalysts || '').split('\n').filter(Boolean),
    risks:     Array.isArray(risks)     ? (risks as string[]) : String(risks || '').split('\n').filter(Boolean),
    authorId:  legacyId,
    weekId:    WEEK_ID,
    imageUrl:  imageUrl ? String(imageUrl) : null,
    // Quant score fields also stored on Idea for fast sorting/filtering
    momentumScore:   quantData ? quantData.momentum_score * 10  : 0,
    rsScore:         quantData ? quantData.trend_score    * 10  : 0,
    earningRevScore: quantData ? quantData.ma_alignment_score * 10 : 0,
    ...scores,
  };

  // Race-safe sequential ID
  let idea: Awaited<ReturnType<typeof prisma.idea.create>> | null = null;
  for (let attempt = 0; attempt < 3 && !idea; attempt++) {
    const totalCount = await prisma.idea.count();
    const nextId = `IDEA-${String(totalCount + 1).padStart(3, '0')}`;
    try {
      idea = await prisma.idea.create({ data: { id: nextId, ...baseData } });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002' && attempt < 2) continue;
      throw e;
    }
  }
  if (!idea) return NextResponse.json({ error: 'Server busy, please retry' }, { status: 503 });

  // ── Create immutable MT5 market snapshot ─────────────────────────────────
  prisma.ideaMarketSnapshot.create({
    data: {
      ideaId:            idea.id,
      analystId:         legacyId,
      analystRole:       String(analystRole),
      symbol:            quote.symbol,
      cmp:               quote.mid,
      bid:               quote.bid,
      ask:               quote.ask,
      spread:            quote.spread,
      mt5ServerTime:     new Date(quote.server_time),
      marketStatus:      quote.market_status,
      exchange:          quote.exchange,
      timeZone:          quote.time_zone,
      direction:         dirStr,
      targetPrice:       targetNum,
      stopPrice:         stopNum,
      timeHorizon:       String(hold || '1-3M'),
      weekId:            WEEK_ID,
      weekNumber:        quote.week_number,
      votingCycle:       WEEK_ID,
      submittedAtUtc:    now,
      tradingDay:        quote.trading_day,
      marketSession:     quote.market_session,
      submissionIp:      ipAddress,
      submissionDevice,
      submissionBrowser,
    },
  }).catch(() => {});

  // ── Persist full MT5 quant score breakdown ────────────────────────────────
  if (quantData) {
    prisma.ideaQuantScore.create({
      data: {
        ideaId:    idea.id,
        direction: dirStr,
        ema20:     quantData.ema20,   ema50: quantData.ema50,
        ema100:    quantData.ema100,  ema200: quantData.ema200,
        rsi14:     quantData.rsi14,
        macdLine:  quantData.macd_line, macdSignal: quantData.macd_signal,
        macdHist:  quantData.macd_hist,
        atr14:     quantData.atr14,  atrPct: quantData.atr_pct,
        histVol:   quantData.hist_vol ?? 0,
        adx14:     quantData.adx14,  diPlus: quantData.di_plus,  diMinus: quantData.di_minus,
        high52w:   quantData.high52w, low52w: quantData.low52w,
        nearestSupport:    quantData.nearest_support,
        nearestResistance: quantData.nearest_resistance,
        distToSupport:     quantData.dist_to_support,
        distToResistance:  quantData.dist_to_resistance,
        avgVolume20:  quantData.avg_volume20,
        relVolume:    quantData.rel_volume,
        currentRange: quantData.current_range,
        avgRange:     quantData.avg_range,
        priceAboveEma20:   quantData.price_above_ema20,
        priceAboveEma50:   quantData.price_above_ema50,
        priceAboveEma100:  quantData.price_above_ema100,
        priceAboveEma200:  quantData.price_above_ema200,
        ema20AboveEma50:   quantData.ema20_above_ema50,
        ema50AboveEma100:  quantData.ema50_above_ema100,
        ema100AboveEma200: quantData.ema100_above_ema200,
        trendScore:        quantData.trend_score,
        momentumScore:     quantData.momentum_score,
        volatilityScore:   quantData.volatility_score,
        trendQualityScore: quantData.trend_quality_score,
        maAlignmentScore:  quantData.ma_alignment_score,
        srScore:           quantData.sr_score,
        breakoutScore:     quantData.breakout_score,
        volumeScore:       quantData.volume_score,
        trendLabel:        quantData.trend_label,
        momentumLabel:     quantData.momentum_label,
        volatilityLabel:   quantData.volatility_label,
        trendQualityLabel: quantData.trend_quality_label,
        quantLabel:        quantData.quant_label,
        finalQuantScore:   quantData.quant_score,
        calculatedAt:      new Date(quantData.calculated_at),
      },
    }).catch(() => {});
  }

  // Auto-create research workspace
  prisma.researchDoc.create({
    data: { ideaId: idea.id, authorId: legacyId, status: 'DRAFT' },
  }).catch(() => {});

  await Promise.all([
    prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: 'IDEA_SUBMITTED',
        detail: `${idea.id} submitted (${idea.ticker} ${dirStr} / CMP:${quote.mid} / QuantScore:${quantScoreVal.toFixed(1)} / RR:${rrNum.toFixed(2)})`,
        ipAddress: ipAddress ?? undefined,
        device:    submissionDevice ?? undefined,
        risk: 'LOW',
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: 'MT5_SNAPSHOT_CREATED',
        detail: `MT5 snapshot ${idea.id}: ${quote.symbol} bid=${quote.bid} ask=${quote.ask} mid=${quote.mid} spread=${quote.spread} at ${quote.server_time} [${quote.market_status}]`,
        ipAddress: ipAddress ?? undefined,
        risk: 'LOW',
      },
    }),
  ]);

  return NextResponse.json({
    ...idea,
    dir:            idea.dir as string,
    approvalStatus: idea.approvalStatus as string,
    submittedAt:    idea.submittedAt.toISOString(),
    createdAt:      idea.createdAt.toISOString(),
    updatedAt:      idea.updatedAt.toISOString(),
    mt5Snapshot: {
      cmp:           quote.mid,
      bid:           quote.bid,
      ask:           quote.ask,
      spread:        quote.spread,
      serverTime:    quote.server_time,
      marketStatus:  quote.market_status,
      marketSession: quote.market_session,
      exchange:      quote.exchange,
    },
    quantScore: quantData ? {
      score:          quantData.quant_score,
      label:          quantData.quant_label,
      trendLabel:     quantData.trend_label,
      momentumLabel:  quantData.momentum_label,
      volatilityLabel: quantData.volatility_label,
      adx:            quantData.adx14,
      rsi:            quantData.rsi14,
    } : null,
  }, { status: 201 });
}

function getIsoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
