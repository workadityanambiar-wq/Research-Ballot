'use client';
import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { useApp } from '@/context/AppContext';
import { DirBadge } from '@/components/ui/Badge';
import { Bar } from '@/components/ui/Bar';
import TickerSearch from '@/components/ui/TickerSearch';
import { WEEK_ID, IDEA_LIMIT_PER_WEEK } from '@/lib/data';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { Mt5Quote, Mt5QuantData } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Catalyst {
  id: string; description: string; date: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW'; probability: number;
}
interface Risk {
  id: string; description: string;
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  mitigation: string;
}
interface DocFile { id: string; name: string; size: number; type: string; dataUrl: string; }
interface RefEntry { id: string; text: string; url: string; }

interface MemoState {
  ticker: string; assetClass: string; dir: string;
  stop: string; target: string; hold: string;
  posSize: string; conv: number; expRet: string; expDD: string;
  executiveSummary: string;
  thesis: string;
  financial: string;
  valuation: string;
  catalysts: Catalyst[];
  risks: Risk[];
  documents: DocFile[];
  references: RefEntry[];
  tradingThesis: string;
  tradingCatalysts: string;
  tradingRisks: string;
}

const EMPTY_MEMO: MemoState = {
  ticker: '', assetClass: 'US Equities', dir: 'LONG',
  stop: '', target: '', hold: '1-3M',
  posSize: '', conv: 7, expRet: '', expDD: '',
  executiveSummary: '', thesis: '', financial: '', valuation: '',
  catalysts: [], risks: [], documents: [], references: [],
  tradingThesis: '', tradingCatalysts: '', tradingRisks: '',
};

// ── Scoring ───────────────────────────────────────────────────────────────────

function wc(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

interface SectionScore { score: number; max: number; words?: number; }

function scoreSection(key: string, memo: MemoState, hasQuote: boolean): SectionScore {
  if (key === 'executiveSummary') { const w = wc(memo.executiveSummary); return { score: w >= 150 ? 10 : w >= 100 ? 7 : w >= 50 ? 4 : 0, max: 10, words: w }; }
  if (key === 'thesis') { const w = wc(memo.thesis); return { score: w >= 500 ? 15 : w >= 300 ? 12 : w >= 150 ? 8 : 0, max: 15, words: w }; }
  if (key === 'financial') { const w = wc(memo.financial); return { score: w >= 300 ? 15 : w >= 150 ? 10 : w >= 50 ? 5 : 0, max: 15, words: w }; }
  if (key === 'valuation') { const w = wc(memo.valuation); return { score: w >= 200 ? 15 : w >= 100 ? 10 : w >= 50 ? 5 : 0, max: 15, words: w }; }
  if (key === 'technical') return { score: hasQuote ? 5 : 0, max: 5 };
  if (key === 'catalysts') { const n = memo.catalysts.length; return { score: n >= 2 ? 15 : n === 1 ? 8 : 0, max: 15 }; }
  if (key === 'risks') { const n = memo.risks.length; return { score: n >= 3 ? 10 : n === 2 ? 6 : n === 1 ? 3 : 0, max: 10 }; }
  if (key === 'documents') return { score: memo.documents.length >= 1 ? 10 : 0, max: 10 };
  if (key === 'references') { const n = memo.references.filter(r => r.text.trim()).length; return { score: n >= 2 ? 5 : n === 1 ? 3 : 0, max: 5 }; }
  return { score: 0, max: 0 };
}

function scoreColor(pct: number): string {
  if (pct >= 0.9) return 'var(--long)';
  if (pct >= 0.7) return 'var(--accent)';
  if (pct >= 0.4) return 'var(--warn)';
  return 'var(--short)';
}

// ── Section definitions ───────────────────────────────────────────────────────

const SECTIONS = [
  { key: 'executiveSummary', label: 'Executive Summary', icon: '◈', max: 10 },
  { key: 'thesis',           label: 'Investment Thesis',  icon: '◆', max: 15 },
  { key: 'financial',        label: 'Financial Analysis', icon: '▦', max: 15 },
  { key: 'valuation',        label: 'Valuation Analysis', icon: '◉', max: 15 },
  { key: 'technical',        label: 'Technical Analysis', icon: '◫', max: 5  },
  { key: 'catalysts',        label: 'Catalysts',          icon: '▲', max: 15 },
  { key: 'risks',            label: 'Risk Analysis',      icon: '▼', max: 10 },
  { key: 'documents',        label: 'Documents',          icon: '▣', max: 10 },
  { key: 'references',       label: 'References',         icon: '◧', max: 5  },
];

const GUIDANCE: Record<string, string> = {
  executiveSummary: 'In 150-250 words, summarize your investment idea. Cover: What is the opportunity? Why now? Your recommendation and expected return. The 2-3 key drivers. The biggest risk. The committee must understand your idea in under two minutes.',
  thesis: 'Describe your complete investment thesis. Cover: Business overview · Competitive advantage · Why the market is mispricing this asset · Structural tailwinds · Upcoming catalysts · Why current valuation is attractive. Support every major statement with evidence.',
  financial: 'Analyze the financials that support your thesis: Revenue growth and drivers · Margin profile vs. history and peers · Free cash flow generation · ROE/ROIC · Balance sheet and debt profile · Valuation multiples · Future earnings expectations. Explain how each financial metric directly supports your thesis.',
  valuation: 'Justify your price target. Include: DCF assumptions (WACC, TGR) · Comparable companies and target multiples · Historical valuation context · Multiple expansion thesis · Intrinsic value calculation · Margin of safety. Show your numbers explicitly.',
};

const AI_ACTIONS = [
  { id: 'draft',   label: 'Generate Draft' },
  { id: 'improve', label: 'Improve Writing' },
  { id: 'concise', label: 'Make Concise' },
  { id: 'expand',  label: 'Expand Analysis' },
  { id: 'tone',    label: 'Professional Tone' },
  { id: 'grammar', label: 'Grammar Check' },
] as const;

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
      borderRadius: 6, marginBottom: 12,
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
            }}>{quote.market_status}</span>
          )}
        </div>
      </div>
      {!quote && !loading && !error && (
        <div style={{ fontSize: 10, color: 'var(--text4)', fontStyle: 'italic' }}>Select a ticker above to capture the live MT5 price</div>
      )}
      {error && !loading && <div style={{ fontSize: 10, color: 'var(--short)' }}>⚠ {error}</div>}
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
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--long)' }}>{quote.mid.toFixed(quote.digits)}</div>
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
            <div><span style={{ fontSize: 8, color: 'var(--text4)' }}>MT5 SERVER TIME  </span><span className="mono" style={{ fontSize: 10, color: 'var(--text2)' }}>{new Date(quote.server_time).toISOString().replace('T', ' ').slice(0, 19)} UTC</span></div>
            <div style={{ width: 1, height: 12, background: 'var(--border)' }} />
            <div><span style={{ fontSize: 8, color: 'var(--text4)' }}>SESSION  </span><span className="mono" style={{ fontSize: 10, color: 'var(--text2)' }}>{quote.market_session}</span></div>
            <div style={{ width: 1, height: 12, background: 'var(--border)' }} />
            <div><span style={{ fontSize: 8, color: 'var(--text4)' }}>EXCHANGE  </span><span className="mono" style={{ fontSize: 10, color: 'var(--text2)' }}>{quote.exchange}</span></div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Quant preview panel ───────────────────────────────────────────────────────

