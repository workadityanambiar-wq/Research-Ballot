'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface Summary {
  totalEquity: number; cashBalance: number; grossExposure: number; netExposure: number;
  longExposure: number; shortExposure: number; unrealizedPnl: number; realizedPnl: number;
  openPositions: number; closedPositions: number; activeTrades: number; proposals: number;
  winRate: number; avgGain: number; avgLoss: number; profitFactor: number;
  bestReturn: number; worstReturn: number; bySector: Record<string, number>; byStrategy: Record<string, number>;
}

interface TimelineEvent {
  id: string; tradeId: string; eventType: string; description: string;
  price: number | null; createdBy: string; createdAt: string;
  trade: { id: string; ticker: string; dir: string } | null;
}

interface Alert {
  id: string; alertType: string; message: string; severity: string; isRead: boolean;
  createdAt: string; trade: { id: string; ticker: string } | null;
}

export default function CIOPage() {
  const { user } = useApp();
  const { isMobile, cols } = useBreakpoint();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [sumRes, timeRes, alertRes] = await Promise.all([
      fetch('/api/portfolio/summary'),
      fetch('/api/portfolio/timeline?take=20'),
      fetch('/api/alerts?unread=1'),
    ]);
    if (sumRes.ok) setSummary(await sumRes.json());
    if (timeRes.ok) setTimeline(await timeRes.json());
    if (alertRes.ok) setAlerts(await alertRes.json());
    setLoading(false);
  }, []);

  const dismissAlert = async (id: string) => {
    await fetch(`/api/alerts/${id}`, { method: 'PATCH' });
    setAlerts(a => a.filter(x => x.id !== id));
  };

  useEffect(() => { if (user) load(); }, [user, load]);
  if (!user) return null;
  if (user.role !== 'CIO' && user.role !== 'PM') {
    return <div style={{ padding: 40, color: 'var(--short)', fontSize: 13 }}>Access restricted to CIO and PM.</div>;
  }

  const totalCapital = summary?.totalEquity ?? 1_000_000;

  return (
    <div className="scroll-y dash-content" style={{ flex: 1, padding: isMobile ? 12 : 20 }}>
      <div className="sec-hdr-resp" style={{ marginBottom: isMobile ? 12 : 20 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Executive Dashboard</h1>
          {!isMobile && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, marginBottom: 0 }}>Capital overview, pipeline, and portfolio metrics</p>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Link href="/dashboard/positions" className="btn btn-ghost btn-sm">Positions</Link>
          {!isMobile && <Link href="/dashboard/risk" className="btn btn-ghost btn-sm">Risk</Link>}
          <Link href="/dashboard/performance" className="btn btn-ghost btn-sm">Perf</Link>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>LOADING…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200 }}>
          {/* Alerts banner */}
          {alerts.length > 0 && (
            <div className="panel" style={{ padding: 14, borderLeft: '3px solid var(--warn)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warn)', marginBottom: 8 }}>
                ⚠ {alerts.length} unread alert{alerts.length > 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alerts.slice(0, 5).map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`badge badge-${a.severity === 'HIGH' ? 'high' : a.severity === 'MEDIUM' ? 'medium' : 'low'}`}>{a.alertType.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1 }}>{a.message}</span>
                    {a.trade && <Link href={`/dashboard/trades/${a.trade.id}`} style={{ fontSize: 10, color: 'var(--accent)' }}>{a.trade.ticker}</Link>}
                    <button onClick={() => dismissAlert(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 12 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Capital overview */}
          {summary && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(4, 2, 2)}, 1fr)`, gap: 8 }}>
                {[
                  { label: 'Total Capital', val: `$${(totalCapital / 1000000).toFixed(1)}M`, sub: '1M AUM' },
                  { label: 'Capital Deployed', val: `$${(summary.grossExposure / 1000).toFixed(0)}k`, sub: `${((summary.grossExposure / totalCapital) * 100).toFixed(1)}%` },
                  { label: 'Cash Available', val: `$${(summary.cashBalance / 1000).toFixed(0)}k`, sub: `${((summary.cashBalance / totalCapital) * 100).toFixed(1)}% free` },
                  { label: 'Net Exposure', val: `$${(summary.netExposure / 1000).toFixed(0)}k`, sub: `L ${((summary.longExposure / totalCapital) * 100).toFixed(0)}% / S ${((summary.shortExposure / totalCapital) * 100).toFixed(0)}%` },
                ].map(({ label, val, sub }) => (
                  <div key={label} className="panel" style={{ padding: '14px 16px' }}>
                    <div className="form-label" style={{ marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{val}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(4, 2, 2)}, 1fr)`, gap: 8, marginTop: 8 }}>
                {[
                  { label: 'Unrealized P&L', val: `${summary.unrealizedPnl >= 0 ? '+' : ''}$${Math.abs(summary.unrealizedPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: summary.unrealizedPnl >= 0 ? 'var(--long)' : 'var(--short)', sub: 'open positions' },
                  { label: 'Realized P&L', val: `${summary.realizedPnl >= 0 ? '+' : ''}$${Math.abs(summary.realizedPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: summary.realizedPnl >= 0 ? 'var(--long)' : 'var(--short)', sub: 'closed trades' },
                  { label: 'Win Rate', val: `${summary.winRate.toFixed(1)}%`, color: summary.winRate >= 50 ? 'var(--long)' : 'var(--short)', sub: `${summary.closedPositions} closed` },
                  { label: 'Profit Factor', val: summary.profitFactor === 999 ? '∞' : summary.profitFactor.toFixed(2), color: summary.profitFactor >= 1.5 ? 'var(--long)' : summary.profitFactor >= 1 ? 'var(--warn)' : 'var(--short)', sub: 'gains / losses ratio' },
                ].map(({ label, val, color, sub }) => (
                  <div key={label} className="panel" style={{ padding: '14px 16px' }}>
                    <div className="form-label" style={{ marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color }}>{val}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(4, 2, 2)}, 1fr)`, gap: 8, marginTop: 8 }}>
                {[
                  { label: 'Open Positions', val: String(summary.openPositions), href: '/dashboard/positions' },
                  { label: 'Active Trades', val: String(summary.activeTrades), href: '/dashboard/trades' },
                  { label: 'Pending Proposals', val: String(summary.proposals), href: '/dashboard/trades' },
                  { label: 'Best Return', val: `+${summary.bestReturn.toFixed(2)}%`, color: 'var(--long)' },
                ].map(({ label, val, href, color }) => (
                  <div key={label} className="panel" style={{ padding: '14px 16px' }}>
                    <div className="form-label" style={{ marginBottom: 4 }}>{label}</div>
                    {href ? (
                      <Link href={href} style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--accent)', textDecoration: 'none' }}>{val}</Link>
                    ) : (
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: color ?? 'var(--text)' }}>{val}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: 16 }}>
            {/* Timeline */}
            <div className="panel" style={{ padding: 16 }}>
              <div className="sec-title" style={{ marginBottom: 12 }}>Portfolio Timeline</div>
              {timeline.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text4)' }}>No activity yet. Execute trades to see the timeline.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {timeline.map((event, i) => {
                    const EVENT_COLOR: Record<string, string> = {
                      OPENED: 'var(--long)', CLOSED: 'var(--short)', PARTIAL_PROFIT: 'var(--accent)',
                      INCREASED: 'var(--long)', STOP_ADJUSTED: 'var(--warn)', APPROVED: 'var(--accent)',
                      PROPOSED: 'var(--text3)',
                    };
                    const color = EVENT_COLOR[event.eventType] ?? 'var(--border2)';
                    return (
                      <div key={event.id} style={{ display: 'flex', gap: 10, paddingBottom: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 4 }} />
                          {i < timeline.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', minHeight: 16, marginTop: 3 }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                            {event.trade && (
                              <Link href={`/dashboard/trades/${event.trade.id}`} style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 11, color: 'var(--text)', textDecoration: 'none' }}>
                                {event.trade.ticker}
                              </Link>
                            )}
                            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)', color }}>{event.eventType}</span>
                            <span style={{ fontSize: 9, color: 'var(--text4)' }}>{new Date(event.createdAt).toLocaleString()}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{event.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick links & pipeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="panel" style={{ padding: 16 }}>
                <div className="sec-title" style={{ marginBottom: 10 }}>Quick Actions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'View All Positions', href: '/dashboard/positions', icon: '◎' },
                    { label: 'Trade Proposals', href: '/dashboard/trades', icon: '◈' },
                    { label: 'Risk Dashboard', href: '/dashboard/risk', icon: '⛨' },
                    { label: 'Performance', href: '/dashboard/performance', icon: '◇' },
                    { label: 'Research Pipeline', href: '/dashboard/research', icon: '⬡' },
                    { label: 'Approval Queue', href: '/dashboard/approval', icon: '✓' },
                    { label: 'Audit Log', href: '/dashboard/audit', icon: '≡' },
                  ].map(({ label, href, icon }) => (
                    <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                      <div className="nav-item" style={{ padding: '7px 10px' }}>
                        <span style={{ fontSize: 11, width: 14, textAlign: 'center', opacity: .7 }}>{icon}</span>
                        <span style={{ fontSize: 12 }}>{label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {summary && (
                <div className="panel" style={{ padding: 16 }}>
                  <div className="sec-title" style={{ marginBottom: 10 }}>Best/Worst Performers</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Best</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--long)', marginBottom: 12 }}>
                    +{summary.bestReturn.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Worst</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--short)' }}>
                    {summary.worstReturn.toFixed(2)}%
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
