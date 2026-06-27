'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DirBadge } from '@/components/ui/Badge';
import { WEEK_ID } from '@/lib/data';

export default function BallotPage() {
  const { user, ideas, votes, setVotes } = useApp();

  const [picks, setPicks] = useState<string[]>(() => {
    if (!user) return [];
    return ideas
      .filter(i => (votes[i.id]?.[user.id] ?? 0) > 0 && i.authorId !== user.id)
      .sort((a, b) => (votes[b.id]?.[user.id] ?? 0) - (votes[a.id]?.[user.id] ?? 0))
      .slice(0, 3)
      .map(i => i.id);
  });
  const [submitted, setSubmitted] = useState(false);

  if (!user) return null;

  const toggle = (id: string) => {
    const idea = ideas.find(i => i.id === id);
    if (!idea || idea.authorId === user.id) return;
    if (picks.includes(id)) {
      setPicks(picks.filter(p => p !== id));
    } else if (picks.length < 3) {
      setPicks([...picks, id]);
    }
  };

  const submit = () => {
    if (picks.length < 2) return;
    const upd = { ...votes };
    Object.keys(upd).forEach(ideaId => {
      if (upd[ideaId]?.[user.id]) {
        const entry = { ...upd[ideaId] };
        delete entry[user.id];
        upd[ideaId] = entry;
      }
    });
    const credits = [900, 700, 500];
    picks.forEach((ideaId, idx) => {
      upd[ideaId] = { ...(upd[ideaId] ?? {}), [user.id]: credits[idx] };
    });
    setVotes(upd);
    setSubmitted(true);
  };

  if (submitted) {
    const pickedIdeas = picks.map(id => ideas.find(i => i.id === id)).filter(Boolean) as typeof ideas;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--long-dim)', border: '1px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--long)' }}>✓</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Ballot Submitted</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Your top {picks.length} picks for {WEEK_ID} have been recorded.</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          {pickedIdeas.map((idea, i) => (
            <div key={idea.id} className="panel" style={{ padding: '10px 16px', textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 4 }}>PICK #{i + 1}</div>
              <DirBadge dir={idea.dir} />
              <div className="mono" style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>{idea.ticker}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => setSubmitted(false)}>Edit Picks</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', height: '100%', overflow: 'hidden' }}>
      <div className="scroll-y" style={{ padding: 16, borderRight: '1px solid var(--border)' }}>
        <div className="sec-hdr" style={{ marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Weekly Research Ballot</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>Select your top 2–3 conviction ideas · {WEEK_ID} · Identities revealed after cycle closes</div>
          </div>
          <span className="badge badge-low pulse">OPEN</span>
        </div>
        <div style={{ marginBottom: 14, padding: '7px 10px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)', fontSize: 10, color: 'var(--text3)' }}>
          Click a card to select it · You cannot vote on your own ideas · Picks lock on submission
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ideas.map(idea => {
            const isOwn = idea.authorId === user.id;
            const pickIdx = picks.indexOf(idea.id);
            const isPicked = pickIdx >= 0;
            return (
              <div
                key={idea.id}
                onClick={() => toggle(idea.id)}
                style={{
                  background: isPicked ? 'var(--panel2)' : 'var(--panel)',
                  border: `1px solid ${isPicked ? 'rgba(37,99,235,.5)' : 'var(--border)'}`,
                  borderRadius: 4, padding: 14, cursor: isOwn ? 'not-allowed' : 'pointer',
                  opacity: isOwn ? 0.45 : 1, position: 'relative', transition: 'all .15s',
                  boxShadow: isPicked ? '0 0 20px rgba(37,99,235,.07)' : 'none',
                }}
              >
                {isPicked && (
                  <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                    {pickIdx + 1}
                  </div>
                )}
                {isOwn && (
                  <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, color: 'var(--warn)', background: 'var(--warn-dim)', padding: '1px 6px', borderRadius: 2 }}>YOURS</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 9, color: 'var(--text4)' }}>{idea.id}</span>
                  <DirBadge dir={idea.dir} />
                </div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{idea.ticker}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
                  <div><div style={{ fontSize: 8, color: 'var(--text4)' }}>CONV</div><div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{idea.conv}/10</div></div>
                  <div><div style={{ fontSize: 8, color: 'var(--text4)' }}>RET</div><div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--long)' }}>+{idea.expRet}%</div></div>
                  <div><div style={{ fontSize: 8, color: 'var(--text4)' }}>R/R</div><div className="mono" style={{ fontSize: 12, color: idea.rr >= 2 ? 'var(--long)' : 'var(--warn)' }}>{idea.rr}</div></div>
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)', lineHeight: 1.5, height: 36, overflow: 'hidden' }}>{idea.thesis.slice(0, 100)}…</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="scroll-y" style={{ padding: 16, background: 'var(--panel2)' }}>
        <div className="sec-title" style={{ marginBottom: 12 }}>YOUR PICKS · {WEEK_ID}</div>
        <div style={{ marginBottom: 12 }}>
          {[1, 2, 3].map(rank => {
            const id = picks[rank - 1];
            const idea = id ? ideas.find(i => i.id === id) : null;
            return (
              <div key={rank} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 6,
                background: idea ? 'var(--panel)' : 'var(--bg)',
                border: `1px solid ${idea ? 'rgba(37,99,235,.25)' : 'var(--border)'}`,
                borderRadius: 4, minHeight: 50,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: idea ? 'var(--accent)' : 'var(--border2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: idea ? '#fff' : 'var(--text4)', flexShrink: 0,
                }}>{rank}</div>
                {idea ? (
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <DirBadge dir={idea.dir} />
                      <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>{idea.ticker}</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text3)' }}>Conv {idea.conv}/10 · +{idea.expRet}% target</div>
                  </div>
                ) : (
                  <span style={{ fontSize: 10, color: 'var(--text4)', fontStyle: 'italic' }}>— empty slot —</span>
                )}
                {idea && (
                  <button onClick={e => { e.stopPropagation(); toggle(id!); }} style={{ background: 'none', border: 'none', color: 'var(--short)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: '7px 10px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)', marginBottom: 14, fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span><span style={{ color: picks.length >= 2 ? 'var(--long)' : 'var(--warn)', fontWeight: 700, fontFamily: 'var(--mono)' }}>{picks.length}/3</span> selected</span>
          <span style={{ color: 'var(--text4)' }}>min 2 required</span>
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: 10, marginBottom: 6, opacity: picks.length < 2 ? 0.5 : 1 }}
          disabled={picks.length < 2}
          onClick={submit}
        >
          SUBMIT BALLOT →
        </button>
        <div style={{ fontSize: 9, color: 'var(--text4)', textAlign: 'center' }}>Immutable after submission · Audit logged · {WEEK_ID}</div>
      </div>
    </div>
  );
}
