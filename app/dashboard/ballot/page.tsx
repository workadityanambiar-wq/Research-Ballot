'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { DirBadge } from '@/components/ui/Badge';
import { getPhase, ROUND_BUDGET, WEEK_ID } from '@/lib/data';
import type { Allocation, Phase, Idea, User } from '@/lib/types';

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('en-US');

function nextDeadlineUTC(targetDay: number, h: number, m: number): number {
  const now = new Date();
  const istOff = 330 * 60 * 1000;
  const ist = new Date(now.getTime() + istOff);
  const curDay = ist.getUTCDay();
  const curMins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  let days = (targetDay - curDay + 7) % 7;
  if (days === 0 && curMins >= h * 60 + m) days = 7;
  const dl = new Date(ist);
  dl.setUTCDate(ist.getUTCDate() + days);
  dl.setUTCHours(h, m, 0, 0);
  return dl.getTime() - istOff;
}

function phaseCfg(p: Phase) {
  return {
    round1:        { label: 'ROUND 1 OPEN',     sub: 'Closes Mon 4:30 PM IST',           color: 'var(--long)',   deadline: nextDeadlineUTC(1, 16, 30), isOpen: true  },
    round1_closed: { label: 'ROUND 1 CLOSED',   sub: 'Round 2 opens Wed 9:00 AM IST',    color: 'var(--warn)',   deadline: nextDeadlineUTC(3,  9,  0), isOpen: false },
    round2:        { label: 'ROUND 2 OPEN',      sub: 'Closes Thu 4:30 PM IST',           color: 'var(--long)',   deadline: nextDeadlineUTC(4, 16, 30), isOpen: true  },
    results:       { label: 'RESULTS PUBLISHED', sub: 'New ballot opens Sat 9:00 AM IST', color: 'var(--accent)', deadline: nextDeadlineUTC(6,  9,  0), isOpen: false },
  }[p];
}

function fmtMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map(n => String(n).padStart(2, '0')).join(':');
}

// ── Idea card ─────────────────────────────────────────────────────────────────

function PnLBadge({ idea, livePrice }: { idea: Idea; livePrice: number | null }) {
  const snap = idea.marketSnapshot;
  if (!snap && !livePrice) return null;

  const cmp       = snap?.cmp ?? idea.entry;
  const current   = livePrice ?? snap?.currentPrice ?? null;
  if (!current || !cmp) return null;

  const dir       = idea.dir;
  const pnlPct    = dir === 'LONG'
    ? ((current - cmp) / cmp) * 100
    : ((cmp - current) / cmp) * 100;
  const up        = pnlPct >= 0;
  const color     = up ? 'var(--long)' : 'var(--short)';

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
      <div style={{ flex: 1, padding: '5px 8px', background: 'var(--bg)', borderRadius: 4, border: `1px solid ${up ? 'rgba(22,163,74,.2)' : 'rgba(220,38,38,.2)'}` }}>
        <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 1 }}>SUBMISSION CMP</div>
        <div className="mono" style={{ fontSize: 11, fontWeight: 700 }}>{cmp.toFixed(2)}</div>
      </div>
      <div style={{ flex: 1, padding: '5px 8px', background: 'var(--bg)', borderRadius: 4, border: `1px solid ${up ? 'rgba(22,163,74,.2)' : 'rgba(220,38,38,.2)'}` }}>
        <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 1 }}>LIVE PRICE</div>
        <div className="mono" style={{ fontSize: 11, fontWeight: 700 }}>{current.toFixed(2)}</div>
      </div>
      <div style={{ flex: 1, padding: '5px 8px', background: up ? 'rgba(22,163,74,.06)' : 'rgba(220,38,38,.06)', borderRadius: 4, border: `1px solid ${up ? 'rgba(22,163,74,.25)' : 'rgba(220,38,38,.25)'}` }}>
        <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 1 }}>P&L</div>
        <div className="mono" style={{ fontSize: 12, fontWeight: 700, color }}>{up ? '+' : ''}{pnlPct.toFixed(2)}%</div>
      </div>
    </div>
  );
}

