'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScanResult {
  id: string;
  symbol: string;
  assetClass: string;
  description?: string;
  pattern: string;
  category: string;
  direction: string;
  timeframe: string;
  tfLabel: string;
  currentPrice: number;
  breakoutLevel: number;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  target3: number;
  risk: number;
  reward: number;
  rrRatio: number;
  patternScore: number;
  patternQuality: number;
  trendQuality: number;
  volumeConf: number;
  breakoutProb: number;
  rrScore: number;
  classification: string;
  status: string;
  commentary?: string;
  holdingPeriod?: string;
  atr: number;
  rsi: number;
  adx: number;
  isStarred: boolean;
  detectedAt: string;
  _count?: { alerts: number; watchedBy: number };
}

interface Alert {
  id: string;
  alertType: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  result: { symbol: string; pattern: string; direction: string; tfLabel: string; patternScore: number; classification: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 95) return '#f59e0b';
  if (s >= 90) return '#22c55e';
  if (s >= 80) return '#3b82f6';
  if (s >= 70) return '#6366f1';
  return 'var(--text4)';
}

function dirColor(d: string) {
  if (d === 'BULLISH') return 'var(--long)';
  if (d === 'BEARISH') return 'var(--short)';
  return 'var(--text3)';
}

function catIcon(c: string) {
  if (c === 'CANDLESTICK') return '🕯';
  if (c === 'CHART')       return '◈';
  if (c === 'INDICATOR')   return '◇';
  if (c === 'BREAKOUT')    return '⚡';
  return '●';
}

function statusBadge(s: string) {
  const cfg: Record<string, { bg: string; color: string }> = {
    WATCH:     { bg: 'rgba(99,102,241,.15)',  color: '#818cf8' },
    TRIGGERED: { bg: 'rgba(245,158,11,.15)', color: '#fbbf24' },
    CONFIRMED: { bg: 'rgba(34,197,94,.15)',  color: '#22c55e' },
    FAILED:    { bg: 'rgba(220,38,38,.15)',  color: '#f87171' },
    EXPIRED:   { bg: 'rgba(100,116,139,.15)', color: '#94a3b8' },
  };
  const { bg, color } = cfg[s] ?? cfg.WATCH;
  return (
    <span style={{ background: bg, color, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>
      {s}
    </span>
  );
}

function MiniBar({ value, color = 'var(--accent)' }: { value: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 9, color: 'var(--text4)', minWidth: 22, textAlign: 'right', fontFamily: 'var(--mono)' }}>{value.toFixed(0)}</span>
    </div>
  );
}

