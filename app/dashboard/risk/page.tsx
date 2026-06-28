'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';

interface RiskData {
  totalPositions: number;
  totalExposure: number;
  capitalAtRisk: number;
  concentrationPct: number;
  bySector: Record<string, number>;
  byDirection: Record<string, number>;
  byStrategy: Record<string, number>;
  largestPosition: { ticker: string; mv: number; pct: string; direction: string } | null;
  concentrationWarnings: Array<{ ticker: string; pct: string }>;
  nearStop: Array<{ ticker: string; distToStop: number; currentPrice: number | null; stopLoss: number | null }>;
  highDrawdown: Array<{ ticker: string; maxDrawdown: number | null }>;
  positions: Array<{
    id: string; tradeId: string; ticker: string; direction: string;
    mv: number; pct: string; unrealizedPnl: number | null; returnPct: number | null;
    stopLoss: number | null; target: number | null; currentPrice: number | null; avgCost: number;
    assetClass: string; strategy: string;
  }>;
}

const TOTAL_CAPITAL = 1_000_000;

function Bar({ pct, color = 'var(--accent)' }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 3, transition: 'width .3s' }} />
    </div>
  );
}

export default function RiskPage() {
  const { user } = useApp();
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch('/api/risk');
    if (r.ok) setData(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);
  if (!user) return null;

  return (
    <div className="scroll-y" style={{ flex: 1, padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Risk Dashboard</h1>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Portfolio concentration, exposure, and risk metrics</p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>LOADING…</div>
      ) : !data || data.totalPositions === 0 ? (
        <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⛨</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>No open positions</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Risk metrics will appear once you have active positions.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1100 }}>
          {/* Top metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Total Exposure', val: `$${(data.totalExposure / 1000).toFixed(0)}k`, sub: `${data.concentrationPct.toFixed(1)}% of capital`, warn: data.concentrationPct > 80 },
              { label: 'Capital at Risk', val: `$${(data.capitalAtRisk / 1000).toFixed(0)}k`, sub: `${((data.capitalAtRisk / TOTAL_CAPITAL) * 100).toFixed(1)}% of capital`, warn: data.capitalAtRisk / TOTAL_CAPITAL > 0.1 },
              { label: 'Open Positions', val: String(data.totalPositions), sub: `${data.concentrationWarnings.length} concentration warnings` },
              { label: 'Largest Position', val: data.largestPosition ? `${data.largestPosition.ticker}` : '—', sub: data.largestPosition ? `${data.largestPosition.pct}% of capital` : '', warn: data.largestPosition ? parseFloat(data.largestPosition.pct) > 20 : false },
            ].map(({ label, val, sub, warn }) => (
              <div key={label} className="panel" style={{ padding: '12px 14px', borderLeft: warn ? '3px solid var(--short)' : '3px solid transparent' }}>
                <div className="form-label" style={{ marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--mono)', color: warn ? 'var(--short)' : 'var(--text)' }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {(data.concentrationWarnings.length > 0 || data.nearStop.length > 0 || data.highDrawdown.length > 0) && (
            <div className="panel" style={{ padding: 16, borderLeft: '3px solid var(--short)' }}>
              <div className="sec-title" style={{ marginBottom: 10, color: 'var(--short)' }}>⚠ Risk Alerts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.concentrationWarnings.map(w => (
                  <div key={w.ticker} style={{ fontSize: 12, color: 'var(--text2)' }}>
                    <span className="badge badge-short" style={{ marginRight: 8 }}>CONCENTRATION</span>
                    {w.ticker} is {w.pct}% of portfolio (threshold: 20%)
                  </div>
                ))}
                {data.nearStop.map(p => (
                  <div key={p.ticker} style={{ fontSize: 12, color: 'var(--text2)' }}>
                    <span className="badge badge-warn" style={{ marginRight: 8 }}>NEAR STOP</span>
                    {p.ticker} is {p.distToStop.toFixed(1)}% from stop loss (${p.stopLoss})
                  </div>
                ))}
                {data.highDrawdown.map(p => (
                  <div key={p.ticker} style={{ fontSize: 12, color: 'var(--text2)' }}>
                    <span className="badge badge-short" style={{ marginRight: 8 }}>HIGH DRAWDOWN</span>
                    {p.ticker} max drawdown: {p.maxDrawdown?.toFixed(1)}%
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {/* By Direction */}
            <div className="panel" style={{ padding: 16 }}>
              <div className="sec-title" style={{ marginBottom: 12 }}>Long vs Short</div>
              {Object.entries(data.byDirection).map(([dir, mv]) => (
                <div key={dir} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className={`badge badge-${dir === 'LONG' ? 'long' : 'short'}`}>{dir}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
                      ${(mv / 1000).toFixed(0)}k ({((mv / TOTAL_CAPITAL) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <Bar pct={(mv / TOTAL_CAPITAL) * 100} color={dir === 'LONG' ? 'var(--long)' : 'var(--short)'} />
                </div>
              ))}
            </div>

            {/* By Sector */}
            <div className="panel" style={{ padding: 16 }}>
              <div className="sec-title" style={{ marginBottom: 12 }}>By Asset Class</div>
              {Object.entries(data.bySector).sort(([,a],[,b]) => b - a).map(([sector, mv]) => (
                <div key={sector} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>{sector}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
                      ${(mv / 1000).toFixed(0)}k ({((mv / TOTAL_CAPITAL) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <Bar pct={(mv / TOTAL_CAPITAL) * 100} />
                </div>
              ))}
            </div>

            {/* By Strategy */}
            <div className="panel" style={{ padding: 16 }}>
              <div className="sec-title" style={{ marginBottom: 12 }}>By Strategy</div>
              {Object.entries(data.byStrategy).sort(([,a],[,b]) => b - a).map(([strat, mv]) => (
                <div key={strat} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>{strat}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
                      ${(mv / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <Bar pct={(mv / TOTAL_CAPITAL) * 100} color="var(--purple)" />
                </div>
              ))}
              {Object.keys(data.byStrategy).length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text4)' }}>No strategy data — set strategy on trade proposals</div>
              )}
            </div>
          </div>

          {/* Position risk table */}
          <div className="panel" style={{ padding: 16 }}>
            <div className="sec-title" style={{ marginBottom: 12 }}>Position Risk Table</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Dir</th>
                    <th>Mkt Value</th>
                    <th>% Capital</th>
                    <th>P&L</th>
                    <th>Return</th>
                    <th>Stop</th>
                    <th>Target</th>
                    <th>Sector</th>
                  </tr>
                </thead>
                <tbody>
                  {data.positions.sort((a, b) => b.mv - a.mv).map(p => {
                    const pct = parseFloat(p.pct);
                    const pnlColor = (p.unrealizedPnl ?? 0) >= 0 ? 'var(--long)' : 'var(--short)';
                    return (
                      <tr key={p.id} style={{ background: pct > 20 ? 'rgba(239,68,68,.04)' : 'transparent' }}>
                        <td><span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{p.ticker}</span></td>
                        <td><span className={`badge badge-${p.direction === 'LONG' ? 'long' : 'short'}`}>{p.direction}</span></td>
                        <td style={{ fontFamily: 'var(--mono)' }}>${(p.mv / 1000).toFixed(0)}k</td>
                        <td style={{ fontFamily: 'var(--mono)', color: pct > 20 ? 'var(--short)' : 'var(--text3)' }}>{p.pct}%</td>
                        <td style={{ fontFamily: 'var(--mono)', color: pnlColor }}>
                          {p.unrealizedPnl !== null ? `${p.unrealizedPnl >= 0 ? '+' : ''}$${p.unrealizedPnl.toFixed(0)}` : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', color: pnlColor }}>
                          {p.returnPct !== null ? `${p.returnPct >= 0 ? '+' : ''}${p.returnPct.toFixed(2)}%` : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
                          {p.stopLoss ? `$${p.stopLoss}` : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
                          {p.target ? `$${p.target}` : '—'}
                        </td>
                        <td style={{ fontSize: 10, color: 'var(--text4)' }}>{p.assetClass}</td>
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
