'use client';
import { useApp } from '@/context/AppContext';
import { StatCard } from '@/components/ui/StatCard';
import { Bar } from '@/components/ui/Bar';
import { DirBadge, SevBadge } from '@/components/ui/Badge';
import { Sparkline, Donut } from '@/components/ui/Charts';
import { useState, useEffect } from 'react';
import type { AuditEntry } from '@/lib/types';

export default function DashboardPage() {
  const { user, ideas, portfolio, votes } = useApp();
  const [recentAudit, setRecentAudit] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (user?.role === 'CIO') {
      fetch('/api/audit?limit=6')
        .then(r => r.ok ? r.json() : { entries: [] })
        .then(d => setRecentAudit(d.entries ?? []))
        .catch(() => {});
    }
  }, [user?.role]);

  if (!user) return null;

  const perfData = [12, 14, 11, 16, 15, 18, 17, 19, 18, 21, 20, 22, 21, 23];
  const sectorData = [{ val: 55, color: 'var(--accent)' }, { val: 16, color: 'var(--purple)' }, { val: 8, color: 'var(--long)' }, { val: 8, color: 'var(--warn)' }, { val: 13, color: 'var(--text4)' }];
  const sectorLabels = ['Technology', 'Financials', 'Consumer', 'Energy', 'Cash'];
  const totalCredits = Object.values(votes).reduce((a, vobj) => a + Object.values(vobj).reduce((b, v) => b + v, 0), 0);

  return (
    <div className="scroll-y" style={{ height: '100%', padding: 16 }}>
      <div className="sec-hdr">
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
            {user.role === 'CIO' ? 'Executive Dashboard' : 'Research Dashboard'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Week 26, 2025 · Cycle Active · {ideas.length} live ideas · {ideas.filter(i => i.approvalStatus === 'APPROVED').length} approved</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-low pulse">LIVE</span>
          <span className="badge badge-dim">W26-2025</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 12 }}>
        <StatCard label="Portfolio Return (WTD)" value="+4.82%" color="var(--long)" sub="vs SPX +0.38%" />
        <StatCard label="YTD Alpha" value="+18.34%" color="var(--long)" sub="Sharpe: 1.74" />
        <StatCard label="Active Ideas" value={ideas.length} sub="W26-2025 cycle" />
        <StatCard label="Market Credits" value={totalCredits.toLocaleString()} sub="Total allocated" />
        <StatCard label="Analysts Active" value="14/16" color="var(--accent)" sub="2 inactive" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div className="panel" style={{ padding: 12 }}>
          <div className="sec-hdr" style={{ marginBottom: 8 }}><span className="sec-title">Top Ranked Ideas</span><span className="badge badge-accent">W26</span></div>
          {ideas.slice(0, 5).map((idea, i) => (
            <div key={idea.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text4)', width: 16 }}>#{i + 1}</span>
              <span className="badge badge-dim mono" style={{ fontSize: 10, minWidth: 44 }}>{idea.ticker}</span>
              <DirBadge dir={idea.dir} />
              <div style={{ flex: 1 }}><Bar val={idea.finalScore} color={i === 0 ? 'var(--purple)' : i < 3 ? 'var(--accent)' : 'var(--long)'} /></div>
              <span className="mono" style={{ fontSize: 10, color: 'var(--accent)', width: 28, textAlign: 'right' }}>{idea.finalScore.toFixed(0)}</span>
            </div>
          ))}
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <div className="sec-hdr" style={{ marginBottom: 8 }}><span className="sec-title">Sector Exposure</span></div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Donut data={sectorData} size={90} />
            <div style={{ flex: 1 }}>
              {sectorLabels.map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: sectorData[i].color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, flex: 1, color: 'var(--text2)' }}>{s}</span>
                  <span className="mono" style={{ fontSize: 10 }}>{sectorData[i].val}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <div className="sec-hdr" style={{ marginBottom: 8 }}><span className="sec-title">Portfolio Performance</span><span className="mono" style={{ fontSize: 10, color: 'var(--long)', fontWeight: 600 }}>+18.34% YTD</span></div>
          <Sparkline data={perfData} w={220} h={80} color="var(--accent)" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: 'var(--text4)' }}>JAN</span><span style={{ fontSize: 9, color: 'var(--text4)' }}>JUN</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
        <div className="panel" style={{ padding: 12 }}>
          <div className="sec-hdr" style={{ marginBottom: 8 }}><span className="sec-title">Ideas · Capital Flow</span><span className="badge badge-low pulse">LIVE</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
            {ideas.map(idea => {
              const maxCredits = Math.max(...ideas.map(i => i.totalCredits), 1);
              const pct = (idea.totalCredits / maxCredits) * 100;
              return (
                <div key={idea.id} style={{ textAlign: 'center' }}>
                  <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 3 }}>
                    <div style={{ width: '70%', background: idea.dir === 'LONG' ? 'var(--long)' : 'var(--short)', opacity: .7, borderRadius: '1px 1px 0 0', height: `${Math.max(pct, 2)}%`, transition: 'height .5s' }} />
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 600 }}>{idea.ticker}</div>
                  <div style={{ fontSize: 8, color: 'var(--text4)' }}>{idea.totalCredits.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <div className="sec-hdr" style={{ marginBottom: 8 }}><span className="sec-title">Recent Activity</span></div>
          {user.role !== 'CIO' ? (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text4)', fontSize: 10 }}>CIO access only</div>
          ) : recentAudit.length === 0 ? (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text4)', fontSize: 10 }}>No recent activity</div>
          ) : (
            recentAudit.map((log, i) => (
              <div key={log.id} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: i < recentAudit.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                <span className="mono" style={{ fontSize: 8, color: 'var(--text4)', minWidth: 50, marginTop: 1 }}>{log.ts.split(' ')[1]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--text2)', lineHeight: 1.3 }}>{log.action.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 1 }}>{log.detail.slice(0, 52)}…</div>
                </div>
                <SevBadge sev={log.risk} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