function ScoreBadge({ score, classification }: { score: number; classification: string }) {
  const color = scoreColor(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color, fontFamily: 'var(--mono)' }}>{score.toFixed(0)}</span>
      </div>
      <span style={{ fontSize: 8, color, fontWeight: 600, letterSpacing: '0.04em', lineHeight: 1.2, maxWidth: 52 }}>
        {classification.toUpperCase()}
      </span>
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ result, onClose, onStar, onStatusChange, onCreateResearch }:
  { result: ScanResult; onClose: () => void; onStar: (id: string) => void; onStatusChange: (id: string, s: string) => void; onCreateResearch: (r: ScanResult) => void }) {
  const color = dirColor(result.direction);
  const sc = scoreColor(result.patternScore);
  const digits = result.currentPrice > 100 ? 2 : result.currentPrice > 1 ? 4 : 5;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
      background: 'var(--surface)', borderLeft: '1px solid var(--border)',
      zIndex: 1000, overflowY: 'auto', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{result.symbol}</span>
            <span style={{ fontSize: 11, color, fontWeight: 700, background: color + '18', padding: '2px 7px', borderRadius: 4 }}>{result.direction}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{catIcon(result.category)} {result.pattern}</span>
          <span style={{ fontSize: 10, color: 'var(--text4)' }}>·</span>
          <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{result.tfLabel}</span>
          <span style={{ fontSize: 10, color: 'var(--text4)' }}>·</span>
          <span style={{ fontSize: 10, color: 'var(--text4)' }}>{result.assetClass}</span>
        </div>
      </div>

      <div style={{ padding: 16, flex: 1 }}>
        {/* Score */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <ScoreBadge score={result.patternScore} classification={result.classification} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 4, letterSpacing: '0.06em' }}>CONFIDENCE SUB-SCORES</div>
            <MiniBar value={result.patternQuality} color={sc} />
            <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 2 }}>Pattern Quality</div>
            <MiniBar value={result.trendQuality} color='#3b82f6' />
            <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 2 }}>Trend Quality</div>
            <MiniBar value={result.volumeConf} color='#22c55e' />
            <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 2 }}>Volume Confirmation</div>
            <MiniBar value={result.breakoutProb} color='#f59e0b' />
            <div style={{ fontSize: 7, color: 'var(--text4)' }}>Breakout Probability</div>
          </div>
        </div>

        {/* Trade Parameters */}
        <div style={{ background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)', padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>TRADE PARAMETERS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
            {[
              { label: 'CURRENT', val: result.currentPrice.toFixed(digits), color: 'var(--text)' },
              { label: 'BREAKOUT', val: result.breakoutLevel.toFixed(digits), color: sc },
              { label: 'ENTRY', val: result.entry.toFixed(digits), color: '#22c55e' },
              { label: 'STOP', val: result.stop.toFixed(digits), color: '#f87171' },
              { label: 'TARGET 1', val: result.target1.toFixed(digits), color: '#60a5fa' },
              { label: 'TARGET 2', val: result.target2.toFixed(digits), color: '#818cf8' },
              { label: 'TARGET 3', val: result.target3.toFixed(digits), color: '#c084fc' },
              { label: 'R:R RATIO', val: result.rrRatio.toFixed(2) + ':1', color: 'var(--accent)' },
            ].map(({ label, val, color: c }) => (
              <div key={label}>
                <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 2, letterSpacing: '0.06em' }}>{label}</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: c }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Indicators */}
        <div style={{ background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)', padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>INDICATORS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'RSI', val: result.rsi.toFixed(1), color: result.rsi > 70 ? '#f87171' : result.rsi < 30 ? '#22c55e' : 'var(--text)' },
              { label: 'ADX', val: result.adx.toFixed(1), color: result.adx >= 30 ? '#f59e0b' : 'var(--text)' },
              { label: 'ATR', val: result.atr.toFixed(digits), color: 'var(--text)' },
            ].map(({ label, val, color: c }) => (
              <div key={label}>
                <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 2 }}>{label}</div>
                <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: c }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 2 }}>RISK | REWARD</div>
            <div className="mono" style={{ fontSize: 11 }}>
              <span style={{ color: '#f87171' }}>{result.risk.toFixed(digits)}</span>
              <span style={{ color: 'var(--text4)' }}> / </span>
              <span style={{ color: '#22c55e' }}>{result.reward.toFixed(digits)}</span>
            </div>
          </div>
          {result.holdingPeriod && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 2 }}>HOLDING PERIOD</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text)' }}>{result.holdingPeriod}</div>
            </div>
          )}
        </div>

        {/* AI Commentary */}
        {result.commentary && (
          <div style={{ background: 'rgba(99,102,241,.06)', borderRadius: 6, border: '1px solid rgba(99,102,241,.2)', padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#818cf8', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>PATTERN COMMENTARY</div>
            <p style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>{result.commentary}</p>
          </div>
        )}

        {/* Status + Actions */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>STATUS</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['WATCH', 'TRIGGERED', 'CONFIRMED', 'FAILED', 'EXPIRED'].map(s => (
              <button key={s} onClick={() => onStatusChange(result.id, s)} style={{
                fontSize: 9, padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 700,
                border: result.status === s ? `1px solid ${scoreColor(s === 'CONFIRMED' ? 95 : 70)}` : '1px solid var(--border)',
                background: result.status === s ? 'rgba(99,102,241,.1)' : 'var(--bg)',
                color: result.status === s ? 'var(--accent)' : 'var(--text4)',
              }}>{s}</button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 8, color: 'var(--text4)', marginBottom: 12 }}>
          Detected {new Date(result.detectedAt).toLocaleString()}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <button onClick={() => onCreateResearch(result)} style={{
            padding: '10px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 12, width: '100%',
          }}>
            ✦ Create Research Idea
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onStar(result.id)} style={{
              flex: 1, padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
              border: '1px solid var(--border)', background: result.isStarred ? 'rgba(245,158,11,.1)' : 'var(--bg)',
              color: result.isStarred ? '#f59e0b' : 'var(--text3)', fontWeight: 600, fontSize: 12,
            }}>
              {result.isStarred ? '★ Starred' : '☆ Star'}
            </button>
            <a href={`https://www.tradingview.com/chart/?symbol=${result.symbol}`} target="_blank" rel="noreferrer"
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 6, cursor: 'pointer', textDecoration: 'none',
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text3)', fontWeight: 600, fontSize: 12, textAlign: 'center', display: 'block',
              }}>
              ◈ View Chart
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Scanner Page ─────────────────────────────────────────────────────────

