'use client';
import { useApp } from '@/context/AppContext';
import { SESSIONS, AUDIT } from '@/lib/data';
import { Dot } from '@/components/ui/Dot';
import { RiskBadge, SevBadge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Bar } from '@/components/ui/Bar';

export default function SecurityPage() {
  const { user } = useApp();
  if (!user || user.role !== 'CIO') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="panel" style={{ padding: 32, textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>⛔</div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--short)' }}>ACCESS DENIED</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>CIO access only. All access attempts are logged.</div>
      </div>
    </div>
  );

  return (
    <div className="scroll-y" style={{ height: '100%', padding: 16 }}>
      <div className="sec-hdr" style={{ marginBottom: 14 }}>
        <div><div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Security Dashboard</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>Session monitoring · Device fingerprinting · Login anomaly detection · MFA enforcement</div></div>
        <div style={{ display: 'flex', gap: 8 }}><span className="badge badge-high pulse">2 ANOMALIES</span><span className="badge badge-low">6 CLEAR</span></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 14 }}>
        <StatCard label="Active Sessions" value="5" color="var(--long)" />
        <StatCard label="MFA Enrolled" value="15/16" color="var(--accent)" sub="1 non-compliant" />
        <StatCard label="Anomalies (24h)" value="3" color="var(--short)" />
        <StatCard label="Blocked Accounts" value="1" color="var(--short)" />
        <StatCard label="Avg Risk Score" value="21.4" color="var(--warn)" sub="/ 100" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="panel">
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}><span className="sec-title">ACTIVE SESSIONS & STATUS</span></div>
          <table className="tbl">
            <thead><tr><th>USER</th><th>ROLE</th><th>IP</th><th>DEVICE</th><th>LAST ACTIVE</th><th>MFA</th><th>STATUS</th><th>RISK</th></tr></thead>
            <tbody>
              {SESSIONS.map(s => (
                <tr key={s.userId}>
                  <td><span style={{ fontSize: 11, fontWeight: 600 }}>{s.name}</span></td>
                  <td><span style={{ fontSize: 9, color: 'var(--text3)' }}>{s.role}</span></td>
                  <td><span className="mono" style={{ fontSize: 10 }}>{s.ip}</span></td>
                  <td><span className="mono" style={{ fontSize: 10, color: s.dev === 'UNKNOWN' ? 'var(--short)' : 'var(--text3)' }}>{s.dev}</span></td>
                  <td><span className="mono" style={{ fontSize: 10, color: 'var(--text3)' }}>{s.lastAct}</span></td>
                  <td>{s.mfa ? <span className="badge badge-low" style={{ fontSize: 8 }}>✓ ON</span> : <span className="badge badge-high" style={{ fontSize: 8 }}>✗ OFF</span>}</td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Dot status={s.status} /><span style={{ fontSize: 9, color: s.status === 'BLOCKED' ? 'var(--short)' : s.status === 'TERMINATED' ? 'var(--text4)' : 'var(--text3)' }}>{s.status}</span></div></td>
                  <td><RiskBadge score={s.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <div className="sec-title" style={{ marginBottom: 12 }}>SECURITY RISK SCORES</div>
          {[...SESSIONS].sort((a, b) => b.risk - a.risk).map(s => (
            <div key={s.userId} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{s.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RiskBadge score={s.risk} />
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: s.risk >= 70 ? 'var(--short)' : s.risk >= 40 ? 'var(--warn)' : s.risk >= 20 ? 'var(--accent)' : 'var(--long)' }}>{s.risk}</span>
                </div>
              </div>
              <Bar val={s.risk} color={s.risk >= 70 ? 'var(--short)' : s.risk >= 40 ? 'var(--warn)' : 'var(--long)'} />
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="sec-title">SECURITY ANOMALIES</span>
          <span className="badge badge-high pulse" style={{ marginLeft: 'auto' }}>ALERT</span>
        </div>
        {AUDIT.filter(l => l.action === 'LOGIN_FAILED' || l.action === 'LOGIN_ANOMALY' || l.action === 'SESSION_TERMINATED').map(log => (
          <div key={log.id} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <SevBadge sev={log.risk} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{log.action.replace(/_/g, ' ')} — {log.userId}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{log.detail}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text4)' }}>{log.ts}</div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text4)' }}>{log.ip}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
