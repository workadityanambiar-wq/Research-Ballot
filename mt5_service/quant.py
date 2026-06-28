"""
Quantitative indicator calculations for MT5 market data.
Pure Python — no pandas required. All functions take plain lists of floats.
Direction-aware scoring: a LONG idea and a SHORT idea on the same ticker
will receive different scores based on whether signals favour that direction.
"""
from __future__ import annotations
from typing import Optional


# ── Core indicators ───────────────────────────────────────────────────────────

def _ema(prices: list[float], period: int) -> list[float]:
    if not prices:
        return []
    k = 2.0 / (period + 1)
    out = [prices[0]]
    for p in prices[1:]:
        out.append(p * k + out[-1] * (1.0 - k))
    return out


def ema_last(prices: list[float], period: int) -> float:
    vals = _ema(prices, period)
    return vals[-1] if vals else float("nan")


def calc_rsi(closes: list[float], period: int = 14) -> float:
    if len(closes) < period + 2:
        return 50.0
    gains, losses = [], []
    for i in range(1, len(closes)):
        d = closes[i] - closes[i - 1]
        gains.append(max(d, 0.0))
        losses.append(max(-d, 0.0))
    avg_g = sum(gains[:period]) / period
    avg_l = sum(losses[:period]) / period
    for i in range(period, len(gains)):
        avg_g = (avg_g * (period - 1) + gains[i]) / period
        avg_l = (avg_l * (period - 1) + losses[i]) / period
    if avg_l == 0:
        return 100.0
    return 100.0 - 100.0 / (1.0 + avg_g / avg_l)


def calc_macd(closes: list[float], fast: int = 12, slow: int = 26, signal: int = 9) -> tuple[float, float, float]:
    ef = _ema(closes, fast)
    es = _ema(closes, slow)
    ml = [f - s for f, s in zip(ef, es)]
    sg = _ema(ml, signal)
    if not sg:
        return 0.0, 0.0, 0.0
    return ml[-1], sg[-1], ml[-1] - sg[-1]


def calc_atr(highs: list[float], lows: list[float], closes: list[float], period: int = 14) -> float:
    if len(closes) < period + 1:
        return 0.0
    tr_list = []
    for i in range(1, len(closes)):
        tr = max(highs[i] - lows[i],
                 abs(highs[i] - closes[i - 1]),
                 abs(lows[i] - closes[i - 1]))
        tr_list.append(tr)
    atr_val = sum(tr_list[:period]) / period
    for tr in tr_list[period:]:
        atr_val = (atr_val * (period - 1) + tr) / period
    return atr_val


def calc_adx(highs: list[float], lows: list[float], closes: list[float],
             period: int = 14) -> tuple[float, float, float]:
    """Returns (adx, di_plus, di_minus)."""
    if len(closes) < period * 2 + 2:
        return 20.0, 25.0, 25.0
    tr_list, pdm_list, mdm_list = [], [], []
    for i in range(1, len(closes)):
        hd = highs[i] - highs[i - 1]
        ld = lows[i - 1] - lows[i]
        tr = max(highs[i] - lows[i],
                 abs(highs[i] - closes[i - 1]),
                 abs(lows[i] - closes[i - 1]))
        tr_list.append(tr)
        pdm_list.append(hd if hd > ld and hd > 0 else 0.0)
        mdm_list.append(ld if ld > hd and ld > 0 else 0.0)

    smt = sum(tr_list[:period])
    smp = sum(pdm_list[:period])
    smm = sum(mdm_list[:period])

    dx_vals: list[float] = []
    pdi_last = mdi_last = 0.0
    for i in range(period, len(tr_list)):
        smt = smt - smt / period + tr_list[i]
        smp = smp - smp / period + pdm_list[i]
        smm = smm - smm / period + mdm_list[i]
        pdi = 100.0 * smp / smt if smt else 0.0
        mdi = 100.0 * smm / smt if smt else 0.0
        pdi_last, mdi_last = pdi, mdi
        denom = pdi + mdi
        dx_vals.append(100.0 * abs(pdi - mdi) / denom if denom else 0.0)

    if not dx_vals:
        return 20.0, pdi_last, mdi_last
    adx_val = sum(dx_vals[:period]) / period
    for dx in dx_vals[period:]:
        adx_val = (adx_val * (period - 1) + dx) / period
    return adx_val, pdi_last, mdi_last


