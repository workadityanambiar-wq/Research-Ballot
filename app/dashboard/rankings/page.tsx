'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { DirBadge, StatusBadge } from '@/components/ui/Badge';
import { Bar } from '@/components/ui/Bar';

type SortMode = 'final' | 'combined';

export default function RankingsPage() {
  const { user, ideas, users } = useApp();
  const { isMobile, cols } = useBreakpoint();
  const [exp, setExp]       = useState<string | null>(null);
  const [sort, setSort]     = useState<SortMode>('final');
  if (!user) return null;
  const showId = user.role === 'CIO';
  const sc = (s: number) => s >= 80 ? 'var(--purple)' : s >= 70 ? 'var(--accent)' : s >= 60 ? 'var(--long)' : 'var(--text2)';

  // Combined Score = 70% Research Capital (pmScore) + 30% Quant Score
  const combinedScore = (idea: { pmScore: number; quantScore: number }) =>
    0.7 * idea.pmScore + 0.3 * idea.quantScore;

  const sorted = [...ideas].sort((a, b) =>
    sort === 'combined' ? combinedScore(b) - combinedScore(a) : b.finalScore - a.finalScore,
  );

  return (
    <div className="scroll-y dash-content" style={{ height: '100%', padding: isMobile ? 12 : 16 }}>
      <div className="sec-hdr-resp" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, marginBottom: 2 }}>Trade Ranking Engine</div>
          {!isMobile && <div style={{ fontSize: 10, color: 'var(--text3)' }}>Score = 30% Prediction Market + 25% Analyst Skill + 20% Risk/Reward + 25% Quant Overlay{!showId && ' · Analyst identities hidden'}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            {(['final', 'combined'] as SortMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setSort(mode)}
                style={{
                  padding: '4px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
                  cursor: 'pointer', border: 'none', fontFamily: 'var(--sans)',
                  background: sort === mode ? 'var(--accent)' : 'var(--panel)',
                  color: sort === mode ? '#fff' : 'var(--text3)',
                }}
              >
                {mode === 'final' ? 'FINAL SCORE' : 'COMBINED'}
              </button>
            ))}
          </div>
          <span className="badge badge-dim">W26-2025</span>
          <span className="badge badge-low pulse">LIVE</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(4, 2, 2)},1fr)`, gap: 6, marginBottom: 12 }}>
        {([['Prediction Market', '30%', 'var(--accent)'], ['Analyst Skill', '25%', 'var(--purple)'], ['Risk / Reward', '20%', 'var(--long)'], ['Quant Overlay', '25%', 'var(--warn)']] as [string, string, string][]).map(([l, w, c]) => (
          <div key={l} className="panel" style={{ padding: '8px 10px', borderTop: `2px solid ${c}` }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 2 }}>{l}</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: c }}>{w}</div>
          </div>
        ))}
      </div>

      <div className="panel tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 36 }}>RNK</th><th>TICKER</th><th>DIR</th>
              <th style={{ textAlign: 'right' }}>FINAL</th>
              {sort === 'combined' && <th style={{ textAlign: 'right', color: 'var(--accent)' }}>COMBINED</th>}
              <th style={{ textAlign: 'right' }}>MKT</th>
              <th style={{ textAlign: 'right' }}>SKILL</th><th style={{ textAlign: 'right' }}>R/R</th><th style={{ textAlign: 'right' }}>QUANT</th>
              <th>CONVICTION</th><th style={{ textAlign: 'right' }}>EXP.RET</th><th style={{ textAlign: 'right' }}>CREDITS</th>
              {showId && <th>AUTHOR</th>}<th>STATUS</th><th style={{ width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((idea, i) => {
              const qd = idea.quantScoreData;
              const cs = combinedScore(idea);
              return (
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
                    {sort === 'combined' && (
                      <td style={{ textAlign: 'right' }}><span className="mono" style={{ fontSize: 13, fontWeight: 700, color: sc(cs) }}>{cs.toFixed(1)}</span></td>
                    )}
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
                      <td colSpan={showId ? (sort === 'combined' ? 15 : 14) : (sort === 'combined' ? 14 : 13)} style={{ padding: 0 }}>
                        <div style={{ padding: '14px 16px', background: 'var(--panel2)', borderTop: '1px solid var(--border)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr', gap: 14 }}>
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
                              {(() => {
                                const ms = idea.marketSnapshot;
                                if (!ms || ms.currentPnlPct == null) return null;
                                const up = ms.currentPnlPct >= 0;
                                const statusColor = ms.tradeStatus === 'TARGET_HIT' ? 'var(--long)' : ms.tradeStatus === 'STOP_HIT' ? 'var(--short)' : up ? 'var(--long)' : 'var(--short)';
                                return (
                                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                                    <div className="sec-title" style={{ marginBottom: 4, fontSize: 9 }}>LIVE P&L</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                      <span style={{ fontSize: 9, color: 'var(--text4)' }}>Current</span>
                                      <span className="mono" style={{ fontSize: 10, color: 'var(--text)' }}>${ms.currentPrice?.toFixed(2) ?? '—'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                      <span style={{ fontSize: 9, color: 'var(--text4)' }}>P&L %</span>
                                      <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: statusColor }}>
                                        {up ? '+' : ''}{ms.currentPnlPct.toFixed(2)}%
                                      </span>
                                    </div>
                                    {ms.mfe != null && ms.mfe > 0 && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                        <span style={{ fontSize: 9, color: 'var(--text4)' }}>MFE</span>
                                        <span className="mono" style={{ fontSize: 9, color: 'var(--long)' }}>+{ms.mfe.toFixed(2)}%</span>
                                      </div>
                                    )}
                                    {ms.mae != null && ms.mae < 0 && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                        <span style={{ fontSize: 9, color: 'var(--text4)' }}>MAE</span>
                                        <span className="mono" style={{ fontSize: 9, color: 'var(--short)' }}>{ms.mae.toFixed(2)}%</span>
                                      </div>
                                    )}
                                    {ms.tradeStatus !== 'OPEN' && (
                                      <div style={{ marginTop: 4, padding: '3px 6px', borderRadius: 3, textAlign: 'center', fontSize: 8, fontWeight: 700, background: ms.tradeStatus === 'TARGET_HIT' ? 'rgba(22,163,74,.12)' : 'rgba(220,38,38,.1)', color: ms.tradeStatus === 'TARGET_HIT' ? 'var(--long)' : 'var(--short)' }}>
                                        {ms.tradeStatus.replace('_', ' ')}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <div>
                              <div className="sec-title" style={{ marginBottom: 6 }}>QUANT BREAKDOWN</div>
                              {qd ? (
                                <>
                                  <div style={{ marginBottom: 8, padding: '5px 8px', background: 'var(--bg)', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 8, color: 'var(--text4)' }}>SCORE · {qd.quantLabel}</span>
                                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: sc(qd.finalQuantScore) }}>{qd.finalQuantScore.toFixed(1)}</span>
                                  </div>
                                  {([
                                    ['Trend', qd.trendScore, qd.trendLabel],
                                    ['Momentum', qd.momentumScore, qd.momentumLabel],
                                    ['Trend Quality', qd.trendQualityScore, qd.trendQualityLabel],
                                    ['MA Alignment', qd.maAlignmentScore, ''],
                                    ['Volatility', qd.volatilityScore, qd.volatilityLabel],
                                    ['S/R Levels', qd.srScore, ''],
                                    ['Breakout', qd.breakoutScore, ''],
                                    ['Volume', qd.volumeScore, ''],
                                  ] as [string, number, string][]).map(([l, v, lbl]) => (
                                    <div key={l} style={{ marginBottom: 4 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <span style={{ fontSize: 8, color: 'var(--text4)' }}>{l}{lbl ? ` · ${lbl}` : ''}</span>
                                        <span className="mono" style={{ fontSize: 8, color: sc(v * 10) }}>{v.toFixed(1)}</span>
                                      </div>
                                      <Bar val={v} max={10} color={sc(v * 10)} />
                                    </div>
                                  ))}
                                  <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                                    {[['RSI', qd.rsi14.toFixed(1)], ['ADX', qd.adx14.toFixed(1)]].map(([k, v]) => (
                                      <div key={k} style={{ padding: '3px 5px', background: 'var(--bg)', borderRadius: 3, border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: 7, color: 'var(--text4)' }}>{k}</div>
                                        <div className="mono" style={{ fontSize: 9 }}>{v}</div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <div style={{ fontSize: 9, color: 'var(--text4)', fontStyle: 'italic' }}>
                                  Quant data unavailable<br />
                                  <span style={{ fontSize: 8 }}>(submitted before MT5 integration)</span>
                                </div>
                              )}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
