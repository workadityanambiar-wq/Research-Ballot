'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { DirBadge } from '@/components/ui/Badge';
import { Bar } from '@/components/ui/Bar';
import TickerSearch from '@/components/ui/TickerSearch';
import { WEEK_ID, IDEA_LIMIT_PER_WEEK } from '@/lib/data';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { Mt5Quote, Mt5QuantData } from '@/lib/types';

// ── MT5 price panel ───────────────────────────────────────────────────────────

function Mt5PricePanel({ quote, loading, error }: { quote: Mt5Quote | null; loading: boolean; error: string | null }) {
  const { isMobile } = useBreakpoint();
  const statusColor = (s: string) =>
    s === 'OPEN' ? 'var(--long)' : s === 'CLOSED' ? 'var(--short)' : 'var(--warn)';

  return (
    <div style={{
      padding: 14,
      background: quote ? 'rgba(22,163,74,.04)' : error ? 'rgba(220,38,38,.04)' : 'var(--panel2)',
      border: `1px solid ${quote ? 'rgba(22,163,74,.25)' : error ? 'rgba(220,38,38,.2)' : 'var(--border)'}`,
      borderRadius: 6,
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="sec-title" style={{ margin: 0 }}>LIVE MARKET PRICE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {loading && <div style={{ fontSize: 9, color: 'var(--text4)', fontStyle: 'italic' }}>Fetching MT5…</div>}
          {quote && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
              background: quote.market_status === 'OPEN' ? 'rgba(22,163,74,.12)' : 'rgba(220,38,38,.1)',
              color: statusColor(quote.market_status),
              border: `1px solid ${quote.market_status === 'OPEN' ? 'rgba(22,163,74,.3)' : 'rgba(220,38,38,.2)'}`,
            }}>
              {quote.market_status}
            </span>
          )}
        </div>
      </div>

      {!quote && !loading && !error && (
        <div style={{ fontSize: 10, color: 'var(--text4)', fontStyle: 'italic' }}>
          Select a ticker above to capture the live MT5 price
        </div>
      )}

      {error && !loading && (
        <div style={{ fontSize: 10, color: 'var(--short)' }}>⚠ {error}</div>
      )}

      {loading && (
        <div style={{ display: 'flex', gap: 8 }}>
          {['CMP', 'BID', 'ASK', 'SPREAD'].map(k => (
            <div key={k} style={{ flex: 1, background: 'var(--bg)', borderRadius: 4, padding: '6px 8px' }}>
              <div style={{ fontSize: 8, color: 'var(--text4)', marginBottom: 3 }}>{k}</div>
              <div style={{ fontSize: 12, background: 'var(--border)', borderRadius: 2, height: 16, width: '70%' }} />
            </div>
          ))}
        </div>
      )}

      {quote && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div style={{ background: 'var(--bg)', borderRadius: 4, padding: '8px 10px', border: '1px solid rgba(22,163,74,.15)', gridColumn: isMobile ? '1 / -1' : undefined }}>
              <div style={{ fontSize: 8, color: 'var(--text4)', marginBottom: 3 }}>CURRENT MARKET PRICE</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--long)' }}>
                {quote.mid.toFixed(quote.digits)}
              </div>
              <div style={{ fontSize: 8, color: 'var(--text4)', marginTop: 2 }}>Captured Automatically</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 4, padding: '8px 10px' }}>
              <div style={{ fontSize: 8, color: 'var(--text4)', marginBottom: 3 }}>BID</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{quote.bid.toFixed(quote.digits)}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 4, padding: '8px 10px' }}>
              <div style={{ fontSize: 8, color: 'var(--text4)', marginBottom: 3 }}>ASK</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{quote.ask.toFixed(quote.digits)}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 4, padding: '8px 10px' }}>
              <div style={{ fontSize: 8, color: 'var(--text4)', marginBottom: 3 }}>SPREAD</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{quote.spread.toFixed(quote.digits)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '6px 10px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}>
            <div>
              <span style={{ fontSize: 8, color: 'var(--text4)' }}>MT5 SERVER TIME  </span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text2)' }}>
                {new Date(quote.server_time).toISOString().replace('T', ' ').slice(0, 19)} UTC
              </span>
            </div>
            <div style={{ width: 1, height: 12, background: 'var(--border)' }} />
            <div>
              <span style={{ fontSize: 8, color: 'var(--text4)' }}>SESSION  </span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text2)' }}>{quote.market_session}</span>
            </div>
            <div style={{ width: 1, height: 12, background: 'var(--border)' }} />
            <div>
              <span style={{ fontSize: 8, color: 'var(--text4)' }}>EXCHANGE  </span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text2)' }}>{quote.exchange}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Quant preview panel ───────────────────────────────────────────────────────

