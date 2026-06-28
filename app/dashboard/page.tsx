'use client';
import { useApp } from '@/context/AppContext';
import { StatCard } from '@/components/ui/StatCard';
import { Bar } from '@/components/ui/Bar';
import { DirBadge, SevBadge } from '@/components/ui/Badge';
import { Sparkline, Donut } from '@/components/ui/Charts';
import { useState, useEffect } from 'react';
import type { AuditEntry } from '@/lib/types';

interface Mt5Health {
  status: string;
  mt5_connected: boolean;
  server?: string;
  account?: number;
  balance?: number;
  equity?: number;
  margin?: number;
  margin_level?: number;
  currency?: string;
}

export default function DashboardPage() {
  const { user, ideas, portfolio, votes } = useApp();
  const [recentAudit, setRecentAudit] = useState<AuditEntry[]>([]);
  const [mt5, setMt5] = useState<Mt5Health | null>(null);
  const [mt5Loading, setMt5Loading] = useState(true);

  useEffect(() => {
    if (user?.role === 'CIO') {
      fetch('/api/audit?limit=6')
        .then(r => r.ok ? r.json() : { entries: [] })
        .then(d => setRecentAudit(d.entries ?? []))
        .catch(() => {});
    }
  }, [user?.role]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/mt5/health')
      .then(r => r.json())
      .then(d => { setMt5(d); setMt5Loading(false); })
      .catch(() => { setMt5({ status: 'disconnected', mt5_connected: false }); setMt5Loading(false); });
  }, [user]);

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

      {/* MT5 Connection widget */}
      <div className="panel" style={{ padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: mt5Loading ? 'var(--text4)' : mt5?.mt5_connected ? 'var(--long)' : 'var(--short)',
            boxShadow: mt5?.mt5_connected ? '0 0 6px var(--long)' : undefined,
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)', letterSpacing: '.04em' }}>
            MT5
          </span>
          <span style={{ fontSize: 10, color: mt5?.mt5_connected ? 'var(--long)' : 'var(--text4)', fontWeight: 600 }}>
            {mt5Loading ? 'Checking…' : mt5?.mt5_connected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        {mt5?.mt5_connected && (
          <>
            <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
            {mt5.server && (
              <div>
                <div style={{ fontSize: 8, color: 'var(--text4)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 1 }}>Server</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text)' }}>{mt5.server}</div>
              </div>
            )}
            {mt5.account && (
              <div>
                <div style={{ fontSize: 8, color: 'var(--text4)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 1 }}>Account</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text)' }}>{mt5.account}</div>
              </div>
            )}
            {mt5.equity != null && (
              <div>
                <div style={{ fontSize: 8, color: 'var(--text4)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 1 }}>Equity</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--long)', fontWeight: 700 }}>{mt5.currency ?? '$'}{mt5.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            )}
            {mt5.balance != null && (
              <div>
                <div style={{ fontSize: 8, color: 'var(--text4)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 1 }}>Balance</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text)' }}>{mt5.currency ?? '$'}{mt5.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            )}
            {mt5.margin_level != null && (
              <div>
                <div style={{ fontSize: 8, color: 'var(--text4)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 1 }}>Margin Level</div>
                <div className="mono" style={{ fontSize: 10, color: mt5.margin_level > 200 ? 'var(--long)' : mt5.margin_level > 100 ? 'var(--warn)' : 'var(--short)', fontWeight: 700 }}>
                  {mt5.margin_level.toFixed(1)}%
                </div>
              </div>
            )}
          </>
        )}

        {!mt5Loading && !mt5?.mt5_connected && (
          <>
            <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
            <span style={{ fontSize: 10, color: 'var(--text4)' }}>
              MT5 service offline — start the Python MT5 service to enable live quotes and quant scoring.
            </span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto', fontSize: 9 }}
              onClick={() => {
                setMt5Loading(true);
                fetch('/api/mt5/health')
                  .then(r => r.json())
                  .then(d => { setMt5(d); setMt5Loading(false); })
                  .catch(() => { setMt5({ status: 'disconnected', mt5_connected: false }); setMt5Loading(false); });
              }}
            >
              RETRY
            </button>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div className="panel" style={{ padding: 12 }}>
          <div className="sec-hdr" style={{ marginBottom: 8 }}><span className="sec-title">Top Ranked Ideas</span><span className="badge badge-accent">W26</span></div>
          {ideas.slice(0, 5).map((idea, i) => {
            const qs = idea.quantScore;
            const qColor = qs >= 80 ? 'var(--long)' : qs >= 70 ? 'var(--accent)' : qs >= 60 ? 'var(--warn)' : qs > 0 ? 'var(--short)' : 'var(--text4)';
            return (
              <div key={idea.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--text4)', width: 16 }}>#{i + 1}</span>
                <span className="badge badge-dim mono" style={{ fontSize: 10, minWidth: 44 }}>{idea.ticker}</span>
                <DirBadge dir={idea.dir} />
                <div style={{ flex: 1 }}><Bar val={idea.finalScore} color={i === 0 ? 'var(--purple)' : i < 3 ? 'var(--accent)' : 'var(--long)'} /></div>
                <span className="mono" style={{ fontSize: 10, color: 'var(--accent)', width: 28, textAlign: 'right' }}>{idea.finalScore.toFixed(0)}</span>
                {qs > 0 && (
                  <span className="mono" style={{ fontSize: 9, color: qColor, width: 22, textAlign: 'right' }}>Q{qs.toFixed(0)}</span>
                )}
              </div>
            );
          })}
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
          <div className="sec-hdr" style={{ marginBottom: 8 }}>
            <span className="sec-title">Ideas · Capital + Quant</span>
            <span className="badge badge-low pulse">LIVE</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
            {ideas.map(idea => {
              const maxCredits = Math.max(...ideas.map(i => i.totalCredits), 1);
              const pct = (idea.totalCredits / maxCredits) * 100;
              const qs = idea.quantScore;
              const qColor = qs >= 80 ? 'var(--long)' : qs >= 70 ? 'var(--accent)' : qs >= 60 ? 'var(--warn)' : qs > 0 ? 'var(--short)' : 'var(--border2)';
              const ms = idea.marketSnapshot;
              const pnlUp = (ms?.currentPnlPct ?? 0) >= 0;
              return (
                <div key={idea.id} style={{ textAlign: 'center' }}>
                  <div style={{ height: 52, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 3 }}>
                    <div style={{ width: '60%', background: idea.dir === 'LONG' ? 'var(--long)' : 'var(--short)', opacity: .6, borderRadius: '1px 1px 0 0', height: `${Math.max(pct, 2)}%`, transition: 'height .5s' }} />
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 600 }}>{idea.ticker}</div>
                  {qs > 0 && (
                    <div style={{ fontSize: 8, color: qColor, fontFamily: 'var(--mono)', fontWeight: 700 }}>{qs.toFixed(0)}</div>
                  )}
                  {ms?.currentPnlPct != null && (
                    <div style={{ fontSize: 7, color: pnlUp ? 'var(--long)' : 'var(--short)', fontFamily: 'var(--mono)' }}>
                      {pnlUp ? '+' : ''}{ms.currentPnlPct.toFixed(1)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {ideas.some(i => i.quantScore > 0) && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'center' }}>
              {[['≥80 Strong', 'var(--long)', ideas.filter(i => i.quantScore >= 80).length],
                ['70–79 Good', 'var(--accent)', ideas.filter(i => i.quantScore >= 70 && i.quantScore < 80).length],
                ['60–69 Neutral', 'var(--warn)', ideas.filter(i => i.quantScore >= 60 && i.quantScore < 70).length],
                ['<60 Weak', 'var(--short)', ideas.filter(i => i.quantScore > 0 && i.quantScore < 60).length],
              ].map(([l, c, n]) => (
                <div key={String(l)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: String(c) }} />
                  <span style={{ fontSize: 8, color: 'var(--text4)' }}>{l}</span>
                  <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: String(c) }}>{n}</span>
                </div>
              ))}
            </div>
          )}
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
