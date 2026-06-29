"""
APEX Market Pattern Scanner — Pattern Detection Engine
Detects 40+ technical patterns from OHLCV + indicator data.
Each detector returns a dict result or None (filtered below threshold).
"""
from __future__ import annotations
import math
from typing import Optional


# ── Result schema ─────────────────────────────────────────────────────────────

def _make_result(pattern: str, category: str, direction: str,
                 price: float, entry: float, stop: float,
                 t1: float, t2: float, t3: float, bk: float,
                 pq: float, tq: float, vc: float, bp: float,
                 atr: float, desc: str, holding: str) -> Optional[dict]:
    risk   = abs(entry - stop)
    reward = abs(t2 - entry)
    if risk <= 0:
        risk = atr
    rr     = reward / risk
    rr_s   = _rrs(rr)
    overall = _overall(pq, tq, vc, bp, rr_s)
    if overall < 70:
        return None
    digits = 5
    return {
        "pattern":             pattern,
        "category":            category,
        "direction":           direction,
        "current_price":       round(price,  digits),
        "entry":               round(entry,  digits),
        "stop":                round(stop,   digits),
        "target1":             round(t1,     digits),
        "target2":             round(t2,     digits),
        "target3":             round(t3,     digits),
        "breakout_level":      round(bk,     digits),
        "risk":                round(risk,   digits),
        "reward":              round(reward, digits),
        "rr_ratio":            round(rr, 2),
        "pattern_quality":     round(pq,  1),
        "trend_quality":       round(tq,  1),
        "volume_confirmation": round(vc,  1),
        "breakout_probability":round(bp,  1),
        "rr_score":            round(rr_s, 1),
        "pattern_score":       overall,
        "classification":      _classify(overall),
        "description":         desc,
        "holding_period":      holding,
    }


# ── Scoring helpers ───────────────────────────────────────────────────────────

def _classify(score: float) -> str:
    if score >= 95: return "Exceptional"
    if score >= 90: return "Very Strong"
    if score >= 80: return "Strong"
    if score >= 70: return "Good"
    return "Ignore"


def _overall(pq: float, tq: float, vc: float, bp: float, rr_s: float) -> float:
    raw = 0.30 * pq + 0.20 * tq + 0.20 * vc + 0.20 * bp + 0.10 * rr_s
    return round(min(100.0, max(0.0, raw)), 1)


def _rrs(rr: float) -> float:
    if rr >= 5: return 100
    if rr >= 4: return 90
    if rr >= 3: return 80
    if rr >= 2.5: return 70
    if rr >= 2: return 60
    if rr >= 1.5: return 45
    if rr >= 1: return 30
    return 10


def _tq(adx: float, price: float, ema20: float, ema50: float, ema200: float, bullish: bool) -> float:
    adx_s = (100 if adx >= 40 else 85 if adx >= 30 else 70 if adx >= 25
             else 55 if adx >= 20 else 35 if adx >= 15 else 20)
    if bullish:
        ma_s = sum([price > ema20, price > ema50, price > ema200]) / 3 * 100
    else:
        ma_s = sum([price < ema20, price < ema50, price < ema200]) / 3 * 100
    return round(adx_s * 0.5 + ma_s * 0.5, 1)


def _vs(rel_vol: Optional[float]) -> float:
    if rel_vol is None: return 50
    if rel_vol >= 3:    return 100
    if rel_vol >= 2:    return 85
    if rel_vol >= 1.5:  return 70
    if rel_vol >= 1.0:  return 55
    if rel_vol >= 0.7:  return 35
    return 20


# ── Technical helpers ─────────────────────────────────────────────────────────

def _ema_list(prices: list[float], period: int) -> list[float]:
    if not prices or len(prices) < period:
        return []
    k = 2.0 / (period + 1)
    out = [prices[0]]
    for p in prices[1:]:
        out.append(p * k + out[-1] * (1 - k))
    return out


def _ema_val(prices: list[float], period: int) -> float:
    v = _ema_list(prices, period)
    return v[-1] if v else float("nan")


def _pivot_highs(highs: list[float], n: int = 3) -> list[tuple[int, float]]:
    out = []
    for i in range(n, len(highs) - n):
        if all(highs[i] >= highs[i - j] for j in range(1, n + 1)) and \
           all(highs[i] >= highs[i + j] for j in range(1, n + 1)):
            out.append((i, highs[i]))
    return out


def _pivot_lows(lows: list[float], n: int = 3) -> list[tuple[int, float]]:
    out = []
    for i in range(n, len(lows) - n):
        if all(lows[i] <= lows[i - j] for j in range(1, n + 1)) and \
           all(lows[i] <= lows[i + j] for j in range(1, n + 1)):
            out.append((i, lows[i]))
    return out


def _bb(closes: list[float], period: int = 20, mult: float = 2.0) -> tuple[float, float, float]:
    if len(closes) < period:
        m = closes[-1]
        return m, m, m
    sub = closes[-period:]
    mid = sum(sub) / period
    std = math.sqrt(sum((x - mid) ** 2 for x in sub) / period)
    return mid - mult * std, mid, mid + mult * std


def _slope(values: list[float]) -> float:
    n = len(values)
    if n < 2: return 0.0
    xs = list(range(n))
    mx = sum(xs) / n
    my = sum(values) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, values))
    den = sum((x - mx) ** 2 for x in xs)
    return num / den if den else 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# CANDLESTICK PATTERNS
# ═══════════════════════════════════════════════════════════════════════════════

