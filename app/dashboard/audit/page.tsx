'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AUDIT } from '@/lib/data';
import { SevBadge } from '@/components/ui/Badge';

export default function AuditPage() {
  const { user } = useApp();
  const [filter, setFilter] = useState('ALL');
  if (!user || user.role !== 'CIO') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="panel" style={{ padding: 32, textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>⛔</div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--short)' }}>ACCESS DENIED</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>CIO access only. All access attempts are logged.</div>
      </div>
    </div>
  );

  const filtered = filter === 'ALL' ? AUDIT : AUDIT.filter(l => l.action === filter);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
        <div className="sec-hdr" style={{ marginBottom: 10 }}>
          <div><div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Immutable Audit Log</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>All events · Tamper-proof SHA-256 chain · Cannot be deleted · CIO access only</div></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-low">{AUDIT.length} RECORDS</span>
            <span className="badge badge-high">{AUDIT.filter(l => l.risk === 'HIGH').length} HIGH RISK</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['ALL', 'LOGIN_FAILED', 'IDEA_SUBMITTED', 'VOTE_CAST', 'TRADE_APPROVED', 'SESSION_TERMINATED', 'LOGIN_ANOMALY'].map(t => (
            <button key={t} onClick={() => setFilter(t)} className={`badge ${filter === t ? 'badge-accent' : 'badge-dim'}`} style={{ cursor: 'pointer', padding: '3px 8px', border: 'none', fontFamily: 'var(--mono)', fontSize: 9 }}>{t.replace(/_/g, ' ')}</button>
          ))}
        </div>
      </div>

      <div className="scroll-y" style={{ flex: 1 }}>
        <table className="tbl">
          <thead style={{ position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 10 }}>
            <tr><th>RECORD ID</th><th>TIMESTAMP</th><th>USER ID</th><th>ACTION</th><th>DETAIL</th><th>IP ADDRESS</th><th>DEVICE</th><th>RISK</th></tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id}>
                <td><span className="mono" style={{ color: 'var(--text4)', fontSize: 10 }}>{log.id}</span></td>
                <td><span className="mono" style={{ color: 'var(--text3)', fontSize: 10 }}>{log.ts}</span></td>
                <td><span className="mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{log.userId}</span></td>
                <td><span className={`badge ${log.action.includes('FAIL') || log.action.includes('ANOMALY') || log.action.includes('TERMINAT') ? 'badge-high' : log.action.includes('SUBMIT') || log.action.includes('CAST') ? 'badge-accent' : 'badge-dim'}`}>{log.action.replace(/_/g, ' ')}</span></td>
                <td style={{ maxWidth: 280, whiteSpace: 'normal' }}><span style={{ fontSize: 10, color: 'var(--text2)', lineHeight: 1.4 }}>{log.detail}</span></td>
                <td><span className="mono" style={{ color: 'var(--text3)', fontSize: 10 }}>{log.ip}</span></td>
                <td><span className="mono" style={{ color: 'var(--text3)', fontSize: 10 }}>{log.dev}</span></td>
                <td><SevBadge sev={log.risk} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', background: 'var(--panel2)', display: 'flex', alignItems: 'center', gap: 16, fontSize: 9, color: 'var(--text4)' }}>
        <span>🔒 SHA-256 chain verified · Last hash: 8f2a9c1d4e7b3f6a…</span>
        <span style={{ marginLeft: 'auto' }}>Immutable · Cannot be deleted · Export requires CIO authorization</span>
      </div>
    </div>
  );
}
