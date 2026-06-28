'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';

interface PerfData {
  totalTrades: number;
  winners: number;
  losers: number;
  winRate: number;
  totalPnl: number;
  avgReturn: number;
  avgDaysHeld: number;
  byAnalyst: Record<string, { trades: number; pnl: number; winRate: number }>;
  avgAttribution: {
    researchQuality: number; entryTiming: number; exitTiming: number;
    catalystOutcome: number; riskMgmt: number; positionSizing: number; executionQuality: number;
  } | null;
  trades: Array<{
    id: string; ticker: string; direction: string; authorId: string; assetClass: string;
    strategy: string; closedAt: string | null; realizedPnl: number; returnPct: number;
    daysHeld: number; maxGain: number; maxDrawdown: number;
    attribution: Record<string, number | null | string> | null;
  }>;
}

const ATTR_LABELS: Record<string, string> = {
  researchQuality: 'Research Quality', entryTiming: 'Entry Timing', exitTiming: 'Exit Timing',
  catalystOutcome: 'Catalyst Outcome', riskMgmt: 'Risk Management',
  positionSizing: 'Position Sizing', executionQuality: 'Execution Quality',
};

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = score >= 7 ? 'var(--long)' : score >= 5 ? 'var(--accent)' : 'var(--short)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color, minWidth: 24 }}>{score.toFixed(1)}</span>
    </div>
  );
}

export default function PerformancePage() {
  const { user } = useApp();
  const [data, setData] = useState<PerfData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch('/api/performance');
    if (r.ok) setData(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);
  if (!user) return null;

  return (
    <div className="scroll-y" style={{ flex: 1, padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Performance Attribution</h1>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Closed trade analysis and attribution scoring</p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>LOADING…</div>
      ) : !data || data.totalTrades === 0 ? (
        <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>◇</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>No closed trades yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Performance attribution data will appear after trades are closed.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1100 }}>
          {/* KPI bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Total Trades', val: String(data.totalTrades), sub: `${data.winners}W / ${data.losers}L` },
              { label: 'Win Rate', val: `${data.winRate.toFixed(1)}%`, sub: 'closed trades', color: data.winRate >= 50 ? 'var(--long)' : 'var(--short)' },
              { label: 'Total P&L', val: `${data.totalPnl >= 0 ? '+' : ''}$${Math.abs(data.totalPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `avg ${data.avgReturn.toFixed(2)}%`, color: data.totalPnl >= 0 ? 'var(--long)' : 'var(--short)' },
              { label: 'Avg Hold', val: `${data.avgDaysHeld.toFixed(0)}d`, sub: 'per trade' },
            ].map(({ label, val, sub, color }) => (
              <div key={label} className="panel" style={{ padding: '12px 14px' }}>
                <div className="form-label" style={{ marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: color ?? 'var(--text)' }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Attribution radar */}
            {data.avgAttribution && (
              <div className="panel" style={{ padding: 16 }}>
                <div className="sec-title" style={{ marginBottom: 12 }}>Avg Attribution Scores</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(ATTR_LABELS).map(([key, label]) => {
                    const score = (data.avgAttribution as Record<string, number>)[key] ?? 0;
                    return (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: 'var(--text2)' }}>{label}</span>
                        </div>
                        <ScoreBar score={score} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* By analyst */}
            <div className="panel" style={{ padding: 16 }}>
              <div className="sec-title" style={{ marginBottom: 12 }}>By Analyst</div>
              {Object.entries(data.byAnalyst).sort(([,a],[,b]) => b.pnl - a.pnl).map(([analyst, stats]) => (
                <div key={analyst} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{analyst}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', color: stats.pnl >= 0 ? 'var(--long)' : 'var(--short)' }}>
                      {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(0)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text4)' }}>
                    <span>{stats.trades} trades</span>
                    <span>Win rate: {stats.winRate.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
              {Object.keys(data.byAnalyst).length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text4)' }}>No data available</div>
              )}
            </div>
          </div>

          {/* Closed trades table */}
          <div className="panel" style={{ padding: 16 }}>
            <div className="sec-title" style={{ marginBottom: 12 }}>Closed Trades</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Dir</th>
                    <th>Analyst</th>
                    <th>Return</th>
                    <th>P&L</th>
                    <th>Days</th>
                    <th>Max Gain</th>
                    <th>Max DD</th>
                    <th>Closed</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.trades.sort((a, b) => new Date(b.closedAt ?? 0).getTime() - new Date(a.closedAt ?? 0).getTime()).map(t => {
                    const color = t.returnPct >= 0 ? 'var(--long)' : 'var(--short)';
                    return (
                      <tr key={t.id}>
                        <td><span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text)' }}>{t.ticker}</span></td>
                        <td><span className={`badge badge-${t.direction === 'LONG' ? 'long' : 'short'}`}>{t.direction}</span></td>
                        <td style={{ fontSize: 10, color: 'var(--text4)' }}>{t.authorId}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color }}>{t.returnPct >= 0 ? '+' : ''}{t.returnPct.toFixed(2)}%</td>
                        <td style={{ fontFamily: 'var(--mono)', color }}>{t.realizedPnl >= 0 ? '+' : ''}${t.realizedPnl.toFixed(0)}</td>
                        <td style={{ color: 'var(--text3)' }}>{t.daysHeld}d</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--long)' }}>+{t.maxGain.toFixed(1)}%</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--short)' }}>{t.maxDrawdown.toFixed(1)}%</td>
                        <td style={{ fontSize: 10, color: 'var(--text4)' }}>
                          {t.closedAt ? new Date(t.closedAt).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <Link href={`/dashboard/trades/${t.id}`} style={{ fontSize: 10, color: 'var(--accent)' }}>→</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