def find_sr_levels(closes: list[float], highs: list[float], lows: list[float],
                   price: float, n: int = 3) -> tuple[Optional[float], Optional[float]]:
    """Pivot-based support / resistance nearest to current price."""
    pivot_highs: list[float] = []
    pivot_lows:  list[float] = []
    for i in range(n, len(closes) - n):
        if all(highs[i] >= highs[i - j] for j in range(1, n + 1)) and \
           all(highs[i] >= highs[i + j] for j in range(1, n + 1)):
            pivot_highs.append(highs[i])
        if all(lows[i] <= lows[i - j] for j in range(1, n + 1)) and \
           all(lows[i] <= lows[i + j] for j in range(1, n + 1)):
            pivot_lows.append(lows[i])
    support    = max((l for l in pivot_lows  if l < price), default=None)
    resistance = min((h for h in pivot_highs if h > price), default=None)
    return support, resistance


def hist_volatility(closes: list[float], period: int = 20) -> float:
    """Annualised historical volatility from log returns."""
    import math
    if len(closes) < period + 1:
        return 0.0
    rets = [math.log(closes[i] / closes[i - 1]) for i in range(len(closes) - period, len(closes))]
    if not rets:
        return 0.0
    mean = sum(rets) / len(rets)
    variance = sum((r - mean) ** 2 for r in rets) / len(rets)
    return math.sqrt(variance * 252) * 100  # annualised %


# ── Component scorers ─────────────────────────────────────────────────────────

def score_trend(price: float, ema20: float, ema50: float, ema100: float,
                ema200: float, is_long: bool) -> tuple[float, str]:
    if is_long:
        count = sum([price > ema20, price > ema50, price > ema100, price > ema200])
        aligned = ema20 > ema50 > ema100 > ema200
        base = count * 2.0
        if aligned:              base = min(10.0, base + 1.5)
        if price > ema20 and ema20 > ema50: base = min(10.0, base + 0.5)
    else:
        count = sum([price < ema20, price < ema50, price < ema100, price < ema200])
        aligned = ema20 < ema50 < ema100 < ema200
        base = count * 2.0
        if aligned:                base = min(10.0, base + 1.5)
        if price < ema20 and ema20 < ema50: base = min(10.0, base + 0.5)

    score = min(10.0, max(0.0, base))
    if score >= 9:   label = "Strong Bullish" if is_long else "Strong Bearish"
    elif score >= 7: label = "Bullish"         if is_long else "Bearish"
    elif score >= 5: label = "Neutral"
    elif score >= 3: label = "Bearish"         if is_long else "Bullish"
    else:            label = "Strong Bearish"  if is_long else "Strong Bullish"
    return score, label


def score_momentum(rsi_val: float, macd_line: float, macd_sig: float,
                   macd_hist: float, is_long: bool) -> tuple[float, str]:
    if is_long:
        if   50 <= rsi_val < 65: rsi_s = 6.0
        elif 65 <= rsi_val < 70: rsi_s = 5.0
        elif 45 <= rsi_val < 50: rsi_s = 4.5
        elif 70 <= rsi_val < 80: rsi_s = 3.5
        elif 40 <= rsi_val < 45: rsi_s = 3.0
        elif 30 <= rsi_val < 40: rsi_s = 1.5
        elif rsi_val >= 80:      rsi_s = 1.5
        else:                    rsi_s = 0.5
        macd_s = (2.0 if macd_line > macd_sig else 0.0) + (2.0 if macd_hist > 0 else 0.0)
    else:
        if   35 < rsi_val <= 50: rsi_s = 6.0
        elif 30 < rsi_val <= 35: rsi_s = 5.0
        elif 50 < rsi_val <= 55: rsi_s = 4.5
        elif 20 < rsi_val <= 30: rsi_s = 3.5
        elif 55 < rsi_val <= 60: rsi_s = 3.0
        elif 60 < rsi_val <= 70: rsi_s = 1.5
        elif rsi_val <= 20:      rsi_s = 1.5
        else:                    rsi_s = 0.5
        macd_s = (2.0 if macd_line < macd_sig else 0.0) + (2.0 if macd_hist < 0 else 0.0)

    score = min(10.0, rsi_s + macd_s)
    if score >= 8.5:   label = "Very Strong"
    elif score >= 7.0: label = "Strong"
    elif score >= 4.5: label = "Neutral"
    elif score >= 2.5: label = "Weak"
    else:              label = "Very Weak"
    return score, label


def score_volatility(atr_val: float, price: float) -> tuple[float, str, float]:
    """Returns (score, label, atr_pct)."""
    atr_pct = (atr_val / price * 100) if price else 0.0
    if   atr_pct < 0.3:  sc, lbl = 4.0, "Low"
    elif atr_pct < 0.7:  sc, lbl = 7.0, "Low"
    elif atr_pct < 1.5:  sc, lbl = 10.0, "Normal"
    elif atr_pct < 2.5:  sc, lbl = 8.0, "Normal"
    elif atr_pct < 4.0:  sc, lbl = 5.0, "High"
    elif atr_pct < 6.0:  sc, lbl = 3.0, "High"
    else:                sc, lbl = 1.0, "Extreme"
    return sc, lbl, round(atr_pct, 3)


