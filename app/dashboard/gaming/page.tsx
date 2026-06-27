'use client';
import { useApp } from '@/context/AppContext';
import { USERS } from '@/lib/data';
import { SevBadge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Bar } from '@/components/ui/Bar';
import { NetworkGraph } from '@/components/ui/Charts';

export default function GamingPage() {
  const { user, gamingFlags, votingIntegrity } = useApp();
  if (!user || user.role !== 'CIO') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="panel" style={{ padding: 32, textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>⛔</div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--short)' }}>ACCESS DENIED</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>CIO access only. All access attempts are logged.</div>
      </div>
    </div>
  );

  const highCount = gamingFlags.filter(g => g.sev === 'HIGH').length;
  const avgScore = gamingFlags.length ? Math.round(gamingFlags.reduce((s, f) => s + f.score, 0) / gamingFlags.length) : 0;
  const collusionIdx = Math.max(0, Math.round(100 - votingIntegrity));

  const nodes = [
    { id: 'jagpavit.bhurjee', label: 'JB', x: 80, y: 60, f: true, r: 9 },
    { id: 'devanshi.agrawal', label: 'DA', x: 160, y: 40, f: true, r: 9 },
    { id: 'vritti.shah', label: 'VS', x: 240, y: 60, f: true, r: 9 },
    { id: 'kashish.dhanani', label: 'KD', x: 160, y: 120, f: true, r: 9 },
    { id: 'fenil.gala', label: 'FG', x: 80, y: 150, f: true, r: 9 },
    { id: 'meyyappan.lakshmanan', label: 'ML', x: 240, y: 150, r: 9 },
    { id: 'intissar.elkhadiri', label: 'IK', x: 160, y: 190, r: 9 },
    { id: 'saakshi.shingare', label: 'SS', x: 300, y: 80, r: 8 },
    { id: 'labiba.angona', label: 'LA', x: 300, y: 160, r: 8 },
    { id: 'aditya.nambiar', label: 'AN', x: 40, y: 110, r: 8 },
  ];
  const edges = [
    { from: 'jagpavit.bhurjee', to: 'vritti.shah', f: true, w: 2 },
    { from: 'vritti.shah', to: 'kashish.dhanani', f: true, w: 2 },
    { from: 'kashish.dhanani', to: 'jagpavit.bhurjee', f: true, w: 2 },
    { from: 'devanshi.agrawal', to: 'fenil.gala', f: true, w: 2 },
    { from: 'fenil.gala', to: 'devanshi.agrawal', f: true, w: 2 },
    { from: 'intissar.elkhadiri', to: 'labiba.angona', w: 1 },
    { from: 'meyyappan.lakshmanan', to: 'saakshi.shingare', w: 1 },
    { from: 'aditya.nambiar', to: 'meyyappan.lakshmanan', w: 1 },
  ];

  return (
    <div className="scroll-y" style={{ height: '100%', padding: 16 }}>
      <div className="sec-hdr" style={{ marginBottom: 14 }}>
        <div><div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Anti-Gaming Engine</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>Behavioral surveillance · Collusion detection · Voting integrity · CIO eyes only</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {highCount > 0 && <span className="badge badge-high pulse">{highCount} HIGH RISK</span>}
          <span className="badge badge-dim">W26-2025</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        <StatCard label="Active Flags" value={gamingFlags.length} color="var(--short)" sub="W26-2025" />
        <StatCard label="High Severity" value={highCount} color="var(--short)" sub="Require review" />
        <StatCard label="Avg Gaming Score" value={avgScore || '—'} color="var(--warn)" sub="/ 100" />
        <StatCard label="Voting Integrity" value={votingIntegrity.toFixed(1)} color="var(--accent)" sub="/ 100" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12 }}>
        <div className="panel">
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="sec-title">BEHAVIORAL FLAGS</span>
            {highCount > 0 && <span className="badge badge-high" style={{ marginLeft: 'auto' }}>ACTION REQUIRED</span>}
            {highCount === 0 && <span className="badge badge-dim" style={{ marginLeft: 'auto' }}>CLEAR</span>}
          </div>
          {gamingFlags.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text4)', fontSize: 11 }}>No behavioral flags detected this cycle.</div>
          )}
          {gamingFlags.map(flag => (
            <div key={flag.id} style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <SevBadge sev={flag.sev} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{flag.type.replace(/_/g, ' ')}</span>
                <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: flag.score >= 70 ? 'var(--short)' : flag.score >= 40 ? 'var(--warn)' : 'var(--text3)', fontWeight: 700 }}>{flag.score}</span>
                <span style={{ fontSize: 9, color: 'var(--text4)' }}>gaming score</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6, lineHeight: 1.5 }}>{flag.detail}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, color: 'var(--text4)' }}>Users:</span>
                {flag.users.map(uid => <span key={uid} className="badge badge-dim mono" style={{ fontSize: 9 }}>{(USERS.find(x => x.id === uid) || { name: uid }).name}</span>)}
                <span style={{ fontSize: 9, color: 'var(--text4)', marginLeft: 'auto' }}>{flag.ts}</span>
              </div>
              <div style={{ marginTop: 6 }}><Bar val={flag.score} color={flag.sev === 'HIGH' ? 'var(--short)' : flag.sev === 'MEDIUM' ? 'var(--warn)' : 'var(--long)'} /></div>
            </div>
          ))}
        </div>

        <div>
          <div className="panel" style={{ padding: 12, marginBottom: 10 }}>
            <div className="sec-title" style={{ marginBottom: 10 }}>VOTING NETWORK GRAPH</div>
            <NetworkGraph nodes={nodes} edges={edges} />
            <div style={{ marginTop: 8, fontSize: 9, color: 'var(--text4)' }}>Red = flagged nodes/edges. Dashed = irregular pattern.</div>
          </div>
          <div className="panel" style={{ padding: 12 }}>
            <div className="sec-title" style={{ marginBottom: 10 }}>INTEGRITY SCORES</div>
            {([
              ['Voting Integrity', votingIntegrity, 'var(--accent)'],
              ['Collusion Index', collusionIdx, collusionIdx >= 50 ? 'var(--short)' : 'var(--warn)'],
              ['Analyst Trust', Math.max(0, Math.round(votingIntegrity * 1.09)), 'var(--long)'],
              ['Behavioral Risk', collusionIdx, collusionIdx >= 50 ? 'var(--short)' : 'var(--warn)'],
            ] as [string, number, string][]).map(([l, v, c]) => (
              <div key={l} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{l}</span>
                  <span className="mono" style={{ fontSize: 10, color: c, fontWeight: 700 }}>{Math.min(100, v)}/100</span>
                </div>
                <Bar val={Math.min(100, v)} color={c} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
