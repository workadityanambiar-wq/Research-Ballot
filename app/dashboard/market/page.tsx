'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DirBadge } from '@/components/ui/Badge';
import { Bar } from '@/components/ui/Bar';
import type { Idea } from '@/lib/types';

export default function MarketPage() {
  const { user, ideas, votes, setVotes } = useApp();
  const [myVotes, setMyVotes] = useState<Record<string, number>>(() => {
    const mv: Record<string, number> = {};
    ideas.forEach(i => { const v = votes[i.id]?.[user!.id]; if (v) mv[i.id] = v; });
    return mv;
  });
  const [sel, setSel] = useState<Idea | null>(null);

  if (!user) return null;
  const budget = 1000;
  const alloc = Object.values(myVotes).reduce((a, b) => a + b, 0);
  const rem = budget - alloc;

  const setCredit = (id: string, val: string) => {
    const v = Math.max(0, Math.min(budget, parseInt(val) || 0));
    const nv = { ...myVotes, [id]: v };
    if (Object.values(nv).reduce((a, b) => a + b, 0) <= budget) setMyVotes(nv);
  };

  const submitVotes = () => {
    const upd = { ...votes };
    Object.entries(myVotes).forEach(([id, cr]) => { if (!upd[id]) upd[id] = {}; upd[id][user.id] = cr; });
    setVotes(upd);
    alert('Credits submitted. Allocation recorded and anonymized.');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', height: '100%', overflow: 'hidden' }}>
      <div className="scroll-y" style={{ padding: 16, borderRight: '1px solid var(--border)' }}>
        <div className="sec-hdr" style={{ marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Ideas</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>Allocate research credits · Identities hidden until cycle close · Cannot vote on own ideas</div>
          </div>
          <span className="badge badge-low pulse">VOTING OPEN</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ideas.map(idea => {
            const isOwn = idea.authorId === user.id;
            const total = Object.values(votes[idea.id] || {}).reduce((a, b) => a + b, 0);
            return (
              <div key={idea.id} className={`idea-card ${sel?.id === idea.id ? 'selected' : ''}`} onClick={() => setSel(idea)} style={{ opacity: isOwn ? 0.55 : 1, position: 'relative' }}>
                {isOwn && <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, color: 'var(--warn)', background: 'var(--warn-dim)', padding: '1px 6px', borderRadius: 2, fontFamily: 'var(--mono)' }}>YOUR IDEA</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text4)' }}>{idea.id}</span>
                  <DirBadge dir={idea.dir} />
                  <span className="badge badge-dim" style={{ marginLeft: 'auto' }}>{idea.assetClass}</span>
                </div>
                <div className="mono" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{idea.ticker}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
                  <div><div style={{ fontSize: 8, color: 'var(--text4)' }}>CONV</div><div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{idea.conv}/10</div></div>
                  <div><div style={{ fontSize: 8, color: 'var(--text4)' }}>EXP. RET.</div><div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--long)' }}>+{idea.expRet}%</div></div>
                  <div><div style={{ fontSize: 8, color: 'var(--text4)' }}>R/R</div><div className="mono" style={{ fontSize: 13, fontWeight: 700, color: idea.rr >= 2 ? 'var(--long)' : 'var(--warn)' }}>{idea.rr}</div></div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.5, marginBottom: 8, height: 42, overflow: 'hidden' }}>{idea.thesis.slice(0, 110)}…</div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={{ fontSize: 8, color: 'var(--text4)' }}>TOTAL CREDITS</span><span className="mono" style={{ fontSize: 9 }}>{total.toLocaleString()} cr</span></div>
                  <Bar val={total} max={3420} color={idea.dir === 'LONG' ? 'var(--long)' : 'var(--short)'} />
                </div>
                {!isOwn && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <input className="inp mono" type="number" min="0" max={budget} placeholder="0" value={myVotes[idea.id] || ''}
                      onChange={e => setCredit(idea.id, e.target.value)}
                      style={{ width: 80, padding: '4px 8px', fontSize: 11 }} />
                    <span style={{ fontSize: 9, color: 'var(--text3)' }}>credits</span>
                    {(myVotes[idea.id] ?? 0) > 0 && <span className="badge badge-accent mono">{myVotes[idea.id]}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="scroll-y" style={{ padding: 16, background: 'var(--panel2)' }}>
        <div className="sec-title" style={{ marginBottom: 12 }}>CREDIT ALLOCATION</div>
        <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
          {([['Weekly Budget', budget, 'var(--text)'], ['Allocated', alloc, 'var(--accent)'], ['Remaining', rem, rem < 200 ? 'var(--warn)' : 'var(--long)']] as [string, number, string][]).map(([l, v, c]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>{l}</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: c }}>{v} cr</span>
            </div>
          ))}
          <div style={{ marginTop: 6 }}><Bar val={alloc} max={budget} color={alloc >= 800 ? 'var(--long)' : alloc >= 400 ? 'var(--accent)' : 'var(--warn)'} /></div>
          {alloc < 800 && <div style={{ fontSize: 9, color: 'var(--warn)', marginTop: 6 }}>⚠ Must allocate ≥800cr (policy requirement)</div>}
        </div>

        <div className="sec-title" style={{ marginBottom: 8 }}>MY ALLOCATIONS</div>
        {Object.entries(myVotes).filter(([, v]) => v > 0).map(([id, cr]) => {
          const idea = ideas.find(i => i.id === id); if (!idea) return null;
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
              <DirBadge dir={idea.dir} /><span className="mono" style={{ fontSize: 10, fontWeight: 600, flex: 1 }}>{idea.ticker}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{cr} cr</span>
            </div>
          );
        })}
        {Object.values(myVotes).filter(v => v > 0).length === 0 && <div style={{ fontSize: 10, color: 'var(--text4)', textAlign: 'center', padding: '16px 0' }}>No allocations yet</div>}

        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 10, marginBottom: 6 }} onClick={submitVotes}>SUBMIT ALLOCATIONS</button>
          <div style={{ fontSize: 9, color: 'var(--text4)', textAlign: 'center' }}>Immutable · Audit logged</div>
        </div>

        {sel && (
          <div className="panel" style={{ padding: 12, marginTop: 14 }}>
            <div className="sec-title" style={{ marginBottom: 8 }}>IDEA DETAIL</div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{sel.ticker} <DirBadge dir={sel.dir} /></div>
            <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 8 }}>{sel.thesis}</div>
            {sel.imageUrl && <img src={sel.imageUrl} alt="chart" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 10 }} />}
            <div className="sec-title" style={{ marginBottom: 4, fontSize: 9 }}>CATALYSTS</div>
            {sel.catalysts.map((c, i) => <div key={i} style={{ fontSize: 9, color: 'var(--text2)', padding: '2px 0' }}>• {c}</div>)}
            <div className="sec-title" style={{ marginBottom: 4, marginTop: 8, fontSize: 9 }}>RISKS</div>
            {sel.risks.map((r, i) => <div key={i} style={{ fontSize: 9, color: 'var(--short)', padding: '2px 0' }}>⚠ {r}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