def score_trend_quality(adx_val: float, di_plus: float,
                        di_minus: float, is_long: bool) -> tuple[float, str]:
    if   adx_val >= 40: base, lbl = 10.0, "Trending"
    elif adx_val >= 30: base, lbl = 8.5,  "Trending"
    elif adx_val >= 25: base, lbl = 7.0,  "Trending"
    elif adx_val >= 20: base, lbl = 5.0,  "Weak Trend"
    elif adx_val >= 15: base, lbl = 3.0,  "Weak Trend"
    else:               base, lbl = 1.5,  "Sideways"
    if (is_long and di_plus > di_minus) or (not is_long and di_minus > di_plus):
        base = min(10.0, base + 1.0)
    return min(10.0, base), lbl


def score_ma_alignment(price: float, ema20: float, ema50: float,
                       ema100: float, ema200: float, is_long: bool) -> float:
    if is_long:
        count   = sum([price > ema20, price > ema50, price > ema100, price > ema200])
        aligned = ema20 > ema50 > ema100 > ema200
    else:
        count   = sum([price < ema20, price < ema50, price < ema100, price < ema200])
        aligned = ema20 < ema50 < ema100 < ema200
    base = count * 2.5
    if aligned:
        base = min(10.0, base + 2.0)
    return min(10.0, base)


def score_sr(price: float, support: Optional[float],
             resistance: Optional[float], is_long: bool) -> tuple[float, float, float]:
    """Returns (score, dist_to_support_pct, dist_to_resistance_pct)."""
    dst_sup = (price - support) / price * 100  if support    else -1.0
    dst_res = (resistance - price) / price * 100 if resistance else -1.0

    if is_long:
        if support is None:
            return 5.0, -1.0, dst_res
        if   dst_sup < 1.0:  sc = 10.0
        elif dst_sup < 2.5:  sc = 8.0
        elif dst_sup < 5.0:  sc = 6.0
        elif dst_sup < 8.0:  sc = 4.0
        elif dst_sup < 12.0: sc = 2.5
        else:                sc = 1.5
    else:
        if resistance is None:
            return 5.0, dst_sup, -1.0
        if   dst_res < 1.0:  sc = 10.0
        elif dst_res < 2.5:  sc = 8.0
        elif dst_res < 5.0:  sc = 6.0
        elif dst_res < 8.0:  sc = 4.0
        elif dst_res < 12.0: sc = 2.5
        else:                sc = 1.5
    return sc, round(dst_sup, 2), round(dst_res, 2)


def score_breakout(price: float, high52: float, low52: float, is_long: bool) -> float:
    r = high52 - low52
    if r == 0:
        return 5.0
    pos = (price - low52) / r
    pct_from_high = (high52 - price) / high52 * 100
    pct_from_low  = (price - low52)  / low52  * 100

    if is_long:
        if pct_from_high < 1.0:    return 10.0
        elif pct_from_high < 3.0:  return 8.5
        elif pct_from_high < 6.0:  return 7.0
        elif pos > 0.75:           return 6.0
        elif pos > 0.50:           return 5.0
        elif pos > 0.25:           return 3.5
        else:                      return 2.0
    else:
        if pct_from_low < 1.0:     return 10.0
        elif pct_from_low < 3.0:   return 8.5
        elif pct_from_low < 6.0:   return 7.0
        elif pos < 0.25:           return 6.0
        elif pos < 0.50:           return 5.0
        elif pos < 0.75:           return 3.5
        else:                      return 2.0


def score_volume(rel_vol: Optional[float]) -> float:
    if rel_vol is None:
        return 5.0
    if   rel_vol >= 3.0: return 10.0
    elif rel_vol >= 2.0: return 8.5
    elif rel_vol >= 1.5: return 7.0
    elif rel_vol >= 1.0: return 5.5
    elif rel_vol >= 0.7: return 3.5
    else:                return 1.5


def final_quant_score(trend: float, momentum: float, vol: float, tq: float,
                      ma_align: float, sr: float, breakout: float, volume: float) -> float:
    # Weights: Trend 25, Momentum 20, TQ 15, MAAlign 15, Vol 10, SR 10, Volume 5
    raw = (
        0.25 * trend    * 10 +
        0.20 * momentum * 10 +
        0.15 * tq       * 10 +
        0.15 * ma_align * 10 +
        0.10 * vol      * 10 +
        0.10 * sr       * 10 +
        0.05 * volume   * 10
    )
    return round(min(100.0, max(0.0, raw)), 1)


def classify_quant(score: float) -> str:
    if score >= 90: return "Exceptional Technical Alignment"
    if score >= 80: return "Strong"
    if score >= 70: return "Good"
    if score >= 60: return "Neutral"
    return "Weak"