function QuantPreviewPanel({ data, loading }: { data: Mt5QuantData | null; loading: boolean }) {
  if (!loading && !data) return null;

  const qColor = (s: number) =>
    s >= 80 ? 'var(--long)' : s >= 70 ? 'var(--accent)' : s >= 60 ? 'var(--warn)' : 'var(--short)';
  const cColor = (s: number) =>
    s >= 7 ? 'var(--long)' : s >= 5 ? 'var(--accent)' : s >= 3 ? 'var(--warn)' : 'var(--short)';

  return (
    <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
      <div className="sec-title" style={{ marginBottom: 8 }}>MT5 QUANT ANALYSIS</div>
      {loading && (
        <div style={{ fontSize: 9, color: 'var(--text4)', fontStyle: 'italic', padding: '6px 0' }}>
          Calculating indicators from MT5…
        </div>
      )}
      {data && (
        <>
          <div style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 5, marginBottom: 10, border: `1px solid rgba(0,0,0,.06)` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: qColor(data.quant_score) }}>
                {data.quant_score.toFixed(1)}
              </span>
              <span style={{ fontSize: 8, fontWeight: 700, color: qColor(data.quant_score) }}>{data.quant_label}</span>
            </div>
            <Bar val={data.quant_score} color={qColor(data.quant_score)} h={4} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {(([
              ['Trend', data.trend_score, '25%', data.trend_label],
              ['Momentum', data.momentum_score, '20%', data.momentum_label],
              ['Trend Quality', data.trend_quality_score, '15%', data.trend_quality_label],
              ['MA Alignment', data.ma_alignment_score, '15%', ''],
              ['Volatility', data.volatility_score, '10%', data.volatility_label],
              ['S/R Levels', data.sr_score, '10%', ''],
              ['Breakout', data.breakout_score, '5%', ''],
              ['Volume', data.volume_score, '5%', ''],
            ] as [string, number, string, string][])).map(([l, v, w, lbl]) => (
              <div key={l}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 8, color: 'var(--text3)' }}>
                    {l} <span style={{ fontSize: 7, color: 'var(--text4)' }}>({w})</span>
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {lbl && <span style={{ fontSize: 7, color: 'var(--text4)' }}>{lbl}</span>}
                    <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: cColor(v) }}>{v.toFixed(1)}</span>
                  </div>
                </div>
                <Bar val={v} max={10} color={cColor(v)} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              {([['RSI', data.rsi14.toFixed(1)], ['ADX', data.adx14.toFixed(1)], ['ATR%', `${data.atr_pct.toFixed(2)}%`]] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ padding: '4px 6px', background: 'var(--bg)', borderRadius: 3, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 1 }}>{k}</div>
                  <div className="mono" style={{ fontSize: 9, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SubmitPage() {
  const { user, ideas, refreshIdeas } = useApp();
  if (!user) return null;

  const wkCount = ideas.filter(i => i.authorId === user.legacyId && i.weekId === WEEK_ID).length;
  const [f, setF] = useState({
    ticker: '', assetClass: 'US Equities', dir: 'LONG',
    stop: '', target: '', hold: '1-3M',
    posSize: '', conv: 7, expRet: '', expDD: '',
    thesis: '', catalysts: '', risks: '',
  });

  const [quote, setQuote]         = useState<Mt5Quote | null>(null);
  const [quoteLoading, setQL]     = useState(false);
  const [quoteError, setQE]       = useState<string | null>(null);
  const [quantPreview, setQuantPreview] = useState<Mt5QuantData | null>(null);
  const [quantLoading, setQuantLoading] = useState(false);
  const [imageUrl, setImageUrl]   = useState<string | null>(null);
  const [imgDrag, setImgDrag]     = useState(false);
  const fileRef                   = useRef<HTMLInputElement>(null);
  const [done, setDone]           = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Stable ref so fetchQuote (useCallback) can read current direction without re-creating
  const dirRef = useRef(f.dir);
  useEffect(() => { dirRef.current = f.dir; }, [f.dir]);

  const s = (k: string, v: string | number) => setF(p => ({ ...p, [k]: v }));

  const fetchQuote = useCallback(async (ticker: string) => {
    if (!ticker) { setQuote(null); setQE(null); return; }
    setQL(true);
    setQE(null);
    setQuote(null);
    try {
      const res = await fetch(`/api/mt5/quote?symbol=${encodeURIComponent(ticker)}`, { cache: 'no-store' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setQE(err.error ?? 'MT5 service unavailable — cannot submit without a live price');
        return;
      }
      const data: Mt5Quote = await res.json();
      setQuote(data);
      // Auto-populate stop/target only if not already manually set
      const isLong = dirRef.current === 'LONG';
      const sl = (data.mid * (isLong ? 0.98 : 1.02)).toFixed(data.digits);
      const tp = (data.mid * (isLong ? 1.04 : 0.96)).toFixed(data.digits);
      setF(p => (!p.stop && !p.target ? { ...p, stop: sl, target: tp } : p));
    } catch {
      setQE('MT5 service unavailable — cannot submit without a live price');
    } finally {
      setQL(false);
    }
  }, []);

  const fetchQuantPreview = useCallback(async (ticker: string, dir: string) => {
    if (!ticker) return;
    setQuantLoading(true);
    setQuantPreview(null);
    try {
      const res = await fetch(
        `/api/mt5/quant?symbol=${encodeURIComponent(ticker)}&dir=${dir}`,
        { cache: 'no-store', signal: AbortSignal.timeout(15000) },
      );
      if (res.ok) setQuantPreview(await res.json() as Mt5QuantData);
    } catch { /* non-blocking */ }
    finally { setQuantLoading(false); }
  }, []);

  const handleTickerSelect = (ticker: string) => {
    setF(p => ({ ...p, ticker, stop: '', target: '' }));
    setQuantPreview(null);
    fetchQuote(ticker);
    fetchQuantPreview(ticker, dirRef.current);
  };

  const handleDirChange = (newDir: string) => {
    const isLong = newDir === 'LONG';
    setF(p => {
      if (!quote) return { ...p, dir: newDir };
      const sl = (quote.mid * (isLong ? 0.98 : 1.02)).toFixed(quote.digits);
      const tp = (quote.mid * (isLong ? 1.04 : 0.96)).toFixed(quote.digits);
      return { ...p, dir: newDir, stop: sl, target: tp };
    });
    if (f.ticker) fetchQuantPreview(f.ticker, newDir);
  };

  // Refresh quote every 15 s while ticker is selected and page is visible
  useEffect(() => {
    if (!f.ticker || !quote) return;
    const id = setInterval(() => fetchQuote(f.ticker), 15000);
    return () => clearInterval(id);
  }, [f.ticker, quote, fetchQuote]);

  const loadImage = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => setImageUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const entry = quote?.mid ?? 0;
  const rr = entry && f.stop && f.target
    ? ((parseFloat(f.target) - entry) / (entry - parseFloat(f.stop))).toFixed(2)
    : '-';

  const canSubmit = !!quote && !quoteLoading && !!f.ticker && !!f.stop && !!f.target && !!f.thesis;

  const submit = async () => {
    if (!canSubmit) {
      if (!quote) { alert('Please wait for the live MT5 price to be captured before submitting.'); return; }
      alert('Please complete all required fields.');
      return;
    }
    if (wkCount >= IDEA_LIMIT_PER_WEEK) { alert('Weekly limit reached.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: f.ticker, assetClass: f.assetClass, dir: f.dir,
          stop: f.stop, target: f.target, hold: f.hold,
          posSize: f.posSize, conv: f.conv, expRet: f.expRet, expDD: f.expDD,
          thesis: f.thesis,
          catalysts: f.catalysts.split('\n').filter(Boolean),
          risks: f.risks.split('\n').filter(Boolean),
          ...(imageUrl ? { imageUrl } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? 'Submission failed.');
        return;
      }
      await refreshIdeas();
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  const { isMobile } = useBreakpoint();

  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="panel slide-up" style={{ padding: 32, maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Idea Submitted</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>
          MT5 market snapshot permanently recorded.<br />
          Your identity has been anonymized.
        </div>
        <button className="btn btn-ghost" onClick={() => { setDone(false); setQuote(null); setF({ ticker: '', assetClass: 'US Equities', dir: 'LONG', stop: '', target: '', hold: '1-3M', posSize: '', conv: 7, expRet: '', expDD: '', thesis: '', catalysts: '', risks: '' }); }}>
          SUBMIT ANOTHER ({IDEA_LIMIT_PER_WEEK - wkCount - 1} remaining)
        </button>
      </div>
    </div>
  );

  if (wkCount >= IDEA_LIMIT_PER_WEEK) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="panel" style={{ padding: 32, textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>⛔</div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Weekly Limit Reached</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          You have submitted {IDEA_LIMIT_PER_WEEK}/{IDEA_LIMIT_PER_WEEK} ideas this week. Resets Monday 00:00 UTC.
        </div>
      </div>
    </div>
  );

  return (
    <div className="scroll-y dash-content" style={{ height: '100%', padding: isMobile ? 12 : 16 }}>
      <div className="sec-hdr-resp" style={{ marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, marginBottom: 2 }}>Submit Trade Idea</div>
          {!isMobile && <div style={{ fontSize: 10, color: 'var(--text3)' }}>
            Entry price captured automatically from MT5 · No manual entry · Audit logged
          </div>}
        </div>
        <div className="panel" style={{ padding: '6px 10px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{isMobile ? 'IDEAS' : 'WEEKLY LIMIT'}</span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: wkCount < IDEA_LIMIT_PER_WEEK ? 'var(--accent)' : 'var(--short)' }}>
            {wkCount}/{IDEA_LIMIT_PER_WEEK}
          </span>
          <span className={`badge ${wkCount < IDEA_LIMIT_PER_WEEK ? 'badge-low' : 'badge-high'}`}>
            {IDEA_LIMIT_PER_WEEK - wkCount} left
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 14 }}>
        <div>
          {/* Ticker + direction + MT5 price */}
          <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
            <div className="sec-title" style={{ marginBottom: 12 }}>INSTRUMENT</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={isMobile ? { gridColumn: '1 / -1' } : {}}>
                <div className="form-label">TICKER *</div>
                <TickerSearch value={f.ticker} onSelect={handleTickerSelect} placeholder="Search ticker…" />
              </div>
              <div>
                <div className="form-label">ASSET CLASS</div>
                <select className="inp" value={f.assetClass} onChange={e => s('assetClass', e.target.value)}>
                  {['US Equities', 'Intl Equities', 'Fixed Income', 'Commodities', 'FX', 'Derivatives'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <div className="form-label">DIRECTION</div>
                <select className="inp" value={f.dir} onChange={e => handleDirChange(e.target.value)}>
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>
              </div>
              <div>
                <div className="form-label">HOLD PERIOD</div>
                <select className="inp" value={f.hold} onChange={e => s('hold', e.target.value)}>
                  {['<1M', '1-3M', '2-4M', '3-6M', '4-8M', '6-12M'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <Mt5PricePanel quote={quote} loading={quoteLoading} error={quoteError} />
          </div>

          {/* Trade parameters */}
          <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
            <div className="sec-title" style={{ marginBottom: 12 }}>TRADE PARAMETERS</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10 }}>
              <div>
                <div className="form-label">ENTRY PRICE (MT5)</div>
                <div className="inp mono" style={{
                  color: quote ? 'var(--long)' : 'var(--text4)',
                  fontWeight: quote ? 700 : 400,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {quote ? quote.mid.toFixed(quote.digits) : '— awaiting MT5 —'}
                  {quote && <span style={{ fontSize: 8, color: 'var(--long)', marginLeft: 2 }}>●</span>}
                </div>
                <div style={{ fontSize: 8, color: 'var(--text4)', marginTop: 2 }}>Auto from MT5</div>
              </div>
              {([['STOP LOSS *', 'stop', '810.00'], ['TARGET *', 'target', '1050.00'], ['POS. SIZE %', 'posSize', '2.5']] as [string, string, string][]).map(([l, k, ph]) => (
                <div key={k}>
                  <div className="form-label">{l}</div>
                  <input className="inp mono" type="number" placeholder={ph}
                    value={(f as Record<string, string | number>)[k] as string}
                    onChange={e => s(k, e.target.value)} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
              <div>
                <div className="form-label">CONVICTION</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input className="inp mono" type="number" min="1" max="10" value={f.conv}
                    onChange={e => s('conv', Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                    style={{ width: 56 }} />
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>/10</span>
                </div>
              </div>
              <div>
                <div className="form-label">EXP. RETURN %</div>
                <input className="inp mono" type="number" placeholder="20.5" value={f.expRet} onChange={e => s('expRet', e.target.value)} />
              </div>
              <div>
                <div className="form-label">RISK / REWARD</div>
                <div className="inp mono" style={{ color: parseFloat(rr) >= 2 ? 'var(--long)' : parseFloat(rr) >= 1 ? 'var(--warn)' : 'var(--short)', fontWeight: 600 }}>
                  {rr}
                </div>
              </div>
            </div>
          </div>

          {/* Investment thesis */}
          <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
            <div className="sec-title" style={{ marginBottom: 12 }}>INVESTMENT THESIS</div>
            <div style={{ marginBottom: 10 }}>
              <div className="form-label">INVESTMENT THESIS *</div>
              <textarea className="inp" placeholder="Describe your investment thesis…"
                value={f.thesis} onChange={e => s('thesis', e.target.value)} style={{ minHeight: 72 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="form-label">KEY CATALYSTS (one per line)</div>
                <textarea className="inp" placeholder="Q3 earnings beat&#10;Product launch"
                  value={f.catalysts} onChange={e => s('catalysts', e.target.value)} style={{ minHeight: 60 }} />
              </div>
              <div>
                <div className="form-label">RISKS TO THESIS (one per line)</div>
                <textarea className="inp" placeholder="Macro headwinds&#10;Competitive pressure"
                  value={f.risks} onChange={e => s('risks', e.target.value)} style={{ minHeight: 60 }} />
              </div>
            </div>
          </div>

          {/* Chart upload */}
          <div className="panel" style={{ padding: 14 }}>
            <div className="sec-title" style={{ marginBottom: 10 }}>
              SUPPORTING CHART / IMAGE{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text4)' }}>(optional)</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const fl = e.target.files?.[0]; if (fl) loadImage(fl); }} />
            {imageUrl ? (
              <div style={{ position: 'relative' }}>
                <img src={imageUrl} alt="Supporting chart"
                  style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)' }} />
                <button onClick={() => { setImageUrl(null); if (fileRef.current) fileRef.current.value = ''; }}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'var(--short-dim)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 4, color: 'var(--short)', fontSize: 10, padding: '2px 8px', cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 600 }}>
                  REMOVE
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setImgDrag(true); }}
                onDragLeave={() => setImgDrag(false)}
                onDrop={e => { e.preventDefault(); setImgDrag(false); const fl = e.dataTransfer.files[0]; if (fl) loadImage(fl); }}
                style={{ border: `1.5px dashed ${imgDrag ? 'var(--accent)' : 'var(--border2)'}`, borderRadius: 6, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: imgDrag ? 'var(--accent-dim)' : 'var(--bg)', transition: 'all .15s' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>📈</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Drop a chart or click to upload</div>
                <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 4 }}>PNG, JPG, GIF — max 5 MB</div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="panel-glow" style={{ padding: 14, marginBottom: 12 }}>
            <div className="sec-title" style={{ marginBottom: 8 }}>ANONYMOUS PREVIEW</div>
            <div style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 10, fontStyle: 'italic' }}>How peers will see this idea during voting.</div>
            <div className="panel2" style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--text4)' }}>IDEA-{String(ideas.length + 1).padStart(3, '0')}</span>
                <DirBadge dir={f.dir as 'LONG' | 'SHORT'} />
                <span className="badge badge-dim" style={{ marginLeft: 'auto' }}>{f.assetClass}</span>
              </div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{f.ticker || '———'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 8, color: 'var(--text4)' }}>CMP (MT5)</div>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--long)' }}>
                    {quote ? quote.mid.toFixed(quote.digits) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: 'var(--text4)' }}>CONVICTION</div>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{f.conv}/10</div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: 'var(--text4)' }}>R/R RATIO</div>
                  <div className="mono" style={{ fontSize: 13, color: parseFloat(rr) >= 2 ? 'var(--long)' : 'var(--text)' }}>{rr}</div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: 'var(--text4)' }}>HOLD PERIOD</div>
                  <div className="mono" style={{ fontSize: 13 }}>{f.hold}</div>
                </div>
              </div>
              {quote && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <div style={{ flex: 1, padding: '4px 6px', background: 'var(--bg)', borderRadius: 3, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 7, color: 'var(--text4)' }}>TARGET</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--long)', fontWeight: 600 }}>
                      {f.target ? `${((parseFloat(f.target) - quote.mid) / quote.mid * 100).toFixed(1)}%` : '—'}
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '4px 6px', background: 'var(--bg)', borderRadius: 3, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 7, color: 'var(--text4)' }}>STOP</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--short)', fontWeight: 600 }}>
                      {f.stop ? `${((parseFloat(f.stop) - quote.mid) / quote.mid * 100).toFixed(1)}%` : '—'}
                    </div>
                  </div>
                </div>
              )}
              {f.thesis && (
                <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.5, marginBottom: 6 }}>
                  {f.thesis.slice(0, 100)}…
                </div>
              )}
              {imageUrl && (
                <img src={imageUrl} alt="chart" style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border)', marginBottom: 6 }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 9, color: 'var(--text4)' }}>AUTHOR:</span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--text4)' }}>████████ [ANONYMOUS]</span>
              </div>
            </div>
          </div>

          <QuantPreviewPanel data={quantPreview} loading={quantLoading} />

          {/* MT5 capture confirmation */}
          {quote && (
            <div style={{ padding: 10, background: 'rgba(22,163,74,.04)', border: '1px solid rgba(22,163,74,.2)', borderRadius: 6, marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--long)', marginBottom: 4 }}>SNAPSHOT READY</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', lineHeight: 1.6 }}>
                CMP will be locked at <span className="mono" style={{ fontWeight: 700 }}>{quote.mid.toFixed(quote.digits)}</span><br />
                on submission at {new Date().toISOString().slice(11, 19)} UTC<br />
                MT5 server time: {new Date(quote.server_time).toISOString().slice(11, 19)} UTC
              </div>
            </div>
          )}

          {!quote && !quoteLoading && f.ticker && (
            <div style={{ padding: 10, background: 'rgba(220,38,38,.04)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 6, marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: 'var(--short)' }}>
                Cannot submit without a live MT5 price. Ensure the MT5 service is running.
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 12, opacity: canSubmit && !submitting ? 1 : 0.4 }}
            onClick={submit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? 'SUBMITTING…' : '✦  SUBMIT IDEA  →'}
          </button>
          <div style={{ marginTop: 8, fontSize: 9, color: 'var(--text4)', textAlign: 'center' }}>
            Identity anonymized · No edits · MT5 snapshot locked on submit
          </div>
        </div>
      </div>
    </div>
  );
}
