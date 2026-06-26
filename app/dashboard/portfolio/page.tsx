'use client';
import { useApp } from '@/context/AppContext';
import { StatCard } from '@/components/ui/StatCard';
import { DirBadge } from '@/components/ui/Badge';
import { Bar } from '@/components/ui/Bar';
import { HeatMatrix } from '@/components/ui/Charts';
import { can } from '@/lib/permissions';

export default function PortfolioPage() {
  const { user, portfolio, setPortfolio } = useApp();
  if (!user) return null;
  const canAdj = can(user, 'adjustAllocations');
  const invested = portfolio.reduce((a, b) => a + b.alloc, 0);
  const cash = 100 - invested;
  const expRet = (portfolio.reduce((a, b) => a + (b.alloc / 100) * b.expRet, 0)).toFixed(2);
  const sectorExp: Record<string, number> = {};
  portfolio.filter(p => p.alloc > 0).forEach(p => { sectorExp[p.sector] = (sectorExp[p.sector] || 0) + p.alloc; });

  const corrData = [
    [1, .52, .48, .22, -.31, .44, -.18, .42, .28, .38], [.52, 1, .61, .31, -.24, .58, -.12, .69, .45, .71],
    [.48, .61, 1, .25, -.19, .51, -.08, .63, .38, .55], [.22, .31, .25, 1, -.15, .28, .15, .35, .68, .34],
    [-.31, -.24, -.19, -.15, 1, -.22, .28, -.21, -.18, -.20], [.44, .58, .51, .28, -.22, 1, -.14, .62, .41, .60],
    [-.18, -.12, -.08, .15, .28, -.14, 1, -.10, .12, -.09], [.42, .69, .63, .35, -.21, .62, -.10, 1, .42, .68],
    [.28, .45, .38, .68, -.18, .41, .12, .42, 1, .48], [.38, .71, .55, .34, -.20, .60, -.09, .68, .48, 1],
  ];

  const setAlloc = (ideaId: string, val: string) => {
    if (!canAdj) return;
    setPortfolio(p => p.map(pos => pos.ideaId === ideaId ? { ...pos, alloc: Math.max(0, Math.min(20, parseInt(val) || 0)), pmOvr: true } : pos));
  };

  return (
    <div className="scroll-y" style={{ height: '100%', padding: 16 }}>
      <div className="sec-hdr" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Portfolio Allocation Engine</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Auto: Top 3 → 15% · Ranks 4-8 → 8% · Remainder → Cash{canAdj && ' · Override enabled'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}><span className="badge badge-dim">W26-2025</span>{canAdj && <span className="badge badge-warn">OVERRIDE</span>}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 12 }}>
        <StatCard label="Exp. Portfolio Return" value={expRet + '%'} color="var(--long)" />
        <StatCard label="Exp. Volatility" value="12.4%" sub="annualized" />
        <StatCard label="Exp. Sharpe" value={(parseFloat(expRet) / 12.4).toFixed(2)} color="var(--accent)" />
        <StatCard label="Total Invested" value={invested + '%'} color="var(--accent)" />
        <StatCard label="Cash Reserve" value={cash + '%'} color={cash < 10 ? 'var(--short)' : 'var(--text)'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: 12 }}>
        <div className="panel">
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

        <div>
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
            <div className="sec-title" style={{ marginBottom: 10 }}>CORRELATION MATRIX</div>
            <div style={{ overflowX: 'auto' }}><HeatMatrix labels={portfolio.map(p => p.ticker)} data={corrData} sz={20} /></div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center', fontSize: 9, color: 'var(--text4)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 8, background: 'var(--long)', display: 'inline-block', borderRadius: 1 }} />Positive</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 8, background: 'var(--short)', display: 'inline-block', borderRadius: 1 }} />Negative</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