def detect_doji(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 3: return None
    o, h, l, c = O[-1], H[-1], L[-1], C[-1]
    rng = h - l
    if rng == 0: return None
    if abs(c - o) / rng > 0.1: return None
    bull = price > ema50
    pq = max(60.0, 90.0 - abs(c - o) / rng * 500)
    tq_s = _tq(adx, price, ema20, ema50, ema200, bull)
    vc = _vs(rel_vol)
    bp = 52.0
    if bull:
        entry, stop_, t1, t2, t3, bk = h, l - atr * 0.3, h + atr, h + atr * 2, h + atr * 3, h
    else:
        entry, stop_, t1, t2, t3, bk = l, h + atr * 0.3, l - atr, l - atr * 2, l - atr * 3, l
    direction = "BULLISH" if bull else "BEARISH"
    return _make_result("Doji", "CANDLESTICK", direction, price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"Doji indecision candle in {'bullish' if bull else 'bearish'} trend. Body/range = {abs(c-o)/rng:.1%}.",
                        "1-5 bars")


def detect_hammer(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                  adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 3: return None
    o, h, l, c = O[-1], H[-1], L[-1], C[-1]
    body = abs(c - o)
    lo_sh = min(o, c) - l
    hi_sh = h - max(o, c)
    rng = h - l
    if rng == 0 or body < 0.05 * rng: return None
    if lo_sh < 2.0 * body or hi_sh > 0.35 * rng: return None
    down_ctx = price < ema50 or (len(C) >= 5 and C[-1] < C[-5])
    pq = 75.0 + (15.0 if down_ctx else 0) + (5.0 if c > o else 0) + min(5.0, (lo_sh / body - 2) * 2.5)
    pq = min(95.0, pq)
    tq_s = _tq(adx, price, ema20, ema50, ema200, True)
    vc = _vs(rel_vol)
    if len(V) >= 2 and V[-2] > 0 and V[-1] > V[-2] * 1.2: vc = min(100, vc + 15)
    bp = 68.0 if down_ctx else 52.0
    entry = c; stop_ = l - atr * 0.3
    risk = entry - stop_
    t1 = entry + risk * 1.5; t2 = entry + risk * 2.5; t3 = entry + risk * 4.0
    return _make_result("Hammer", "CANDLESTICK", "BULLISH", price, entry, stop_,
                        t1, t2, t3, h, pq, tq_s, vc, bp, atr,
                        f"Hammer: lower shadow {lo_sh/body:.1f}x body. Bullish reversal in {'downtrend' if down_ctx else 'consolidation'}.",
                        "3-10 bars")


def detect_shooting_star(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                         adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 3: return None
    o, h, l, c = O[-1], H[-1], L[-1], C[-1]
    body = abs(c - o)
    hi_sh = h - max(o, c)
    lo_sh = min(o, c) - l
    rng = h - l
    if rng == 0 or body < 0.05 * rng: return None
    if hi_sh < 2.0 * body or lo_sh > 0.35 * rng: return None
    up_ctx = price > ema50 or (len(C) >= 5 and C[-1] > C[-5])
    pq = 75.0 + (15.0 if up_ctx else 0) + (5.0 if c < o else 0) + min(5.0, (hi_sh / body - 2) * 2.5)
    pq = min(95.0, pq)
    tq_s = _tq(adx, price, ema20, ema50, ema200, False)
    vc = _vs(rel_vol)
    if len(V) >= 2 and V[-2] > 0 and V[-1] > V[-2] * 1.2: vc = min(100, vc + 15)
    bp = 68.0 if up_ctx else 52.0
    entry = c; stop_ = h + atr * 0.3
    risk = stop_ - entry
    t1 = entry - risk * 1.5; t2 = entry - risk * 2.5; t3 = entry - risk * 4.0
    return _make_result("Shooting Star", "CANDLESTICK", "BEARISH", price, entry, stop_,
                        t1, t2, t3, l, pq, tq_s, vc, bp, atr,
                        f"Shooting Star: upper shadow {hi_sh/body:.1f}x body. Bearish reversal in {'uptrend' if up_ctx else 'consolidation'}.",
                        "3-10 bars")


def detect_bullish_engulfing(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                             adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 3: return None
    o1, h1, l1, c1 = O[-1], H[-1], L[-1], C[-1]
    o0, _, l0, c0 = O[-2], H[-2], L[-2], C[-2]
    if c0 >= o0 or c1 <= o1: return None  # prev not bearish, curr not bullish
    if o1 > c0 or c1 < o0: return None    # body not engulfed
    pb = abs(c0 - o0); cb = abs(c1 - o1)
    er = cb / pb if pb > 0 else 1
    down_ctx = price < ema50
    pq = min(95.0, 70.0 + min(20.0, (er - 1) * 15) + (10 if down_ctx else 0))
    tq_s = _tq(adx, price, ema20, ema50, ema200, True)
    vc = _vs(rel_vol)
    if len(V) >= 2 and V[-2] > 0 and V[-1] > V[-2]: vc = min(100, vc + 15)
    bp = 72.0
    entry = c1; stop_ = l1 - atr * 0.2
    risk = entry - stop_
    t1 = entry + risk * 1.5; t2 = entry + risk * 2.5; t3 = entry + risk * 4.0
    return _make_result("Bullish Engulfing", "CANDLESTICK", "BULLISH", price, entry, stop_,
                        t1, t2, t3, h1, pq, tq_s, vc, bp, atr,
                        f"Bullish Engulfing: {er:.1f}x engulfment. Strong reversal signal in {'downtrend' if down_ctx else 'neutral context'}.",
                        "3-10 bars")


def detect_bearish_engulfing(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                             adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 3: return None
    o1, h1, l1, c1 = O[-1], H[-1], L[-1], C[-1]
    o0, h0, _, c0 = O[-2], H[-2], L[-2], C[-2]
    if c0 <= o0 or c1 >= o1: return None
    if o1 < c0 or c1 > o0: return None
    pb = abs(c0 - o0); cb = abs(c1 - o1)
    er = cb / pb if pb > 0 else 1
    up_ctx = price > ema50
    pq = min(95.0, 70.0 + min(20.0, (er - 1) * 15) + (10 if up_ctx else 0))
    tq_s = _tq(adx, price, ema20, ema50, ema200, False)
    vc = _vs(rel_vol)
    if len(V) >= 2 and V[-2] > 0 and V[-1] > V[-2]: vc = min(100, vc + 15)
    bp = 72.0
    entry = c1; stop_ = h1 + atr * 0.2
    risk = stop_ - entry
    t1 = entry - risk * 1.5; t2 = entry - risk * 2.5; t3 = entry - risk * 4.0
    return _make_result("Bearish Engulfing", "CANDLESTICK", "BEARISH", price, entry, stop_,
                        t1, t2, t3, l1, pq, tq_s, vc, bp, atr,
                        f"Bearish Engulfing: {er:.1f}x engulfment. Strong reversal in {'uptrend' if up_ctx else 'neutral context'}.",
                        "3-10 bars")


def detect_morning_star(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                        adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 4: return None
    o0, _, l0, c0 = O[-3], H[-3], L[-3], C[-3]
    o1, h1, l1, c1 = O[-2], H[-2], L[-2], C[-2]
    o2, h2, _, c2 = O[-1], H[-1], L[-1], C[-1]
    if c0 >= o0: return None  # first: bearish
    fb = abs(c0 - o0)
    if abs(c1 - o1) >= fb * 0.5: return None  # star: small body
    if c2 <= o2: return None  # third: bullish
    if c2 < (o0 + c0) / 2: return None  # must close above midpoint of first
    pq = 92.0 if c2 > o0 else 82.0
    tq_s = _tq(adx, price, ema20, ema50, ema200, True)
    vc = _vs(rel_vol)
    bp = 74.0
    entry = c2; stop_ = l1 - atr * 0.3
    risk = entry - stop_
    t1 = entry + risk * 1.5; t2 = entry + risk * 2.5; t3 = entry + risk * 4.0
    return _make_result("Morning Star", "CANDLESTICK", "BULLISH", price, entry, stop_,
                        t1, t2, t3, h2, pq, tq_s, vc, bp, atr,
                        "Morning Star 3-candle reversal. Bearish candle → doji star → bullish confirmation.",
                        "5-15 bars")


def detect_evening_star(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                        adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 4: return None
    o0, h0, _, c0 = O[-3], H[-3], L[-3], C[-3]
    o1, h1, l1, c1 = O[-2], H[-2], L[-2], C[-2]
    o2, _, l2, c2 = O[-1], H[-1], L[-1], C[-1]
    if c0 <= o0: return None  # first: bullish
    fb = abs(c0 - o0)
    if abs(c1 - o1) >= fb * 0.5: return None  # star: small
    if c2 >= o2: return None  # third: bearish
    if c2 > (o0 + c0) / 2: return None
    pq = 92.0 if c2 < o0 else 82.0
    tq_s = _tq(adx, price, ema20, ema50, ema200, False)
    vc = _vs(rel_vol)
    bp = 74.0
    entry = c2; stop_ = h1 + atr * 0.3
    risk = stop_ - entry
    t1 = entry - risk * 1.5; t2 = entry - risk * 2.5; t3 = entry - risk * 4.0
    return _make_result("Evening Star", "CANDLESTICK", "BEARISH", price, entry, stop_,
                        t1, t2, t3, l2, pq, tq_s, vc, bp, atr,
                        "Evening Star 3-candle reversal. Bullish candle → doji star → bearish confirmation.",
                        "5-15 bars")


def detect_inside_bar(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                      adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 3: return None
    h1, l1 = H[-1], L[-1]
    h0, l0, o0, c0 = H[-2], L[-2], O[-2], C[-2]
    if h1 >= h0 or l1 <= l0: return None  # not inside
    mb = abs(c0 - o0); mr = h0 - l0
    strong_mother = mb / mr > 0.6 if mr > 0 else False
    bull = price > ema20
    pq = (82.0 if strong_mother else 68.0)
    if bull and c0 > o0: pq = min(pq + 5, 90)
    if not bull and c0 < o0: pq = min(pq + 5, 90)
    tq_s = _tq(adx, price, ema20, ema50, ema200, bull)
    vc = _vs(rel_vol)
    if len(V) >= 2 and V[-2] > 0 and V[-1] < V[-2] * 0.7: vc = min(100, vc + 15)
    bp = 65.0
    if bull:
        entry = h0 + atr * 0.1; stop_ = l1 - atr * 0.2
        risk = entry - stop_
        t1 = entry + risk; t2 = entry + risk * 2; t3 = entry + risk * 3
        direction = "BULLISH"; bk = h0
    else:
        entry = l0 - atr * 0.1; stop_ = h1 + atr * 0.2
        risk = stop_ - entry
        t1 = entry - risk; t2 = entry - risk * 2; t3 = entry - risk * 3
        direction = "BEARISH"; bk = l0
    return _make_result("Inside Bar", "CANDLESTICK", direction, price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"Inside Bar compression within {'strong' if strong_mother else 'moderate'} mother bar. Trend breakout expected {'up' if bull else 'down'}.",
                        "2-8 bars")


def detect_outside_bar(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                       adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 3: return None
    h1, l1, c1, o1 = H[-1], L[-1], C[-1], O[-1]
    h0, l0 = H[-2], L[-2]
    if h1 <= h0 or l1 >= l0: return None
    bull = c1 > o1
    pq = 72.0
    if len(V) >= 2 and V[-2] > 0 and V[-1] > V[-2] * 1.5: pq = 87.0
    tq_s = _tq(adx, price, ema20, ema50, ema200, bull)
    vc = _vs(rel_vol)
    bp = 68.0
    if bull:
        entry = c1; stop_ = l1 - atr * 0.2
        risk = entry - stop_
        t1 = entry + risk * 1.5; t2 = entry + risk * 2.5; t3 = entry + risk * 4
        direction, bk = "BULLISH", h1
    else:
        entry = c1; stop_ = h1 + atr * 0.2
        risk = stop_ - entry
        t1 = entry - risk * 1.5; t2 = entry - risk * 2.5; t3 = entry - risk * 4
        direction, bk = "BEARISH", l1
    return _make_result("Outside Bar", "CANDLESTICK", direction, price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"Outside Bar engulfs prior range with {'bullish' if bull else 'bearish'} close — strong directional conviction.",
                        "3-8 bars")


# ═══════════════════════════════════════════════════════════════════════════════
# CHART PATTERNS
# ═══════════════════════════════════════════════════════════════════════════════

def detect_double_bottom(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                         adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 30: return None
    lows = _pivot_lows(L[-80:], n=3)
    if len(lows) < 2: return None
    b1_i, b1_v = lows[-2]
    b2_i, b2_v = lows[-1]
    if b2_i <= b1_i + 5: return None  # must be separated
    if abs(b2_v - b1_v) / b1_v > 0.03: return None  # within 3% of each other
    # neckline = high between the two bottoms
    neckline = max(H[len(H) - 80 + b1_i: len(H) - 80 + b2_i + 1]) if b2_i > b1_i else max(H[-40:])
    if price < b2_v * 0.98: return None  # price must not be well below second bottom
    if price > neckline * 1.02: return None  # should not already be well above neckline
    pattern_depth = neckline - b2_v
    pq = 80.0
    if abs(b2_v - b1_v) / b1_v < 0.01: pq = 90.0  # very close bottoms
    tq_s = _tq(adx, price, ema20, ema50, ema200, True)
    vc = _vs(rel_vol)
    bp = 70.0
    entry = neckline + atr * 0.1
    stop_ = b2_v - atr * 0.5
    risk = entry - stop_
    t1 = neckline + pattern_depth * 0.618
    t2 = neckline + pattern_depth
    t3 = neckline + pattern_depth * 1.618
    return _make_result("Double Bottom", "CHART", "BULLISH", price, entry, stop_,
                        t1, t2, t3, neckline, pq, tq_s, vc, bp, atr,
                        f"Double Bottom with lows at {b1_v:.4f} and {b2_v:.4f}. Neckline breakout above {neckline:.4f} targets {t2:.4f}.",
                        "10-30 bars")


def detect_double_top(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                      adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 30: return None
    highs = _pivot_highs(H[-80:], n=3)
    if len(highs) < 2: return None
    t1_i, t1_v = highs[-2]
    t2_i, t2_v = highs[-1]
    if t2_i <= t1_i + 5: return None
    if abs(t2_v - t1_v) / t1_v > 0.03: return None
    neckline = min(L[len(L) - 80 + t1_i: len(L) - 80 + t2_i + 1]) if t2_i > t1_i else min(L[-40:])
    if price > t2_v * 1.02: return None
    if price < neckline * 0.98: return None
    pattern_depth = t2_v - neckline
    pq = 80.0
    if abs(t2_v - t1_v) / t1_v < 0.01: pq = 90.0
    tq_s = _tq(adx, price, ema20, ema50, ema200, False)
    vc = _vs(rel_vol)
    bp = 70.0
    entry = neckline - atr * 0.1
    stop_ = t2_v + atr * 0.5
    risk = stop_ - entry
    tgt1 = neckline - pattern_depth * 0.618
    tgt2 = neckline - pattern_depth
    tgt3 = neckline - pattern_depth * 1.618
    return _make_result("Double Top", "CHART", "BEARISH", price, entry, stop_,
                        tgt1, tgt2, tgt3, neckline, pq, tq_s, vc, bp, atr,
                        f"Double Top with peaks at {t1_v:.4f} and {t2_v:.4f}. Breakdown below {neckline:.4f} targets {tgt2:.4f}.",
                        "10-30 bars")


def detect_head_and_shoulders(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                              adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 40: return None
    highs = _pivot_highs(H[-100:], n=3)
    if len(highs) < 3: return None
    # Try last 3 pivot highs
    ls_i, ls_v = highs[-3]
    hd_i, hd_v = highs[-2]
    rs_i, rs_v = highs[-1]
    if not (hd_v > ls_v and hd_v > rs_v): return None  # head is highest
    if abs(rs_v - ls_v) / ls_v > 0.06: return None  # shoulders roughly equal
    if hd_v / max(ls_v, rs_v) < 1.02: return None  # head must be meaningfully higher
    # Neckline
    nl_seg = L[len(L) - 100 + ls_i: len(L) - 100 + rs_i + 1] if rs_i > ls_i else L[-50:]
    neckline = sum(nl_seg) / len(nl_seg) if nl_seg else (ls_v + rs_v) / 2
    if price > rs_v * 1.01: return None  # already past right shoulder
    pq = 82.0 if abs(rs_v - ls_v) / ls_v < 0.03 else 75.0
    tq_s = _tq(adx, price, ema20, ema50, ema200, False)
    vc = _vs(rel_vol)
    bp = 72.0
    pattern_h = hd_v - neckline
    entry = neckline - atr * 0.1
    stop_ = rs_v + atr * 0.5
    risk = stop_ - entry
    t1 = neckline - pattern_h * 0.618
    t2 = neckline - pattern_h
    t3 = neckline - pattern_h * 1.618
    return _make_result("Head & Shoulders", "CHART", "BEARISH", price, entry, stop_,
                        t1, t2, t3, neckline, pq, tq_s, vc, bp, atr,
                        f"H&S: shoulders at ~{(ls_v+rs_v)/2:.4f}, head at {hd_v:.4f}. Neckline {neckline:.4f}. Pattern height {pattern_h:.4f}.",
                        "15-40 bars")


def detect_inverse_head_and_shoulders(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                                      adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 40: return None
    lows = _pivot_lows(L[-100:], n=3)
    if len(lows) < 3: return None
    ls_i, ls_v = lows[-3]
    hd_i, hd_v = lows[-2]
    rs_i, rs_v = lows[-1]
    if not (hd_v < ls_v and hd_v < rs_v): return None
    if abs(rs_v - ls_v) / ls_v > 0.06: return None
    if min(ls_v, rs_v) / hd_v < 1.02: return None
    nl_seg = H[len(H) - 100 + ls_i: len(H) - 100 + rs_i + 1] if rs_i > ls_i else H[-50:]
    neckline = sum(nl_seg) / len(nl_seg) if nl_seg else (ls_v + rs_v) / 2
    if price < rs_v * 0.99: return None
    pq = 82.0 if abs(rs_v - ls_v) / ls_v < 0.03 else 75.0
    tq_s = _tq(adx, price, ema20, ema50, ema200, True)
    vc = _vs(rel_vol)
    bp = 72.0
    pattern_h = neckline - hd_v
    entry = neckline + atr * 0.1
    stop_ = rs_v - atr * 0.5
    risk = entry - stop_
    t1 = neckline + pattern_h * 0.618
    t2 = neckline + pattern_h
    t3 = neckline + pattern_h * 1.618
    return _make_result("Inverse H&S", "CHART", "BULLISH", price, entry, stop_,
                        t1, t2, t3, neckline, pq, tq_s, vc, bp, atr,
                        f"Inverse H&S: shoulders ~{(ls_v+rs_v)/2:.4f}, head at {hd_v:.4f}. Neckline {neckline:.4f}. Target {t2:.4f}.",
                        "15-40 bars")


def detect_ascending_triangle(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                              adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 20: return None
    subset_h = H[-40:]
    subset_l = L[-40:]
    ph = _pivot_highs(subset_h, n=2)
    pl = _pivot_lows(subset_l, n=2)
    if len(ph) < 2 or len(pl) < 2: return None
    # Flat resistance: recent highs within 1.5%
    top_vals = [v for _, v in ph[-3:]]
    if not top_vals: return None
    res_level = sum(top_vals) / len(top_vals)
    if max(top_vals) / min(top_vals) > 1.015: return None  # not flat enough
    # Rising lows
    low_vals = [v for _, v in pl[-3:]]
    if len(low_vals) < 2: return None
    if low_vals[-1] <= low_vals[-2]: return None  # lows must be rising
    low_slope = _slope(low_vals)
    if low_slope <= 0: return None
    if price > res_level * 1.01: return None  # already broken out
    pq = 78.0 + min(12.0, low_slope / atr * 200)
    tq_s = _tq(adx, price, ema20, ema50, ema200, True)
    vc = _vs(rel_vol)
    bp = 72.0
    tri_h = res_level - min(low_vals)
    entry = res_level + atr * 0.15
    stop_ = max(low_vals[-1] - atr * 0.3, min(low_vals))
    risk = entry - stop_
    t1 = res_level + tri_h * 0.618
    t2 = res_level + tri_h
    t3 = res_level + tri_h * 1.618
    return _make_result("Ascending Triangle", "CHART", "BULLISH", price, entry, stop_,
                        t1, t2, t3, res_level, pq, tq_s, vc, bp, atr,
                        f"Ascending Triangle: flat resistance at {res_level:.4f}, rising lows. Breakout targets {t2:.4f}.",
                        "10-25 bars")


def detect_descending_triangle(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                               adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 20: return None
    subset_h = H[-40:]
    subset_l = L[-40:]
    ph = _pivot_highs(subset_h, n=2)
    pl = _pivot_lows(subset_l, n=2)
    if len(ph) < 2 or len(pl) < 2: return None
    low_vals = [v for _, v in pl[-3:]]
    if not low_vals: return None
    sup_level = sum(low_vals) / len(low_vals)
    if max(low_vals) / min(low_vals) > 1.015: return None
    high_vals = [v for _, v in ph[-3:]]
    if len(high_vals) < 2: return None
    if high_vals[-1] >= high_vals[-2]: return None
    high_slope = _slope(high_vals)
    if high_slope >= 0: return None
    if price < sup_level * 0.99: return None
    pq = 78.0 + min(12.0, abs(high_slope) / atr * 200)
    tq_s = _tq(adx, price, ema20, ema50, ema200, False)
    vc = _vs(rel_vol)
    bp = 72.0
    tri_h = max(high_vals) - sup_level
    entry = sup_level - atr * 0.15
    stop_ = min(high_vals[-1] + atr * 0.3, max(high_vals))
    risk = stop_ - entry
    t1 = sup_level - tri_h * 0.618
    t2 = sup_level - tri_h
    t3 = sup_level - tri_h * 1.618
    return _make_result("Descending Triangle", "CHART", "BEARISH", price, entry, stop_,
                        t1, t2, t3, sup_level, pq, tq_s, vc, bp, atr,
                        f"Descending Triangle: flat support at {sup_level:.4f}, falling highs. Breakdown targets {t2:.4f}.",
                        "10-25 bars")


def detect_symmetrical_triangle(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                                adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 20: return None
    subset_h = H[-50:]
    subset_l = L[-50:]
    ph = _pivot_highs(subset_h, n=2)
    pl = _pivot_lows(subset_l, n=2)
    if len(ph) < 2 or len(pl) < 2: return None
    high_vals = [v for _, v in ph[-3:]]
    low_vals = [v for _, v in pl[-3:]]
    if len(high_vals) < 2 or len(low_vals) < 2: return None
    hs = _slope(high_vals)
    ls = _slope(low_vals)
    if hs >= 0 or ls <= 0: return None  # highs falling, lows rising
    if abs(hs) < atr * 0.01 or abs(ls) < atr * 0.01: return None
    bull = price > ema50
    direction = "BULLISH" if bull else "BEARISH"
    tri_h = high_vals[0] - low_vals[0]
    apex = (high_vals[-1] + low_vals[-1]) / 2
    pq = 74.0
    tq_s = _tq(adx, price, ema20, ema50, ema200, bull)
    vc = _vs(rel_vol)
    bp = 65.0
    if bull:
        bk = high_vals[-1]
        entry = bk + atr * 0.1; stop_ = low_vals[-1] - atr * 0.2
        risk = entry - stop_
        t1 = entry + tri_h * 0.618; t2 = entry + tri_h; t3 = entry + tri_h * 1.618
    else:
        bk = low_vals[-1]
        entry = bk - atr * 0.1; stop_ = high_vals[-1] + atr * 0.2
        risk = stop_ - entry
        t1 = entry - tri_h * 0.618; t2 = entry - tri_h; t3 = entry - tri_h * 1.618
    return _make_result("Symmetrical Triangle", "CHART", direction, price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"Symmetrical Triangle coiling toward apex. {'Bullish' if bull else 'Bearish'} breakout expected. Height: {tri_h:.4f}.",
                        "8-20 bars")


def detect_bull_flag(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                     adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 20: return None
    # Flagpole: strong advance in last 10-20 bars before flag
    pole_bars = min(15, len(C) // 3)
    flag_bars = min(10, len(C) // 4)
    pole_end = len(C) - flag_bars
    if pole_end < pole_bars: return None
    pole_start_close = C[pole_end - pole_bars]
    pole_end_close = C[pole_end]
    pole_gain = (pole_end_close - pole_start_close) / pole_start_close
    if pole_gain < 0.03: return None  # need at least 3% advance
    # Flag: slight downward channel in last flag_bars bars
    flag_h = H[-flag_bars:]
    flag_l = L[-flag_bars:]
    flag_c = C[-flag_bars:]
    hs_flag = _slope(flag_h); ls_flag = _slope(flag_l)
    if hs_flag >= 0 or ls_flag >= 0: return None  # both must be gently declining
    flag_hi = max(flag_h); flag_lo = min(flag_l)
    flag_height = flag_hi - flag_lo
    pole_h = pole_end_close - pole_start_close
    if flag_height > pole_h * 0.5: return None  # flag too large
    pq = 78.0 + min(15.0, pole_gain * 100)
    tq_s = _tq(adx, price, ema20, ema50, ema200, True)
    vc = _vs(rel_vol)
    if len(V) >= flag_bars:
        flag_vol = sum(V[-flag_bars:]) / flag_bars
        pre_vol = sum(V[-flag_bars * 2:-flag_bars]) / flag_bars if len(V) >= flag_bars * 2 else flag_vol
        if pre_vol > 0 and flag_vol < pre_vol * 0.8: vc = min(100, vc + 15)
    bp = 76.0
    entry = flag_hi + atr * 0.1
    stop_ = flag_lo - atr * 0.2
    risk = entry - stop_
    t1 = entry + pole_h * 0.618; t2 = entry + pole_h; t3 = entry + pole_h * 1.618
    return _make_result("Bull Flag", "CHART", "BULLISH", price, entry, stop_,
                        t1, t2, t3, flag_hi, pq, tq_s, vc, bp, atr,
                        f"Bull Flag: {pole_gain:.1%} flagpole advance, consolidating in tight channel. Breakout targets {t2:.4f}.",
                        "5-15 bars")


def detect_bear_flag(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                     adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 20: return None
    pole_bars = min(15, len(C) // 3)
    flag_bars = min(10, len(C) // 4)
    pole_end = len(C) - flag_bars
    if pole_end < pole_bars: return None
    pole_loss = (C[pole_end - pole_bars] - C[pole_end]) / C[pole_end - pole_bars]
    if pole_loss < 0.03: return None
    flag_h = H[-flag_bars:]; flag_l = L[-flag_bars:]
    hs_flag = _slope(flag_h); ls_flag = _slope(flag_l)
    if hs_flag <= 0 or ls_flag <= 0: return None  # both rising (bear flag consolidation)
    flag_hi = max(flag_h); flag_lo = min(flag_l)
    flag_height = flag_hi - flag_lo
    pole_drop = C[pole_end - pole_bars] - C[pole_end]
    if flag_height > pole_drop * 0.5: return None
    pq = 78.0 + min(15.0, pole_loss * 100)
    tq_s = _tq(adx, price, ema20, ema50, ema200, False)
    vc = _vs(rel_vol)
    if len(V) >= flag_bars:
        flag_vol = sum(V[-flag_bars:]) / flag_bars
        pre_vol = sum(V[-flag_bars * 2:-flag_bars]) / flag_bars if len(V) >= flag_bars * 2 else flag_vol
        if pre_vol > 0 and flag_vol < pre_vol * 0.8: vc = min(100, vc + 15)
    bp = 76.0
    entry = flag_lo - atr * 0.1
    stop_ = flag_hi + atr * 0.2
    risk = stop_ - entry
    t1 = entry - pole_drop * 0.618; t2 = entry - pole_drop; t3 = entry - pole_drop * 1.618
    return _make_result("Bear Flag", "CHART", "BEARISH", price, entry, stop_,
                        t1, t2, t3, flag_lo, pq, tq_s, vc, bp, atr,
                        f"Bear Flag: {pole_loss:.1%} pole decline, rising consolidation. Breakdown targets {t2:.4f}.",
                        "5-15 bars")


def detect_rising_wedge(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                        adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 20: return None
    n = min(30, len(C))
    ph = _pivot_highs(H[-n:], n=2)
    pl = _pivot_lows(L[-n:], n=2)
    if len(ph) < 2 or len(pl) < 2: return None
    hv = [v for _, v in ph[-3:]]; lv = [v for _, v in pl[-3:]]
    if len(hv) < 2 or len(lv) < 2: return None
    hs = _slope(hv); ls = _slope(lv)
    if hs <= 0 or ls <= 0: return None  # both rising
    if ls <= hs: return None  # lows rising faster than highs (converging)
    # Rising wedge: bearish
    pq = 75.0
    tq_s = _tq(adx, price, ema20, ema50, ema200, False)
    vc = _vs(rel_vol)
    bp = 68.0
    support_line = lv[-1]
    entry = support_line - atr * 0.1
    stop_ = hv[-1] + atr * 0.3
    risk = stop_ - entry
    wedge_h = hv[0] - lv[0]
    t1 = entry - wedge_h * 0.618; t2 = entry - wedge_h; t3 = entry - wedge_h * 1.618
    return _make_result("Rising Wedge", "CHART", "BEARISH", price, entry, stop_,
                        t1, t2, t3, support_line, pq, tq_s, vc, bp, atr,
                        f"Rising Wedge: both highs and lows rising but converging. Bearish breakdown expected. Target {t2:.4f}.",
                        "10-25 bars")


def detect_falling_wedge(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                         adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 20: return None
    n = min(30, len(C))
    ph = _pivot_highs(H[-n:], n=2)
    pl = _pivot_lows(L[-n:], n=2)
    if len(ph) < 2 or len(pl) < 2: return None
    hv = [v for _, v in ph[-3:]]; lv = [v for _, v in pl[-3:]]
    if len(hv) < 2 or len(lv) < 2: return None
    hs = _slope(hv); ls = _slope(lv)
    if hs >= 0 or ls >= 0: return None  # both falling
    if ls >= hs: return None  # lows falling faster (converging)
    pq = 75.0
    tq_s = _tq(adx, price, ema20, ema50, ema200, True)
    vc = _vs(rel_vol)
    bp = 68.0
    res_line = hv[-1]
    entry = res_line + atr * 0.1
    stop_ = lv[-1] - atr * 0.3
    risk = entry - stop_
    wedge_h = hv[0] - lv[0]
    t1 = entry + wedge_h * 0.618; t2 = entry + wedge_h; t3 = entry + wedge_h * 1.618
    return _make_result("Falling Wedge", "CHART", "BULLISH", price, entry, stop_,
                        t1, t2, t3, res_line, pq, tq_s, vc, bp, atr,
                        f"Falling Wedge: both highs and lows falling but converging. Bullish breakout expected. Target {t2:.4f}.",
                        "10-25 bars")


def detect_rectangle(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                     adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 15: return None
    n = min(40, len(C))
    ph = _pivot_highs(H[-n:], n=2)
    pl = _pivot_lows(L[-n:], n=2)
    if len(ph) < 2 or len(pl) < 2: return None
    hv = [v for _, v in ph[-3:]]; lv = [v for _, v in pl[-3:]]
    if not hv or not lv: return None
    res_lvl = sum(hv) / len(hv)
    sup_lvl = sum(lv) / len(lv)
    # Highs and lows should be flat (within 2%)
    if max(hv) / min(hv) > 1.02 or max(lv) / min(lv) > 1.02: return None
    rect_h = res_lvl - sup_lvl
    if rect_h / price < 0.005: return None  # too thin
    bull = price > (res_lvl + sup_lvl) / 2
    direction = "BULLISH" if bull else "BEARISH"
    pq = 72.0
    tq_s = _tq(adx, price, ema20, ema50, ema200, bull)
    vc = _vs(rel_vol)
    bp = 65.0
    if bull:
        bk = res_lvl; entry = res_lvl + atr * 0.1; stop_ = sup_lvl - atr * 0.2
        risk = entry - stop_
        t1 = res_lvl + rect_h * 0.618; t2 = res_lvl + rect_h; t3 = res_lvl + rect_h * 1.618
    else:
        bk = sup_lvl; entry = sup_lvl - atr * 0.1; stop_ = res_lvl + atr * 0.2
        risk = stop_ - entry
        t1 = sup_lvl - rect_h * 0.618; t2 = sup_lvl - rect_h; t3 = sup_lvl - rect_h * 1.618
    return _make_result("Rectangle", "CHART", direction, price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"Rectangle range {sup_lvl:.4f}–{res_lvl:.4f}. {'Breakout' if bull else 'Breakdown'} of {rect_h:.4f} range targets {t2:.4f}.",
                        "8-20 bars")


def detect_pennant(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                   adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 15: return None
    pole_bars = min(8, len(C) // 3)
    flag_bars = min(6, len(C) // 4)
    pole_end = len(C) - flag_bars
    if pole_end < pole_bars: return None
    pole_gain = (C[pole_end] - C[pole_end - pole_bars]) / C[pole_end - pole_bars]
    bull = pole_gain > 0
    if abs(pole_gain) < 0.02: return None
    flag_h = H[-flag_bars:]; flag_l = L[-flag_bars:]
    hs = _slope(flag_h); ls = _slope(flag_l)
    if bull:
        if hs >= 0 or ls <= 0: return None  # highs falling, lows rising
    else:
        if hs <= 0 or ls >= 0: return None  # highs rising, lows falling
    pole_move = abs(C[pole_end] - C[pole_end - pole_bars])
    flag_hi = max(flag_h); flag_lo = min(flag_l)
    pq = 76.0 + min(14.0, abs(pole_gain) * 100)
    tq_s = _tq(adx, price, ema20, ema50, ema200, bull)
    vc = _vs(rel_vol)
    bp = 74.0
    direction = "BULLISH" if bull else "BEARISH"
    if bull:
        entry = flag_hi + atr * 0.1; stop_ = flag_lo - atr * 0.2
        risk = entry - stop_
        t1 = entry + pole_move * 0.618; t2 = entry + pole_move; t3 = entry + pole_move * 1.618; bk = flag_hi
    else:
        entry = flag_lo - atr * 0.1; stop_ = flag_hi + atr * 0.2
        risk = stop_ - entry
        t1 = entry - pole_move * 0.618; t2 = entry - pole_move; t3 = entry - pole_move * 1.618; bk = flag_lo
    return _make_result("Pennant", "CHART", direction, price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"Pennant: {abs(pole_gain):.1%} pole move, symmetrical consolidation. {'Bullish' if bull else 'Bearish'} continuation to {t2:.4f}.",
                        "4-10 bars")


# ═══════════════════════════════════════════════════════════════════════════════
# INDICATOR PATTERNS
# ═══════════════════════════════════════════════════════════════════════════════

def detect_golden_cross(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                        adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 210: return None
    e50_now = _ema_val(C, 50)
    e200_now = _ema_val(C, 200)
    e50_prev = _ema_val(C[:-1], 50)
    e200_prev = _ema_val(C[:-1], 200)
    if not (e50_prev <= e200_prev and e50_now > e200_now): return None
    pq = 88.0 + (7.0 if adx >= 25 else 0)
    tq_s = _tq(adx, price, ema20, e50_now, e200_now, True)
    vc = _vs(rel_vol)
    bp = 80.0
    entry = price; stop_ = e200_now * 0.97
    risk = entry - stop_
    if risk <= 0: risk = atr * 2
    t1 = entry + risk * 1.5; t2 = entry + risk * 2.5; t3 = entry + risk * 4.0
    return _make_result("Golden Cross", "INDICATOR", "BULLISH", price, entry, stop_,
                        t1, t2, t3, e200_now, pq, tq_s, vc, bp, atr,
                        f"Golden Cross: EMA50 ({e50_now:.4f}) just crossed above EMA200 ({e200_now:.4f}). Classic long-term bullish signal. ADX {adx:.1f}.",
                        "20-60 bars")


def detect_death_cross(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                       adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 210: return None
    e50_now = _ema_val(C, 50)
    e200_now = _ema_val(C, 200)
    e50_prev = _ema_val(C[:-1], 50)
    e200_prev = _ema_val(C[:-1], 200)
    if not (e50_prev >= e200_prev and e50_now < e200_now): return None
    pq = 88.0 + (7.0 if adx >= 25 else 0)
    tq_s = _tq(adx, price, ema20, e50_now, e200_now, False)
    vc = _vs(rel_vol)
    bp = 80.0
    entry = price; stop_ = e200_now * 1.03
    risk = stop_ - entry
    if risk <= 0: risk = atr * 2
    t1 = entry - risk * 1.5; t2 = entry - risk * 2.5; t3 = entry - risk * 4.0
    return _make_result("Death Cross", "INDICATOR", "BEARISH", price, entry, stop_,
                        t1, t2, t3, e200_now, pq, tq_s, vc, bp, atr,
                        f"Death Cross: EMA50 ({e50_now:.4f}) just crossed below EMA200 ({e200_now:.4f}). Classic long-term bearish signal. ADX {adx:.1f}.",
                        "20-60 bars")


def detect_ema_crossover(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                         adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 55: return None
    e20_now = _ema_val(C, 20)
    e50_now = _ema_val(C, 50)
    e20_prev = _ema_val(C[:-1], 20)
    e50_prev = _ema_val(C[:-1], 50)
    bull = e20_prev <= e50_prev and e20_now > e50_now
    bear = e20_prev >= e50_prev and e20_now < e50_now
    if not (bull or bear): return None
    pq = 78.0 + (10.0 if adx >= 25 else 0)
    tq_s = _tq(adx, price, ema20, e50_now, ema200, bull)
    vc = _vs(rel_vol)
    bp = 72.0
    direction = "BULLISH" if bull else "BEARISH"
    if bull:
        entry = price; stop_ = e50_now * 0.98
        risk = entry - stop_
        t1 = entry + risk * 1.5; t2 = entry + risk * 2.5; t3 = entry + risk * 4; bk = e50_now
    else:
        entry = price; stop_ = e50_now * 1.02
        risk = stop_ - entry
        t1 = entry - risk * 1.5; t2 = entry - risk * 2.5; t3 = entry - risk * 4; bk = e50_now
    return _make_result("EMA Crossover", "INDICATOR", direction, price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"EMA20/50 {'Bullish' if bull else 'Bearish'} Crossover. EMA20={e20_now:.4f}, EMA50={e50_now:.4f}. ADX {adx:.1f}.",
                        "10-30 bars")


def detect_macd_crossover(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                          adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 35: return None
    # We only have current values, compute previous manually
    if len(C) < 36: return None
    ef_now = _ema_list(C, 12); es_now = _ema_list(C, 26)
    if len(ef_now) < 26 or len(es_now) < 26: return None
    ml_now = ef_now[-1] - es_now[-1]
    ef_prev = _ema_list(C[:-1], 12); es_prev = _ema_list(C[:-1], 26)
    ml_prev = ef_prev[-1] - es_prev[-1] if ef_prev and es_prev else ml_now
    sg_now = _ema_list([ef_now[i] - es_now[i] for i in range(len(es_now))], 9)
    sg_prev = _ema_list([ef_prev[i] - es_prev[i] for i in range(len(es_prev))], 9) if ef_prev and es_prev else sg_now
    if not sg_now or not sg_prev: return None
    bull = ml_prev <= sg_prev[-1] and ml_now > sg_now[-1]
    bear = ml_prev >= sg_prev[-1] and ml_now < sg_now[-1]
    if not (bull or bear): return None
    pq = 74.0 + (10.0 if adx >= 25 else 0) + (6.0 if price > ema50 and bull else 0) + (6.0 if price < ema50 and bear else 0)
    tq_s = _tq(adx, price, ema20, ema50, ema200, bull)
    vc = _vs(rel_vol)
    bp = 70.0
    direction = "BULLISH" if bull else "BEARISH"
    if bull:
        entry = price; stop_ = min(L[-3:]) - atr * 0.2
        risk = entry - stop_
        t1 = entry + risk * 1.5; t2 = entry + risk * 2.5; t3 = entry + risk * 4; bk = price
    else:
        entry = price; stop_ = max(H[-3:]) + atr * 0.2
        risk = stop_ - entry
        t1 = entry - risk * 1.5; t2 = entry - risk * 2.5; t3 = entry - risk * 4; bk = price
    return _make_result("MACD Crossover", "INDICATOR", direction, price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"MACD {'Bullish' if bull else 'Bearish'} crossover. MACD {ml_now:.5f} vs signal {sg_now[-1]:.5f}. RSI {rsi:.1f}.",
                        "8-20 bars")


def detect_bb_squeeze(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                      adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 40: return None
    # Current BB width
    lb, mb, ub = _bb(C, 20, 2.0)
    bw_now = (ub - lb) / mb if mb > 0 else 0
    # Historical BB width (past 20 bars)
    bw_hist = []
    for i in range(20, min(40, len(C))):
        slc = C[-i - 20:-i] if i > 0 else C[-20:]
        if len(slc) >= 20:
            lbt, mbt, ubt = _bb(slc, 20, 2.0)
            if mbt > 0: bw_hist.append((ubt - lbt) / mbt)
    if not bw_hist: return None
    avg_bw = sum(bw_hist) / len(bw_hist)
    if bw_now >= avg_bw * 0.75: return None  # not squeezed enough
    bull = price > ema50
    direction = "BULLISH" if bull else "BEARISH"
    squeeze_ratio = (avg_bw - bw_now) / avg_bw
    pq = min(92.0, 68.0 + squeeze_ratio * 100)
    tq_s = _tq(adx, price, ema20, ema50, ema200, bull)
    vc = _vs(rel_vol)
    bp = 70.0
    kc_mult = atr * 1.5 / price
    if bw_now < kc_mult: bp = 82.0  # Bollinger inside Keltner = strong squeeze
    if bull:
        entry = ub + atr * 0.1; stop_ = lb - atr * 0.2
        risk = entry - stop_
        t1 = entry + risk; t2 = entry + risk * 2; t3 = entry + risk * 3; bk = ub
    else:
        entry = lb - atr * 0.1; stop_ = ub + atr * 0.2
        risk = stop_ - entry
        t1 = entry - risk; t2 = entry - risk * 2; t3 = entry - risk * 3; bk = lb
    return _make_result("Bollinger Squeeze", "INDICATOR", direction, price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"Bollinger Band Squeeze: width {bw_now:.3f} vs avg {avg_bw:.3f} ({squeeze_ratio:.0%} compression). Explosive move imminent.",
                        "5-15 bars")


def detect_volume_breakout(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                           adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if rel_vol is None or rel_vol < 2.0: return None
    if len(C) < 5: return None
    # Price must be moving with volume
    price_move = abs(C[-1] - C[-2]) / C[-2] if C[-2] > 0 else 0
    if price_move < 0.005: return None  # at least 0.5% move
    bull = C[-1] > C[-2]
    direction = "BULLISH" if bull else "BEARISH"
    pq = min(92.0, 68.0 + (rel_vol - 2) * 8)
    tq_s = _tq(adx, price, ema20, ema50, ema200, bull)
    vc = min(100.0, 60.0 + (rel_vol - 2) * 20)
    bp = 76.0
    if bull:
        entry = price; stop_ = L[-1] - atr * 0.3
        risk = entry - stop_
        t1 = entry + risk * 1.5; t2 = entry + risk * 2.5; t3 = entry + risk * 4; bk = H[-1]
    else:
        entry = price; stop_ = H[-1] + atr * 0.3
        risk = stop_ - entry
        t1 = entry - risk * 1.5; t2 = entry - risk * 2.5; t3 = entry - risk * 4; bk = L[-1]
    return _make_result("Volume Breakout", "INDICATOR", direction, price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"Volume Breakout: {rel_vol:.1f}x average volume with {price_move:.1%} price move {'up' if bull else 'down'}.",
                        "3-8 bars")


def detect_rsi_oversold(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                        adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if rsi > 32: return None
    if len(C) < 5: return None
    recovering = C[-1] > C[-3]  # price recovering from lows
    pq = min(90.0, 70.0 + (32 - rsi) * 2 + (10 if recovering else 0))
    tq_s = _tq(adx, price, ema20, ema50, ema200, True)
    vc = _vs(rel_vol)
    bp = 70.0 if recovering else 58.0
    entry = price; stop_ = min(L[-5:]) - atr * 0.3
    risk = entry - stop_
    t1 = entry + risk * 1.5; t2 = entry + risk * 2.5; t3 = entry + risk * 4; bk = price
    return _make_result("RSI Oversold Bounce", "INDICATOR", "BULLISH", price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"RSI Oversold at {rsi:.1f} — extreme reading with {'recovery' if recovering else 'continuation'} signal. Mean reversion setup.",
                        "5-15 bars")


def detect_rsi_overbought(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                          adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if rsi < 68: return None
    if len(C) < 5: return None
    rolling = C[-1] < C[-3]
    pq = min(90.0, 70.0 + (rsi - 68) * 2 + (10 if rolling else 0))
    tq_s = _tq(adx, price, ema20, ema50, ema200, False)
    vc = _vs(rel_vol)
    bp = 70.0 if rolling else 58.0
    entry = price; stop_ = max(H[-5:]) + atr * 0.3
    risk = stop_ - entry
    t1 = entry - risk * 1.5; t2 = entry - risk * 2.5; t3 = entry - risk * 4; bk = price
    return _make_result("RSI Overbought Reject", "INDICATOR", "BEARISH", price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"RSI Overbought at {rsi:.1f} — extreme reading with {'reversal' if rolling else 'stall'} signal.",
                        "5-15 bars")


def detect_volatility_squeeze(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                              adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 30: return None
    # ADX declining + narrow range
    recent_ranges = [H[i] - L[i] for i in range(-10, 0)]
    avg_range = sum(recent_ranges) / len(recent_ranges) if recent_ranges else atr
    prior_ranges = [H[i] - L[i] for i in range(-25, -10)]
    prior_avg = sum(prior_ranges) / len(prior_ranges) if prior_ranges else avg_range
    if avg_range >= prior_avg * 0.75: return None  # not compressed enough
    compression = (prior_avg - avg_range) / prior_avg
    bull = price > ema50
    direction = "BULLISH" if bull else "BEARISH"
    pq = min(88.0, 65.0 + compression * 80)
    tq_s = _tq(adx, price, ema20, ema50, ema200, bull)
    vc = _vs(rel_vol)
    bp = 68.0
    if bull:
        entry = max(H[-10:]) + atr * 0.1; stop_ = min(L[-10:]) - atr * 0.2
        risk = entry - stop_
        t1 = entry + risk; t2 = entry + risk * 2; t3 = entry + risk * 3; bk = max(H[-10:])
    else:
        entry = min(L[-10:]) - atr * 0.1; stop_ = max(H[-10:]) + atr * 0.2
        risk = stop_ - entry
        t1 = entry - risk; t2 = entry - risk * 2; t3 = entry - risk * 3; bk = min(L[-10:])
    return _make_result("Volatility Squeeze", "INDICATOR", direction, price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"Volatility Squeeze: range contracted {compression:.0%} vs prior 15 bars. Explosive breakout pending.",
                        "3-10 bars")


# ═══════════════════════════════════════════════════════════════════════════════
# BREAKOUT / LEVEL PATTERNS
# ═══════════════════════════════════════════════════════════════════════════════

def detect_52w_high_breakout(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                             adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if hi52 <= 0: return None
    dist_pct = (hi52 - price) / hi52 * 100
    if dist_pct > 2.0 or price < hi52 * 0.98: return None  # within 2% of 52W high
    pq = max(70.0, 100.0 - dist_pct * 15)
    tq_s = _tq(adx, price, ema20, ema50, ema200, True)
    vc = _vs(rel_vol)
    bp = 80.0 if rel_vol and rel_vol > 1.2 else 68.0
    entry = hi52 + atr * 0.15
    stop_ = price - atr * 1.5
    risk = entry - stop_
    range52 = hi52 - lo52
    t1 = entry + range52 * 0.1; t2 = entry + range52 * 0.2; t3 = entry + range52 * 0.35
    return _make_result("52W High Breakout", "BREAKOUT", "BULLISH", price, entry, stop_,
                        t1, t2, t3, hi52, pq, tq_s, vc, bp, atr,
                        f"Price {dist_pct:.1f}% below 52-week high of {hi52:.4f}. Breakout into new highs signals strong momentum.",
                        "10-30 bars")


def detect_52w_low_breakdown(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                             adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if lo52 <= 0: return None
    dist_pct = (price - lo52) / lo52 * 100
    if dist_pct > 2.0: return None
    pq = max(70.0, 100.0 - dist_pct * 15)
    tq_s = _tq(adx, price, ema20, ema50, ema200, False)
    vc = _vs(rel_vol)
    bp = 80.0 if rel_vol and rel_vol > 1.2 else 68.0
    entry = lo52 - atr * 0.15
    stop_ = price + atr * 1.5
    risk = stop_ - entry
    range52 = hi52 - lo52
    t1 = entry - range52 * 0.1; t2 = entry - range52 * 0.2; t3 = entry - range52 * 0.35
    return _make_result("52W Low Breakdown", "BREAKOUT", "BEARISH", price, entry, stop_,
                        t1, t2, t3, lo52, pq, tq_s, vc, bp, atr,
                        f"Price {dist_pct:.1f}% above 52-week low of {lo52:.4f}. Breakdown signals accelerating weakness.",
                        "10-30 bars")


def detect_support_bounce(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                          adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if sup is None: return None
    dist = (price - sup) / price * 100
    if dist > 1.5 or dist < -0.5: return None  # within 1.5% above support
    bounce = len(C) >= 3 and C[-1] > C[-2]
    pq = (82.0 if bounce else 68.0)
    tq_s = _tq(adx, price, ema20, ema50, ema200, True)
    vc = _vs(rel_vol)
    if len(V) >= 2 and V[-2] > 0 and V[-1] > V[-2] * 1.2: vc = min(100, vc + 15)
    bp = 74.0 if bounce else 60.0
    entry = price + atr * 0.1
    stop_ = sup - atr * 0.5
    risk = entry - stop_
    if res:
        t2 = res; t1 = entry + (res - entry) * 0.5; t3 = res + (res - entry) * 0.5
    else:
        t1 = entry + risk * 1.5; t2 = entry + risk * 2.5; t3 = entry + risk * 4
    return _make_result("Support Bounce", "BREAKOUT", "BULLISH", price, entry, stop_,
                        t1, t2, t3, sup, pq, tq_s, vc, bp, atr,
                        f"Price {'bouncing from' if bounce else 'testing'} support at {sup:.4f} ({dist:.1f}% above). Reversal entry setup.",
                        "5-20 bars")


def detect_resistance_rejection(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                                adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if res is None: return None
    dist = (res - price) / price * 100
    if dist > 1.5 or dist < -0.5: return None
    rejected = len(C) >= 3 and C[-1] < C[-2]
    pq = (82.0 if rejected else 68.0)
    tq_s = _tq(adx, price, ema20, ema50, ema200, False)
    vc = _vs(rel_vol)
    if len(V) >= 2 and V[-2] > 0 and V[-1] > V[-2] * 1.2: vc = min(100, vc + 15)
    bp = 74.0 if rejected else 60.0
    entry = price - atr * 0.1
    stop_ = res + atr * 0.5
    risk = stop_ - entry
    if sup:
        t2 = sup; t1 = entry - (entry - sup) * 0.5; t3 = sup - (entry - sup) * 0.5
    else:
        t1 = entry - risk * 1.5; t2 = entry - risk * 2.5; t3 = entry - risk * 4
    return _make_result("Resistance Rejection", "BREAKOUT", "BEARISH", price, entry, stop_,
                        t1, t2, t3, res, pq, tq_s, vc, bp, atr,
                        f"Price {'rejected from' if rejected else 'approaching'} resistance at {res:.4f} ({dist:.1f}% below). Short-side entry.",
                        "5-20 bars")


def detect_gap_breakout(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                        adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(O) < 3 or len(C) < 3: return None
    gap_up = O[-1] > H[-2] * 1.001
    gap_dn = O[-1] < L[-2] * 0.999
    if not (gap_up or gap_dn): return None
    gap_size = abs(O[-1] - C[-2]) / C[-2] * 100
    if gap_size < 0.3: return None
    bull = gap_up
    direction = "BULLISH" if bull else "BEARISH"
    pq = min(90.0, 70.0 + gap_size * 5)
    tq_s = _tq(adx, price, ema20, ema50, ema200, bull)
    vc = _vs(rel_vol)
    if rel_vol and rel_vol > 1.5: vc = min(100, vc + 10)
    bp = 74.0
    if bull:
        entry = price; stop_ = H[-2] - atr * 0.2
        risk = entry - stop_
        t1 = entry + risk * 1.5; t2 = entry + risk * 2.5; t3 = entry + risk * 4; bk = O[-1]
    else:
        entry = price; stop_ = L[-2] + atr * 0.2
        risk = stop_ - entry
        t1 = entry - risk * 1.5; t2 = entry - risk * 2.5; t3 = entry - risk * 4; bk = O[-1]
    return _make_result("Gap Breakout", "BREAKOUT", direction, price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"{'Gap Up' if bull else 'Gap Down'} of {gap_size:.1f}%. Price opened {'above' if bull else 'below'} prior {'high' if bull else 'low'}.",
                        "3-10 bars")


def detect_ma_breakout(O, H, L, C, V, price, atr, rsi, macd_l, macd_s, macd_h,
                       adx, dip, dim, ema20, ema50, ema100, ema200, rel_vol, hi52, lo52, sup, res):
    if len(C) < 55: return None
    # EMA200 breakout
    e200_list = _ema_list(C, 200)
    if len(e200_list) < 2: return None
    e200_now = e200_list[-1]; e200_prev = e200_list[-2]
    cross_up = C[-2] <= e200_prev and C[-1] > e200_now
    cross_dn = C[-2] >= e200_prev and C[-1] < e200_now
    if not (cross_up or cross_dn): return None
    bull = cross_up
    direction = "BULLISH" if bull else "BEARISH"
    pq = 80.0 + (8.0 if adx >= 25 else 0)
    tq_s = _tq(adx, price, ema20, ema50, e200_now, bull)
    vc = _vs(rel_vol)
    bp = 74.0
    if bull:
        entry = price; stop_ = e200_now * 0.98
        risk = entry - stop_
        t1 = entry + risk * 1.5; t2 = entry + risk * 2.5; t3 = entry + risk * 4; bk = e200_now
    else:
        entry = price; stop_ = e200_now * 1.02
        risk = stop_ - entry
        t1 = entry - risk * 1.5; t2 = entry - risk * 2.5; t3 = entry - risk * 4; bk = e200_now
    return _make_result("MA200 Breakout", "BREAKOUT", direction, price, entry, stop_,
                        t1, t2, t3, bk, pq, tq_s, vc, bp, atr,
                        f"Price {'crossed above' if bull else 'crossed below'} EMA200 ({e200_now:.4f}). Key trend direction change.",
                        "10-30 bars")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN SCAN FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

ALL_DETECTORS = [
    # Candlestick
    detect_doji, detect_hammer, detect_shooting_star,
    detect_bullish_engulfing, detect_bearish_engulfing,
    detect_morning_star, detect_evening_star,
    detect_inside_bar, detect_outside_bar,
    # Chart
    detect_double_bottom, detect_double_top,
    detect_head_and_shoulders, detect_inverse_head_and_shoulders,
    detect_ascending_triangle, detect_descending_triangle,
    detect_symmetrical_triangle,
    detect_bull_flag, detect_bear_flag,
    detect_rising_wedge, detect_falling_wedge,
    detect_rectangle, detect_pennant,
    # Indicator
    detect_golden_cross, detect_death_cross,
    detect_ema_crossover, detect_macd_crossover,
    detect_bb_squeeze, detect_volume_breakout,
    detect_rsi_oversold, detect_rsi_overbought,
    detect_volatility_squeeze,
    # Breakout
    detect_52w_high_breakout, detect_52w_low_breakdown,
    detect_support_bounce, detect_resistance_rejection,
    detect_gap_breakout, detect_ma_breakout,
]


def scan_bars(opens: list, highs: list, lows: list, closes: list, volumes: list,
              price: float, atr: float, rsi: float,
              macd_line: float, macd_signal: float, macd_hist: float,
              adx: float, di_plus: float, di_minus: float,
              ema20: float, ema50: float, ema100: float, ema200: float,
              rel_vol: Optional[float], high52: float, low52: float,
              support: Optional[float], resistance: Optional[float]) -> list[dict]:
    """Run all detectors on bar data. Returns list of pattern result dicts."""
    args = (opens, highs, lows, closes, volumes, price, atr, rsi,
            macd_line, macd_signal, macd_hist, adx, di_plus, di_minus,
            ema20, ema50, ema100, ema200, rel_vol, high52, low52, support, resistance)
    results = []
    for detector in ALL_DETECTORS:
        try:
            result = detector(*args)
            if result is not None:
                results.append(result)
        except Exception:
            pass
    # Sort by pattern score descending
    results.sort(key=lambda x: x["pattern_score"], reverse=True)
    return results