export default function ScannerPage() {
  const { user } = useApp();
  const [results, setResults] = useState<ScanResult[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<ScanResult | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [fDirection, setFDirection] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fTimeframe, setFTimeframe] = useState('');
  const [fAssetClass, setFAssetClass] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fMinScore, setFMinScore] = useState(70);
  const [fSort, setFSort] = useState('patternScore');
  const [fStarred, setFStarred] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Scan config
  const [scanSymbols, setScanSymbols] = useState('');
  const [scanTimeframes, setScanTimeframes] = useState('H1,H4,D1');
  const [showScanConfig, setShowScanConfig] = useState(false);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        sort: fSort,
        minScore: fMinScore.toString(),
        limit: '150',
      });
      if (fDirection)  params.set('direction', fDirection);
      if (fCategory)   params.set('category', fCategory);
      if (fTimeframe)  params.set('timeframe', fTimeframe);
      if (fAssetClass) params.set('assetClass', fAssetClass);
      if (fStatus)     params.set('status', fStatus);
      if (fStarred)    params.set('starred', 'true');

      const r = await fetch(`/api/scanner?${params}`);
      if (r.ok) {
        const data = await r.json() as { results: ScanResult[] };
        setResults(data.results ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [fDirection, fCategory, fTimeframe, fAssetClass, fStatus, fMinScore, fSort, fStarred]);

  const loadAlerts = useCallback(async () => {
    const r = await fetch('/api/scanner/alerts?limit=30');
    if (r.ok) {
      const d = await r.json() as { alerts: Alert[]; unreadCount: number };
      setAlerts(d.alerts);
      setUnreadAlerts(d.unreadCount);
    }
  }, []);

  useEffect(() => {
    if (user) { loadResults(); loadAlerts(); }
  }, [user, loadResults, loadAlerts]);

  // Auto-refresh every 60s
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);
  useEffect(() => {
    if (user) {
      intervalRef.current = setInterval(() => { loadResults(); loadAlerts(); }, 60_000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [user, loadResults, loadAlerts]);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { minScore: fMinScore };
      if (scanSymbols.trim()) body.symbols = scanSymbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (scanTimeframes.trim()) body.timeframes = scanTimeframes.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

      const r = await fetch('/api/scanner/scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json() as { found?: number; error?: string; scanned_at?: string };
      if (!r.ok) { setError(d.error ?? 'Scan failed'); return; }
      setLastScan(new Date(d.scanned_at ?? Date.now()).toLocaleTimeString());
      await loadResults();
      await loadAlerts();
    } finally {
      setScanning(false);
    }
  };

  const handleStar = async (id: string) => {
    const result = results.find(r => r.id === id);
    if (!result) return;
    await fetch(`/api/scanner/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isStarred: !result.isStarred }),
    });
    setResults(prev => prev.map(r => r.id === id ? { ...r, isStarred: !r.isStarred } : r));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/scanner/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setResults(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const handleCreateResearch = (r: ScanResult) => {
    const params = new URLSearchParams({
      ticker: r.symbol,
      dir: r.direction === 'BULLISH' ? 'LONG' : 'SHORT',
      entry: r.entry.toString(),
      stop: r.stop.toString(),
      target: r.target2.toString(),
      source: 'scanner',
      pattern: r.pattern,
    });
    window.location.href = `/dashboard/submit?${params}`;
  };

  const markAlertsRead = async () => {
    await fetch('/api/scanner/alerts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    setUnreadAlerts(0);
  };

  // Filtered results (client-side search)
  const displayed = results.filter(r =>
    !searchTerm || r.symbol.includes(searchTerm.toUpperCase()) || r.pattern.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const bullish  = results.filter(r => r.direction === 'BULLISH').length;
  const bearish  = results.filter(r => r.direction === 'BEARISH').length;
  const exceptional = results.filter(r => r.classification === 'Exceptional').length;
  const veryStrong  = results.filter(r => r.classification === 'Very Strong').length;

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Top Stats Bar ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 20, background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Market Pattern Scanner</div>
          <div style={{ fontSize: 10, color: 'var(--text4)' }}>Institutional-grade technical pattern recognition</div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Stats pills */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'PATTERNS', val: results.length, color: 'var(--accent)' },
            { label: 'BULLISH', val: bullish, color: 'var(--long)' },
            { label: 'BEARISH', val: bearish, color: 'var(--short)' },
            { label: 'EXCEPTIONAL', val: exceptional, color: '#f59e0b' },
            { label: 'VERY STRONG', val: veryStrong, color: '#22c55e' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ textAlign: 'center', padding: '4px 10px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div className="mono" style={{ fontSize: 16, fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: 8, color: 'var(--text4)', letterSpacing: '0.06em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Alert bell */}
        <button onClick={() => setShowAlerts(!showAlerts)} style={{
          position: 'relative', background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: 'var(--text3)',
        }}>
          🔔
          {unreadAlerts > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4, background: 'var(--short)',
              color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: '50%',
              width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{Math.min(99, unreadAlerts)}</span>
          )}
        </button>

        {lastScan && (
          <div style={{ fontSize: 9, color: 'var(--text4)' }}>Last scan: {lastScan}</div>
        )}

        {/* Scan button */}
        <button onClick={() => setShowScanConfig(!showScanConfig)} style={{
          padding: '7px 12px', borderRadius: 6, border: '1px solid var(--border)',
          background: 'var(--bg)', cursor: 'pointer', color: 'var(--text3)', fontSize: 11,
        }}>
          ⚙ Config
        </button>
        <button onClick={runScan} disabled={scanning} style={{
          padding: '7px 16px', borderRadius: 6, border: 'none', cursor: scanning ? 'not-allowed' : 'pointer',
          background: scanning ? 'var(--border)' : 'var(--accent)', color: '#fff',
          fontWeight: 700, fontSize: 12, opacity: scanning ? 0.7 : 1,
        }}>
          {scanning ? '⟳ Scanning…' : '⚡ Scan Markets'}
        </button>
      </div>

      {/* Scan config panel */}
      {showScanConfig && (
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 3 }}>SYMBOLS (comma-separated, empty = all defaults)</div>
            <input value={scanSymbols} onChange={e => setScanSymbols(e.target.value)}
              placeholder="EURUSD,GBPUSD,XAUUSD…"
              style={{ fontSize: 11, padding: '5px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', width: 300 }} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 3 }}>TIMEFRAMES</div>
            <input value={scanTimeframes} onChange={e => setScanTimeframes(e.target.value)}
              style={{ fontSize: 11, padding: '5px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', width: 180 }} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 3 }}>MIN SCORE</div>
            <input type="number" value={fMinScore} onChange={e => setFMinScore(Number(e.target.value))} min={70} max={100}
              style={{ fontSize: 11, padding: '5px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', width: 70 }} />
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ padding: '8px 20px', background: 'rgba(220,38,38,.1)', borderBottom: '1px solid rgba(220,38,38,.2)', color: '#f87171', fontSize: 12 }}>
          ⚠ {error} — ensure MT5 service is running.
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Filter Bar (left) ─────────────────────────────────────────────── */}
        <div style={{
          width: 200, flexShrink: 0, padding: '14px 12px', borderRight: '1px solid var(--border)',
          overflowY: 'auto', background: 'var(--surface)',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>FILTERS</div>

          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search ticker / pattern…"
            style={{ width: '100%', fontSize: 11, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', marginBottom: 14, boxSizing: 'border-box' }} />

          <FilterSection label="DIRECTION">
            {['', 'BULLISH', 'BEARISH', 'NEUTRAL'].map(v => (
              <FilterBtn key={v} label={v || 'All'} active={fDirection === v} onClick={() => setFDirection(v)} />
            ))}
          </FilterSection>

          <FilterSection label="CATEGORY">
            {['', 'CANDLESTICK', 'CHART', 'INDICATOR', 'BREAKOUT'].map(v => (
              <FilterBtn key={v} label={v || 'All'} active={fCategory === v} onClick={() => setFCategory(v)} />
            ))}
          </FilterSection>

          <FilterSection label="TIMEFRAME">
            {['', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'].map(v => (
              <FilterBtn key={v} label={v || 'All'} active={fTimeframe === v} onClick={() => setFTimeframe(v)} />
            ))}
          </FilterSection>

          <FilterSection label="ASSET CLASS">
            {['', 'Forex', 'Indices', 'Commodities', 'Crypto'].map(v => (
              <FilterBtn key={v} label={v || 'All'} active={fAssetClass === v} onClick={() => setFAssetClass(v)} />
            ))}
          </FilterSection>

          <FilterSection label="STATUS">
            {['', 'WATCH', 'TRIGGERED', 'CONFIRMED', 'FAILED'].map(v => (
              <FilterBtn key={v} label={v || 'All'} active={fStatus === v} onClick={() => setFStatus(v)} />
            ))}
          </FilterSection>

          <FilterSection label="SORT BY">
            {[
              { v: 'patternScore', l: 'Pattern Score' },
              { v: 'rrRatio', l: 'R:R Ratio' },
              { v: 'breakoutProb', l: 'Breakout Prob' },
              { v: 'newest', l: 'Newest First' },
            ].map(({ v, l }) => (
              <FilterBtn key={v} label={l} active={fSort === v} onClick={() => setFSort(v)} />
            ))}
          </FilterSection>

          <FilterSection label="WATCHLIST">
            <FilterBtn label="Starred Only" active={fStarred} onClick={() => setFStarred(!fStarred)} />
          </FilterSection>

          <button onClick={loadResults} style={{
            width: '100%', padding: '7px', borderRadius: 4, marginTop: 6,
            border: '1px solid var(--accent)', background: 'rgba(var(--accent-rgb),.08)',
            cursor: 'pointer', color: 'var(--accent)', fontSize: 11, fontWeight: 600,
          }}>Apply Filters</button>
        </div>

        {/* ── Main Grid ─────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '90px 85px 150px 75px 100px 100px 80px 60px 70px 60px 55px 55px',
            padding: '7px 12px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg)', flexShrink: 0, gap: 4,
          }}>
            {['TICKER', 'CLASS', 'PATTERN', 'DIR', 'PRICE', 'BREAKOUT', 'SCORE', 'R:R', 'TF', 'STATUS', 'ATR', 'ACTIONS'].map(h => (
              <div key={h} style={{ fontSize: 8, color: 'var(--text4)', fontWeight: 700, letterSpacing: '0.06em' }}>{h}</div>
            ))}
          </div>

          <div className="scroll-y" style={{ flex: 1 }}>
            {loading && !results.length ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text4)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                LOADING SCANNER RESULTS…
              </div>
            ) : !displayed.length ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>No patterns detected</div>
                <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 16 }}>Click "Scan Markets" to run a fresh pattern scan across all instruments</div>
                <button onClick={runScan} disabled={scanning} style={{
                  padding: '10px 24px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13,
                }}>⚡ Run First Scan</button>
              </div>
            ) : (
              displayed.map(r => <ScanRow key={r.id} r={r} onSelect={() => setSelected(r)} onStar={handleStar} selected={selected?.id === r.id} />)
            )}
          </div>
        </div>

        {/* ── Alert Panel ───────────────────────────────────────────────────── */}
        {showAlerts && (
          <div style={{
            width: 320, flexShrink: 0, borderLeft: '1px solid var(--border)',
            background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Pattern Alerts</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={markAlertsRead} style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>
                <button onClick={() => setShowAlerts(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 16 }}>×</button>
              </div>
            </div>
            <div className="scroll-y" style={{ flex: 1, padding: 8 }}>
              {alerts.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text4)', fontSize: 11 }}>No alerts yet</div>
              ) : alerts.map(a => (
                <div key={a.id} style={{
                  padding: '8px 10px', borderRadius: 6, marginBottom: 6,
                  background: a.isRead ? 'var(--bg)' : 'rgba(99,102,241,.06)',
                  border: `1px solid ${a.isRead ? 'var(--border)' : 'rgba(99,102,241,.2)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 8, color: dirColor(a.result.direction), fontWeight: 700 }}>{a.result.direction}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)' }}>{a.result.symbol}</span>
                    <span style={{ fontSize: 8, color: 'var(--text4)' }}>{a.result.tfLabel}</span>
                    {!a.isRead && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', marginLeft: 'auto' }} />}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.4 }}>{a.message}</div>
                  <div style={{ fontSize: 8, color: 'var(--text4)', marginTop: 3 }}>{new Date(a.createdAt).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 999,
          }} />
          <DetailDrawer
            result={selected}
            onClose={() => setSelected(null)}
            onStar={handleStar}
            onStatusChange={handleStatusChange}
            onCreateResearch={handleCreateResearch}
          />
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 8, color: 'var(--text4)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>{children}</div>
    </div>
  );
}

function FilterBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 9, padding: '3px 7px', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
      border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
      background: active ? 'rgba(var(--accent-rgb),.1)' : 'var(--bg)',
      color: active ? 'var(--accent)' : 'var(--text4)',
    }}>{label}</button>
  );
}