function QuantPreviewPanel({ data, loading }: { data: Mt5QuantData | null; loading: boolean }) {
  if (!loading && !data) return null;
  const qColor = (s: number) => s >= 80 ? 'var(--long)' : s >= 70 ? 'var(--accent)' : s >= 60 ? 'var(--warn)' : 'var(--short)';
  const cColor = (s: number) => s >= 7 ? 'var(--long)' : s >= 5 ? 'var(--accent)' : s >= 3 ? 'var(--warn)' : 'var(--short)';
  return (
    <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
      <div className="sec-title" style={{ marginBottom: 8 }}>MT5 QUANT ANALYSIS</div>
      {loading && <div style={{ fontSize: 9, color: 'var(--text4)', fontStyle: 'italic', padding: '6px 0' }}>Calculating indicators from MT5…</div>}
      {data && (
        <>
          <div style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 5, marginBottom: 10, border: '1px solid rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: qColor(data.quant_score) }}>{data.quant_score.toFixed(1)}</span>
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
                  <span style={{ fontSize: 8, color: 'var(--text3)' }}>{l} <span style={{ fontSize: 7, color: 'var(--text4)' }}>({w})</span></span>
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

// ── Circular progress ─────────────────────────────────────────────────────────

function CircleProgress({ pct, size = 48, stroke = 4 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct / 100, 1);
  const color = scoreColor(pct / 100);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .4s ease' }} />
    </svg>
  );
}

// ── AI assistant toolbar ──────────────────────────────────────────────────────

function AiToolbar({
  section, content, onDraft, onHint,
}: {
  section: string;
  content: string;
  onDraft: (text: string) => void;
  onHint: (hint: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const callAi = async (action: string) => {
    setBusy(action);
    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, section, content }),
      });
      if (!res.ok) return;
      const data = await res.json() as { result: string | null; hint: string | null };
      if (action === 'draft') {
        if (!data.result) return;
        if (content.trim()) {
          if (!window.confirm('This will replace your current content. Continue?')) return;
        }
        onDraft(data.result);
      } else if (data.hint) {
        onHint(data.hint);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
      {AI_ACTIONS.map(a => (
        <button
          key={a.id}
          disabled={busy !== null}
          onClick={() => callAi(a.id)}
          style={{
            fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 3, cursor: busy !== null ? 'not-allowed' : 'pointer',
            background: busy === a.id ? 'var(--accent-dim)' : 'var(--panel2)',
            border: '1px solid var(--border)',
            color: busy === a.id ? 'var(--accent)' : 'var(--text3)',
            fontFamily: 'var(--sans)',
            opacity: busy !== null && busy !== a.id ? 0.5 : 1,
            transition: 'all .12s',
          }}
        >
          {busy === a.id ? '…' : a.label}
        </button>
      ))}
    </div>
  );
}

// ── Memo section card ─────────────────────────────────────────────────────────

function SectionCard({
  sectionKey, label, score, children,
}: {
  sectionKey: string; label: string; score: SectionScore; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const pct = score.max > 0 ? score.score / score.max : 0;
  const color = scoreColor(pct);

  return (
    <div id={`sec-${sectionKey}`} className="panel" style={{ marginBottom: 10, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'var(--text2)' }}>{label.toUpperCase()}</div>
          {score.words !== undefined && (
            <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 2 }}>{score.words} words</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
            background: pct >= 0.9 ? 'rgba(22,163,74,.12)' : pct >= 0.4 ? 'rgba(232,160,0,.1)' : 'rgba(220,38,38,.08)',
            color,
            border: `1px solid ${color}40`,
          }}>{score.score}/{score.max}</span>
          <span style={{ fontSize: 10, color: 'var(--text4)', lineHeight: 1 }}>{open ? '▾' : '▸'}</span>
        </div>
      </div>
      <div style={{ maxHeight: open ? 2000 : 0, overflow: 'hidden', transition: 'max-height .3s ease' }}>
        <div style={{ padding: '0 14px 14px' }}>{children}</div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SubmitPage() {
  const { user, ideas, refreshIdeas } = useApp();
  if (!user) return null;

  const uid = useId();
  const { isMobile, isDesktop } = useBreakpoint();

  const wkCount = ideas.filter(i => i.authorId === user.legacyId && i.weekId === WEEK_ID).length;

  const [memo, setMemo] = useState<MemoState>(EMPTY_MEMO);
  const [quote, setQuote] = useState<Mt5Quote | null>(null);
  const [quoteLoading, setQL] = useState(false);
  const [quoteError, setQE] = useState<string | null>(null);
  const [quantPreview, setQuantPreview] = useState<Mt5QuantData | null>(null);
  const [quantLoading, setQuantLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [aiHints, setAiHints] = useState<Record<string, string>>({});
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [mode, setMode] = useState<'trading' | 'investment'>('trading');

  const dirRef = useRef(memo.dir);
  useEffect(() => { dirRef.current = memo.dir; }, [memo.dir]);

  const saveKey = `apex-memo-${user.legacyId}`;
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist memo to localStorage
  const persist = useCallback((m: MemoState) => {
    setSaveStatus('saving');
    try { localStorage.setItem(saveKey, JSON.stringify(m)); setSaveStatus('saved'); } catch { setSaveStatus('unsaved'); }
  }, [saveKey]);

  // Debounced auto-save on every change
  const setMemoAndSave = useCallback((updater: (prev: MemoState) => MemoState) => {
    setMemo(prev => {
      const next = updater(prev);
      setSaveStatus('unsaved');
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => persist(next), 2000);
      return next;
    });
  }, [persist]);

  // On mount: restore draft + 30s interval save
  useEffect(() => {
    const saved = localStorage.getItem(saveKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as MemoState;
        if (parsed.ticker || parsed.executiveSummary || parsed.thesis) {
          setShowRestorePrompt(true);
        }
      } catch { /* ignore */ }
    }
    intervalRef.current = setInterval(() => {
      setMemo(current => { persist(current); return current; });
    }, 30000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveKey]);

  // AI hint auto-dismiss
  useEffect(() => {
    const keys = Object.keys(aiHints);
    if (keys.length === 0) return;
    const t = setTimeout(() => setAiHints({}), 6000);
    return () => clearTimeout(t);
  }, [aiHints]);

  const sm = <K extends keyof MemoState>(k: K, v: MemoState[K]) =>
    setMemoAndSave(p => ({ ...p, [k]: v }));

  // ── MT5 ───────────────────────────────────────────────────────────────────

  const fetchQuote = useCallback(async (ticker: string) => {
    if (!ticker) { setQuote(null); setQE(null); return; }
    setQL(true); setQE(null); setQuote(null);
    try {
      const res = await fetch(`/api/mt5/quote?symbol=${encodeURIComponent(ticker)}`, { cache: 'no-store' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setQE(err.error ?? 'MT5 service unavailable — cannot submit without a live price'); return;
      }
      const data: Mt5Quote = await res.json();
      setQuote(data);
      const isLong = dirRef.current === 'LONG';
      const sl = (data.mid * (isLong ? 0.98 : 1.02)).toFixed(data.digits);
      const tp = (data.mid * (isLong ? 1.04 : 0.96)).toFixed(data.digits);
      setMemoAndSave(p => (!p.stop && !p.target ? { ...p, stop: sl, target: tp } : p));
    } catch {
      setQE('MT5 service unavailable — cannot submit without a live price');
    } finally { setQL(false); }
  }, [setMemoAndSave]);

  const fetchQuantPreview = useCallback(async (ticker: string, dir: string) => {
    if (!ticker) return;
    setQuantLoading(true); setQuantPreview(null);
    try {
      const res = await fetch(`/api/mt5/quant?symbol=${encodeURIComponent(ticker)}&dir=${dir}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (res.ok) setQuantPreview(await res.json() as Mt5QuantData);
    } catch { /* non-blocking */ }
    finally { setQuantLoading(false); }
  }, []);

  const handleTickerSelect = (ticker: string) => {
    setMemoAndSave(p => ({ ...p, ticker, stop: '', target: '' }));
    setQuantPreview(null);
    fetchQuote(ticker);
    fetchQuantPreview(ticker, dirRef.current);
  };

  const handleDirChange = (newDir: string) => {
    const isLong = newDir === 'LONG';
    setMemoAndSave(p => {
      if (!quote) return { ...p, dir: newDir };
      const sl = (quote.mid * (isLong ? 0.98 : 1.02)).toFixed(quote.digits);
      const tp = (quote.mid * (isLong ? 1.04 : 0.96)).toFixed(quote.digits);
      return { ...p, dir: newDir, stop: sl, target: tp };
    });
    if (memo.ticker) fetchQuantPreview(memo.ticker, newDir);
  };

  // Quote refresh every 15s
  useEffect(() => {
    if (!memo.ticker || !quote) return;
    const id = setInterval(() => fetchQuote(memo.ticker), 15000);
    return () => clearInterval(id);
  }, [memo.ticker, quote, fetchQuote]);

  // ── Derived values ────────────────────────────────────────────────────────

  const entry = quote?.mid ?? 0;
  const rr = entry && memo.stop && memo.target
    ? ((parseFloat(memo.target) - entry) / (entry - parseFloat(memo.stop))).toFixed(2)
    : '-';

  const sectionScores = SECTIONS.map(s => ({ ...s, ...scoreSection(s.key, memo, !!quote) }));
  const totalScore = sectionScores.reduce((acc, s) => acc + s.score, 0);
  const totalMax = sectionScores.reduce((acc, s) => acc + s.max, 0);
  const readinessPct = Math.round((totalScore / totalMax) * 100);

  // Submission gates
  const execWords = wc(memo.executiveSummary);
  const thesisWords = wc(memo.thesis);
  const gates = [
    { label: 'Score ≥ 90/100',        pass: totalScore >= 90 },
    { label: 'Executive Summary ≥ 150 words', pass: execWords >= 150 },
    { label: 'Investment Thesis ≥ 300 words', pass: thesisWords >= 300 },
    { label: 'Risks ≥ 3 entries',      pass: memo.risks.length >= 3 },
    { label: 'Catalysts ≥ 2 entries',  pass: memo.catalysts.length >= 2 },
    { label: 'Live MT5 price captured', pass: !!quote },
  ];
  const allGatesPass = gates.every(g => g.pass);

  const tradingGates = [
    { label: 'Live MT5 price captured', pass: !!quote },
    { label: 'Stop loss set',           pass: !!memo.stop },
    { label: 'Target set',              pass: !!memo.target },
    { label: 'Thesis written',          pass: wc(memo.tradingThesis) >= 20 },
  ];
  const tradingGatesPass = tradingGates.every(g => g.pass);

  const submitTrading = async () => {
    if (!tradingGatesPass) return;
    if (wkCount >= IDEA_LIMIT_PER_WEEK) { alert('Weekly limit reached.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: memo.ticker, assetClass: memo.assetClass, dir: memo.dir,
          stop: memo.stop, target: memo.target, hold: memo.hold,
          posSize: memo.posSize, conv: memo.conv, expRet: memo.expRet, expDD: memo.expDD,
          thesis: memo.tradingThesis,
          catalysts: memo.tradingCatalysts.split('\n').map((s: string) => s.trim()).filter(Boolean),
          risks: memo.tradingRisks.split('\n').map((s: string) => s.trim()).filter(Boolean),
          imageUrl: memo.documents[0]?.dataUrl ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        alert(err.error ?? 'Submission failed.'); return;
      }
      localStorage.removeItem(saveKey);
      await refreshIdeas();
      setDone(true);
    } finally { setSubmitting(false); }
  };

  // ── Catalysts helpers ─────────────────────────────────────────────────────

  const addCatalyst = () => {
    const c: Catalyst = { id: `c${Date.now()}`, description: '', date: '', impact: 'MEDIUM', probability: 60 };
    sm('catalysts', [...memo.catalysts, c]);
  };
  const updateCatalyst = (id: string, field: keyof Catalyst, val: string | number) => {
    sm('catalysts', memo.catalysts.map(c => c.id === id ? { ...c, [field]: val } : c));
  };
  const removeCatalyst = (id: string) => sm('catalysts', memo.catalysts.filter(c => c.id !== id));

  // ── Risks helpers ─────────────────────────────────────────────────────────

  const addRisk = () => {
    const r: Risk = { id: `r${Date.now()}`, description: '', probability: 'MEDIUM', impact: 'MEDIUM', mitigation: '' };
    sm('risks', [...memo.risks, r]);
  };
  const updateRisk = (id: string, field: keyof Risk, val: string) => {
    sm('risks', memo.risks.map(r => r.id === id ? { ...r, [field]: val } : r));
  };
  const removeRisk = (id: string) => sm('risks', memo.risks.filter(r => r.id !== id));

  // ── Documents helpers ─────────────────────────────────────────────────────

  const [imgDrag, setImgDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      const doc: DocFile = { id: `d${Date.now()}`, name: file.name, size: file.size, type: file.type, dataUrl };
      sm('documents', [...memo.documents, doc]);
    };
    reader.readAsDataURL(file);
  };

  // ── References helpers ────────────────────────────────────────────────────

  const addRef = () => sm('references', [...memo.references, { id: `ref${Date.now()}`, text: '', url: '' }]);
  const updateRef = (id: string, field: 'text' | 'url', val: string) => {
    sm('references', memo.references.map(r => r.id === id ? { ...r, [field]: val } : r));
  };
  const removeRef = (id: string) => sm('references', memo.references.filter(r => r.id !== id));

  // ── Submit ────────────────────────────────────────────────────────────────

  const submit = async () => {
    if (!allGatesPass) return;
    if (wkCount >= IDEA_LIMIT_PER_WEEK) { alert('Weekly limit reached.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: memo.ticker, assetClass: memo.assetClass, dir: memo.dir,
          stop: memo.stop, target: memo.target, hold: memo.hold,
          posSize: memo.posSize, conv: memo.conv, expRet: memo.expRet, expDD: memo.expDD,
          thesis: JSON.stringify({
            executiveSummary: memo.executiveSummary,
            thesis: memo.thesis,
            financial: memo.financial,
            valuation: memo.valuation,
            references: memo.references.filter(r => r.text.trim()),
          }),
          catalysts: memo.catalysts.map(c => `${c.description} [${c.date}, ${c.impact}, ${c.probability}% probability]`),
          risks: memo.risks.map(r => `${r.description} [Probability: ${r.probability}, Impact: ${r.impact}] Mitigation: ${r.mitigation}`),
          imageUrl: memo.documents[0]?.dataUrl ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        alert(err.error ?? 'Submission failed.');
        return;
      }
      localStorage.removeItem(saveKey);
      await refreshIdeas();
      setDone(true);
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  // ── AI helpers ────────────────────────────────────────────────────────────

  const setHint = (section: string, hint: string) => setAiHints(p => ({ ...p, [section]: hint }));

  // ── Save status label ─────────────────────────────────────────────────────

  const saveLabel = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved just now' : 'Unsaved changes';
  const saveDot = saveStatus === 'saved' ? 'var(--long)' : saveStatus === 'saving' ? 'var(--warn)' : 'var(--short)';

  // ── Done / limit states ───────────────────────────────────────────────────

  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="panel slide-up" style={{ padding: 32, maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Research Submitted</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>
          MT5 market snapshot permanently recorded.<br />Your identity has been anonymized.
        </div>
        <button className="btn btn-ghost" onClick={() => {
          setDone(false); setQuote(null); setMemo(EMPTY_MEMO); setSaveStatus('saved');
        }}>
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="dash-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Restore draft prompt */}
      {showRestorePrompt && (
        <div style={{ background: 'var(--accent-dim)', borderBottom: '1px solid rgba(37,99,235,.2)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>Draft found in local storage</span>
          <button className="btn btn-ghost" style={{ fontSize: 9, padding: '3px 10px' }} onClick={() => {
            const saved = localStorage.getItem(saveKey);
            if (saved) { try { setMemo(JSON.parse(saved) as MemoState); setRestoredDraft(true); } catch { /* ignore */ } }
            setShowRestorePrompt(false);
          }}>RESTORE DRAFT</button>
          <button className="btn btn-ghost" style={{ fontSize: 9, padding: '3px 10px' }} onClick={() => setShowRestorePrompt(false)}>DISCARD</button>
          {restoredDraft && <span style={{ fontSize: 9, color: 'var(--long)' }}>Draft restored</span>}
        </div>
      )}

      {/* Sticky header */}
      <div style={{
        background: 'var(--panel)', borderBottom: '1px solid var(--border)',
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="14" viewBox="0 0 28 24" fill="none">
            <rect x="1" y="1" width="15" height="15" stroke="#E8A000" strokeWidth="2"/>
            <rect x="10" y="7" width="15" height="15" stroke="#E8A000" strokeWidth="2" fill="var(--panel)"/>
          </svg>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', color: 'var(--text3)' }}>CENTURY FINANCIAL</span>
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        {memo.ticker ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{memo.ticker}</span>
            <DirBadge dir={memo.dir as 'LONG' | 'SHORT'} />
          </div>
        ) : (
          <span style={{ fontSize: 10, color: 'var(--text4)' }}>No ticker selected</span>
        )}
        <div style={{ flex: 1 }} />
        {mode === 'investment' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircleProgress pct={readinessPct} size={36} stroke={3} />
                <span className="mono" style={{ position: 'absolute', fontSize: 8, fontWeight: 700, color: scoreColor(readinessPct / 100) }}>{readinessPct}%</span>
              </div>
              <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>READINESS</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
          </>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: saveDot, display: 'inline-block' }} />
          <span style={{ fontSize: 9, color: 'var(--text4)' }}>{saveLabel}</span>
        </div>
      </div>

      {/* Mode tab bar */}
      <div style={{ display: 'flex', background: 'var(--panel)', borderBottom: '1px solid var(--border)', padding: '0 16px', flexShrink: 0 }}>
        {(['trading', 'investment'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '8px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
            background: 'none', border: 'none', borderBottom: mode === m ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer', color: mode === m ? 'var(--accent)' : 'var(--text4)',
            transition: 'color .15s', marginBottom: -1, fontFamily: 'var(--sans)',
          }}>
            {m === 'trading' ? '◈ Trading Idea' : '◆ Investment Idea'}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '220px 1fr 296px' : '1fr', gap: 14, maxWidth: 1400, margin: '0 auto' }}>

          {/* Left nav (desktop only) */}
          {isDesktop && (
            <div style={{ position: 'sticky', top: 0, alignSelf: 'start' }}>
              <div className="panel" style={{ padding: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ position: 'relative', marginBottom: 8 }}>
                    <CircleProgress pct={readinessPct} size={64} stroke={5} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: scoreColor(readinessPct / 100) }}>{readinessPct}%</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.08em', color: 'var(--text4)' }}>RESEARCH READINESS</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{totalScore}/{totalMax} pts</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 14 }}>
                  {sectionScores.map(s => {
                    const spct = s.max > 0 ? s.score / s.max : 0;
                    return (
                      <button
                        key={s.key}
                        onClick={() => document.getElementById(`sec-${s.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4,
                          background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                          transition: 'background .12s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--panel2)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: 10, width: 14, textAlign: 'center', color: scoreColor(spct) }}>{s.icon}</span>
                        <span style={{ flex: 1, fontSize: 9, color: 'var(--text3)', fontWeight: 500 }}>{s.label}</span>
                        <span style={{ fontSize: 8, fontWeight: 700, color: scoreColor(spct) }}>{s.score}/{s.max}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '10px 12px', fontSize: 11, opacity: (mode === 'trading' ? tradingGatesPass : allGatesPass) && !submitting ? 1 : 0.4 }}
                  onClick={() => (mode === 'trading' ? tradingGatesPass : allGatesPass) && setShowConfirm(true)}
                  disabled={!(mode === 'trading' ? tradingGatesPass : allGatesPass) || submitting}
                >
                  {submitting ? 'SUBMITTING…' : mode === 'trading' ? 'SUBMIT IDEA →' : 'SUBMIT MEMO →'}
                </button>
              </div>
            </div>
          )}

          {/* Center: all memo sections */}
          <div>

            {/* Instrument section */}
            <div className="panel" style={{ padding: 14, marginBottom: 10 }}>
              <div className="sec-title" style={{ marginBottom: 12 }}>INSTRUMENT</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div style={isMobile ? { gridColumn: '1 / -1' } : {}}>
                  <div className="form-label">TICKER *</div>
                  <TickerSearch value={memo.ticker} onSelect={handleTickerSelect} placeholder="Search ticker…" />
                </div>
                <div>
                  <div className="form-label">ASSET CLASS</div>
                  <select className="inp" value={memo.assetClass} onChange={e => sm('assetClass', e.target.value)}>
                    {['US Equities', 'Intl Equities', 'Fixed Income', 'Commodities', 'FX', 'Derivatives'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <div className="form-label">DIRECTION</div>
                  <select className="inp" value={memo.dir} onChange={e => handleDirChange(e.target.value)}>
                    <option value="LONG">LONG</option>
                    <option value="SHORT">SHORT</option>
                  </select>
                </div>
                <div>
                  <div className="form-label">HOLD PERIOD</div>
                  <select className="inp" value={memo.hold} onChange={e => sm('hold', e.target.value)}>
                    {['<1M', '1-3M', '2-4M', '3-6M', '4-8M', '6-12M'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <Mt5PricePanel quote={quote} loading={quoteLoading} error={quoteError} />

              {/* Trade parameters */}
              <div style={{ marginTop: 4 }}>
                <div className="sec-title" style={{ marginBottom: 10, fontSize: 9 }}>TRADE PARAMETERS</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
                  <div>
                    <div className="form-label">ENTRY PRICE (MT5)</div>
                    <div className="inp mono" style={{ color: quote ? 'var(--long)' : 'var(--text4)', fontWeight: quote ? 700 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {quote ? quote.mid.toFixed(quote.digits) : '— awaiting MT5 —'}
                      {quote && <span style={{ fontSize: 8, color: 'var(--long)', marginLeft: 2 }}>●</span>}
                    </div>
                    <div style={{ fontSize: 8, color: 'var(--text4)', marginTop: 2 }}>Auto from MT5</div>
                  </div>
                  {([['STOP LOSS *', 'stop', '810.00'], ['TARGET *', 'target', '1050.00'], ['POS. SIZE %', 'posSize', '2.5']] as [string, keyof MemoState, string][]).map(([l, k, ph]) => (
                    <div key={String(k)}>
                      <div className="form-label">{l}</div>
                      <input className="inp mono" type="number" placeholder={ph}
                        value={memo[k] as string}
                        onChange={e => sm(k, e.target.value)} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <div className="form-label">CONVICTION</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input className="inp mono" type="number" min="1" max="10" value={memo.conv}
                        onChange={e => sm('conv', Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                        style={{ width: 56 }} />
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>/10</span>
                    </div>
                  </div>
                  <div>
                    <div className="form-label">EXP. RETURN %</div>
                    <input className="inp mono" type="number" placeholder="20.5" value={memo.expRet} onChange={e => sm('expRet', e.target.value)} />
                  </div>
                  <div>
                    <div className="form-label">RISK / REWARD</div>
                    <div className="inp mono" style={{ color: parseFloat(rr) >= 2 ? 'var(--long)' : parseFloat(rr) >= 1 ? 'var(--warn)' : 'var(--short)', fontWeight: 600 }}>{rr}</div>
                  </div>
                </div>
              </div>
            </div>

            {mode === 'trading' ? (
              <>
                {/* Brief Investment Thesis */}
                <div className="panel" style={{ padding: 14, marginBottom: 10 }}>
                  <div className="sec-title" style={{ marginBottom: 8 }}>INVESTMENT THESIS</div>
                  <div style={{ padding: '6px 10px', background: 'rgba(37,99,235,.06)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 4, marginBottom: 8, fontSize: 9, color: 'var(--accent)', lineHeight: 1.6 }}>
                    Why this trade? What is the market mispricing? What is the catalyst and your edge?
                  </div>
                  <textarea className="inp" style={{ minHeight: 100, resize: 'vertical', fontFamily: 'var(--sans)', fontSize: 11, lineHeight: 1.7 }}
                    placeholder="Brief thesis: market mispricing, upcoming catalyst, technical setup…"
                    value={memo.tradingThesis}
                    onChange={e => sm('tradingThesis', e.target.value)} />
                  <div style={{ fontSize: 8, color: 'var(--text4)', marginTop: 4 }}>{wc(memo.tradingThesis)} words · min 20</div>
                </div>

                {/* Catalysts */}
                <div className="panel" style={{ padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                    <div className="sec-title" style={{ margin: 0 }}>CATALYSTS</div>
                    <span style={{ fontSize: 9, color: 'var(--text4)' }}>one per line</span>
                  </div>
                  <textarea className="inp" style={{ minHeight: 80, resize: 'vertical', fontFamily: 'var(--sans)', fontSize: 11, lineHeight: 1.7 }}
                    placeholder={'Earnings beat expected\nFDA approval Q3\nShare buyback announcement'}
                    value={memo.tradingCatalysts}
                    onChange={e => sm('tradingCatalysts', e.target.value)} />
                </div>

                {/* Risks */}
                <div className="panel" style={{ padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                    <div className="sec-title" style={{ margin: 0 }}>KEY RISKS</div>
                    <span style={{ fontSize: 9, color: 'var(--text4)' }}>one per line</span>
                  </div>
                  <textarea className="inp" style={{ minHeight: 80, resize: 'vertical', fontFamily: 'var(--sans)', fontSize: 11, lineHeight: 1.7 }}
                    placeholder={'Sector rotation\nMacro headwinds\nEarnings miss'}
                    value={memo.tradingRisks}
                    onChange={e => sm('tradingRisks', e.target.value)} />
                </div>

                {/* Chart / image (optional) */}
                <div className="panel" style={{ padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                    <div className="sec-title" style={{ margin: 0 }}>CHART / IMAGE</div>
                    <span style={{ fontSize: 9, color: 'var(--text4)' }}>optional</span>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const fl = e.target.files?.[0]; if (fl) { loadFile(fl); e.target.value = ''; } }} />
                  {memo.documents.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: 8, marginBottom: 10 }}>
                      {memo.documents.map(doc => (
                        <div key={doc.id} style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <img src={doc.dataUrl} alt={doc.name} style={{ width: '100%', height: 80, objectFit: 'cover' }} />
                          <button onClick={() => sm('documents', memo.documents.filter(d => d.id !== doc.id))}
                            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: 3, color: '#fff', fontSize: 10, width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--sans)' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setImgDrag(true); }}
                    onDragLeave={() => setImgDrag(false)}
                    onDrop={e => { e.preventDefault(); setImgDrag(false); const fl = e.dataTransfer.files[0]; if (fl) loadFile(fl); }}
                    style={{ border: `1.5px dashed ${imgDrag ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 6, padding: '16px', textAlign: 'center', cursor: 'pointer', background: imgDrag ? 'var(--accent-dim)' : 'var(--bg)', transition: 'all .15s' }}>
                    <div style={{ fontSize: 14, marginBottom: 4 }}>📎</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>Drop chart or click to upload</div>
                    <div style={{ fontSize: 8, color: 'var(--text4)', marginTop: 3 }}>PNG, JPG, GIF</div>
                  </div>
                </div>

                {/* Mobile: quant + gates + submit */}
                {isMobile && (
                  <>
                    <div style={{ marginBottom: 10 }}><QuantPreviewPanel data={quantPreview} loading={quantLoading} /></div>
                    <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
                      <div className="sec-title" style={{ marginBottom: 10 }}>READINESS GATES</div>
                      {tradingGates.map(g => (
                        <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: g.pass ? 'var(--long)' : 'var(--short)' }}>{g.pass ? '✓' : '✗'}</span>
                          <span style={{ fontSize: 9, color: g.pass ? 'var(--text3)' : 'var(--text4)' }}>{g.label}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 12, marginBottom: 24, opacity: tradingGatesPass && !submitting ? 1 : 0.4 }}
                      onClick={() => tradingGatesPass && setShowConfirm(true)}
                      disabled={!tradingGatesPass || submitting}
                    >
                      {submitting ? 'SUBMITTING…' : 'SUBMIT TRADING IDEA →'}
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
            {/* ── Section 1: Executive Summary ── */}
            <SectionCard sectionKey="executiveSummary" label="Executive Summary" score={sectionScores[0]}>
              <div style={{ padding: '8px 10px', background: 'rgba(37,99,235,.06)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 4, marginBottom: 10, fontSize: 9, color: 'var(--accent)', lineHeight: 1.6 }}>
                {GUIDANCE.executiveSummary}
              </div>
              <AiToolbar section="executiveSummary" content={memo.executiveSummary}
                onDraft={t => sm('executiveSummary', t)} onHint={h => setHint('executiveSummary', h)} />
              {aiHints.executiveSummary && (
                <div style={{ padding: '6px 10px', background: 'rgba(232,160,0,.08)', border: '1px solid rgba(232,160,0,.25)', borderRadius: 4, marginBottom: 8, fontSize: 9, color: 'var(--warn)', lineHeight: 1.6 }}>
                  {aiHints.executiveSummary}
                </div>
              )}
              <textarea className="inp" style={{ minHeight: 120, resize: 'vertical', fontFamily: 'var(--sans)', fontSize: 11, lineHeight: 1.7 }}
                placeholder="Summarize your investment idea in 150-250 words…"
                value={memo.executiveSummary}
                onChange={e => sm('executiveSummary', e.target.value)} />
              <div style={{ fontSize: 8, color: 'var(--text4)', marginTop: 4 }}>{wc(memo.executiveSummary)} words · Target: 150-250</div>
            </SectionCard>

            {/* ── Section 2: Investment Thesis ── */}
            <SectionCard sectionKey="thesis" label="Investment Thesis" score={sectionScores[1]}>
              <div style={{ padding: '8px 10px', background: 'rgba(37,99,235,.06)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 4, marginBottom: 10, fontSize: 9, color: 'var(--accent)', lineHeight: 1.6 }}>
                {GUIDANCE.thesis}
              </div>
              <AiToolbar section="thesis" content={memo.thesis}
                onDraft={t => sm('thesis', t)} onHint={h => setHint('thesis', h)} />
              {aiHints.thesis && (
                <div style={{ padding: '6px 10px', background: 'rgba(232,160,0,.08)', border: '1px solid rgba(232,160,0,.25)', borderRadius: 4, marginBottom: 8, fontSize: 9, color: 'var(--warn)', lineHeight: 1.6 }}>
                  {aiHints.thesis}
                </div>
              )}
              <textarea className="inp" style={{ minHeight: 200, resize: 'vertical', fontFamily: 'var(--sans)', fontSize: 11, lineHeight: 1.7 }}
                placeholder="Describe your full investment thesis…"
                value={memo.thesis}
                onChange={e => sm('thesis', e.target.value)} />
              <div style={{ fontSize: 8, color: 'var(--text4)', marginTop: 4 }}>{wc(memo.thesis)} words · Target: 300-800</div>
            </SectionCard>

            {/* ── Section 3: Financial Analysis ── */}
            <SectionCard sectionKey="financial" label="Financial Analysis" score={sectionScores[2]}>
              <div style={{ padding: '8px 10px', background: 'rgba(37,99,235,.06)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 4, marginBottom: 10, fontSize: 9, color: 'var(--accent)', lineHeight: 1.6 }}>
                {GUIDANCE.financial}
              </div>
              <AiToolbar section="financial" content={memo.financial}
                onDraft={t => sm('financial', t)} onHint={h => setHint('financial', h)} />
              {aiHints.financial && (
                <div style={{ padding: '6px 10px', background: 'rgba(232,160,0,.08)', border: '1px solid rgba(232,160,0,.25)', borderRadius: 4, marginBottom: 8, fontSize: 9, color: 'var(--warn)', lineHeight: 1.6 }}>
                  {aiHints.financial}
                </div>
              )}
              <textarea className="inp" style={{ minHeight: 140, resize: 'vertical', fontFamily: 'var(--sans)', fontSize: 11, lineHeight: 1.7 }}
                placeholder="Analyze the financial metrics supporting your thesis…"
                value={memo.financial}
                onChange={e => sm('financial', e.target.value)} />
              <div style={{ fontSize: 8, color: 'var(--text4)', marginTop: 4 }}>{wc(memo.financial)} words · Target: 150-400</div>
            </SectionCard>

            {/* ── Section 4: Valuation Analysis ── */}
            <SectionCard sectionKey="valuation" label="Valuation Analysis" score={sectionScores[3]}>
              <div style={{ padding: '8px 10px', background: 'rgba(37,99,235,.06)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 4, marginBottom: 10, fontSize: 9, color: 'var(--accent)', lineHeight: 1.6 }}>
                {GUIDANCE.valuation}
              </div>
              <AiToolbar section="valuation" content={memo.valuation}
                onDraft={t => sm('valuation', t)} onHint={h => setHint('valuation', h)} />
              {aiHints.valuation && (
                <div style={{ padding: '6px 10px', background: 'rgba(232,160,0,.08)', border: '1px solid rgba(232,160,0,.25)', borderRadius: 4, marginBottom: 8, fontSize: 9, color: 'var(--warn)', lineHeight: 1.6 }}>
                  {aiHints.valuation}
                </div>
              )}
              <textarea className="inp" style={{ minHeight: 130, resize: 'vertical', fontFamily: 'var(--sans)', fontSize: 11, lineHeight: 1.7 }}
                placeholder="Justify your price target with DCF and comparable analysis…"
                value={memo.valuation}
                onChange={e => sm('valuation', e.target.value)} />
              <div style={{ fontSize: 8, color: 'var(--text4)', marginTop: 4 }}>{wc(memo.valuation)} words · Target: 100-350</div>
            </SectionCard>

            {/* ── Section 5: Technical Analysis (read-only + notes) ── */}
            <SectionCard sectionKey="technical" label="Technical Analysis" score={sectionScores[4]}>
              {!quote && !quantPreview && !quantLoading && (
                <div style={{ fontSize: 10, color: 'var(--text4)', fontStyle: 'italic', padding: '8px 0' }}>
                  Select a ticker to auto-populate MT5 quant data.
                </div>
              )}
              {(quote || quantPreview || quantLoading) && (
                <div style={{ marginBottom: 12 }}>
                  <QuantPreviewPanel data={quantPreview} loading={quantLoading} />
                  {quote && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      <div style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 8, color: 'var(--text4)', marginBottom: 4 }}>ENTRY / TARGET / STOP</div>
                        <div className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
                          {quote.mid.toFixed(quote.digits)} / {memo.target || '—'} / {memo.stop || '—'}
                        </div>
                      </div>
                      <div style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 8, color: 'var(--text4)', marginBottom: 4 }}>RISK / REWARD</div>
                        <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: parseFloat(rr) >= 2 ? 'var(--long)' : 'var(--text)' }}>{rr}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="form-label" style={{ marginBottom: 4 }}>ANALYST TECHNICAL NOTES</div>
              <textarea className="inp" style={{ minHeight: 80, resize: 'vertical', fontFamily: 'var(--sans)', fontSize: 11, lineHeight: 1.7 }}
                placeholder="Add your technical observations, chart patterns, key levels…"
                value={memo.expDD}
                onChange={e => sm('expDD', e.target.value)} />
              {!quote && (
                <div style={{ marginTop: 6, fontSize: 9, color: 'var(--warn)' }}>
                  Technical score requires a live MT5 price to be captured.
                </div>
              )}
            </SectionCard>

            {/* ── Section 6: Catalysts ── */}
            <SectionCard sectionKey="catalysts" label="Catalysts" score={sectionScores[5]}>
              <div className="tbl-wrap">
                {memo.catalysts.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Description', 'Date', 'Impact', 'Probability %', ''].map(h => (
                          <th key={h} style={{ fontSize: 8, color: 'var(--text4)', fontWeight: 600, padding: '4px 6px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {memo.catalysts.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 6px' }}>
                            <input className="inp" style={{ fontSize: 10, padding: '3px 6px' }} placeholder="Catalyst description…"
                              value={c.description} onChange={e => updateCatalyst(c.id, 'description', e.target.value)} />
                          </td>
                          <td style={{ padding: '6px 6px', minWidth: 110 }}>
                            <input className="inp mono" type="date" style={{ fontSize: 9, padding: '3px 6px' }}
                              value={c.date} onChange={e => updateCatalyst(c.id, 'date', e.target.value)} />
                          </td>
                          <td style={{ padding: '6px 6px' }}>
                            <select className="inp" style={{ fontSize: 9, padding: '3px 6px' }}
                              value={c.impact} onChange={e => updateCatalyst(c.id, 'impact', e.target.value)}>
                              <option>HIGH</option><option>MEDIUM</option><option>LOW</option>
                            </select>
                          </td>
                          <td style={{ padding: '6px 6px', minWidth: 80 }}>
                            <input className="inp mono" type="number" min="1" max="100" style={{ fontSize: 9, padding: '3px 6px' }}
                              value={c.probability} onChange={e => updateCatalyst(c.id, 'probability', parseInt(e.target.value) || 0)} />
                          </td>
                          <td style={{ padding: '6px 4px' }}>
                            <button onClick={() => removeCatalyst(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--short)', fontSize: 12, padding: '0 4px', fontFamily: 'var(--sans)' }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 9, padding: '5px 12px' }} onClick={addCatalyst}>
                + ADD CATALYST
              </button>
              {memo.catalysts.length < 2 && (
                <div style={{ fontSize: 9, color: 'var(--warn)', marginTop: 6 }}>Add at least 2 catalysts for full score</div>
              )}
            </SectionCard>

            {/* ── Section 7: Risk Analysis ── */}
            <SectionCard sectionKey="risks" label="Risk Analysis" score={sectionScores[6]}>
              <div className="tbl-wrap">
                {memo.risks.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Description', 'Probability', 'Impact', 'Mitigation', ''].map(h => (
                          <th key={h} style={{ fontSize: 8, color: 'var(--text4)', fontWeight: 600, padding: '4px 6px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {memo.risks.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 6px' }}>
                            <input className="inp" style={{ fontSize: 10, padding: '3px 6px' }} placeholder="Risk description…"
                              value={r.description} onChange={e => updateRisk(r.id, 'description', e.target.value)} />
                          </td>
                          <td style={{ padding: '6px 6px' }}>
                            <select className="inp" style={{ fontSize: 9, padding: '3px 6px' }}
                              value={r.probability} onChange={e => updateRisk(r.id, 'probability', e.target.value)}>
                              <option>HIGH</option><option>MEDIUM</option><option>LOW</option>
                            </select>
                          </td>
                          <td style={{ padding: '6px 6px' }}>
                            <select className="inp" style={{ fontSize: 9, padding: '3px 6px' }}
                              value={r.impact} onChange={e => updateRisk(r.id, 'impact', e.target.value)}>
                              <option>HIGH</option><option>MEDIUM</option><option>LOW</option>
                            </select>
                          </td>
                          <td style={{ padding: '6px 6px' }}>
                            <input className="inp" style={{ fontSize: 10, padding: '3px 6px' }} placeholder="Mitigation strategy…"
                              value={r.mitigation} onChange={e => updateRisk(r.id, 'mitigation', e.target.value)} />
                          </td>
                          <td style={{ padding: '6px 4px' }}>
                            <button onClick={() => removeRisk(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--short)', fontSize: 12, padding: '0 4px', fontFamily: 'var(--sans)' }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 9, padding: '5px 12px' }} onClick={addRisk}>
                + ADD RISK
              </button>
              {memo.risks.length < 3 && (
                <div style={{ fontSize: 9, color: 'var(--warn)', marginTop: 6 }}>Add at least 3 risks for full score</div>
              )}
            </SectionCard>

            {/* ── Section 8: Supporting Documents ── */}
            <SectionCard sectionKey="documents" label="Supporting Documents" score={sectionScores[7]}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const fl = e.target.files?.[0]; if (fl) { loadFile(fl); e.target.value = ''; } }} />
              {memo.documents.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
                  {memo.documents.map(doc => (
                    <div key={doc.id} style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <img src={doc.dataUrl} alt={doc.name} style={{ width: '100%', height: 80, objectFit: 'cover' }} />
                      <div style={{ padding: '4px 6px', background: 'var(--panel2)' }}>
                        <div style={{ fontSize: 8, color: 'var(--text3)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                        <div style={{ fontSize: 7, color: 'var(--text4)' }}>{(doc.size / 1024).toFixed(0)} KB</div>
                      </div>
                      <button
                        onClick={() => sm('documents', memo.documents.filter(d => d.id !== doc.id))}
                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: 3, color: '#fff', fontSize: 10, width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--sans)' }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setImgDrag(true); }}
                onDragLeave={() => setImgDrag(false)}
                onDrop={e => { e.preventDefault(); setImgDrag(false); const fl = e.dataTransfer.files[0]; if (fl) loadFile(fl); }}
                style={{
                  border: `1.5px dashed ${imgDrag ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 6, padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
                  background: imgDrag ? 'var(--accent-dim)' : 'var(--bg)', transition: 'all .15s',
                }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>📎</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>Drop files or click to upload</div>
                <div style={{ fontSize: 8, color: 'var(--text4)', marginTop: 3 }}>PNG, JPG, GIF — max 5 MB</div>
              </div>
            </SectionCard>

            {/* ── Section 9: References ── */}
            <SectionCard sectionKey="references" label="References" score={sectionScores[8]}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {memo.references.map(r => (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: 6, alignItems: 'center' }}>
                    <input className="inp" style={{ fontSize: 10, padding: '4px 8px' }} placeholder="Source / description…"
                      value={r.text} onChange={e => updateRef(r.id, 'text', e.target.value)} />
                    <input className="inp" style={{ fontSize: 10, padding: '4px 8px' }} placeholder="URL (optional)"
                      value={r.url} onChange={e => updateRef(r.id, 'url', e.target.value)} />
                    <button onClick={() => removeRef(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--short)', fontSize: 14, fontFamily: 'var(--sans)' }}>×</button>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 9, padding: '5px 12px' }} onClick={addRef}>
                + ADD REFERENCE
              </button>
            </SectionCard>

                {/* Mobile-only (investment mode): quant + gates + submit */}
                {isMobile && (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <QuantPreviewPanel data={quantPreview} loading={quantLoading} />
                    </div>
                    <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
                      <div className="sec-title" style={{ marginBottom: 10 }}>READINESS GATES</div>
                      {gates.map(g => (
                        <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: g.pass ? 'var(--long)' : 'var(--short)' }}>{g.pass ? '✓' : '✗'}</span>
                          <span style={{ fontSize: 9, color: g.pass ? 'var(--text3)' : 'var(--text4)' }}>{g.label}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 12, marginBottom: 24, opacity: allGatesPass && !submitting ? 1 : 0.4 }}
                      onClick={() => allGatesPass && setShowConfirm(true)}
                      disabled={!allGatesPass || submitting}
                    >
                      {submitting ? 'SUBMITTING…' : 'SUBMIT RESEARCH MEMO →'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Right panel (desktop only) */}
          {isDesktop && (
            <div style={{ position: 'sticky', top: 0, alignSelf: 'start' }}>
              <Mt5PricePanel quote={quote} loading={quoteLoading} error={quoteError} />
              <QuantPreviewPanel data={quantPreview} loading={quantLoading} />

              {/* Readiness checklist */}
              <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
                <div className="sec-title" style={{ marginBottom: 10 }}>SUBMISSION GATES</div>
                {(mode === 'trading' ? tradingGates : gates).map(g => (
                  <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      background: g.pass ? 'rgba(22,163,74,.12)' : 'rgba(220,38,38,.08)',
                      border: `1px solid ${g.pass ? 'rgba(22,163,74,.3)' : 'rgba(220,38,38,.2)'}`,
                      fontSize: 9,
                    }}>
                      <span style={{ color: g.pass ? 'var(--long)' : 'var(--short)' }}>{g.pass ? '✓' : '✗'}</span>
                    </span>
                    <span style={{ fontSize: 9, color: g.pass ? 'var(--text3)' : 'var(--text4)', lineHeight: 1.3 }}>{g.label}</span>
                  </div>
                ))}

                {quote && (
                  <div style={{ marginTop: 10, padding: '6px 8px', background: 'rgba(22,163,74,.04)', border: '1px solid rgba(22,163,74,.2)', borderRadius: 4 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--long)', marginBottom: 3 }}>SNAPSHOT READY</div>
                    <div style={{ fontSize: 8, color: 'var(--text3)', lineHeight: 1.6 }}>
                      CMP locked at <span className="mono" style={{ fontWeight: 700 }}>{quote.mid.toFixed(quote.digits)}</span><br />
                      MT5: {new Date(quote.server_time).toISOString().slice(11, 19)} UTC
                    </div>
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 14px', fontSize: 12, opacity: (mode === 'trading' ? tradingGatesPass : allGatesPass) && !submitting ? 1 : 0.4, marginBottom: 6 }}
                onClick={() => (mode === 'trading' ? tradingGatesPass : allGatesPass) && setShowConfirm(true)}
                disabled={!(mode === 'trading' ? tradingGatesPass : allGatesPass) || submitting}
              >
                {submitting ? 'SUBMITTING…' : mode === 'trading' ? '◈  SUBMIT TRADING IDEA  →' : '◆  SUBMIT RESEARCH MEMO  →'}
              </button>
              <div style={{ fontSize: 8, color: 'var(--text4)', textAlign: 'center' }}>
                Identity anonymized · No edits · MT5 snapshot locked on submit
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="panel slide-up" style={{ maxWidth: 480, width: '90%', padding: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Confirm Submission</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 20, padding: '12px 14px', background: 'var(--panel2)', borderRadius: 4, border: '1px solid var(--border)' }}>
              By submitting this research, I confirm this analysis represents my independent investment view and is supported by reasonable evidence. This submission is final and cannot be edited.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setShowConfirm(false)} disabled={submitting}>CANCEL</button>
              <button className="btn btn-primary" style={{ fontSize: 11, opacity: submitting ? 0.5 : 1 }} onClick={mode === 'trading' ? submitTrading : submit} disabled={submitting}>
                {submitting ? 'SUBMITTING…' : 'CONFIRM & SUBMIT →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
