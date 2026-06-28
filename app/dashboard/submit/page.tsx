'use client';
import { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { DirBadge } from '@/components/ui/Badge';
import TickerSearch from '@/components/ui/TickerSearch';
import { WEEK_ID, IDEA_LIMIT_PER_WEEK } from '@/lib/data';

export default function SubmitPage() {
  const { user, ideas, refreshIdeas } = useApp();
  if (!user) return null;

  const wkCount = ideas.filter(i => i.authorId === user.legacyId && i.weekId === WEEK_ID).length;
  const [f, setF] = useState({ ticker: '', assetClass: 'US Equities', dir: 'LONG', entry: '', stop: '', target: '', hold: '1-3M', posSize: '', conv: 7, expRet: '', expDD: '', thesis: '', catalysts: '', risks: '' });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgDrag, setImgDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const s = (k: string, v: string | number) => setF(p => ({ ...p, [k]: v }));

  const loadImage = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => setImageUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const rr = f.entry && f.stop && f.target
    ? ((parseFloat(f.target) - parseFloat(f.entry)) / (parseFloat(f.entry) - parseFloat(f.stop))).toFixed(2)
    : '-';

  const submit = async () => {
    if (!f.ticker || !f.entry || !f.stop || !f.target || !f.thesis) { alert('Please complete all required fields.'); return; }
    if (wkCount >= IDEA_LIMIT_PER_WEEK) { alert('Weekly limit reached.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: f.ticker, assetClass: f.assetClass, dir: f.dir,
          entry: f.entry, stop: f.stop, target: f.target, hold: f.hold,
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

  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="panel slide-up" style={{ padding: 32, maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Idea Submitted</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>Your identity has been anonymized. The idea will appear in the prediction market for anonymous review.</div>
        <div style={{ marginTop: 20 }}><button className="btn btn-ghost" onClick={() => setDone(false)}>SUBMIT ANOTHER ({IDEA_LIMIT_PER_WEEK - wkCount - 1} remaining)</button></div>
      </div>
    </div>
  );

  if (wkCount >= IDEA_LIMIT_PER_WEEK) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="panel" style={{ padding: 32, textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>⛔</div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Weekly Limit Reached</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>You have submitted {IDEA_LIMIT_PER_WEEK}/{IDEA_LIMIT_PER_WEEK} ideas this week. Resets Monday 00:00 UTC.</div>
      </div>
    </div>
  );

  return (
    <div className="scroll-y" style={{ height: '100%', padding: 16 }}>
      <div className="sec-hdr" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Submit Trade Idea</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Anonymous on submission · No edits after submission · Audit logged</div>
        </div>
        <div className="panel" style={{ padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>WEEKLY LIMIT</span>
          <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: wkCount < IDEA_LIMIT_PER_WEEK ? 'var(--accent)' : 'var(--short)' }}>{wkCount}/{IDEA_LIMIT_PER_WEEK}</span>
          <span className={`badge ${wkCount < IDEA_LIMIT_PER_WEEK ? 'badge-low' : 'badge-high'}`}>{IDEA_LIMIT_PER_WEEK - wkCount} left</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
        <div>
          <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
            <div className="sec-title" style={{ marginBottom: 12 }}>TRADE PARAMETERS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><div className="form-label">TICKER *</div>
                <TickerSearch value={f.ticker} onSelect={(ticker) => s('ticker', ticker)} placeholder="Search ticker…" />
              </div>
              <div><div className="form-label">ASSET CLASS</div>
                <select className="inp" value={f.assetClass} onChange={e => s('assetClass', e.target.value)}>
                  {['US Equities', 'Intl Equities', 'Fixed Income', 'Commodities', 'FX', 'Derivatives'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div><div className="form-label">DIRECTION</div>
                <select className="inp" value={f.dir} onChange={e => s('dir', e.target.value)}>
                  <option value="LONG">LONG</option><option value="SHORT">SHORT</option>
                </select>
              </div>
              <div><div className="form-label">HOLD PERIOD</div>
                <select className="inp" value={f.hold} onChange={e => s('hold', e.target.value)}>
                  {['<1M', '1-3M', '2-4M', '3-6M', '4-8M', '6-12M'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
              {([['ENTRY *', 'entry', '875.50'], ['STOP LOSS *', 'stop', '810.00'], ['TARGET *', 'target', '1050.00'], ['POS. SIZE %', 'posSize', '2.5']] as [string, string, string][]).map(([l, k, ph]) => (
                <div key={k}><div className="form-label">{l}</div><input className="inp mono" type="number" placeholder={ph} value={(f as Record<string, string | number>)[k] as string} onChange={e => s(k, e.target.value)} /></div>
              ))}
              <div><div className="form-label">CONVICTION</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input className="inp mono" type="number" min="1" max="10" value={f.conv} onChange={e => s('conv', Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} style={{ width: 56 }} />
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>/10</span>
                </div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
            <div className="sec-title" style={{ marginBottom: 12 }}>INVESTMENT THESIS</div>
            <div style={{ marginBottom: 10 }}><div className="form-label">INVESTMENT THESIS *</div><textarea className="inp" placeholder="Describe your investment thesis…" value={f.thesis} onChange={e => s('thesis', e.target.value)} style={{ minHeight: 72 }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><div className="form-label">KEY CATALYSTS (one per line)</div><textarea className="inp" placeholder="Q3 earnings beat&#10;Product launch" value={f.catalysts} onChange={e => s('catalysts', e.target.value)} style={{ minHeight: 60 }} /></div>
              <div><div className="form-label">RISKS TO THESIS (one per line)</div><textarea className="inp" placeholder="Macro headwinds&#10;Competitive pressure" value={f.risks} onChange={e => s('risks', e.target.value)} style={{ minHeight: 60 }} /></div>
            </div>
          </div>

          <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
            <div className="sec-title" style={{ marginBottom: 10 }}>SUPPORTING CHART / IMAGE <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text4)' }}>(optional)</span></div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) loadImage(f); }} />
            {imageUrl ? (
              <div style={{ position: 'relative' }}>
                <img src={imageUrl} alt="Supporting chart" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)' }} />
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
                onDrop={e => { e.preventDefault(); setImgDrag(false); const f = e.dataTransfer.files[0]; if (f) loadImage(f); }}
                style={{ border: `1.5px dashed ${imgDrag ? 'var(--accent)' : 'var(--border2)'}`, borderRadius: 6, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: imgDrag ? 'var(--accent-dim)' : 'var(--bg)', transition: 'all .15s' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>📈</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Drop a chart or click to upload</div>
                <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 4 }}>PNG, JPG, GIF — max 5 MB</div>
              </div>
            )}
          </div>

          <div className="panel" style={{ padding: 14 }}>
            <div className="sec-title" style={{ marginBottom: 12 }}>EXPECTED METRICS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div><div className="form-label">EXP. RETURN %</div><input className="inp mono" type="number" placeholder="20.5" value={f.expRet} onChange={e => s('expRet', e.target.value)} /></div>
              <div><div className="form-label">EXP. DRAWDOWN %</div><input className="inp mono" type="number" placeholder="-7.5" value={f.expDD} onChange={e => s('expDD', e.target.value)} /></div>
              <div><div className="form-label">RISK / REWARD</div><div className="inp mono" style={{ color: parseFloat(rr) >= 2 ? 'var(--long)' : parseFloat(rr) >= 1 ? 'var(--warn)' : 'var(--short)', fontWeight: 600 }}>{rr}</div></div>
            </div>
          </div>
        </div>

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
                <div><div style={{ fontSize: 8, color: 'var(--text4)' }}>CONVICTION</div><div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{f.conv}/10</div></div>
                <div><div style={{ fontSize: 8, color: 'var(--text4)' }}>EXP. RETURN</div><div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--long)' }}>+{f.expRet || '—'}%</div></div>
                <div><div style={{ fontSize: 8, color: 'var(--text4)' }}>R/R RATIO</div><div className="mono" style={{ fontSize: 13, color: parseFloat(rr) >= 2 ? 'var(--long)' : 'var(--text)' }}>{rr}</div></div>
                <div><div style={{ fontSize: 8, color: 'var(--text4)' }}>HOLD PERIOD</div><div className="mono" style={{ fontSize: 13 }}>{f.hold}</div></div>
              </div>
              {f.thesis && <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.5, marginBottom: 6 }}>{f.thesis.slice(0, 100)}…</div>}
              {imageUrl && <img src={imageUrl} alt="chart" style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border)', marginBottom: 6 }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 9, color: 'var(--text4)' }}>AUTHOR:</span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--text4)' }}>████████ [ANONYMOUS]</span>
              </div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 12 }} onClick={submit} disabled={submitting}>{submitting ? 'SUBMITTING…' : '✦  SUBMIT IDEA  →'}</button>
          <div style={{ marginTop: 8, fontSize: 9, color: 'var(--text4)', textAlign: 'center' }}>Identity anonymized · No edits · Audit logged</div>
        </div>
      </div>
    </div>
  );
}
