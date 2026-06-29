'use client';
import { useApp } from '@/context/AppContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { usePortfolioAnalytics } from '@/hooks/useLiveData';
import { StatCard } from '@/components/ui/StatCard';
import { DirBadge } from '@/components/ui/Badge';
import { Bar } from '@/components/ui/Bar';
import { HeatMatrix } from '@/components/ui/Charts';
import { can } from '@/lib/permissions';
import { WEEK_ID } from '@/lib/data';

export default function PortfolioPage() {
  const { user, portfolio, setPortfolio } = useApp();
  const { isMobile, cols } = useBreakpoint();
  const { data: analytics, loading: analyticsLoading } = usePortfolioAnalytics(WEEK_ID);

  if (!user) return null;
  const canAdj = can(user, 'adjustAllocations');
  const invested = portfolio.reduce((a, b) => a + b.alloc, 0);
  const cash = 100 - invested;
  const expRet = (portfolio.reduce((a, b) => a + (b.alloc / 100) * b.expRet, 0)).toFixed(2);

  const volatility = analytics?.volatility ?? null;
  const sharpe = volatility != null && volatility > 0
    ? (parseFloat(expRet) / volatility).toFixed(2)
    : analytics?.sharpe?.toFixed(2) ?? '—';

  const sectorExp: Record<string, number> = {};
  portfolio.filter(p => p.alloc > 0).forEach(p => { sectorExp[p.sector] = (sectorExp[p.sector] || 0) + p.alloc; });

  const setAlloc = (ideaId: string, val: string) => {
    if (!canAdj) return;
    setPortfolio(p => p.map(pos => pos.ideaId === ideaId ? { ...pos, alloc: Math.max(0, Math.min(20, parseInt(val) || 0)), pmOvr: true } : pos));
  };

  return (
    <div className="scroll-y dash-content" style={{ height: '100%', padding: 16 }}>
      <div className="sec-hdr" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Portfolio Allocation Engine</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Auto: Top 3 → 15% · Ranks 4-8 → 8% · Remainder → Cash{canAdj && ' · Override enabled'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}><span className="badge badge-dim">{WEEK_ID}</span>{canAdj && <span className="badge badge-warn">OVERRIDE</span>}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(5, 3, 2)},1fr)`, gap: 8, marginBottom: 12 }}>
        <StatCard label="Exp. Portfolio Return" value={expRet + '%'} color="var(--long)" />
        <StatCard
          label="Exp. Volatility"
          value={analyticsLoading ? '…' : volatility != null ? volatility.toFixed(1) + '%' : '—'}
          sub="annualized"
        />
        <StatCard
          label="Exp. Sharpe"
          value={analyticsLoading ? '…' : sharpe}
          color="var(--accent)"
        />
        <StatCard label="Total Invested" value={invested + '%'} color="var(--accent)" />
        <StatCard label="Cash Reserve" value={cash + '%'} color={cash < 10 ? 'var(--short)' : 'var(--text)'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 330px', gap: 12 }}>
        <div className="panel tbl-wrap">
          <table className="tbl">
            <thead><tr><th>RNK</th><th>TICKER</th><th>DIR</th><th>SECTOR</th><th style={{ textAlign: 'right' }}>AUTO</th><th style={{ textAlign: 'right' }}>ALLOC %</th><th>BAR</th><th style={{ textAlign: 'right' }}>EXP.RET</th><th style={{ textAlign: 'right' }}>BETA</th>{canAdj && <th>OVERRIDE</th>}</tr></thead>
            <tbody>
              {portfolio.map((pos, i) => {
                const auto = i < 3 ? 15 : i < 8 ? 8 : 0;
                return (
                  <tr key={pos.ideaId}>
                    <td><span className="mono" style={{ color: 'var(--text4)' }}>#{i + 1}</span></td>
                    <td><span className="mono" style={{ fontWeight: 700 }}>{pos.ticker}</span></td>
                    <td><DirBadge dir={pos.dir} /></td>
                    <td><span style={{ fontSize: 10, color: 'var(--text3)' }}>{pos.sector}</span></td>
                    <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: 'var(--text4)' }}>{auto}%</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 700, color: pos.alloc > 0 ? 'var(--accent)' : 'var(--text4)' }}>{pos.alloc}%</span>
                      {pos.pmOvr && <span className="badge badge-warn" style={{ marginLeft: 4, fontSize: 8 }}>OVR</span>}
                    </td>
                    <td style={{ width: 100 }}><Bar val={pos.alloc} max={15} color={pos.dir === 'LONG' ? 'var(--long)' : 'var(--short)'} /></td>
                    <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: 'var(--long)' }}>+{pos.expRet}%</span></td>
                    <td style={{ textAlign: 'right' }}><span className="mono">{pos.beta}</span></td>
                    {canAdj && <td><input className="inp mono" type="number" min="0" max="20" value={pos.alloc} onChange={e => setAlloc(pos.ideaId, e.target.value)} style={{ width: 56, padding: '3px 6px', fontSize: 11 }} /></td>}
                  </tr>
                );
              })}
              <tr>
                <td colSpan={canAdj ? 8 : 7} />
                <td style={{ textAlign: 'right', borderTop: '1px solid var(--border2)', paddingTop: 8 }}><span style={{ fontSize: 10, color: 'var(--text3)' }}>CASH</span></td>
                <td style={{ textAlign: 'right', borderTop: '1px solid var(--border2)', paddingTop: 8 }}><span className="mono" style={{ fontWeight: 700, color: cash < 10 ? 'var(--short)' : 'var(--text)' }}>{cash}%</span></td>
                {canAdj && <td />}
              </tr>
            </tbody>
          </table>
        </div>

        <div className={isMobile ? 'hide-mobile' : ''}>
          <div className="panel" style={{ padding: 12, marginBottom: 10 }}>
            <div className="sec-title" style={{ marginBottom: 10 }}>SECTOR EXPOSURE</div>
            {Object.entries(sectorExp).map(([sec, pct]) => (
              <div key={sec} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span style={{ fontSize: 10, color: 'var(--text2)' }}>{sec}</span><span className="mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{pct}%</span></div>
                <Bar val={pct} max={60} />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}><span style={{ fontSize: 10, color: 'var(--text3)' }}>CASH</span><span className="mono" style={{ fontSize: 10 }}>{cash}%</span></div>
          </div>
          <div className="panel" style={{ padding: 12 }}>
            <div className="sec-hdr" style={{ marginBottom: 10 }}>
              <span className="sec-title">CORRELATION MATRIX</span>
              {!analyticsLoading && analytics && (
                <span style={{ fontSize: 8, color: 'var(--text4)' }}>computed</span>
              )}
            </div>
            {analyticsLoading ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text4)', fontSize: 10 }}>Computing…</div>
            ) : analytics?.corrMatrix ? (
              <div style={{ overflowX: 'auto' }}>
                <HeatMatrix labels={analytics.tickers} data={analytics.corrMatrix} sz={20} />
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text4)', fontSize: 10 }}>No portfolio data</div>
            )}
            {analytics?.corrMatrix && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center', fontSize: 9, color: 'var(--text4)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 8, background: 'var(--long)', display: 'inline-block', borderRadius: 1 }} />Positive</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 8, background: 'var(--short)', display: 'inline-block', borderRadius: 1 }} />Negative</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
