'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { TierBadge } from '@/components/ui/Badge';
import { Bar } from '@/components/ui/Bar';
import { ROLE_COLOR, TIER_W, TIER_COLOR } from '@/lib/permissions';

export default function AnalystsPage() {
  const { user, users, dataLoading } = useApp();
  const { cols } = useBreakpoint();
  const [tab, setTab] = useState<'overview' | 'idea' | 'allocator'>('overview');
  if (!user) return null;
  if (dataLoading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text4)', fontSize: 11 }}>Loading…</div>;

  const allUsers = [...users].sort((a, b) => b.researchScore - a.researchScore);

  return (
    <div className="dash-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="sec-hdr" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Analyst Quality Scoring</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>Score = 40% Hit Rate + 20% Avg Return + 15% Sharpe + 10% Drawdown + 10% Consistency + 5% Peer Review</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['overview', 'Overview'], ['idea', 'Idea Creator'], ['allocator', 'Capital Allocator']] as [string, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t as typeof tab)} style={{ padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'var(--sans)', color: tab === t ? 'var(--accent)' : 'var(--text3)', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, transition: 'all .15s' }}>{l}</button>
          ))}
        </div>
      </div>

      <div className="scroll-y" style={{ flex: 1, padding: 16 }}>
        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(3, 2, 1)},1fr)`, gap: 8, marginBottom: 14 }}>
              {(['A+', 'A', 'B'] as const).map(t => {
                const colors: Record<string, string> = { 'A+': 'var(--purple)', A: 'var(--accent)', B: 'var(--long)' };
                const labels: Record<string, string> = { 'A+': 'Elite', A: 'Strong', B: 'Average' };
                const c = colors[t];
                return (
                  <div key={t} className="panel" style={{ padding: 12, borderTop: `2px solid ${c}` }}>
                    <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 4 }}>{labels[t]}</div>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: c }}>Tier {t}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{users.filter(u => u.tier === t).length} analysts</span>
                      <span className="badge" style={{ background: `rgba(${c === 'var(--purple)' ? '168,85,247' : c === 'var(--accent)' ? '14,165,233' : '34,197,94'},.1)`, color: c, border: `1px solid ${c}`, fontSize: 9 }}>{TIER_W[t]}x weight</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="panel tbl-wrap">
              <table className="tbl">
                <thead><tr><th>#</th><th>ANALYST</th><th>TITLE</th><th>TIER</th><th style={{ textAlign: 'right' }}>RESEARCH SCORE</th><th style={{ textAlign: 'right' }}>HIT RATE</th><th style={{ textAlign: 'right' }}>AVG RET</th><th style={{ textAlign: 'right' }}>SHARPE</th><th style={{ textAlign: 'right' }}>DRAW. CTRL</th><th style={{ textAlign: 'right' }}>CONSISTENCY</th><th style={{ textAlign: 'right' }}>PEER</th><th>VOTE WT</th></tr></thead>
                <tbody>
                  {allUsers.map((u, i) => (
                    <tr key={u.id}>
                      <td><span className="mono" style={{ color: 'var(--text4)' }}>{i + 1}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 2, background: 'var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: ROLE_COLOR[u.role] ?? 'var(--text)' }}>{u.name.split(' ').map(n => n[0]).join('')}</div>
                          <span style={{ fontWeight: 600, fontSize: 11 }}>{u.name}</span>
                        </div>
                      </td>
                      <td><span style={{ fontSize: 9, color: 'var(--text3)' }}>{u.title}</span></td>
                      <td><TierBadge tier={u.tier} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                          <div style={{ width: 60 }}><Bar val={u.researchScore} color={TIER_COLOR[u.tier]} /></div>
                          <span className="mono" style={{ fontWeight: 700, color: TIER_COLOR[u.tier], width: 24 }}>{u.researchScore}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}><span className="mono">{u.hitRate}%</span></td>
                      <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: 'var(--long)' }}>+{u.avgRet}%</span></td>
                      <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: 'var(--accent)' }}>{u.sharpe}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="mono">{u.drawCtrl}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="mono">{u.consistency}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="mono">{u.peerScore}</span></td>
                      <td><span className="mono" style={{ color: TIER_W[u.tier] === 1.5 ? 'var(--purple)' : TIER_W[u.tier] === 1.25 ? 'var(--accent)' : 'var(--long)' }}>{TIER_W[u.tier]}x</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {(tab === 'idea' || tab === 'allocator') && (
          <div className="panel tbl-wrap">
            <div style={{ padding: '10px 12px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
                {tab === 'idea' ? 'Idea Creator Score: alpha generated, hit rate, risk-adjusted returns on submitted ideas.' : 'Capital Allocator Score: performance of ideas voted for — ability to identify winners.'}
              </div>
            </div>
            <table className="tbl">
              <thead><tr><th>#</th><th>ANALYST</th><th>TIER</th><th style={{ textAlign: 'right' }}>{tab === 'idea' ? 'IDEA SCORE' : 'ALLOC SCORE'}</th><th style={{ textAlign: 'right' }}>HIT RATE</th><th style={{ textAlign: 'right' }}>AVG ALPHA</th><th style={{ textAlign: 'right' }}>SHARPE</th><th>PROFILE</th></tr></thead>
              <tbody>
                {[...users].sort((a, b) => (tab === 'idea' ? b.ideaScore - a.ideaScore : b.allocScore - a.allocScore)).map((u, i) => {
                  const score = tab === 'idea' ? u.ideaScore : u.allocScore;
                  const diff = u.ideaScore - u.allocScore;
                  const profile = Math.abs(diff) < 5 ? 'Balanced' : diff > 10 ? 'Idea Specialist' : diff > 5 ? 'Better Picker' : diff < -10 ? 'Allocation Specialist' : 'Slight Allocator Edge';
                  return (
                    <tr key={u.id}>
                      <td><span className="mono" style={{ color: 'var(--text4)' }}>{i + 1}</span></td>
                      <td><span style={{ fontWeight: 600 }}>{u.name}</span></td>
                      <td><TierBadge tier={u.tier} /></td>
                      <td style={{ textAlign: 'right' }}><span className="mono" style={{ fontSize: 13, fontWeight: 700, color: score >= 80 ? 'var(--purple)' : score >= 70 ? 'var(--accent)' : score >= 60 ? 'var(--long)' : 'var(--text2)' }}>{score}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="mono">{u.hitRate}%</span></td>
                      <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: 'var(--long)' }}>+{u.avgRet}%</span></td>
                      <td style={{ textAlign: 'right' }}><span className="mono">{u.sharpe}</span></td>
                      <td><span style={{ fontSize: 9, color: 'var(--text3)' }}>{profile}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
