'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';

interface EnrichedPosition {
  id: string;
  tradeId: string;
  ticker: string;
  direction: string;
  quantity: number;
  avgCost: number;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  realizedPnl: number;
  returnPct: number | null;
  maxGain: number | null;
  maxDrawdown: number | null;
  daysHeld: number;
  stopLoss: number | null;
  target: number | null;
  entryDate: string;
  trade: { id: string; status: string; strategy: string | null; idea: { ticker: string; dir: string; authorId: string; assetClass: string; thesis: string } | null } | null;
}

interface Summary {
  totalEquity: number;
  cashBalance: number;
  grossExposure: number;
  netExposure: number;
  longExposure: number;
  shortExposure: number;
  unrealizedPnl: number;
  realizedPnl: number;
  openPositions: number;
  closedPositions: number;
  winRate: number;
  profitFactor: number;
}

function fmt$(n: number) { return n >= 0 ? `+$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`; }
function fmtPct(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`; }

export default function PositionsPage() {
  const { user } = useApp();
  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'open' | 'closed'>('open');

  const load = useCallback(async () => {
    setLoading(true);
    const [posRes, sumRes] = await Promise.all([
      fetch(`/api/positions${view === 'closed' ? '?closed=1' : ''}`),
      fetch('/api/portfolio/summary'),
    ]);
    if (posRes.ok) setPositions(await posRes.json());
    if (sumRes.ok) setSummary(await sumRes.json());
    setLoading(false);
  }, [view]);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user) return null;

  const totalCapital = summary?.totalEquity ?? 1_000_000;

  return (
    <div className="scroll-y" style={{ flex: 1, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Portfolio Positions</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Live portfolio with P&L tracking</p>
        </div>
        <Link href="/dashboard/trades" className="btn btn-ghost btn-sm">+ Trade Proposal</Link>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total Equity', val: `$${totalCapital.toLocaleString()}`, sub: '1M AUM' },
            { label: 'Cash Balance', val: `$${(summary.cashBalance).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `${((summary.cashBalance / totalCapital) * 100).toFixed(1)}% free` },
            { label: 'Gross Exposure', val: `$${(summary.grossExposure).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `${((summary.grossExposure / totalCapital) * 100).toFixed(1)}% of capital` },
            { label: 'Net Exposure', val: `$${(summary.netExposure).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `L: $${(summary.longExposure / 1000).toFixed(0)}k  S: $${(summary.shortExposure / 1000).toFixed(0)}k` },
            { label: 'Unrealized P&L', val: fmt$(summary.unrealizedPnl), sub: fmtPct((summary.unrealizedPnl / totalCapital) * 100), color: summary.unrealizedPnl >= 0 ? 'var(--long)' : 'var(--short)' },
            { label: 'Realized P&L', val: fmt$(summary.realizedPnl), sub: `${summary.closedPositions} closed`, color: summary.realizedPnl >= 0 ? 'var(--long)' : 'var(--short)' },
            { label: 'Win Rate', val: `${summary.winRate.toFixed(1)}%`, sub: `${summary.openPositions} open` },
            { label: 'Profit Factor', val: summary.profitFactor === 999 ? '∞' : summary.profitFactor.toFixed(2), sub: 'gains / losses' },
          ].map(({ label, val, sub, color }) => (
            <div key={label} className="panel" style={{ padding: '12px 14px' }}>
              <div className="form-label" style={{ marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--mono)', color: color ?? 'var(--text)' }}>{val}</div>
              <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        {(['open', 'closed'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: view === v ? 'var(--accent)' : 'transparent',
            color: view === v ? '#fff' : 'var(--text3)',
          }}>{v === 'open' ? 'OPEN POSITIONS' : 'CLOSED POSITIONS'}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>LOADING…</div>
      ) : positions.length === 0 ? (
        <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>◎</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>No {view} positions</div>
          {view === 'open' && <Link href="/dashboard/trades" style={{ fontSize: 12, color: 'var(--accent)', display: 'block', marginTop: 8 }}>Create a trade proposal →</Link>}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Dir</th>
                <th>Qty</th>
                <th>Avg Cost</th>
                <th>Current</th>
                <th>Mkt Value</th>
                <th>UPnL</th>
                <th>Return</th>
                <th>Days</th>
                <th>Stop</th>
                <th>Target</th>
                <th>Analyst</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p => {
                const pnlColor = (p.unrealizedPnl ?? 0) >= 0 ? 'var(--long)' : 'var(--short)';
                const distToStop = p.currentPrice && p.stopLoss
                  ? ((p.direction === 'LONG' ? (p.currentPrice - p.stopLoss) : (p.stopLoss - p.currentPrice)) / p.currentPrice) * 100
                  : null;
                return (
                  <tr key={p.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text)' }}>
                        {p.trade?.idea?.ticker ?? p.ticker}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${p.direction === 'LONG' ? 'long' : 'short'}`}>{p.direction}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{p.quantity.toLocaleString()}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>${p.avgCost.toFixed(2)}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>
                      {p.currentPrice ? `$${p.currentPrice.toFixed(2)}` : <span style={{ color: 'var(--text4)' }}>—</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)' }}>
                      {p.marketValue ? `$${(p.marketValue / 1000).toFixed(1)}k` : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', color: pnlColor, fontWeight: 600 }}>
                      {p.unrealizedPnl !== null ? fmt$(p.unrealizedPnl) : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', color: pnlColor, fontWeight: 700 }}>
                      {p.returnPct !== null ? fmtPct(p.returnPct) : '—'}
                    </td>
                    <td style={{ color: 'var(--text3)' }}>{p.daysHeld}d</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                      {p.stopLoss ? (
                        <span style={{ color: distToStop !== null && distToStop < 3 ? 'var(--short)' : 'var(--text3)' }}>
                          ${p.stopLoss}
                          {distToStop !== null && <span style={{ fontSize: 9 }}> ({distToStop.toFixed(1)}%)</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
                      {p.target ? `$${p.target}` : '—'}
                    </td>
                    <td style={{ fontSize: 10, color: 'var(--text4)' }}>{p.trade?.idea?.authorId ?? '—'}</td>
                    <td>
                      <Link href={`/dashboard/trades/${p.tradeId}`} style={{ fontSize: 10, color: 'var(--accent)' }}>→</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