function ScanRow({ r, onSelect, onStar, selected }: { r: ScanResult; onSelect: () => void; onStar: (id: string) => void; selected: boolean }) {
  const digits = r.currentPrice > 100 ? 2 : r.currentPrice > 1 ? 4 : 5;
  const sc = scoreColor(r.patternScore);
  const dc = dirColor(r.direction);

  return (
    <div onClick={onSelect} style={{
      display: 'grid',
      gridTemplateColumns: '90px 85px 150px 75px 100px 100px 80px 60px 70px 60px 55px 55px',
      padding: '8px 12px', gap: 4,
      borderBottom: '1px solid var(--border)',
      cursor: 'pointer', alignItems: 'center',
      background: selected ? 'rgba(99,102,241,.06)' : 'transparent',
      transition: 'background .15s',
    }}
    onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
    onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>

      {/* TICKER */}
      <div>
        <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{r.symbol}</div>
        <div style={{ fontSize: 8, color: 'var(--text4)' }}>{catIcon(r.category)} {r.category}</div>
      </div>

      {/* CLASS */}
      <div style={{ fontSize: 9, color: 'var(--text4)', lineHeight: 1.3 }}>{r.assetClass}</div>

      {/* PATTERN */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{r.pattern}</div>
        {r.holdingPeriod && <div style={{ fontSize: 8, color: 'var(--text4)' }}>{r.holdingPeriod}</div>}
      </div>

      {/* DIR */}
      <div style={{ fontSize: 10, fontWeight: 700, color: dc }}>
        {r.direction === 'BULLISH' ? '▲' : r.direction === 'BEARISH' ? '▼' : '─'} {r.direction.slice(0, 4)}
      </div>

      {/* PRICE */}
      <div className="mono" style={{ fontSize: 11, color: 'var(--text)' }}>{r.currentPrice.toFixed(digits)}</div>

      {/* BREAKOUT */}
      <div className="mono" style={{ fontSize: 11, color: sc }}>{r.breakoutLevel.toFixed(digits)}</div>

      {/* SCORE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className="mono" style={{ fontSize: 13, fontWeight: 800, color: sc }}>{r.patternScore.toFixed(0)}</div>
        <div style={{ fontSize: 7, color: sc, letterSpacing: '0.03em' }}>{r.classification}</div>
      </div>

      {/* R:R */}
      <div className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{r.rrRatio.toFixed(1)}:1</div>

      {/* TF */}
      <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{r.tfLabel}</div>

      {/* STATUS */}
      <div>{statusBadge(r.status)}</div>

      {/* ATR */}
      <div className="mono" style={{ fontSize: 9, color: 'var(--text4)' }}>{r.atr.toFixed(digits)}</div>

      {/* ACTIONS */}
      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
        <button onClick={() => onStar(r.id)} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          color: r.isStarred ? '#f59e0b' : 'var(--text4)', fontSize: 13,
        }} title="Star">
          {r.isStarred ? '★' : '☆'}
        </button>
      </div>
    </div>
  );
}