function SnapTooltip({ idea }: { idea: Idea }) {
  const snap = idea.marketSnapshot;
  if (!snap) return null;
  const [show, setShow] = useState(false);
  const subTime = new Date(snap.submittedAtUtc);
  const msSince = Date.now() - subTime.getTime();
  const hoursSince = Math.floor(msSince / 3600000);
  const minsSince  = Math.floor((msSince % 3600000) / 60000);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ fontSize: 9, color: 'var(--text4)', cursor: 'default', borderBottom: '1px dashed var(--border2)', display: 'inline' }}
      >
        {hoursSince > 0 ? `${hoursSince}h ${minsSince}m ago` : `${minsSince}m ago`}
      </div>
      {show && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, zIndex: 20,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '10px 12px', minWidth: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,.3)',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', marginBottom: 6 }}>MT5 SNAPSHOT</div>
          {[
            ['MT5 Server Time', new Date(snap.mt5ServerTime).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'],
            ['Exchange', snap.exchange],
            ['Session', snap.marketSession],
            ['Market', snap.marketStatus],
            ['Bid', snap.bid.toFixed(2)],
            ['Ask', snap.ask.toFixed(2)],
            ['Spread', snap.spread.toFixed(2)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 8, color: 'var(--text4)' }}>{k}</span>
              <span className="mono" style={{ fontSize: 8, color: 'var(--text2)' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IdeaCard({ idea, isOwn, inputVal, onInput, teamTotal, hasSubmitted, lockedAmt, livePrice }: {
  idea: Idea; isOwn: boolean; inputVal: string; onInput: (v: string) => void;
  teamTotal: number; hasSubmitted: boolean; lockedAmt: number; livePrice: number | null;
}) {
  const staged = parseInt(inputVal || '0', 10) || 0;
  const active = staged > 0 || lockedAmt > 0;
  const snap = idea.marketSnapshot;

  return (
    <div style={{
      background: 'var(--panel)', borderRadius: 6, padding: 14, position: 'relative',
      border: `1px solid ${isOwn ? 'rgba(217,119,6,.3)' : active ? 'rgba(37,99,235,.35)' : 'var(--border)'}`,
      boxShadow: active ? '0 0 10px rgba(37,99,235,.05)' : 'var(--shadow)',
      opacity: isOwn ? 0.5 : 1,
    }}>
      {isOwn && (
        <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, color: 'var(--warn)', background: 'var(--warn-dim)', padding: '2px 7px', borderRadius: 3, fontWeight: 600, letterSpacing: '.04em' }}>
          YOUR IDEA
        </div>
      )}
      {!isOwn && staged > 0 && !hasSubmitted && (
        <div style={{ position: 'absolute', top: 11, right: 11, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span className="mono" style={{ fontSize: 9, color: 'var(--text4)', background: 'var(--bg)', padding: '1px 5px', borderRadius: 2, border: '1px solid var(--border)' }}>{idea.id}</span>
        <DirBadge dir={idea.dir} />
        {snap && snap.tradeStatus !== 'OPEN' ? (
          <span style={{
            marginLeft: 'auto', fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
            background: snap.tradeStatus === 'TARGET_HIT' ? 'rgba(22,163,74,.12)' : 'rgba(220,38,38,.1)',
            color: snap.tradeStatus === 'TARGET_HIT' ? 'var(--long)' : 'var(--short)',
            border: `1px solid ${snap.tradeStatus === 'TARGET_HIT' ? 'rgba(22,163,74,.3)' : 'rgba(220,38,38,.2)'}`,
          }}>
            {snap.tradeStatus.replace('_', ' ')}
          </span>
        ) : snap ? (
          <span style={{ marginLeft: 'auto', fontSize: 8, color: snap.marketStatus === 'OPEN' ? 'var(--long)' : 'var(--short)', fontWeight: 600 }}>
            ● {snap.marketStatus}
          </span>
        ) : null}
      </div>

      <div className="mono" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{idea.ticker}</div>

      {/* Submission timestamp with hover tooltip */}
      {snap && (
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 8, color: 'var(--text4)' }}>Submitted</span>
          <SnapTooltip idea={idea} />
          <span style={{ fontSize: 8, color: 'var(--text4)' }}>at {snap.cmp.toFixed(2)}</span>
        </div>
      )}

      {/* Live P&L vs submission price */}
      <PnLBadge idea={idea} livePrice={livePrice} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5, marginBottom: 8 }}>
        {([
          ['EXP RET', `+${idea.expRet}%`, 'var(--long)'],
          ['R/R', `${idea.rr.toFixed(1)}x`, idea.rr >= 2 ? 'var(--long)' : 'var(--warn)'],
          ['CONV', `${idea.conv}/10`, 'var(--accent)'],
          ['QUANT', idea.quantScore > 0 ? idea.quantScore.toFixed(0) : '—',
            idea.quantScore >= 80 ? 'var(--long)' : idea.quantScore >= 70 ? 'var(--accent)' : idea.quantScore >= 60 ? 'var(--warn)' : idea.quantScore > 0 ? 'var(--short)' : 'var(--text4)'],
        ] as [string, string, string][]).map(([lbl, val, clr]) => (
          <div key={lbl} style={{ background: 'var(--bg)', borderRadius: 4, padding: '4px 6px' }}>
            <div style={{ fontSize: 8, color: 'var(--text4)', marginBottom: 2 }}>{lbl}</div>
            <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: clr }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 9, color: 'var(--text3)', lineHeight: 1.6, height: 40, overflow: 'hidden', marginBottom: 10 }}>
        {idea.thesis.slice(0, 130)}…
      </div>

      {teamTotal > 0 && (
        <div className="mono" style={{ fontSize: 10, color: 'var(--text3)', marginBottom: active ? 8 : 0 }}>
          Team: <strong style={{ color: 'var(--text)' }}>${fmt(teamTotal)}</strong>
        </div>
      )}

      {!isOwn && !hasSubmitted && (
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {[500, 1000, 2000].map(n => (
              <button key={n} onClick={() => onInput(String((staged || 0) + n))} className="btn btn-ghost btn-sm"
                style={{ flex: 1, padding: '3px 0', fontSize: 9 }}>+{n}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg)', borderRadius: 5, padding: '0 8px', border: `1px solid ${staged > 0 ? 'rgba(37,99,235,.4)' : 'var(--border2)'}` }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 2 }}>$</span>
              <input type="text" inputMode="numeric" value={inputVal} placeholder="0"
                onChange={e => onInput(e.target.value.replace(/\D/g, ''))}
                style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 700, padding: '6px 0', outline: 'none' }} />
            </div>
            {staged > 0 && (
              <button onClick={() => onInput('0')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--short)', fontSize: 18, lineHeight: 1 }}>×</button>
            )}
          </div>
        </div>
      )}

      {hasSubmitted && lockedAmt > 0 && (
        <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>
          Your allocation: ${fmt(lockedAmt)} ✓
        </div>
      )}
    </div>
  );
}

// ── Results table ─────────────────────────────────────────────────────────────

function ResultsTable({ ideas, allocations, round, users }: { ideas: Idea[]; allocations: Allocation[]; round: 1 | 2 | 'both'; users: User[] }) {
  const totals: Record<string, number> = {};
  const counts: Record<string, Set<string>> = {};
  allocations.filter(a => round === 'both' || a.round === round).forEach(a => {
    totals[a.ideaId] = (totals[a.ideaId] ?? 0) + a.amount;
    (counts[a.ideaId] ??= new Set()).add(a.userId);
  });
  const grand = Object.values(totals).reduce((s, v) => s + v, 0);
  const maxAmt = Math.max(...Object.values(totals), 1);
  const ranked = [...ideas].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>#</th><th>IDEA</th><th>AUTHOR</th><th>TICKER</th>
            <th>DIR</th><th>TOTAL CAPITAL</th><th>ANALYSTS</th><th>POOL %</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((idea, i) => {
            const total = totals[idea.id] ?? 0;
            const cnt = counts[idea.id]?.size ?? 0;
            const pct = grand > 0 ? ((total / grand) * 100).toFixed(1) : '0.0';
            const author = users.find(u => u.id === idea.authorId);
            return (
              <tr key={idea.id}>
                <td><span className="mono" style={{ fontWeight: 700, color: i < 3 ? 'var(--accent)' : 'var(--text3)' }}>#{i + 1}</span></td>
                <td><span className="mono" style={{ fontSize: 10, color: 'var(--text4)' }}>{idea.id}</span></td>
                <td style={{ fontSize: 10, color: 'var(--text2)' }}>{author?.name ?? '—'}</td>
                <td><span className="mono" style={{ fontWeight: 700 }}>{idea.ticker}</span></td>
                <td><DirBadge dir={idea.dir} /></td>
                <td>
                  <span className="mono" style={{ fontWeight: 700, color: total > 0 ? 'var(--text)' : 'var(--text4)' }}>${fmt(total)}</span>
                  <div className="bar-track" style={{ width: 72, marginTop: 3 }}>
                    <div className="bar-fill" style={{ width: `${Math.round((total / maxAmt) * 100)}%`, background: idea.dir === 'LONG' ? 'var(--long)' : 'var(--short)' }} />
                  </div>
                </td>
                <td><span className="mono">{cnt}</span></td>
                <td><span className="mono" style={{ color: 'var(--text2)' }}>{pct}%</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BallotPage() {
  const { user, ideas, allocations, users, submitRound } = useApp();
  const [phase, setPhase]       = useState<Phase>(getPhase);
  const [inputVals, setInputVals] = useState<Record<string, string>>({});
  const [now, setNow]           = useState(Date.now);
  const [locking, setLocking]   = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const id = setInterval(() => { setNow(Date.now()); setPhase(getPhase()); }, 1000);
    return () => clearInterval(id);
  }, []);

  // Refresh live prices: snapshot endpoint (updates DB + returns MT5 prices), then Yahoo fallback
  const fetchLivePrices = useCallback(async () => {
    const tickers = [...new Set(ideas.map(i => i.ticker))];
    if (tickers.length === 0) return;
    const results: Record<string, number> = {};

    // Primary: refresh endpoint persists P&L + returns current prices from MT5
    try {
      const refreshRes = await fetch('/api/snapshots/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekId: WEEK_ID }),
        cache: 'no-store',
      });
      if (refreshRes.ok) {
        const { prices } = await refreshRes.json() as { updated: number; prices: Record<string, number> };
        Object.assign(results, prices);
      }
    } catch { /* fall through */ }

    // Yahoo Finance fallback for any ticker not covered by the refresh
    const missing = tickers.filter(t => !(t in results));
    await Promise.allSettled(
      missing.map(async ticker => {
        try {
          const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1m&range=1d`;
          const yfRes = await fetch(yfUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
          if (yfRes.ok) {
            const json = await yfRes.json();
            const price: number | undefined = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (price) results[ticker] = price;
          }
        } catch { /* no price */ }
      }),
    );

    setLivePrices(prev => ({ ...prev, ...results }));
  }, [ideas]);

  useEffect(() => {
    fetchLivePrices();
    const id = setInterval(fetchLivePrices, 30000);
    return () => clearInterval(id);
  }, [fetchLivePrices]);

  if (!user) return null;

  const legacyId = user.legacyId;
  const currentRound: 1 | 2 = phase === 'round2' ? 2 : 1;
  const cfg = phaseCfg(phase);
  const msLeft = Math.max(0, cfg.deadline - now);

  const r1Totals: Record<string, number> = {};
  const r2Totals: Record<string, number> = {};
  const r1Users = new Set<string>();
  const r2Users = new Set<string>();
  allocations.forEach(a => {
    if (a.round === 1) { r1Totals[a.ideaId] = (r1Totals[a.ideaId] ?? 0) + a.amount; r1Users.add(a.userId); }
    else               { r2Totals[a.ideaId] = (r2Totals[a.ideaId] ?? 0) + a.amount; r2Users.add(a.userId); }
  });

  const totalR1 = Object.values(r1Totals).reduce((s, v) => s + v, 0);
  const totalR2 = Object.values(r2Totals).reduce((s, v) => s + v, 0);
  const participants = phase === 'round2' || phase === 'results' ? r2Users.size : r1Users.size;
  const totalAlloc = phase === 'results' ? totalR1 + totalR2 : phase === 'round2' ? totalR2 : totalR1;
  const totalMembers = users.length;

  const hasSubmitted = allocations.some(a => a.userId === legacyId && a.round === currentRound);
  const myAllocs = allocations.filter(a => a.userId === legacyId && a.round === currentRound);

  const stagedTotal = Object.values(inputVals).reduce((s, v) => s + (parseInt(v || '0', 10) || 0), 0);
  const remaining = ROUND_BUDGET - stagedTotal;

  const teamTotal = (idea: Idea) =>
    (r1Totals[idea.id] ?? 0) + (phase === 'round2' || phase === 'results' ? (r2Totals[idea.id] ?? 0) : 0);

  const lockBallot = async () => {
    const entries = Object.entries(inputVals).filter(([, v]) => (parseInt(v || '0', 10) || 0) > 0);
    if (entries.length === 0 || remaining !== 0 || locking) return;
    setLocking(true);
    try {
      await submitRound(
        entries.map(([ideaId, v]) => ({ ideaId, amount: parseInt(v, 10) })),
        currentRound,
      );
    } catch (e) {
      alert((e as Error).message ?? 'Submission failed.');
    } finally {
      setLocking(false);
    }
  };

  const sidebarItems: { ideaId: string; amount: number }[] = hasSubmitted
    ? myAllocs.map(a => ({ ideaId: a.ideaId, amount: a.amount }))
    : Object.entries(inputVals).filter(([, v]) => (parseInt(v || '0', 10) || 0) > 0)
        .map(([ideaId, v]) => ({ ideaId, amount: parseInt(v, 10) }));

  // ── Phase banner ──────────────────────────────────────────────────────────────
  const banner = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'var(--panel)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="dot" style={{ background: cfg.color, width: 8, height: 8 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color, letterSpacing: '.05em' }}>{cfg.label}</div>
          <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>{cfg.sub} · {WEEK_ID}</div>
        </div>
        {cfg.isOpen && (
          <div className="mono" style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--bg)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border2)' }}>
            {fmtMs(msLeft)}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{participants}/{totalMembers}</div>
          <div style={{ fontSize: 9, color: 'var(--text4)' }}>analysts allocated</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>${fmt(totalAlloc)}</div>
          <div style={{ fontSize: 9, color: 'var(--text4)' }}>capital deployed</div>
        </div>
      </div>
    </div>
  );

  // ── Closed / final results ────────────────────────────────────────────────────
  if (phase === 'round1_closed' || phase === 'results') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {banner}
        <div className="scroll-y" style={{ flex: 1, padding: 20 }}>
          {phase === 'round1_closed' && (
            <div style={{ marginBottom: 16, padding: '9px 14px', background: 'rgba(37,99,235,.05)', border: '1px solid rgba(37,99,235,.15)', borderRadius: 6, fontSize: 10, color: 'var(--text2)' }}>
              Round 1 closed · Attribution now visible · Round 2 opens Wednesday 9:00 AM IST with a fresh $5,000 budget
            </div>
          )}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 10 }}>
            {phase === 'results' ? 'Final Combined Results — R1 + R2' : 'Round 1 Results'}
          </div>
          <ResultsTable ideas={ideas} allocations={allocations} round={phase === 'results' ? 'both' : 1} users={users} />
          {phase === 'results' && totalR2 > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 10 }}>Round 2 Detail</div>
              <ResultsTable ideas={ideas} allocations={allocations} round={2} users={users} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Allocation feed (round1 or round2 open) ───────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {banner}

      {phase === 'round2' && r1Users.size > 0 && (
        <div style={{ padding: '7px 20px', background: 'rgba(37,99,235,.04)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em' }}>R1 TOP IDEAS →</span>
          {[...ideas].sort((a, b) => (r1Totals[b.id] ?? 0) - (r1Totals[a.id] ?? 0)).slice(0, 4).map((idea, i) => (
            <div key={idea.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>#{i + 1}</span>
              <span className="mono" style={{ fontWeight: 700 }}>{idea.ticker}</span>
              <DirBadge dir={idea.dir} />
              <span className="mono" style={{ color: 'var(--text3)' }}>${fmt(r1Totals[idea.id] ?? 0)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 264px', flex: 1, overflow: 'hidden' }}>
        {/* Feed */}
        <div className="scroll-y" style={{ padding: 16, borderRight: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 12, fontSize: 10, color: 'var(--text3)' }}>
            {hasSubmitted
              ? `Round ${currentRound} ballot locked · Showing live team allocations`
              : `Allocate exactly $${fmt(ROUND_BUDGET)} across ideas · Cannot allocate to your own ideas`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {ideas.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                isOwn={idea.authorId === legacyId}
                inputVal={hasSubmitted ? '' : (inputVals[idea.id] ?? '')}
                onInput={v => setInputVals(prev => ({ ...prev, [idea.id]: v }))}
                teamTotal={teamTotal(idea)}
                hasSubmitted={hasSubmitted}
                lockedAmt={myAllocs.find(a => a.ideaId === idea.id)?.amount ?? 0}
                livePrice={livePrices[idea.ticker] ?? null}
              />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="scroll-y" style={{ padding: 16, background: 'var(--panel2)' }}>
          <div className="sec-title" style={{ marginBottom: 10 }}>
            {hasSubmitted ? `ROUND ${currentRound} LOCKED` : `ROUND ${currentRound} BUDGET`}
          </div>
          <div style={{ padding: '12px 14px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--text4)' }}>BUDGET</span>
              <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>${fmt(ROUND_BUDGET)}</span>
            </div>
            {!hasSubmitted && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--text4)' }}>STAGED</span>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: stagedTotal > 0 ? 'var(--accent)' : 'var(--text4)' }}>${fmt(stagedTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 9, color: 'var(--text4)' }}>REMAINING</span>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: remaining < 0 ? 'var(--short)' : 'var(--long)' }}>${fmt(Math.max(0, remaining))}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.min(100, (stagedTotal / ROUND_BUDGET) * 100)}%`, background: remaining < 0 ? 'var(--short)' : 'var(--accent)' }} />
                </div>
              </>
            )}
            {hasSubmitted && (
              <div style={{ fontSize: 10, color: 'var(--long)', fontWeight: 600 }}>
                ${fmt(myAllocs.reduce((s, a) => s + a.amount, 0))} across {myAllocs.length} idea{myAllocs.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {sidebarItems.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="sec-title" style={{ marginBottom: 8 }}>MY ALLOCATIONS</div>
              {sidebarItems.sort((a, b) => b.amount - a.amount).map(({ ideaId, amount }) => {
                const idea = ideas.find(i => i.id === ideaId);
                if (!idea) return null;
                return (
                  <div key={ideaId} style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', marginBottom: 4, background: 'var(--panel)', border: '1px solid rgba(37,99,235,.18)', borderRadius: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                        <DirBadge dir={idea.dir} />
                        <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>{idea.ticker}</span>
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text4)' }}>{ideaId}</div>
                    </div>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>${fmt(amount)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {!hasSubmitted ? (
            <>
              {remaining < 0 && (
                <div style={{ fontSize: 9, color: 'var(--short)', background: 'var(--short-dim)', padding: '5px 8px', borderRadius: 4, marginBottom: 8, border: '1px solid rgba(220,38,38,.2)' }}>
                  Over budget by ${fmt(Math.abs(remaining))} — reduce allocations
                </div>
              )}
              {remaining > 0 && stagedTotal > 0 && (
                <div style={{ fontSize: 9, color: 'var(--warn)', background: 'rgba(234,179,8,.07)', padding: '5px 8px', borderRadius: 4, marginBottom: 8, border: '1px solid rgba(234,179,8,.2)' }}>
                  ${fmt(remaining)} unallocated — must deploy exactly ${fmt(ROUND_BUDGET)}
                </div>
              )}
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: 10, opacity: stagedTotal === 0 || remaining < 0 || locking ? 0.4 : 1 }}
                disabled={remaining !== 0 || locking}
                onClick={lockBallot}
              >
                {locking ? 'LOCKING…' : `LOCK ROUND ${currentRound} BALLOT →`}
              </button>
              <div style={{ fontSize: 9, color: 'var(--text4)', textAlign: 'center', marginTop: 6 }}>
                Immutable after submission · Must deploy exactly ${fmt(ROUND_BUDGET)}
              </div>
            </>
          ) : (
            <div style={{ padding: 14, background: 'var(--long-dim)', border: '1px solid rgba(22,163,74,.2)', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4, color: 'var(--long)' }}>✓</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--long)' }}>Round {currentRound} Locked</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>Immutable · Audit logged</div>
            </div>
          )}

          <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6 }}>
            <div className="sec-title" style={{ marginBottom: 8 }}>LIVE MARKET · R{currentRound}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--text4)' }}>TEAM DEPLOYED</span>
              <span className="mono" style={{ fontSize: 10, fontWeight: 600 }}>${fmt(totalAlloc)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--text4)' }}>ANALYSTS DONE</span>
              <span className="mono" style={{ fontSize: 10, fontWeight: 600 }}>{participants}/{totalMembers}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: 'var(--text4)' }}>AVG ALLOCATION</span>
              <span className="mono" style={{ fontSize: 10, fontWeight: 600 }}>
                {participants > 0 ? `$${fmt(Math.round(totalAlloc / participants))}` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
