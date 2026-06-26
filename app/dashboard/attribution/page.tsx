'use client';
import { useApp } from '@/context/AppContext';
import { USERS } from '@/lib/data';
import { TierBadge } from '@/components/ui/Badge';
import { Bar } from '@/components/ui/Bar';

export default function AttributionPage() {
  const { user } = useApp();
  if (!user) return null;

  const analysts = USERS;

  return (
    <div className="scroll-y" style={{ height: '100%', padding: 16 }}>
      <div className="sec-hdr" style={{ marginBottom: 12 }}>
        <div><div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Attribution Analytics</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>Dual-track: Idea Creator vs Capital Allocator · Independent skill measurement</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {([['TOP IDEA CREATORS', 'ideaScore', 'var(--accent)'], ['TOP CAPITAL ALLOCATORS', 'allocScore', 'var(--purple)']] as [string, 'ideaScore' | 'allocScore', string][]).map(([title, key, color]) => (
          <div key={title} className="panel" style={{ padding: 12 }}>
            <div className="sec-title" style={{ marginBottom: 8 }}>{title}</div>
            {[...analysts].sort((a, b) => b[key] - a[key]).slice(0, 5).map((u, i) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="mono" style={{ width: 16, fontSize: 10, color: 'var(--text4)' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 11 }}>{u.name}</span>
                <TierBadge tier={u.tier} />
                <div style={{ width: 70 }}><Bar val={u[key]} color={color} /></div>
                <span className="mono" style={{ fontSize: 11, fontWeight: 700, color, width: 24 }}>{u[key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="panel">
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}><span className="sec-title">DUAL-TRACK ATTRIBUTION TABLE</span></div>
        <table className="tbl">
          <thead><tr><th>#</th><th>ANALYST</th><th>TITLE</th><th>TIER</th><th style={{ textAlign: 'right' }}>IDEA SCORE</th><th style={{ textAlign: 'right' }}>ALLOC SCORE</th><th style={{ textAlign: 'right' }}>DELTA</th><th>SKILL PROFILE</th><th>IDEA</th><th>ALLOC</th></tr></thead>
          <tbody>
            {[...analysts].sort((a, b) => b.researchScore - a.researchScore).map((u, i) => {
              const d = u.ideaScore - u.allocScore;
              const prof = Math.abs(d) < 5 ? 'Balanced' : d > 10 ? 'Idea Specialist' : d > 5 ? 'Better Picker' : d < -10 ? 'Allocation Specialist' : 'Slight Allocator Edge';
              return (
                <tr key={u.id}>
                  <td><span className="mono" style={{ color: 'var(--text4)' }}>{i + 1}</span></td>
                  <td><span style={{ fontWeight: 600 }}>{u.name}</span></td>
                  <td><span style={{ fontSize: 9, color: 'var(--text3)' }}>{u.title}</span></td>
                  <td><TierBadge tier={u.tier} /></td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>{u.ideaScore}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ fontWeight: 700, color: 'var(--purple)' }}>{u.allocScore}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="mono" style={{ color: d > 0 ? 'var(--long)' : d < 0 ? 'var(--short)' : 'var(--text3)' }}>{d > 0 ? '+' : ''}{d}</span></td>
                  <td><span style={{ fontSize: 9, color: 'var(--text3)' }}>{prof}</span></td>
                  <td><div style={{ width: 60 }}><Bar val={u.ideaScore} color="var(--accent)" /></div></td>
                  <td><div style={{ width: 60 }}><Bar val={u.allocScore} color="var(--purple)" /></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
