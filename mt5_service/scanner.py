"""
APEX Market Scanner — Orchestration Layer
Coordinates MT5 data fetching and pattern detection across symbols and timeframes.
"""
from __future__ import annotations
import time
from datetime import datetime, timezone
from typing import Optional

import MetaTrader5 as mt5

import quant as q
import patterns as p

# ── Timeframe map ─────────────────────────────────────────────────────────────

TF_MAP = {
    "M5":  mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,
    "M30": mt5.TIMEFRAME_M30,
    "H1":  mt5.TIMEFRAME_H1,
    "H4":  mt5.TIMEFRAME_H4,
    "D1":  mt5.TIMEFRAME_D1,
    "W1":  mt5.TIMEFRAME_W1,
    "MN1": mt5.TIMEFRAME_MN1,
}

TF_BARS = {
    "M5": 300, "M15": 300, "M30": 250,
    "H1": 250, "H4": 250, "D1": 260,
    "W1": 156, "MN1": 60,
}

TF_LABEL = {
    "M5": "5m", "M15": "15m", "M30": "30m",
    "H1": "1H", "H4": "4H",  "D1":  "Daily",
    "W1": "Weekly", "MN1": "Monthly",
}

# Default universe — major instruments
DEFAULT_SYMBOLS = [
    # Forex majors
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
    # Forex crosses
    "EURJPY", "GBPJPY", "EURGBP", "AUDJPY", "EURAUD", "GBPAUD",
    # Indices
    "US30", "US500", "USTEC", "GER40", "UK100", "JP225", "AUS200",
    # Commodities
    "XAUUSD", "XAGUSD", "USOIL", "UKOIL",
    # Crypto
    "BTCUSD", "ETHUSD",
]

ASSET_CLASS_MAP = {
    "EURUSD": "Forex", "GBPUSD": "Forex", "USDJPY": "Forex", "USDCHF": "Forex",
    "AUDUSD": "Forex", "USDCAD": "Forex", "NZDUSD": "Forex",
    "EURJPY": "Forex", "GBPJPY": "Forex", "EURGBP": "Forex",
    "AUDJPY": "Forex", "EURAUD": "Forex", "GBPAUD": "Forex",
    "US30": "Indices", "US500": "Indices", "USTEC": "Indices",
    "GER40": "Indices", "UK100": "Indices", "JP225": "Indices", "AUS200": "Indices",
    "XAUUSD": "Commodities", "XAGUSD": "Commodities",
    "USOIL": "Commodities", "UKOIL": "Commodities",
    "BTCUSD": "Crypto", "ETHUSD": "Crypto",
}


def _get_bars(symbol: str, tf_key: str) -> tuple[list, list, list, list, list, list]:
    """Returns (timestamps, opens, highs, lows, closes, volumes)."""
    mt5_tf = TF_MAP.get(tf_key)
    if mt5_tf is None:
        return [], [], [], [], [], []
    count = TF_BARS.get(tf_key, 250)
    rates = mt5.copy_rates_from_pos(symbol, mt5_tf, 0, count)
    if rates is None or len(rates) == 0:
        return [], [], [], [], [], []
    ts = [int(r["time"]) for r in rates]
    O  = [float(r["open"])       for r in rates]
    H  = [float(r["high"])       for r in rates]
    L  = [float(r["low"])        for r in rates]
    C  = [float(r["close"])      for r in rates]
    V  = [float(r["tick_volume"]) for r in rates]
    return ts, O, H, L, C, V


