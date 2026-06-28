'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { can } from '@/lib/permissions';
import type { Idea } from '@/lib/types';

// ── Enrichment data ──────────────────────────────────────────────────────────
const HEADLINES: Record<string, string> = {
  'IDEA-001': 'NVIDIA AI Spending Cycle Has Further To Run',
  'IDEA-002': 'Microsoft Copilot Monetization Entering Its Acceleration Phase',
  'IDEA-003': 'Meta Platforms: Llama-Driven Ad Efficiency Opens a New Revenue Layer',
  'IDEA-004': 'Goldman IB Revenue Recovery — M&A Pipeline at 3-Year Highs',
  'IDEA-005': 'Tesla Margin Squeeze Deepening — Short Thesis Remains Intact',
  'IDEA-006': 'Amazon AWS Re-Acceleration Underpriced at Current Levels',
  'IDEA-007': 'Exxon Demand Destruction Risk — Oil Breakdown Opens Path to $98',
  'IDEA-008': 'Alphabet Search Moat Underestimated Amid AI Transition',
  'IDEA-009': 'JPMorgan IB Recovery Underpriced — Rate Normalization Catalyst',
  'IDEA-010': 'Apple Intelligence Super-Cycle: Institutional Positioning Window Opening',
};

const COMPANIES: Record<string, string> = {
  NVDA: 'NVIDIA Corporation', MSFT: 'Microsoft Corporation', META: 'Meta Platforms Inc.',
  GS: 'Goldman Sachs Group', TSLA: 'Tesla Inc.', AMZN: 'Amazon.com Inc.',
  XOM: 'Exxon Mobil Corporation', GOOGL: 'Alphabet Inc.', JPM: 'JPMorgan Chase & Co.', AAPL: 'Apple Inc.',
};

const EXCHANGES: Record<string, string> = {
  NVDA: 'NASDAQ', MSFT: 'NASDAQ', META: 'NASDAQ', GS: 'NYSE', TSLA: 'NASDAQ',
  AMZN: 'NASDAQ', XOM: 'NYSE', GOOGL: 'NASDAQ', JPM: 'NYSE', AAPL: 'NASDAQ',
};

// ── Deterministic seeded chart ───────────────────────────────────────────────
function mkRand(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  return () => {
    h = Math.imul(h ^ (h >>> 13), 1540483477) >>> 0;
    h = (h ^ (h >>> 15)) >>> 0;
    return (h >>> 0) / 0xffffffff;
  };
}

