'use client';
import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import RichEditor from '@/components/ui/RichEditor';
import type { PostMortem } from '@/lib/types';

export default function PostMortemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: ideaId } = use(params);
  const { user } = useApp();
  const { cols } = useBreakpoint();
  const [pm, setPm] = useState<PostMortem | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [idea, setIdea] = useState<{ ticker: string; dir: string; entry: number; target: number; stop: number; thesis: string } | null>(null);

  const load = useCallback(async () => {
    const [ideaRes, pmRes] = await Promise.all([
      fetch(`/api/research/${ideaId}`),
      fetch(`/api/postmortem/${ideaId}`),
    ]);
    if (ideaRes.ok) { const d = await ideaRes.json(); setIdea(d.idea); }
    if (pmRes.ok) { setPm(await pmRes.json()); }
    setLoading(false);
  }, [ideaId]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const createPm = async () => {
    setCreating(true);
    const r = await fetch(`/api/postmortem/${ideaId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    if (r.ok) { setPm(await r.json()); }
    setCreating(false);
  };

  const saveField = async (field: string, value: string) => {
    await fetch(`/api/postmortem/${ideaId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  };

  const saveNum = async (field: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const r = await fetch(`/api/postmortem/${ideaId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: num }),
    });
    if (r.ok) { const d = await r.json(); setPm(d); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>
      LOADING…
    </div>
  );

  return (
    <div className="scroll-y dash-content" style={{ flex: 1, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href={`/dashboard/research/${ideaId}`} style={{ color: 'var(--text4)', fontSize: 18 }}>←</Link>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Post Mortem · {ideaId}</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            {idea?.ticker} {idea?.dir} · Entry ${idea?.entry} → Target ${idea?.target}
          </p>
        </div>
      </div>

      {!pm ? (
        <div className="panel" style={{ padding: 40, textAlign: 'center', maxWidth: 500 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No post mortem yet</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
            Create a post mortem to document what happened, what worked, and what to learn.
          </div>
          <button className="btn btn-primary" onClick={createPm} disabled={creating}>
            {creating ? 'CREATING…' : '+ CREATE POST MORTEM'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>
          {/* Trade data */}
          <div className="panel" style={{ padding: 16 }}>
            <div className="sec-title" style={{ marginBottom: 12 }}>Trade Data</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(4, 2, 2)}, 1fr)`, gap: 10 }}>
              {[
                { label: 'Entry Price', field: 'entryPrice', val: pm.entryPrice },
                { label: 'Exit Price', field: 'exitPrice', val: pm.exitPrice },
                { label: 'Actual Return (%)', field: 'actualReturn', val: pm.actualReturn },
                { label: 'Max Drawdown (%)', field: 'maxDrawdown', val: pm.maxDrawdown },
              ].map(({ label, field, val }) => (
                <div key={field}>
                  <div className="form-label">{label}</div>
                  <input className="inp" type="number" defaultValue={val ?? ''} placeholder="0"
                    onBlur={e => saveNum(field, e.target.value)} />
                </div>
              ))}
            </div>
            {pm.actualReturn !== null && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: pm.actualReturn >= 0 ? 'var(--long-dim)' : 'var(--short-dim)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--mono)', color: pm.actualReturn >= 0 ? 'var(--long)' : 'var(--short)' }}>
                  {pm.actualReturn >= 0 ? '+' : ''}{pm.actualReturn}%
                </span>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Actual return on position</span>
              </div>
            )}
          </div>

          {/* Analysis sections */}
          {[
            { field: 'whatWorked', label: 'What Worked', placeholder: 'Catalysts that played out, thesis elements that were correct…' },
            { field: 'whatFailed', label: 'What Failed', placeholder: 'Catalysts that did not materialize, incorrect assumptions…' },
            { field: 'mistakes', label: 'Mistakes Made', placeholder: 'Entry timing, position sizing, risk management errors…' },
            { field: 'lessonsLearned', label: 'Lessons Learned', placeholder: 'Key takeaways for future investment decisions…' },
            { field: 'futureAction', label: 'Future Action', placeholder: 'How will you apply these lessons to future ideas?' },
            { field: 'committeeNotes', label: 'Committee Notes', placeholder: 'Investment committee feedback and remarks…' },
          ].map(({ field, label, placeholder }) => (
            <div key={field} className="panel" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{label}</div>
              <RichEditor
                value={(pm as unknown as Record<string, string | null>)[field] ?? ''}
                onSave={v => saveField(field, v)}
                placeholder={placeholder}
                minHeight={160}
              />
            </div>
          ))}

          {/* Rating */}
          <div className="panel" style={{ padding: 16 }}>
            <div className="sec-title" style={{ marginBottom: 8 }}>Overall Rating</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => fetch(`/api/postmortem/${ideaId}`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ rating: n }),
                }).then(r => r.json()).then(d => setPm(d))}
                  style={{
                    width: 40, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: pm.rating === n ? 'var(--warn)' : 'var(--bg)',
                    color: pm.rating === n ? '#fff' : 'var(--text3)',
                    fontSize: 18, fontWeight: 700, transition: 'all .12s',
                  }}>
                  {n}
                </button>
              ))}
              <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center', marginLeft: 8 }}>
                {pm.rating ? `${pm.rating}/5` : 'Select rating'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