def scan_symbol(symbol: str, timeframes: list[str]) -> list[dict]:
    """
    Scan a single symbol across specified timeframes.
    Returns list of pattern result dicts, enriched with symbol/timeframe metadata.
    """
    symbol = symbol.upper().strip()
    if not mt5.symbol_select(symbol, True):
        return []
    time.sleep(0.05)

    tick = mt5.symbol_info_tick(symbol)
    info = mt5.symbol_info(symbol)
    if tick is None:
        return []

    price  = (tick.bid + tick.ask) / 2
    digits = info.digits if info else 5

    all_results = []

    # D1 bars for 52-week levels (shared across TF scans)
    _, d1O, d1H, d1L, d1C, _ = _get_bars(symbol, "D1")
    if len(d1H) >= 50:
        high52 = max(d1H[-252:]) if len(d1H) >= 252 else max(d1H)
        low52  = min(d1L[-252:]) if len(d1L) >= 252 else min(d1L)
    else:
        high52 = price * 1.2
        low52  = price * 0.8

    for tf_key in timeframes:
        if tf_key not in TF_MAP:
            continue
        _, O, H, L, C, V = _get_bars(symbol, tf_key)
        if len(C) < 20:
            continue

        # Indicators
        ema20  = q.ema_last(C, 20)
        ema50  = q.ema_last(C, 50)
        ema100 = q.ema_last(C, 100)
        ema200 = q.ema_last(C, 200) if len(C) >= 200 else ema100
        rsi14  = q.calc_rsi(C, 14)
        macd_l, macd_s, macd_h = q.calc_macd(C)
        atr14  = q.calc_atr(H, L, C, 14)
        adx14, di_plus, di_minus = q.calc_adx(H, L, C, 14)

        # S/R from recent bars
        sr_h = H[-50:] if len(H) >= 50 else H
        sr_l = L[-50:] if len(L) >= 50 else L
        sr_c = C[-50:] if len(C) >= 50 else C
        support, resistance = q.find_sr_levels(sr_c, sr_h, sr_l, price, n=3)

        # Volume
        avg_vol20 = sum(V[-20:]) / 20 if len(V) >= 20 else None
        rel_vol = (V[-1] / avg_vol20) if avg_vol20 and avg_vol20 > 0 else None

        # Run pattern scan
        results = p.scan_bars(
            O, H, L, C, V, price, atr14, rsi14,
            macd_l, macd_s, macd_h,
            adx14, di_plus, di_minus,
            ema20, ema50, ema100, ema200,
            rel_vol, high52, low52, support, resistance,
        )

        asset_class = ASSET_CLASS_MAP.get(symbol, "Other")

        for r in results:
            r.update({
                "symbol":       symbol,
                "asset_class":  asset_class,
                "timeframe":    tf_key,
                "tf_label":     TF_LABEL.get(tf_key, tf_key),
                "description_str": info.description if info else symbol,
                "digits":       digits,
                "atr":          round(atr14, digits),
                "rsi":          round(rsi14, 2),
                "adx":          round(adx14, 2),
                "detected_at":  datetime.now(timezone.utc).isoformat(),
            })
            all_results.append(r)

    return all_results


def get_available_symbols() -> list[dict]:
    """Return all MT5 symbols, categorised, filtered to visible ones."""
    all_syms = mt5.symbols_get()
    if all_syms is None:
        return []
    out = []
    for s in all_syms:
        if not s.visible:
            continue
        out.append({
            "symbol":      s.name,
            "description": s.description,
            "category":    s.path.split("\\")[0] if s.path else "Other",
            "digits":      s.digits,
            "currency_base":   s.currency_base,
            "currency_profit": s.currency_profit,
        })
    return out


def run_scan(symbols: Optional[list[str]] = None,
             timeframes: Optional[list[str]] = None,
             min_score: float = 70.0) -> list[dict]:
    """
    Full market scan across symbols and timeframes.
    Returns all detected patterns above min_score, sorted by pattern_score.
    """
    symbols = symbols or DEFAULT_SYMBOLS
    timeframes = timeframes or ["H1", "H4", "D1"]

    all_results: list[dict] = []
    for sym in symbols:
        try:
            results = scan_symbol(sym, timeframes)
            all_results.extend(r for r in results if r.get("pattern_score", 0) >= min_score)
        except Exception:
            pass

    all_results.sort(key=lambda x: x.get("pattern_score", 0), reverse=True)
    return all_results
