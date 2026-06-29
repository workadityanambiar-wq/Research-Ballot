'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function ChangePasswordPage() {
  const { user } = useApp();
  const router = useRouter();
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!user) return null;

  const handleSubmit = async () => {
    setError('');
    if (newPwd !== confirmPwd) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? 'Failed to change password.'); return; }
      setDone(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="dash-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 14, padding: '0 16px' }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--long-dim)', border: '1px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--long)' }}>✓</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Password Updated</div>
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Your new password is active. You&apos;ve been signed out of all other sessions.</div>
      <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
    </div>
  );

  return (
    <div className="dash-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Change Password</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Update your Research Ballot login password · expires every 90 days</div>
        </div>
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <div className="form-label">CURRENT PASSWORD</div>
            <input className="inp" type="password" placeholder="Your current password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div className="form-label">NEW PASSWORD</div>
            <input className="inp" type="password" placeholder="Min. 12 chars, uppercase, lowercase, number, symbol" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="form-label">CONFIRM NEW PASSWORD</div>
            <input className="inp" type="password" placeholder="Re-enter new password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          {error && (
            <div style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--short-dim)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 2, fontSize: 11, color: 'var(--short)' }}>
              {error}
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px', opacity: loading ? 0.6 : 1 }}
            onClick={handleSubmit}
            disabled={loading || !currentPwd || !newPwd || !confirmPwd}
          >
            {loading ? 'UPDATING…' : 'UPDATE PASSWORD →'}
          </button>
          <div style={{ marginTop: 10, fontSize: 9, color: 'var(--text4)', textAlign: 'center' }}>
            Argon2id hashed · Cannot reuse last 10 passwords · Audit logged
          </div>
        </div>
      </div>
    </div>
  );
}
