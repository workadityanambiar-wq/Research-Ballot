'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DirBadge, StatusBadge } from '@/components/ui/Badge';
import { Bar } from '@/components/ui/Bar';

export default function RankingsPage() {
  const { user, ideas, users } = useApp();
  const [exp, setExp] = useState<string | null>(null);
  if (!user) return null;
  const showId = user.role === 'CIO';
  const sc = (s: number) => s >= 80 ? 'var(--purple)' : s >= 70 ? 'var(--accent)' : s >= 60 ? 'var(--long)' : 'var(--text2)';

  return (
    <div className="scroll-y" style={{ height: '100%', padding: 16 }}>
      <div className="sec-hdr" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Trade Ranking Engine</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Score = 40% Prediction Market + 25% Analyst Skill + 20% Risk/Reward + 15% Quant Overlay{!showId && ' · Analyst identities hidden'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}><span className="badge badge-dim">W26-2025</span><span className="badge badge-low pulse">LIVE</span></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
        {([['Prediction Market', '40%', 'var(--accent)'], ['Analyst Skill', '25%', 'var(--purple)'], ['Risk / Reward', '20%', 'var(--long)'], ['Quant Overlay', '15%', 'var(--warn)']] as [string, string, string][]).map(([l, w, c]) => (
          <div key={l} className="panel" style={{ padding: '8px 10px', borderTop: `2px solid ${c}` }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 2 }}>{l}</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: c }}>{w}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 36 }}>RNK</th><th>TICKER</th><th>DIR</th>
              <th style={{ textAlign: 'right' }}>FINAL</th><th style={{ textAlign: 'right' }}>MKT</th>
              <th style={{ textAlign: 'right' }}>SKILL</th><th style={{ textAlign: 'right' }}>R/R</th><th style={{ textAlign: 'right' }}>QUANT</th>
              <th>CONVICTION</th><th style={{ textAlign: 'right' }}>EXP.RET</th><th style={{ textAlign: 'right' }}>CREDITS</th>
              {showId && <th>AUTHOR</th>}<th>STATUS</th><th style={{ width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {ideas.map((idea, i) => (
              <>
                <tr key={idea.id} style={{ cursor: 'pointer' }} onClick={() => setExp(exp === idea.id ? null : idea.id)}>
                  <td>
                    <span style={{ width: 22, height: 22, borderRadius: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: i < 3 ? ['var(--purple-dim)', 'var(--accent-dim)', 'var(--long-dim)'][i] : 'var(--border)', color: i < 3 ? ['var(--purple)', 'var(--accent)', 'var(--long)'][i] : 'var(--text3)' }}>
                      {i + 1}
                    </span>
                  </td>
                  <td><span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{idea.ticker}</span></td>
                  <td><DirBadge dir={idea.dir} /></td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ fontSize: 14, fontWeight: 700, color: sc(idea.finalScore) }}>{idea.finalScore.toFixed(1)}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: sc(idea.pmScore) }}>{idea.pmScore.toFixed(1)}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: sc(idea.skillScore) }}>{idea.skillScore.toFixed(1)}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: sc(idea.rrScore) }}>{idea.rrScore.toFixed(1)}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: sc(idea.quantScore) }}>{idea.quantScore.toFixed(1)}</span></td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 56 }}><Bar val={idea.conv * 10} /></div><span className="mono" style={{ fontSize: 10 }}>{idea.conv}/10</span></div></td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: 'var(--long)' }}>+{idea.expRet}%</span></td>
                  <td style={{ textAlign: 'right' }}><span className="mono">{idea.totalCredits.toLocaleString()}</span></td>
                  {showId && <td><span className="mono" style={{ fontSize: 10, color: 'var(--text3)' }}>{(users.find(u => u.id === idea.authorId))?.name ?? '—'}</span></td>}
                  <td><StatusBadge status={idea.approvalStatus} /></td>
                  <td style={{ textAlign: 'center', color: 'var(--text4)', fontSize: 10 }}>{exp === idea.id ? '▲' : '▼'}</td>
                </tr>
                {exp === idea.id && (
                  <tr key={`${idea.id}-exp`}>
                    <td colSpan={showId ? 14 : 13} style={{ padding: 0 }}>
                      <div style={{ padding: '14px 16px', background: 'var(--panel2)', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14 }}>
                          <div>
                            <div className="sec-title" style={{ marginBottom: 6 }}>THESIS</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 10 }}>{idea.thesis}</div>
                            <div className="sec-title" style={{ marginBottom: 4, fontSize: 9 }}>CATALYSTS</div>
                            {idea.catalysts.map((c, j) => <div key={j} style={{ fontSize: 10, color: 'var(--text2)', padding: '2px 0' }}>• {c}</div>)}
                          </div>
                          <div>
                            <div className="sec-title" style={{ marginBottom: 6 }}>TRADE PARAMS</div>
                            {([['Entry', '$' + idea.entry.toFixed(2), ''], ['Stop', '$' + idea.stop.toFixed(2), 'var(--short)'], ['Target', '$' + idea.target.toFixed(2), 'var(--long)'], ['Hold', idea.hold, ''], ['Pos. Size', idea.posSize + '%', ''], ['R/R', String(idea.rr), 'var(--long)']] as [string, string, string][]).map(([l, v, c]) => (
                              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 9, color: 'var(--text4)' }}>{l}</span>
                                <span className="mono" style={{ fontSize: 10, color: c || 'var(--text)' }}>{v}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <div className="sec-title" style={{ marginBottom: 6 }}>QUANT SCORES</div>
                            {([['Rel. Strength', idea.rsScore || 75], ['Momentum', idea.momentumScore || 78], ['Earn. Revisions', idea.earningRevScore || 80], ['Volume Profile', 72], ['Factor Exposure', 68], ['Liquidity', 88]] as [string, number][]).map(([l, v]) => (
                              <div key={l} style={{ marginBottom: 5 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                  <span style={{ fontSize: 9, color: 'var(--text4)' }}>{l}</span>
                                  <span className="mono" style={{ fontSize: 9, color: 'var(--accent)' }}>{v}</span>
                                </div>
                                <Bar val={v} />
                              </div>
                            ))}
                          </div>
                          <div>
                            <div className="sec-title" style={{ marginBottom: 6 }}>RISKS</div>
                            {idea.risks.map((r, j) => <div key={j} style={{ fontSize: 10, color: 'var(--short)', padding: '2px 0' }}>⚠ {r}</div>)}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
