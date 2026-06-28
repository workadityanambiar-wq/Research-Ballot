'use client';
import { useApp } from '@/context/AppContext';
import { useDashboardKPIs } from '@/hooks/useLiveData';
import { StatCard } from '@/components/ui/StatCard';
import { Bar } from '@/components/ui/Bar';
import { DirBadge, SevBadge } from '@/components/ui/Badge';
import { Sparkline, Donut } from '@/components/ui/Charts';
import { useState, useEffect } from 'react';
import { WEEK_ID } from '@/lib/data';
import { useBreakpoint } from '@/hooks/useBreakpoint';
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

const SECTOR_COLORS: Record<string, string> = {
  Technology: 'var(--accent)',
  Financials: 'var(--purple)',
  Consumer: 'var(--long)',
  Energy: 'var(--warn)',
  Cash: 'var(--text4)',
};

function fmtReturn(val: number | null | undefined, fallback = '--'): string {
  if (val == null) return fallback;
  return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
}

export default function DashboardPage() {
  const { user, ideas, votes } = useApp();
  const { data: kpis, loading: kpisLoading, error: kpisError } = useDashboardKPIs(WEEK_ID);
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

  const { isMobile, isTablet, cols } = useBreakpoint();

  if (!user) return null;

  const totalCredits = Object.values(votes).reduce((a, vobj) => a + Object.values(vobj).reduce((b, v) => b + v, 0), 0);

  // Sector donut from live KPIs
  const sectorSlices = (kpis?.sectorAllocation ?? [])
    .filter(s => s.pct > 0)
    .map(s => ({ val: s.pct, color: SECTOR_COLORS[s.sector] ?? 'var(--border2)' }));

  const activeAnalysts = kpis?.activeAnalysts ?? 0;
  const totalAnalysts = kpis?.totalAnalysts ?? 0;
  const inactiveAnalysts = totalAnalysts - activeAnalysts;

  const wtdReturn = fmtReturn(kpis?.portfolioReturnWtd);
  const ytdReturn = fmtReturn(kpis?.ytdReturn);
  const sharpeVal = kpis?.sharpe != null ? kpis.sharpe.toFixed(2) : '--';
  const perfSeries = kpis?.performanceSeries ?? [];
  const hasPerf = perfSeries.length >= 2;

  return (
    <div className="scroll-y dash-content" style={{ height: '100%', padding: 'var(--page-px)' }}>
      <div className="sec-hdr-resp" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, marginBottom: 2 }}>
            {user.role === 'CIO' ? 'Executive Dashboard' : 'Research Dashboard'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>
            {WEEK_ID} · Cycle Active · {ideas.length} live ideas · {ideas.filter(i => i.approvalStatus === 'APPROVED').length} approved
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {kpisError && <span className="badge badge-warn" style={{ fontSize: 8 }}>METRICS OFFLINE</span>}
          <span className="badge badge-low pulse">LIVE</span>
          {!isMobile && <span className="badge badge-dim">{WEEK_ID}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(5, 3, 2)},1fr)`, gap: 8, marginBottom: 12 }}>
        <StatCard
          label="Portfolio Return (WTD)"
          value={kpisLoading ? '…' : wtdReturn}
          color={kpis?.portfolioReturnWtd != null && kpis.portfolioReturnWtd >= 0 ? 'var(--long)' : kpis?.portfolioReturnWtd != null ? 'var(--short)' : 'var(--text)'}
          sub={kpis?.dataSource === 'live' ? 'from snapshots' : 'no snapshot data'}
        />
        <StatCard
          label="YTD Alpha"
          value={kpisLoading ? '…' : ytdReturn}
          color={kpis?.ytdReturn != null && kpis.ytdReturn >= 0 ? 'var(--long)' : 'var(--text)'}
          sub={`Sharpe: ${sharpeVal}`}
        />
        <StatCard label="Active Ideas" value={ideas.length} sub={`${WEEK_ID} cycle`} />
        <StatCard label="Market Credits" value={totalCredits.toLocaleString()} sub="Total allocated" />
        <StatCard
          label="Analysts Active"
          value={kpisLoading ? '…' : `${activeAnalysts}/${totalAnalysts}`}
          color="var(--accent)"
          sub={totalAnalysts > 0 ? `${inactiveAnalysts} inactive` : ''}
        />
      </div>

      {/* MT5 Connection widget */}
      <div className="panel" style={{ padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div className="panel" style={{ padding: 12 }}>
          <div className="sec-hdr" style={{ marginBottom: 8 }}><span className="sec-title">Top Ranked Ideas</span><span className="badge badge-accent">{WEEK_ID.split('-')[0]}</span></div>
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
          {sectorSlices.length > 0 ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Donut data={sectorSlices} size={90} />
              <div style={{ flex: 1 }}>
                {(kpis?.sectorAllocation ?? []).filter(s => s.pct > 0).map(s => (
                  <div key={s.sector} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: SECTOR_COLORS[s.sector] ?? 'var(--border2)', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, flex: 1, color: 'var(--text2)' }}>{s.sector}</span>
                    <span className="mono" style={{ fontSize: 10 }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text4)', fontSize: 10 }}>
              {kpisLoading ? 'Loading…' : 'No allocation data'}
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <div className="sec-hdr" style={{ marginBottom: 8 }}>
            <span className="sec-title">Portfolio Performance</span>
            <span className="mono" style={{ fontSize: 10, color: kpis?.ytdReturn != null && kpis.ytdReturn >= 0 ? 'var(--long)' : 'var(--text4)', fontWeight: 600 }}>
              {ytdReturn} YTD
            </span>
          </div>
          {hasPerf ? (
            <>
              <Sparkline data={perfSeries} w={220} h={80} color="var(--accent)" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 9, color: 'var(--text4)' }}>START</span>
                <span style={{ fontSize: 9, color: 'var(--text4)' }}>NOW</span>
              </div>
            </>
          ) : (
            <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text4)', fontSize: 10 }}>
              {kpisLoading ? 'Loading…' : 'No snapshot history — record PortfolioSnapshots to display chart'}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 10 }}>
        <div className="panel" style={{ padding: 12 }}>
          <div className="sec-hdr" style={{ marginBottom: 8 }}>
            <span className="sec-title">Ideas · Capital + Quant</span>
            <span className="badge badge-low pulse">LIVE</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(5, 4, 3)},1fr)`, gap: 4 }}>
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
