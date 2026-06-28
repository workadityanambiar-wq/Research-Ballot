"""
MT5 Market Data Microservice
Runs on Windows alongside MetaTrader 5 terminal.
Exposes live quote and quantitative scoring endpoints consumed by the APEX Next.js app.
"""

import os
import time
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional

import MetaTrader5 as mt5
from fastapi import FastAPI, HTTPException, Header, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import quant as q

load_dotenv()

MT5_SERVICE_KEY = os.getenv("MT5_SERVICE_KEY", "change-me-in-production")
MT5_LOGIN       = int(os.getenv("MT5_LOGIN", "0"))
MT5_PASSWORD    = os.getenv("MT5_PASSWORD", "")
MT5_SERVER      = os.getenv("MT5_SERVER", "")


def _init_mt5() -> bool:
    kwargs = {}
    if MT5_LOGIN:
        kwargs = {"login": MT5_LOGIN, "password": MT5_PASSWORD, "server": MT5_SERVER}
    if not mt5.initialize(**kwargs):
        print(f"[MT5] init failed: {mt5.last_error()}")
        return False
    info = mt5.terminal_info()
    print(f"[MT5] connected — build {info.build}, {info.company}")
    return True


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_mt5()
    yield
    mt5.shutdown()


app = FastAPI(title="MT5 Market Data Service", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def require_key(x_api_key: str = Header(..., alias="x-api-key")):
    if x_api_key != MT5_SERVICE_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


def _ensure_connected():
    if mt5.terminal_info() is None:
        if not _init_mt5():
            raise HTTPException(status_code=503, detail="MT5 terminal not available")


def _market_status(info) -> str:
    if info is None:
        return "UNKNOWN"
    mode = info.trade_mode
    if mode == mt5.SYMBOL_TRADE_MODE_DISABLED:
        return "CLOSED"
    if mode == mt5.SYMBOL_TRADE_MODE_SHORTONLY:
        return "SHORT_ONLY"
    if mode == mt5.SYMBOL_TRADE_MODE_LONGONLY:
        return "LONG_ONLY"
    return "OPEN"


def _market_session(server_dt: datetime) -> str:
    h = server_dt.hour
    if 0 <= h < 8:
        return "ASIA"
    if 8 <= h < 13:
        return "EUROPE"
    if 13 <= h < 21:
        return "US"
    return "AFTER_HOURS"


def _get_bars(symbol: str, timeframe, count: int) -> tuple[list, list, list, list, list]:
    """Returns (opens, highs, lows, closes, volumes) as plain lists."""
    rates = mt5.copy_rates_from_pos(symbol, timeframe, 0, count)
    if rates is None or len(rates) == 0:
        return [], [], [], [], []
    opens   = [float(r["open"])   for r in rates]
    highs   = [float(r["high"])   for r in rates]
    lows    = [float(r["low"])    for r in rates]
    closes  = [float(r["close"])  for r in rates]
    volumes = [float(r["tick_volume"]) for r in rates]
    return opens, highs, lows, closes, volumes


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    connected = mt5.terminal_info() is not None
    account = None
    if connected:
        acc = mt5.account_info()
        if acc:
            account = {"login": acc.login, "server": acc.server, "currency": acc.currency}
    return {
        "status": "ok" if connected else "disconnected",
        "mt5_connected": connected,
        "account": account,
        "ts": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/validate/{symbol}")
def validate_symbol(symbol: str, _=Depends(require_key)):
    _ensure_connected()
    symbol = symbol.upper().strip()
    info = mt5.symbol_info(symbol)
    if info is None:
        mt5.symbol_select(symbol, True)
        time.sleep(0.2)
        info = mt5.symbol_info(symbol)
    if info is None:
        return {"valid": False, "symbol": symbol}
    return {
        "valid": True,
        "symbol": symbol,
        "description": info.description,
        "exchange": getattr(info, "exchange", "") or "",
        "digits": info.digits,
        "currency_base": info.currency_base,
        "currency_profit": info.currency_profit,
    }


@app.get("/quote/{symbol}")
def get_quote(symbol: str, _=Depends(require_key)):
    _ensure_connected()
    symbol = symbol.upper().strip()

    if not mt5.symbol_select(symbol, True):
        raise HTTPException(status_code=404, detail=f"Symbol '{symbol}' not found in MT5")

    tick = mt5.symbol_info_tick(symbol)
    info = mt5.symbol_info(symbol)

    if tick is None:
        raise HTTPException(status_code=404, detail=f"No tick data for '{symbol}' — market may be closed")

    bid    = tick.bid
    ask    = tick.ask
    mid    = round((bid + ask) / 2, info.digits if info else 5)
    spread = round(ask - bid, info.digits if info else 5)

    server_dt   = datetime.fromtimestamp(tick.time, tz=timezone.utc)
    server_iso  = server_dt.isoformat()
    trading_day = server_dt.strftime("%Y-%m-%d")
    week_number = int(server_dt.strftime("%V"))
    exchange    = (getattr(info, "exchange", "") or "MT5") if info else "MT5"

    return {
        "symbol":         symbol,
        "bid":            bid,
        "ask":            ask,
        "mid":            mid,
        "spread":         spread,
        "server_time":    server_iso,
        "market_status":  _market_status(info),
        "market_session": _market_session(server_dt),
        "exchange":       exchange,
        "time_zone":      "UTC",
        "digits":         info.digits if info else 2,
        "trading_day":    trading_day,
        "week_number":    week_number,
        "description":    info.description if info else symbol,
    }


@app.get("/quant/{symbol}")
def get_quant(
    symbol: str,
    dir: str = Query(default="LONG", regex="^(LONG|SHORT)$"),
    _=Depends(require_key),
):
    """
    Calculate full quantitative score for a symbol and trade direction.
    Fetches H1 (200 bars) for indicators + D1 (252 bars) for 52-week levels.
    """
    _ensure_connected()
    symbol   = symbol.upper().strip()
    is_long  = (dir.upper() == "LONG")

    if not mt5.symbol_select(symbol, True):
        raise HTTPException(status_code=404, detail=f"Symbol '{symbol}' not found in MT5")

    # Live price
    tick = mt5.symbol_info_tick(symbol)
    info = mt5.symbol_info(symbol)
    if tick is None:
        raise HTTPException(status_code=404, detail=f"No tick data for '{symbol}'")

    price  = (tick.bid + tick.ask) / 2
    digits = info.digits if info else 2

    # ── Fetch H1 bars (200 bars ≈ 8 days) ──────────────────────────────────
    _, h1h, h1l, h1c, h1v = _get_bars(symbol, mt5.TIMEFRAME_H1, 250)
    if len(h1c) < 30:
        raise HTTPException(status_code=422, detail="Insufficient H1 bar history for quant calculation")

    # ── Fetch D1 bars (252 bars ≈ 1 year) for 52-week levels ──────────────
    _, d1h, d1l, d1c, _ = _get_bars(symbol, mt5.TIMEFRAME_D1, 260)

    # ── EMAs ───────────────────────────────────────────────────────────────
    ema20  = q.ema_last(h1c, 20)
    ema50  = q.ema_last(h1c, 50)
    ema100 = q.ema_last(h1c, 100)
    ema200 = q.ema_last(h1c, 200)

    # ── Momentum ───────────────────────────────────────────────────────────
    rsi14          = q.calc_rsi(h1c, 14)
    macd_l, macd_s, macd_h = q.calc_macd(h1c)

    # ── Volatility ─────────────────────────────────────────────────────────
    atr14 = q.calc_atr(h1h, h1l, h1c, 14)

    # Current & average daily range (from last 20 H1 bars as proxy)
    recent_ranges = [h1h[i] - h1l[i] for i in range(-20, 0)]
    avg_range     = sum(recent_ranges) / len(recent_ranges) if recent_ranges else atr14
    current_range = h1h[-1] - h1l[-1] if h1h else atr14

    # Historical volatility
    hist_vol = q.hist_volatility(h1c, 20)

    # ── Trend quality ──────────────────────────────────────────────────────
    adx14, di_plus, di_minus = q.calc_adx(h1h, h1l, h1c, 14)

    # ── 52-week high / low ─────────────────────────────────────────────────
    if len(d1h) >= 50:
        high52 = max(d1h[-252:]) if len(d1h) >= 252 else max(d1h)
        low52  = min(d1l[-252:]) if len(d1l) >= 252 else min(d1l)
    else:
        high52 = max(h1h) if h1h else price * 1.1
        low52  = min(h1l) if h1l else price * 0.9

    # ── Support / resistance ───────────────────────────────────────────────
    # Use D1 bars for cleaner S/R levels (last 50)
    sr_highs = d1h[-50:] if len(d1h) >= 50 else h1h[-100:]
    sr_lows  = d1l[-50:] if len(d1l) >= 50 else h1l[-100:]
    sr_closes = d1c[-50:] if len(d1c) >= 50 else h1c[-100:]
    support, resistance = q.find_sr_levels(sr_closes, sr_highs, sr_lows, price, n=3)

    # ── Volume (tick volume) ───────────────────────────────────────────────
    avg_vol20 = sum(h1v[-20:]) / 20 if len(h1v) >= 20 else None
    rel_vol   = (h1v[-1] / avg_vol20) if avg_vol20 and avg_vol20 > 0 else None

    # ── Score each component ───────────────────────────────────────────────
    trend_score, trend_label           = q.score_trend(price, ema20, ema50, ema100, ema200, is_long)
    mom_score, mom_label               = q.score_momentum(rsi14, macd_l, macd_s, macd_h, is_long)
    vol_score, vol_label, atr_pct      = q.score_volatility(atr14, price)
    tq_score, tq_label                 = q.score_trend_quality(adx14, di_plus, di_minus, is_long)
    ma_score                           = q.score_ma_alignment(price, ema20, ema50, ema100, ema200, is_long)
    sr_score, dist_sup, dist_res       = q.score_sr(price, support, resistance, is_long)
    bk_score                           = q.score_breakout(price, high52, low52, is_long)
    vl_score                           = q.score_volume(rel_vol)

    # ── Final weighted score ───────────────────────────────────────────────
    final = q.final_quant_score(
        trend_score, mom_score, vol_score, tq_score,
        ma_score, sr_score, bk_score, vl_score,
    )

    return {
        "symbol":    symbol,
        "direction": dir.upper(),
        "price":     round(price, digits),
        "calculated_at": datetime.now(timezone.utc).isoformat(),

        # Raw indicators
        "ema20":   round(ema20,  digits),
        "ema50":   round(ema50,  digits),
        "ema100":  round(ema100, digits),
        "ema200":  round(ema200, digits),
        "rsi14":   round(rsi14, 2),
        "macd_line":   round(macd_l, 4),
        "macd_signal": round(macd_s, 4),
        "macd_hist":   round(macd_h, 4),
        "atr14":       round(atr14,  digits),
        "atr_pct":     round(atr_pct, 3),
        "hist_vol":    round(hist_vol, 2),
        "adx14":       round(adx14, 2),
        "di_plus":     round(di_plus,  2),
        "di_minus":    round(di_minus, 2),
        "high52w":     round(high52, digits),
        "low52w":      round(low52,  digits),
        "nearest_support":    round(support,    digits) if support    else None,
        "nearest_resistance": round(resistance, digits) if resistance else None,
        "dist_to_support":    dist_sup,
        "dist_to_resistance": dist_res,
        "avg_volume20":  round(avg_vol20, 0) if avg_vol20 else None,
        "rel_volume":    round(rel_vol, 2)   if rel_vol   else None,
        "current_range": round(current_range, digits),
        "avg_range":     round(avg_range,     digits),

        # MA alignment flags
        "price_above_ema20":   price > ema20,
        "price_above_ema50":   price > ema50,
        "price_above_ema100":  price > ema100,
        "price_above_ema200":  price > ema200,
        "ema20_above_ema50":   ema20 > ema50,
        "ema50_above_ema100":  ema50 > ema100,
        "ema100_above_ema200": ema100 > ema200,

        # Component scores (0–10)
        "trend_score":        round(trend_score, 2),
        "momentum_score":     round(mom_score,   2),
        "volatility_score":   round(vol_score,   2),
        "trend_quality_score": round(tq_score,   2),
        "ma_alignment_score": round(ma_score,    2),
        "sr_score":           round(sr_score,    2),
        "breakout_score":     round(bk_score,    2),
        "volume_score":       round(vl_score,    2),

        # Labels
        "trend_label":         trend_label,
        "momentum_label":      mom_label,
        "volatility_label":    vol_label,
        "trend_quality_label": tq_label,
        "quant_label":         q.classify_quant(final),

        # Final
        "quant_score": final,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("MT5_SERVICE_PORT", "8765"))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=False)
