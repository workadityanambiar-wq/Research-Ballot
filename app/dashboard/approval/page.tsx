'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DirBadge, StatusBadge } from '@/components/ui/Badge';

export default function ApprovalPage() {
  const { user, ideas, refreshIdeas } = useApp();
  const [modal, setModal] = useState<{ id: string; ticker: string; action: 'approve' | 'reject' } | null>(null);
  const [pin, setPin] = useState('');
  const [confirming, setConfirming] = useState(false);
  if (!user) return null;

  const pending = ideas.filter(i => i.approvalStatus === 'PENDING' || i.approvalStatus === 'REVIEW');

  const confirm = async () => {
    if (pin.length < 4) { alert('Enter 4-digit PIN.'); return; }
    setConfirming(true);
    try {
      const res = await fetch(`/api/ideas/${modal!.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: modal!.action, pin }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? 'Action failed.');
        return;
      }
      await refreshIdeas();
      setModal(null);
      setPin('');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {modal && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,9,12,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="panel-glow slide-up" style={{ padding: 28, width: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>🔐</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Re-Authentication Required</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 16 }}>Confirm <strong>{modal.action.toUpperCase()}</strong> for {modal.ticker}</div>
            <input className="inp mono" type="password" placeholder="4-digit PIN" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} style={{ textAlign: 'center', fontSize: 22, letterSpacing: 10, marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setModal(null); setPin(''); }} disabled={confirming}>CANCEL</button>
              <button className={`btn btn-sm ${modal.action === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={confirm} disabled={confirming}>{confirming ? 'CONFIRMING…' : `CONFIRM ${modal.action.toUpperCase()}`}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
        <div className="sec-hdr">
          <div><div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Trade Approval Workflow</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>Re-authentication required · Full audit trail · CIO may override PM decisions</div></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-warn">{pending.length} PENDING</span>
            <span className="badge badge-low">{ideas.filter(i => i.approvalStatus === 'APPROVED').length} APPROVED</span>
          </div>
        </div>
      </div>

      <div className="scroll-y" style={{ flex: 1, padding: 16 }}>
        {pending.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text4)' }}><div style={{ fontSize: 32, marginBottom: 8 }}>✓</div><div>All trades reviewed.</div></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {pending.map(idea => (
              <div key={idea.id} className="panel" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text4)' }}>{idea.id}</span>
                  <DirBadge dir={idea.dir} />
                  <span className="badge badge-dim">{idea.assetClass}</span>
                  <div style={{ marginLeft: 'auto' }}><StatusBadge status={idea.approvalStatus} /></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{idea.ticker}</div>
                  {(() => {
                    const qs = idea.quantScoreData;
                    if (!qs) return null;
                    const qColor = qs.finalQuantScore >= 80 ? 'var(--long)' : qs.finalQuantScore >= 70 ? 'var(--accent)' : qs.finalQuantScore >= 60 ? 'var(--warn)' : 'var(--short)';
                    return (
                      <div style={{ marginLeft: 'auto', padding: '4px 10px', background: 'var(--bg)', borderRadius: 4, border: `1px solid ${qColor}40`, textAlign: 'center' }}>
                        <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 1 }}>QUANT</div>
                        <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: qColor }}>{qs.finalQuantScore.toFixed(1)}</div>
                        <div style={{ fontSize: 7, color: qColor }}>{qs.quantLabel}</div>
                      </div>
                    );
                  })()}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                  {[
                    ['FINAL SCORE', idea.finalScore.toFixed(1), 'var(--accent)'],
                    ['EXP. RETURN', '+' + idea.expRet + '%', 'var(--long)'],
                    ['R/R RATIO', String(idea.rr), idea.rr >= 2 ? 'var(--long)' : 'var(--warn)'],
                    ['CONVICTION', idea.conv + '/10', ''],
                    ['CREDITS', idea.totalCredits.toLocaleString(), ''],
                    ['HOLD', idea.hold, ''],
                    ['MKT SCORE', idea.pmScore.toFixed(1), 'var(--accent)'],
                    ['SKILL', idea.skillScore.toFixed(1), 'var(--purple)'],
                  ].map(([l, v, c]) => (
                    <div key={l}><div style={{ fontSize: 8, color: 'var(--text4)' }}>{l}</div><div className="mono" style={{ fontSize: 12, fontWeight: 700, color: c || 'var(--text)' }}>{v}</div></div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.5, marginBottom: 10, borderLeft: '2px solid var(--border2)', paddingLeft: 8 }}>{idea.thesis.slice(0, 150)}…</div>
                {/* MT5 Snapshot — prices at submission + live P&L */}
                {(() => {
                  const ms = idea.marketSnapshot;
                  if (!ms) return null;
                  const hasPnl = ms.currentPnlPct != null;
                  const up = (ms.currentPnlPct ?? 0) >= 0;
                  const pnlColor = up ? 'var(--long)' : 'var(--short)';
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: hasPnl ? '1fr 1fr 1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 5, marginBottom: 10, padding: '8px 10px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}>
                      <div><div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 1 }}>SUBMIT CMP</div><div className="mono" style={{ fontSize: 11, fontWeight: 700 }}>{ms.cmp.toFixed(2)}</div></div>
                      <div><div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 1 }}>STOP</div><div className="mono" style={{ fontSize: 11, color: 'var(--short)' }}>{ms.stopPrice.toFixed(2)}</div></div>
                      <div><div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 1 }}>TARGET</div><div className="mono" style={{ fontSize: 11, color: 'var(--long)' }}>{ms.targetPrice.toFixed(2)}</div></div>
                      <div>
                        <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 1 }}>STATUS</div>
                        <div style={{ fontSize: 8, fontWeight: 700, color: ms.tradeStatus === 'TARGET_HIT' ? 'var(--long)' : ms.tradeStatus === 'STOP_HIT' ? 'var(--short)' : 'var(--text3)' }}>
                          {ms.tradeStatus.replace('_', ' ')}
                        </div>
                      </div>
                      {hasPnl && (
                        <div>
                          <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 1 }}>LIVE P&L</div>
                          <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: pnlColor }}>
                            {up ? '+' : ''}{ms.currentPnlPct!.toFixed(2)}%
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {/* Fallback entry/stop/target when no MT5 snapshot */}
                {!idea.marketSnapshot && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
                    <div><div style={{ fontSize: 8, color: 'var(--text4)' }}>ENTRY</div><div className="mono" style={{ fontSize: 11 }}>${idea.entry.toFixed(2)}</div></div>
                    <div><div style={{ fontSize: 8, color: 'var(--text4)' }}>STOP</div><div className="mono" style={{ fontSize: 11, color: 'var(--short)' }}>${idea.stop.toFixed(2)}</div></div>
                    <div><div style={{ fontSize: 8, color: 'var(--text4)' }}>TARGET</div><div className="mono" style={{ fontSize: 11, color: 'var(--long)' }}>${idea.target.toFixed(2)}</div></div>
                  </div>
                )}
                <hr className="divider" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-success btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setModal({ id: idea.id, ticker: idea.ticker, action: 'approve' })}>✓ APPROVE</button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setModal({ id: idea.id, ticker: idea.ticker, action: 'reject' })}>✗ REJECT</button>
                  {user.role === 'CIO' && <button className="btn btn-warn btn-sm" style={{ flex: 1, justifyContent: 'center' }}>↑ OVERRIDE</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {ideas.filter(i => i.approvalStatus === 'APPROVED').length > 0 && (
          <>
            <div className="sec-title" style={{ marginBottom: 8 }}>APPROVED TRADES</div>
            <div className="panel">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>IDEA</th><th>TICKER</th><th>DIR</th>
                    <th style={{ textAlign: 'right' }}>FINAL</th>
                    <th style={{ textAlign: 'right' }}>QUANT</th>
                    <th style={{ textAlign: 'right' }}>EXP. RET.</th>
                    <th style={{ textAlign: 'right' }}>LIVE P&L</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {ideas.filter(i => i.approvalStatus === 'APPROVED').map(i => {
                    const ms = i.marketSnapshot;
                    const hasPnl = ms?.currentPnlPct != null;
                    const pnlUp = (ms?.currentPnlPct ?? 0) >= 0;
                    const qs = i.quantScoreData;
                    const qColor = qs
                      ? qs.finalQuantScore >= 80 ? 'var(--long)' : qs.finalQuantScore >= 70 ? 'var(--accent)' : qs.finalQuantScore >= 60 ? 'var(--warn)' : 'var(--short)'
                      : 'var(--text4)';
                    return (
                      <tr key={i.id}>
                        <td className="mono" style={{ color: 'var(--text4)' }}>{i.id}</td>
                        <td><span className="mono" style={{ fontWeight: 700 }}>{i.ticker}</span></td>
                        <td><DirBadge dir={i.dir} /></td>
                        <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: 'var(--accent)' }}>{i.finalScore.toFixed(1)}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="mono" style={{ color: qColor }}>
                            {qs ? qs.finalQuantScore.toFixed(1) : '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: 'var(--long)' }}>+{i.expRet}%</span></td>
                        <td style={{ textAlign: 'right' }}>
                          {hasPnl
                            ? <span className="mono" style={{ fontWeight: 700, color: pnlUp ? 'var(--long)' : 'var(--short)' }}>{pnlUp ? '+' : ''}{ms!.currentPnlPct!.toFixed(2)}%</span>
                            : <span style={{ color: 'var(--text4)' }}>—</span>
                          }
                        </td>
                        <td>
                          <span style={{ fontSize: 8, fontWeight: 700, color: ms?.tradeStatus === 'TARGET_HIT' ? 'var(--long)' : ms?.tradeStatus === 'STOP_HIT' ? 'var(--short)' : 'var(--long)' }}>
                            {ms?.tradeStatus === 'TARGET_HIT' ? 'TARGET HIT' : ms?.tradeStatus === 'STOP_HIT' ? 'STOP HIT' : 'APPROVED'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
