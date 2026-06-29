'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Dot } from '@/components/ui/Dot';
import { RiskBadge, SevBadge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Bar } from '@/components/ui/Bar';
import type { AuditEntry } from '@/lib/types';

interface SessionRow {
  userId: string; name: string; role: string; ip: string; dev: string;
  lastAct: string; status: 'ACTIVE' | 'IDLE' | 'BLOCKED'; mfa: boolean; risk: number;
}
interface SessionStats {
  activeSessions: number; mfaEnrolledCount: number; totalUsers: number; blockedCount: number;
}

export default function SecurityPage() {
  const { user } = useApp();
  const { isMobile, cols } = useBreakpoint();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [stats, setStats] = useState<SessionStats>({ activeSessions: 0, mfaEnrolledCount: 0, totalUsers: 0, blockedCount: 0 });
  const [anomalies, setAnomalies] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'CIO') return;
    Promise.all([
      fetch('/api/sessions').then(r => r.ok ? r.json() : { sessions: [], stats: {} }),
      fetch('/api/audit?limit=200').then(r => r.ok ? r.json() : { entries: [] }),
    ]).then(([sessData, auditData]) => {
      setSessions(sessData.sessions ?? []);
      setStats(sessData.stats ?? { activeSessions: 0, mfaEnrolledCount: 0, totalUsers: 0, blockedCount: 0 });
      const secActions = new Set(['LOGIN_FAILED', 'LOGIN_ANOMALY', 'SESSION_TERMINATED', 'ACCOUNT_LOCKED']);
      setAnomalies((auditData.entries ?? []).filter((l: AuditEntry) => secActions.has(l.action)));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  if (!user || user.role !== 'CIO') return (
    <div className="dash-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="panel" style={{ padding: 32, textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>⛔</div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--short)' }}>ACCESS DENIED</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>CIO access only. All access attempts are logged.</div>
      </div>
    </div>
  );

  const highRiskCount = sessions.filter(s => s.risk >= 50).length;
  const clearCount = sessions.filter(s => s.risk < 50).length;
  const avgRisk = sessions.length > 0
    ? (sessions.reduce((a, s) => a + s.risk, 0) / sessions.length).toFixed(1)
    : '—';
  const nonMfaCount = stats.totalUsers - stats.mfaEnrolledCount;

  return (
    <div className="scroll-y dash-content" style={{ height: '100%', padding: 16 }}>
      <div className="sec-hdr" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Security Dashboard</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Session monitoring · Device fingerprinting · Login anomaly detection · MFA enforcement</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {highRiskCount > 0 && <span className="badge badge-high pulse">{highRiskCount} ANOMALIES</span>}
          {clearCount > 0 && <span className="badge badge-low">{clearCount} CLEAR</span>}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text4)', fontSize: 11 }}>Loading security data…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(5, 3, 2)},1fr)`, gap: 8, marginBottom: 14 }}>
            <StatCard label="Active Sessions" value={stats.activeSessions} color="var(--long)" />
            <StatCard label="MFA Enrolled" value={`${stats.mfaEnrolledCount}/${stats.totalUsers}`} color="var(--accent)" sub={nonMfaCount > 0 ? `${nonMfaCount} non-compliant` : 'All compliant'} />
            <StatCard label="Anomalies (24h)" value={anomalies.length} color="var(--short)" />
            <StatCard label="Blocked Accounts" value={stats.blockedCount} color="var(--short)" />
            <StatCard label="Avg Risk Score" value={avgRisk} color="var(--warn)" sub="/ 100" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="panel">
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}><span className="sec-title">ACTIVE SESSIONS & STATUS</span></div>
              {sessions.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text4)', fontSize: 10 }}>No active sessions</div>
              ) : (
                <div className="tbl-wrap"><table className="tbl">
                  <thead><tr><th>USER</th><th>ROLE</th><th>IP</th><th>DEVICE</th><th>LAST ACTIVE</th><th>MFA</th><th>STATUS</th><th>RISK</th></tr></thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.userId}>
                        <td><span style={{ fontSize: 11, fontWeight: 600 }}>{s.name}</span></td>
                        <td><span style={{ fontSize: 9, color: 'var(--text3)' }}>{s.role}</span></td>
                        <td><span className="mono" style={{ fontSize: 10 }}>{s.ip}</span></td>
                        <td><span className="mono" style={{ fontSize: 10, color: s.dev === 'Unknown' ? 'var(--short)' : 'var(--text3)' }}>{s.dev}</span></td>
                        <td><span className="mono" style={{ fontSize: 10, color: 'var(--text3)' }}>{s.lastAct}</span></td>
                        <td>{s.mfa ? <span className="badge badge-low" style={{ fontSize: 8 }}>✓ ON</span> : <span className="badge badge-high" style={{ fontSize: 8 }}>✗ OFF</span>}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Dot status={s.status} />
                            <span style={{ fontSize: 9, color: s.status === 'BLOCKED' ? 'var(--short)' : 'var(--text3)' }}>{s.status}</span>
                          </div>
                        </td>
                        <td><RiskBadge score={s.risk} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </div>

            <div className="panel" style={{ padding: 12 }}>
              <div className="sec-title" style={{ marginBottom: 12 }}>SECURITY RISK SCORES</div>
              {sessions.length === 0 ? (
                <div style={{ color: 'var(--text4)', fontSize: 10 }}>No sessions to display</div>
              ) : (
                [...sessions].sort((a, b) => b.risk - a.risk).map(s => (
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
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="sec-title">SECURITY ANOMALIES</span>
              {anomalies.length > 0 && <span className="badge badge-high pulse" style={{ marginLeft: 'auto' }}>ALERT</span>}
              {anomalies.length === 0 && <span className="badge badge-low" style={{ marginLeft: 'auto' }}>CLEAR</span>}
            </div>
            {anomalies.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text4)', fontSize: 10 }}>No security anomalies detected</div>
            ) : (
              anomalies.map(log => (
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
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