function MiniChart({ idea }: { idea: Idea }) {
  const rand = mkRand(idea.ticker + idea.id);
  const n = 50;
  const { entry, stop, target, dir } = idea;
  const range = Math.abs(target - stop);
  const pad = range * 0.45;
  const minP = Math.min(stop, entry, target) - pad;
  const maxP = Math.max(stop, entry, target) + pad;
  const span = maxP - minP || 1;

  const prices: number[] = [];
  let p = entry + (dir === 'LONG' ? -range * 0.28 : range * 0.28);
  for (let i = 0; i < n; i++) {
    const trend = (dir === 'LONG' ? 1 : -1) * range * 0.005;
    const noise = (rand() - 0.5) * range * 0.045;
    p = Math.max(minP + pad * 0.05, Math.min(maxP - pad * 0.05, p + trend + noise));
    prices.push(p);
  }
  prices[n - 1] = entry;

  const W = 400, H = 190;
  const xS = (i: number) => (i / (n - 1)) * W;
  const yS = (v: number) => H - ((v - minP) / span) * H;
  const linePath = prices.map((v, i) => `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(v).toFixed(1)}`).join('');
  const fillPath = `${linePath}L${W},${H}L0,${H}Z`;
  const lc = dir === 'LONG' ? '#16A34A' : '#DC2626';
  const gid = `g${idea.id.replace(/-/g, '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lc} stopOpacity={dir === 'LONG' ? 0.2 : 0.15} />
          <stop offset="100%" stopColor={lc} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={0} y1={H * f} x2={W} y2={H * f} stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
      ))}
      {[0.2, 0.4, 0.6, 0.8].map(f => (
        <line key={f} x1={W * f} y1={0} x2={W * f} y2={H} stroke="rgba(0,0,0,0.025)" strokeWidth="1" />
      ))}
      <path d={fillPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={lc} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <line x1={0} y1={yS(target)} x2={W} y2={yS(target)} stroke="#16A34A" strokeWidth="0.8" strokeDasharray="5,3" opacity="0.5" />
      <line x1={0} y1={yS(stop)} x2={W} y2={yS(stop)} stroke="#DC2626" strokeWidth="0.8" strokeDasharray="5,3" opacity="0.5" />
      <text x={W - 4} y={yS(target) - 4} textAnchor="end" fill="#16A34A" fontSize="8" opacity="0.7" fontFamily="JetBrains Mono,monospace">T</text>
      <text x={W - 4} y={yS(stop) + 10} textAnchor="end" fill="#DC2626" fontSize="8" opacity="0.7" fontFamily="JetBrains Mono,monospace">S</text>
      <circle cx={xS(n - 1)} cy={yS(entry)} r="3.5" fill={lc} opacity="0.9" />
      <circle cx={xS(n - 1)} cy={yS(entry)} r="7" fill={lc} opacity="0.1" />
    </svg>
  );
}

// ── Allocation modal ─────────────────────────────────────────────────────────
function AllocModal({ idea, remaining, onConfirm, onClose }: {
  idea: Idea; remaining: number;
  onConfirm: (amt: number) => void; onClose: () => void;
}) {
  const [amt, setAmt] = useState('');
  const v = parseInt(amt) || 0;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="panel" style={{ width: 390, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,.18)', animation: 'slideUp .2s ease-out' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Allocate Research Capital</div>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 16 }}>{HEADLINES[idea.id] ?? idea.ticker}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
          {([
            ['Entry', `$${idea.entry.toFixed(2)}`, ''],
            ['Target', `$${idea.target.toFixed(2)}`, 'var(--long)'],
            ['R / R', `${idea.rr}×`, 'var(--long)'],
            ['Final Score', idea.finalScore.toFixed(1), 'var(--accent)'],
            ['Conviction', `${idea.conv}/10`, 'var(--accent)'],
            idea.quantScore > 0
              ? ['Quant', `${idea.quantScore.toFixed(0)}/100`, idea.quantScore >= 80 ? 'var(--long)' : idea.quantScore >= 70 ? 'var(--accent)' : idea.quantScore >= 60 ? 'var(--warn)' : 'var(--short)']
              : ['Exp. Return', `+${idea.expRet}%`, 'var(--long)'],
          ] as [string, string, string][]).map(([l, val, c]) => (
            <div key={l} className="panel2" style={{ padding: '8px 10px' }}>
              <div style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 2 }}>{l}</div>
              <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: c || 'var(--text)' }}>{val}</div>
            </div>
          ))}
        </div>

        <div className="form-label" style={{ marginBottom: 6 }}>Credits to Allocate
          <span style={{ fontWeight: 400, color: 'var(--text4)', textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>({remaining} remaining)</span>
        </div>
        <input
          className="inp" type="number" min="50" max={remaining} step="50"
          placeholder={`Enter amount (50–${remaining})`}
          value={amt} onChange={e => setAmt(e.target.value)}
          style={{ marginBottom: 10 }} autoFocus
        />
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[100, 250, 500].filter(n => n <= remaining).map(n => (
            <button key={n} className="btn btn-ghost btn-sm" onClick={() => setAmt(String(n))}>{n} cr</button>
          ))}
        </div>
        {v > remaining && <div style={{ fontSize: 10, color: 'var(--short)', marginBottom: 10 }}>⚠ Exceeds remaining budget ({remaining} cr)</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
            disabled={v <= 0 || v > remaining}
            onClick={() => { if (v > 0 && v <= remaining) onConfirm(v); }}
          >
            Confirm Allocation
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Research card ────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, React.CSSProperties> = {
  APPROVED: { background: 'rgba(22,163,74,.1)', color: '#15803D', border: '1px solid rgba(22,163,74,.25)' },
  PENDING:  { background: 'rgba(217,119,6,.1)', color: '#B45309', border: '1px solid rgba(217,119,6,.25)' },
  REVIEW:   { background: 'rgba(37,99,235,.08)', color: '#1D4ED8', border: '1px solid rgba(37,99,235,.2)' },
  REJECTED: { background: 'rgba(220,38,38,.08)', color: '#B91C1C', border: '1px solid rgba(220,38,38,.2)' },
};

function ResearchCard({ idea, voteMap, userId, canVote, onAllocate, idx }: {
  idea: Idea; voteMap: Record<string, number>; userId: string;
  canVote: boolean; onAllocate: (idea: Idea) => void; idx: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalV = Object.values(voteMap).reduce((a, b) => a + b, 0);
  const voterCt = Object.keys(voteMap).length;
  const pct = Math.min(100, (totalV / 4000) * 100);
  const winProb = Math.min(85, Math.round(idea.conv * 5.8 + idea.rr * 3.2));
  const isOwn = idea.authorId === userId;
  const lc = idea.dir === 'LONG' ? 'var(--long)' : 'var(--short)';
  const retSign = idea.dir === 'SHORT' ? '-' : '+';

  return (
    <div
      className="research-card"
      style={{
        background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow)', cursor: 'default',
        transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
        animation: `slideUp .28s ease-out ${Math.min(idx * 0.05, 0.35)}s both`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(-3px)';
        el.style.boxShadow = '0 16px 40px rgba(0,0,0,.1), 0 0 0 1.5px rgba(37,99,235,.22)';
        el.style.borderColor = 'rgba(37,99,235,.28)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = '';
        el.style.boxShadow = 'var(--shadow)';
        el.style.borderColor = 'var(--border)';
      }}
    >
      {/* Hero chart */}
      <div style={{ position: 'relative', height: 195, background: 'var(--panel2)', overflow: 'hidden', flexShrink: 0 }}>
        <div className="research-card-inner" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <MiniChart idea={idea} />
        </div>
        {/* fade-out to card body */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, background: 'linear-gradient(to top, var(--panel), transparent)', pointerEvents: 'none', zIndex: 1 }} />

        {/* Direction pill */}
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 2, padding: '3px 10px',
          borderRadius: 5, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
          backdropFilter: 'blur(6px)',
          ...(idea.dir === 'LONG'
            ? { background: 'rgba(22,163,74,.12)', color: '#15803D', border: '1px solid rgba(22,163,74,.3)' }
            : { background: 'rgba(220,38,38,.1)',  color: '#B91C1C', border: '1px solid rgba(220,38,38,.25)' }),
        }}>
          {idea.dir}
        </div>

        {/* Rank */}
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 2, padding: '2px 8px',
          borderRadius: 5, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)',
          background: 'rgba(255,255,255,.88)', border: '1px solid var(--border)', backdropFilter: 'blur(6px)',
        }}>
          #{idea.rank}
        </div>

        {/* Approval status */}
        <div style={{
          position: 'absolute', bottom: 12, right: 10, zIndex: 2,
          padding: '2px 8px', borderRadius: 5, fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
          backdropFilter: 'blur(6px)', ...STATUS_STYLES[idea.approvalStatus],
        }}>
          {idea.approvalStatus}
        </div>

        {isOwn && (
          <div style={{
            position: 'absolute', bottom: 12, left: 10, zIndex: 2, padding: '2px 8px', borderRadius: 5,
            fontFamily: 'var(--mono)', fontSize: 9, background: 'rgba(217,119,6,.1)', color: '#B45309',
            border: '1px solid rgba(217,119,6,.25)', backdropFilter: 'blur(6px)',
          }}>
            YOUR IDEA
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 15px 13px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>

        {/* Asset info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{idea.ticker}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{COMPANIES[idea.ticker] ?? idea.ticker}</div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--text4)', marginTop: 2, letterSpacing: '.04em' }}>
              {idea.assetClass} · {EXCHANGES[idea.ticker] ?? '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: lc }}>{retSign}{idea.expRet}%</div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--text4)', marginTop: 2 }}>{idea.hold}</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.38, letterSpacing: '-.01em' }}>
          {HEADLINES[idea.id] ?? `${idea.ticker} — ${idea.dir} Trade Thesis`}
        </div>

        {/* Thesis */}
        <div>
          <div className={expanded ? '' : 'line-clamp-3'} style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.65 }}>
            {idea.thesis}
          </div>
          {!expanded && idea.thesis.length > 120 && (
            <button
              onClick={() => setExpanded(true)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 10, cursor: 'pointer', padding: '3px 0 0', fontWeight: 600, display: 'block' }}
            >
              Read More →
            </button>
          )}
        </div>

        {/* Metrics strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, padding: '9px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          {([
            ['Conviction', `${idea.conv}/10`, 'var(--accent)'],
            ['Exp Return', `${retSign}${idea.expRet}%`, lc],
            ['Risk / RWD', `${idea.rr}×`, 'var(--text2)'],
            [idea.quantScore > 0 ? 'Quant' : 'Win Prob',
             idea.quantScore > 0 ? `${idea.quantScore.toFixed(0)}/100` : `${winProb}%`,
             idea.quantScore >= 80 ? 'var(--long)' : idea.quantScore >= 70 ? 'var(--accent)' : idea.quantScore >= 60 ? 'var(--warn)' : idea.quantScore > 0 ? 'var(--short)' : 'var(--purple)'],
          ] as [string, string, string][]).map(([l, v, c]) => (
            <div key={l}>
              <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text4)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: c }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Live P&L row */}
        {(() => {
          const ms = idea.marketSnapshot;
          if (!ms || ms.currentPnlPct == null) return null;
          const up = ms.currentPnlPct >= 0;
          const pnlColor = ms.tradeStatus === 'TARGET_HIT' ? 'var(--long)' : ms.tradeStatus === 'STOP_HIT' ? 'var(--short)' : up ? 'var(--long)' : 'var(--short)';
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg)', borderRadius: 5, border: '1px solid var(--border)', marginTop: -4 }}>
              <span style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Live P&L</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {ms.currentPrice != null && <span className="mono" style={{ fontSize: 9, color: 'var(--text3)' }}>${ms.currentPrice.toFixed(2)}</span>}
                <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: pnlColor }}>{up ? '+' : ''}{ms.currentPnlPct.toFixed(2)}%</span>
                {ms.tradeStatus !== 'OPEN' && (
                  <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: ms.tradeStatus === 'TARGET_HIT' ? 'rgba(22,163,74,.12)' : 'rgba(220,38,38,.1)', color: pnlColor }}>
                    {ms.tradeStatus.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Catalyst chips */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {idea.catalysts.slice(0, 3).map(c => (
            <span key={c} style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 600, letterSpacing: '.05em',
              background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(37,99,235,.15)',
              fontFamily: 'var(--mono)',
            }}>
              {c}
            </span>
          ))}
        </div>

        {/* Community conviction */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text4)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Research Capital</span>
            <span className="mono" style={{ fontSize: 9, color: 'var(--accent)' }}>{totalV.toLocaleString()} cr · Rank #{idea.rank}</span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), rgba(37,99,235,.55))', transition: 'width .85s cubic-bezier(.4,0,.2,1)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i < voterCt ? 'var(--accent)' : 'var(--border2)', opacity: i < voterCt ? 0.7 : 1 }} />
              ))}
            </div>
            <span className="mono" style={{ fontSize: 9, color: 'var(--text4)' }}>{voterCt}/16 analysts</span>
          </div>
        </div>

        {/* Action bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 10, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          {canVote && !isOwn && (
            <button className="btn btn-primary btn-sm" onClick={() => onAllocate(idea)}>
              Allocate Capital
            </button>
          )}
          <button className="btn btn-ghost btn-sm">Research →</button>
        </div>
      </div>
    </div>
  );
}

// ── Filter toolbar ───────────────────────────────────────────────────────────
const FILTERS = [
  ['all', 'All Ideas'], ['approved', 'Approved'], ['long', 'LONG'], ['short', 'SHORT'],
  ['top3', 'Top 3'], ['highret', 'High Return'], ['quant', 'Strong Quant ≥70'],
] as const;

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MarketPage() {
  const { user, ideas, votes, setVotes } = useApp();
  const { isMobile } = useBreakpoint();

  const [myVotes, setMyVotes] = useState<Record<string, number>>(() => {
    const mv: Record<string, number> = {};
    ideas.forEach(i => { const v = votes[i.id]?.[user!.legacyId]; if (v) mv[i.id] = v; });
    return mv;
  });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [allocTarget, setAllocTarget] = useState<Idea | null>(null);

  if (!user) return null;

  const budget = 1000;
  const allocated = Object.values(myVotes).reduce((a, b) => a + b, 0);
  const remaining = budget - allocated;
  const canVote = can(user, 'vote');

  const filtered = useMemo(() => ideas.filter(idea => {
    if (search) {
      const q = search.toLowerCase();
      if (![idea.ticker, COMPANIES[idea.ticker] ?? '', idea.thesis, idea.assetClass].some(s => s.toLowerCase().includes(q))) return false;
    }
    if (filter === 'long') return idea.dir === 'LONG';
    if (filter === 'short') return idea.dir === 'SHORT';
    if (filter === 'approved') return idea.approvalStatus === 'APPROVED';
    if (filter === 'top3') return idea.rank <= 3;
    if (filter === 'highret') return idea.expRet > 17;
    if (filter === 'quant') return idea.quantScore >= 70;
    return true;
  }).sort((a, b) => b.totalCredits - a.totalCredits), [ideas, filter, search]);

  const handleAllocate = (idea: Idea, amt: number) => {
    const newMyVotes = { ...myVotes, [idea.id]: (myVotes[idea.id] ?? 0) + amt };
    setMyVotes(newMyVotes);
    setAllocTarget(null);
  };

  const submitVotes = () => {
    const upd = { ...votes };
    Object.entries(myVotes).forEach(([id, cr]) => {
      if (!upd[id]) upd[id] = {};
      upd[id][user.legacyId] = cr;
    });
    setVotes(upd);
    alert('Credits submitted. Allocation recorded and anonymized.');
  };

  return (
    <div className="dash-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: isMobile ? '8px 12px' : '9px 20px',
        borderBottom: '1px solid var(--border)', background: 'var(--panel)',
        flexShrink: 0, overflowX: 'auto',
      }}>
        <input
          style={{
            background: 'var(--bg)', border: '1px solid var(--border2)', color: 'var(--text)',
            padding: '5px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'var(--sans)',
            width: isMobile ? '100%' : 210, outline: 'none', transition: 'border-color .15s', flexShrink: isMobile ? 1 : 0,
          }}
          placeholder="Search ticker, thesis, sector…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0, margin: '0 3px' }} />
        {FILTERS.map(([k, l]) => (
          <button
            key={k} onClick={() => setFilter(k)}
            style={{
              padding: '4px 11px', borderRadius: 5, fontSize: 10, fontWeight: 600,
              letterSpacing: '.04em', cursor: 'pointer', fontFamily: 'var(--mono)',
              transition: 'all .15s', whiteSpace: 'nowrap', background: 'none',
              border: filter === k ? '1px solid rgba(37,99,235,.3)' : '1px solid transparent',
              color: filter === k ? 'var(--accent)' : 'var(--text3)',
              ...(filter === k ? { background: 'var(--accent-dim)' } : {}),
            }}
          >
            {l}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span className="mono" style={{ fontSize: 9, color: 'var(--text4)' }}>
            {filtered.length}/{ideas.length} · W26-2025
          </span>
          {canVote && (
            <>
              <span className="mono" style={{ fontSize: 10, color: remaining < 200 ? 'var(--warn)' : 'var(--text3)' }}>
                {remaining} cr left
              </span>
              {allocated > 0 && (
                <button className="btn btn-primary btn-sm" onClick={submitVotes} style={{ whiteSpace: 'nowrap' }}>
                  Submit Allocations
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Feed grid */}
      <div className="scroll-y" style={{ flex: 1 }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50%', color: 'var(--text4)', fontSize: 12 }}>
            No ideas match your filter
          </div>
        ) : (
          <div className="ideas-feed-grid">
            {filtered.map((idea, i) => (
              <ResearchCard
                key={idea.id}
                idea={idea}
                voteMap={votes[idea.id] ?? {}}
                userId={user.legacyId}
                canVote={canVote}
                onAllocate={setAllocTarget}
                idx={i}
              />
            ))}
          </div>
        )}
      </div>

      {/* Allocation modal */}
      {allocTarget && (
        <AllocModal
          idea={allocTarget}
          remaining={remaining}
          onConfirm={amt => handleAllocate(allocTarget, amt)}
          onClose={() => setAllocTarget(null)}
        />
      )}
    </div>
  );
}
